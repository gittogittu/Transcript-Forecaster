import { 
  DetectedAnomaly, 
  AnomalyType, 
  AnomalySeverity, 
  TimeSeriesData,
  AnomalyPattern,
  ContextualFeatures
} from './types'

/**
 * Anomaly Classifier
 * Classifies anomalies into point, contextual, and collective types
 */
export class AnomalyClassifier {
  private readonly COLLECTIVE_WINDOW_SIZE = 5
  private readonly CONTEXTUAL_THRESHOLD = 0.7
  private readonly PATTERN_SIMILARITY_THRESHOLD = 0.8

  /**
   * Classify a single anomaly
   */
  async classifyAnomaly(
    anomaly: DetectedAnomaly, 
    data: TimeSeriesData, 
    index: number
  ): Promise<AnomalyType> {
    // First check if it's part of a collective anomaly
    const isCollective = await this.isCollectiveAnomaly(data, index)
    if (isCollective) return 'collective'

    // Then check if it's contextual
    const isContextual = await this.isContextualAnomaly(anomaly, data, index)
    if (isContextual) return 'contextual'

    // Default to point anomaly
    return 'point'
  }

  /**
   * Classify multiple anomalies and identify patterns
   */
  async classifyAnomalies(
    anomalies: DetectedAnomaly[], 
    data: TimeSeriesData
  ): Promise<DetectedAnomaly[]> {
    const classified: DetectedAnomaly[] = []
    
    // Create index mapping for efficient lookup
    const timestampToIndex = new Map<number, number>()
    data.timestamps.forEach((timestamp, index) => {
      timestampToIndex.set(timestamp.getTime(), index)
    })

    // Identify collective anomalies first
    const collectiveGroups = await this.identifyCollectiveAnomalies(anomalies, data, timestampToIndex)
    
    for (const anomaly of anomalies) {
      const index = timestampToIndex.get(anomaly.timestamp.getTime())
      if (index === undefined) {
        classified.push(anomaly)
        continue
      }

      let type: AnomalyType = 'point'
      let pattern: AnomalyPattern | undefined

      // Check if part of collective group
      const collectiveGroup = collectiveGroups.find(group => 
        group.anomalies.some(a => a.id === anomaly.id)
      )
      
      if (collectiveGroup) {
        type = 'collective'
        pattern = collectiveGroup.pattern
      } else {
        // Check for contextual anomaly
        const isContextual = await this.isContextualAnomaly(anomaly, data, index)
        if (isContextual) {
          type = 'contextual'
          pattern = await this.identifyContextualPattern(anomaly, data, index)
        } else {
          pattern = await this.identifyPointPattern(anomaly, data, index)
        }
      }

      const classifiedAnomaly: DetectedAnomaly = {
        ...anomaly,
        type,
        metadata: {
          ...anomaly.metadata,
          pattern,
          classificationConfidence: await this.calculateClassificationConfidence(type, anomaly, data, index)
        }
      }

      classified.push(classifiedAnomaly)
    }

    return classified
  }

  /**
   * Check if anomaly is part of a collective pattern
   */
  private async isCollectiveAnomaly(data: TimeSeriesData, index: number): Promise<boolean> {
    const windowStart = Math.max(0, index - this.COLLECTIVE_WINDOW_SIZE)
    const windowEnd = Math.min(data.values.length, index + this.COLLECTIVE_WINDOW_SIZE + 1)
    const window = data.values.slice(windowStart, windowEnd)
    
    // Calculate statistics for the window
    const mean = window.reduce((sum, val) => sum + val, 0) / window.length
    const std = Math.sqrt(
      window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length
    )
    
    // Count how many points in the window are anomalous
    let anomalousCount = 0
    const threshold = 2 * std
    
    for (const value of window) {
      if (Math.abs(value - mean) > threshold) {
        anomalousCount++
      }
    }
    
    // If more than half the window is anomalous, it's collective
    return anomalousCount / window.length > 0.5
  }

  /**
   * Check if anomaly is contextual (depends on time/seasonal factors)
   */
  private async isContextualAnomaly(
    anomaly: DetectedAnomaly, 
    data: TimeSeriesData, 
    index: number
  ): Promise<boolean> {
    const contextualFeatures = this.extractContextualFeatures(anomaly.timestamp)
    
    // Find similar contextual periods in historical data
    const similarPeriods = await this.findSimilarContextualPeriods(
      data, 
      contextualFeatures, 
      index
    )
    
    if (similarPeriods.length < 3) return false
    
    // Calculate expected value based on similar periods
    const expectedValue = similarPeriods.reduce((sum, period) => sum + period.value, 0) / similarPeriods.length
    const expectedStd = Math.sqrt(
      similarPeriods.reduce((sum, period) => sum + Math.pow(period.value - expectedValue, 2), 0) / similarPeriods.length
    )
    
    // Check if current value is anomalous in this context
    const contextualDeviation = Math.abs(anomaly.actualValue - expectedValue) / expectedStd
    
    return contextualDeviation > this.CONTEXTUAL_THRESHOLD
  }

  /**
   * Identify collective anomaly groups
   */
  private async identifyCollectiveAnomalies(
    anomalies: DetectedAnomaly[], 
    data: TimeSeriesData,
    timestampToIndex: Map<number, number>
  ): Promise<Array<{ anomalies: DetectedAnomaly[], pattern: AnomalyPattern }>> {
    const groups: Array<{ anomalies: DetectedAnomaly[], pattern: AnomalyPattern }> = []
    const processed = new Set<string>()
    
    for (const anomaly of anomalies) {
      if (processed.has(anomaly.id)) continue
      
      const index = timestampToIndex.get(anomaly.timestamp.getTime())
      if (index === undefined) continue
      
      const isCollective = await this.isCollectiveAnomaly(data, index)
      if (!isCollective) continue
      
      // Find all anomalies in the collective window
      const windowStart = Math.max(0, index - this.COLLECTIVE_WINDOW_SIZE)
      const windowEnd = Math.min(data.values.length, index + this.COLLECTIVE_WINDOW_SIZE + 1)
      
      const groupAnomalies = anomalies.filter(a => {
        const aIndex = timestampToIndex.get(a.timestamp.getTime())
        return aIndex !== undefined && aIndex >= windowStart && aIndex < windowEnd
      })
      
      if (groupAnomalies.length >= 2) {
        const pattern = await this.identifyCollectivePattern(groupAnomalies, data, timestampToIndex)
        groups.push({ anomalies: groupAnomalies, pattern })
        
        // Mark as processed
        groupAnomalies.forEach(a => processed.add(a.id))
      }
    }
    
    return groups
  }

  /**
   * Identify pattern for collective anomalies
   */
  private async identifyCollectivePattern(
    anomalies: DetectedAnomaly[], 
    data: TimeSeriesData,
    timestampToIndex: Map<number, number>
  ): Promise<AnomalyPattern> {
    const indices = anomalies
      .map(a => timestampToIndex.get(a.timestamp.getTime()))
      .filter(i => i !== undefined)
      .sort((a, b) => a! - b!)
    
    if (indices.length === 0) {
      return { patternType: 'spike', duration: 0, magnitude: 0 }
    }
    
    const startIndex = indices[0]!
    const endIndex = indices[indices.length - 1]!
    const duration = endIndex - startIndex + 1
    
    // Calculate pattern characteristics
    const values = indices.map(i => data.values[i!])
    const baseline = this.calculateBaseline(data, startIndex, endIndex)
    const magnitude = Math.max(...values.map(v => Math.abs(v - baseline)))
    
    // Determine pattern type
    const patternType = this.determinePatternType(values, baseline)
    
    return {
      patternType,
      duration,
      magnitude,
      frequency: duration > 1 ? 1 / duration : 1
    }
  }

  /**
   * Identify pattern for contextual anomalies
   */
  private async identifyContextualPattern(
    anomaly: DetectedAnomaly, 
    data: TimeSeriesData, 
    index: number
  ): Promise<AnomalyPattern> {
    const contextualFeatures = this.extractContextualFeatures(anomaly.timestamp)
    const baseline = this.calculateBaseline(data, Math.max(0, index - 10), Math.min(data.values.length, index + 10))
    
    return {
      patternType: anomaly.actualValue > baseline ? 'spike' : 'drop',
      duration: 1,
      magnitude: Math.abs(anomaly.actualValue - baseline),
      frequency: contextualFeatures.seasonalIndex
    }
  }

  /**
   * Identify pattern for point anomalies
   */
  private async identifyPointPattern(
    anomaly: DetectedAnomaly, 
    data: TimeSeriesData, 
    index: number
  ): Promise<AnomalyPattern> {
    const baseline = this.calculateBaseline(data, Math.max(0, index - 5), Math.min(data.values.length, index + 5))
    
    return {
      patternType: anomaly.actualValue > baseline ? 'spike' : 'drop',
      duration: 1,
      magnitude: Math.abs(anomaly.actualValue - baseline)
    }
  }

  /**
   * Extract contextual features from timestamp
   */
  private extractContextualFeatures(timestamp: Date): ContextualFeatures {
    const dayOfWeek = timestamp.getDay()
    const hourOfDay = timestamp.getHours()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isHoliday = this.isHoliday(timestamp)
    
    // Calculate seasonal index
    const dayOfYear = this.getDayOfYear(timestamp)
    const seasonalIndex = Math.sin(2 * Math.PI * dayOfYear / 365)
    
    // Simple trend calculation (could be enhanced)
    const trendValue = 0.5
    
    return {
      dayOfWeek,
      hourOfDay,
      isHoliday,
      isWeekend,
      seasonalIndex,
      trendValue
    }
  }

  /**
   * Find periods with similar contextual features
   */
  private async findSimilarContextualPeriods(
    data: TimeSeriesData, 
    targetFeatures: ContextualFeatures, 
    excludeIndex: number
  ): Promise<Array<{ index: number, value: number, similarity: number }>> {
    const similarPeriods: Array<{ index: number, value: number, similarity: number }> = []
    
    for (let i = 0; i < data.timestamps.length; i++) {
      if (i === excludeIndex) continue
      
      const features = this.extractContextualFeatures(data.timestamps[i])
      const similarity = this.calculateContextualSimilarity(targetFeatures, features)
      
      if (similarity > this.PATTERN_SIMILARITY_THRESHOLD) {
        similarPeriods.push({
          index: i,
          value: data.values[i],
          similarity
        })
      }
    }
    
    return similarPeriods.sort((a, b) => b.similarity - a.similarity)
  }

  /**
   * Calculate similarity between contextual features
   */
  private calculateContextualSimilarity(
    features1: ContextualFeatures, 
    features2: ContextualFeatures
  ): number {
    let similarity = 0
    let weights = 0
    
    // Day of week similarity (cyclical)
    const dayDiff = Math.min(
      Math.abs(features1.dayOfWeek - features2.dayOfWeek),
      7 - Math.abs(features1.dayOfWeek - features2.dayOfWeek)
    )
    similarity += (1 - dayDiff / 3.5) * 0.3
    weights += 0.3
    
    // Hour of day similarity (cyclical)
    const hourDiff = Math.min(
      Math.abs(features1.hourOfDay - features2.hourOfDay),
      24 - Math.abs(features1.hourOfDay - features2.hourOfDay)
    )
    similarity += (1 - hourDiff / 12) * 0.2
    weights += 0.2
    
    // Weekend similarity
    if (features1.isWeekend === features2.isWeekend) {
      similarity += 0.2
    }
    weights += 0.2
    
    // Holiday similarity
    if (features1.isHoliday === features2.isHoliday) {
      similarity += 0.1
    }
    weights += 0.1
    
    // Seasonal similarity
    const seasonalSimilarity = 1 - Math.abs(features1.seasonalIndex - features2.seasonalIndex) / 2
    similarity += seasonalSimilarity * 0.2
    weights += 0.2
    
    return weights > 0 ? similarity / weights : 0
  }

  /**
   * Calculate baseline value for a range
   */
  private calculateBaseline(data: TimeSeriesData, startIndex: number, endIndex: number): number {
    const values = data.values.slice(startIndex, endIndex)
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  /**
   * Determine pattern type from values and baseline
   */
  private determinePatternType(values: number[], baseline: number): AnomalyPattern['patternType'] {
    const deviations = values.map(v => v - baseline)
    const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length
    const maxDeviation = Math.max(...deviations.map(Math.abs))
    
    // Check for oscillation
    let signChanges = 0
    for (let i = 1; i < deviations.length; i++) {
      if ((deviations[i] > 0) !== (deviations[i - 1] > 0)) {
        signChanges++
      }
    }
    
    if (signChanges >= deviations.length * 0.6) {
      return 'oscillation'
    }
    
    // Check for level shift
    const firstHalf = deviations.slice(0, Math.floor(deviations.length / 2))
    const secondHalf = deviations.slice(Math.floor(deviations.length / 2))
    const firstAvg = firstHalf.reduce((sum, dev) => sum + dev, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, dev) => sum + dev, 0) / secondHalf.length
    
    if (Math.abs(secondAvg - firstAvg) > maxDeviation * 0.5) {
      return 'level_shift'
    }
    
    // Check for drift
    const trend = this.calculateTrend(values)
    if (Math.abs(trend) > maxDeviation * 0.3) {
      return 'drift'
    }
    
    // Default to spike or drop
    return avgDeviation > 0 ? 'spike' : 'drop'
  }

  /**
   * Calculate trend (slope) of values
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0
    
    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = values
    
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    return isNaN(slope) ? 0 : slope
  }

  /**
   * Calculate classification confidence
   */
  private async calculateClassificationConfidence(
    type: AnomalyType, 
    anomaly: DetectedAnomaly, 
    data: TimeSeriesData, 
    index: number
  ): Promise<number> {
    let confidence = 0.5 // Base confidence
    
    switch (type) {
      case 'collective':
        // Higher confidence if more points in the collective pattern
        const collectiveSize = await this.getCollectiveSize(data, index)
        confidence = Math.min(0.95, 0.6 + collectiveSize * 0.1)
        break
        
      case 'contextual':
        // Confidence based on how well it matches contextual patterns
        const contextualMatch = await this.getContextualMatchStrength(anomaly, data, index)
        confidence = Math.min(0.9, 0.5 + contextualMatch * 0.4)
        break
        
      case 'point':
        // Confidence based on deviation magnitude
        confidence = Math.min(0.85, 0.4 + anomaly.deviationScore * 0.1)
        break
    }
    
    return confidence
  }

  /**
   * Get size of collective anomaly pattern
   */
  private async getCollectiveSize(data: TimeSeriesData, index: number): Promise<number> {
    const windowStart = Math.max(0, index - this.COLLECTIVE_WINDOW_SIZE)
    const windowEnd = Math.min(data.values.length, index + this.COLLECTIVE_WINDOW_SIZE + 1)
    const window = data.values.slice(windowStart, windowEnd)
    
    const mean = window.reduce((sum, val) => sum + val, 0) / window.length
    const std = Math.sqrt(
      window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length
    )
    
    let anomalousCount = 0
    const threshold = 2 * std
    
    for (const value of window) {
      if (Math.abs(value - mean) > threshold) {
        anomalousCount++
      }
    }
    
    return anomalousCount
  }

  /**
   * Get contextual match strength
   */
  private async getContextualMatchStrength(
    anomaly: DetectedAnomaly, 
    data: TimeSeriesData, 
    index: number
  ): Promise<number> {
    const contextualFeatures = this.extractContextualFeatures(anomaly.timestamp)
    const similarPeriods = await this.findSimilarContextualPeriods(data, contextualFeatures, index)
    
    if (similarPeriods.length === 0) return 0
    
    const avgSimilarity = similarPeriods.reduce((sum, period) => sum + period.similarity, 0) / similarPeriods.length
    return avgSimilarity
  }

  /**
   * Check if date is a holiday
   */
  private isHoliday(date: Date): boolean {
    // Simplified holiday detection
    const month = date.getMonth()
    const day = date.getDate()
    
    const holidays = [
      { month: 0, day: 1 },   // New Year's Day
      { month: 6, day: 4 },   // Independence Day
      { month: 11, day: 25 }  // Christmas Day
    ]
    
    return holidays.some(h => h.month === month && h.day === day)
  }

  /**
   * Get day of year
   */
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0)
    const diff = date.getTime() - start.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }
}