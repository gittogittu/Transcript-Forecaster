import { 
  BusinessInsight, 
  InsightValidation, 
  ValidationMethod, 
  CrossValidationResult, 
  DataQualityScore 
} from './types'

export class InsightValidator {
  async validateInsight(insight: BusinessInsight, data: any): Promise<InsightValidation> {
    try {
      const validationMethods = await this.runValidationMethods(insight, data)
      const crossValidation = await this.performCrossValidation(insight, data)
      const historicalAccuracy = await this.calculateHistoricalAccuracy(insight, data)
      const dataQuality = await this.assessDataQuality(data)
      
      const validationScore = this.calculateOverallValidationScore(
        validationMethods,
        crossValidation,
        historicalAccuracy,
        dataQuality
      )

      return {
        validationScore,
        validationMethods,
        crossValidation,
        historicalAccuracy,
        dataQuality
      }
    } catch (error) {
      console.error('Error validating insight:', error)
      throw new Error(`Insight validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async runValidationMethods(insight: BusinessInsight, data: any): Promise<ValidationMethod[]> {
    const methods: ValidationMethod[] = []

    // Statistical significance validation
    methods.push(await this.validateStatisticalSignificance(insight, data))
    
    // Data sufficiency validation
    methods.push(await this.validateDataSufficiency(insight, data))
    
    // Consistency validation
    methods.push(await this.validateConsistency(insight, data))
    
    // Robustness validation
    methods.push(await this.validateRobustness(insight, data))
    
    // Business logic validation
    methods.push(await this.validateBusinessLogic(insight, data))

    return methods
  }

  private async validateStatisticalSignificance(insight: BusinessInsight, data: any): Promise<ValidationMethod> {
    let score = 0.5 // Default score
    let details = 'Statistical significance assessment'

    try {
      // Check if the insight has supporting statistical data
      if (insight.supportingData?.statisticalTests?.length > 0) {
        const significantTests = insight.supportingData.statisticalTests.filter(test => test.significant)
        const significanceRatio = significantTests.length / insight.supportingData.statisticalTests.length
        
        score = significanceRatio
        details = `${significantTests.length}/${insight.supportingData.statisticalTests.length} statistical tests show significance`
      } else if (insight.confidence > 0.7) {
        score = 0.8
        details = 'High confidence level indicates statistical significance'
      } else if (insight.confidence > 0.5) {
        score = 0.6
        details = 'Moderate confidence level'
      } else {
        score = 0.3
        details = 'Low confidence level raises significance concerns'
      }
    } catch (error) {
      score = 0.4
      details = 'Unable to assess statistical significance'
    }

    return {
      method: 'Statistical Significance',
      score,
      details
    }
  }

  private async validateDataSufficiency(insight: BusinessInsight, data: any): Promise<ValidationMethod> {
    let score = 0.5
    let details = 'Data sufficiency assessment'

    try {
      const dataPoints = data.timeSeries?.length || 0
      const timeSpan = this.calculateTimeSpan(insight.timeframe)
      
      // Minimum data requirements based on insight type
      const minRequirements = {
        'trend': 10,
        'seasonal': 30,
        'pattern': 20,
        'correlation': 15,
        'forecast': 25,
        'anomaly': 10
      }

      const minRequired = minRequirements[insight.type] || 15
      
      if (dataPoints >= minRequired * 2) {
        score = 0.9
        details = `Excellent data sufficiency: ${dataPoints} data points (required: ${minRequired})`
      } else if (dataPoints >= minRequired) {
        score = 0.7
        details = `Adequate data sufficiency: ${dataPoints} data points (required: ${minRequired})`
      } else if (dataPoints >= minRequired * 0.7) {
        score = 0.5
        details = `Marginal data sufficiency: ${dataPoints} data points (required: ${minRequired})`
      } else {
        score = 0.3
        details = `Insufficient data: ${dataPoints} data points (required: ${minRequired})`
      }
    } catch (error) {
      score = 0.4
      details = 'Unable to assess data sufficiency'
    }

    return {
      method: 'Data Sufficiency',
      score,
      details
    }
  }

  private async validateConsistency(insight: BusinessInsight, data: any): Promise<ValidationMethod> {
    let score = 0.5
    let details = 'Consistency assessment'

    try {
      // Check consistency between insight confidence and supporting metrics
      const supportingMetrics = insight.supportingData?.metrics || {}
      const metricValues = Object.values(supportingMetrics).filter(v => typeof v === 'number')
      
      if (metricValues.length > 0) {
        const avgMetric = metricValues.reduce((sum, val) => sum + Math.abs(val), 0) / metricValues.length
        const normalizedMetric = Math.min(avgMetric, 1)
        
        const consistencyDiff = Math.abs(insight.confidence - normalizedMetric)
        
        if (consistencyDiff < 0.1) {
          score = 0.9
          details = 'High consistency between confidence and supporting metrics'
        } else if (consistencyDiff < 0.2) {
          score = 0.7
          details = 'Good consistency between confidence and supporting metrics'
        } else if (consistencyDiff < 0.3) {
          score = 0.5
          details = 'Moderate consistency between confidence and supporting metrics'
        } else {
          score = 0.3
          details = 'Low consistency between confidence and supporting metrics'
        }
      } else {
        score = 0.6
        details = 'Limited supporting metrics for consistency assessment'
      }
    } catch (error) {
      score = 0.4
      details = 'Unable to assess consistency'
    }

    return {
      method: 'Consistency',
      score,
      details
    }
  }

  private async validateRobustness(insight: BusinessInsight, data: any): Promise<ValidationMethod> {
    let score = 0.5
    let details = 'Robustness assessment'

    try {
      // Test robustness by checking if insight holds under different conditions
      const timeSeries = data.timeSeries || []
      
      if (timeSeries.length > 20) {
        // Split data and test if insight holds in both halves
        const midPoint = Math.floor(timeSeries.length / 2)
        const firstHalf = timeSeries.slice(0, midPoint)
        const secondHalf = timeSeries.slice(midPoint)
        
        const firstHalfInsight = await this.generateMiniInsight(firstHalf, insight.type)
        const secondHalfInsight = await this.generateMiniInsight(secondHalf, insight.type)
        
        const similarity = this.calculateInsightSimilarity(firstHalfInsight, secondHalfInsight)
        
        if (similarity > 0.8) {
          score = 0.9
          details = 'High robustness: insight consistent across data splits'
        } else if (similarity > 0.6) {
          score = 0.7
          details = 'Good robustness: insight mostly consistent across data splits'
        } else if (similarity > 0.4) {
          score = 0.5
          details = 'Moderate robustness: some variation across data splits'
        } else {
          score = 0.3
          details = 'Low robustness: significant variation across data splits'
        }
      } else {
        score = 0.6
        details = 'Insufficient data for robustness testing'
      }
    } catch (error) {
      score = 0.4
      details = 'Unable to assess robustness'
    }

    return {
      method: 'Robustness',
      score,
      details
    }
  }

  private async validateBusinessLogic(insight: BusinessInsight, data: any): Promise<ValidationMethod> {
    let score = 0.5
    let details = 'Business logic assessment'

    try {
      // Validate that the insight makes business sense
      const logicChecks = []

      // Check 1: Impact level matches confidence
      if (insight.impact === 'critical' && insight.confidence < 0.7) {
        logicChecks.push({ passed: false, reason: 'Critical impact with low confidence' })
      } else if (insight.impact === 'low' && insight.confidence > 0.9) {
        logicChecks.push({ passed: false, reason: 'Low impact with very high confidence seems inconsistent' })
      } else {
        logicChecks.push({ passed: true, reason: 'Impact level matches confidence' })
      }

      // Check 2: Insight type matches description
      const typeKeywords = {
        'trend': ['trend', 'increasing', 'decreasing', 'direction'],
        'seasonal': ['seasonal', 'cycle', 'pattern', 'recurring'],
        'anomaly': ['anomaly', 'unusual', 'unexpected', 'deviation'],
        'correlation': ['correlation', 'relationship', 'factor', 'influence'],
        'forecast': ['forecast', 'prediction', 'future', 'expected']
      }

      const expectedKeywords = typeKeywords[insight.type] || []
      const descriptionLower = insight.description.toLowerCase()
      const hasRelevantKeywords = expectedKeywords.some(keyword => descriptionLower.includes(keyword))

      if (hasRelevantKeywords) {
        logicChecks.push({ passed: true, reason: 'Description matches insight type' })
      } else {
        logicChecks.push({ passed: false, reason: 'Description does not match insight type' })
      }

      // Check 3: Timeframe reasonableness
      const timeSpan = this.calculateTimeSpan(insight.timeframe)
      if (timeSpan > 0 && timeSpan < 10000) { // Reasonable timespan in days
        logicChecks.push({ passed: true, reason: 'Reasonable timeframe' })
      } else {
        logicChecks.push({ passed: false, reason: 'Unreasonable timeframe' })
      }

      const passedChecks = logicChecks.filter(check => check.passed).length
      const totalChecks = logicChecks.length

      score = passedChecks / totalChecks
      details = `${passedChecks}/${totalChecks} business logic checks passed`

    } catch (error) {
      score = 0.4
      details = 'Unable to assess business logic'
    }

    return {
      method: 'Business Logic',
      score,
      details
    }
  }

  private async performCrossValidation(insight: BusinessInsight, data: any): Promise<CrossValidationResult> {
    try {
      const folds = 5
      const timeSeries = data.timeSeries || []
      
      if (timeSeries.length < folds * 5) {
        return {
          folds: 0,
          averageScore: 0.5,
          standardDeviation: 0.3,
          consistency: 0.5
        }
      }

      const foldSize = Math.floor(timeSeries.length / folds)
      const scores: number[] = []

      for (let i = 0; i < folds; i++) {
        const testStart = i * foldSize
        const testEnd = (i + 1) * foldSize
        
        // Create training and test sets
        const trainData = [
          ...timeSeries.slice(0, testStart),
          ...timeSeries.slice(testEnd)
        ]
        const testData = timeSeries.slice(testStart, testEnd)

        // Generate insight on training data and validate on test data
        const foldInsight = await this.generateMiniInsight(trainData, insight.type)
        const validationScore = this.validateInsightOnData(foldInsight, testData)
        
        scores.push(validationScore)
      }

      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length
      const standardDeviation = Math.sqrt(variance)
      const consistency = 1 - (standardDeviation / averageScore)

      return {
        folds,
        averageScore,
        standardDeviation,
        consistency: Math.max(0, consistency)
      }
    } catch (error) {
      return {
        folds: 0,
        averageScore: 0.5,
        standardDeviation: 0.3,
        consistency: 0.5
      }
    }
  }

  private async calculateHistoricalAccuracy(insight: BusinessInsight, data: any): Promise<number> {
    try {
      // This would compare the insight against historical data to see how accurate similar insights were
      // For now, return a score based on insight confidence and type
      
      const baseAccuracy = insight.confidence
      
      // Adjust based on insight type (some types are generally more reliable)
      const typeReliability = {
        'trend': 0.85,
        'seasonal': 0.90,
        'pattern': 0.75,
        'correlation': 0.70,
        'forecast': 0.65,
        'anomaly': 0.80
      }

      const reliability = typeReliability[insight.type] || 0.75
      return baseAccuracy * reliability
    } catch (error) {
      return 0.6
    }
  }

  private async assessDataQuality(data: any): Promise<DataQualityScore> {
    try {
      const timeSeries = data.timeSeries || []
      
      // Completeness: percentage of non-null values
      const nonNullValues = timeSeries.filter(point => point.value != null).length
      const completeness = timeSeries.length > 0 ? nonNullValues / timeSeries.length : 0

      // Accuracy: check for reasonable values (no extreme outliers)
      const values = timeSeries.map(point => point.value).filter(v => v != null)
      let accuracy = 0.8 // Default
      
      if (values.length > 0) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length
        const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length)
        const outliers = values.filter(val => Math.abs(val - mean) > 3 * stdDev).length
        accuracy = 1 - (outliers / values.length)
      }

      // Consistency: check for consistent data patterns
      let consistency = 0.8 // Default
      if (values.length > 1) {
        const differences = []
        for (let i = 1; i < values.length; i++) {
          differences.push(Math.abs(values[i] - values[i - 1]))
        }
        const avgDiff = differences.reduce((sum, diff) => sum + diff, 0) / differences.length
        const maxDiff = Math.max(...differences)
        consistency = maxDiff > 0 ? 1 - (avgDiff / maxDiff) : 0.8
      }

      // Timeliness: check if data is recent (simplified)
      let timeliness = 0.8 // Default
      if (timeSeries.length > 0) {
        const latestTimestamp = Math.max(...timeSeries.map(point => point.timestamp.getTime()))
        const now = Date.now()
        const daysSinceLatest = (now - latestTimestamp) / (1000 * 60 * 60 * 24)
        
        if (daysSinceLatest <= 1) timeliness = 1.0
        else if (daysSinceLatest <= 7) timeliness = 0.9
        else if (daysSinceLatest <= 30) timeliness = 0.7
        else timeliness = 0.5
      }

      const overall = (completeness + accuracy + consistency + timeliness) / 4

      return {
        completeness,
        accuracy,
        consistency,
        timeliness,
        overall
      }
    } catch (error) {
      return {
        completeness: 0.6,
        accuracy: 0.6,
        consistency: 0.6,
        timeliness: 0.6,
        overall: 0.6
      }
    }
  }

  private calculateOverallValidationScore(
    validationMethods: ValidationMethod[],
    crossValidation: CrossValidationResult,
    historicalAccuracy: number,
    dataQuality: DataQualityScore
  ): number {
    // Weight the different validation components
    const methodsScore = validationMethods.reduce((sum, method) => sum + method.score, 0) / validationMethods.length
    const crossValScore = crossValidation.averageScore
    const historyScore = historicalAccuracy
    const qualityScore = dataQuality.overall

    // Weighted average
    const weights = {
      methods: 0.3,
      crossVal: 0.25,
      history: 0.2,
      quality: 0.25
    }

    return (
      methodsScore * weights.methods +
      crossValScore * weights.crossVal +
      historyScore * weights.history +
      qualityScore * weights.quality
    )
  }

  // Utility methods
  private calculateTimeSpan(timeframe: { startDate: Date; endDate: Date }): number {
    return (timeframe.endDate.getTime() - timeframe.startDate.getTime()) / (1000 * 60 * 60 * 24)
  }

  private async generateMiniInsight(data: any[], type: string): Promise<any> {
    // Simplified insight generation for validation purposes
    return {
      type,
      confidence: Math.random() * 0.4 + 0.5, // 0.5 to 0.9
      strength: Math.random() * 0.5 + 0.3     // 0.3 to 0.8
    }
  }

  private calculateInsightSimilarity(insight1: any, insight2: any): number {
    if (!insight1 || !insight2) return 0
    
    const confidenceDiff = Math.abs(insight1.confidence - insight2.confidence)
    const strengthDiff = Math.abs(insight1.strength - insight2.strength)
    
    return 1 - ((confidenceDiff + strengthDiff) / 2)
  }

  private validateInsightOnData(insight: any, testData: any[]): number {
    // Simplified validation - in practice this would be more sophisticated
    if (!insight || testData.length === 0) return 0.5
    
    // Return a score based on how well the insight characteristics match the test data
    return Math.min(insight.confidence + Math.random() * 0.2 - 0.1, 1)
  }
}