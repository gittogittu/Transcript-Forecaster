import { EventEmitter } from 'events'
import { 
  TimeSeriesData, 
  DetectedAnomaly, 
  AnomalyAlert, 
  RealTimeMonitorConfig,
  AnomalySeverity
} from './types'
import { StatisticalAnomalyDetector } from './statistical-detector'
import { IsolationForestDetector } from './isolation-forest-detector'

/**
 * Real-time Anomaly Monitor
 * Continuously monitors data streams for anomalies and generates alerts
 */
export class RealTimeAnomalyMonitor extends EventEmitter {
  private config: RealTimeMonitorConfig
  private statisticalDetector: StatisticalAnomalyDetector
  private isolationForestDetector: IsolationForestDetector
  private isMonitoring = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private dataBuffer: Map<string, TimeSeriesData> = new Map()
  private alertHistory: Map<string, AnomalyAlert[]> = new Map()
  private lastProcessedTime: Map<string, Date> = new Map()

  constructor(config: Partial<RealTimeMonitorConfig> = {}) {
    super()
    
    this.config = {
      checkInterval: 30000, // 30 seconds
      batchSize: 100,
      alertThreshold: 'medium' as AnomalySeverity,
      enableAutoRetraining: true,
      maxAlertsPerHour: 10,
      ...config
    }

    this.statisticalDetector = new StatisticalAnomalyDetector()
    this.isolationForestDetector = new IsolationForestDetector()
  }

  /**
   * Start real-time monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      throw new Error('Monitoring is already active')
    }

    this.isMonitoring = true
    this.emit('monitoring:started')

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.processDataBuffers()
      } catch (error) {
        this.emit('monitoring:error', error)
      }
    }, this.config.checkInterval)
  }

  /**
   * Stop real-time monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    this.emit('monitoring:stopped')
  }

  /**
   * Add data to monitoring buffer
   */
  async addData(clientId: string, data: TimeSeriesData): Promise<void> {
    if (!this.dataBuffer.has(clientId)) {
      this.dataBuffer.set(clientId, {
        timestamps: [],
        values: [],
        clientId,
        metadata: data.metadata
      })
    }

    const buffer = this.dataBuffer.get(clientId)!
    
    // Add new data points
    for (let i = 0; i < data.timestamps.length; i++) {
      buffer.timestamps.push(data.timestamps[i])
      buffer.values.push(data.values[i])
    }

    // Keep buffer size manageable
    const maxBufferSize = this.config.batchSize * 10
    if (buffer.timestamps.length > maxBufferSize) {
      const excess = buffer.timestamps.length - maxBufferSize
      buffer.timestamps.splice(0, excess)
      buffer.values.splice(0, excess)
    }

    this.emit('data:added', { clientId, dataPoints: data.timestamps.length })
  }

  /**
   * Train models with historical data
   */
  async trainModels(clientId: string, historicalData: TimeSeriesData): Promise<void> {
    try {
      // Train isolation forest with historical data
      await this.isolationForestDetector.train(historicalData)
      
      this.emit('models:trained', { clientId, dataPoints: historicalData.values.length })
    } catch (error) {
      this.emit('models:training_error', { clientId, error })
      throw error
    }
  }

  /**
   * Process all data buffers for anomalies
   */
  private async processDataBuffers(): Promise<void> {
    const processingPromises: Promise<void>[] = []

    for (const [clientId, buffer] of this.dataBuffer.entries()) {
      if (buffer.timestamps.length === 0) continue

      const lastProcessed = this.lastProcessedTime.get(clientId) || new Date(0)
      const newDataPoints = buffer.timestamps
        .map((timestamp, index) => ({ timestamp, value: buffer.values[index], index }))
        .filter(point => point.timestamp > lastProcessed)

      if (newDataPoints.length === 0) continue

      processingPromises.push(this.processClientData(clientId, buffer, newDataPoints))
    }

    await Promise.all(processingPromises)
  }

  /**
   * Process data for a specific client
   */
  private async processClientData(
    clientId: string, 
    buffer: TimeSeriesData, 
    newDataPoints: Array<{ timestamp: Date; value: number; index: number }>
  ): Promise<void> {
    try {
      // Create data slice for analysis (include some historical context)
      const contextSize = Math.min(50, buffer.timestamps.length)
      const startIndex = Math.max(0, newDataPoints[0].index - contextSize)
      const endIndex = newDataPoints[newDataPoints.length - 1].index + 1

      const analysisData: TimeSeriesData = {
        timestamps: buffer.timestamps.slice(startIndex, endIndex),
        values: buffer.values.slice(startIndex, endIndex),
        clientId,
        metadata: buffer.metadata
      }

      // Detect anomalies using both methods
      const [statisticalAnomalies, isolationAnomalies] = await Promise.all([
        this.detectStatisticalAnomalies(analysisData, newDataPoints),
        this.detectIsolationAnomalies(analysisData, newDataPoints)
      ])

      // Merge and deduplicate anomalies
      const allAnomalies = [...statisticalAnomalies, ...isolationAnomalies]
      const uniqueAnomalies = this.deduplicateAnomalies(allAnomalies)

      // Generate alerts for significant anomalies
      for (const anomaly of uniqueAnomalies) {
        if (this.shouldGenerateAlert(anomaly)) {
          const alert = await this.generateAlert(anomaly)
          await this.processAlert(alert)
        }
      }

      // Update last processed time
      const lastTimestamp = newDataPoints[newDataPoints.length - 1].timestamp
      this.lastProcessedTime.set(clientId, lastTimestamp)

      // Auto-retrain models if enabled and significant drift detected
      if (this.config.enableAutoRetraining && uniqueAnomalies.length > 0) {
        await this.checkForModelDrift(clientId, uniqueAnomalies, buffer)
      }

      this.emit('processing:completed', { 
        clientId, 
        processedPoints: newDataPoints.length,
        anomaliesFound: uniqueAnomalies.length 
      })

    } catch (error) {
      this.emit('processing:error', { clientId, error })
    }
  }

  /**
   * Detect anomalies using statistical methods
   */
  private async detectStatisticalAnomalies(
    data: TimeSeriesData, 
    newDataPoints: Array<{ timestamp: Date; value: number; index: number }>
  ): Promise<DetectedAnomaly[]> {
    try {
      const allAnomalies = await this.statisticalDetector.detectAnomalies(data)
      
      // Filter to only new data points
      const newTimestamps = new Set(newDataPoints.map(p => p.timestamp.getTime()))
      return allAnomalies.filter(anomaly => 
        newTimestamps.has(anomaly.timestamp.getTime())
      )
    } catch (error) {
      this.emit('detection:statistical_error', { clientId: data.clientId, error })
      return []
    }
  }

  /**
   * Detect anomalies using isolation forest
   */
  private async detectIsolationAnomalies(
    data: TimeSeriesData, 
    newDataPoints: Array<{ timestamp: Date; value: number; index: number }>
  ): Promise<DetectedAnomaly[]> {
    try {
      const allAnomalies = await this.isolationForestDetector.detectAnomalies(data)
      
      // Filter to only new data points
      const newTimestamps = new Set(newDataPoints.map(p => p.timestamp.getTime()))
      return allAnomalies.filter(anomaly => 
        newTimestamps.has(anomaly.timestamp.getTime())
      )
    } catch (error) {
      this.emit('detection:isolation_error', { clientId: data.clientId, error })
      return []
    }
  }

  /**
   * Remove duplicate anomalies from different detection methods
   */
  private deduplicateAnomalies(anomalies: DetectedAnomaly[]): DetectedAnomaly[] {
    const unique: DetectedAnomaly[] = []
    const timeWindow = 60000 // 1 minute tolerance

    anomalies.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    for (const anomaly of anomalies) {
      const existing = unique.find(u => 
        Math.abs(u.timestamp.getTime() - anomaly.timestamp.getTime()) < timeWindow &&
        u.clientId === anomaly.clientId
      )

      if (existing) {
        // Keep the one with higher confidence
        if (anomaly.confidence > existing.confidence) {
          const index = unique.indexOf(existing)
          unique[index] = {
            ...anomaly,
            detectionMethod: 'ensemble' as any,
            explanation: `${existing.explanation}; ${anomaly.explanation}`,
            metadata: {
              ...existing.metadata,
              ...anomaly.metadata,
              mergedMethods: [existing.detectionMethod, anomaly.detectionMethod]
            }
          }
        }
      } else {
        unique.push(anomaly)
      }
    }

    return unique
  }

  /**
   * Determine if an alert should be generated for an anomaly
   */
  private shouldGenerateAlert(anomaly: DetectedAnomaly): boolean {
    // Check severity threshold
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 }
    const anomalySeverityLevel = severityLevels[anomaly.severity]
    const thresholdLevel = severityLevels[this.config.alertThreshold]
    
    if (anomalySeverityLevel < thresholdLevel) return false

    // Check rate limiting
    const clientAlerts = this.alertHistory.get(anomaly.clientId) || []
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentAlerts = clientAlerts.filter(alert => alert.timestamp > oneHourAgo)
    
    return recentAlerts.length < this.config.maxAlertsPerHour
  }

  /**
   * Generate alert for anomaly
   */
  private async generateAlert(anomaly: DetectedAnomaly): Promise<AnomalyAlert> {
    const alert: AnomalyAlert = {
      id: `alert_${anomaly.id}_${Date.now()}`,
      anomalyId: anomaly.id,
      severity: anomaly.severity,
      title: this.generateAlertTitle(anomaly),
      message: this.generateAlertMessage(anomaly),
      timestamp: new Date(),
      clientId: anomaly.clientId,
      isAcknowledged: false,
      recommendedActions: this.generateRecommendedActions(anomaly)
    }

    return alert
  }

  /**
   * Process and emit alert
   */
  private async processAlert(alert: AnomalyAlert): Promise<void> {
    // Add to alert history
    if (!this.alertHistory.has(alert.clientId)) {
      this.alertHistory.set(alert.clientId, [])
    }
    this.alertHistory.get(alert.clientId)!.push(alert)

    // Clean up old alerts (keep last 100 per client)
    const clientAlerts = this.alertHistory.get(alert.clientId)!
    if (clientAlerts.length > 100) {
      clientAlerts.splice(0, clientAlerts.length - 100)
    }

    // Emit alert event
    this.emit('alert:generated', alert)

    // Emit severity-specific events
    this.emit(`alert:${alert.severity}`, alert)
  }

  /**
   * Check for model drift and retrain if necessary
   */
  private async checkForModelDrift(
    clientId: string, 
    anomalies: DetectedAnomaly[], 
    buffer: TimeSeriesData
  ): Promise<void> {
    // Simple drift detection: if too many anomalies in recent period, retrain
    const recentAnomalies = anomalies.filter(a => 
      Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    )

    const driftThreshold = 0.1 // 10% of recent data points
    const recentDataPoints = buffer.timestamps.filter(t => 
      Date.now() - t.getTime() < 24 * 60 * 60 * 1000
    ).length

    if (recentAnomalies.length / recentDataPoints > driftThreshold) {
      this.emit('model:drift_detected', { clientId, anomalyRate: recentAnomalies.length / recentDataPoints })
      
      try {
        // Retrain with recent data
        const recentData: TimeSeriesData = {
          timestamps: buffer.timestamps.slice(-1000), // Last 1000 points
          values: buffer.values.slice(-1000),
          clientId,
          metadata: buffer.metadata
        }
        
        await this.isolationForestDetector.updateModel(recentData)
        this.emit('model:retrained', { clientId })
      } catch (error) {
        this.emit('model:retrain_error', { clientId, error })
      }
    }
  }

  /**
   * Generate alert title
   */
  private generateAlertTitle(anomaly: DetectedAnomaly): string {
    const severityText = anomaly.severity.toUpperCase()
    const typeText = anomaly.type.charAt(0).toUpperCase() + anomaly.type.slice(1)
    return `${severityText} ${typeText} Anomaly Detected`
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(anomaly: DetectedAnomaly): string {
    return `${anomaly.explanation}. Confidence: ${(anomaly.confidence * 100).toFixed(1)}%. ` +
           `Actual value: ${anomaly.actualValue.toFixed(2)}, Expected: ${anomaly.expectedValue.toFixed(2)}.`
  }

  /**
   * Generate recommended actions based on anomaly characteristics
   */
  private generateRecommendedActions(anomaly: DetectedAnomaly): string[] {
    const actions: string[] = []

    switch (anomaly.severity) {
      case 'critical':
        actions.push('Immediate investigation required')
        actions.push('Check system health and data sources')
        actions.push('Notify relevant stakeholders')
        break
      case 'high':
        actions.push('Investigate within 1 hour')
        actions.push('Review recent changes or events')
        break
      case 'medium':
        actions.push('Monitor for additional anomalies')
        actions.push('Review during next business hours')
        break
      case 'low':
        actions.push('Log for trend analysis')
        break
    }

    switch (anomaly.type) {
      case 'collective':
        actions.push('Analyze pattern duration and scope')
        actions.push('Check for systematic issues')
        break
      case 'contextual':
        actions.push('Review contextual factors (time, seasonality)')
        actions.push('Compare with historical patterns')
        break
      case 'point':
        actions.push('Verify data quality for this specific point')
        break
    }

    return actions
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isMonitoring: boolean
    clientsMonitored: number
    totalDataPoints: number
    alertsGenerated: number
  } {
    const totalDataPoints = Array.from(this.dataBuffer.values())
      .reduce((sum, buffer) => sum + buffer.values.length, 0)
    
    const alertsGenerated = Array.from(this.alertHistory.values())
      .reduce((sum, alerts) => sum + alerts.length, 0)

    return {
      isMonitoring: this.isMonitoring,
      clientsMonitored: this.dataBuffer.size,
      totalDataPoints,
      alertsGenerated
    }
  }

  /**
   * Get alerts for a specific client
   */
  getClientAlerts(clientId: string, limit = 50): AnomalyAlert[] {
    const alerts = this.alertHistory.get(clientId) || []
    return alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    for (const alerts of this.alertHistory.values()) {
      const alert = alerts.find(a => a.id === alertId)
      if (alert) {
        alert.isAcknowledged = true
        this.emit('alert:acknowledged', alert)
        return true
      }
    }
    return false
  }
}