import { 
  BusinessInsight, 
  InsightGenerationRequest, 
  InsightGenerationResult,
  TrendAnalysis,
  PatternRecognition,
  Recommendation,
  NaturalLanguageConfig
} from './types'
import { TrendAnalyzer } from './trend-analyzer'
import { PatternRecognizer } from './pattern-recognizer'
import { RecommendationEngine } from './recommendation-engine'
import { NaturalLanguageGenerator } from './natural-language-generator'
import { InsightValidator } from './insight-validator'
import { BusinessImpactAssessor } from './business-impact-assessor'

export class InsightGenerator {
  private trendAnalyzer: TrendAnalyzer
  private patternRecognizer: PatternRecognizer
  private recommendationEngine: RecommendationEngine
  private nlGenerator: NaturalLanguageGenerator
  private validator: InsightValidator
  private impactAssessor: BusinessImpactAssessor

  constructor() {
    this.trendAnalyzer = new TrendAnalyzer()
    this.patternRecognizer = new PatternRecognizer()
    this.recommendationEngine = new RecommendationEngine()
    this.nlGenerator = new NaturalLanguageGenerator()
    this.validator = new InsightValidator()
    this.impactAssessor = new BusinessImpactAssessor()
  }

  async generateInsights(request: InsightGenerationRequest): Promise<InsightGenerationResult> {
    const startTime = Date.now()

    try {
      // Validate request
      if (!request.clientId || request.clientId.trim() === '') {
        throw new Error('Client ID is required')
      }

      // 1. Fetch and prepare data
      const data = await this.fetchAnalysisData(request)
      
      // 2. Perform trend analysis
      const trendAnalysis = await this.trendAnalyzer.analyzeTrends(data, request.timeRange)
      
      // 3. Perform pattern recognition
      const patternRecognition = await this.patternRecognizer.recognizePatterns(data, request.timeRange)
      
      // 4. Generate base insights from analysis
      const baseInsights = await this.generateBaseInsights(trendAnalysis, patternRecognition, request)
      
      // 5. Validate insights
      const validatedInsights = await this.validateInsights(baseInsights, data)
      
      // 6. Assess business impact
      const insightsWithImpact = await this.assessBusinessImpact(validatedInsights)
      
      // 7. Generate recommendations if requested
      let recommendations: Recommendation[] = []
      if (request.includeRecommendations) {
        recommendations = await this.recommendationEngine.generateRecommendations(
          insightsWithImpact,
          trendAnalysis,
          patternRecognition
        )
      }
      
      // 8. Generate natural language summary
      const summary = await this.nlGenerator.generateSummary({
        insights: insightsWithImpact,
        trendAnalysis,
        patternRecognition,
        recommendations
      })
      
      // 9. Calculate overall confidence
      const confidence = this.calculateOverallConfidence(insightsWithImpact)
      
      const processingTime = Date.now() - startTime

      return {
        insights: insightsWithImpact,
        recommendations,
        trendAnalysis,
        patternRecognition,
        summary,
        confidence,
        processingTime
      }
    } catch (error) {
      console.error('Error generating insights:', error)
      throw new Error(`Failed to generate insights: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async fetchAnalysisData(request: InsightGenerationRequest) {
    // This would fetch data from the database based on the request parameters
    // For now, return a placeholder structure
    return {
      timeSeries: [],
      metadata: {},
      externalFactors: [],
      historicalPatterns: []
    }
  }

  private async generateBaseInsights(
    trendAnalysis: TrendAnalysis,
    patternRecognition: PatternRecognition,
    request: InsightGenerationRequest
  ): Promise<BusinessInsight[]> {
    const insights: BusinessInsight[] = []

    // Generate trend-based insights
    if (trendAnalysis.significance > 0.7) {
      insights.push({
        id: `trend-${Date.now()}`,
        type: 'trend',
        title: `${trendAnalysis.direction.charAt(0).toUpperCase() + trendAnalysis.direction.slice(1)} Trend Detected`,
        description: await this.nlGenerator.generateTrendDescription(trendAnalysis),
        confidence: trendAnalysis.significance,
        impact: this.mapTrendStrengthToImpact(trendAnalysis.strength),
        timeframe: request.timeRange,
        supportingData: {
          metrics: {
            changeRate: trendAnalysis.changeRate,
            strength: trendAnalysis.strength,
            significance: trendAnalysis.significance
          },
          correlations: [],
          statisticalTests: [],
          dataPoints: []
        },
        visualizations: [{
          type: 'line',
          title: 'Trend Analysis',
          data: [],
          config: {}
        }],
        createdAt: new Date(),
        isActive: true
      })
    }

    // Generate seasonal insights
    for (const seasonal of trendAnalysis.seasonality) {
      if (seasonal.confidence > 0.6) {
        insights.push({
          id: `seasonal-${seasonal.type}-${Date.now()}`,
          type: 'seasonal',
          title: `${seasonal.type.charAt(0).toUpperCase() + seasonal.type.slice(1)} Seasonality Pattern`,
          description: await this.nlGenerator.generateSeasonalDescription(seasonal),
          confidence: seasonal.confidence,
          impact: this.mapSeasonalStrengthToImpact(seasonal.strength),
          timeframe: request.timeRange,
          supportingData: {
            metrics: {
              strength: seasonal.strength,
              period: seasonal.period,
              phase: seasonal.phase
            },
            correlations: [],
            statisticalTests: [],
            dataPoints: []
          },
          visualizations: [{
            type: 'line',
            title: `${seasonal.type} Seasonal Pattern`,
            data: [],
            config: {}
          }],
          createdAt: new Date(),
          isActive: true
        })
      }
    }

    // Generate pattern-based insights
    for (const pattern of patternRecognition.patterns) {
      if (pattern.confidence > 0.65) {
        insights.push({
          id: `pattern-${pattern.id}`,
          type: 'pattern',
          title: `${pattern.type.charAt(0).toUpperCase() + pattern.type.slice(1)} Pattern Identified`,
          description: await this.nlGenerator.generatePatternDescription(pattern),
          confidence: pattern.confidence,
          impact: this.mapPatternStrengthToImpact(pattern.strength),
          timeframe: pattern.timeRange,
          supportingData: {
            metrics: {
              frequency: pattern.frequency,
              strength: pattern.strength
            },
            correlations: [],
            statisticalTests: [],
            dataPoints: pattern.examples
          },
          visualizations: [{
            type: 'scatter',
            title: `${pattern.type} Pattern Visualization`,
            data: pattern.examples,
            config: {}
          }],
          createdAt: new Date(),
          isActive: true
        })
      }
    }

    return insights
  }

  private async validateInsights(insights: BusinessInsight[], data: any): Promise<BusinessInsight[]> {
    const validatedInsights: BusinessInsight[] = []

    for (const insight of insights) {
      const validation = await this.validator.validateInsight(insight, data)
      
      if (validation.validationScore > 0.5) {
        // Update confidence based on validation
        insight.confidence = (insight.confidence + validation.validationScore) / 2
        validatedInsights.push(insight)
      }
    }

    return validatedInsights
  }

  private async assessBusinessImpact(insights: BusinessInsight[]): Promise<BusinessInsight[]> {
    for (const insight of insights) {
      const impact = await this.impactAssessor.assessImpact(insight)
      
      // Update impact level based on assessment
      if (impact.impactScore > 80) {
        insight.impact = 'critical'
      } else if (impact.impactScore > 60) {
        insight.impact = 'high'
      } else if (impact.impactScore > 40) {
        insight.impact = 'medium'
      } else {
        insight.impact = 'low'
      }
    }

    return insights
  }

  private calculateOverallConfidence(insights: BusinessInsight[]): number {
    if (insights.length === 0) return 0
    
    const totalConfidence = insights.reduce((sum, insight) => sum + insight.confidence, 0)
    return totalConfidence / insights.length
  }

  private mapTrendStrengthToImpact(strength: number): 'low' | 'medium' | 'high' | 'critical' {
    if (strength > 0.8) return 'critical'
    if (strength > 0.6) return 'high'
    if (strength > 0.4) return 'medium'
    return 'low'
  }

  private mapSeasonalStrengthToImpact(strength: number): 'low' | 'medium' | 'high' | 'critical' {
    if (strength > 0.7) return 'high'
    if (strength > 0.5) return 'medium'
    return 'low'
  }

  private mapPatternStrengthToImpact(strength: number): 'low' | 'medium' | 'high' | 'critical' {
    if (strength > 0.8) return 'high'
    if (strength > 0.6) return 'medium'
    return 'low'
  }
}