#!/usr/bin/env tsx

/**
 * Migration CLI for Advanced Predictive Analytics
 * 
 * This CLI tool manages database migrations with pgvector support.
 * 
 * Usage:
 *   tsx src/lib/migration/migration-cli.ts db:migrate
 *   tsx src/lib/migration/migration-cli.ts db:status
 *   tsx src/lib/migration/migration-cli.ts create <migration_name>
 */

import { Command } from 'commander'
import { MigrationRunner } from './migration-runner'
import { getDatabasePool } from '../database/connection'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const program = new Command()

program
  .name('migration-cli')
  .description('Database migration CLI for Advanced Predictive Analytics')
  .version('1.0.0')

program
  .command('db:migrate')
  .description('Run pending database migrations')
  .action(async () => {
    try {
      console.log('🚀 Running database migrations...\n')
      
      const pool = await getDatabasePool()
      const migrationRunner = new MigrationRunner(pool)
      
      const results = await migrationRunner.runMigrations()
      
      console.log('\n=== Migration Results ===')
      results.forEach(result => {
        const status = result.success ? '✅' : '❌'
        const message = result.success ? 'Success' : result.error
        console.log(`${status} ${result.version} - ${message}`)
      })
      
      if (results.every(r => r.success)) {
        console.log('\n🎉 All migrations completed successfully!')
      } else {
        console.log('\n⚠️  Some migrations failed. Please check the errors above.')
        process.exit(1)
      }
      
      await pool.end()
    } catch (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
  })

program
  .command('db:status')
  .description('Check migration status')
  .action(async () => {
    try {
      console.log('📊 Checking migration status...\n')
      
      const pool = await getDatabasePool()
      const migrationRunner = new MigrationRunner(pool)
      
      const status = await migrationRunner.getStatus()
      
      console.log('=== Migration Status ===')
      console.log(`Available migrations: ${status.availableCount}`)
      console.log(`Executed migrations:  ${status.executedCount}`)
      console.log(`Pending migrations:   ${status.pendingCount}`)
      console.log(`Up to date:          ${status.isUpToDate ? 'YES' : 'NO'}`)
      
      if (status.pendingMigrations.length > 0) {
        console.log('\n📋 Pending migrations:')
        status.pendingMigrations.forEach(migration => {
          console.log(`  - ${migration}`)
        })
      }
      
      if (status.executedMigrations.length > 0) {
        console.log('\n✅ Executed migrations:')
        status.executedMigrations.forEach(migration => {
          console.log(`  - ${migration.version} (${migration.executed_at})`)
        })
      }
      
      await pool.end()
    } catch (error) {
      console.error('❌ Status check failed:', error)
      process.exit(1)
    }
  })

program
  .command('create')
  .description('Create a new migration file')
  .argument('<name>', 'Migration name (e.g., add_vector_indexes)')
  .action(async (name: string) => {
    try {
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0]
      const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`
      const migrationPath = path.join(process.cwd(), 'src/lib/database/migrations', filename)
      
      // Ensure migrations directory exists
      const migrationsDir = path.dirname(migrationPath)
      if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true })
      }
      
      const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: Add description here

-- Enable pgvector extension if needed
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example_table (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   embedding vector(768),
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Create indexes if needed
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_example_embedding 
-- ON example_table USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
`
      
      fs.writeFileSync(migrationPath, template)
      
      console.log(`✅ Created migration file: ${filename}`)
      console.log(`📁 Location: ${migrationPath}`)
      console.log('\n📝 Next steps:')
      console.log('1. Edit the migration file to add your SQL')
      console.log('2. Run "npm run db:migrate" to apply the migration')
      
    } catch (error) {
      console.error('❌ Failed to create migration:', error)
      process.exit(1)
    }
  })

// Handle unknown commands
program.on('command:*', () => {
  console.error('❌ Invalid command: %s\n', program.args.join(' '))
  program.help()
})

// Parse command line arguments
if (process.argv.length < 3) {
  program.help()
} else {
  program.parse()
}