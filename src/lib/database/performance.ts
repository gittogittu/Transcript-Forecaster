import { Pool } from 'pg'
import { getDatabasePool } from './connection'
import { PerformanceMetrics, MetricsSummary, TimeRange } from '@/types/transcript'
import { PerformanceMetricsInput } from '@/lib/validations/schemas'

export class PerformanceService {
  private pool: Pool

  constructor() {
    this.pool = getDatabasePool()
  }

  async recordMetrics(data: PerformanceMetricsInput): Promise<PerformanceMetrics> {
    const query = `
      INSERT INTO performance_metrics (
        queries_per_second, model_runtime, data_sync_latency, 
        error_count, active_users, memory_usage, cpu_usage
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, timestamp, queries_per_second, model_runtime, data_sync_latency,
                error_count, active_users, memory_usage, cpu_usage
    `
    
    const values = [
      data.queriesPerSecond,
      data.modelRuntime,
      data.dataSyncLatency,
      data.errorCount,
      data.activeUsers,
      data.memoryUsage,
      data.cpuUsage
    ]
    
    const result = await this.pool.query(query, values)
    const row = result.rows[0]
    
    return {
      id: row.id,
      timestamp: row.timestamp,
      queriesPerSecond: row.queries_per_second,
      modelRuntime: row.model_runtime,
      dataSyncLatency: row.data_sync_latency,
      errorCount: row.error_count,
      activeUsers: row.active_users,
      memoryUsage: row.memory_usage,
      cpuUsage: row.cpu_usage
    }
  }

  async getMetrics(timeRange?: TimeRange, limit: number = 100): Promise<PerformanceMetrics[]> {
    let whereClause = ''
    let queryParams: any[] = []
    let paramIndex = 1

    if (timeRange) {
      whereClause = `WHERE timestamp >= $${paramIndex} AND timestamp <= $${paramIndex + 1}`
      queryParams.push(timeRange.start, timeRange.end)
      paramIndex += 2
    }

    const query = `
      SELECT id, timestamp, queries_per_second, model_runtime, data_sync_latency,
             error_count, active_users, memory_usage, cpu_usage
      FROM performance_metrics
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex}
    `
    
    queryParams.push(limit)
    const result = await this.pool.query(query, queryParams)
    
    return result.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      queriesPerSecond: row.queries_per_second,
      modelRuntime: row.model_runtime,
      dataSyncLatency: row.data_sync_latency,
      errorCount: row.error_count,
      activeUsers: row.active_users,
      memoryUsage: row.memory_usage,
      cpuUsage: row.cpu_usage
    }))
  }

  async getMetricsSummary(timeRange: TimeRange): Promise<MetricsSummary> {
    const query = `
      SELECT 
        AVG(queries_per_second) as avg_queries_per_second,
        AVG(model_runtime) as avg_model_runtime,
        AVG(data_sync_latency) as avg_data_sync_latency,
        SUM(error_count) as total_errors,
        MAX(active_users) as peak_active_users,
        AVG(memory_usage) as avg_memory_usage,
        AVG(cpu_usage) as avg_cpu_usage
      FROM performance_metrics
      WHERE timestamp >= $1 AND timestamp <= $2
    `
    
    const result = await this.pool.query(query, [timeRange.start, timeRange.end])
    const row = result.rows[0]
    
    return {
      timeRange,
      averageQueriesPerSecond: parseFloat(row.avg_queries_per_second) || 0,
      averageModelRuntime: parseFloat(row.avg_model_runtime) || 0,
      averageDataSyncLatency: parseFloat(row.avg_data_sync_latency) || 0,
      totalErrors: parseInt(row.total_errors) || 0,
      peakActiveUsers: parseInt(row.peak_active_users) || 0,
      averageMemoryUsage: parseFloat(row.avg_memory_usage) || 0,
      averageCpuUsage: parseFloat(row.avg_cpu_usage) || 0
    }
  }

  async getRecentMetrics(minutes: number = 60): Promise<PerformanceMetrics[]> {
    const query = `
      SELECT id, timestamp, queries_per_second, model_runtime, data_sync_latency,
             error_count, active_users, memory_usage, cpu_usage
      FROM performance_metrics
      WHERE timestamp >= NOW() - INTERVAL '${minutes} minutes'
      ORDER BY timestamp DESC
    `
    
    const result = await this.pool.query(query)
    
    return result.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      queriesPerSecond: row.queries_per_second,
      modelRuntime: row.model_runtime,
      dataSyncLatency: row.data_sync_latency,
      errorCount: row.error_count,
      activeUsers: row.active_users,
      memoryUsage: row.memory_usage,
      cpuUsage: row.cpu_usage
    }))
  }

  async getCurrentSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical'
    metrics: {
      averageResponseTime: number
      errorRate: number
      activeUsers: number
      systemLoad: number
    }
    alerts: string[]
  }> {
    // Get metrics from the last 5 minutes
    const recentMetrics = await this.getRecentMetrics(5)
    
    if (recentMetrics.length === 0) {
      return {
        status: 'warning',
        metrics: {
          averageResponseTime: 0,
          errorRate: 0,
          activeUsers: 0,
          systemLoad: 0
        },
        alerts: ['No recent performance data available']
      }
    }

    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.modelRuntime, 0) / recentMetrics.length
    const totalErrors = recentMetrics.reduce((sum, m) => sum + m.errorCount, 0)
    const errorRate = totalErrors / recentMetrics.length
    const currentActiveUsers = recentMetrics[0].activeUsers
    const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length

    const alerts: string[] = []
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'

    // Check for performance issues
    if (avgResponseTime > 5000) { // 5 seconds
      alerts.push('High average response time detected')
      status = 'warning'
    }

    if (avgResponseTime > 10000) { // 10 seconds
      alerts.push('Critical response time detected')
      status = 'critical'
    }

    if (errorRate > 5) {
      alerts.push('High error rate detected')
      status = status === 'critical' ? 'critical' : 'warning'
    }

    if (errorRate > 20) {
      alerts.push('Critical error rate detected')
      status = 'critical'
    }

    if (avgCpuUsage > 80) {
      alerts.push('High CPU usage detected')
      status = status === 'critical' ? 'critical' : 'warning'
    }

    if (avgCpuUsage > 95) {
      alerts.push('Critical CPU usage detected')
      status = 'critical'
    }

    return {
      status,
      metrics: {
        averageResponseTime: avgResponseTime,
        errorRate,
        activeUsers: currentActiveUsers,
        systemLoad: avgCpuUsage
      },
      alerts
    }
  }

  async cleanupOldMetrics(daysToKeep: number = 30): Promise<number> {
    const query = `
      DELETE FROM performance_metrics
      WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
    `
    
    const result = await this.pool.query(query)
    return result.rowCount
  }

  async getMetricsTrends(hours: number = 24): Promise<{
    queriesPerSecondTrend: Array<{ timestamp: Date; value: number }>
    modelRuntimeTrend: Array<{ timestamp: Date; value: number }>
    errorCountTrend: Array<{ timestamp: Date; value: number }>
    activeUsersTrend: Array<{ timestamp: Date; value: number }>
  }> {
    const query = `
      SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        AVG(queries_per_second) as avg_queries_per_second,
        AVG(model_runtime) as avg_model_runtime,
        SUM(error_count) as total_errors,
        AVG(active_users) as avg_active_users
      FROM performance_metrics
      WHERE timestamp >= NOW() - INTERVAL '${hours} hours'
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY hour ASC
    `
    
    const result = await this.pool.query(query)
    
    const queriesPerSecondTrend = result.rows.map(row => ({
      timestamp: row.hour,
      value: parseFloat(row.avg_queries_per_second) || 0
    }))
    
    const modelRuntimeTrend = result.rows.map(row => ({
      timestamp: row.hour,
      value: parseFloat(row.avg_model_runtime) || 0
    }))
    
    const errorCountTrend = result.rows.map(row => ({
      timestamp: row.hour,
      value: parseInt(row.total_errors) || 0
    }))
    
    const activeUsersTrend = result.rows.map(row => ({
      timestamp: row.hour,
      value: parseFloat(row.avg_active_users) || 0
    }))
    
    return {
      queriesPerSecondTrend,
      modelRuntimeTrend,
      errorCountTrend,
      activeUsersTrend
    }
  }
}