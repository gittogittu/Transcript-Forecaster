/**
 * Migration Runner for Advanced Predictive Analytics
 * 
 * Handles database migrations with support for:
 * - pgvector extension
 * - Vector indexes
 * - Transaction safety
 * - Migration tracking
 */

import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

interface Migration {
  version: string
  filename: string
  sql: string
}

interface MigrationResult {
  version: string
  success: boolean
  error?: string
  executionTime?: number
}

interface MigrationStatus {
  availableCount: number
  executedCount: number
  pendingCount: number
  isUpToDate: boolean
  pendingMigrations: string[]
  executedMigrations: Array<{
    version: string
    executed_at: string
  }>
}

export class MigrationRunner {
  private pool: Pool
  private migrationsPath: string

  constructor(pool: Pool) {
    this.pool = pool
    this.migrationsPath = path.join(process.cwd(), 'src/lib/database/migrations')
  }

  /**
   * Initialize migration tracking table
   */
  private async initializeMigrationTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        execution_time_ms INTEGER,
        checksum VARCHAR(64)
      );
      
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at 
      ON schema_migrations(executed_at);
    `
    
    await this.pool.query(createTableSQL)
  }

  /**
   * Get all available migration files
   */
  private async getAvailableMigrations(): Promise<Migration[]> {
    if (!fs.existsSync(this.migrationsPath)) {
      fs.mkdirSync(this.migrationsPath, { recursive: true })
      return []
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort()

    const migrations: Migration[] = []

    for (const filename of files) {
      const filePath = path.join(this.migrationsPath, filename)
      const sql = fs.readFileSync(filePath, 'utf-8')
      const version = filename.replace('.sql', '')

      migrations.push({
        version,
        filename,
        sql
      })
    }

    return migrations
  }

  /**
   * Get executed migrations from database
   */
  private async getExecutedMigrations(): Promise<string[]> {
    await this.initializeMigrationTable()

    const result = await this.pool.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    )

    return result.rows.map(row => row.version)
  }

  /**
   * Calculate checksum for migration content
   */
  private calculateChecksum(content: string): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16)
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now()
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      // Execute the migration SQL
      await client.query(migration.sql)

      // Record the migration
      const executionTime = Date.now() - startTime
      const checksum = this.calculateChecksum(migration.sql)

      await client.query(
        `INSERT INTO schema_migrations (version, execution_time_ms, checksum) 
         VALUES ($1, $2, $3)`,
        [migration.version, executionTime, checksum]
      )

      await client.query('COMMIT')

      return {
        version: migration.version,
        success: true,
        executionTime
      }
    } catch (error) {
      await client.query('ROLLBACK')
      
      return {
        version: migration.version,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    } finally {
      client.release()
    }
  }

  /**
   * Run all pending migrations
   */
  public async runMigrations(): Promise<MigrationResult[]> {
    const availableMigrations = await this.getAvailableMigrations()
    const executedMigrations = await this.getExecutedMigrations()

    const pendingMigrations = availableMigrations.filter(
      migration => !executedMigrations.includes(migration.version)
    )

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations found')
      return []
    }

    console.log(`📦 Found ${pendingMigrations.length} pending migrations`)

    const results: MigrationResult[] = []

    for (const migration of pendingMigrations) {
      console.log(`🔄 Running migration: ${migration.version}`)
      
      const result = await this.executeMigration(migration)
      results.push(result)

      if (result.success) {
        console.log(`✅ Completed: ${migration.version} (${result.executionTime}ms)`)
      } else {
        console.log(`❌ Failed: ${migration.version} - ${result.error}`)
        break // Stop on first failure
      }
    }

    return results
  }

  /**
   * Get migration status
   */
  public async getStatus(): Promise<MigrationStatus> {
    const availableMigrations = await this.getAvailableMigrations()
    const executedMigrations = await this.getExecutedMigrations()

    const pendingMigrations = availableMigrations
      .filter(migration => !executedMigrations.includes(migration.version))
      .map(migration => migration.version)

    // Get executed migrations with timestamps
    await this.initializeMigrationTable()
    const executedWithTimestamps = await this.pool.query(
      'SELECT version, executed_at FROM schema_migrations ORDER BY version'
    )

    return {
      availableCount: availableMigrations.length,
      executedCount: executedMigrations.length,
      pendingCount: pendingMigrations.length,
      isUpToDate: pendingMigrations.length === 0,
      pendingMigrations,
      executedMigrations: executedWithTimestamps.rows.map(row => ({
        version: row.version,
        executed_at: row.executed_at.toISOString()
      }))
    }
  }

  /**
   * Validate migration integrity
   */
  public async validateMigrations(): Promise<boolean> {
    const availableMigrations = await this.getAvailableMigrations()
    
    // Check for duplicate versions
    const versions = availableMigrations.map(m => m.version)
    const uniqueVersions = new Set(versions)
    
    if (versions.length !== uniqueVersions.size) {
      console.error('❌ Duplicate migration versions found')
      return false
    }

    // Validate executed migrations still exist
    const executedMigrations = await this.getExecutedMigrations()
    const availableVersions = new Set(versions)

    for (const executed of executedMigrations) {
      if (!availableVersions.has(executed)) {
        console.error(`❌ Executed migration ${executed} no longer exists`)
        return false
      }
    }

    console.log('✅ Migration integrity validated')
    return true
  }
}