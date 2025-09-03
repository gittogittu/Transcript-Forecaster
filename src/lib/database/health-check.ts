/**
 * Database Health Check for Advanced Predictive Analytics
 * 
 * This module provides comprehensive health checks for:
 * - Database connectivity
 * - pgvector extension status
 * - Vector index performance
 * - Migration status
 */

import { Pool } from 'pg'
import { getDatabasePool } from './connection'
import { MigrationRunner } from '../migration/migration-runner'

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: {
    database: HealthCheck
    pgvector: HealthCheck
    migrations: HealthCheck
    vectorIndexes: HealthCheck
    performance: HealthCheck
  }
  timestamp: string
  responseTime: number
}

export interface HealthCheck {
  status: 'pass' | 'warn' | 'fail'
  message: string
  details?: any
  responseTime?: number
}

export class DatabaseHealthChecker {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = await getDatabasePool()
    }
    return this.pool
  }

  /**
   * Run comprehensive health check
   */
  public async runHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    const checks = {
      database: await this.checkDatabaseConnection(),
      pgvector: await this.checkPgVectorExtension(),
      migrations: await this.checkMigrationStatus(),
      vectorIndexes: await this.checkVectorIndexes(),
      performance: await this.checkPerformance()
    }

    // Determine overall status
    const failedChecks = Object.values(checks).filter(check => check.status === 'fail')
    const warnChecks = Object.values(checks).filter(check => check.status === 'warn')
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (failedChecks.length > 0) {
      overallStatus = 'unhealthy'
    } else if (warnChecks.length > 0) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }

    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    }
  }

  /**
   * Check basic database connectivity
   */
  private async checkDatabaseConnection(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      const pool = await this.getPool()
      const result = await pool.query('SELECT NOW() as current_time, version() as version')
      
      const responseTime = Date.now() - startTime
      
      return {
        status: 'pass',
        message: 'Database connection successful',
        details: {
          currentTime: result.rows[0].current_time,
          version: result.rows[0].version.split(' ')[0],
          connectionPool: {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount
          }
        },
        responseTime
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Database connection failed',
        details: {
          error: error instanceof Error ? error.message : String(error)
        },
        responseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Check pgvector extension status
   */
  private async checkPgVectorExtension(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      const pool = await this.getPool()
      
      // Check if extension is installed
      const extensionResult = await pool.query(`
        SELECT extname, extversion 
        FROM pg_extension 
        WHERE extname = 'vector'
      `)
      
      if (extensionResult.rows.length === 0) {
        return {
          status: 'fail',
          message: 'pgvector extension not installed',
          responseTime: Date.now() - startTime
        }
      }

      // Test vector operations
      await pool.query('SELECT vector_dims(\'[1,2,3]\'::vector) as dims')
      await pool.query('SELECT \'[1,2,3]\'::vector <-> \'[1,2,4]\'::vector as distance')
      await pool.query('SELECT \'[1,2,3]\'::vector <#> \'[1,2,4]\'::vector as inner_product')
      await pool.query('SELECT \'[1,2,3]\'::vector <=> \'[1,2,4]\'::vector as cosine_distance')

      return {
        status: 'pass',
        message: 'pgvector extension working correctly',
        details: {
          version: extensionResult.rows[0].extversion,
          operations: ['L2 distance', 'inner product', 'cosine distance', 'vector dimensions']
        },
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'pgvector extension check failed',
        details: {
          error: error instanceof Error ? error.message : String(error)
        },
        responseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Check migration status
   */
  private async checkMigrationStatus(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      const pool = await this.getPool()
      const migrationRunner = new MigrationRunner(pool)
      
      const status = await migrationRunner.getStatus()
      
      if (!status.isUpToDate) {
        return {
          status: 'warn',
          message: `${status.pendingCount} pending migrations found`,
          details: {
            availableCount: status.availableCount,
            executedCount: status.executedCount,
            pendingCount: status.pendingCount,
            pendingMigrations: status.pendingMigrations
          },
          responseTime: Date.now() - startTime
        }
      }

      return {
        status: 'pass',
        message: 'All migrations up to date',
        details: {
          availableCount: status.availableCount,
          executedCount: status.executedCount,
          lastMigration: status.executedMigrations[status.executedMigrations.length - 1]?.version
        },
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Migration status check failed',
        details: {
          error: error instanceof Error ? error.message : String(error)
        },
        responseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Check vector indexes status and performance
   */
  private async checkVectorIndexes(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      const pool = await this.getPool()
      
      // Get vector indexes
      const indexResult = await pool.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE indexdef LIKE '%vector%' 
        AND schemaname = 'public'
      `)

      if (indexResult.rows.length === 0) {
        return {
          status: 'warn',
          message: 'No vector indexes found',
          details: {
            recommendation: 'Consider creating vector indexes for better performance'
          },
          responseTime: Date.now() - startTime
        }
      }

      // Check index usage statistics
      const statsResult = await pool.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE indexname IN (${indexResult.rows.map((_, i) => `$${i + 1}`).join(',')})
      `, indexResult.rows.map(row => row.indexname))

      return {
        status: 'pass',
        message: `${indexResult.rows.length} vector indexes found`,
        details: {
          indexes: indexResult.rows.map(row => ({
            name: row.indexname,
            table: row.tablename,
            definition: row.indexdef
          })),
          usage: statsResult.rows
        },
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Vector indexes check failed',
        details: {
          error: error instanceof Error ? error.message : String(error)
        },
        responseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Check database performance metrics
   */
  private async checkPerformance(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      const pool = await this.getPool()
      
      // Check connection pool health
      const poolStats = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }

      // Check database size and table statistics
      const sizeResult = await pool.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as database_size,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
      `)

      // Check for long-running queries
      const longQueriesResult = await pool.query(`
        SELECT count(*) as long_running_queries
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start < NOW() - INTERVAL '5 minutes'
        AND query NOT LIKE '%pg_stat_activity%'
      `)

      // Performance test: simple vector operation
      const perfTestStart = Date.now()
      await pool.query('SELECT \'[1,2,3]\'::vector <-> \'[1,2,4]\'::vector')
      const vectorOpTime = Date.now() - perfTestStart

      const longRunningQueries = parseInt(longQueriesResult.rows[0].long_running_queries)
      const activeConnections = parseInt(sizeResult.rows[0].active_connections)

      let status: 'pass' | 'warn' | 'fail' = 'pass'
      let message = 'Database performance is good'

      if (longRunningQueries > 5) {
        status = 'warn'
        message = `${longRunningQueries} long-running queries detected`
      } else if (activeConnections > 50) {
        status = 'warn'
        message = `High number of active connections: ${activeConnections}`
      } else if (vectorOpTime > 100) {
        status = 'warn'
        message = `Slow vector operations detected: ${vectorOpTime}ms`
      }

      return {
        status,
        message,
        details: {
          databaseSize: sizeResult.rows[0].database_size,
          activeConnections,
          longRunningQueries,
          vectorOperationTime: vectorOpTime,
          connectionPool: poolStats
        },
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Performance check failed',
        details: {
          error: error instanceof Error ? error.message : String(error)
        },
        responseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Quick health check for API endpoints
   */
  public async quickHealthCheck(): Promise<{ status: string; message: string }> {
    try {
      const pool = await this.getPool()
      await pool.query('SELECT 1')
      
      return {
        status: 'healthy',
        message: 'Database is responsive'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database connection failed'
      }
    }
  }
}

// Export singleton instance
export const healthChecker = new DatabaseHealthChecker()

// Export for use in API routes
export default DatabaseHealthChecker