/**
 * Enhanced Database Connection with pgvector Support
 * 
 * This module provides database connection utilities with support for:
 * - PostgreSQL with pgvector extension
 * - Connection pooling
 * - Vector operations
 * - Performance monitoring
 */

import { Pool, PoolClient, PoolConfig } from 'pg'

interface DatabaseConfig extends PoolConfig {
  connectionString?: string
  ssl?: boolean | { rejectUnauthorized: boolean }
  max?: number
  idleTimeoutMillis?: number
  connectionTimeoutMillis?: number
}

interface VectorDatabasePool extends Pool {
  queryVector(text: string, params?: any[]): Promise<any>
  findSimilar(embedding: number[], table: string, column: string, limit?: number): Promise<any[]>
}

class DatabaseConnection {
  private static instance: DatabaseConnection
  private pool: Pool | null = null
  private config: DatabaseConfig

  private constructor() {
    this.config = this.buildConfig()
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection()
    }
    return DatabaseConnection.instance
  }

  private buildConfig(): DatabaseConfig {
    const config: DatabaseConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
      application_name: process.env.DB_APP_NAME || 'transcript-forecaster',
    }

    if (!config.connectionString) {
      throw new Error('DATABASE_URL environment variable is required')
    }

    return config
  }

  public async getPool(): Promise<VectorDatabasePool> {
    if (!this.pool) {
      this.pool = new Pool(this.config)
      // Apply per-connection settings for performance and safety
      this.pool.on('connect', async (client: PoolClient) => {
        try {
          await client.query(`SET application_name = $1`, [this.config.application_name || 'transcript-forecaster'])
          if (process.env.DB_STATEMENT_TIMEOUT_MS) {
            await client.query(`SET statement_timeout = $1`, [process.env.DB_STATEMENT_TIMEOUT_MS])
          }
          if (process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS) {
            await client.query(`SET idle_in_transaction_session_timeout = $1`, [process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS])
          }
        } catch (e) {
          // Non-fatal
          console.warn('Failed to apply connection session settings', e)
        }
      })
      
      // Test connection and ensure pgvector extension is available
      await this.initializeVectorSupport()
      
      // Add vector-specific methods to the pool
      this.enhancePoolWithVectorMethods()
    }
    
    return this.pool as VectorDatabasePool
  }

  private async initializeVectorSupport(): Promise<void> {
    if (!this.pool) return

    const requireVector = process.env.DB_REQUIRE_VECTOR === 'true'

    try {
      // Enable pgvector extension (best-effort)
      await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector;')
      
      // Test vector functionality
      await this.pool.query("SELECT vector_dims('[1,2,3]'::vector);")
      
      console.log('✅ pgvector extension initialized successfully')
    } catch (error) {
      const msg = 'pgvector extension not available; proceeding without vector features'
      if (requireVector) {
        console.error('❌ Failed to initialize pgvector extension and DB_REQUIRE_VECTOR=true:', error)
        throw new Error('pgvector extension is required but not available')
      }
      console.warn(`⚠️ ${msg}`, error)
    }
  }

  private enhancePoolWithVectorMethods(): void {
    if (!this.pool) return

    // Add vector query method
    ;(this.pool as any).queryVector = async (text: string, params?: any[]) => {
      const client = await this.pool!.connect()
      try {
        const result = await client.query(text, params)
        return result
      } finally {
        client.release()
      }
    }

    // Add similarity search method
    ;(this.pool as any).findSimilar = async (
      embedding: number[],
      table: string,
      column: string,
      limit: number = 10
    ) => {
      const vectorString = `[${embedding.join(',')}]`
      const query = `
        SELECT *, (${column} <=> $1::vector) as distance
        FROM ${table}
        WHERE ${column} IS NOT NULL
        ORDER BY ${column} <=> $1::vector
        LIMIT $2
      `
      
      const client = await this.pool!.connect()
      try {
        const result = await client.query(query, [vectorString, limit])
        return result.rows
      } finally {
        client.release()
      }
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const pool = await this.getPool()
      const result = await pool.query('SELECT NOW() as current_time, version() as pg_version')
      console.log('✅ Database connection successful:', {
        time: result.rows[0].current_time,
        version: result.rows[0].pg_version.split(' ')[0]
      })
      return true
    } catch (error) {
      console.error('❌ Database connection failed:', error)
      return false
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      console.log('✅ Database connection closed')
    }
  }

  // Vector utility methods
  public static vectorToString(vector: number[]): string {
    return `[${vector.join(',')}]`
  }

  public static stringToVector(vectorString: string): number[] {
    return vectorString
      .replace(/[\[\]]/g, '')
      .split(',')
      .map(num => parseFloat(num.trim()))
  }

  public static calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length')
    }

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0
    }

    return dotProduct / (magnitudeA * magnitudeB)
  }
}

// Export singleton instance and utility functions
export const getDatabasePool = async (): Promise<VectorDatabasePool> => {
  return DatabaseConnection.getInstance().getPool()
}

export const testDatabaseConnection = async (): Promise<boolean> => {
  return DatabaseConnection.getInstance().testConnection()
}

export const closeDatabaseConnection = async (): Promise<void> => {
  return DatabaseConnection.getInstance().close()
}

export { DatabaseConnection }
export type { VectorDatabasePool, DatabaseConfig }