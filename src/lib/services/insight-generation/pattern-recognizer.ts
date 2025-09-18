import { 
  PatternRecognition, 
  DetectedPattern, 
  PatternSimilarity, 
  PatternAnomaly, 
  CyclicalBehavior,
  DateRange,
  DataPoint 
} from './types'

export class PatternRecognizer {
  async recognizePatterns(data: any, timeRange: DateRange): Promise<PatternRecognition> {
    try {
      const timeSeries = this.extractTimeSeries(data)
      
      const patterns = await this.detectPatterns(timeSeries, timeRange)
      const similarities = this.findPatternSimilarities(patterns)
      const anomalies = this.detectPatternAnomalies(timeSeries, patterns)
      const cyclicalBehavior = this.analyzeCyclicalBehavior(timeSeries)

      return {
        patterns,
        similarities,
        anomalies,
        cyclicalBehavior
      }
    } catch (error) {
      console.error('Error recognizing patterns:', error)
      throw new Error(`Pattern recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private extractTimeSeries(data: any): DataPoint[] {
    return data.timeSeries || []
  }

  private async detectPatterns(timeSeries: DataPoint[], timeRange: DateRange): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = []
    
    // Detect different types of patterns
    patterns.push(...this.detectRecurringPatterns(timeSeries, timeRange))
    patterns.push(...this.detectSeasonalPatterns(timeSeries, timeRange))
    patterns.push(...this.detectTrendPatterns(timeSeries, timeRange))
    patterns.push(...this.detectCyclicalPatterns(timeSeries, timeRange))
    patterns.push(...this.detectIrregularPatterns(timeSeries, timeRange))

    return patterns.filter(pattern => pattern.confidence > 0.5)
  }

  private detectRecurringPatterns(timeSeries: DataPoint[], timeRange: DateRange): DetectedPattern[] {
    const patterns: DetectedPattern[] = []
    
    if (timeSeries.length < 10) return patterns

    // Look for recurring patterns using autocorrelation
    const values = timeSeries.map(point => point.value)
    const autocorrelations = this.calculateAutocorrelation(values, Math.min(values.length / 4, 50))
    
    // Find significant peaks in autocorrelation
    for (let lag = 2; lag < autocorrelations.length; lag++) {
      if (autocorrelations[lag] > 0.6 && this.isLocalMaximum(autocorrelations, lag)) {
        const frequency = 1 / lag
        const strength = autocorrelations[lag]
        
        patterns.push({
          id: `recurring-${lag}-${Date.now()}`,
          type: 'recurring',
          description: `Recurring pattern every ${lag} periods`,
          frequency,
          strength,
          confidence: strength,
          timeRange,
          examples: this.extractPatternExamples(timeSeries, lag, 3)
        })
      }
    }

    return patterns
  }

  private detectSeasonalPatterns(timeSeries: DataPoint[], timeRange: DateRange): DetectedPattern[] {
    const patterns: DetectedPattern[] = []
    
    // Daily seasonality (24-hour cycle)
    const dailyPattern = this.detectSeasonalPattern(timeSeries, 24, 'daily')
    if (dailyPattern) patterns.push(dailyPattern)
    
    // Weekly seasonality (7-day cycle)
    const weeklyPattern = this.detectSeasonalPattern(timeSeries, 7 * 24, 'weekly')
    if (weeklyPattern) patterns.push(weeklyPattern)
    
    // Monthly seasonality (30-day cycle)
    const monthlyPattern = this.detectSeasonalPattern(timeSeries, 30 * 24, 'monthly')
    if (monthlyPattern) patterns.push(monthlyPattern)

    return patterns
  }

  private detectSeasonalPattern(
    timeSeries: DataPoint[], 
    period: number, 
    seasonType: string
  ): DetectedPattern | null {
    if (timeSeries.length < period * 2) return null

    const values = timeSeries.map(point => point.value)
    const seasonalComponents = this.extractSeasonalComponent(values, period)
    const strength = this.calculateSeasonalStrength(seasonalComponents)
    
    if (strength < 0.3) return null

    return {
      id: `seasonal-${seasonType}-${Date.now()}`,
      type: 'seasonal',
      description: `${seasonType.charAt(0).toUpperCase() + seasonType.slice(1)} seasonal pattern`,
      frequency: 1 / period,
      strength,
      confidence: strength,
      timeRange: {
        startDate: timeSeries[0].timestamp,
        endDate: timeSeries[timeSeries.length - 1].timestamp
      },
      examples: this.extractSeasonalExamples(timeSeries, period)
    }
  }

  private detectTrendPatterns(timeSeries: DataPoint[], timeRange: DateRange): DetectedPattern[] {
    const patterns: DetectedPattern[] = []
    
    if (timeSeries.length < 10) return patterns

    const values = timeSeries.map(point => point.value)
    const trendStrength = this.calculateTrendStrength(values)
    
    if (trendStrength > 0.5) {
      const slope = this.calculateSlope(values)
      const trendType = slope > 0 ? 'increasing' : 'decreasing'
      
      patterns.push({
        id: `trend-${trendType}-${Date.now()}`,
        type: 'trend',
        description: `${trendType.charAt(0).toUpperCase() + trendType.slice(1)} trend pattern`,
        frequency: 0, // Trends don't have frequency
        strength: trendStrength,
        confidence: trendStrength,
        timeRange,
        examples: this.extractTrendExamples(timeSeries, 5)
      })
    }

    return patterns
  }

  private detectCyclicalPatterns(timeSeries: DataPoint[], timeRange: DateRange): DetectedPattern[] {
    const patterns: DetectedPattern[] = []
    
    if (timeSeries.length < 20) return patterns

    const values = timeSeries.map(point => point.value)
    const cycles = this.findCycles(values)
    
    for (const cycle of cycles) {
      if (cycle.strength > 0.4) {
        patterns.push({
          id: `cyclical-${cycle.period}-${Date.now()}`,
          type: 'cyclical',
          description: `Cyclical pattern with period of ${cycle.period} units`,
          frequency: 1 / cycle.period,
          strength: cycle.strength,
          confidence: cycle.strength,
          timeRange,
          examples: this.extractCyclicalExamples(timeSeries, cycle.period)
        })
      }
    }

    return patterns
  }

  private detectIrregularPatterns(timeSeries: DataPoint[], timeRange: DateRange): DetectedPattern[] {
    const patterns: DetectedPattern[] = []
    
    const values = timeSeries.map(point => point.value)
    const irregularityScore = this.calculateIrregularityScore(values)
    
    if (irregularityScore > 0.6) {
      patterns.push({
        id: `irregular-${Date.now()}`,
        type: 'irregular',
        description: 'Irregular pattern with high variability',
        frequency: 0,
        strength: irregularityScore,
        confidence: irregularityScore,
        timeRange,
        examples: this.extractIrregularExamples(timeSeries, 5)
      })
    }

    return patterns
  }

  private findPatternSimilarities(patterns: DetectedPattern[]): PatternSimilarity[] {
    const similarities: PatternSimilarity[] = []
    
    for (let i = 0; i < patterns.length; i++) {
      const similarPatterns: string[] = []
      
      for (let j = i + 1; j < patterns.length; j++) {
        const similarity = this.calculatePatternSimilarity(patterns[i], patterns[j])
        
        if (similarity > 0.7) {
          similarPatterns.push(patterns[j].id)
        }
      }
      
      if (similarPatterns.length > 0) {
        similarities.push({
          patternId: patterns[i].id,
          similarPatterns,
          similarity: 0.8, // Average similarity
          timeOffset: 0 // Simplified
        })
      }
    }

    return similarities
  }

  private detectPatternAnomalies(timeSeries: DataPoint[], patterns: DetectedPattern[]): PatternAnomaly[] {
    const anomalies: PatternAnomaly[] = []
    
    // For each detected pattern, find points that deviate significantly
    for (const pattern of patterns) {
      if (pattern.type === 'seasonal' || pattern.type === 'recurring') {
        const patternAnomalies = this.findPatternDeviations(timeSeries, pattern)
        anomalies.push(...patternAnomalies)
      }
    }

    return anomalies
  }

  private analyzeCyclicalBehavior(timeSeries: DataPoint[]): CyclicalBehavior[] {
    const behaviors: CyclicalBehavior[] = []
    
    if (timeSeries.length < 20) return behaviors

    const values = timeSeries.map(point => point.value)
    const cycles = this.findCycles(values)
    
    for (const cycle of cycles) {
      behaviors.push({
        cycle: `${cycle.period}-period cycle`,
        period: cycle.period,
        amplitude: cycle.amplitude,
        phase: cycle.phase,
        regularity: cycle.regularity
      })
    }

    return behaviors
  }

  // Utility methods
  private calculateAutocorrelation(values: number[], maxLag: number): number[] {
    const n = values.length
    const mean = values.reduce((sum, val) => sum + val, 0) / n
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
    
    const autocorr: number[] = []
    
    for (let lag = 0; lag <= maxLag; lag++) {
      let covariance = 0
      const count = n - lag
      
      for (let i = 0; i < count; i++) {
        covariance += (values[i] - mean) * (values[i + lag] - mean)
      }
      
      covariance /= count
      autocorr[lag] = covariance / variance
    }
    
    return autocorr
  }

  private isLocalMaximum(values: number[], index: number): boolean {
    if (index === 0 || index === values.length - 1) return false
    return values[index] > values[index - 1] && values[index] > values[index + 1]
  }

  private extractPatternExamples(timeSeries: DataPoint[], period: number, count: number): DataPoint[] {
    const examples: DataPoint[] = []
    
    for (let i = 0; i < count && i * period < timeSeries.length; i++) {
      const startIndex = i * period
      const endIndex = Math.min(startIndex + period, timeSeries.length)
      examples.push(...timeSeries.slice(startIndex, endIndex))
    }
    
    return examples
  }

  private extractSeasonalComponent(values: number[], period: number): number[] {
    const seasonalComponent: number[] = []
    
    for (let i = 0; i < period; i++) {
      const seasonalValues: number[] = []
      
      for (let j = i; j < values.length; j += period) {
        seasonalValues.push(values[j])
      }
      
      const mean = seasonalValues.reduce((sum, val) => sum + val, 0) / seasonalValues.length
      seasonalComponent[i] = mean
    }
    
    return seasonalComponent
  }

  private calculateSeasonalStrength(seasonalComponent: number[]): number {
    const mean = seasonalComponent.reduce((sum, val) => sum + val, 0) / seasonalComponent.length
    const variance = seasonalComponent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / seasonalComponent.length
    const coefficientOfVariation = Math.sqrt(variance) / mean
    
    return Math.min(coefficientOfVariation, 1)
  }

  private extractSeasonalExamples(timeSeries: DataPoint[], period: number): DataPoint[] {
    // Extract one complete seasonal cycle as example
    return timeSeries.slice(0, Math.min(period, timeSeries.length))
  }

  private calculateTrendStrength(values: number[]): number {
    if (values.length < 3) return 0
    
    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)
    
    // Calculate linear regression
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = values.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    
    // Calculate R-squared
    const yMean = sumY / n
    const totalSumSquares = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0)
    const predicted = x.map(xi => slope * xi + (sumY - slope * sumX) / n)
    const residualSumSquares = values.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0)
    
    return 1 - (residualSumSquares / totalSumSquares)
  }

  private calculateSlope(values: number[]): number {
    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)
    
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = values.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  }

  private extractTrendExamples(timeSeries: DataPoint[], count: number): DataPoint[] {
    const step = Math.floor(timeSeries.length / count)
    const examples: DataPoint[] = []
    
    for (let i = 0; i < count && i * step < timeSeries.length; i++) {
      examples.push(timeSeries[i * step])
    }
    
    return examples
  }

  private findCycles(values: number[]): Array<{
    period: number
    amplitude: number
    phase: number
    strength: number
    regularity: number
  }> {
    const cycles: Array<{
      period: number
      amplitude: number
      phase: number
      strength: number
      regularity: number
    }> = []
    
    // Simplified cycle detection using FFT-like approach
    const maxPeriod = Math.floor(values.length / 4)
    
    for (let period = 3; period <= maxPeriod; period++) {
      const cycleStrength = this.calculateCycleStrength(values, period)
      
      if (cycleStrength > 0.3) {
        cycles.push({
          period,
          amplitude: this.calculateCycleAmplitude(values, period),
          phase: this.calculateCyclePhase(values, period),
          strength: cycleStrength,
          regularity: this.calculateCycleRegularity(values, period)
        })
      }
    }
    
    return cycles.sort((a, b) => b.strength - a.strength).slice(0, 5) // Top 5 cycles
  }

  private calculateCycleStrength(values: number[], period: number): number {
    // Simplified cycle strength calculation
    const autocorr = this.calculateAutocorrelation(values, period)
    return Math.abs(autocorr[period] || 0)
  }

  private calculateCycleAmplitude(values: number[], period: number): number {
    const cycles: number[][] = []
    
    for (let i = 0; i + period <= values.length; i += period) {
      cycles.push(values.slice(i, i + period))
    }
    
    if (cycles.length === 0) return 0
    
    // Calculate average amplitude across cycles
    let totalAmplitude = 0
    
    for (const cycle of cycles) {
      const min = Math.min(...cycle)
      const max = Math.max(...cycle)
      totalAmplitude += (max - min) / 2
    }
    
    return totalAmplitude / cycles.length
  }

  private calculateCyclePhase(values: number[], period: number): number {
    // Simplified phase calculation - find the peak position in the average cycle
    const avgCycle = this.calculateAverageCycle(values, period)
    let maxIndex = 0
    let maxValue = -Infinity
    
    for (let i = 0; i < avgCycle.length; i++) {
      if (avgCycle[i] > maxValue) {
        maxValue = avgCycle[i]
        maxIndex = i
      }
    }
    
    return (maxIndex / period) * 2 * Math.PI // Convert to radians
  }

  private calculateCycleRegularity(values: number[], period: number): number {
    const cycles: number[][] = []
    
    for (let i = 0; i + period <= values.length; i += period) {
      cycles.push(values.slice(i, i + period))
    }
    
    if (cycles.length < 2) return 0
    
    // Calculate correlation between consecutive cycles
    let totalCorrelation = 0
    let count = 0
    
    for (let i = 0; i < cycles.length - 1; i++) {
      const correlation = this.calculateCorrelation(cycles[i], cycles[i + 1])
      totalCorrelation += correlation
      count++
    }
    
    return count > 0 ? totalCorrelation / count : 0
  }

  private calculateAverageCycle(values: number[], period: number): number[] {
    const avgCycle = new Array(period).fill(0)
    const counts = new Array(period).fill(0)
    
    for (let i = 0; i < values.length; i++) {
      const cyclePosition = i % period
      avgCycle[cyclePosition] += values[i]
      counts[cyclePosition]++
    }
    
    for (let i = 0; i < period; i++) {
      if (counts[i] > 0) {
        avgCycle[i] /= counts[i]
      }
    }
    
    return avgCycle
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length) return 0
    
    const n = x.length
    const meanX = x.reduce((sum, val) => sum + val, 0) / n
    const meanY = y.reduce((sum, val) => sum + val, 0) / n
    
    let numerator = 0
    let sumXSquared = 0
    let sumYSquared = 0
    
    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX
      const deltaY = y[i] - meanY
      
      numerator += deltaX * deltaY
      sumXSquared += deltaX * deltaX
      sumYSquared += deltaY * deltaY
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared)
    return denominator === 0 ? 0 : numerator / denominator
  }

  private extractCyclicalExamples(timeSeries: DataPoint[], period: number): DataPoint[] {
    // Extract one complete cycle as example
    return timeSeries.slice(0, Math.min(period, timeSeries.length))
  }

  private calculateIrregularityScore(values: number[]): number {
    if (values.length < 3) return 0
    
    // Calculate coefficient of variation
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const coefficientOfVariation = Math.sqrt(variance) / mean
    
    // Calculate first-order differences to measure volatility
    const differences: number[] = []
    for (let i = 1; i < values.length; i++) {
      differences.push(Math.abs(values[i] - values[i - 1]))
    }
    
    const avgDifference = differences.reduce((sum, val) => sum + val, 0) / differences.length
    const relativeDifference = avgDifference / mean
    
    // Combine measures
    return Math.min((coefficientOfVariation + relativeDifference) / 2, 1)
  }

  private extractIrregularExamples(timeSeries: DataPoint[], count: number): DataPoint[] {
    // Extract points with highest volatility as examples
    const values = timeSeries.map(point => point.value)
    const volatilities: Array<{ index: number, volatility: number }> = []
    
    for (let i = 1; i < values.length - 1; i++) {
      const volatility = Math.abs(values[i] - values[i - 1]) + Math.abs(values[i + 1] - values[i])
      volatilities.push({ index: i, volatility })
    }
    
    volatilities.sort((a, b) => b.volatility - a.volatility)
    
    return volatilities.slice(0, count).map(item => timeSeries[item.index])
  }

  private calculatePatternSimilarity(pattern1: DetectedPattern, pattern2: DetectedPattern): number {
    // Simple similarity based on type and frequency
    if (pattern1.type !== pattern2.type) return 0
    
    const frequencyDiff = Math.abs(pattern1.frequency - pattern2.frequency)
    const strengthDiff = Math.abs(pattern1.strength - pattern2.strength)
    
    const frequencySimilarity = 1 - Math.min(frequencyDiff, 1)
    const strengthSimilarity = 1 - strengthDiff
    
    return (frequencySimilarity + strengthSimilarity) / 2
  }

  private findPatternDeviations(timeSeries: DataPoint[], pattern: DetectedPattern): PatternAnomaly[] {
    const anomalies: PatternAnomaly[] = []
    
    // This is a simplified implementation
    // In practice, you would use the specific pattern characteristics to detect deviations
    
    return anomalies
  }
}