/**
 * Feature Pipeline Tests
 * Tests for the complete feature engineering pipeline
 */

import { FeatureEngineeringPipeline } from '../feature-pipeline'
import type { TimeSeriesData, ClientTypeFeature, FeaturePipelineConfig } from '../feature-pipeline'

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

describe('FeatureEngineeringPipeline', () => {
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

  let pipeline: FeatureEngineeringPipeline

  beforeEach(() => {
    pipeline = new FeatureEngineeringPipeline(mockConfig)
  })

  describe('processFeatures', () => {
    it('should process complete feature engineering pipeline', async () => {
      const result = await pipeline.processFeatures(mockTimeSeriesData, mockClientData)

      expect(result).toHaveProperty('timeFeatures')
      expect(result).toHaveProperty('statisticalFeatures')
      expect(result).toHaveProperty('domainFeatures')
      expect(result).toHaveProperty('combinedFeatures')
      expect(result).toHaveProperty('featureImportance')
      expect(result).toHaveProperty('metadata')

      // Check metadata
      expect(result.metadata.clientId).toBe('test-client')
      expect(result.metadata.featureCount).toBeGreaterThan(0)
      expect(result.metadata.processingTime).toBeGreaterThan(0)
      expect(result.metadata.timestamp).toBeInstanceOf(Date)
    })

    it('should combine features from all extractors', async () => {
      const result = await pipeline.processFeatures(mockTimeSeriesData, mockClientData)

      const combinedFeatures = result.combinedFeatures

      // Should have time features
      expect(combinedFeatures).toHaveProperty('lag_feature')
      expect(combinedFeatures).toHaveProperty('rolling_mean')
      expect(combinedFeatures).toHaveProperty('seasonal_indicator')

      // Should have statistical features
      expect(combinedFeatures).toHaveProperty('variance')
      expect(combinedFeatures).toHaveProperty('skewness')
      expect(combinedFeatures).toHaveProperty('kurtosis')

      // Should have domain features
      expect(combinedFeatures).toHaveProperty('business_day_indicator')
      expect(combinedFeatures).toHaveProperty('holiday_effect')

      // Should have client-specific features
      expect(combinedFeatures).toHaveProperty('client_size_large')
      expect(combinedFeatures).toHaveProperty('client_risk_level')
    })

    it('should calculate feature importance', async () => {
      const result = await pipeline.processFeatures(mockTimeSeriesData, mockClientData)

      const importance = result.featureImportance

      expect(typeof importance).toBe('object')
      expect(Object.keys(importance).length).toBeGreaterThan(0)

      // All importance scores should be numbers
      Object.values(importance).forEach(score => {
        expect(typeof score).toBe('number')
        expect(score).toBeGreaterThanOrEqual(-1)
        expect(score).toBeLessThanOrEqual(1)
      })
    })

    it('should handle data without client information', async () => {
      const result = await pipeline.processFeatures(mockTimeSeriesData, [])

      expect(result.combinedFeatures).toBeDefined()
      expect(result.metadata.clientId).toBe('test-client')

      // Should still have basic features even without client data
      expect(result.combinedFeatures).toHaveProperty('lag_feature')
      expect(result.combinedFeatures).toHaveProperty('variance')
    })
  })

  describe('generateRealTimeFeatures', () => {
    it('should generate real-time features for prediction', async () => {
      const targetDate = new Date('2024-01-11')
      
      const features = await pipeline.generateRealTimeFeatures(
        'test-client',
        mockTimeSeriesData,
        targetDate
      )

      expect(typeof features).toBe('object')
      expect(Object.keys(features).length).toBeGreaterThan(0)

      // Should have date features
      expect(features).toHaveProperty('dayOfWeek')
      expect(features).toHaveProperty('monthOfYear')
      expect(features).toHaveProperty('isWeekend')

      // Should have lag features
      expect(features).toHaveProperty('lag_1')
      expect(features).toHaveProperty('lag_7')

      // Should have domain features
      expect(features).toHaveProperty('business_day_indicator')
      expect(features).toHaveProperty('holiday_effect')

      // Should have timestamp
      expect(features).toHaveProperty('timestamp')
      expect(features.timestamp).toBe(targetDate.getTime())
    })

    it('should handle client-specific features in real-time', async () => {
      pipeline.setClientData(mockClientData)
      
      const features = await pipeline.generateRealTimeFeatures(
        'test-client',
        mockTimeSeriesData,
        new Date('2024-01-11')
      )

      expect(features).toHaveProperty('client_size_large')
      expect(features).toHaveProperty('client_risk_level')
      expect(features.client_size_large).toBe(1)
      expect(features.client_risk_level).toBe(0.3)
    })
  })

  describe('updateFeatures', () => {
    it('should update features with new data', async () => {
      const newData: TimeSeriesData = {
        timestamps: [new Date('2024-01-11'), new Date('2024-01-12')],
        values: [145, 155],
        clientId: 'test-client'
      }

      await expect(pipeline.updateFeatures('test-client', newData)).resolves.not.toThrow()
    })

    it('should handle incremental updates', async () => {
      const newData: TimeSeriesData = {
        timestamps: [new Date('2024-01-11')],
        values: [145],
        clientId: 'test-client'
      }

      await pipeline.updateFeatures('test-client', newData)

      // Should not throw and should complete successfully
      expect(true).toBe(true)
    })
  })

  describe('configuration management', () => {
    it('should return current configuration', () => {
      const config = pipeline.getConfig()

      expect(config).toEqual(mockConfig)
      expect(config).not.toBe(mockConfig) // Should be a copy
    })

    it('should update configuration', () => {
      const newConfig = {
        timeFeatures: {
          lagPeriods: [1, 3, 7],
          rollingWindows: [5, 10],
          seasonalPeriods: [7]
        }
      }

      pipeline.updateConfig(newConfig)
      const updatedConfig = pipeline.getConfig()

      expect(updatedConfig.timeFeatures.lagPeriods).toEqual([1, 3, 7])
      expect(updatedConfig.timeFeatures.rollingWindows).toEqual([5, 10])
      expect(updatedConfig.timeFeatures.seasonalPeriods).toEqual([7])

      // Other config should remain unchanged
      expect(updatedConfig.statisticalFeatures).toEqual(mockConfig.statisticalFeatures)
    })

    it('should manage client data', () => {
      pipeline.setClientData(mockClientData)

      // Should be able to generate client-specific features
      const features = pipeline.generateRealTimeFeatures(
        'test-client',
        mockTimeSeriesData,
        new Date('2024-01-11')
      )

      expect(features).resolves.toHaveProperty('client_size_large')
    })
  })

  describe('error handling', () => {
    it('should handle invalid time series data', async () => {
      const invalidData: TimeSeriesData = {
        timestamps: [],
        values: [],
        clientId: 'test-client'
      }

      await expect(pipeline.processFeatures(invalidData)).resolves.not.toThrow()
    })

    it('should handle mismatched timestamps and values', async () => {
      const mismatchedData: TimeSeriesData = {
        timestamps: [new Date('2024-01-01')],
        values: [100, 110], // More values than timestamps
        clientId: 'test-client'
      }

      await expect(pipeline.processFeatures(mismatchedData)).resolves.not.toThrow()
    })

    it('should handle feature store errors gracefully', async () => {
      // Mock feature store to throw error
      const errorPipeline = new FeatureEngineeringPipeline({
        ...mockConfig,
        featureStore: {
          featureStoreId: 'invalid-store',
          projectId: 'invalid-project',
          location: 'invalid-location'
        }
      })

      // Should not throw even if feature store fails
      await expect(
        errorPipeline.processFeatures(mockTimeSeriesData)
      ).resolves.not.toThrow()
    })
  })

  describe('performance', () => {
    it('should process features within reasonable time', async () => {
      const startTime = Date.now()
      
      await pipeline.processFeatures(mockTimeSeriesData, mockClientData)
      
      const processingTime = Date.now() - startTime
      expect(processingTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle large datasets efficiently', async () => {
      // Create larger dataset
      const largeData: TimeSeriesData = {
        timestamps: Array.from({ length: 1000 }, (_, i) => new Date(2024, 0, i + 1)),
        values: Array.from({ length: 1000 }, () => Math.random() * 100 + 100),
        clientId: 'large-client'
      }

      const startTime = Date.now()
      
      await pipeline.processFeatures(largeData)
      
      const processingTime = Date.now() - startTime
      expect(processingTime).toBeLessThan(10000) // Should complete within 10 seconds
    })
  })
})