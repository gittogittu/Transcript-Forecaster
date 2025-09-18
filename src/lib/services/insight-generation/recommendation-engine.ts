import { 
  Recommendation, 
  BusinessInsight, 
  TrendAnalysis, 
  PatternRecognition,
  BusinessImpactAssessment 
} from './types'

export class RecommendationEngine {
  async generateRecommendations(
    insights: BusinessInsight[],
    trendAnalysis: TrendAnalysis,
    patternRecognition: PatternRecognition
  ): Promise<Recommendation[]> {
    try {
      const recommendations: Recommendation[] = []

      // Generate trend-based recommendations
      recommendations.push(...this.generateTrendRecommendations(trendAnalysis, insights))
      
      // Generate pattern-based recommendations
      recommendations.push(...this.generatePatternRecommendations(patternRecognition, insights))
      
      // Generate insight-specific recommendations
      for (const insight of insights) {
        recommendations.push(...this.generateInsightRecommendations(insight))
      }
      
      // Prioritize and rank recommendations
      const prioritizedRecommendations = this.prioritizeRecommendations(recommendations)
      
      // Remove duplicates and low-value recommendations
      return this.filterRecommendations(prioritizedRecommendations)
    } catch (error) {
      console.error('Error generating recommendations:', error)
      throw new Error(`Recommendation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private generateTrendRecommendations(trendAnalysis: TrendAnalysis, insights: BusinessInsight[]): Recommendation[] {
    const recommendations: Recommendation[] = []
    
    // Increasing trend recommendations
    if (trendAnalysis.direction === 'increasing' && trendAnalysis.strength > 0.6) {
      recommendations.push({
        id: `trend-increase-capacity-${Date.now()}`,
        insightId: insights.find(i => i.type === 'trend')?.id || '',
        priority: trendAnalysis.strength > 0.8 ? 'high' : 'medium',
        category: 'operational',
        title: 'Scale Up Capacity',
        description: 'The increasing trend suggests higher demand. Consider scaling up resources to handle the expected volume increase.',
        expectedImpact: `Potential ${(trendAnalysis.changeRate * 100).toFixed(1)}% increase in volume over the forecast period`,
        implementationEffort: 'medium',
        timeframe: 'Next 2-4 weeks',
        metrics: ['capacity_utilization', 'response_time', 'resource_allocation'],
        status: 'pending',
        confidence: trendAnalysis.significance,
        businessValue: this.calculateBusinessValue(trendAnalysis.strength, 'capacity'),
        createdAt: new Date()
      })

      recommendations.push({
        id: `trend-increase-staffing-${Date.now()}`,
        insightId: insights.find(i => i.type === 'trend')?.id || '',
        priority: 'medium',
        category: 'strategic',
        title: 'Plan Staffing Increases',
        description: 'Prepare for increased staffing needs based on the upward trend in transcript volumes.',
        expectedImpact: 'Maintain service quality during volume increases',
        implementationEffort: 'high',
        timeframe: 'Next 4-8 weeks',
        metrics: ['staff_utilization', 'processing_time', 'quality_scores'],
        status: 'pending',
        confidence: trendAnalysis.significance * 0.9,
        businessValue: this.calculateBusinessValue(trendAnalysis.strength, 'staffing'),
        createdAt: new Date()
      })
    }

    // Decreasing trend recommendations
    if (trendAnalysis.direction === 'decreasing' && trendAnalysis.strength > 0.6) {
      recommendations.push({
        id: `trend-decrease-optimization-${Date.now()}`,
        insightId: insights.find(i => i.type === 'trend')?.id || '',
        priority: 'medium',
        category: 'operational',
        title: 'Optimize Resource Allocation',
        description: 'The decreasing trend indicates lower demand. Consider optimizing resource allocation to maintain efficiency.',
        expectedImpact: `Potential ${Math.abs(trendAnalysis.changeRate * 100).toFixed(1)}% decrease in volume`,
        implementationEffort: 'low',
        timeframe: 'Next 1-2 weeks',
        metrics: ['cost_efficiency', 'resource_utilization', 'operational_costs'],
        status: 'pending',
        confidence: trendAnalysis.significance,
        businessValue: this.calculateBusinessValue(trendAnalysis.strength, 'optimization'),
        createdAt: new Date()
      })

      recommendations.push({
        id: `trend-decrease-investigation-${Date.now()}`,
        insightId: insights.find(i => i.type === 'trend')?.id || '',
        priority: 'high',
        category: 'strategic',
        title: 'Investigate Volume Decline',
        description: 'Investigate the root causes of the declining trend to identify potential issues or opportunities.',
        expectedImpact: 'Identify and address factors causing volume decline',
        implementationEffort: 'medium',
        timeframe: 'Next 1-3 weeks',
        metrics: ['client_satisfaction', 'market_share', 'competitive_analysis'],
        status: 'pending',
        confidence: trendAnalysis.significance * 0.8,
        businessValue: this.calculateBusinessValue(trendAnalysis.strength, 'investigation'),
        createdAt: new Date()
      })
    }

    // Volatile trend recommendations
    if (trendAnalysis.direction === 'volatile' && trendAnalysis.strength > 0.5) {
      recommendations.push({
        id: `trend-volatile-stabilization-${Date.now()}`,
        insightId: insights.find(i => i.type === 'trend')?.id || '',
        priority: 'high',
        category: 'operational',
        title: 'Implement Stabilization Measures',
        description: 'High volatility detected. Implement measures to stabilize operations and improve predictability.',
        expectedImpact: 'Reduce operational volatility and improve planning accuracy',
        implementationEffort: 'high',
        timeframe: 'Next 2-6 weeks',
        metrics: ['volatility_index', 'prediction_accuracy', 'operational_stability'],
        status: 'pending',
        confidence: trendAnalysis.significance,
        businessValue: this.calculateBusinessValue(trendAnalysis.strength, 'stabilization'),
        createdAt: new Date()
      })
    }

    return recommendations
  }

  private generatePatternRecommendations(patternRecognition: PatternRecognition, insights: BusinessInsight[]): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Seasonal pattern recommendations
    for (const pattern of patternRecognition.patterns) {
      if (pattern.type === 'seasonal' && pattern.confidence > 0.7) {
        recommendations.push({
          id: `pattern-seasonal-${pattern.id}`,
          insightId: insights.find(i => i.type === 'seasonal')?.id || '',
          priority: 'medium',
          category: 'operational',
          title: `Optimize for ${pattern.description}`,
          description: `Adjust resource allocation based on the identified ${pattern.description.toLowerCase()} to improve efficiency.`,
          expectedImpact: 'Better resource utilization during seasonal peaks and valleys',
          implementationEffort: 'medium',
          timeframe: 'Before next seasonal cycle',
          metrics: ['seasonal_efficiency', 'resource_utilization', 'cost_per_unit'],
          status: 'pending',
          confidence: pattern.confidence,
          businessValue: this.calculateBusinessValue(pattern.strength, 'seasonal'),
          createdAt: new Date()
        })
      }

      if (pattern.type === 'recurring' && pattern.confidence > 0.6) {
        recommendations.push({
          id: `pattern-recurring-${pattern.id}`,
          insightId: insights.find(i => i.type === 'pattern')?.id || '',
          priority: 'low',
          category: 'tactical',
          title: `Leverage Recurring Pattern`,
          description: `Use the identified recurring pattern (${pattern.description}) for better forecasting and planning.`,
          expectedImpact: 'Improved forecast accuracy and operational planning',
          implementationEffort: 'low',
          timeframe: 'Next 2-4 weeks',
          metrics: ['forecast_accuracy', 'planning_efficiency'],
          status: 'pending',
          confidence: pattern.confidence,
          businessValue: this.calculateBusinessValue(pattern.strength, 'forecasting'),
          createdAt: new Date()
        })
      }
    }

    // Anomaly-based recommendations
    if (patternRecognition.anomalies.length > 0) {
      const highSeverityAnomalies = patternRecognition.anomalies.filter(a => a.severity === 'high')
      
      if (highSeverityAnomalies.length > 0) {
        recommendations.push({
          id: `anomaly-investigation-${Date.now()}`,
          insightId: insights.find(i => i.type === 'anomaly')?.id || '',
          priority: 'critical',
          category: 'operational',
          title: 'Investigate Pattern Anomalies',
          description: `${highSeverityAnomalies.length} high-severity pattern anomalies detected. Immediate investigation recommended.`,
          expectedImpact: 'Prevent potential operational issues and maintain service quality',
          implementationEffort: 'medium',
          timeframe: 'Within 24-48 hours',
          metrics: ['anomaly_resolution_time', 'service_quality', 'operational_stability'],
          status: 'pending',
          confidence: 0.9,
          businessValue: this.calculateBusinessValue(0.8, 'anomaly_response'),
          createdAt: new Date()
        })
      }
    }

    return recommendations
  }

  private generateInsightRecommendations(insight: BusinessInsight): Recommendation[] {
    const recommendations: Recommendation[] = []

    switch (insight.type) {
      case 'correlation':
        recommendations.push({
          id: `correlation-leverage-${insight.id}`,
          insightId: insight.id,
          priority: insight.impact === 'high' ? 'high' : 'medium',
          category: 'strategic',
          title: 'Leverage Correlation Insights',
          description: `Use the identified correlations to improve business decisions and optimize operations.`,
          expectedImpact: 'Better understanding of business drivers and improved decision making',
          implementationEffort: 'medium',
          timeframe: 'Next 2-4 weeks',
          metrics: ['correlation_utilization', 'decision_accuracy'],
          status: 'pending',
          confidence: insight.confidence,
          businessValue: this.calculateBusinessValue(insight.confidence, 'correlation'),
          createdAt: new Date()
        })
        break

      case 'forecast':
        if (insight.impact === 'high' || insight.impact === 'critical') {
          recommendations.push({
            id: `forecast-action-${insight.id}`,
            insightId: insight.id,
            priority: insight.impact === 'critical' ? 'critical' : 'high',
            category: 'operational',
            title: 'Act on Forecast Insights',
            description: `Take proactive measures based on the forecast insights to optimize operations.`,
            expectedImpact: 'Proactive operational adjustments based on forecast predictions',
            implementationEffort: 'medium',
            timeframe: 'Next 1-2 weeks',
            metrics: ['forecast_utilization', 'proactive_adjustments'],
            status: 'pending',
            confidence: insight.confidence,
            businessValue: this.calculateBusinessValue(insight.confidence, 'forecast_action'),
            createdAt: new Date()
          })
        }
        break

      case 'anomaly':
        recommendations.push({
          id: `anomaly-response-${insight.id}`,
          insightId: insight.id,
          priority: insight.impact === 'critical' ? 'critical' : 'high',
          category: 'operational',
          title: 'Respond to Anomaly',
          description: `Address the detected anomaly to prevent potential operational issues.`,
          expectedImpact: 'Maintain operational stability and service quality',
          implementationEffort: 'medium',
          timeframe: 'Immediate to 24 hours',
          metrics: ['anomaly_response_time', 'service_recovery'],
          status: 'pending',
          confidence: insight.confidence,
          businessValue: this.calculateBusinessValue(insight.confidence, 'anomaly_response'),
          createdAt: new Date()
        })
        break
    }

    return recommendations
  }

  private prioritizeRecommendations(recommendations: Recommendation[]): Recommendation[] {
    // Sort by priority, business value, and confidence
    return recommendations.sort((a, b) => {
      // Priority ranking
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      
      if (priorityDiff !== 0) return priorityDiff
      
      // Business value
      const valueDiff = b.businessValue - a.businessValue
      if (valueDiff !== 0) return valueDiff
      
      // Confidence
      return b.confidence - a.confidence
    })
  }

  private filterRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const filtered: Recommendation[] = []
    const seen = new Set<string>()

    for (const rec of recommendations) {
      // Create a key based on category and core action
      const key = `${rec.category}-${rec.title.toLowerCase().replace(/\s+/g, '-')}`
      
      if (!seen.has(key) && rec.confidence > 0.5 && rec.businessValue > 30) {
        seen.add(key)
        filtered.push(rec)
      }
    }

    // Limit to top 10 recommendations
    return filtered.slice(0, 10)
  }

  private calculateBusinessValue(strength: number, category: string): number {
    // Base value calculation based on strength
    let baseValue = strength * 100

    // Category multipliers
    const categoryMultipliers: Record<string, number> = {
      'capacity': 1.2,
      'staffing': 1.1,
      'optimization': 1.3,
      'investigation': 0.9,
      'stabilization': 1.4,
      'seasonal': 1.1,
      'forecasting': 1.0,
      'anomaly_response': 1.5,
      'correlation': 0.8,
      'forecast_action': 1.2
    }

    const multiplier = categoryMultipliers[category] || 1.0
    return Math.min(baseValue * multiplier, 100)
  }
}