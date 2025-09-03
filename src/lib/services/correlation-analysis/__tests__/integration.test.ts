/**
 * Integration tests for the complete correlation analysis system
 */

// Mock environment variables for testing
process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project'
process.env.GOOGLE_CLOUD_LOCATION = 'us-central1'

import { CorrelationAnalysisService } from '../correlation-analysis-service'
import { TimeSeriesData, ExternalFactor, CorrelationAnalysisRequest } from '../types'

describe('Correlation Analysis Integration Tests', () => {
  let correlationService: CorrelationAnalysisService
  let mockTranscriptData: TimeSeriesData
  let mockExternalFactors: ExternalFactor[]

  beforeEach(() => {
    correlationService = new CorrelationAnalysisService()

    // Create comprehensive mock data with multiple patterns
    const dates = Array.from({ length: 90 }, (_, i) => {
      const date = new Date('2024-01-01')
      date.setDate(date.getDate() + i)
      return date
    })

    // Create realistic transcript data with multiple influencing factors
    const values = dates.map((date, index) => {
      let baseValue = 100
      
      // Weekend effect (lower volumes)
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      if (isWeekend) baseValue *= 0.7
      
      // Monthly seasonality
      const monthEffect = Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 20
      baseValue += monthEffect
      
      // Holiday effect (specific dates)
      const isHoliday = date.getDate() === 15 || date.getDate() === 25
      if (isHoliday) baseValue *= 1.5
      
      // Trend component
      const trendEffect = index * 0.5
      baseValue += trendEffect
      
      // Random noise
      const noise = (Math.random() - 0.5) * 20
      
      return Math.max(10, baseValue + noise)
    })

    mockTranscriptData = {
      timestamps: dates,
      values,
      clientId: 'integration-test-client',
      metadata: { source: 'integration-test' }
    }

    // Create comprehensive external factors
    mockExternalFactors = []
    
    dates.forEach((date, index) => {
      // Weekend indicator
      mockExternalFactors.push({
        id: `weekend-${index}`,
        name: 'is_weekend',
        type: 'day_of_week',
        date,
        value: (date.getDay() === 0 || date.getDay() === 6) ? 1 : 0,
        description: 'Weekend indicator'
      })
      
      // Day of week
      mockExternalFactors.push({
        id: `dow-${index}`,
        name: 'day_of_week',
        type: 'day_of_week',
        date,
        value: date.getDay(),
        description: 'Day of week (0=Sunday, 6=Saturday)'
      })
      
      // Month
      mockExternalFactors.push({
        id: `month-${index}`,
        name: 'month',
        type: 'seasonal',
        date,
        value: date.getMonth() + 1,
        description: 'Month of year'
      })
      
      // Holiday indicator
      mockExternalFactors.push({
        id: `holiday-${index}`,
        name: 'holiday',
        type: 'holiday',
        date,
        value: (date.getDate() === 15 || date.getDate() === 25) ? 1 : 0,
        description: 'Holiday indicator'
      })
      
      // Economic indicator (simulated)
      mockExternalFactors.push({
        id: `economic-${index}`,
        name: 'economic_index',
        type: 'economic',
        date,
        value: 100 + Math.sin((index / 30) * Math.PI) * 10 + Math.random() * 5,
        description: 'Simulated economic index'
      })
    })
  })

  describe('Complete Analysis Workflow', () => {
    it('should perform comprehensive correlation analysis', async () => {
      const request: CorrelationAnalysisRequest = {
        clientId: 'integration-test-client',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        includeExternalFactors: true,
        significanceLevel: 0.05,
        maxTimeDelay: 7,
        analysisType: 'all'
      }

      const result = await correlationService.performCorrelationAnalysis(
        mockTranscriptData,
        mockExternalFactors,
        request
      )

      // Verify core correlation analysis
      expect(result.correlations).toBeDefined()
      expect(result.correlations.length).toBeGreaterThan(0)
      expect(result.influencingFactors).toBeDefined()
      expect(result.correlationMatrix).toBeDefined()
      expect(result.summary).toBeDefined()

      // Should identify weekend effect
      const weekendCorrelation = result.correlations.find(c => c.factor === 'is_weekend')
      expect(weekendCorrelation).toBeDefined()
      expect(weekendCorrelation!.direction).toBe('negative')

      // Should identify holiday effect
      const holidayCorrelation = result.correlations.find(c => c.factor === 'holiday')
      expect(holidayCorrelation).toBeDefined()
      expect(holidayCorrelation!.direction).toBe('positive')

      // Verify attribution analysis (if included)
      if (result.attributionAnalysis) {
        expect(result.attributionAnalysis.contributingFactors).toBeDefined()
        expect(result.attributionAnalysis.confidence).toBeGreaterThan(0)
      }

      // Verify summary statistics
      expect(result.summary.totalFactorsAnalyzed).toBeGreaterThan(3)
      expect(result.summary.significantFactors).toBeGreaterThan(0)
      expect(result.summary.recommendations.length).toBeGreaterThan(0)
    })

    it('should generate comprehensive visualizations', async () => {
      const request: CorrelationAnalysisRequest = {
        clientId: 'integration-test-client',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        includeExternalFactors: true,
        significanceLevel: 0.05,
        maxTimeDelay: 3,
        analysisType: 'correlation'
      }

      const analysisResult = await correlationService.performCorrelationAnalysis(
        mockTranscriptData,
        mockExternalFactors,
        request
      )

      const visualizations = await correlationService.generateVisualizations(analysisResult)

      // Verify dashboard structure
      expect(visualizations.dashboard).toBeDefined()
      expect(visualizations.dashboard.widgets).toBeDefined()
      expect(visualizations.dashboard.layout).toBeDefined()
      expect(visualizations.dashboard.widgets.length).toBeGreaterThan(2)

      // Verify individual charts
      expect(visualizations.individualCharts).toBeDefined()
      expect(visualizations.individualCharts.correlationHeatmap).toBeDefined()
      expect(visualizations.individualCharts.factorImportance).toBeDefined()
      expect(visualizations.individualCharts.timeSeriesCorrelation).toBeDefined()

      // Verify chart configurations
      Object.values(visualizations.individualCharts).forEach(chart => {
        expect(chart.type).toBeDefined()
        expect(chart.data).toBeDefined()
        expect(chart.options).toBeDefined()
      })
    })

    it('should generate actionable recommendations', async () => {
      const request: CorrelationAnalysisRequest = {
        clientId: 'integration-test-client',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        includeExternalFactors: true,
        significanceLevel: 0.05,
        maxTimeDelay: 3,
        analysisType: 'correlation'
      }

      const analysisResult = await correlationService.performCorrelationAnalysis(
        mockTranscriptData,
        mockExternalFactors,
        request
      )

      const recommendations = correlationService.generateRecommendations(analysisResult)

      expect(recommendations.operational).toBeDefined()
      expect(recommendations.strategic).toBeDefined()
      expect(recommendations.monitoring).toBeDefined()
      expect(recommendations.dataCollection).toBeDefined()

      // Should have at least some recommendations
      const totalRecommendations = 
        recommendations.operational.length +
        recommendations.strategic.length +
        recommendations.monitoring.length +
        recommendations.dataCollection.length

      expect(totalRecommendations).toBeGreaterThan(0)

      // Recommendations should be meaningful strings
      Object.values(recommendations).flat().forEach(recommendation => {
        expect(typeof recommendation).toBe('string')
        expect(recommendation.length).toBeGreaterThan(10)
      })
    })
  })

  describe('Trend Analysis Integration', () => {
    it('should analyze correlation trends over time', async () => {
      const request: CorrelationAnalysisRequest = {
        clientId: 'integration-test-client',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        includeExternalFactors: true,
        significanceLevel: 0.05,
        maxTimeDelay: 3,
        analysisType: 'correlation'
      }

      const trendAnalysis = await correlationService.analyzeCorrelationTrends(
        mockTranscriptData,
        mockExternalFactors,
        request,
        14, // 2-week windows
        7   // 1-week steps
      )

      expect(trendAnalysis.trends).toBeDefined()
      expect(trendAnalysis.trends.length).toBeGreaterThan(5)
      expect(trendAnalysis.trendSummary).toBeDefined()

      // Verify trend structure
      trendAnalysis.trends.forEach(trend => {
        expect(trend.date).toBeDefined()
        expect(trend.correlations).toBeDefined()
        expect(trend.correlations.correlations).toBeDefined()
      })

      // Verify trend summary
      trendAnalysis.trendSummary.forEach(summary => {
        expect(summary.factor).toBeDefined()
        expect(['increasing', 'decreasing', 'stable']).toContain(summary.correlationTrend)
        expect(summary.trendStrength).toBeGreaterThanOrEqual(0)
      })
    })

    it('should compare correlations across segments', async () => {
      // Create segment data
      const segment1Data = { ...mockTranscriptData, clientId: 'segment-1' }
      const segment2Data = {
        ...mockTranscriptData,
        clientId: 'segment-2',
        values: mockTranscriptData.values.map(v => v * 1.2) // Different scale
      }

      const segmentData = [
        { segment: 'Enterprise', data: segment1Data },
        { segment: 'SMB', data: segment2Data }
      ]

      const request = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        includeExternalFactors: true,
        significanceLevel: 0.05,
        maxTimeDelay: 3,
        analysisType: 'correlation' as const
      }

      const segmentComparison = await correlationService.compareCorrelationsAcrossSegments(
        segmentData,
        mockExternalFactors,
        request
      )

      expect(segmentComparison.segmentComparisons).toBeDefined()
      expect(segmentComparison.segmentComparisons.length).toBe(2)
      expect(segmentComparison.crossSegmentInsights).toBeDefined()

      // Verify cross-segment insights
      const insights = segmentComparison.crossSegmentInsights
      expect(insights.universalFactors).toBeDefined()
      expect(insights.segmentSpecificFactors).toBeDefined()
      expect(insights.correlationDifferences).toBeDefined()

      // Should identify some universal factors (like weekend effect)
      expect(insights.universalFactors).toContain('is_weekend')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Create larger dataset (1 year of daily data)
      const largeDates = Array.from({ length: 365 }, (_, i) => {
        const date = new Date('2024-01-01')
        date.setDate(date.getDate() + i)
        return date
      })

      const largeValues = largeDates.map((date, index) => {
        const baseValue = 100 + Math.sin((index / 30) * Math.PI) * 20
        const noise = (Math.random() - 0.5) * 10
        return baseValue + noise
      })

      const largeData: TimeSeriesData = {
        timestamps: largeDates,
        values: largeValues,
        clientId: 'large-dataset-client'
      }

      const largeFactors = largeDates.flatMap((date, index) => [
        {
          id: `weekend-${index}`,
          name: 'is_weekend',
          type: 'day_of_week' as const,
          date,
          value: (date.getDay() === 0 || date.getDay() === 6) ? 1 : 0
        },
        {
          id: `month-${index}`,
          name: 'month',
          type: 'seasonal' as const,
          date,
          value: date.getMonth() + 1
        }
      ])

      const request: CorrelationAnalysisRequest = {
        clientId: 'large-dataset-client',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        includeExternalFactors: true,
        significanceLevel: 0.05,
        maxTimeDelay: 7,
        analysisType: 'correlation'
      }

      const startTime = Date.now()
      const result = await correlationService.performCorrelationAnalysis(
        largeData,
        largeFactors,
        request
      )
      const endTime = Date.now()

      expect(result).toBeDefined()
      expect(result.correlations.length).toBeGreaterThan(0)
      expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds
    })

    it('should handle multiple concurrent analyses', async () => {
      const request: CorrelationAnalysisRequest = {
        clientId: 'concurrent-test-client',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        includeExternalFactors: true,
        significanceLevel: 0.05,
        maxTimeDelay: 3,
        analysisType: 'correlation'
      }

      // Run multiple analyses concurrently
      const promises = Array.from({ length: 3 }, () =>
        correlationService.performCorrelationAnalysis(
          mockTranscriptData,
          mockExternalFactors,
          request
        )
      )

      const results = await Promise.all(promises)

      // All should complete successfully
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.correlations.length).toBeGreaterThan(0)
      })

      // Results should be consistent
      const firstResult = results[0]
      results.slice(1).forEach(result => {
        expect(result.correlations.length).toBe(firstResult.correlations.length)
        expect(result.summary.totalFactorsAnalyzed).toBe(firstResult.summary.totalFactorsAnalyzed)
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing external factors gracefully', async () => {
      const request: CorrelationAnalysisRequest = {
        clientId: 'no-factors-client',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        includeExternalFactors: false,
        significanceLevel: 0.05,
        maxTimeDelay: 3,
        analysisType: 'correlation'
      }

      const result = await correlationService.performCorrelationAnalysis(
        mockTranscriptData,
        [],
        request
      )

      expect(result).toBeDefined()
      expect(result.correlations.length).toBe(0)
      expect(result.summary.totalFactorsAnalyzed).toBe(0)
      expect(result.summary.recommendations.length).toBeGreaterThan(0) // Should still provide recommendations
    })

    it('should handle insufficient data gracefully', async () => {
      const smallData: TimeSeriesData = {
        timestamps: [new Date('2024-01-01'), new Date('2024-01-02')],
        values: [100, 110],
        clientId: 'small-data-client'
      }

      const request: CorrelationAnalysisRequest = {
        clientId: 'small-data-client',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        includeExternalFactors: true,
        significanceLevel: 0.05,
        maxTimeDelay: 3,
        analysisType: 'correlation'
      }

      const result = await correlationService.performCorrelationAnalysis(
        smallData,
        mockExternalFactors.slice(0, 5),
        request
      )

      expect(result).toBeDefined()
      // Should handle gracefully without crashing
    })

    it('should handle invalid date ranges', async () => {
      const request: CorrelationAnalysisRequest = {
        clientId: 'invalid-dates-client',
        startDate: new Date('2024-12-31'), // End before start
        endDate: new Date('2024-01-01'),
        includeExternalFactors: true,
        significanceLevel: 0.05,
        maxTimeDelay: 3,
        analysisType: 'correlation'
      }

      // The service should handle invalid date ranges gracefully
      const result = await correlationService.performCorrelationAnalysis(
        mockTranscriptData,
        mockExternalFactors,
        request
      )
      
      // Should return empty results for invalid date range
      expect(result.correlations.length).toBe(0)
    })
  })
})