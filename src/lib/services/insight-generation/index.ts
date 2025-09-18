// Automated Insight Generation Engine
// This module provides comprehensive insight generation capabilities using Vertex AI

export { InsightGenerator } from './insight-generator'
export { TrendAnalyzer } from './trend-analyzer'
export { PatternRecognizer } from './pattern-recognizer'
export { RecommendationEngine } from './recommendation-engine'
export { NaturalLanguageGenerator } from './natural-language-generator'
export { InsightValidator } from './insight-validator'
export { BusinessImpactAssessor } from './business-impact-assessor'

export * from './types'

// Main service factory
export class InsightGenerationService {
  private static instance: InsightGenerator

  static getInstance(): InsightGenerator {
    if (!this.instance) {
      this.instance = new InsightGenerator()
    }
    return this.instance
  }

  static async generateInsights(request: import('./types').InsightGenerationRequest) {
    const generator = this.getInstance()
    return await generator.generateInsights(request)
  }
}