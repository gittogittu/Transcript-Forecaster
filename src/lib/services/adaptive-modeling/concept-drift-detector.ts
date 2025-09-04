/**
 * Concept Drift Detection Service
 * Implements multiple drift detection algorithms and integrates with Vertex AI Model Monitoring
 */

import { 
  ConceptDriftDetectionResult, 
  DriftRecommendation, 
  VertexAIModelMonitoringConfig,
  ModelPerformanceMetrics 
} from './types'

export class ConceptDriftDetector {
  private vertexAIConfig: VertexAIModelMonitoringConfig
  private historicalData: Map<string, number[]> = new Map()
  private performanceHistory: ModelPerformanceMetrics[] = []

  constructor(config: VertexAIModelMonitoringConfig) {
    this.vertexAIConfig = config
  }

  /**
   * Detect concept drift using multiple methods
   */
  async detectDrift(
    currentData: Record<string, number[]>,
    referenceData: Record<string, number[]>,
    modelId: string
  ): Promise<ConceptDriftDetectionResult> {
    try {
      // Run multiple drift detection methods
      const statisticalDrift = await this.detectStatisticalDrift(currentData, referenceData)
      const modelBasedDrift = await this.detectModelBasedDrift(modelId)
      const distanceBasedDrift = await this.detectDistanceBasedDrift(currentData, referenceData)

      // Combine results using ensemble approach
      const combinedResult = this.combineDetectionResults([
        statisticalDrift,
        modelBasedDrift,
        distanceBasedDrift
      ])

      // Generate recommendations based on drift detection
      const recommendations = await this.generateDriftRecommendations(combinedResult)

      return {
        ...combinedResult,
        recommendations,
        timestamp: new Date()
      }
    } catch (error) {
      console.error('Error detecting concept drift:', error)
      throw new Error(`Drift detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Statistical drift detection using KS test and PSI
   */
  private async detectStatisticalDrift(
    currentData: Record<string, number[]>,
    referenceData: Record<string, number[]>
  ): Promise<Partial<ConceptDriftDetectionResult>> {
    const driftScores: number[] = []
    const affectedFeatures: string[] = []

    for (const [feature, currentValues] of Object.entries(currentData)) {
      const referenceValues = referenceData[feature]
      if (!referenceValues) continue

      // Kolmogorov-Smirnov test
      const ksStatistic = this.kolmogorovSmirnovTest(currentValues, referenceValues)
      
      // Population Stability Index (PSI)
      const psiScore = this.calculatePSI(currentValues, referenceValues)
      
      // Combined drift score
      const driftScore = Math.max(ksStatistic, psiScore)
      driftScores.push(driftScore)

      // Threshold for drift detection (configurable)
      if (driftScore > 0.2) {
        affectedFeatures.push(feature)
      }
    }

    const overallDriftScore = driftScores.length > 0 ? Math.max(...driftScores) : 0
    const isDriftDetected = overallDriftScore > 0.2

    return {
      isDriftDetected,
      driftScore: overallDriftScore,
      driftType: this.classifyDriftType(driftScores),
      affectedFeatures,
      confidence: this.calculateConfidence(driftScores),
      detectionMethod: 'statistical'
    }
  }

  /**
   * Model-based drift detection using Vertex AI Model Monitoring
   */
  private async detectModelBasedDrift(modelId: string): Promise<Partial<ConceptDriftDetectionResult>> {
    try {
      // This would integrate with Vertex AI Model Monitoring API
      // For now, we'll simulate the response based on performance metrics
      const recentPerformance = this.performanceHistory
        .filter(p => p.modelId === modelId)
        .slice(-10) // Last 10 measurements

      if (recentPerformance.length < 5) {
        return {
          isDriftDetected: false,
          driftScore: 0,
          confidence: 0.5,
          detectionMethod: 'model_based'
        }
      }

      // Calculate performance degradation
      const baselineAccuracy = recentPerformance.slice(0, 5).reduce((sum, p) => sum + p.accuracy, 0) / 5
      const currentAccuracy = recentPerformance.slice(-5).reduce((sum, p) => sum + p.accuracy, 0) / 5
      
      const performanceDrop = (baselineAccuracy - currentAccuracy) / baselineAccuracy
      const isDriftDetected = performanceDrop > 0.1 // 10% performance drop threshold

      return {
        isDriftDetected,
        driftScore: performanceDrop,
        driftType: performanceDrop > 0.2 ? 'sudden' : 'gradual',
        confidence: Math.min(0.9, 0.5 + performanceDrop),
        detectionMethod: 'model_based'
      }
    } catch (error) {
      console.error('Model-based drift detection failed:', error)
      return {
        isDriftDetected: false,
        driftScore: 0,
        confidence: 0.3,
        detectionMethod: 'model_based'
      }
    }
  }

  /**
   * Distance-based drift detection using Wasserstein distance
   */
  private async detectDistanceBasedDrift(
    currentData: Record<string, number[]>,
    referenceData: Record<string, number[]>
  ): Promise<Partial<ConceptDriftDetectionResult>> {
    const distances: number[] = []
    const affectedFeatures: string[] = []

    for (const [feature, currentValues] of Object.entries(currentData)) {
      const referenceValues = referenceData[feature]
      if (!referenceValues) continue

      // Calculate Wasserstein distance (Earth Mover's Distance)
      const distance = this.calculateWassersteinDistance(currentValues, referenceValues)
      distances.push(distance)

      // Normalize distance and check threshold
      const normalizedDistance = distance / Math.max(
        Math.std(currentValues), 
        Math.std(referenceValues), 
        1
      )

      if (normalizedDistance > 0.3) {
        affectedFeatures.push(feature)
      }
    }

    const avgDistance = distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0
    const isDriftDetected = avgDistance > 0.3

    return {
      isDriftDetected,
      driftScore: avgDistance,
      driftType: 'gradual',
      affectedFeatures,
      confidence: Math.min(0.95, 0.6 + avgDistance * 0.5),
      detectionMethod: 'distance_based'
    }
  }

  /**
   * Combine results from multiple drift detection methods
   */
  private combineDetectionResults(
    results: Partial<ConceptDriftDetectionResult>[]
  ): Omit<ConceptDriftDetectionResult, 'recommendations' | 'timestamp'> {
    const validResults = results.filter(r => r.driftScore !== undefined)
    
    if (validResults.length === 0) {
      return {
        isDriftDetected: false,
        driftScore: 0,
        driftType: 'gradual',
        affectedFeatures: [],
        confidence: 0.5,
        detectionMethod: 'statistical'
      }
    }

    // Weighted ensemble of drift scores
    const weights = { statistical: 0.4, model_based: 0.4, distance_based: 0.2 }
    let weightedScore = 0
    let totalWeight = 0

    validResults.forEach(result => {
      const weight = weights[result.detectionMethod as keyof typeof weights] || 0.33
      weightedScore += (result.driftScore || 0) * weight
      totalWeight += weight
    })

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0
    const isDriftDetected = validResults.some(r => r.isDriftDetected) || finalScore > 0.25

    // Combine affected features
    const allAffectedFeatures = new Set<string>()
    validResults.forEach(result => {
      result.affectedFeatures?.forEach(feature => allAffectedFeatures.add(feature))
    })

    // Determine drift type based on score magnitude and pattern
    let driftType: 'gradual' | 'sudden' | 'incremental' | 'recurring' = 'gradual'
    if (finalScore > 0.5) driftType = 'sudden'
    else if (finalScore > 0.3) driftType = 'incremental'

    return {
      isDriftDetected,
      driftScore: finalScore,
      driftType,
      affectedFeatures: Array.from(allAffectedFeatures),
      confidence: Math.min(0.95, 0.5 + finalScore * 0.8),
      detectionMethod: 'statistical' // Primary method
    }
  }

  /**
   * Generate recommendations based on drift detection results
   */
  private async generateDriftRecommendations(
    driftResult: Omit<ConceptDriftDetectionResult, 'recommendations' | 'timestamp'>
  ): Promise<DriftRecommendation[]> {
    const recommendations: DriftRecommendation[] = []

    if (!driftResult.isDriftDetected) {
      return [{
        action: 'adjust_preprocessing',
        priority: 'low',
        description: 'Continue monitoring for potential drift patterns',
        estimatedImpact: 0.1,
        implementationCost: 'low'
      }]
    }

    // High drift score - immediate retraining
    if (driftResult.driftScore > 0.4) {
      recommendations.push({
        action: 'retrain',
        priority: 'critical',
        description: 'Significant concept drift detected. Immediate model retraining recommended.',
        estimatedImpact: 0.8,
        implementationCost: 'high'
      })
    }

    // Medium drift score - adjust preprocessing or feature selection
    if (driftResult.driftScore > 0.2 && driftResult.driftScore <= 0.4) {
      recommendations.push({
        action: 'adjust_preprocessing',
        priority: 'high',
        description: 'Moderate drift detected. Adjust preprocessing pipeline and feature selection.',
        estimatedImpact: 0.5,
        implementationCost: 'medium'
      })
    }

    // Sudden drift - consider model switching
    if (driftResult.driftType === 'sudden') {
      recommendations.push({
        action: 'model_switch',
        priority: 'high',
        description: 'Sudden drift pattern suggests environmental change. Consider switching to more robust model.',
        estimatedImpact: 0.6,
        implementationCost: 'medium'
      })
    }

    // Many affected features - feature selection
    if (driftResult.affectedFeatures.length > 3) {
      recommendations.push({
        action: 'feature_selection',
        priority: 'medium',
        description: 'Multiple features affected. Perform feature importance analysis and selection.',
        estimatedImpact: 0.4,
        implementationCost: 'medium'
      })
    }

    return recommendations
  }

  /**
   * Kolmogorov-Smirnov test for distribution comparison
   */
  private kolmogorovSmirnovTest(sample1: number[], sample2: number[]): number {
    const sorted1 = [...sample1].sort((a, b) => a - b)
    const sorted2 = [...sample2].sort((a, b) => a - b)
    
    const n1 = sorted1.length
    const n2 = sorted2.length
    
    let maxDiff = 0
    let i = 0, j = 0
    
    while (i < n1 && j < n2) {
      const cdf1 = (i + 1) / n1
      const cdf2 = (j + 1) / n2
      
      maxDiff = Math.max(maxDiff, Math.abs(cdf1 - cdf2))
      
      if (sorted1[i] <= sorted2[j]) {
        i++
      } else {
        j++
      }
    }
    
    return maxDiff
  }

  /**
   * Calculate Population Stability Index (PSI)
   */
  private calculatePSI(current: number[], reference: number[]): number {
    const bins = 10
    const currentHist = this.createHistogram(current, bins)
    const referenceHist = this.createHistogram(reference, bins)
    
    let psi = 0
    for (let i = 0; i < bins; i++) {
      const currentPct = currentHist[i] / current.length
      const referencePct = referenceHist[i] / reference.length
      
      if (currentPct > 0 && referencePct > 0) {
        psi += (currentPct - referencePct) * Math.log(currentPct / referencePct)
      }
    }
    
    return psi
  }

  /**
   * Calculate Wasserstein distance (simplified 1D version)
   */
  private calculateWassersteinDistance(sample1: number[], sample2: number[]): number {
    const sorted1 = [...sample1].sort((a, b) => a - b)
    const sorted2 = [...sample2].sort((a, b) => a - b)
    
    const n = Math.min(sorted1.length, sorted2.length)
    let distance = 0
    
    for (let i = 0; i < n; i++) {
      distance += Math.abs(sorted1[i] - sorted2[i])
    }
    
    return distance / n
  }

  /**
   * Create histogram for PSI calculation
   */
  private createHistogram(data: number[], bins: number): number[] {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const binWidth = (max - min) / bins
    
    const histogram = new Array(bins).fill(0)
    
    data.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1)
      histogram[binIndex]++
    })
    
    return histogram
  }

  /**
   * Classify drift type based on drift scores pattern
   */
  private classifyDriftType(driftScores: number[]): 'gradual' | 'sudden' | 'incremental' | 'recurring' {
    if (driftScores.length === 0) return 'gradual'
    
    const maxScore = Math.max(...driftScores)
    const avgScore = driftScores.reduce((a, b) => a + b, 0) / driftScores.length
    
    if (maxScore > 0.5) return 'sudden'
    if (maxScore > 0.3 && avgScore > 0.2) return 'incremental'
    
    // Check for recurring pattern (simplified)
    const variance = this.calculateVariance(driftScores)
    if (variance > 0.1) return 'recurring'
    
    return 'gradual'
  }

  /**
   * Calculate confidence based on drift scores consistency
   */
  private calculateConfidence(driftScores: number[]): number {
    if (driftScores.length === 0) return 0.5
    
    const avgScore = driftScores.reduce((a, b) => a + b, 0) / driftScores.length
    const variance = this.calculateVariance(driftScores)
    
    // Higher confidence for consistent scores
    const consistency = 1 - Math.min(variance, 0.5)
    const magnitude = Math.min(avgScore * 2, 1)
    
    return Math.min(0.95, 0.3 + consistency * 0.4 + magnitude * 0.3)
  }

  /**
   * Calculate variance of an array
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2))
    
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  }

  /**
   * Update performance history for model-based drift detection
   */
  updatePerformanceHistory(metrics: ModelPerformanceMetrics): void {
    this.performanceHistory.push(metrics)
    
    // Keep only last 100 measurements per model
    const modelMetrics = this.performanceHistory.filter(m => m.modelId === metrics.modelId)
    if (modelMetrics.length > 100) {
      this.performanceHistory = this.performanceHistory.filter(
        m => m.modelId !== metrics.modelId || 
        m.timestamp >= modelMetrics[modelMetrics.length - 100].timestamp
      )
    }
  }

  /**
   * Setup Vertex AI Model Monitoring
   */
  async setupVertexAIMonitoring(): Promise<void> {
    try {
      // This would call Vertex AI Model Monitoring API to set up monitoring job
      console.log('Setting up Vertex AI Model Monitoring for:', this.vertexAIConfig.endpointId)
      
      // Implementation would include:
      // 1. Create monitoring job
      // 2. Configure drift detection thresholds
      // 3. Set up alert notifications
      // 4. Enable feature attribution monitoring
      
    } catch (error) {
      console.error('Failed to setup Vertex AI monitoring:', error)
      throw error
    }
  }
}

// Utility extension for Math object
declare global {
  interface Math {
    std(values: number[]): number
  }
}

Math.std = function(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}