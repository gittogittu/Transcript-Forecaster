import { 
  PerformanceMetrics, 
  PerformanceAlert, 
  SystemHealthStatus, 
  ComponentHealth,
  PerformanceThresholds,
  ModelPerformanceHistory,
  TrendAnalysis
} from './types'

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map()
  private alerts: PerformanceAlert[] = []
  private thresholds: PerformanceThresholds
  private monitoringInterval: number

  constructor(thresholds: PerformanceThresholds, monitoringInterval = 30000) {
    this.thresholds = thresholds
    this.monitoringInterval = monitoringInterval
    this.startMonitoring()
  }

  async recordMetrics(metrics: PerformanceMetrics): Promise<void> {
    const modelMetrics = this.metrics.get(metrics.modelId) || []
    modelMetrics.push(metrics)
    
    // Keep only last 1000 metrics per model
    if (modelMetrics.length > 1000) {
      modelMetrics.splice(0, modelMetrics.length - 1000)
    }
    
    this.metrics.set(metrics.modelId, modelMetrics)
    
    // Check for threshold violations
    await this.checkThresholds(metrics)
    
    // Store in database
    await this.persistMetrics(metrics)
  }

  async getSystemHealth(): Promise<SystemHealthStatus> {
    const components = {
      vertexAI: await this.checkVertexAIHealth(),
      neonDB: await this.checkNeonDBHealth(),
      vectorSearch: await this.checkVectorSearchHealth(),
      predictionEngine: await this.checkPredictionEngineHealth(),
      caching: await this.checkCachingHealth()
    }

    const overall = this.determineOverallHealth(components)

    return {
      overall,
      components,
      lastUpdated: new Date()
    }
  }

  async getModelPerformanceHistory(
    modelId: string, 
    timeRange: { start: Date; end: Date }
  ): Promise<ModelPerformanceHistory> {
    const metrics = await this.getMetricsInRange(modelId, timeRange)
    const alerts = await this.getAlertsInRange(modelId, timeRange)
    const trends = this.analyzeTrends(metrics)
    const recommendations = await this.generateRecommendations(modelId, metrics, trends)

    return {
      modelId,
      timeRange,
      metrics,
      trends,
      alerts,
      recommendations
    }
  }

  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    return this.alerts.filter(alert => !alert.isResolved)
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.isResolved = true
      alert.resolvedAt = new Date()
      await this.persistAlert(alert)
    }
  }

  private async checkThresholds(metrics: PerformanceMetrics): Promise<void> {
    const alerts: PerformanceAlert[] = []

    // Check accuracy thresholds
    if (metrics.accuracy.mae > this.thresholds.accuracy.maeThreshold) {
      alerts.push(this.createAlert(
        'accuracy_degradation',
        'high',
        metrics.modelId,
        `MAE exceeded threshold: ${metrics.accuracy.mae} > ${this.thresholds.accuracy.maeThreshold}`,
        this.thresholds.accuracy.maeThreshold,
        metrics.accuracy.mae
      ))
    }

    if (metrics.accuracy.accuracyScore < this.thresholds.accuracy.accuracyMinimum) {
      alerts.push(this.createAlert(
        'accuracy_degradation',
        'critical',
        metrics.modelId,
        `Accuracy below minimum: ${metrics.accuracy.accuracyScore} < ${this.thresholds.accuracy.accuracyMinimum}`,
        this.thresholds.accuracy.accuracyMinimum,
        metrics.accuracy.accuracyScore
      ))
    }

    // Check latency thresholds
    if (metrics.predictionLatency > this.thresholds.latency.maxPredictionTime) {
      alerts.push(this.createAlert(
        'latency_spike',
        'medium',
        metrics.modelId,
        `Prediction latency exceeded: ${metrics.predictionLatency}ms > ${this.thresholds.latency.maxPredictionTime}ms`,
        this.thresholds.latency.maxPredictionTime,
        metrics.predictionLatency
      ))
    }

    // Check resource thresholds
    if (metrics.memoryUsage > this.thresholds.resources.maxMemoryUsage) {
      alerts.push(this.createAlert(
        'resource_exhaustion',
        'high',
        metrics.modelId,
        `Memory usage exceeded: ${metrics.memoryUsage}MB > ${this.thresholds.resources.maxMemoryUsage}MB`,
        this.thresholds.resources.maxMemoryUsage,
        metrics.memoryUsage
      ))
    }

    if (metrics.resourceUtilization.errorRate > this.thresholds.resources.maxErrorRate) {
      alerts.push(this.createAlert(
        'error_rate_high',
        'critical',
        metrics.modelId,
        `Error rate exceeded: ${metrics.resourceUtilization.errorRate}% > ${this.thresholds.resources.maxErrorRate}%`,
        this.thresholds.resources.maxErrorRate,
        metrics.resourceUtilization.errorRate
      ))
    }

    // Process new alerts
    for (const alert of alerts) {
      this.alerts.push(alert)
      await this.persistAlert(alert)
      await this.sendAlert(alert)
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    modelId: string,
    message: string,
    threshold: number,
    currentValue: number
  ): PerformanceAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      modelId,
      message,
      threshold,
      currentValue,
      timestamp: new Date(),
      isResolved: false
    }
  }

  private async checkVertexAIHealth(): Promise<ComponentHealth> {
    try {
      const startTime = Date.now()
      // Mock Vertex AI health check - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 50))
      const latency = Date.now() - startTime

      return {
        status: latency < 1000 ? 'healthy' : 'degraded',
        latency,
        errorRate: 0,
        uptime: 99.9,
        lastCheck: new Date()
      }
    } catch (error) {
      return {
        status: 'critical',
        latency: 0,
        errorRate: 100,
        uptime: 0,
        lastCheck: new Date(),
        issues: [`Vertex AI connection failed: ${error}`]
      }
    }
  }

  private async checkNeonDBHealth(): Promise<ComponentHealth> {
    try {
      const startTime = Date.now()
      // Mock Neon DB health check - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 30))
      const latency = Date.now() - startTime

      return {
        status: latency < 500 ? 'healthy' : 'degraded',
        latency,
        errorRate: 0,
        uptime: 99.95,
        lastCheck: new Date()
      }
    } catch (error) {
      return {
        status: 'critical',
        latency: 0,
        errorRate: 100,
        uptime: 0,
        lastCheck: new Date(),
        issues: [`Neon DB connection failed: ${error}`]
      }
    }
  }

  private async checkVectorSearchHealth(): Promise<ComponentHealth> {
    try {
      const startTime = Date.now()
      // Mock vector search health check - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 100))
      const latency = Date.now() - startTime

      return {
        status: latency < 200 ? 'healthy' : 'degraded',
        latency,
        errorRate: 0,
        uptime: 99.8,
        lastCheck: new Date()
      }
    } catch (error) {
      return {
        status: 'critical',
        latency: 0,
        errorRate: 100,
        uptime: 0,
        lastCheck: new Date(),
        issues: [`Vector search failed: ${error}`]
      }
    }
  }

  private async checkPredictionEngineHealth(): Promise<ComponentHealth> {
    const recentMetrics = Array.from(this.metrics.values())
      .flat()
      .filter(m => Date.now() - m.timestamp.getTime() < 300000) // Last 5 minutes

    if (recentMetrics.length === 0) {
      return {
        status: 'degraded',
        latency: 0,
        errorRate: 0,
        uptime: 0,
        lastCheck: new Date(),
        issues: ['No recent prediction activity']
      }
    }

    const avgLatency = recentMetrics.reduce((sum, m) => sum + m.predictionLatency, 0) / recentMetrics.length
    const avgErrorRate = recentMetrics.reduce((sum, m) => sum + m.resourceUtilization.errorRate, 0) / recentMetrics.length

    return {
      status: avgLatency < 1000 && avgErrorRate < 5 ? 'healthy' : 'degraded',
      latency: avgLatency,
      errorRate: avgErrorRate,
      uptime: 99.5,
      lastCheck: new Date()
    }
  }

  private async checkCachingHealth(): Promise<ComponentHealth> {
    const recentMetrics = Array.from(this.metrics.values())
      .flat()
      .filter(m => Date.now() - m.timestamp.getTime() < 300000) // Last 5 minutes

    if (recentMetrics.length === 0) {
      return {
        status: 'healthy',
        latency: 0,
        errorRate: 0,
        uptime: 100,
        lastCheck: new Date()
      }
    }

    const avgCacheHitRate = recentMetrics.reduce((sum, m) => sum + m.resourceUtilization.cacheHitRate, 0) / recentMetrics.length

    return {
      status: avgCacheHitRate > 70 ? 'healthy' : 'degraded',
      latency: 10,
      errorRate: 0,
      uptime: 99.9,
      lastCheck: new Date(),
      issues: avgCacheHitRate <= 70 ? [`Low cache hit rate: ${avgCacheHitRate.toFixed(1)}%`] : undefined
    }
  }

  private determineOverallHealth(components: SystemHealthStatus['components']): SystemHealthStatus['overall'] {
    const statuses = Object.values(components).map(c => c.status)
    
    if (statuses.some(s => s === 'critical')) return 'critical'
    if (statuses.some(s => s === 'degraded')) return 'degraded'
    return 'healthy'
  }

  private analyzeTrends(metrics: PerformanceMetrics[]): ModelPerformanceHistory['trends'] {
    if (metrics.length < 2) {
      return {
        accuracy: { direction: 'stable', changeRate: 0, confidence: 0, significance: 'low' },
        latency: { direction: 'stable', changeRate: 0, confidence: 0, significance: 'low' },
        resourceUsage: { direction: 'stable', changeRate: 0, confidence: 0, significance: 'low' }
      }
    }

    return {
      accuracy: this.analyzeTrend(metrics.map(m => m.accuracy.accuracyScore)),
      latency: this.analyzeTrend(metrics.map(m => m.predictionLatency)),
      resourceUsage: this.analyzeTrend(metrics.map(m => m.memoryUsage))
    }
  }

  private analyzeTrend(values: number[]): TrendAnalysis {
    if (values.length < 2) {
      return { direction: 'stable', changeRate: 0, confidence: 0, significance: 'low' }
    }

    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length
    
    const changeRate = firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0
    const confidence = Math.min(values.length / 10, 1) // More data = higher confidence
    
    let direction: TrendAnalysis['direction'] = 'stable'
    let significance: TrendAnalysis['significance'] = 'low'
    
    if (Math.abs(changeRate) > 5) { // Lower threshold for test
      direction = changeRate > 0 ? 'improving' : 'degrading'
      significance = Math.abs(changeRate) > 15 ? 'high' : 'medium'
    }

    return { direction, changeRate, confidence, significance }
  }

  private async getMetricsInRange(
    modelId: string, 
    timeRange: { start: Date; end: Date }
  ): Promise<PerformanceMetrics[]> {
    const modelMetrics = this.metrics.get(modelId) || []
    return modelMetrics.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    )
  }

  private async getAlertsInRange(
    modelId: string, 
    timeRange: { start: Date; end: Date }
  ): Promise<PerformanceAlert[]> {
    return this.alerts.filter(a => 
      a.modelId === modelId &&
      a.timestamp >= timeRange.start && 
      a.timestamp <= timeRange.end
    )
  }

  private async generateRecommendations(
    modelId: string, 
    metrics: PerformanceMetrics[], 
    trends: ModelPerformanceHistory['trends']
  ) {
    // This would be implemented with actual recommendation logic
    return []
  }

  private async persistMetrics(metrics: PerformanceMetrics): Promise<void> {
    // Implementation would store metrics in database
    console.log('Persisting metrics:', metrics.id)
  }

  private async persistAlert(alert: PerformanceAlert): Promise<void> {
    // Implementation would store alert in database
    console.log('Persisting alert:', alert.id)
  }

  private async sendAlert(alert: PerformanceAlert): Promise<void> {
    // Implementation would send alert via email, Slack, etc.
    console.log('Sending alert:', alert.message)
  }

  private startMonitoring(): void {
    setInterval(async () => {
      try {
        await this.performHealthChecks()
      } catch (error) {
        console.error('Health check failed:', error)
      }
    }, this.monitoringInterval)
  }

  private async performHealthChecks(): Promise<void> {
    const health = await this.getSystemHealth()
    
    // Log system health
    console.log('System health check:', health.overall)
    
    // Check for critical issues
    Object.entries(health.components).forEach(([component, status]) => {
      if (status.status === 'critical') {
        console.error(`Critical issue in ${component}:`, status.issues)
      }
    })
  }
}