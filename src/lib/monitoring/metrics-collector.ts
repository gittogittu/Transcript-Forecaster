import { PerformanceMetrics, UserActivity, SystemHealthIndicator, MetricsSummary } from '@/types/monitoring'

class MetricsCollector {
  private metrics: PerformanceMetrics[] = []
  private userActivities: UserActivity[] = []
  private healthIndicators: Map<string, SystemHealthIndicator> = new Map()
  private readonly maxMetricsHistory = 1000
  private readonly maxActivityHistory = 5000

  // Record query performance
  recordQuery(duration: number, endpoint: string, success: boolean = true): void {
    const now = new Date()
    
    // Update queries per second metric
    this.updateQueriesPerSecond()
    
    // Record user activity
    this.recordUserActivity({
      id: crypto.randomUUID(),
      userId: 'system', // Will be updated with actual user ID in middleware
      action: 'api_request',
      endpoint,
      timestamp: now,
      duration,
      success,
    })

    // Update system health
    this.updateSystemHealth('api', duration < 1000 ? 'healthy' : duration < 3000 ? 'warning' : 'critical', 
      `API response time: ${duration}ms`, duration)
  }

  // Record ML model execution
  recordModelExecution(modelType: string, duration: number, success: boolean = true): void {
    const now = new Date()
    
    // Update model runtime metric
    this.updateModelRuntime(duration)
    
    // Record activity
    this.recordUserActivity({
      id: crypto.randomUUID(),
      userId: 'system',
      action: 'ml_prediction',
      endpoint: `/api/analytics/predict/${modelType}`,
      timestamp: now,
      duration,
      success,
    })

    // Update health indicator
    this.updateSystemHealth('ml_models', success ? 'healthy' : 'critical',
      `${modelType} model execution: ${success ? 'success' : 'failed'}`, duration)
  }

  // Record user activity
  recordUserActivity(activity: Omit<UserActivity, 'id'> & { id?: string }): void {
    const fullActivity: UserActivity = {
      id: activity.id || crypto.randomUUID(),
      ...activity,
    }

    this.userActivities.unshift(fullActivity)
    
    // Keep only recent activities
    if (this.userActivities.length > this.maxActivityHistory) {
      this.userActivities = this.userActivities.slice(0, this.maxActivityHistory)
    }

    // Update active users count
    this.updateActiveUsersCount()
  }

  // Record error
  recordError(error: Error, context: string, userId?: string): void {
    const now = new Date()
    
    // Increment error count
    this.incrementErrorCount()
    
    // Record as user activity
    this.recordUserActivity({
      userId: userId || 'anonymous',
      action: 'error',
      endpoint: context,
      timestamp: now,
      success: false,
      errorMessage: error.message,
    })

    // Update health indicator
    this.updateSystemHealth('errors', 'warning', `Error in ${context}: ${error.message}`)
  }

  // Get current metrics
  getCurrentMetrics(): PerformanceMetrics {
    const now = new Date()
    const recentActivities = this.getRecentActivities(60000) // Last minute
    
    return {
      id: crypto.randomUUID(),
      timestamp: now,
      queriesPerSecond: this.calculateQueriesPerSecond(),
      modelRuntime: this.calculateAverageModelRuntime(),
      dataSyncLatency: this.calculateDataSyncLatency(),
      errorCount: this.calculateErrorCount(),
      activeUsers: this.calculateActiveUsers(),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
    }
  }

  // Get metrics summary for a time range
  getMetricsSummary(startTime: Date, endTime: Date): MetricsSummary {
    const relevantActivities = this.userActivities.filter(
      activity => activity.timestamp >= startTime && activity.timestamp <= endTime
    )

    const successfulRequests = relevantActivities.filter(a => a.success && a.action === 'api_request')
    const errors = relevantActivities.filter(a => !a.success)
    
    // Group errors by message
    const errorGroups = errors.reduce((acc, error) => {
      const message = error.errorMessage || 'Unknown error'
      acc[message] = (acc[message] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topErrors = Object.entries(errorGroups)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      timeRange: { start: startTime, end: endTime },
      averageResponseTime: successfulRequests.reduce((sum, req) => sum + (req.duration || 0), 0) / successfulRequests.length || 0,
      totalRequests: relevantActivities.filter(a => a.action === 'api_request').length,
      errorRate: relevantActivities.length > 0 ? (errors.length / relevantActivities.length) * 100 : 0,
      peakActiveUsers: this.calculatePeakActiveUsers(startTime, endTime),
      averageMemoryUsage: this.calculateAverageMemoryUsage(),
      averageCpuUsage: this.calculateAverageCpuUsage(),
      topErrors,
    }
  }

  // Get system health indicators
  getSystemHealth(): SystemHealthIndicator[] {
    return Array.from(this.healthIndicators.values())
  }

  // Get recent user activities
  getRecentActivities(timeWindowMs: number = 300000): UserActivity[] {
    const cutoff = new Date(Date.now() - timeWindowMs)
    return this.userActivities.filter(activity => activity.timestamp >= cutoff)
  }

  // Private helper methods
  private updateQueriesPerSecond(): void {
    // Implementation would track queries in a sliding window
  }

  private updateModelRuntime(duration: number): void {
    // Store model execution times for averaging
  }

  private updateSystemHealth(component: string, status: SystemHealthIndicator['status'], 
                           message: string, responseTime?: number): void {
    this.healthIndicators.set(component, {
      component,
      status,
      message,
      lastChecked: new Date(),
      responseTime,
    })
  }

  private updateActiveUsersCount(): void {
    // Count unique users in recent activities
  }

  private incrementErrorCount(): void {
    // Track error count in sliding window
  }

  private calculateQueriesPerSecond(): number {
    const recentRequests = this.getRecentActivities(60000).filter(a => a.action === 'api_request')
    return recentRequests.length / 60 // Per second over last minute
  }

  private calculateAverageModelRuntime(): number {
    const modelExecutions = this.getRecentActivities(300000).filter(a => a.action === 'ml_prediction')
    if (modelExecutions.length === 0) return 0
    return modelExecutions.reduce((sum, exec) => sum + (exec.duration || 0), 0) / modelExecutions.length
  }

  private calculateDataSyncLatency(): number {
    // Placeholder - would measure database sync operations
    return Math.random() * 100 + 50 // 50-150ms simulated
  }

  private calculateErrorCount(): number {
    return this.getRecentActivities(300000).filter(a => !a.success).length
  }

  private calculateActiveUsers(): number {
    const recentActivities = this.getRecentActivities(300000)
    const uniqueUsers = new Set(recentActivities.map(a => a.userId))
    return uniqueUsers.size
  }

  private calculatePeakActiveUsers(startTime: Date, endTime: Date): number {
    // Simplified calculation - would need more sophisticated time window analysis
    const activities = this.userActivities.filter(
      a => a.timestamp >= startTime && a.timestamp <= endTime
    )
    const uniqueUsers = new Set(activities.map(a => a.userId))
    return uniqueUsers.size
  }

  private calculateAverageMemoryUsage(): number {
    return this.getMemoryUsage()
  }

  private calculateAverageCpuUsage(): number {
    return this.getCpuUsage()
  }

  private getMemoryUsage(): number {
    // In a real implementation, this would use process.memoryUsage()
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      return (usage.heapUsed / usage.heapTotal) * 100
    }
    return Math.random() * 30 + 40 // 40-70% simulated
  }

  private getCpuUsage(): number {
    // In a real implementation, this would measure actual CPU usage
    return Math.random() * 20 + 30 // 30-50% simulated
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector()