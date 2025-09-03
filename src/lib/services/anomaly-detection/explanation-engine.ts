import { 
  DetectedAnomaly, 
  AnomalyExplanation, 
  AnomalyRecommendation, 
  TimeSeriesData,
  AnomalyPattern,
  ContextualFeatures
} from './types'

/**
 * Anomaly Explanation Engine
 * Generates human-readable explanations and actionable recommendations for anomalies
 */
export class AnomalyExplanationEngine {
  private readonly CORRELATION_THRESHOLD = 0.7
  private readonly SIGNIFICANCE_THRESHOLD = 0.05

  /**
   * Generate comprehensive explanation for an anomaly
   */
  async generateExplanation(
    anomaly: DetectedAnomaly, 
    data: TimeSeriesData, 
    historicalData?: TimeSeriesData[]
  ): Promise<AnomalyExplanation> {
    const primaryCause = await this.identifyPrimaryCause(anomaly, data)
    const contributingFactors = await this.identifyContributingFactors(anomaly, data, historicalData)
    const historicalContext = await this.generateHistoricalContext(anomaly, data, historicalData)
    const businessImpact = await this.assessBusinessImpact(anomaly, data)
    const confidence = await this.calculateExplanationConfidence(anomaly, contributingFactors)

    return {
      anomalyId: anomaly.id,
      primaryCause,
      contributingFactors,
      historicalContext,
      businessImpact,
      confidence
    }
  }

  /**
   * Generate actionable recommendations for an anomaly
   */
  async generateRecommendations(
    anomaly: DetectedAnomaly, 
    explanation: AnomalyExplanation,
    data: TimeSeriesData
  ): Promise<AnomalyRecommendation[]> {
    const recommendations: AnomalyRecommendation[] = []

    // Immediate response recommendations
    const immediateActions = await this.generateImmediateActions(anomaly, explanation)
    recommendations.push(...immediateActions)

    // Preventive recommendations
    const preventiveActions = await this.generatePreventiveActions(anomaly, explanation, data)
    recommendations.push(...preventiveActions)

    // Investigative recommendations
    const investigativeActions = await this.generateInvestigativeActions(anomaly, explanation)
    recommendations.push(...investigativeActions)

    return recommendations.sort((a, b) => this.getPriorityScore(b.priority) - this.getPriorityScore(a.priority))
  }

  /**
   * Generate batch explanations for multiple anomalies
   */
  async generateBatchExplanations(
    anomalies: DetectedAnomaly[], 
    data: TimeSeriesData,
    historicalData?: TimeSeriesData[]
  ): Promise<Map<string, AnomalyExplanation>> {
    const explanations = new Map<string, AnomalyExplanation>()
    
    // Process anomalies in parallel for efficiency
    const explanationPromises = anomalies.map(async (anomaly) => {
      const explanation = await this.generateExplanation(anomaly, data, historicalData)
      return { anomalyId: anomaly.id, explanation }
    })

    const results = await Promise.all(explanationPromises)
    results.forEach(({ anomalyId, explanation }) => {
      explanations.set(anomalyId, explanation)
    })

    return explanations
  }

  /**
   * Identify the primary cause of an anomaly
   */
  private async identifyPrimaryCause(anomaly: DetectedAnomaly, data: TimeSeriesData): Promise<string> {
    const pattern = anomaly.metadata?.pattern as AnomalyPattern | undefined
    const contextualFeatures = this.extractContextualFeatures(anomaly.timestamp)

    switch (anomaly.type) {
      case 'point':
        return this.explainPointAnomaly(anomaly, pattern, contextualFeatures)
      
      case 'contextual':
        return this.explainContextualAnomaly(anomaly, pattern, contextualFeatures)
      
      case 'collective':
        return this.explainCollectiveAnomaly(anomaly, pattern, data)
      
      default:
        return `Unusual ${anomaly.detectionMethod} pattern detected with ${anomaly.confidence * 100}% confidence`
    }
  }

  /**
   * Explain point anomaly
   */
  private explainPointAnomaly(
    anomaly: DetectedAnomaly, 
    pattern: AnomalyPattern | undefined,
    contextualFeatures: ContextualFeatures
  ): string {
    const deviationPercent = ((anomaly.actualValue - anomaly.expectedValue) / anomaly.expectedValue * 100).toFixed(1)
    const direction = anomaly.actualValue > anomaly.expectedValue ? 'spike' : 'drop'
    
    let explanation = `Isolated ${direction} of ${Math.abs(parseFloat(deviationPercent))}% from expected value`
    
    if (pattern) {
      switch (pattern.patternType) {
        case 'spike':
          explanation += `. Sharp increase detected with magnitude ${pattern.magnitude.toFixed(2)}`
          break
        case 'drop':
          explanation += `. Sharp decrease detected with magnitude ${pattern.magnitude.toFixed(2)}`
          break
      }
    }

    // Add contextual information
    if (contextualFeatures.isWeekend) {
      explanation += '. Occurred during weekend period'
    }
    if (contextualFeatures.isHoliday) {
      explanation += '. Occurred during holiday period'
    }

    return explanation
  }

  /**
   * Explain contextual anomaly
   */
  private explainContextualAnomaly(
    anomaly: DetectedAnomaly, 
    pattern: AnomalyPattern | undefined,
    contextualFeatures: ContextualFeatures
  ): string {
    let explanation = 'Value is unusual for this specific time context'
    
    // Time-based context
    if (contextualFeatures.isWeekend) {
      explanation += '. Pattern deviates from typical weekend behavior'
    } else {
      explanation += '. Pattern deviates from typical weekday behavior'
    }

    // Seasonal context
    if (Math.abs(contextualFeatures.seasonalIndex) > 0.5) {
      const season = contextualFeatures.seasonalIndex > 0 ? 'peak seasonal period' : 'low seasonal period'
      explanation += ` during ${season}`
    }

    // Hour-based context
    if (contextualFeatures.hourOfDay < 6 || contextualFeatures.hourOfDay > 22) {
      explanation += '. Unusual activity during off-hours'
    }

    if (pattern) {
      explanation += `. Pattern shows ${pattern.patternType} with ${pattern.magnitude.toFixed(2)} magnitude`
    }

    return explanation
  }

  /**
   * Explain collective anomaly
   */
  private explainCollectiveAnomaly(
    anomaly: DetectedAnomaly, 
    pattern: AnomalyPattern | undefined,
    data: TimeSeriesData
  ): string {
    let explanation = 'Part of a sustained anomalous pattern affecting multiple consecutive data points'
    
    if (pattern) {
      explanation += `. Pattern type: ${pattern.patternType}`
      
      if (pattern.duration) {
        explanation += `, lasting ${pattern.duration} time periods`
      }
      
      switch (pattern.patternType) {
        case 'drift':
          explanation += '. Gradual systematic change detected'
          break
        case 'level_shift':
          explanation += '. Sudden shift in baseline level detected'
          break
        case 'oscillation':
          explanation += '. Unusual oscillatory behavior detected'
          break
      }
    }

    return explanation
  }

  /**
   * Identify contributing factors
   */
  private async identifyContributingFactors(
    anomaly: DetectedAnomaly, 
    data: TimeSeriesData,
    historicalData?: TimeSeriesData[]
  ): Promise<string[]> {
    const factors: string[] = []
    
    // Data quality factors
    const dataQualityIssues = await this.checkDataQuality(anomaly, data)
    factors.push(...dataQualityIssues)

    // Temporal factors
    const temporalFactors = await this.identifyTemporalFactors(anomaly)
    factors.push(...temporalFactors)

    // Statistical factors
    const statisticalFactors = await this.identifyStatisticalFactors(anomaly, data)
    factors.push(...statisticalFactors)

    // Historical comparison factors
    if (historicalData) {
      const historicalFactors = await this.identifyHistoricalFactors(anomaly, historicalData)
      factors.push(...historicalFactors)
    }

    return factors.slice(0, 5) // Limit to top 5 factors
  }

  /**
   * Check for data quality issues
   */
  private async checkDataQuality(anomaly: DetectedAnomaly, data: TimeSeriesData): Promise<string[]> {
    const issues: string[] = []
    
    // Check for missing data around anomaly
    const anomalyIndex = data.timestamps.findIndex(t => t.getTime() === anomaly.timestamp.getTime())
    if (anomalyIndex > 0) {
      const prevTimestamp = data.timestamps[anomalyIndex - 1]
      const expectedInterval = this.estimateDataInterval(data)
      const actualInterval = anomaly.timestamp.getTime() - prevTimestamp.getTime()
      
      if (actualInterval > expectedInterval * 2) {
        issues.push('Data gap detected before anomaly occurrence')
      }
    }

    // Check for duplicate values
    const windowStart = Math.max(0, anomalyIndex - 5)
    const windowEnd = Math.min(data.values.length, anomalyIndex + 5)
    const window = data.values.slice(windowStart, windowEnd)
    const uniqueValues = new Set(window)
    
    if (uniqueValues.size < window.length * 0.5) {
      issues.push('High number of duplicate values in surrounding data')
    }

    // Check for extreme values
    const sortedValues = [...data.values].sort((a, b) => a - b)
    const q1 = sortedValues[Math.floor(sortedValues.length * 0.25)]
    const q3 = sortedValues[Math.floor(sortedValues.length * 0.75)]
    const iqr = q3 - q1
    const extremeThreshold = q3 + 3 * iqr
    
    if (anomaly.actualValue > extremeThreshold) {
      issues.push('Value exceeds extreme threshold (3x IQR above Q3)')
    }

    return issues
  }

  /**
   * Identify temporal factors
   */
  private async identifyTemporalFactors(anomaly: DetectedAnomaly): Promise<string[]> {
    const factors: string[] = []
    const contextualFeatures = this.extractContextualFeatures(anomaly.timestamp)
    
    // Day of week effects
    if (contextualFeatures.dayOfWeek === 1) { // Monday
      factors.push('Monday effect - potential start-of-week impact')
    } else if (contextualFeatures.dayOfWeek === 5) { // Friday
      factors.push('Friday effect - potential end-of-week impact')
    }

    // Time of day effects
    if (contextualFeatures.hourOfDay >= 9 && contextualFeatures.hourOfDay <= 17) {
      factors.push('Occurred during business hours')
    } else if (contextualFeatures.hourOfDay >= 0 && contextualFeatures.hourOfDay <= 6) {
      factors.push('Occurred during overnight hours')
    }

    // Seasonal effects
    if (Math.abs(contextualFeatures.seasonalIndex) > 0.7) {
      factors.push('Strong seasonal influence detected')
    }

    // Holiday effects
    if (contextualFeatures.isHoliday) {
      factors.push('Holiday period may have influenced normal patterns')
    }

    return factors
  }

  /**
   * Identify statistical factors
   */
  private async identifyStatisticalFactors(anomaly: DetectedAnomaly, data: TimeSeriesData): Promise<string[]> {
    const factors: string[] = []
    
    // Volatility analysis
    const recentVolatility = this.calculateRecentVolatility(data, anomaly.timestamp)
    const historicalVolatility = this.calculateHistoricalVolatility(data)
    
    if (recentVolatility > historicalVolatility * 1.5) {
      factors.push('Increased volatility in recent period')
    }

    // Trend analysis
    const recentTrend = this.calculateRecentTrend(data, anomaly.timestamp)
    if (Math.abs(recentTrend) > 0.1) {
      const direction = recentTrend > 0 ? 'upward' : 'downward'
      factors.push(`Strong ${direction} trend preceding anomaly`)
    }

    // Autocorrelation analysis
    const autocorr = this.calculateAutocorrelation(data.values, 1)
    if (Math.abs(autocorr) > 0.7) {
      factors.push('High autocorrelation suggests systematic pattern disruption')
    }

    return factors
  }

  /**
   * Identify historical factors
   */
  private async identifyHistoricalFactors(
    anomaly: DetectedAnomaly, 
    historicalData: TimeSeriesData[]
  ): Promise<string[]> {
    const factors: string[] = []
    
    // Compare with similar historical periods
    const similarPeriods = this.findSimilarHistoricalPeriods(anomaly, historicalData)
    
    if (similarPeriods.length > 0) {
      const avgHistoricalValue = similarPeriods.reduce((sum, p) => sum + p.value, 0) / similarPeriods.length
      const deviation = Math.abs(anomaly.actualValue - avgHistoricalValue) / avgHistoricalValue
      
      if (deviation > 0.2) {
        factors.push(`Deviates ${(deviation * 100).toFixed(1)}% from similar historical periods`)
      }
    } else {
      factors.push('No similar historical periods found for comparison')
    }

    return factors
  }

  /**
   * Generate historical context
   */
  private async generateHistoricalContext(
    anomaly: DetectedAnomaly, 
    data: TimeSeriesData,
    historicalData?: TimeSeriesData[]
  ): Promise<string> {
    let context = `Anomaly detected at ${anomaly.timestamp.toISOString()}`
    
    // Recent pattern context
    const recentTrend = this.calculateRecentTrend(data, anomaly.timestamp)
    if (Math.abs(recentTrend) > 0.05) {
      const direction = recentTrend > 0 ? 'increasing' : 'decreasing'
      context += `. Recent data shows ${direction} trend`
    }

    // Historical comparison
    if (historicalData && historicalData.length > 0) {
      const historicalStats = this.calculateHistoricalStatistics(historicalData)
      const percentile = this.calculatePercentile(anomaly.actualValue, historicalStats.values)
      
      context += `. Value represents ${percentile.toFixed(1)}th percentile of historical data`
      
      if (percentile > 95) {
        context += ' (extremely high)'
      } else if (percentile < 5) {
        context += ' (extremely low)'
      }
    }

    return context
  }

  /**
   * Assess business impact
   */
  private async assessBusinessImpact(anomaly: DetectedAnomaly, data: TimeSeriesData): Promise<string> {
    const magnitude = Math.abs(anomaly.actualValue - anomaly.expectedValue)
    const relativeMagnitude = magnitude / anomaly.expectedValue
    
    let impact = ''
    
    if (relativeMagnitude > 0.5) {
      impact = 'High business impact expected due to significant deviation from normal patterns'
    } else if (relativeMagnitude > 0.2) {
      impact = 'Moderate business impact possible, monitoring recommended'
    } else {
      impact = 'Low business impact expected, but trend should be monitored'
    }

    // Add severity-specific context
    switch (anomaly.severity) {
      case 'critical':
        impact += '. Immediate attention required to prevent potential service disruption'
        break
      case 'high':
        impact += '. Prompt investigation recommended to understand root cause'
        break
      case 'medium':
        impact += '. Should be reviewed during next business cycle'
        break
      case 'low':
        impact += '. Can be addressed as part of routine monitoring'
        break
    }

    return impact
  }

  /**
   * Generate immediate action recommendations
   */
  private async generateImmediateActions(
    anomaly: DetectedAnomaly, 
    explanation: AnomalyExplanation
  ): Promise<AnomalyRecommendation[]> {
    const actions: AnomalyRecommendation[] = []
    
    switch (anomaly.severity) {
      case 'critical':
        actions.push({
          id: `immediate_${anomaly.id}_1`,
          anomalyId: anomaly.id,
          priority: 'critical',
          category: 'immediate',
          title: 'Emergency Response Protocol',
          description: 'Activate emergency response procedures and notify key stakeholders immediately',
          expectedOutcome: 'Rapid containment of potential issues',
          implementationEffort: 'high',
          timeframe: 'Within 15 minutes'
        })
        break
        
      case 'high':
        actions.push({
          id: `immediate_${anomaly.id}_2`,
          anomalyId: anomaly.id,
          priority: 'high',
          category: 'immediate',
          title: 'System Health Check',
          description: 'Perform comprehensive system health check and verify data sources',
          expectedOutcome: 'Identification of potential system issues',
          implementationEffort: 'medium',
          timeframe: 'Within 1 hour'
        })
        break
    }

    // Data verification action for all severities
    actions.push({
      id: `immediate_${anomaly.id}_verify`,
      anomalyId: anomaly.id,
      priority: anomaly.severity === 'critical' ? 'critical' : 'high',
      category: 'immediate',
      title: 'Data Verification',
      description: 'Verify data accuracy and check for collection or processing errors',
      expectedOutcome: 'Confirmation of data integrity',
      implementationEffort: 'low',
      timeframe: 'Within 30 minutes'
    })

    return actions
  }

  /**
   * Generate preventive action recommendations
   */
  private async generatePreventiveActions(
    anomaly: DetectedAnomaly, 
    explanation: AnomalyExplanation,
    data: TimeSeriesData
  ): Promise<AnomalyRecommendation[]> {
    const actions: AnomalyRecommendation[] = []
    
    // Enhanced monitoring
    actions.push({
      id: `preventive_${anomaly.id}_monitor`,
      anomalyId: anomaly.id,
      priority: 'medium',
      category: 'preventive',
      title: 'Enhanced Monitoring Setup',
      description: 'Implement additional monitoring and alerting for similar patterns',
      expectedOutcome: 'Earlier detection of future anomalies',
      implementationEffort: 'medium',
      timeframe: 'Within 1 week'
    })

    // Model retraining if pattern suggests drift
    if (explanation.contributingFactors.some(f => f.includes('trend') || f.includes('drift'))) {
      actions.push({
        id: `preventive_${anomaly.id}_retrain`,
        anomalyId: anomaly.id,
        priority: 'medium',
        category: 'preventive',
        title: 'Model Retraining',
        description: 'Retrain anomaly detection models with recent data to adapt to new patterns',
        expectedOutcome: 'Improved detection accuracy for evolving patterns',
        implementationEffort: 'high',
        timeframe: 'Within 2 weeks'
      })
    }

    return actions
  }

  /**
   * Generate investigative action recommendations
   */
  private async generateInvestigativeActions(
    anomaly: DetectedAnomaly, 
    explanation: AnomalyExplanation
  ): Promise<AnomalyRecommendation[]> {
    const actions: AnomalyRecommendation[] = []
    
    // Root cause analysis
    actions.push({
      id: `investigative_${anomaly.id}_rca`,
      anomalyId: anomaly.id,
      priority: 'medium',
      category: 'investigative',
      title: 'Root Cause Analysis',
      description: 'Conduct detailed analysis to identify underlying causes of the anomaly',
      expectedOutcome: 'Understanding of anomaly root causes',
      implementationEffort: 'high',
      timeframe: 'Within 1 week'
    })

    // Pattern analysis for collective anomalies
    if (anomaly.type === 'collective') {
      actions.push({
        id: `investigative_${anomaly.id}_pattern`,
        anomalyId: anomaly.id,
        priority: 'low',
        category: 'investigative',
        title: 'Pattern Analysis',
        description: 'Analyze the collective pattern to understand its characteristics and potential causes',
        expectedOutcome: 'Insights into pattern formation and prevention',
        implementationEffort: 'medium',
        timeframe: 'Within 2 weeks'
      })
    }

    return actions
  }

  /**
   * Calculate explanation confidence
   */
  private async calculateExplanationConfidence(
    anomaly: DetectedAnomaly, 
    contributingFactors: string[]
  ): Promise<number> {
    let confidence = anomaly.confidence * 0.6 // Base on anomaly detection confidence
    
    // Increase confidence based on number of contributing factors
    confidence += Math.min(0.3, contributingFactors.length * 0.05)
    
    // Increase confidence for well-understood anomaly types
    switch (anomaly.type) {
      case 'point':
        confidence += 0.1
        break
      case 'contextual':
        confidence += 0.05
        break
      case 'collective':
        confidence += 0.15
        break
    }
    
    return Math.min(0.95, confidence)
  }

  // Helper methods
  
  private extractContextualFeatures(timestamp: Date): ContextualFeatures {
    return {
      dayOfWeek: timestamp.getDay(),
      hourOfDay: timestamp.getHours(),
      isHoliday: this.isHoliday(timestamp),
      isWeekend: timestamp.getDay() === 0 || timestamp.getDay() === 6,
      seasonalIndex: Math.sin(2 * Math.PI * this.getDayOfYear(timestamp) / 365),
      trendValue: 0.5 // Placeholder
    }
  }

  private isHoliday(date: Date): boolean {
    // Simplified holiday detection
    const month = date.getMonth()
    const day = date.getDate()
    const holidays = [
      { month: 0, day: 1 }, { month: 6, day: 4 }, { month: 11, day: 25 }
    ]
    return holidays.some(h => h.month === month && h.day === day)
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0)
    const diff = date.getTime() - start.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  private estimateDataInterval(data: TimeSeriesData): number {
    if (data.timestamps.length < 2) return 0
    
    const intervals = []
    for (let i = 1; i < Math.min(10, data.timestamps.length); i++) {
      intervals.push(data.timestamps[i].getTime() - data.timestamps[i - 1].getTime())
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
  }

  private calculateRecentVolatility(data: TimeSeriesData, referenceTime: Date): number {
    const recentData = data.values.filter((_, i) => 
      data.timestamps[i].getTime() > referenceTime.getTime() - 24 * 60 * 60 * 1000
    )
    
    if (recentData.length < 2) return 0
    
    const mean = recentData.reduce((sum, val) => sum + val, 0) / recentData.length
    const variance = recentData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentData.length
    return Math.sqrt(variance)
  }

  private calculateHistoricalVolatility(data: TimeSeriesData): number {
    if (data.values.length < 2) return 0
    
    const mean = data.values.reduce((sum, val) => sum + val, 0) / data.values.length
    const variance = data.values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.values.length
    return Math.sqrt(variance)
  }

  private calculateRecentTrend(data: TimeSeriesData, referenceTime: Date): number {
    const recentIndices = data.timestamps
      .map((timestamp, index) => ({ timestamp, index }))
      .filter(item => item.timestamp.getTime() > referenceTime.getTime() - 7 * 24 * 60 * 60 * 1000)
      .map(item => item.index)
    
    if (recentIndices.length < 2) return 0
    
    const recentValues = recentIndices.map(i => data.values[i])
    const x = Array.from({ length: recentValues.length }, (_, i) => i)
    
    const n = recentValues.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = recentValues.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * recentValues[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    return isNaN(slope) ? 0 : slope
  }

  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0
    
    const n = values.length - lag
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean)
    }
    
    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2)
    }
    
    return denominator === 0 ? 0 : numerator / denominator
  }

  private findSimilarHistoricalPeriods(
    anomaly: DetectedAnomaly, 
    historicalData: TimeSeriesData[]
  ): Array<{ timestamp: Date, value: number }> {
    const targetFeatures = this.extractContextualFeatures(anomaly.timestamp)
    const similarPeriods: Array<{ timestamp: Date, value: number }> = []
    
    for (const dataset of historicalData) {
      for (let i = 0; i < dataset.timestamps.length; i++) {
        const features = this.extractContextualFeatures(dataset.timestamps[i])
        const similarity = this.calculateContextualSimilarity(targetFeatures, features)
        
        if (similarity > 0.8) {
          similarPeriods.push({
            timestamp: dataset.timestamps[i],
            value: dataset.values[i]
          })
        }
      }
    }
    
    return similarPeriods
  }

  private calculateContextualSimilarity(features1: ContextualFeatures, features2: ContextualFeatures): number {
    let similarity = 0
    let weights = 0
    
    // Day of week similarity
    const dayDiff = Math.min(
      Math.abs(features1.dayOfWeek - features2.dayOfWeek),
      7 - Math.abs(features1.dayOfWeek - features2.dayOfWeek)
    )
    similarity += (1 - dayDiff / 3.5) * 0.3
    weights += 0.3
    
    // Hour similarity
    const hourDiff = Math.min(
      Math.abs(features1.hourOfDay - features2.hourOfDay),
      24 - Math.abs(features1.hourOfDay - features2.hourOfDay)
    )
    similarity += (1 - hourDiff / 12) * 0.2
    weights += 0.2
    
    // Boolean features
    if (features1.isWeekend === features2.isWeekend) similarity += 0.2
    if (features1.isHoliday === features2.isHoliday) similarity += 0.1
    weights += 0.3
    
    // Seasonal similarity
    const seasonalSimilarity = 1 - Math.abs(features1.seasonalIndex - features2.seasonalIndex) / 2
    similarity += seasonalSimilarity * 0.2
    weights += 0.2
    
    return weights > 0 ? similarity / weights : 0
  }

  private calculateHistoricalStatistics(historicalData: TimeSeriesData[]): { values: number[], mean: number, std: number } {
    const allValues = historicalData.flatMap(data => data.values)
    const mean = allValues.reduce((sum, val) => sum + val, 0) / allValues.length
    const variance = allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allValues.length
    const std = Math.sqrt(variance)
    
    return { values: allValues, mean, std }
  }

  private calculatePercentile(value: number, values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const index = sorted.findIndex(v => v >= value)
    return index === -1 ? 100 : (index / sorted.length) * 100
  }

  private getPriorityScore(priority: string): number {
    const scores = { low: 1, medium: 2, high: 3, critical: 4 }
    return scores[priority as keyof typeof scores] || 0
  }
}