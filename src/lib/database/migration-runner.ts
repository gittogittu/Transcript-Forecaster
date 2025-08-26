import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

export interface Migration {
  version: string;
  description: string;
  sql: string;
}

export interface MigrationResult {
  version: string;
  success: boolean;
  error?: string;
  executedAt: Date;
}

export class MigrationRunner {
  private pool: Pool;
  private migrationsDir: string;

  constructor(pool: Pool, migrationsDir?: string) {
    this.pool = pool;
    this.migrationsDir = migrationsDir || path.join(__dirname, 'migrations');
  }

  /**
   * Get all available migration files
   */
  async getAvailableMigrations(): Promise<Migration[]> {
    try {
      const files = await fs.readdir(this.migrationsDir);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort();

      const migrations: Migration[] = [];
      
      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Extract version from filename (e.g., "001_initial_schema.sql" -> "001_initial_schema")
        const version = file.replace('.sql', '');
        
        // Extract description from SQL comments
        const descriptionMatch = content.match(/-- Description: (.+)/);
        const description = descriptionMatch ? descriptionMatch[1] : `Migration ${version}`;

        migrations.push({
          version,
          description,
          sql: content
        });
      }

      return migrations;
    } catch (error) {
      throw new Error(`Failed to read migrations directory: ${error}`);
    }
  }

  /**
   * Get executed migrations from database
   */
  async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await this.pool.query(
        'SELECT version FROM migrations ORDER BY executed_at'
      );
      return result.rows.map(row => row.version);
    } catch (error) {
      // If migrations table doesn't exist, return empty array
      if (error instanceof Error && error.message.includes('relation "migrations" does not exist')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get pending migrations that haven't been executed
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const available = await this.getAvailableMigrations();
    const executed = await this.getExecutedMigrations();
    
    return available.filter(migration => !executed.includes(migration.version));
  }

  /**
   * Execute a single migration
   */
  async executeMigration(migration: Migration): Promise<MigrationResult> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute the migration SQL
      await client.query(migration.sql);
      
      // Record the migration (if migrations table exists)
      try {
        await client.query(
          'INSERT INTO migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [migration.version, migration.description]
        );
      } catch (error) {
        // Ignore if migrations table doesn't exist yet (it will be created by the migration)
        if (!(error instanceof Error && error.message.includes('relation "migrations" does not exist'))) {
          throw error;
        }
      }
      
      await client.query('COMMIT');
      
      return {
        version: migration.version,
        success: true,
        executedAt: new Date()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      
      return {
        version: migration.version,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date()
      };
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<MigrationResult[]> {
    const pending = await this.getPendingMigrations();
    const results: MigrationResult[] = [];

    for (const migration of pending) {
      const result = await this.executeMigration(migration);
      results.push(result);
      
      if (!result.success) {
        // Stop on first failure
        break;
      }
    }

    return results;
  }

  /**
   * Check if database is up to date
   */
  async isUpToDate(): Promise<boolean> {
    const pending = await this.getPendingMigrations();
    return pending.length === 0;
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    isUpToDate: boolean;
    executedCount: number;
    pendingCount: number;
    availableCount: number;
  }> {
    const available = await this.getAvailableMigrations();
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();

    return {
      isUpToDate: pending.length === 0,
      executedCount: executed.length,
      pendingCount: pending.length,
      availableCount: available.length
    };
  }
}