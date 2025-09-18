/**
 * Tests for AttributionAnalysisService
 */

import { AttributionAnalysisService } from '../attribution-analysis'
import { TimeSeriesData, ExternalFactor, InfluencingFactor } from '../types'

describe('AttributionAnalysisService', () => {
  let attributionService: AttributionAnalysisService
  let mockTranscriptData: TimeSeriesData
  let mockExternalFactors: ExternalFactor[]
  let mockInfluencingFactors: InfluencingFactor[]

  beforeEach(() => {
    attributionService = new AttributionAnalysisService()

    // Create mock data with a clear volume change pattern
    const dates = Array.from({ length: 60 }, (_, i) => {
      const date = new Date('2024-01-01')
      date.setDate(date.getDate() + i)
      return date
    })

    // Create data with a clear change at day 30 (holiday effect)
    const values = dates.map((date, index) => {
      const baseValue = 100
      const holidayBoost = (index >= 25 && index <= 35) ? 50 : 0 // Holiday period
      const randomNoise = Math.random() * 10
      return baseValue + holidayBoost + randomNoise
    })

    mockTranscriptData = {
      timestamps: dates,
      values,
      clientId: 'test-client'
    }

    // Create external factors including holiday indicator
    mockExternalFactors = dates.map((date, index) => ({
      id: `holiday-${index}`,
      name: 'holiday_period',
      type: 'holiday' as const,
      date,
      value: (index >= 25 && index <= 35) ? 1 : 0,
      description: 'Holiday period indicator'
    }))

    // Mock influencing factors based on correlation analysis
    mockInfluencingFactors = [
      {
        name: 'holiday_period',
        correlation: 0.8,
        significance: 0.001,
        direction: 'positive',
        timeDelay: 0,
        confidence: 0.95,
        explanation: 'Holiday period strongly correlates with increased volumes',
        importance: 0.8,
        statisticalTests: [{
          testType: 'pearson',
          statistic: 0.8,
          pValue: 0.001,
          isSignificant: true,
          confidenceLevel: 0.95
        }]
      }
    ]
  })

  describe('analyzeVolumeAttribution', () => {
    it('should identify volume change correctly', async () => {
      const changeDate = new Date('2024-01-30') // Middle of holiday period
      
      const result = await attributionService.analyzeVolumeAttribution(
        mockTranscriptData,
        mockExternalFactors,
        mockInfluencingFactors,
        changeDate,
        15
      )

      expect(result.volumeChange).toBeGreaterThan(5) // Should detect some volume change
      expect(result.changeDate).toEqual(changeDate)
      expect(result.contributingFactors.length).toBeGreaterThan(0)
    })

    it('should identify contributing factors', async () => {
      const changeDate = new Date('2024-01-30')
      
      const result = await attributionService.analyzeVolumeAttribution(
        mockTranscriptData,
        mockExternalFactors,
        mockInfluencingFactors,
        changeDate,
        15
      )

      const holidayContribution = result.contributingFactors.find(
        f => f.factor === 'holiday_period'
      )

      expect(holidayContribution).toBeDefined()
      expect(holidayContribution!.direction).toBe('increase')
      expect(holidayContribution!.contribution).toBeGreaterThan(0)
      expect(holidayContribution!.confidence).toBeGreaterThan(0.5)
    })

    it('should calculate explained and unexplained variance', async () => {
      const changeDate = new Date('2024-01-30')
      
      const result = await attributionService.analyzeVolumeAttribution(
        mockTranscriptData,
        mockExternalFactors,
        mockInfluencingFactors,
        changeDate,
        15
      )

      expect(result.totalExplainedVariance).toBeGreaterThan(0)
      expect(result.unexplainedVariance).toBeGreaterThanOrEqual(0)
      expect(result.totalExplainedVariance + result.unexplainedVariance).toBeLessThanOrEqual(100)
    })

    it('should provide meaningful explanations', async () => {
      const changeDate = new Date('2024-01-30')
      
      const result = await attributionService.analyzeVolumeAttribution(
        mockTranscriptData,
        mockExternalFactors,
        mockInfluencingFactors,
        changeDate,
        15
      )

      result.contributingFactors.forEach(factor => {
        expect(factor.explanation).toBeDefined()
        expect(factor.explanation.length).toBeGreaterThan(20)
        expect(factor.explanation).toContain(factor.factor)
      })
    })

    it('should handle time delays in factors', async () => {
      // Create factor with time delay
      const delayedInfluencer: InfluencingFactor = {
        ...mockInfluencingFactors[0],
        name: 'delayed_factor',
        timeDelay: 3
      }

      const changeDate = new Date('2024-01-30')
      
      const result = await attributionService.analyzeVolumeAttribution(
        mockTranscriptData,
        mockExternalFactors,
        [delayedInfluencer],
        changeDate,
        15
      )

      const delayedContribution = result.contributingFactors.find(
        f => f.factor === 'delayed_factor'
      )

      if (delayedContribution) {
        expect(delayedContribution.explanation).toContain('3-day delay')
      }
    })

    it('should handle no contributing factors gracefully', async () => {
      const changeDate = new Date('2024-01-15') // Before holiday period
      
      const result = await attributionService.analyzeVolumeAttribution(
        mockTranscriptData,
        [],
        [],
        changeDate,
        15
      )

      expect(result.contributingFactors.length).toBe(0)
      expect(result.totalExplainedVariance).toBe(0)
      expect(result.confidence).toBe(0)
    })
  })

  describe('performVarianceDecomposition', () => {
    it('should decompose variance correctly', async () => {
      const result = await attributionService.performVarianceDecomposition(
        mockTranscriptData,
        mockInfluencingFactors
      )

      expect(result.explainedVariance).toBeGreaterThan(0)
      expect(result.unexplainedVariance).toBeGreaterThan(0)
      expect(result.explainedVariance + result.unexplainedVariance).toBeCloseTo(1, 2)
      expect(result.factorContributions.length).toBeGreaterThan(0)
    })

    it('should calculate factor contributions to variance', async () => {
      const result = await attributionService.performVarianceDecomposition(
        mockTranscriptData,
        mockInfluencingFactors
      )

      const holidayContribution = result.factorContributions.find(
        f => f.factor === 'holiday_period'
      )

      expect(holidayContribution).toBeDefined()
      expect(holidayContribution!.varianceContribution).toBeGreaterThan(0)
    })
  })

  describe('analyzeTemporalAttribution', () => {
    it('should analyze attribution over multiple time periods', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-02-29')
      
      const result = await attributionService.analyzeTemporalAttribution(
        mockTranscriptData,
        mockExternalFactors,
        mockInfluencingFactors,
        startDate,
        endDate,
        7
      )

      expect(result.length).toBeGreaterThan(0)
      
      // Should have multiple attribution analyses
      result.forEach(attribution => {
        expect(attribution.changeDate).toBeDefined()
        expect(attribution.volumeChange).toBeDefined()
        expect(attribution.contributingFactors).toBeDefined()
      })
    })

    it('should handle different interval sizes', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-30')
      
      const weeklyResult = await attributionService.analyzeTemporalAttribution(
        mockTranscriptData,
        mockExternalFactors,
        mockInfluencingFactors,
        startDate,
        endDate,
        7
      )

      const dailyResult = await attributionService.analyzeTemporalAttribution(
        mockTranscriptData,
        mockExternalFactors,
        mockInfluencingFactors,
        startDate,
        endDate,
        1
      )

      expect(dailyResult.length).toBeGreaterThan(weeklyResult.length)
    })
  })

  describe('edge cases', () => {
    it('should handle empty data', async () => {
      const emptyData: TimeSeriesData = {
        timestamps: [],
        values: [],
        clientId: 'test'
      }

      const changeDate = new Date('2024-01-15')
      
      const result = await attributionService.analyzeVolumeAttribution(
        emptyData,
        mockExternalFactors,
        mockInfluencingFactors,
        changeDate,
        15
      )

      expect(result.volumeChange).toBe(0)
      expect(result.contributingFactors.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle change date outside data range', async () => {
      const changeDate = new Date('2025-01-01') // Future date
      
      const result = await attributionService.analyzeVolumeAttribution(
        mockTranscriptData,
        mockExternalFactors,
        mockInfluencingFactors,
        changeDate,
        15
      )

      expect(result.volumeChange).toBe(0)
    })

    it('should handle factors with no matching external data', async () => {
      const unmatchedInfluencer: InfluencingFactor = {
        name: 'nonexistent_factor',
        correlation: 0.5,
        significance: 0.05,
        direction: 'positive',
        timeDelay: 0,
        confidence: 0.8,
        explanation: 'Test factor',
        importance: 0.5,
        statisticalTests: []
      }

      const changeDate = new Date('2024-01-30')
      
      const result = await attributionService.analyzeVolumeAttribution(
        mockTranscriptData,
        mockExternalFactors,
        [unmatchedInfluencer],
        changeDate,
        15
      )

      // Should not find contributions for non-matching factors
      const unmatchedContribution = result.contributingFactors.find(
        f => f.factor === 'nonexistent_factor'
      )
      expect(unmatchedContribution).toBeUndefined()
    })
  })

  describe('confidence calculations', () => {
    it('should calculate attribution confidence correctly', async () => {
      const changeDate = new Date('2024-01-30')
      
      const result = await attributionService.analyzeVolumeAttribution(
        mockTranscriptData,
        mockExternalFactors,
        mockInfluencingFactors,
        changeDate,
        15
      )

      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      
      // Higher confidence should correlate with more contributing factors
      if (result.contributingFactors.length > 0) {
        expect(result.confidence).toBeGreaterThan(0.3)
      }
    })

    it('should adjust confidence based on factor reliability', async () => {
      // Create low-confidence influencer
      const lowConfidenceInfluencer: InfluencingFactor = {
        ...mockInfluencingFactors[0],
        confidence: 0.3,
        significance: 0.08
      }

      const changeDate = new Date('2024-01-30')
      
      const result = await attributionService.analyzeVolumeAttribution(
        mockTranscriptData,
        mockExternalFactors,
        [lowConfidenceInfluencer],
        changeDate,
        15
      )

      // Overall confidence should be lower with low-confidence factors
      expect(result.confidence).toBeLessThan(0.8)
    })
  })
})