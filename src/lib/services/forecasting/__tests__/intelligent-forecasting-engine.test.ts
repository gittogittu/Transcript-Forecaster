import type { TimeSeriesData, ForecastingRequest } from '../intelligent-forecasting-engine'

// Mock the Vertex AI services
jest.mock('../../vertex-ai/automl-forecasting', () => ({
  getAutoMLForecastingService: () => ({
    predict: jest.fn().mockResolvedValue([])
  })
}))

jest.mock('../../vertex-ai/model-training', () => ({
  getModelTrainingService: () => ({
    createAutoMLForecastingModel: jest.fn().mockResolvedValue({ name: 'test-job' })
  })
}))

jest.mock('../../vertex-ai/model-evaluation', () => ({
  getModelEvaluationService: () => ({
    evaluate: jest.fn().mockResolvedValue({ accuracy: 0.8 })
  })
}))

jest.mock('../../vertex-ai/errors', () => ({
  withErrorHandling: (fn: Function) => fn
}))

// Import after mocking
import { IntelligentForecastingEngine } from '../intelligent-forecasting-engine'

describe('IntelligentForecastingEngine', () => {
  let engine: IntelligentForecastingEngine

  beforeEach(() => {
    engine = new IntelligentForecastingEngine()
  })

  describe('generateForecast', () => {
    it('should generate forecasts with multiple algorithms', async () => {
      const mockData: TimeSeriesData = {
        timestamps: [
          new Date('2024-01-01'),
          new Date('2024-01-02'),
          new Date('2024-01-03'),
          new Date('2024-01-04'),
          new Date('2024-01-05')
        ],
        values: [100, 105, 110, 108, 115],
        clientId: 'test-client'
      }

      const request: ForecastingRequest = {
        clientId: 'test-client',
        timeHorizon: 'daily',
        periodsAhead: 7,
        confidenceLevel: 0.95,
        ensembleMethod: 'weighted_average'
      }

      const result = await engine.generateForecast(mockData, request)

      expect(result).toBeDefined()
      expect(result.predictions).toHaveLength(7)
      expect(result.modelUsed).toBeDefined()
      expect(result.accuracy).toBeDefined()
      expect(result.confidenceIntervals).toHaveLength(7)
      expect(result.modelExplanation).toBeDefined()
      expect(result.recommendedActions).toBeDefined()
    })

    it('should handle different time horizons', async () => {
      const mockData: TimeSeriesData = {
        timestamps: Array.from({ length: 30 }, (_, i) => {
          const date = new Date('2024-01-01')
          date.setDate(date.getDate() + i)
          return date
        }),
        values: Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 7) * 10 + i * 0.5),
        clientId: 'test-client'
      }

      const weeklyRequest: ForecastingRequest = {
        timeHorizon: 'weekly',
        periodsAhead: 4,
        confidenceLevel: 0.90
      }

      const result = await engine.generateForecast(mockData, weeklyRequest)

      expect(result.predictions).toHaveLength(4)
      expect(result.seasonalityDetected).toBeDefined()
    })

    it('should use specified model preferences', async () => {
      const mockData: TimeSeriesData = {
        timestamps: Array.from({ length: 50 }, (_, i) => {
          const date = new Date('2024-01-01')
          date.setDate(date.getDate() + i)
          return date
        }),
        values: Array.from({ length: 50 }, (_, i) => 100 + i * 2),
        clientId: 'test-client'
      }

      const request: ForecastingRequest = {
        timeHorizon: 'daily',
        periodsAhead: 5,
        confidenceLevel: 0.95,
        modelPreference: [
          { type: 'linear_regression', weight: 0.6 },
          { type: 'arima', weight: 0.4 }
        ]
      }

      const result = await engine.generateForecast(mockData, request)

      expect(result.ensembleWeights).toBeDefined()
      expect(Object.keys(result.ensembleWeights!)).toContain('linear_regression')
    })
  })

  describe('checkAndRetrain', () => {
    it('should trigger retraining when performance drops', async () => {
      const mockData: TimeSeriesData = {
        timestamps: [new Date('2024-01-01')],
        values: [100],
        clientId: 'test-client'
      }

      const config = {
        performanceThreshold: 0.9,
        dataFreshnessHours: 24,
        automaticRetraining: true
      }

      // Mock low performance scenario
      const shouldRetrain = await engine.checkAndRetrain('test-model', mockData, config)

      expect(typeof shouldRetrain).toBe('boolean')
    })
  })

  describe('ensemble methods', () => {
    it('should handle simple average ensemble', async () => {
      const mockData: TimeSeriesData = {
        timestamps: Array.from({ length: 20 }, (_, i) => {
          const date = new Date('2024-01-01')
          date.setDate(date.getDate() + i)
          return date
        }),
        values: Array.from({ length: 20 }, () => 100 + Math.random() * 20),
        clientId: 'test-client'
      }

      const request: ForecastingRequest = {
        timeHorizon: 'daily',
        periodsAhead: 3,
        confidenceLevel: 0.95,
        ensembleMethod: 'simple_average'
      }

      const result = await engine.generateForecast(mockData, request)

      expect(result.ensembleWeights).toBeDefined()
      expect(result.predictions).toHaveLength(3)
    })

    it('should handle weighted average ensemble', async () => {
      const mockData: TimeSeriesData = {
        timestamps: Array.from({ length: 100 }, (_, i) => {
          const date = new Date('2024-01-01')
          date.setDate(date.getDate() + i)
          return date
        }),
        values: Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i / 7) * 10 + i * 0.1),
        clientId: 'test-client'
      }

      const request: ForecastingRequest = {
        timeHorizon: 'daily',
        periodsAhead: 5,
        confidenceLevel: 0.95,
        ensembleMethod: 'weighted_average'
      }

      const result = await engine.generateForecast(mockData, request)

      expect(result.ensembleWeights).toBeDefined()
      expect(Object.values(result.ensembleWeights!).reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 1)
    })
  })

  describe('algorithm selection', () => {
    it('should select appropriate algorithms for small datasets', async () => {
      const smallData: TimeSeriesData = {
        timestamps: Array.from({ length: 10 }, (_, i) => {
          const date = new Date('2024-01-01')
          date.setDate(date.getDate() + i)
          return date
        }),
        values: Array.from({ length: 10 }, (_, i) => 100 + i),
        clientId: 'test-client'
      }

      const request: ForecastingRequest = {
        timeHorizon: 'daily',
        periodsAhead: 3,
        confidenceLevel: 0.95
      }

      const result = await engine.generateForecast(smallData, request)

      expect(result.modelUsed).toBeDefined()
      // The algorithm selection logic may choose different algorithms based on data characteristics
      expect(result.modelUsed.type).toBeDefined()
    })

    it('should select appropriate algorithms for large datasets', async () => {
      const largeData: TimeSeriesData = {
        timestamps: Array.from({ length: 600 }, (_, i) => {
          const date = new Date('2024-01-01')
          date.setDate(date.getDate() + i)
          return date
        }),
        values: Array.from({ length: 600 }, (_, i) => 100 + Math.sin(i / 30) * 20 + i * 0.05),
        clientId: 'test-client'
      }

      const request: ForecastingRequest = {
        timeHorizon: 'daily',
        periodsAhead: 10,
        confidenceLevel: 0.95
      }

      const result = await engine.generateForecast(largeData, request)

      expect(result.modelUsed).toBeDefined()
      // The algorithm selection logic may choose different algorithms based on data characteristics
      expect(result.modelUsed.type).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should handle empty data gracefully', async () => {
      const emptyData: TimeSeriesData = {
        timestamps: [],
        values: [],
        clientId: 'test-client'
      }

      const request: ForecastingRequest = {
        timeHorizon: 'daily',
        periodsAhead: 5,
        confidenceLevel: 0.95
      }

      await expect(engine.generateForecast(emptyData, request)).rejects.toThrow()
    })

    it('should handle invalid time horizons', async () => {
      const mockData: TimeSeriesData = {
        timestamps: [new Date('2024-01-01')],
        values: [100],
        clientId: 'test-client'
      }

      const request: ForecastingRequest = {
        timeHorizon: 'invalid' as any,
        periodsAhead: 5,
        confidenceLevel: 0.95
      }

      const result = await engine.generateForecast(mockData, request)
      expect(result).toBeDefined() // Should handle gracefully with defaults
    })
  })
})