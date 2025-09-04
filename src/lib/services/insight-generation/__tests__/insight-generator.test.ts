import { InsightGenerator } from '../insight-generator'
import { InsightGenerationRequest } from '../types'

describe('InsightGenerator', () => {
  let generator: InsightGenerator

  beforeEach(() => {
    generator = new InsightGenerator()
  })

  describe('generateInsights', () => {
    it('should generate insights for valid request', async () => {
      const request: InsightGenerationRequest = {
        clientId: 'test-client-123',
        timeRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        dataTypes: ['transcripts'],
        analysisDepth: 'detailed',
        includeRecommendations: true
      }

      const result = await generator.generateInsights(request)

      expect(result).toBeDefined()
      expect(result.insights).toBeInstanceOf(Array)
      expect(result.recommendations).toBeInstanceOf(Array)
      expect(result.trendAnalysis).toBeDefined()
      expect(result.patternRecognition).toBeDefined()
      expect(result.summary).toBeDefined()
      expect(typeof result.confidence).toBe('number')
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(typeof result.processingTime).toBe('number')
    })

    it('should handle requests without recommendations', async () => {
      const request: InsightGenerationRequest = {
        clientId: 'test-client-123',
        timeRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        dataTypes: ['transcripts'],
        analysisDepth: 'basic',
        includeRecommendations: false
      }

      const result = await generator.generateInsights(request)

      expect(result.recommendations).toHaveLength(0)
      expect(result.insights).toBeDefined()
    })

    it('should handle different analysis depths', async () => {
      const depths: Array<'basic' | 'detailed' | 'comprehensive'> = ['basic', 'detailed', 'comprehensive']

      for (const depth of depths) {
        const request: InsightGenerationRequest = {
          clientId: 'test-client-123',
          timeRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-31')
          },
          dataTypes: ['transcripts'],
          analysisDepth: depth,
          includeRecommendations: true
        }

        const result = await generator.generateInsights(request)
        expect(result).toBeDefined()
        expect(result.insights).toBeInstanceOf(Array)
      }
    })

    it('should handle custom filters', async () => {
      const request: InsightGenerationRequest = {
        clientId: 'test-client-123',
        timeRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        dataTypes: ['transcripts'],
        analysisDepth: 'detailed',
        includeRecommendations: true,
        customFilters: {
          minConfidence: 0.7,
          includeAnomalies: true,
          focusAreas: ['trends', 'patterns']
        }
      }

      const result = await generator.generateInsights(request)
      expect(result).toBeDefined()
    })

    it('should handle errors gracefully', async () => {
      const request: InsightGenerationRequest = {
        clientId: '', // Invalid client ID
        timeRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        dataTypes: ['transcripts'],
        analysisDepth: 'detailed',
        includeRecommendations: true
      }

      await expect(generator.generateInsights(request)).rejects.toThrow()
    })
  })

  describe('confidence calculation', () => {
    it('should calculate confidence correctly for multiple insights', () => {
      const insights = [
        { confidence: 0.8 },
        { confidence: 0.6 },
        { confidence: 0.9 }
      ]

      // Access private method through any cast for testing
      const confidence = (generator as any).calculateOverallConfidence(insights)
      expect(confidence).toBeCloseTo(0.77, 2)
    })

    it('should return 0 confidence for empty insights', () => {
      const confidence = (generator as any).calculateOverallConfidence([])
      expect(confidence).toBe(0)
    })
  })

  describe('impact mapping', () => {
    it('should map trend strength to impact correctly', () => {
      const generator = new InsightGenerator()
      
      expect((generator as any).mapTrendStrengthToImpact(0.9)).toBe('critical')
      expect((generator as any).mapTrendStrengthToImpact(0.7)).toBe('high')
      expect((generator as any).mapTrendStrengthToImpact(0.5)).toBe('medium')
      expect((generator as any).mapTrendStrengthToImpact(0.3)).toBe('low')
    })

    it('should map seasonal strength to impact correctly', () => {
      const generator = new InsightGenerator()
      
      expect((generator as any).mapSeasonalStrengthToImpact(0.8)).toBe('high')
      expect((generator as any).mapSeasonalStrengthToImpact(0.6)).toBe('medium')
      expect((generator as any).mapSeasonalStrengthToImpact(0.4)).toBe('low')
    })

    it('should map pattern strength to impact correctly', () => {
      const generator = new InsightGenerator()
      
      expect((generator as any).mapPatternStrengthToImpact(0.9)).toBe('high')
      expect((generator as any).mapPatternStrengthToImpact(0.7)).toBe('medium')
      expect((generator as any).mapPatternStrengthToImpact(0.5)).toBe('low')
    })
  })
})