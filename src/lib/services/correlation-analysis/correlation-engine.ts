/**
 * Core correlation analysis engine for identifying key influencers
 */

import {
  CorrelationResult,
  InfluencingFactor,
  CorrelationMatrix,
  StatisticalTest,
  TimeSeriesData,
  ExternalFactor,
  CorrelationAnalysisRequest,
  CorrelationAnalysisResult,
  AnalysisSummary
} from './types'

export class CorrelationEngine {
  /**
   * Perform comprehensive correlation analysis
   */
  async analyzeCorrelations(
    transcriptData: TimeSeriesData,
    externalFactors: ExternalFactor[],
    request: CorrelationAnalysisRequest
  ): Promise<CorrelationAnalysisResult> {
    try {
      // Prepare data for analysis
      const alignedData = this.alignDataByTime(transcriptData, externalFactors, request)
      
      // Calculate correlations with different methods
      const correlations = await this.calculateCorrelations(
        alignedData.transcriptValues,
        alignedData.factorValues,
        alignedData.factorNames,
        request
      )
      
      // Build correlation matrix
      const correlationMatrix = this.buildCorrelationMatrix(
        alignedData.factorValues,
        alignedData.factorNames
      )
      
      // Identify key influencing factors
      const influencingFactors = this.identifyKeyInfluencers(
        correlations,
        request.significanceLevel
      )
      
      // Generate summary
      const summary = this.generateAnalysisSummary(correlations, influencingFactors)
      
      return {
        correlations,
        influencingFactors,
        correlationMatrix,
        featureImportance: [], // Will be populated by feature importance analysis
        summary
      }
    } catch (error) {
      console.error('Error in correlation analysis:', error)
      throw new Error(`Correlation analysis failed: ${error.message}`)
    }
  }

  /**
   * Calculate correlations between transcript volumes and external factors
   */
  private async calculateCorrelations(
    transcriptValues: number[],
    factorValues: number[][],
    factorNames: string[],
    request: CorrelationAnalysisRequest
  ): Promise<CorrelationResult[]> {
    const correlations: CorrelationResult[] = []
    
    for (let i = 0; i < factorNames.length; i++) {
      const factorData = factorValues[i]
      
      // Calculate correlation with different time delays
      for (let delay = 0; delay <= request.maxTimeDelay; delay++) {
        const delayedTranscriptValues = transcriptValues.slice(delay)
        const alignedFactorValues = factorData.slice(0, factorData.length - delay)
        
        if (delayedTranscriptValues.length < 10) continue // Need minimum data points
        
        // Pearson correlation
        const pearsonResult = this.calculatePearsonCorrelation(
          delayedTranscriptValues,
          alignedFactorValues
        )
        
        // Spearman correlation (rank-based)
        const spearmanResult = this.calculateSpearmanCorrelation(
          delayedTranscriptValues,
          alignedFactorValues
        )
        
        // Statistical significance test
        const significanceTest = this.performSignificanceTest(
          pearsonResult.correlation,
          delayedTranscriptValues.length,
          request.significanceLevel
        )
        
        if (Math.abs(pearsonResult.correlation) > 0.1) { // Only include meaningful correlations
          correlations.push({
            factor: factorNames[i],
            correlation: pearsonResult.correlation,
            pValue: significanceTest.pValue,
            significance: this.categorizeSignificance(significanceTest.pValue, request.significanceLevel),
            direction: pearsonResult.correlation > 0 ? 'positive' : 'negative',
            timeDelay: delay,
            confidence: 1 - significanceTest.pValue,
            explanation: this.generateCorrelationExplanation(
              factorNames[i],
              pearsonResult.correlation,
              delay,
              significanceTest.isSignificant
            )
          })
        }
      }
    }
    
    // Sort by absolute correlation strength
    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): { correlation: number } {
    const n = Math.min(x.length, y.length)
    if (n < 2) return { correlation: 0 }
    
    const meanX = x.slice(0, n).reduce((sum, val) => sum + val, 0) / n
    const meanY = y.slice(0, n).reduce((sum, val) => sum + val, 0) / n
    
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
    
    return {
      correlation: denominator === 0 ? 0 : numerator / denominator
    }
  }

  /**
   * Calculate Spearman rank correlation coefficient
   */
  private calculateSpearmanCorrelation(x: number[], y: number[]): { correlation: number } {
    const n = Math.min(x.length, y.length)
    if (n < 2) return { correlation: 0 }
    
    // Convert to ranks
    const xRanks = this.convertToRanks(x.slice(0, n))
    const yRanks = this.convertToRanks(y.slice(0, n))
    
    // Calculate Pearson correlation on ranks
    return this.calculatePearsonCorrelation(xRanks, yRanks)
  }

  /**
   * Convert values to ranks
   */
  private convertToRanks(values: number[]): number[] {
    const indexed = values.map((value, index) => ({ value, index }))
    indexed.sort((a, b) => a.value - b.value)
    
    const ranks = new Array(values.length)
    for (let i = 0; i < indexed.length; i++) {
      ranks[indexed[i].index] = i + 1
    }
    
    return ranks
  }

  /**
   * Perform statistical significance test
   */
  private performSignificanceTest(
    correlation: number,
    sampleSize: number,
    significanceLevel: number
  ): StatisticalTest {
    // Calculate t-statistic for correlation
    const tStatistic = correlation * Math.sqrt((sampleSize - 2) / (1 - correlation * correlation))
    
    // Calculate p-value (simplified approximation)
    const pValue = this.calculatePValue(Math.abs(tStatistic), sampleSize - 2)
    
    return {
      testType: 'pearson',
      statistic: tStatistic,
      pValue,
      isSignificant: pValue < significanceLevel,
      confidenceLevel: 1 - significanceLevel
    }
  }

  /**
   * Calculate p-value (simplified approximation using t-distribution)
   */
  private calculatePValue(tStat: number, degreesOfFreedom: number): number {
    // Simplified p-value calculation
    // In production, use a proper statistical library
    if (tStat < 1) return 0.5
    if (tStat < 2) return 0.1
    if (tStat < 3) return 0.01
    return 0.001
  }

  /**
   * Categorize statistical significance
   */
  private categorizeSignificance(pValue: number, alpha: number): 'high' | 'medium' | 'low' | 'none' {
    if (pValue < alpha / 10) return 'high'
    if (pValue < alpha / 2) return 'medium'
    if (pValue < alpha) return 'low'
    return 'none'
  }

  /**
   * Build correlation matrix for all factors
   */
  private buildCorrelationMatrix(
    factorValues: number[][],
    factorNames: string[]
  ): CorrelationMatrix {
    const n = factorNames.length
    const correlations: number[][] = []
    const pValues: number[][] = []
    const significanceMatrix: boolean[][] = []
    
    for (let i = 0; i < n; i++) {
      correlations[i] = []
      pValues[i] = []
      significanceMatrix[i] = []
      
      for (let j = 0; j < n; j++) {
        if (i === j) {
          correlations[i][j] = 1.0
          pValues[i][j] = 0.0
          significanceMatrix[i][j] = true
        } else {
          const result = this.calculatePearsonCorrelation(factorValues[i], factorValues[j])
          const test = this.performSignificanceTest(result.correlation, factorValues[i].length, 0.05)
          
          correlations[i][j] = result.correlation
          pValues[i][j] = test.pValue
          significanceMatrix[i][j] = test.isSignificant
        }
      }
    }
    
    return {
      factors: factorNames,
      correlations,
      pValues,
      significanceMatrix
    }
  }

  /**
   * Identify key influencing factors
   */
  private identifyKeyInfluencers(
    correlations: CorrelationResult[],
    significanceLevel: number
  ): InfluencingFactor[] {
    const factorMap = new Map<string, CorrelationResult[]>()
    
    // Group correlations by factor
    correlations.forEach(corr => {
      if (!factorMap.has(corr.factor)) {
        factorMap.set(corr.factor, [])
      }
      factorMap.get(corr.factor)!.push(corr)
    })
    
    const influencers: InfluencingFactor[] = []
    
    factorMap.forEach((factorCorrelations, factorName) => {
      // Find the strongest correlation for this factor
      const strongest = factorCorrelations.reduce((max, curr) => 
        Math.abs(curr.correlation) > Math.abs(max.correlation) ? curr : max
      )
      
      if (strongest.pValue < significanceLevel) {
        influencers.push({
          name: factorName,
          correlation: strongest.correlation,
          significance: strongest.pValue,
          direction: strongest.direction,
          timeDelay: strongest.timeDelay,
          confidence: strongest.confidence,
          explanation: strongest.explanation,
          importance: Math.abs(strongest.correlation) * (1 - strongest.pValue),
          statisticalTests: [{
            testType: 'pearson',
            statistic: strongest.correlation,
            pValue: strongest.pValue,
            isSignificant: strongest.pValue < significanceLevel,
            confidenceLevel: 1 - significanceLevel
          }]
        })
      }
    })
    
    // Sort by importance (combination of correlation strength and significance)
    return influencers.sort((a, b) => b.importance - a.importance)
  }

  /**
   * Generate correlation explanation
   */
  private generateCorrelationExplanation(
    factor: string,
    correlation: number,
    delay: number,
    isSignificant: boolean
  ): string {
    const strength = Math.abs(correlation) > 0.7 ? 'strong' : 
                   Math.abs(correlation) > 0.4 ? 'moderate' : 'weak'
    const direction = correlation > 0 ? 'positive' : 'negative'
    const delayText = delay > 0 ? ` with a ${delay}-day delay` : ''
    const significanceText = isSignificant ? 'statistically significant' : 'not statistically significant'
    
    return `${factor} shows a ${strength} ${direction} correlation (${correlation.toFixed(3)}) with transcript volumes${delayText}. This relationship is ${significanceText}.`
  }

  /**
   * Generate analysis summary
   */
  private generateAnalysisSummary(
    correlations: CorrelationResult[],
    influencers: InfluencingFactor[]
  ): AnalysisSummary {
    const significantFactors = correlations.filter(c => c.significance !== 'none').length
    const averageCorrelation = correlations.length > 0 ? 
      correlations.reduce((sum, c) => sum + Math.abs(c.correlation), 0) / correlations.length : 0
    
    const strongestInfluencer = influencers.length > 0 ? influencers[0].name : 'None identified'
    
    const recommendations = this.generateRecommendations(influencers)
    
    return {
      totalFactorsAnalyzed: new Set(correlations.map(c => c.factor)).size,
      significantFactors,
      strongestInfluencer,
      averageCorrelation,
      explainedVariance: this.calculateExplainedVariance(influencers),
      recommendations
    }
  }

  /**
   * Calculate explained variance from influencing factors
   */
  private calculateExplainedVariance(influencers: InfluencingFactor[]): number {
    // Simplified calculation - in practice, would use multiple regression
    const topInfluencers = influencers.slice(0, 3) // Top 3 factors
    return topInfluencers.reduce((sum, factor) => sum + (factor.correlation * factor.correlation), 0)
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(influencers: InfluencingFactor[]): string[] {
    const recommendations: string[] = []
    
    if (influencers.length === 0) {
      recommendations.push('No significant influencing factors identified. Consider expanding the analysis timeframe or including additional external factors.')
      return recommendations
    }
    
    const topInfluencer = influencers[0]
    
    if (topInfluencer.direction === 'positive') {
      recommendations.push(`Monitor ${topInfluencer.name} closely as increases correlate with higher transcript volumes.`)
    } else {
      recommendations.push(`Consider the inverse relationship with ${topInfluencer.name} when planning capacity.`)
    }
    
    if (topInfluencer.timeDelay > 0) {
      recommendations.push(`Plan for transcript volume changes ${topInfluencer.timeDelay} days after changes in ${topInfluencer.name}.`)
    }
    
    const seasonalFactors = influencers.filter(f => f.name.includes('seasonal') || f.name.includes('holiday'))
    if (seasonalFactors.length > 0) {
      recommendations.push('Implement seasonal capacity planning based on identified patterns.')
    }
    
    return recommendations
  }

  /**
   * Align transcript data with external factors by timestamp
   */
  private alignDataByTime(
    transcriptData: TimeSeriesData,
    externalFactors: ExternalFactor[],
    request: CorrelationAnalysisRequest
  ): {
    transcriptValues: number[]
    factorValues: number[][]
    factorNames: string[]
  } {
    // Filter data by date range
    const startTime = request.startDate.getTime()
    const endTime = request.endDate.getTime()
    
    const filteredTranscriptData = transcriptData.timestamps
      .map((timestamp, index) => ({ timestamp, value: transcriptData.values[index] }))
      .filter(item => {
        const time = item.timestamp.getTime()
        return time >= startTime && time <= endTime
      })
    
    // Group external factors by type
    const factorGroups = new Map<string, ExternalFactor[]>()
    externalFactors.forEach(factor => {
      const time = factor.date.getTime()
      if (time >= startTime && time <= endTime) {
        if (!factorGroups.has(factor.name)) {
          factorGroups.set(factor.name, [])
        }
        factorGroups.get(factor.name)!.push(factor)
      }
    })
    
    // Align data by creating daily aggregates
    const dailyData = new Map<string, { transcript: number, factors: Map<string, number> }>()
    
    // Process transcript data
    filteredTranscriptData.forEach(item => {
      const dateKey = item.timestamp.toISOString().split('T')[0]
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { transcript: 0, factors: new Map() })
      }
      dailyData.get(dateKey)!.transcript += item.value
    })
    
    // Process external factors
    factorGroups.forEach((factors, factorName) => {
      factors.forEach(factor => {
        const dateKey = factor.date.toISOString().split('T')[0]
        if (dailyData.has(dateKey)) {
          dailyData.get(dateKey)!.factors.set(factorName, factor.value)
        }
      })
    })
    
    // Convert to arrays
    const sortedDates = Array.from(dailyData.keys()).sort()
    const transcriptValues: number[] = []
    const factorNames = Array.from(factorGroups.keys())
    const factorValues: number[][] = factorNames.map(() => [])
    
    sortedDates.forEach(date => {
      const dayData = dailyData.get(date)!
      transcriptValues.push(dayData.transcript)
      
      factorNames.forEach((factorName, index) => {
        const value = dayData.factors.get(factorName) || 0
        factorValues[index].push(value)
      })
    })
    
    return {
      transcriptValues,
      factorValues,
      factorNames
    }
  }
}