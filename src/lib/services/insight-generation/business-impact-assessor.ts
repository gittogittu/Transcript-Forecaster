import { 
  BusinessInsight, 
  BusinessImpactAssessment, 
  QuantifiedImpact 
} from './types'

export class BusinessImpactAssessor {
  async assessImpact(insight: BusinessInsight): Promise<BusinessImpactAssessment> {
    try {
      const impactScore = await this.calculateImpactScore(insight)
      const category = this.determineImpactCategory(insight)
      const quantifiedImpact = await this.quantifyImpact(insight)
      const timeToImpact = this.estimateTimeToImpact(insight)
      const certainty = this.calculateCertainty(insight)
      const dependencies = this.identifyDependencies(insight)

      return {
        impactScore,
        category,
        quantifiedImpact,
        timeToImpact,
        certainty,
        dependencies
      }
    } catch (error) {
      console.error('Error assessing business impact:', error)
      throw new Error(`Business impact assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async calculateImpactScore(insight: BusinessInsight): Promise<number> {
    let baseScore = 0

    // Base score from insight confidence and current impact level
    const confidenceWeight = insight.confidence * 40 // Max 40 points from confidence
    
    const impactWeights = {
      'low': 10,
      'medium': 25,
      'high': 35,
      'critical': 50
    }
    const impactWeight = impactWeights[insight.impact] || 20

    baseScore = confidenceWeight + impactWeight

    // Adjust based on insight type
    const typeMultipliers = {
      'trend': 1.2,      // Trends have high business impact
      'forecast': 1.3,   // Forecasts are very valuable for planning
      'anomaly': 1.4,    // Anomalies require immediate attention
      'seasonal': 1.1,   // Seasonal patterns help with planning
      'correlation': 1.0, // Correlations provide understanding
      'pattern': 0.9     // General patterns are moderately valuable
    }

    const typeMultiplier = typeMultipliers[insight.type] || 1.0
    baseScore *= typeMultiplier

    // Adjust based on supporting data quality
    if (insight.supportingData) {
      const metricsCount = Object.keys(insight.supportingData.metrics || {}).length
      const correlationsCount = insight.supportingData.correlations?.length || 0
      const testsCount = insight.supportingData.statisticalTests?.length || 0
      
      const dataQualityBonus = Math.min((metricsCount + correlationsCount + testsCount) * 2, 15)
      baseScore += dataQualityBonus
    }

    // Adjust based on timeframe relevance
    const timeframeDays = this.calculateTimeframeDays(insight.timeframe)
    if (timeframeDays <= 30) {
      baseScore *= 1.2 // Recent data is more valuable
    } else if (timeframeDays <= 90) {
      baseScore *= 1.1
    } else if (timeframeDays > 365) {
      baseScore *= 0.9 // Very old data is less valuable
    }

    return Math.min(Math.max(baseScore, 0), 100)
  }

  private determineImpactCategory(insight: BusinessInsight): 'revenue' | 'cost' | 'efficiency' | 'risk' | 'quality' {
    const description = insight.description.toLowerCase()
    const title = insight.title.toLowerCase()
    const text = `${title} ${description}`

    // Revenue indicators
    if (text.includes('revenue') || text.includes('sales') || text.includes('growth') || 
        text.includes('volume increase') || text.includes('demand')) {
      return 'revenue'
    }

    // Cost indicators
    if (text.includes('cost') || text.includes('expense') || text.includes('budget') || 
        text.includes('resource') || text.includes('optimization')) {
      return 'cost'
    }

    // Risk indicators
    if (text.includes('risk') || text.includes('anomaly') || text.includes('unusual') || 
        text.includes('deviation') || text.includes('alert') || insight.type === 'anomaly') {
      return 'risk'
    }

    // Efficiency indicators
    if (text.includes('efficiency') || text.includes('performance') || text.includes('productivity') || 
        text.includes('utilization') || text.includes('throughput')) {
      return 'efficiency'
    }

    // Quality indicators
    if (text.includes('quality') || text.includes('accuracy') || text.includes('reliability') || 
        text.includes('consistency')) {
      return 'quality'
    }

    // Default based on insight type
    const typeDefaults = {
      'trend': 'revenue',
      'forecast': 'efficiency',
      'anomaly': 'risk',
      'seasonal': 'efficiency',
      'correlation': 'efficiency',
      'pattern': 'efficiency'
    }

    return typeDefaults[insight.type] || 'efficiency'
  }

  private async quantifyImpact(insight: BusinessInsight): Promise<QuantifiedImpact> {
    const category = this.determineImpactCategory(insight)
    
    // Extract quantitative data from supporting metrics
    const metrics = insight.supportingData?.metrics || {}
    const baseValue = this.extractBaseValue(metrics, category)
    
    // Calculate projected impact based on insight type and confidence
    const impactMultiplier = this.calculateImpactMultiplier(insight)
    const projectedValue = baseValue * (1 + impactMultiplier)
    const changePercent = impactMultiplier * 100

    // Estimate monetary value if possible
    const monetaryValue = this.estimateMonetaryValue(baseValue, changePercent, category)

    return {
      metric: this.getMetricName(category),
      currentValue: baseValue,
      projectedValue,
      changePercent,
      monetaryValue: monetaryValue.value,
      currency: monetaryValue.currency
    }
  }

  private extractBaseValue(metrics: Record<string, number>, category: string): number {
    // Try to find relevant metrics based on category
    const categoryMetrics = {
      'revenue': ['revenue', 'sales', 'income', 'volume'],
      'cost': ['cost', 'expense', 'budget', 'spending'],
      'efficiency': ['efficiency', 'utilization', 'throughput', 'performance'],
      'risk': ['risk_score', 'deviation', 'volatility'],
      'quality': ['quality', 'accuracy', 'reliability']
    }

    const relevantKeys = categoryMetrics[category] || []
    
    for (const key of relevantKeys) {
      const foundKey = Object.keys(metrics).find(k => k.toLowerCase().includes(key))
      if (foundKey && typeof metrics[foundKey] === 'number') {
        return metrics[foundKey]
      }
    }

    // Fallback to any numeric metric
    const numericValues = Object.values(metrics).filter(v => typeof v === 'number')
    if (numericValues.length > 0) {
      return numericValues[0]
    }

    // Default baseline values by category
    const defaults = {
      'revenue': 100000,
      'cost': 50000,
      'efficiency': 75,
      'risk': 20,
      'quality': 85
    }

    return defaults[category] || 1000
  }

  private calculateImpactMultiplier(insight: BusinessInsight): number {
    let multiplier = 0

    // Base multiplier from confidence
    multiplier = insight.confidence * 0.2 // Max 20% from confidence

    // Adjust based on insight type
    const typeImpacts = {
      'trend': 0.15,     // Trends can have significant impact
      'forecast': 0.12,  // Forecasts help with planning
      'anomaly': 0.25,   // Anomalies can have major impact
      'seasonal': 0.10,  // Seasonal patterns have moderate impact
      'correlation': 0.08, // Correlations provide insights
      'pattern': 0.06    // General patterns have smaller impact
    }

    const typeImpact = typeImpacts[insight.type] || 0.1
    multiplier += typeImpact

    // Adjust based on impact level
    const impactAdjustments = {
      'low': 0.5,
      'medium': 1.0,
      'high': 1.5,
      'critical': 2.0
    }

    multiplier *= impactAdjustments[insight.impact] || 1.0

    // Cap the multiplier
    return Math.min(Math.max(multiplier, -0.5), 0.5) // -50% to +50%
  }

  private estimateMonetaryValue(baseValue: number, changePercent: number, category: string): { value?: number; currency?: string } {
    // Only estimate monetary value for revenue and cost categories
    if (category !== 'revenue' && category !== 'cost') {
      return {}
    }

    // Assume the base value is already in monetary terms for revenue/cost
    const monetaryImpact = baseValue * (changePercent / 100)
    
    return {
      value: Math.round(monetaryImpact),
      currency: 'USD'
    }
  }

  private getMetricName(category: string): string {
    const metricNames = {
      'revenue': 'Revenue Impact',
      'cost': 'Cost Impact',
      'efficiency': 'Efficiency Score',
      'risk': 'Risk Level',
      'quality': 'Quality Score'
    }

    return metricNames[category] || 'Business Metric'
  }

  private estimateTimeToImpact(insight: BusinessInsight): string {
    // Estimate based on insight type and impact level
    const typeTimeframes = {
      'anomaly': 'Immediate',
      'trend': '2-4 weeks',
      'forecast': '1-3 months',
      'seasonal': '1-6 months',
      'correlation': '2-8 weeks',
      'pattern': '4-12 weeks'
    }

    let baseTimeframe = typeTimeframes[insight.type] || '2-6 weeks'

    // Adjust based on impact level
    if (insight.impact === 'critical') {
      baseTimeframe = 'Immediate to 1 week'
    } else if (insight.impact === 'high') {
      baseTimeframe = '1-2 weeks'
    }

    return baseTimeframe
  }

  private calculateCertainty(insight: BusinessInsight): number {
    let certainty = insight.confidence

    // Adjust based on supporting data
    if (insight.supportingData) {
      const hasMetrics = Object.keys(insight.supportingData.metrics || {}).length > 0
      const hasCorrelations = (insight.supportingData.correlations?.length || 0) > 0
      const hasTests = (insight.supportingData.statisticalTests?.length || 0) > 0
      
      let dataBonus = 0
      if (hasMetrics) dataBonus += 0.1
      if (hasCorrelations) dataBonus += 0.1
      if (hasTests) dataBonus += 0.1
      
      certainty = Math.min(certainty + dataBonus, 1.0)
    }

    // Adjust based on insight type (some types are inherently more certain)
    const typeCertaintyAdjustments = {
      'trend': 1.0,
      'seasonal': 1.1,
      'pattern': 0.9,
      'correlation': 0.8,
      'forecast': 0.7,
      'anomaly': 0.9
    }

    const adjustment = typeCertaintyAdjustments[insight.type] || 1.0
    certainty *= adjustment

    return Math.min(Math.max(certainty, 0), 1)
  }

  private identifyDependencies(insight: BusinessInsight): string[] {
    const dependencies: string[] = []

    // Common dependencies based on insight type
    const typeDependencies = {
      'trend': ['Data quality', 'Market conditions', 'Seasonal factors'],
      'forecast': ['Historical data accuracy', 'External factors', 'Model assumptions'],
      'anomaly': ['Data validation', 'System stability', 'External events'],
      'seasonal': ['Historical patterns', 'Business calendar', 'Market cycles'],
      'correlation': ['Data completeness', 'Causal relationships', 'External variables'],
      'pattern': ['Data consistency', 'Pattern stability', 'Environmental factors']
    }

    dependencies.push(...(typeDependencies[insight.type] || []))

    // Add dependencies based on impact category
    const category = this.determineImpactCategory(insight)
    const categoryDependencies = {
      'revenue': ['Market demand', 'Competitive landscape', 'Economic conditions'],
      'cost': ['Resource availability', 'Operational efficiency', 'Vendor relationships'],
      'efficiency': ['Process optimization', 'Technology infrastructure', 'Staff training'],
      'risk': ['Risk management policies', 'Monitoring systems', 'Response procedures'],
      'quality': ['Quality standards', 'Process controls', 'Customer requirements']
    }

    dependencies.push(...(categoryDependencies[category] || []))

    // Remove duplicates and limit to most important
    return [...new Set(dependencies)].slice(0, 5)
  }

  private calculateTimeframeDays(timeframe: { startDate: Date; endDate: Date }): number {
    return (timeframe.endDate.getTime() - timeframe.startDate.getTime()) / (1000 * 60 * 60 * 24)
  }
}