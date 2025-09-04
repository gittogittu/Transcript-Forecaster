/**
 * Performance Tracking and Model Switching Service
 * Tracks model performance history and makes intelligent model switching decisions
 */

import {
  ModelPerformanceMetrics,
  ModelSwitchingDecision,
  RiskAssessment,
  RiskFactor,
  ActiveModel,
  AdaptiveModelingState,
  SystemHealthMetrics,
  AdaptiveModelingEvent
} from './types'

export class PerformanceTracker {
  private performanceHistory: Map<string, ModelPerformanceMetrics[]> = new Map()
  private activeModels: Map<string, ActiveModel> = new Map()
  private switchingHistory: ModelSwitchingDecision[] = []
  private eventHistory: AdaptiveModelingEvent[] = []
  private healthMetrics: SystemHealthMetrics

  constructor() {
    this.healthMetrics = this.initializeHealthMetrics()
    this.startPerformanceMonitoring()
  }

  /**
   * Track performance metrics for a model
   */
  trackPerformance(metrics: ModelPerformanceMetrics): void {
    // Update performance history
    if (!this.performanceHistory.has(metrics.modelId)) {
      this.performanceHistory.set(metrics.modelId, [])
    }

    const history = this.performanceHistory.get(metrics.modelId)!
    history.push(metrics)

    // Keep only last 1000 measurements per model
    if (history.length > 1000) {
      history.splice(0, history.length - 1000)
    }

    // Update active model performance
    const activeModel = this.activeModels.get(metrics.modelId)
    if (activeModel) {
      activeModel.performanceScore = this.calculateOverallPerformanceScore(metrics)
      activeModel.resourceUsage = {
        cpu: metrics.cpuUsage,
        memory: metrics.memoryUsage,
        storage: 0, // Would be tracked separately
        networkIO: 0 // Would be tracked separately
      }
    }

    // Update system health metrics
    this.updateSystemHealth()

    // Check if model switching should be considered
    this.evaluateModelSwitching(metrics.modelId)
  }

  /**
   * Register an active model
   */
  registerModel(model: ActiveModel): void {
    this.activeModels.set(model.id, model)
    this.logEvent({
      id: `model_registered_${Date.now()}`,
      type: 'model_switched',
      modelId: model.id,
      timestamp: new Date(),
      severity: 'info',
      message: `Model ${model.name} registered as active`,
      metadata: { modelType: model.type, version: model.version },
      actionsTaken: ['model_registration']
    })
  }

  /**
   * Evaluate if model switching should be recommended
   */
  private evaluateModelSwitching(modelId: string): void {
    const currentModel = this.activeModels.get(modelId)
    if (!currentModel) return

    const performanceHistory = this.performanceHistory.get(modelId)
    if (!performanceHistory || performanceHistory.length < 10) return

    // Check for performance degradation
    const recentPerformance = performanceHistory.slice(-5)
    const baselinePerformance = performanceHistory.slice(0, Math.min(10, performanceHistory.length - 5))

    const recentAvgAccuracy = recentPerformance.reduce((sum, p) => sum + p.accuracy, 0) / recentPerformance.length
    const baselineAvgAccuracy = baselinePerformance.reduce((sum, p) => sum + p.accuracy, 0) / baselinePerformance.length

    const performanceDrop = (baselineAvgAccuracy - recentAvgAccuracy) / baselineAvgAccuracy

    // Consider switching if performance drops significantly
    if (performanceDrop > 0.1) { // 10% performance drop
      const switchingDecision = this.generateSwitchingRecommendation(
        modelId,
        performanceDrop,
        'performance_improvement'
      )

      if (switchingDecision) {
        this.switchingHistory.push(switchingDecision)
        this.logEvent({
          id: `switching_recommended_${Date.now()}`,
          type: 'model_switched',
          modelId,
          timestamp: new Date(),
          severity: 'warning',
          message: `Model switching recommended due to ${(performanceDrop * 100).toFixed(1)}% performance drop`,
          metadata: { 
            performanceDrop,
            recommendedModel: switchingDecision.recommendedModelId,
            confidence: switchingDecision.confidenceScore
          },
          actionsTaken: ['switching_recommendation_generated']
        })
      }
    }
  }

  /**
   * Generate model switching recommendation
   */
  private generateSwitchingRecommendation(
    currentModelId: string,
    performanceDrop: number,
    reason: ModelSwitchingDecision['reason']
  ): ModelSwitchingDecision | null {
    // Find best alternative model
    const alternativeModel = this.findBestAlternativeModel(currentModelId)
    if (!alternativeModel) return null

    const currentModel = this.activeModels.get(currentModelId)
    if (!currentModel) return null

    // Calculate expected improvement
    const expectedImprovement = this.calculateExpectedImprovement(
      currentModel,
      alternativeModel,
      performanceDrop
    )

    // Assess switching risk
    const riskAssessment = this.assessSwitchingRisk(currentModel, alternativeModel)

    // Calculate confidence score
    const confidenceScore = this.calculateSwitchingConfidence(
      performanceDrop,
      expectedImprovement,
      riskAssessment
    )

    // Only recommend if confidence is high enough
    if (confidenceScore < 0.7) return null

    return {
      currentModelId,
      recommendedModelId: alternativeModel.id,
      reason,
      confidenceScore,
      expectedImprovement,
      switchingCost: this.calculateSwitchingCost(currentModel, alternativeModel),
      riskAssessment,
      timeline: this.estimateSwitchingTimeline(riskAssessment.overallRisk)
    }
  }

  /**
   * Find best alternative model
   */
  private findBestAlternativeModel(currentModelId: string): ActiveModel | null {
    const alternatives = Array.from(this.activeModels.values())
      .filter(model => 
        model.id !== currentModelId && 
        model.status === 'active' &&
        model.performanceScore > 0
      )
      .sort((a, b) => b.performanceScore - a.performanceScore)

    return alternatives.length > 0 ? alternatives[0] : null
  }

  /**
   * Calculate expected improvement from switching
   */
  private calculateExpectedImprovement(
    currentModel: ActiveModel,
    alternativeModel: ActiveModel,
    performanceDrop: number
  ): number {
    // Base improvement from alternative model's better performance
    const performanceImprovement = alternativeModel.performanceScore - currentModel.performanceScore

    // Additional improvement from addressing current performance drop
    const recoveryImprovement = performanceDrop * 0.8 // Assume 80% recovery

    return Math.max(0, performanceImprovement + recoveryImprovement)
  }

  /**
   * Assess risk of model switching
   */
  private assessSwitchingRisk(
    currentModel: ActiveModel,
    alternativeModel: ActiveModel
  ): RiskAssessment {
    const riskFactors: RiskFactor[] = []

    // Performance risk
    if (alternativeModel.performanceScore < currentModel.performanceScore * 1.1) {
      riskFactors.push({
        type: 'performance',
        description: 'Alternative model performance is not significantly better',
        impact: 'medium',
        probability: 0.6,
        mitigation: 'Implement gradual rollout with performance monitoring'
      })
    }

    // Stability risk
    const alternativeModelAge = Date.now() - alternativeModel.deployedAt.getTime()
    if (alternativeModelAge < 7 * 24 * 60 * 60 * 1000) { // Less than 7 days old
      riskFactors.push({
        type: 'stability',
        description: 'Alternative model is relatively new and may have unknown issues',
        impact: 'high',
        probability: 0.4,
        mitigation: 'Extended testing period and gradual traffic increase'
      })
    }

    // Resource risk
    const resourceIncrease = (
      alternativeModel.resourceUsage.cpu + alternativeModel.resourceUsage.memory
    ) / (currentModel.resourceUsage.cpu + currentModel.resourceUsage.memory) - 1

    if (resourceIncrease > 0.5) { // 50% resource increase
      riskFactors.push({
        type: 'resource',
        description: 'Alternative model requires significantly more resources',
        impact: 'medium',
        probability: 0.8,
        mitigation: 'Scale infrastructure before switching'
      })
    }

    // Compatibility risk
    if (currentModel.type !== alternativeModel.type) {
      riskFactors.push({
        type: 'compatibility',
        description: 'Different model types may have compatibility issues',
        impact: 'high',
        probability: 0.3,
        mitigation: 'Thorough integration testing'
      })
    }

    // Calculate overall risk
    const highRiskFactors = riskFactors.filter(f => f.impact === 'high').length
    const mediumRiskFactors = riskFactors.filter(f => f.impact === 'medium').length

    let overallRisk: 'low' | 'medium' | 'high'
    if (highRiskFactors > 1 || (highRiskFactors === 1 && mediumRiskFactors > 1)) {
      overallRisk = 'high'
    } else if (highRiskFactors === 1 || mediumRiskFactors > 2) {
      overallRisk = 'medium'
    } else {
      overallRisk = 'low'
    }

    return {
      overallRisk,
      riskFactors,
      mitigationStrategies: riskFactors.map(f => f.mitigation || 'Monitor closely'),
      rollbackPlan: 'Maintain current model as backup with automatic rollback on performance degradation'
    }
  }

  /**
   * Calculate switching confidence score
   */
  private calculateSwitchingConfidence(
    performanceDrop: number,
    expectedImprovement: number,
    riskAssessment: RiskAssessment
  ): number {
    // Base confidence from performance need
    let confidence = Math.min(0.9, performanceDrop * 2) // Higher drop = higher confidence need

    // Adjust for expected improvement
    confidence += Math.min(0.3, expectedImprovement * 0.5)

    // Adjust for risk
    const riskPenalty = {
      low: 0,
      medium: 0.2,
      high: 0.4
    }
    confidence -= riskPenalty[riskAssessment.overallRisk]

    // Adjust for risk factor probabilities
    const avgRiskProbability = riskAssessment.riskFactors.length > 0
      ? riskAssessment.riskFactors.reduce((sum, f) => sum + f.probability, 0) / riskAssessment.riskFactors.length
      : 0
    confidence -= avgRiskProbability * 0.3

    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Calculate switching cost
   */
  private calculateSwitchingCost(
    currentModel: ActiveModel,
    alternativeModel: ActiveModel
  ): number {
    // Base switching cost (deployment, testing, etc.)
    let cost = 100 // Base cost in arbitrary units

    // Resource difference cost
    const resourceDiff = (
      alternativeModel.resourceUsage.cpu + alternativeModel.resourceUsage.memory
    ) - (currentModel.resourceUsage.cpu + currentModel.resourceUsage.memory)
    
    if (resourceDiff > 0) {
      cost += resourceDiff * 10 // Cost per additional resource unit
    }

    // Complexity cost for different model types
    if (currentModel.type !== alternativeModel.type) {
      cost += 200 // Additional cost for different model types
    }

    // Training/redeployment cost
    cost += 50

    return cost
  }

  /**
   * Estimate switching timeline
   */
  private estimateSwitchingTimeline(riskLevel: 'low' | 'medium' | 'high'): string {
    switch (riskLevel) {
      case 'low':
        return '2-4 hours'
      case 'medium':
        return '1-2 days'
      case 'high':
        return '3-7 days'
      default:
        return '1-2 days'
    }
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallPerformanceScore(metrics: ModelPerformanceMetrics): number {
    // Weighted combination of metrics
    const weights = {
      accuracy: 0.4,
      latency: 0.2,
      throughput: 0.2,
      errorRate: 0.1,
      resourceEfficiency: 0.1
    }

    // Normalize metrics (assuming reasonable ranges)
    const normalizedAccuracy = Math.min(1, metrics.accuracy)
    const normalizedLatency = Math.max(0, 1 - (metrics.predictionLatency / 1000)) // Assume 1000ms is poor
    const normalizedThroughput = Math.min(1, metrics.throughput / 10000) // Assume 10000 req/s is excellent
    const normalizedErrorRate = Math.max(0, 1 - metrics.errorRate)
    const normalizedResourceEfficiency = Math.max(0, 1 - (metrics.memoryUsage + metrics.cpuUsage) / 200)

    return (
      normalizedAccuracy * weights.accuracy +
      normalizedLatency * weights.latency +
      normalizedThroughput * weights.throughput +
      normalizedErrorRate * weights.errorRate +
      normalizedResourceEfficiency * weights.resourceEfficiency
    )
  }

  /**
   * Update system health metrics
   */
  private updateSystemHealth(): void {
    const activeModelsList = Array.from(this.activeModels.values())
    
    if (activeModelsList.length === 0) {
      this.healthMetrics = {
        overallHealth: 'critical',
        activeModels: 0,
        averageAccuracy: 0,
        averageLatency: 0,
        errorRate: 1,
        resourceUtilization: 0,
        driftDetectionRate: 0,
        retrainingFrequency: 0,
        lastHealthCheck: new Date()
      }
      return
    }

    // Calculate averages from recent performance data
    const recentMetrics: ModelPerformanceMetrics[] = []
    activeModelsList.forEach(model => {
      const history = this.performanceHistory.get(model.id)
      if (history && history.length > 0) {
        recentMetrics.push(history[history.length - 1])
      }
    })

    const averageAccuracy = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.accuracy, 0) / recentMetrics.length
      : 0

    const averageLatency = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.predictionLatency, 0) / recentMetrics.length
      : 0

    const errorRate = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length
      : 0

    const resourceUtilization = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.cpuUsage + m.memoryUsage, 0) / (recentMetrics.length * 200)
      : 0

    // Determine overall health
    let overallHealth: 'healthy' | 'warning' | 'critical'
    if (averageAccuracy > 0.9 && errorRate < 0.01 && averageLatency < 200) {
      overallHealth = 'healthy'
    } else if (averageAccuracy > 0.8 && errorRate < 0.05 && averageLatency < 500) {
      overallHealth = 'warning'
    } else {
      overallHealth = 'critical'
    }

    this.healthMetrics = {
      overallHealth,
      activeModels: activeModelsList.length,
      averageAccuracy,
      averageLatency,
      errorRate,
      resourceUtilization,
      driftDetectionRate: 0, // Would be calculated from drift detection service
      retrainingFrequency: 0, // Would be calculated from retraining service
      lastHealthCheck: new Date()
    }
  }

  /**
   * Log system event
   */
  private logEvent(event: AdaptiveModelingEvent): void {
    this.eventHistory.push(event)

    // Keep only last 10000 events
    if (this.eventHistory.length > 10000) {
      this.eventHistory.splice(0, this.eventHistory.length - 10000)
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Update system health every 5 minutes
    setInterval(() => {
      this.updateSystemHealth()
    }, 5 * 60 * 1000)
  }

  /**
   * Initialize health metrics
   */
  private initializeHealthMetrics(): SystemHealthMetrics {
    return {
      overallHealth: 'healthy',
      activeModels: 0,
      averageAccuracy: 0,
      averageLatency: 0,
      errorRate: 0,
      resourceUtilization: 0,
      driftDetectionRate: 0,
      retrainingFrequency: 0,
      lastHealthCheck: new Date()
    }
  }

  /**
   * Get performance history for a model
   */
  getPerformanceHistory(modelId: string, limit?: number): ModelPerformanceMetrics[] {
    const history = this.performanceHistory.get(modelId) || []
    return limit ? history.slice(-limit) : history
  }

  /**
   * Get switching recommendations
   */
  getSwitchingRecommendations(modelId?: string): ModelSwitchingDecision[] {
    if (modelId) {
      return this.switchingHistory.filter(decision => decision.currentModelId === modelId)
    }
    return [...this.switchingHistory]
  }

  /**
   * Get system health
   */
  getSystemHealth(): SystemHealthMetrics {
    return { ...this.healthMetrics }
  }

  /**
   * Get adaptive modeling state
   */
  getAdaptiveModelingState(): AdaptiveModelingState {
    return {
      currentModels: Array.from(this.activeModels.values()),
      performanceHistory: Array.from(this.performanceHistory.values()).flat(),
      driftDetectionResults: [], // Would be populated by drift detection service
      retrainingJobs: [], // Would be populated by retraining service
      optimizationResults: [], // Would be populated by optimization service
      systemHealth: this.healthMetrics
    }
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 100): AdaptiveModelingEvent[] {
    return this.eventHistory.slice(-limit)
  }

  /**
   * Execute model switch
   */
  async executeModelSwitch(decision: ModelSwitchingDecision): Promise<boolean> {
    try {
      const currentModel = this.activeModels.get(decision.currentModelId)
      const newModel = this.activeModels.get(decision.recommendedModelId)

      if (!currentModel || !newModel) {
        throw new Error('Model not found')
      }

      // Update model statuses
      currentModel.status = 'deprecated'
      newModel.status = 'active'

      // Log the switch
      this.logEvent({
        id: `model_switch_executed_${Date.now()}`,
        type: 'model_switched',
        modelId: decision.recommendedModelId,
        timestamp: new Date(),
        severity: 'info',
        message: `Model switched from ${currentModel.name} to ${newModel.name}`,
        metadata: {
          reason: decision.reason,
          expectedImprovement: decision.expectedImprovement,
          switchingCost: decision.switchingCost
        },
        actionsTaken: ['model_switch_executed', 'traffic_redirected', 'monitoring_updated']
      })

      return true
    } catch (error) {
      console.error('Failed to execute model switch:', error)
      
      this.logEvent({
        id: `model_switch_failed_${Date.now()}`,
        type: 'model_switched',
        modelId: decision.currentModelId,
        timestamp: new Date(),
        severity: 'error',
        message: `Model switch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: { decision },
        actionsTaken: ['switch_rollback']
      })

      return false
    }
  }

  /**
   * Get performance comparison between models
   */
  compareModelPerformance(modelId1: string, modelId2: string): {
    model1: ModelPerformanceMetrics | null
    model2: ModelPerformanceMetrics | null
    comparison: {
      accuracyDiff: number
      latencyDiff: number
      errorRateDiff: number
      throughputDiff: number
    }
  } {
    const history1 = this.performanceHistory.get(modelId1)
    const history2 = this.performanceHistory.get(modelId2)

    const latest1 = history1 && history1.length > 0 ? history1[history1.length - 1] : null
    const latest2 = history2 && history2.length > 0 ? history2[history2.length - 1] : null

    const comparison = {
      accuracyDiff: latest1 && latest2 ? latest2.accuracy - latest1.accuracy : 0,
      latencyDiff: latest1 && latest2 ? latest2.predictionLatency - latest1.predictionLatency : 0,
      errorRateDiff: latest1 && latest2 ? latest2.errorRate - latest1.errorRate : 0,
      throughputDiff: latest1 && latest2 ? latest2.throughput - latest1.throughput : 0
    }

    return {
      model1: latest1,
      model2: latest2,
      comparison
    }
  }

  /**
   * Clear old performance data
   */
  clearOldPerformanceData(olderThanDays: number = 30): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    this.performanceHistory.forEach((history, modelId) => {
      const filteredHistory = history.filter(metrics => metrics.timestamp > cutoffDate)
      this.performanceHistory.set(modelId, filteredHistory)
    })

    // Clear old events
    this.eventHistory = this.eventHistory.filter(event => event.timestamp > cutoffDate)
  }
}