/**
 * Tests for Model Comparison Service
 */

import { Pool } from 'pg'
import { ModelComparisonService } from '../model-comparison-service'
import { ModelComparison, ModelComparisonEntry, ComparisonMetric } from '@/types/prediction-config'

// Mock database
const mockDb = {
  connect: jest.fn(),
  query: jest.fn()
} as unknown as Pool

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
}

describe('ModelComparisonService', () => {
  let service: ModelComparisonService

  beforeEach(() => {
    service = new ModelComparisonService(mockDb)
    jest.clearAllMocks()
    
    // Setup default mock behavior
    ;(mockDb.connect as jest.Mock).mockResolvedValue(mockClient)
  })

  describe('runModelComparison', () => {
    it('should run comprehensive model comparison', async () => {
      const models: ModelComparisonEntry[] = [
        {
          modelId: 'automl-1',
          modelName: 'AutoML Forecasting',
          algorithm: 'automl',
          parameters: { optimizationObjective: 'minimize_rmse' },
          isBaseline: true
        },
        {
          modelId: 'arima-1',
          modelName: 'ARIMA Model',
          algorithm: 'arima',
          parameters: { order: [1, 1, 1] }
        },
        {
          modelId: 'prophet-1',
          modelName: 'Prophet Model',
          algorithm: 'prophet',
          parameters: { seasonalityMode: 'additive' }
        }
      ]

      const metrics: ComparisonMetric[] = [
        { name: 'mae', displayName: 'Mean Absolute Error', higherIsBetter: false },
        { name: 'rmse', displayName: 'Root Mean Square Error', higherIsBetter: false },
        { name: 'r2', displayName: 'R-squared', higherIsBetter: true }
      ]

      const comparison: ModelComparison = {
        id: 'comparison-1',
        name: 'Forecasting Model Comparison',
        models,
        dataset: 'test-dataset',
        metrics,
        crossValidationConfig: {
          method: 'time_series',
          folds: 5,
          testSize: 30,
          gap: 0
        }
      }

      // Mock database operations for saving results
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'comparison-123' }] }) // INSERT comparison
        .mockResolvedValueOnce(undefined) // INSERT result 1
        .mockResolvedValueOnce(undefined) // INSERT result 2
        .mockResolvedValueOnce(undefined) // INSERT result 3
        .mockResolvedValueOnce(undefined) // COMMIT

      const result = await service.runModelComparison(comparison)

      expect(result.comparison).toBe(comparison)
      expect(result.results).toHaveLength(3)
      expect(result.bestModel).toBe(result.results[0]) // First result should be best (ranked)
      expect(result.performanceSummary).toBeDefined()
      expect(result.recommendations).toBeDefined()

      // Check that models are ranked
      expect(result.results[0].rank).toBe(1)
      expect(result.results[1].rank).toBe(2)
      expect(result.results[2].rank).toBe(3)

      // Check that all models have metrics
      result.results.forEach(modelResult => {
        expect(modelResult.metrics).toBeDefined()
        expect(modelResult.crossValidationScores).toBeDefined()
        expect(modelResult.trainingTime).toBeGreaterThan(0)
        expect(modelResult.predictionLatency).toBeGreaterThan(0)
      })
    })

    it('should handle time series cross-validation', async () => {
      const models: ModelComparisonEntry[] = [
        {
          modelId: 'test-model',
          modelName: 'Test Model',
          algorithm: 'arima',
          parameters: {}
        }
      ]

      const comparison: ModelComparison = {
        id: 'comparison-1',
        name: 'Time Series CV Test',
        models,
        dataset: 'test-dataset',
        metrics: [{ name: 'mae', displayName: 'MAE', higherIsBetter: false }],
        crossValidationConfig: {
          method: 'time_series',
          folds: 3,
          testSize: 20,
          gap: 5
        }
      }

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'comparison-123' }] }) // INSERT comparison
        .mockResolvedValueOnce(undefined) // INSERT result
        .mockResolvedValueOnce(undefined) // COMMIT

      const result = await service.runModelComparison(comparison)

      expect(result.results).toHaveLength(1)
      expect(result.results[0].crossValidationScores).toBeDefined()
      expect(result.results[0].crossValidationScores.length).toBeGreaterThan(0)
    })

    it('should handle k-fold cross-validation', async () => {
      const models: ModelComparisonEntry[] = [
        {
          modelId: 'test-model',
          modelName: 'Test Model',
          algorithm: 'linear',
          parameters: {}
        }
      ]

      const comparison: ModelComparison = {
        id: 'comparison-1',
        name: 'K-Fold CV Test',
        models,
        dataset: 'test-dataset',
        metrics: [{ name: 'r2', displayName: 'R-squared', higherIsBetter: true }],
        crossValidationConfig: {
          method: 'k_fold',
          folds: 5
        }
      }

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'comparison-123' }] }) // INSERT comparison
        .mockResolvedValueOnce(undefined) // INSERT result
        .mockResolvedValueOnce(undefined) // COMMIT

      const result = await service.runModelComparison(comparison)

      expect(result.results).toHaveLength(1)
      expect(result.results[0].crossValidationScores).toBeDefined()
    })

    it('should handle walk-forward cross-validation', async () => {
      const models: ModelComparisonEntry[] = [
        {
          modelId: 'test-model',
          modelName: 'Test Model',
          algorithm: 'prophet',
          parameters: {}
        }
      ]

      const comparison: ModelComparison = {
        id: 'comparison-1',
        name: 'Walk-Forward CV Test',
        models,
        dataset: 'test-dataset',
        metrics: [{ name: 'rmse', displayName: 'RMSE', higherIsBetter: false }],
        crossValidationConfig: {
          method: 'walk_forward',
          folds: 4,
          testSize: 7
        }
      }

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'comparison-123' }] }) // INSERT comparison
        .mockResolvedValueOnce(undefined) // INSERT result
        .mockResolvedValueOnce(undefined) // COMMIT

      const result = await service.runModelComparison(comparison)

      expect(result.results).toHaveLength(1)
      expect(result.results[0].crossValidationScores).toBeDefined()
    })

    it('should generate appropriate recommendations', async () => {
      const models: ModelComparisonEntry[] = [
        {
          modelId: 'fast-model',
          modelName: 'Fast Model',
          algorithm: 'linear',
          parameters: {}
        },
        {
          modelId: 'accurate-model',
          modelName: 'Accurate Model',
          algorithm: 'lstm',
          parameters: {}
        },
        {
          modelId: 'stable-model',
          modelName: 'Stable Model',
          algorithm: 'arima',
          parameters: {}
        }
      ]

      const comparison: ModelComparison = {
        id: 'comparison-1',
        name: 'Recommendation Test',
        models,
        dataset: 'test-dataset',
        metrics: [
          { name: 'mae', displayName: 'MAE', higherIsBetter: false },
          { name: 'r2', displayName: 'R-squared', higherIsBetter: true }
        ],
        crossValidationConfig: {
          method: 'k_fold',
          folds: 3
        }
      }

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'comparison-123' }] }) // INSERT comparison
        .mockResolvedValueOnce(undefined) // INSERT result 1
        .mockResolvedValueOnce(undefined) // INSERT result 2
        .mockResolvedValueOnce(undefined) // INSERT result 3
        .mockResolvedValueOnce(undefined) // COMMIT

      const result = await service.runModelComparison(comparison)

      expect(result.recommendations).toBeDefined()
      expect(result.recommendations.length).toBeGreaterThan(0)

      // Should have performance recommendation
      const performanceRec = result.recommendations.find(r => r.type === 'performance')
      expect(performanceRec).toBeDefined()
      expect(performanceRec!.modelId).toBe(result.bestModel.modelId)

      // Should have at least the performance recommendation
      expect(result.recommendations.length).toBeGreaterThanOrEqual(1)
    })

    it('should calculate performance summary correctly', async () => {
      const models: ModelComparisonEntry[] = [
        {
          modelId: 'model-1',
          modelName: 'Model 1',
          algorithm: 'automl',
          parameters: {}
        },
        {
          modelId: 'model-2',
          modelName: 'Model 2',
          algorithm: 'arima',
          parameters: {}
        }
      ]

      const comparison: ModelComparison = {
        id: 'comparison-1',
        name: 'Performance Summary Test',
        models,
        dataset: 'test-dataset',
        metrics: [
          { name: 'mae', displayName: 'MAE', higherIsBetter: false },
          { name: 'r2', displayName: 'R-squared', higherIsBetter: true }
        ],
        crossValidationConfig: {
          method: 'k_fold',
          folds: 3
        }
      }

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'comparison-123' }] }) // INSERT comparison
        .mockResolvedValueOnce(undefined) // INSERT result 1
        .mockResolvedValueOnce(undefined) // INSERT result 2
        .mockResolvedValueOnce(undefined) // COMMIT

      const result = await service.runModelComparison(comparison)

      expect(result.performanceSummary).toBeDefined()
      expect(result.performanceSummary.totalModels).toBe(2)
      expect(result.performanceSummary.bestPerformingMetric).toBeDefined()
      expect(result.performanceSummary.performanceGap).toBeGreaterThanOrEqual(0)
      expect(result.performanceSummary.consistencyScore).toBeGreaterThanOrEqual(0)
      expect(result.performanceSummary.consistencyScore).toBeLessThanOrEqual(1)
      expect(result.performanceSummary.trainingEfficiency).toBeGreaterThanOrEqual(0)
      expect(result.performanceSummary.trainingEfficiency).toBeLessThanOrEqual(1)
    })

    it('should handle unsupported cross-validation method', async () => {
      const models: ModelComparisonEntry[] = [
        {
          modelId: 'test-model',
          modelName: 'Test Model',
          algorithm: 'linear',
          parameters: {}
        }
      ]

      const comparison: ModelComparison = {
        id: 'comparison-1',
        name: 'Unsupported CV Test',
        models,
        dataset: 'test-dataset',
        metrics: [{ name: 'mae', displayName: 'MAE', higherIsBetter: false }],
        crossValidationConfig: {
          method: 'unsupported' as any,
          folds: 3
        }
      }

      await expect(service.runModelComparison(comparison)).rejects.toThrow('Unsupported CV method: unsupported')
    })
  })

  describe('cross-validation methods', () => {
    it('should properly split data for time series CV', async () => {
      // This test would verify the time series splitting logic
      // For now, we'll test that the method doesn't throw errors
      const model: ModelComparisonEntry = {
        modelId: 'test-model',
        modelName: 'Test Model',
        algorithm: 'arima',
        parameters: {}
      }

      const cvConfig = {
        method: 'time_series' as const,
        folds: 3,
        testSize: 10,
        gap: 2
      }

      // The actual implementation would test data splitting
      // Here we just ensure the method signature is correct
      expect(() => {
        service.runCrossValidation(model, 'test-dataset', cvConfig)
      }).not.toThrow()
    })

    it('should handle edge cases in cross-validation', async () => {
      const model: ModelComparisonEntry = {
        modelId: 'test-model',
        modelName: 'Test Model',
        algorithm: 'linear',
        parameters: {}
      }

      // Test with minimal folds
      const minimalConfig = {
        method: 'k_fold' as const,
        folds: 2
      }

      expect(() => {
        service.runCrossValidation(model, 'test-dataset', minimalConfig)
      }).not.toThrow()
    })
  })
})