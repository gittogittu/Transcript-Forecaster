#!/usr/bin/env node

import { MigrationUtilities } from './migration-utilities';
import { MigrationRunner } from '@/lib/database/migration-runner';
import { getDatabasePool } from '@/lib/database/connection';
import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function exportCommand(format: string, outputPath?: string, includeMetadata?: boolean): Promise<void> {
  console.log(`Starting export to ${format.toUpperCase()} format...`);
  
  const migrationUtils = new MigrationUtilities();
  
  try {
    const report = await migrationUtils.exportFromGoogleSheets({
      format: format as 'json' | 'csv',
      outputPath,
      includeMetadata
    });

    console.log('\n=== Export Report ===');
    console.log(`Total records: ${report.totalRecords}`);
    console.log(`Successful: ${report.successfulRecords}`);
    console.log(`Failed: ${report.failedRecords}`);
    console.log(`Duration: ${report.duration}ms`);
    
    if (report.errors.length > 0) {
      console.log('\nErrors:');
      report.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (report.successfulRecords > 0) {
      console.log(`\nData exported successfully to: ${outputPath || 'default location'}`);
    }
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

async function importCommand(format: string, inputPath: string, validate?: boolean, skipDuplicates?: boolean): Promise<void> {
  console.log(`Starting import from ${format.toUpperCase()} format...`);
  
  const migrationUtils = new MigrationUtilities();
  
  try {
    const report = await migrationUtils.importToDatabase({
      format: format as 'json' | 'csv',
      inputPath,
      validateData: validate,
      skipDuplicates
    });

    console.log('\n=== Import Report ===');
    console.log(`Total records: ${report.totalRecords}`);
    console.log(`Successful: ${report.successfulRecords}`);
    console.log(`Failed: ${report.failedRecords}`);
    console.log(`Duration: ${report.duration}ms`);
    
    if (report.errors.length > 0) {
      console.log('\nErrors:');
      report.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (report.successfulRecords > 0) {
      console.log('\nData imported successfully to database');
    }
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

async function migrateCommand(validate?: boolean, skipDuplicates?: boolean): Promise<void> {
  console.log('Starting direct migration from Google Sheets to Database...');
  
  const migrationUtils = new MigrationUtilities();
  
  try {
    const report = await migrationUtils.migrateFromSheetsToDatabase({
      validateData: validate,
      skipDuplicates
    });

    console.log('\n=== Migration Report ===');
    console.log(`Total records: ${report.totalRecords}`);
    console.log(`Successful: ${report.successfulRecords}`);
    console.log(`Failed: ${report.failedRecords}`);
    console.log(`Duration: ${report.duration}ms`);
    
    if (report.errors.length > 0) {
      console.log('\nErrors:');
      report.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (report.successfulRecords > 0) {
      console.log('\nMigration completed successfully');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function validateCommand(): Promise<void> {
  console.log('Validating migration...');
  
  const migrationUtils = new MigrationUtilities();
  
  try {
    const result = await migrationUtils.validateMigration();

    console.log('\n=== Validation Report ===');
    console.log(`Google Sheets records: ${result.sheetsCount}`);
    console.log(`Database records: ${result.databaseCount}`);
    console.log(`Missing in database: ${result.missingInDatabase.length}`);
    console.log(`Valid: ${result.isValid ? 'YES' : 'NO'}`);
    
    if (result.missingInDatabase.length > 0) {
      console.log('\nMissing records:');
      result.missingInDatabase.forEach(record => {
        console.log(`  - ${record.clientName} ${record.month}: ${record.transcriptCount}`);
      });
    }

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  }
}

async function dbMigrateCommand(): Promise<void> {
  console.log('Running database migrations...');
  
  try {
    const pool = getDatabasePool();
    const migrationRunner = new MigrationRunner(pool);
    
    const status = await migrationRunner.getStatus();
    console.log(`\nCurrent status:`);
    console.log(`  Available migrations: ${status.availableCount}`);
    console.log(`  Executed migrations: ${status.executedCount}`);
    console.log(`  Pending migrations: ${status.pendingCount}`);
    console.log(`  Up to date: ${status.isUpToDate ? 'YES' : 'NO'}`);

    if (!status.isUpToDate) {
      console.log('\nRunning pending migrations...');
      const results = await migrationRunner.runMigrations();
      
      console.log('\n=== Migration Results ===');
      results.forEach(result => {
        const status = result.success ? '✓' : '✗';
        console.log(`${status} ${result.version} - ${result.success ? 'Success' : result.error}`);
      });
    } else {
      console.log('\nDatabase is up to date');
    }
  } catch (error) {
    console.error('Database migration failed:', error);
    process.exit(1);
  }
}

async function dbStatusCommand(): Promise<void> {
  console.log('Checking database migration status...');
  
  try {
    const pool = getDatabasePool();
    const migrationRunner = new MigrationRunner(pool);
    
    const status = await migrationRunner.getStatus();
    console.log(`\n=== Database Status ===`);
    console.log(`Available migrations: ${status.availableCount}`);
    console.log(`Executed migrations: ${status.executedCount}`);
    console.log(`Pending migrations: ${status.pendingCount}`);
    console.log(`Up to date: ${status.isUpToDate ? 'YES' : 'NO'}`);

    if (status.pendingCount > 0) {
      const pending = await migrationRunner.getPendingMigrations();
      console.log('\nPending migrations:');
      pending.forEach(migration => {
        console.log(`  - ${migration.version}: ${migration.description}`);
      });
    }
  } catch (error) {
    console.error('Status check failed:', error);
    process.exit(1);
  }
}

// CLI Setup
program
  .name('migration-cli')
  .description('CLI for managing data migration between Google Sheets and Database')
  .version('1.0.0');

program
  .command('export')
  .description('Export data from Google Sheets to file')
  .option('-f, --format <format>', 'Export format (json|csv)', 'json')
  .option('-o, --output <path>', 'Output file path')
  .option('-m, --metadata', 'Include metadata in export')
  .action(async (options) => {
    await exportCommand(options.format, options.output, options.metadata);
  });

program
  .command('import')
  .description('Import data from file to database')
  .requiredOption('-f, --format <format>', 'Import format (json|csv)')
  .requiredOption('-i, --input <path>', 'Input file path')
  .option('-v, --validate', 'Validate data before import')
  .option('-s, --skip-duplicates', 'Skip duplicate records')
  .action(async (options) => {
    await importCommand(options.format, options.input, options.validate, options.skipDuplicates);
  });

program
  .command('migrate')
  .description('Migrate data directly from Google Sheets to Database')
  .option('-v, --validate', 'Validate data before migration')
  .option('-s, --skip-duplicates', 'Skip duplicate records')
  .action(async (options) => {
    await migrateCommand(options.validate, options.skipDuplicates);
  });

program
  .command('validate')
  .description('Validate migration by comparing Google Sheets and Database data')
  .action(validateCommand);

program
  .command('db:migrate')
  .description('Run database schema migrations')
  .action(dbMigrateCommand);

program
  .command('db:status')
  .description('Check database migration status')
  .action(dbStatusCommand);

// Handle unknown commands
program.on('command:*', () => {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
  process.exit(1);
});

// Parse command line arguments
if (process.argv.length < 3) {
  program.help();
} else {
  program.parse(process.argv);
}