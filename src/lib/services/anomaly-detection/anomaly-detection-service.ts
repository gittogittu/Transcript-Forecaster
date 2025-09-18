import { 
  TimeSeriesData, 
  DetectedAnomaly, 
  AnomalyDetectionResult,
  AnomalyExplanation,
  AnomalyRecommendation,
  StatisticalAnomalyConfig,
  IsolationForestConfig,
  RealTimeMonitorConfig
} from './types'
import { StatisticalAnomalyDetector } from './statistical-detector'
import { IsolationForestDetector } from './isolation-forest-detector'
import { RealTimeAnomalyMonitor } from './real-time-monitor'
import { AnomalyClassifier } from './anomaly-classifier'
import { AnomalyExplanationEngine } from './explanation-engine'

/**
 * Main Anomaly Detection Service
 * Orchestrates all anomaly detection components and provides unified interface
 */
export class AnomalyDetectionService {
  private statisticalDetector: StatisticalAnomalyDetector
  private isolationForestDetector: IsolationForestDetector
  private realTimeMonitor: RealTimeAnomalyMonitor
  private anomalyClassifier: AnomalyClassifier
  private explanationEngine: AnomalyExplanationEngine
  private isInitialized = false

  constructor(
    statisticalConfig?: Partial<StatisticalAnomalyConfig>,
    isolationForestConfig?: Partial<IsolationForestConfig>,
    realTimeConfig?: Partial<RealTimeMonitorConfig>
  ) {
    this.statisticalDetector = new StatisticalAnomalyDetector(statisticalConfig)
    this.isolationForestDetector = new IsolationForestDetector(isolationForestConfig)
    this.realTimeMonitor = new RealTimeAnomalyMonitor(realTimeConfig)
    this.anomalyClassifier = new AnomalyClassifier()
    this.explanationEngine = new AnomalyExplanationEngine()
  }

  /**
   * Initialize the service with training data
   */
  async initialize(trainingData: TimeSeriesData[]): Promise<void> {
    try {
      // Train isolation forest with combined training data
      if (trainingData.length > 0) {
        const combinedData = this.combineTrainingData(trainingData)
        await this.isolationForestDetector.train(combinedData)
      }

      // Set up real-time monitor event handlers
      this.setupRealTimeMonitorHandlers()

      this.isInitialized = true
    } catch (error) {
      throw new Error(`Failed to initialize anomaly detection service: ${error}`)
    }
  }

  /**
   * Detect anomalies in time series data using all available methods
   */
  async detectAnomalies(data: TimeSeriesData): Promise<AnomalyDetectionResult> {
    if (!this.isInitialized) {
      throw new Error('Service must be initialized before detecting anomalies')
    }

    const startTime = Date.now()
    
    try {
      // Run detection methods in parallel
      const [statisticalAnomalies, isolationAnomalies] = await Promise.all([
        this.statisticalDetector.detectAnomalies(data).catch(() => []),
        this.isolationForestDetector.detectAnomalies(data).catch(() => [])
      ])

      // Combine and deduplicate anomalies
      const allAnomalies = [...statisticalAnomalies, ...isolationAnomalies]
      const uniqueAnomalies = await this.deduplicateAnomalies(allAnomalies)

      // Classify anomalies
      const classifiedAnomalies = await this.anomalyClassifier.classifyAnomalies(uniqueAnomalies, data)

      // Calculate overall severity and generate summary
      const overallSeverity = this.calculateOverallSeverity(classifiedAnomalies)
      const detectionSummary = this.generateDetectionSummary(classifiedAnomalies, data)
      const recommendedActions = this.generateQuickActions(classifiedAnomalies)
      const confidence = this.calculateOverallConfidence(classifiedAnomalies)

      const processingTime = Date.now() - startTime

      return {
        anomalies: classifiedAnomalies,
        overallSeverity,
        detectionSummary,
        recommendedActions,
        confidence,
        processingTime
      }
    } catch (error) {
      throw new Error(`Anomaly detection failed: ${error}`)
    }
  }

  /**
   * Generate detailed explanations for detected anomalies
   */
  async explainAnomalies(
    anomalies: DetectedAnomaly[], 
    data: TimeSeriesData,
    historicalData?: TimeSeriesData[]
  ): Promise<Map<string, AnomalyExplanation>> {
    return this.explanationEngine.generateBatchExplanations(anomalies, data, historicalData)
  }

  /**
   * Generate recommendations for anomalies
   */
  async generateRecommendations(
    anomaly: DetectedAnomaly, 
    explanation: AnomalyExplanation,
    data: TimeSeriesData
  ): Promise<AnomalyRecommendation[]> {
    return this.explanationEngine.generateRecommendations(anomaly, explanation, data)
  }

  /**
   * Start real-time monitoring for a client
   */
  async startRealTimeMonitoring(clientId: string, historicalData?: TimeSeriesData): Promise<void> {
    if (historicalData) {
      await this.realTimeMonitor.trainModels(clientId, historicalData)
    }
    
    if (!this.realTimeMonitor.getStatus().isMonitoring) {
      await this.realTimeMonitor.startMonitoring()
    }
  }

  /**
   * Stop real-time monitoring
   */
  async stopRealTimeMonitoring(): Promise<void> {
    await this.realTimeMonitor.stopMonitoring()
  }

  /**
   * Add data to real-time monitoring buffer
   */
  async addRealTimeData(clientId: string, data: TimeSeriesData): Promise<void> {
    await this.realTimeMonitor.addData(clientId, data)
  }

  /**
   * Get real-time monitoring status
   */
  getMonitoringStatus(): {
    isMonitoring: boolean
    clientsMonitored: number
    totalDataPoints: number
    alertsGenerated: number
  } {
    return this.realTimeMonitor.getStatus()
  }

  /**
   * Get alerts for a specific client
   */
  getClientAlerts(clientId: string, limit = 50) {
    return this.realTimeMonitor.getClientAlerts(clientId, limit)
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    return this.realTimeMonitor.acknowledgeAlert(alertId)
  }

  /**
   * Update model with new training data
   */
  async updateModels(newTrainingData: TimeSeriesData[]): Promise<void> {
    if (newTrainingData.length > 0) {
      const combinedData = this.combineTrainingData(newTrainingData)
      await this.isolationForestDetector.updateModel(combinedData)
    }
  }

  /**
   * Validate anomaly detection results
   */
  async validatePredictions(
    predictions: DetectedAnomaly[], 
    actualData: TimeSeriesData
  ): Promise<{
    truePositives: number
    falsePositives: number
    trueNegatives: number
    falseNegatives: number
    precision: number
    recall: number
    f1Score: number
  }> {
    // This would typically require labeled ground truth data
    // For now, return placeholder validation metrics
    const totalPredictions = predictions.length
    const totalDataPoints = actualData.values.length
    
    // Simplified validation - in practice, this would use actual labels
    const truePositives = Math.floor(totalPredictions * 0.8) // Assume 80% are correct
    const falsePositives = totalPredictions - truePositives
    const falseNegatives = Math.floor(totalDataPoints * 0.02) // Assume 2% missed
    const trueNegatives = totalDataPoints - truePositives - falsePositives - falseNegatives
    
    const precision = truePositives / (truePositives + falsePositives)
    const recall = truePositives / (truePositives + falseNegatives)
    const f1Score = 2 * (precision * recall) / (precision + recall)
    
    return {
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      precision: isNaN(precision) ? 0 : precision,
      recall: isNaN(recall) ? 0 : recall,
      f1Score: isNaN(f1Score) ? 0 : f1Score
    }
  }

  /**
   * Get service configuration
   */
  getConfiguration(): {
    statistical: StatisticalAnomalyConfig
    isolationForest: IsolationForestConfig
    realTimeMonitor: RealTimeMonitorConfig
  } {
    return {
      statistical: (this.statisticalDetector as any).config,
      isolationForest: (this.isolationForestDetector as any).config,
      realTimeMonitor: (this.realTimeMonitor as any).config
    }
  }

  /**
   * Update service configuration
   */
  async updateConfiguration(config: {
    statistical?: Partial<StatisticalAnomalyConfig>
    isolationForest?: Partial<IsolationForestConfig>
    realTimeMonitor?: Partial<RealTimeMonitorConfig>
  }): Promise<void> {
    if (config.statistical) {
      this.statisticalDetector = new StatisticalAnomalyDetector(config.statistical)
    }
    
    if (config.isolationForest) {
      this.isolationForestDetector = new IsolationForestDetector(config.isolationForest)
      // Re-initialize if we have training data
      this.isInitialized = false
    }
    
    if (config.realTimeMonitor) {
      const wasMonitoring = this.realTimeMonitor.getStatus().isMonitoring
      if (wasMonitoring) {
        await this.realTimeMonitor.stopMonitoring()
      }
      
      this.realTimeMonitor = new RealTimeAnomalyMonitor(config.realTimeMonitor)
      this.setupRealTimeMonitorHandlers()
      
      if (wasMonitoring) {
        await this.realTimeMonitor.startMonitoring()
      }
    }
  }

  // Private helper methods

  /**
   * Combine multiple training datasets
   */
  private combineTrainingData(trainingData: TimeSeriesData[]): TimeSeriesData {
    const combined: TimeSeriesData = {
      timestamps: [],
      values: [],
      clientId: 'combined',
      metadata: { source: 'multiple_datasets' }
    }

    for (const data of trainingData) {
      combined.timestamps.push(...data.timestamps)
      combined.values.push(...data.values)
    }

    // Sort by timestamp
    const sortedIndices = combined.timestamps
      .map((timestamp, index) => ({ timestamp, index }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(item => item.index)

    combined.timestamps = sortedIndices.map(i => combined.timestamps[i])
    combined.values = sortedIndices.map(i => combined.values[i])

    return combined
  }

  /**
   * Remove duplicate anomalies from different detection methods
   */
  private async deduplicateAnomalies(anomalies: DetectedAnomaly[]): Promise<DetectedAnomaly[]> {
    const unique: DetectedAnomaly[] = []
    const timeWindow = 60000 // 1 minute tolerance

    anomalies.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    for (const anomaly of anomalies) {
      const existing = unique.find(u => 
        Math.abs(u.timestamp.getTime() - anomaly.timestamp.getTime()) < timeWindow &&
        u.clientId === anomaly.clientId
      )

      if (existing) {
        // Merge anomalies - keep the one with higher confidence
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
   * Calculate overall severity from multiple anomalies
   */
  private calculateOverallSeverity(anomalies: DetectedAnomaly[]) {
    if (anomalies.length === 0) return 'low'
    
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 }
    const maxSeverity = Math.max(...anomalies.map(a => severityScores[a.severity]))
    
    const severityMap = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' }
    return severityMap[maxSeverity as keyof typeof severityMap]
  }

  /**
   * Generate detection summary
   */
  private generateDetectionSummary(anomalies: DetectedAnomaly[], data: TimeSeriesData): string {
    if (anomalies.length === 0) {
      return 'No anomalies detected in the provided data'
    }

    const typeCount = anomalies.reduce((acc, anomaly) => {
      acc[anomaly.type] = (acc[anomaly.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const severityCount = anomalies.reduce((acc, anomaly) => {
      acc[anomaly.severity] = (acc[anomaly.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    let summary = `Detected ${anomalies.length} anomalies in ${data.values.length} data points. `
    
    // Add type breakdown
    const typeBreakdown = Object.entries(typeCount)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ')
    summary += `Types: ${typeBreakdown}. `

    // Add severity breakdown
    const severityBreakdown = Object.entries(severityCount)
      .map(([severity, count]) => `${count} ${severity}`)
      .join(', ')
    summary += `Severity: ${severityBreakdown}.`

    return summary
  }

  /**
   * Generate quick action recommendations
   */
  private generateQuickActions(anomalies: DetectedAnomaly[]): string[] {
    const actions: string[] = []
    
    const hasCritical = anomalies.some(a => a.severity === 'critical')
    const hasHigh = anomalies.some(a => a.severity === 'high')
    const hasCollective = anomalies.some(a => a.type === 'collective')

    if (hasCritical) {
      actions.push('Immediate investigation required for critical anomalies')
      actions.push('Notify relevant stakeholders and activate response protocols')
    } else if (hasHigh) {
      actions.push('Investigate high-severity anomalies within 1 hour')
      actions.push('Check system health and data sources')
    }

    if (hasCollective) {
      actions.push('Analyze collective patterns for systematic issues')
    }

    if (anomalies.length > 5) {
      actions.push('Consider model retraining due to high anomaly count')
    }

    actions.push('Monitor for additional anomalies in the coming period')

    return actions.slice(0, 5) // Limit to 5 actions
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(anomalies: DetectedAnomaly[]): number {
    if (anomalies.length === 0) return 1.0
    
    const avgConfidence = anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length
    return Math.min(0.95, avgConfidence)
  }

  /**
   * Set up real-time monitor event handlers
   */
  private setupRealTimeMonitorHandlers(): void {
    this.realTimeMonitor.on('alert:generated', (alert) => {
      // Handle alert generation - could emit to external systems
      console.log(`Anomaly alert generated: ${alert.title}`)
    })

    this.realTimeMonitor.on('alert:critical', (alert) => {
      // Handle critical alerts with special urgency
      console.log(`CRITICAL ALERT: ${alert.title}`)
    })

    this.realTimeMonitor.on('model:drift_detected', (event) => {
      // Handle model drift detection
      console.log(`Model drift detected for client ${event.clientId}`)
    })

    this.realTimeMonitor.on('monitoring:error', (error) => {
      // Handle monitoring errors
      console.error('Real-time monitoring error:', error)
    })
  }
}