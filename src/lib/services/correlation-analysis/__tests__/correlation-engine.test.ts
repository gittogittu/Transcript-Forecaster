/**
 * Tests for CorrelationEngine
 */

import { CorrelationEngine } from '../correlation-engine'
import { TimeSeriesData, ExternalFactor, CorrelationAnalysisRequest } from '../types'

describe('CorrelationEngine', () => {
  let correlationEngine: CorrelationEngine
  let mockTranscriptData: TimeSeriesData
  let mockExternalFactors: ExternalFactor[]
  let mockRequest: CorrelationAnalysisRequest

  beforeEach(() => {
    correlationEngine = new CorrelationEngine()

    // Create mock data with known patterns
    const dates = Array.from({ length: 30 }, (_, i) => {
      const date = new Date('2024-01-01')
      date.setDate(date.getDate() + i)
      return date
    })

    // Create transcript data with weekend pattern (lower on weekends)
    const values = dates.map(date => {
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      return isWeekend ? 50 + Math.random() * 20 : 100 + Math.random() * 30
    })

    mockTranscriptData = {
      timestamps: dates,
      values,
      clientId: 'test-client'
    }

    // Create external factors
    mockExternalFactors = dates.map((date, index) => ({
      id: `factor-${index}`,
      name: 'is_weekend',
      type: 'day_of_week' as const,
      date,
      value: (date.getDay() === 0 || date.getDay() === 6) ? 1 : 0,
      description: 'Weekend indicator'
    }))

    mockRequest = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-30'),
      includeExternalFactors: true,
      significanceLevel: 0.05,
      maxTimeDelay: 3,
      analysisType: 'correlation'
    }
  })

  describe('analyzeCorrelations', () => {
    it('should identify negative correlation with weekend factor', async () => {
      const result = await correlationEngine.analyzeCorrelations(
        mockTranscriptData,
        mockExternalFactors,
        mockRequest
      )

      expect(result.correlations).toBeDefined()
      expect(result.correlations.length).toBeGreaterThan(0)
      
      // Should find negative correlation with weekend factor
      const weekendCorrelation = result.correlations.find(c => c.factor === 'is_weekend')
      expect(weekendCorrelation).toBeDefined()
      expect(weekendCorrelation!.direction).toBe('negative')
      expect(Math.abs(weekendCorrelation!.correlation)).toBeGreaterThan(0.3)
    })

    it('should build correlation matrix', async () => {
      const result = await correlationEngine.analyzeCorrelations(
        mockTranscriptData,
        mockExternalFactors,
        mockRequest
      )

      expect(result.correlationMatrix).toBeDefined()
      expect(result.correlationMatrix.factors).toContain('is_weekend')
      expect(result.correlationMatrix.correlations).toBeDefined()
      expect(result.correlationMatrix.pValues).toBeDefined()
    })

    it('should identify key influencing factors', async () => {
      const result = await correlationEngine.analyzeCorrelations(
        mockTranscriptData,
        mockExternalFactors,
        mockRequest
      )

      expect(result.influencingFactors).toBeDefined()
      expect(result.influencingFactors.length).toBeGreaterThan(0)
      
      const topInfluencer = result.influencingFactors[0]
      expect(topInfluencer.name).toBe('is_weekend')
      expect(topInfluencer.importance).toBeGreaterThan(0)
    })

    it('should generate analysis summary', async () => {
      const result = await correlationEngine.analyzeCorrelations(
        mockTranscriptData,
        mockExternalFactors,
        mockRequest
      )

      expect(result.summary).toBeDefined()
      expect(result.summary.totalFactorsAnalyzed).toBeGreaterThan(0)
      expect(result.summary.strongestInfluencer).toBe('is_weekend')
      expect(result.summary.recommendations).toBeDefined()
      expect(result.summary.recommendations.length).toBeGreaterThan(0)
    })

    it('should handle multiple time delays', async () => {
      const requestWithDelay = { ...mockRequest, maxTimeDelay: 5 }
      
      const result = await correlationEngine.analyzeCorrelations(
        mockTranscriptData,
        mockExternalFactors,
        requestWithDelay
      )

      // Should find correlations at different time delays
      const correlationsWithDelay = result.correlations.filter(c => c.timeDelay > 0)
      expect(correlationsWithDelay.length).toBeGreaterThan(0)
    })

    it('should handle empty external factors', async () => {
      const result = await correlationEngine.analyzeCorrelations(
        mockTranscriptData,
        [],
        mockRequest
      )

      expect(result.correlations).toBeDefined()
      expect(result.correlations.length).toBe(0)
      expect(result.summary.totalFactorsAnalyzed).toBe(0)
    })

    it('should handle insufficient data', async () => {
      const smallData: TimeSeriesData = {
        timestamps: [new Date('2024-01-01')],
        values: [100],
        clientId: 'test-client'
      }

      const result = await correlationEngine.analyzeCorrelations(
        smallData,
        mockExternalFactors,
        mockRequest
      )

      expect(result.correlations.length).toBe(0)
    })
  })

  describe('statistical calculations', () => {
    it('should calculate Pearson correlation correctly', async () => {
      // Create perfectly correlated data with more data points
      const perfectDates = Array.from({ length: 10 }, (_, i) => {
        const date = new Date('2024-01-01')
        date.setDate(date.getDate() + i)
        return date
      })
      
      const perfectData: TimeSeriesData = {
        timestamps: perfectDates,
        values: perfectDates.map((_, i) => i + 1), // Linear progression
        clientId: 'test'
      }

      const perfectFactors: ExternalFactor[] = perfectDates.map((date, i) => ({
        id: `${i}`,
        name: 'perfect_correlation',
        type: 'custom',
        date,
        value: i + 1 // Same linear progression
      }))

      const perfectRequest = {
        ...mockRequest,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-10')
      }

      const result = await correlationEngine.analyzeCorrelations(
        perfectData,
        perfectFactors,
        perfectRequest
      )

      const perfectCorr = result.correlations.find(c => c.factor === 'perfect_correlation')
      expect(perfectCorr).toBeDefined()
      if (perfectCorr) {
        expect(Math.abs(perfectCorr.correlation)).toBeGreaterThan(0.8)
      }
    })

    it('should categorize significance levels correctly', async () => {
      const result = await correlationEngine.analyzeCorrelations(
        mockTranscriptData,
        mockExternalFactors,
        mockRequest
      )

      result.correlations.forEach(correlation => {
        expect(['high', 'medium', 'low', 'none']).toContain(correlation.significance)
        
        if (correlation.significance === 'high') {
          expect(correlation.pValue).toBeLessThan(mockRequest.significanceLevel / 10)
        }
      })
    })

    it('should generate meaningful explanations', async () => {
      const result = await correlationEngine.analyzeCorrelations(
        mockTranscriptData,
        mockExternalFactors,
        mockRequest
      )

      result.correlations.forEach(correlation => {
        expect(correlation.explanation).toBeDefined()
        expect(correlation.explanation.length).toBeGreaterThan(10)
        expect(correlation.explanation).toContain(correlation.factor)
      })
    })
  })

  describe('error handling', () => {
    it('should handle invalid data gracefully', async () => {
      const invalidData: TimeSeriesData = {
        timestamps: [],
        values: [],
        clientId: 'test'
      }

      const result = await correlationEngine.analyzeCorrelations(invalidData, mockExternalFactors, mockRequest)
      // Should handle gracefully and return empty results
      expect(result.correlations.length).toBe(0)
    })

    it('should handle mismatched timestamp and value arrays', async () => {
      const mismatchedData: TimeSeriesData = {
        timestamps: [new Date('2024-01-01')],
        values: [100, 200], // More values than timestamps
        clientId: 'test'
      }

      const result = await correlationEngine.analyzeCorrelations(
        mismatchedData,
        mockExternalFactors,
        mockRequest
      )

      // Should handle gracefully without crashing
      expect(result).toBeDefined()
    })
  })

  describe('performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Create larger dataset
      const largeDates = Array.from({ length: 365 }, (_, i) => {
        const date = new Date('2024-01-01')
        date.setDate(date.getDate() + i)
        return date
      })

      const largeValues = largeDates.map(() => Math.random() * 100)
      const largeFactors = largeDates.map((date, index) => ({
        id: `factor-${index}`,
        name: 'random_factor',
        type: 'custom' as const,
        date,
        value: Math.random()
      }))

      const largeData: TimeSeriesData = {
        timestamps: largeDates,
        values: largeValues,
        clientId: 'test'
      }

      const startTime = Date.now()
      const result = await correlationEngine.analyzeCorrelations(
        largeData,
        largeFactors,
        mockRequest
      )
      const endTime = Date.now()

      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})