#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Simple script to run database migrations without Google Sheets dependencies
async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Use tsx to run the migration runner directly
    const migrationScript = `
      import { MigrationRunner } from '../src/lib/database/migration-runner.js';
      import { getDatabasePool } from '../src/lib/database/connection.js';
      
      async function main() {
        try {
          const pool = getDatabasePool();
          const migrationRunner = new MigrationRunner(pool);
          
          const status = await migrationRunner.getStatus();
          console.log('Current status:');
          console.log('  Available migrations:', status.availableCount);
          console.log('  Executed migrations:', status.executedCount);
          console.log('  Pending migrations:', status.pendingCount);
          console.log('  Up to date:', status.isUpToDate ? 'YES' : 'NO');

          if (!status.isUpToDate) {
            console.log('\\nRunning pending migrations...');
            const results = await migrationRunner.runMigrations();
            
            console.log('\\n=== Migration Results ===');
            results.forEach(result => {
              const status = result.success ? '✓' : '✗';
              console.log(status + ' ' + result.version + ' - ' + (result.success ? 'Success' : result.error));
            });
          } else {
            console.log('\\nDatabase is up to date');
          }
          
          await pool.end();
        } catch (error) {
          console.error('Migration failed:', error);
          process.exit(1);
        }
      }
      
      main();
    `;
    
    // Write temporary migration script
    const fs = require('fs');
    const tempScript = path.join(__dirname, 'temp-migration.mjs');
    fs.writeFileSync(tempScript, migrationScript);
    
    // Run the script
    execSync(`node ${tempScript}`, { stdio: 'inherit' });
    
    // Clean up
    fs.unlinkSync(tempScript);
    
  } catch (error) {
    console.error('Error running migrations:', error.message);
    process.exit(1);
  }
}

runMigrations();