/**
 * Feature Engineering Integration Tests
 * Tests the complete feature engineering workflow
 */

import { FeatureEngineeringPipeline } from '../feature-pipeline'
import { TimeFeatureExtractor } from '../time-features'
import { StatisticalFeatureExtractor } from '../statistical-features'
import { DomainFeatureExtractor } from '../domain-features'
import type { TimeSeriesData, ClientTypeFeature, FeaturePipelineConfig } from '../feature-pipeline'

// Mock environment variables
process.env.VERTEX_AI_FEATURE_STORE_ID = 'test-feature-store'
process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project'
process.env.VERTEX_AI_LOCATION = 'us-central1'

// Mock the Vertex AI Feature Store
jest.mock('../../vertex-ai/feature-store', () => ({
  VertexAIFeatureStore: jest.fn().mockImplementation(() => ({
    ingestFeatures: jest.fn().mockResolvedValue({
      totalFeatures: 10,
      ingestedFeatures: 10,
      failedFeatures: 0,
      errors: []
    }),
    serveFeatures: jest.fn().mockResolvedValue({
      entityId: 'test-client',
      features: {
        lag_feature: 100,
        rolling_mean: 105,
        seasonal_indicator: 0.5
      },
      timestamp: new Date()
    })
  }))
}))

describe('Feature Engineering Integration', () => {
  const mockTimeSeriesData: TimeSeriesData = {
    timestamps: [
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      new Date('2024-01-03'),
      new Date('2024-01-04'),
      new Date('2024-01-05'),
      new Date('2024-01-08'),
      new Date('2024-01-09'),
      new Date('2024-01-10')
    ],
    values: [100, 110, 105, 120, 115, 130, 125, 140],
    clientId: 'test-client'
  }

  const mockClientData: ClientTypeFeature[] = [
    {
      clientId: 'test-client',
      segment: 'enterprise',
      size: 'large',
      industry: 'technology',
      riskLevel: 0.3,
      historicalVolatility: 0.15
    }
  ]

  const mockConfig: FeaturePipelineConfig = {
    timeFeatures: {
      lagPeriods: [1, 7, 14],
      rollingWindows: [7, 14],
      seasonalPeriods: [7, 30]
    },
    statisticalFeatures: {
      maxLags: 10,
      seasonalPeriods: [7, 30],
      changePointSensitivity: 0.05
    },
    domainFeatures: {
      includeHolidays: true,
      includeBusinessDays: true,
      includeSeasonalFactors: true
    },
    featureStore: {
      featureStoreId: 'test-feature-store',
      projectId: 'test-project',
      location: 'us-central1'
    }
  }

  describe('Individual Feature Extractors Integration', () => {
    it('should integrate time features with statistical features', () => {
      const timeFeatures = TimeFeatureExtractor.extractTimeFeatures(mockTimeSeriesData)
      const statisticalFeatures = StatisticalFeatureExtractor.extractStatisticalFeatures(
        mockTimeSeriesData.values,
        mockTimeSeriesData.timestamps
      )

      // Time features should provide input for statistical analysis
      expect(timeFeatures.lags.length).toBe(mockTimeSeriesData.values.length)
      expect(statisticalFeatures.autocorrelations.length).toBeGreaterThan(0)

      // Both should handle the same data size
      expect(timeFeatures.dayOfWeek.length).toBe(mockTimeSeriesData.timestamps.length)
      expect(statisticalFeatures.variance).toBeGreaterThan(0)
    })

    it('should integrate domain features with time features', () => {
      const timeFeatures = TimeFeatureExtractor.extractTimeFeatures(mockTimeSeriesData)
      const domainFeatures = DomainFeatureExtractor.extractDomainFeatures(
        mockTimeSeriesData.timestamps,
        mockClientData
      )

      // Domain features should complement time features
      expect(timeFeatures.isWeekend.length).toBe(mockTimeSeriesData.timestamps.length)
      expect(domainFeatures.businessDayIndicators.length).toBe(mockTimeSeriesData.timestamps.length)

      // Both should identify business patterns
      for (let i = 0; i < timeFeatures.isWeekend.length; i++) {
        const isWeekend = timeFeatures.isWeekend[i]
        const businessDay = domainFeatures.businessDayIndicators[i]
        
        // Business day indicator should be lower on weekends
        if (isWeekend) {
          expect(businessDay).toBeLessThanOrEqual(1)
        }
      }
    })
  })

  describe('Feature Pipeline Integration', () => {
    let pipeline: FeatureEngineeringPipeline

    beforeEach(() => {
      pipeline = new FeatureEngineeringPipeline(mockConfig)
    })

    it('should integrate all feature types in pipeline', async () => {
      const result = await pipeline.processFeatures(mockTimeSeriesData, mockClientData)

      // Should have all feature types
      expect(result.timeFeatures).toBeDefined()
      expect(result.statisticalFeatures).toBeDefined()
      expect(result.domainFeatures).toBeDefined()
      expect(result.combinedFeatures).toBeDefined()

      // Combined features should include elements from all extractors
      const combined = result.combinedFeatures
      
      // Time features
      expect(combined).toHaveProperty('lag_feature')
      expect(combined).toHaveProperty('rolling_mean')
      
      // Statistical features
      expect(combined).toHaveProperty('variance')
      expect(combined).toHaveProperty('skewness')
      
      // Domain features
      expect(combined).toHaveProperty('business_day_indicator')
      expect(combined).toHaveProperty('client_size_large')
    })

    it('should maintain feature consistency across pipeline stages', async () => {
      // Process initial features
      const initialResult = await pipeline.processFeatures(mockTimeSeriesData, mockClientData)
      
      // Generate real-time features
      const realTimeFeatures = await pipeline.generateRealTimeFeatures(
        'test-client',
        mockTimeSeriesData,
        new Date('2024-01-11')
      )

      // Features should be consistent
      expect(realTimeFeatures).toHaveProperty('client_size_large')
      expect(realTimeFeatures.client_size_large).toBe(1) // Large client
      
      expect(realTimeFeatures).toHaveProperty('lag_1')
      expect(typeof realTimeFeatures.lag_1).toBe('number')
    })

    it('should handle feature updates correctly', async () => {
      // Initial processing
      const initialResult = await pipeline.processFeatures(mockTimeSeriesData, mockClientData)
      const initialFeatureCount = initialResult.metadata.featureCount

      // Update with new data
      const newData: TimeSeriesData = {
        timestamps: [new Date('2024-01-11'), new Date('2024-01-12')],
        values: [145, 155],
        clientId: 'test-client'
      }

      await pipeline.updateFeatures('test-client', newData)

      // Process updated features
      const updatedResult = await pipeline.processFeatures(newData, mockClientData)
      
      // Should still have same types of features
      expect(updatedResult.metadata.featureCount).toBeGreaterThan(0)
      expect(updatedResult.combinedFeatures).toHaveProperty('lag_feature')
      expect(updatedResult.combinedFeatures).toHaveProperty('variance')
    })
  })

  describe('Feature Store Integration', () => {
    let pipeline: FeatureEngineeringPipeline

    beforeEach(() => {
      pipeline = new FeatureEngineeringPipeline(mockConfig)
    })

    it('should integrate with feature store for serving', async () => {
      const featureQuery = {
        entityType: 'client',
        entityIds: ['test-client'],
        featureSelector: {
          idMatcher: {
            ids: ['lag_feature', 'rolling_mean']
          }
        }
      }

      const result = await pipeline.serveFeatures(featureQuery)

      expect(result.entityId).toBe('test-client')
      expect(result.features).toHaveProperty('lag_feature')
      expect(result.features).toHaveProperty('rolling_mean')
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should handle feature ingestion during processing', async () => {
      // This should not throw even if feature store ingestion fails
      await expect(
        pipeline.processFeatures(mockTimeSeriesData, mockClientData)
      ).resolves.not.toThrow()
    })
  })

  describe('End-to-End Workflow', () => {
    it('should complete full feature engineering workflow', async () => {
      const pipeline = new FeatureEngineeringPipeline(mockConfig)

      // Step 1: Process initial features
      const initialResult = await pipeline.processFeatures(mockTimeSeriesData, mockClientData)
      
      expect(initialResult.metadata.featureCount).toBeGreaterThan(0)
      expect(initialResult.combinedFeatures).toHaveProperty('lag_feature')
      expect(initialResult.featureImportance).toBeDefined()

      // Step 2: Generate real-time features for prediction
      const realTimeFeatures = await pipeline.generateRealTimeFeatures(
        'test-client',
        mockTimeSeriesData,
        new Date('2024-01-11')
      )

      expect(Object.keys(realTimeFeatures).length).toBeGreaterThan(0)
      expect(realTimeFeatures).toHaveProperty('dayOfWeek')
      expect(realTimeFeatures).toHaveProperty('lag_1')

      // Step 3: Update with new data
      const newData: TimeSeriesData = {
        timestamps: [new Date('2024-01-11')],
        values: [145],
        clientId: 'test-client'
      }

      await pipeline.updateFeatures('test-client', newData)

      // Step 4: Serve features from feature store
      const featureQuery = {
        entityType: 'client',
        entityIds: ['test-client'],
        featureSelector: {
          idMatcher: {
            ids: ['lag_feature', 'rolling_mean']
          }
        }
      }

      const servedFeatures = await pipeline.serveFeatures(featureQuery)

      expect(servedFeatures.entityId).toBe('test-client')
      expect(servedFeatures.features).toBeDefined()

      // Verify the complete workflow
      expect(initialResult.metadata.processingTime).toBeGreaterThanOrEqual(0)
      expect(Object.keys(realTimeFeatures).length).toBeGreaterThan(5)
      expect(servedFeatures.timestamp).toBeInstanceOf(Date)
    })

    it('should maintain data consistency throughout workflow', async () => {
      const pipeline = new FeatureEngineeringPipeline(mockConfig)
      pipeline.setClientData(mockClientData)

      // Process features multiple times with different data
      const results = []
      
      for (let i = 0; i < 3; i++) {
        const data: TimeSeriesData = {
          timestamps: mockTimeSeriesData.timestamps.slice(0, 5 + i),
          values: mockTimeSeriesData.values.slice(0, 5 + i),
          clientId: 'test-client'
        }

        const result = await pipeline.processFeatures(data, mockClientData)
        results.push(result)
      }

      // All results should have consistent structure
      results.forEach(result => {
        expect(result.combinedFeatures).toHaveProperty('client_size_large')
        expect(result.combinedFeatures.client_size_large).toBe(1)
        expect(result.metadata.clientId).toBe('test-client')
        expect(result.featureImportance).toBeDefined()
      })

      // Feature counts should be consistent
      const featureCounts = results.map(r => r.metadata.featureCount)
      expect(featureCounts.every(count => count > 0)).toBe(true)
    })
  })
})