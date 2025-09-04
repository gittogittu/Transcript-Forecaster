import { 
  TrendAnalysis, 
  SeasonalPattern, 
  DetectedPattern, 
  BusinessInsight, 
  PatternRecognition,
  Recommendation,
  NaturalLanguageConfig 
} from './types'

export class NaturalLanguageGenerator {
  private config: NaturalLanguageConfig

  constructor(config?: Partial<NaturalLanguageConfig>) {
    this.config = {
      model: 'gemini-1.5-pro',
      temperature: 0.3,
      maxTokens: 500,
      language: 'en',
      tone: 'professional',
      audience: 'analyst',
      ...config
    }
  }

  async generateSummary(data: {
    insights: BusinessInsight[]
    trendAnalysis: TrendAnalysis
    patternRecognition: PatternRecognition
    recommendations: Recommendation[]
  }): Promise<string> {
    try {
      const prompt = this.buildSummaryPrompt(data)
      return await this.generateText(prompt)
    } catch (error) {
      console.error('Error generating summary:', error)
      return this.generateFallbackSummary(data)
    }
  }

  async generateTrendDescription(trendAnalysis: TrendAnalysis): Promise<string> {
    try {
      const prompt = this.buildTrendPrompt(trendAnalysis)
      return await this.generateText(prompt)
    } catch (error) {
      console.error('Error generating trend description:', error)
      return this.generateFallbackTrendDescription(trendAnalysis)
    }
  }

  async generateSeasonalDescription(seasonal: SeasonalPattern): Promise<string> {
    try {
      const prompt = this.buildSeasonalPrompt(seasonal)
      return await this.generateText(prompt)
    } catch (error) {
      console.error('Error generating seasonal description:', error)
      return this.generateFallbackSeasonalDescription(seasonal)
    }
  }

  async generatePatternDescription(pattern: DetectedPattern): Promise<string> {
    try {
      const prompt = this.buildPatternPrompt(pattern)
      return await this.generateText(prompt)
    } catch (error) {
      console.error('Error generating pattern description:', error)
      return this.generateFallbackPatternDescription(pattern)
    }
  }

  async generateInsightExplanation(insight: BusinessInsight): Promise<string> {
    try {
      const prompt = this.buildInsightPrompt(insight)
      return await this.generateText(prompt)
    } catch (error) {
      console.error('Error generating insight explanation:', error)
      return this.generateFallbackInsightExplanation(insight)
    }
  }

  async generateRecommendationRationale(recommendation: Recommendation): Promise<string> {
    try {
      const prompt = this.buildRecommendationPrompt(recommendation)
      return await this.generateText(prompt)
    } catch (error) {
      console.error('Error generating recommendation rationale:', error)
      return this.generateFallbackRecommendationRationale(recommendation)
    }
  }

  private buildSummaryPrompt(data: {
    insights: BusinessInsight[]
    trendAnalysis: TrendAnalysis
    patternRecognition: PatternRecognition
    recommendations: Recommendation[]
  }): string {
    const trendInfo = `Trend: ${data.trendAnalysis.direction} (strength: ${(data.trendAnalysis.strength * 100).toFixed(1)}%)`
    const insightCount = data.insights.length
    const patternCount = data.patternRecognition.patterns.length
    const recommendationCount = data.recommendations.length

    return `
Generate a concise executive summary for a business analytics report with the following data:

${trendInfo}
- ${insightCount} key insights identified
- ${patternCount} patterns detected
- ${recommendationCount} recommendations generated

Key insights:
${data.insights.slice(0, 3).map(insight => `- ${insight.title}: ${insight.description}`).join('\n')}

Top recommendations:
${data.recommendations.slice(0, 3).map(rec => `- ${rec.title}: ${rec.description}`).join('\n')}

Write a ${this.config.tone} summary for ${this.config.audience} audience that:
1. Highlights the most important findings
2. Explains business implications
3. Suggests next steps
4. Uses clear, actionable language

Keep it under 200 words.
    `.trim()
  }

  private buildTrendPrompt(trendAnalysis: TrendAnalysis): string {
    const direction = trendAnalysis.direction
    const strength = (trendAnalysis.strength * 100).toFixed(1)
    const changeRate = (trendAnalysis.changeRate * 100).toFixed(1)
    const significance = (trendAnalysis.significance * 100).toFixed(1)

    return `
Describe a ${direction} trend in business data with these characteristics:
- Trend strength: ${strength}%
- Change rate: ${changeRate}%
- Statistical significance: ${significance}%
- Forecast confidence: ${(trendAnalysis.forecast.confidence * 100).toFixed(1)}%

Write a ${this.config.tone} description for ${this.config.audience} that:
1. Explains what the trend means for the business
2. Highlights the confidence level
3. Mentions potential implications
4. Uses clear, non-technical language

Keep it under 100 words.
    `.trim()
  }

  private buildSeasonalPrompt(seasonal: SeasonalPattern): string {
    const type = seasonal.type
    const strength = (seasonal.strength * 100).toFixed(1)
    const confidence = (seasonal.confidence * 100).toFixed(1)

    return `
Describe a ${type} seasonal pattern with:
- Pattern strength: ${strength}%
- Confidence level: ${confidence}%
- Period: ${seasonal.period} units
- Phase: ${seasonal.phase}

Write a ${this.config.tone} description for ${this.config.audience} that:
1. Explains the seasonal behavior
2. Describes when peaks/valleys occur
3. Suggests business implications
4. Uses accessible language

Keep it under 80 words.
    `.trim()
  }

  private buildPatternPrompt(pattern: DetectedPattern): string {
    const type = pattern.type
    const strength = (pattern.strength * 100).toFixed(1)
    const confidence = (pattern.confidence * 100).toFixed(1)

    return `
Describe a ${type} pattern in business data:
- Pattern type: ${type}
- Strength: ${strength}%
- Confidence: ${confidence}%
- Frequency: ${pattern.frequency.toFixed(3)}

Write a ${this.config.tone} description for ${this.config.audience} that:
1. Explains what this pattern means
2. Describes its business relevance
3. Suggests how to use this information
4. Uses clear, actionable language

Keep it under 80 words.
    `.trim()
  }

  private buildInsightPrompt(insight: BusinessInsight): string {
    return `
Explain this business insight:
- Type: ${insight.type}
- Title: ${insight.title}
- Impact level: ${insight.impact}
- Confidence: ${(insight.confidence * 100).toFixed(1)}%

Current description: ${insight.description}

Enhance this description for ${this.config.audience} audience with:
1. Clear business implications
2. Actionable insights
3. Context about confidence level
4. ${this.config.tone} tone

Keep it under 120 words.
    `.trim()
  }

  private buildRecommendationPrompt(recommendation: Recommendation): string {
    return `
Explain the rationale for this business recommendation:
- Title: ${recommendation.title}
- Priority: ${recommendation.priority}
- Category: ${recommendation.category}
- Expected impact: ${recommendation.expectedImpact}
- Implementation effort: ${recommendation.implementationEffort}
- Timeframe: ${recommendation.timeframe}

Write a ${this.config.tone} rationale for ${this.config.audience} that:
1. Explains why this recommendation is important
2. Describes the expected benefits
3. Addresses implementation considerations
4. Uses persuasive but factual language

Keep it under 100 words.
    `.trim()
  }

  private async generateText(prompt: string): Promise<string> {
    try {
      // In a real implementation, this would call Vertex AI Gemini API
      // For now, we'll simulate the API call and return a structured response
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // This is where you would integrate with Vertex AI Gemini
      // const response = await vertexAI.generateText({
      //   model: this.config.model,
      //   prompt: prompt,
      //   temperature: this.config.temperature,
      //   maxTokens: this.config.maxTokens
      // })
      
      // For now, return a placeholder that would be replaced with actual AI generation
      return this.generateStructuredResponse(prompt)
    } catch (error) {
      console.error('Error calling Vertex AI:', error)
      throw error
    }
  }

  private generateStructuredResponse(prompt: string): string {
    // This is a placeholder that simulates AI-generated responses
    // In production, this would be replaced with actual Vertex AI calls
    
    if (prompt.includes('executive summary')) {
      return "The analysis reveals a significant upward trend in transcript volumes with 85% confidence. Three key patterns were identified, including strong weekly seasonality and recurring daily peaks. The data suggests increasing demand that requires proactive capacity planning. Immediate recommendations include scaling resources by 15-20% and implementing automated load balancing. These insights provide a foundation for strategic planning and operational optimization over the next quarter."
    }
    
    if (prompt.includes('trend')) {
      if (prompt.includes('increasing')) {
        return "An upward trend indicates growing business activity with strong statistical confidence. This suggests increasing demand that may require additional resources and capacity planning to maintain service quality."
      } else if (prompt.includes('decreasing')) {
        return "A downward trend shows declining activity levels. While this may indicate reduced demand, it also presents opportunities for cost optimization and efficiency improvements."
      } else if (prompt.includes('volatile')) {
        return "High volatility indicates unpredictable fluctuations in business activity. This pattern suggests the need for flexible resource allocation and improved forecasting capabilities."
      }
      return "The trend analysis provides insights into the directional movement of business metrics over time."
    }
    
    if (prompt.includes('seasonal')) {
      const seasonType = prompt.includes('daily') ? 'daily' : 
                        prompt.includes('weekly') ? 'weekly' : 
                        prompt.includes('monthly') ? 'monthly' : 'seasonal'
      return `A ${seasonType} pattern shows predictable fluctuations that can be leveraged for resource planning. Understanding these cycles enables better forecasting and operational efficiency through proactive adjustments.`
    }
    
    if (prompt.includes('pattern')) {
      if (prompt.includes('recurring')) {
        return "A recurring pattern indicates consistent, predictable behavior that can improve forecasting accuracy and enable proactive resource management."
      } else if (prompt.includes('cyclical')) {
        return "Cyclical behavior shows regular fluctuations that follow a predictable cycle, enabling better long-term planning and resource optimization."
      }
      return "This pattern provides valuable insights for improving operational efficiency and predictive accuracy."
    }
    
    if (prompt.includes('recommendation')) {
      return "This recommendation is based on data-driven insights and aims to optimize operational efficiency while maintaining service quality. The suggested approach balances implementation effort with expected business impact."
    }
    
    return "The analysis provides actionable insights based on statistical patterns and trends in the data."
  }

  // Fallback methods for when AI generation fails
  private generateFallbackSummary(data: {
    insights: BusinessInsight[]
    trendAnalysis: TrendAnalysis
    patternRecognition: PatternRecognition
    recommendations: Recommendation[]
  }): string {
    const trendDirection = data.trendAnalysis.direction
    const insightCount = data.insights.length
    const highPriorityRecs = data.recommendations.filter(r => r.priority === 'high' || r.priority === 'critical').length

    return `Analysis Summary: The data shows a ${trendDirection} trend with ${insightCount} key insights identified. ${highPriorityRecs} high-priority recommendations have been generated based on detected patterns and trends. Key areas for attention include capacity planning, resource optimization, and operational efficiency improvements.`
  }

  private generateFallbackTrendDescription(trendAnalysis: TrendAnalysis): string {
    const direction = trendAnalysis.direction
    const strength = (trendAnalysis.strength * 100).toFixed(0)
    
    return `${direction.charAt(0).toUpperCase() + direction.slice(1)} trend detected with ${strength}% strength. This indicates ${direction === 'increasing' ? 'growing' : direction === 'decreasing' ? 'declining' : 'variable'} activity levels that may require operational adjustments.`
  }

  private generateFallbackSeasonalDescription(seasonal: SeasonalPattern): string {
    const type = seasonal.type
    const strength = (seasonal.strength * 100).toFixed(0)
    
    return `${type.charAt(0).toUpperCase() + type.slice(1)} seasonal pattern identified with ${strength}% strength. This recurring cycle can be used for improved forecasting and resource planning.`
  }

  private generateFallbackPatternDescription(pattern: DetectedPattern): string {
    const type = pattern.type
    const confidence = (pattern.confidence * 100).toFixed(0)
    
    return `${type.charAt(0).toUpperCase() + type.slice(1)} pattern detected with ${confidence}% confidence. This pattern provides insights for operational optimization and predictive modeling.`
  }

  private generateFallbackInsightExplanation(insight: BusinessInsight): string {
    return `${insight.title}: ${insight.description} (Confidence: ${(insight.confidence * 100).toFixed(0)}%, Impact: ${insight.impact})`
  }

  private generateFallbackRecommendationRationale(recommendation: Recommendation): string {
    return `${recommendation.title} - Priority: ${recommendation.priority}. ${recommendation.description} Expected timeframe: ${recommendation.timeframe}.`
  }
}