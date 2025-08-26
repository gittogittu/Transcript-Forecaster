/**
 * Integration tests for enhanced prediction functionality
 */

import { PredictionService } from '../prediction-service'
import { TranscriptData, PredictionRequest } from '@/types/transcript'

// Mock TensorFlow.js with working implementation
jest.mock('@tensorflow/tfjs', () => ({
  setBackend: jest.fn().mockResolvedValue(undefined),
  ready: jest.fn().mockResolvedValue(undefined),
  getBackend: jest.fn().mockReturnValue('webgl'),
  sequential: jest.fn().mockReturnValue({
    compile: jest.fn(),
    fit: jest.fn().mockResolvedValue({ history: {} }),
    predict: jest.fn().mockReturnValue({
      data: jest.fn().mockResolvedValue([0.5]),
      dispose: jest.fn()
    }),
    dispose: jest.fn()
  }),
  layers: {
    dense: jest.fn().mockReturnValue({}),
    dropout: jest.fn().mockReturnValue({})
  },
  train: {
    adam: jest.fn().mockReturnValue({})
  },
  regularizers: {
    l2: jest.fn().mockReturnValue({})
  },
  tensor2d: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    shape: [5, 3]
  }),
  tensor1d: jest.fn().mockReturnValue({
    dispose: jest.fn(),
    data: jest.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5])
  }),
  memory: jest.fn().mockReturnValue({ numTensors: 0, numBytes: 0 })
}))

// Mock data preprocessing functions with working implementations
jest.mock('@/lib/utils/data-preprocessing', () => ({
  convertToTimeSeries: jest.fn().mockImplementation((data) => 
    data.map((item: any) => ({
      timestamp: new Date(`${item.month}-01`).getTime(),
      value: item.transcriptCount,
      month: item.month,
      year: item.year
    })).sort((a: any, b: any) => a.timestamp - b.timestamp)
  ),
  groupByClient: jest.fn().mockImplementation((data) => {
    const grouped = new Map()
    data.forEach((item: any) => {
      if (!grouped.has(item.clientName)) {
        grouped.set(item.clientName, [])
      }
      grouped.get(item.clientName).push({
        timestamp: new Date(`${item.month}-01`).getTime(),
        value: item.transcriptCount,
        month: item.month,
        year: item.year
      })
    })
    return grouped
  }),
  prepareForTraining: jest.fn().mockReturnValue({
    trainFeatures: [[0.1, 0.2, 0.3, 1, 2023, 0.1], [0.2, 0.3, 0.4, 2, 2023, 0.1]],
    trainTargets: [0.4, 0.5],
    testFeatures: [[0.3, 0.4, 0.5, 3, 2023, 0.1]],
    testTargets: [0.6],
    scaleParams: { min: 80, max: 130, mean: 105, std: 15 }
  }),
  validateDataQuality: jest.fn().mockReturnValue({
    isValid: true,
    issues: [],
    recommendations: []
  }),
  denormalizeData: jest.fn().mockImplementation((normalized, scaleParams) => 
    normalized.map(val => val * (scaleParams.max - scaleParams.min) + scaleParams.min)
  ),
  createFeatureMatrix: jest.fn().mockReturnValue({
    features: [[0.1, 0.2, 0.3, 1, 2023, 0.1], [0.2, 0.3, 0.4, 2, 2023, 0.1]],
    targets: [0.4, 0.5]
  })
}))

// Mock data for testing
const mockTranscriptData: TranscriptData[] = [
  {
    id: '1',
    clientName: 'Client A',
    month: '2023-01',
    year: 2023,
    transcriptCount: 100,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  {
    id: '2',
    clientName: 'Client A',
    month: '2023-02',
    year: 2023,
    transcriptCount: 110,
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-01')
  },
  {
    id: '3',
    clientName: 'Client A',
    month: '2023-03',
    year: 2023,
    transcriptCount: 120,
    createdAt: new Date('2023-03-01'),
    updatedAt: new Date('2023-03-01')
  },
  {
    id: '4',
    clientName: 'Client A',
    month: '2023-04',
    year: 2023,
    transcriptCount: 115,
    createdAt: new Date('2023-04-01'),
    updatedAt: new Date('2023-04-01')
  },
  {
    id: '5',
    clientName: 'Client A',
    month: '2023-05',
    year: 2023,
    transcriptCount: 125,
    createdAt: new Date('2023-05-01'),
    updatedAt: new Date('2023-05-01')
  },
  {
    id: '6',
    clientName: 'Client A',
    month: '2023-06',
    year: 2023,
    transcriptCount: 130,
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2023-06-01')
  },
  {
    id: '7',
    clientName: 'Client B',
    month: '2023-01',
    year: 2023,
    transcriptCount: 80,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  {
    id: '8',
    clientName: 'Client B',
    month: '2023-02',
    year: 2023,
    transcriptCount: 85,
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-01')
  },
  {
    id: '9',
    clientName: 'Client B',
    month: '2023-03',
    year: 2023,
    transcriptCount: 90,
    createdAt: new Date('2023-03-01'),
    updatedAt: new Date('2023-03-01')
  },
  {
    id: '10',
    clientName: 'Client B',
    month: '2023-04',
    year: 2023,
    transcriptCount: 95,
    createdAt: new Date('2023-04-01'),
    updatedAt: new Date('2023-04-01')
  },
  {
    id: '11',
    clientName: 'Client B',
    month: '2023-05',
    year: 2023,
    transcriptCount: 88,
    createdAt: new Date('2023-05-01'),
    updatedAt: new Date('2023-05-01')
  },
  {
    id: '12',
    clientName: 'Client B',
    month: '2023-06',
    year: 2023,
    transcriptCount: 92,
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2023-06-01')
  }
]

describe('Enhanced Prediction Service Integration', () => {
  let predictionService: PredictionService
  
  beforeEach(() => {
    predictionService = new PredictionService()
    jest.clearAllMocks()
  })

  afterEach(() => {
    predictionService.dispose()
  })

  describe('Enhanced Model Training', () => {
    it('should train model with hyperparameter optimization', async () => {
      const result = await predictionService.trainModelWithOptimization('Client A', mockTranscriptData, 'linear')
      
      expect(result).toBeDefined()
      expect(result.modelType).toBe('linear')
      expect(result.metrics).toBeDefined()
      expect(result.trainedAt).toBeInstanceOf(Date)
      expect(result.windowSize).toBeGreaterThan(0)
    })

    it('should perform batch training for multiple clients', async () => {
      const trainedModels = await predictionService.batchTrainModels(mockTranscriptData, 'linear', false)
      
      expect(trainedModels.size).toBe(2)
      expect(trainedModels.has('Client A')).toBe(true)
      expect(trainedModels.has('Client B')).toBe(true)
      
      trainedModels.forEach(model => {
        expect(model.modelType).toBe('linear')
        expect(model.metrics).toBeDefined()
      })
    })

    it('should perform batch training with optimization', async () => {
      const trainedModels = await predictionService.batchTrainModels(mockTranscriptData, 'polynomial', true)
      
      expect(trainedModels.size).toBe(2)
      trainedModels.forEach(model => {
        expect(model.modelType).toBe('polynomial')
        expect(model.metrics).toBeDefined()
      })
    })
  })

  describe('Enhanced Prediction Generation', () => {
    it('should generate predictions with improved confidence intervals', async () => {
      const request: PredictionRequest = {
        clientName: 'Client A',
        monthsAhead: 3,
        modelType: 'linear'
      }
      
      const result = await predictionService.generatePredictions('Client A', mockTranscriptData, request)
      
      expect(result).toBeDefined()
      expect(result.clientName).toBe('Client A')
      expect(result.predictions).toHaveLength(3)
      expect(result.model).toBe('linear')
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.accuracy).toBeGreaterThan(-1)
      expect(result.generatedAt).toBeInstanceOf(Date)

      // Check that confidence intervals are reasonable
      result.predictions.forEach((prediction, index) => {
        expect(prediction.confidenceInterval.lower).toBeLessThanOrEqual(prediction.predictedCount)
        expect(prediction.confidenceInterval.upper).toBeGreaterThanOrEqual(prediction.predictedCount)
        expect(prediction.month).toMatch(/^\d{4}-\d{2}$/)
        expect(prediction.year).toBeGreaterThan(2022)
        
        // Confidence intervals should generally increase with prediction horizon
        if (index > 0) {
          const currentRange = prediction.confidenceInterval.upper - prediction.confidenceInterval.lower
          const previousRange = result.predictions[index - 1].confidenceInterval.upper - 
                               result.predictions[index - 1].confidenceInterval.lower
          expect(currentRange).toBeGreaterThanOrEqual(previousRange * 0.8) // Allow some variance
        }
      })
    })

    it('should handle intelligent cache TTL based on model accuracy', async () => {
      const request: PredictionRequest = {
        clientName: 'Client A',
        monthsAhead: 12, // Long prediction horizon
        modelType: 'linear'
      }
      
      // Generate prediction (will be cached)
      const result1 = await predictionService.generatePredictions('Client A', mockTranscriptData, request)
      
      // Get cache stats
      const cacheStats = predictionService.getCacheStats()
      expect(cacheStats.size).toBe(1)
      
      // Second call should return cached result
      const result2 = await predictionService.generatePredictions('Client A', mockTranscriptData, request)
      expect(result1.generatedAt).toEqual(result2.generatedAt)
    })

    it('should generate predictions for all clients with improved performance', async () => {
      const request = {
        monthsAhead: 2,
        modelType: 'linear' as const
      }
      
      const startTime = Date.now()
      const results = await predictionService.generateAllPredictions(mockTranscriptData, request)
      const endTime = Date.now()
      
      expect(results).toHaveLength(2)
      expect(results.find(r => r.clientName === 'Client A')).toBeDefined()
      expect(results.find(r => r.clientName === 'Client B')).toBeDefined()
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })

  describe('Enhanced Model Validation', () => {
    it('should validate trained model with comprehensive metrics', async () => {
      await predictionService.trainModel('Client A', mockTranscriptData, 'linear')
      
      const validation = await predictionService.validateModel('Client A', mockTranscriptData, predictionService.getModelInfo('Client A')!)
      
      expect(validation).toBeDefined()
      expect(typeof validation.isValid).toBe('boolean')
      expect(typeof validation.accuracy).toBe('number')
      expect(typeof validation.crossValidationScore).toBe('number')
      expect(validation.residualAnalysis).toBeDefined()
      expect(validation.residualAnalysis.mean).toBeDefined()
      expect(validation.residualAnalysis.standardDeviation).toBeDefined()
      expect(validation.residualAnalysis.skewness).toBeDefined()
      expect(validation.residualAnalysis.kurtosis).toBeDefined()
      expect(Array.isArray(validation.recommendations)).toBe(true)
    })

    it('should generate comprehensive performance report', async () => {
      await predictionService.trainModel('Client A', mockTranscriptData, 'linear')
      
      const report = await predictionService.getModelPerformanceReport('Client A', mockTranscriptData)
      
      expect(report.modelInfo).toBeDefined()
      expect(report.validation).toBeDefined()
      expect(report.dataQuality).toBeDefined()
      expect(Array.isArray(report.recommendations)).toBe(true)
      
      // Check that recommendations are meaningful
      expect(report.recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('Performance Optimization', () => {
    it('should handle memory management properly', () => {
      const memoryInfo = predictionService.getMemoryInfo()
      expect(memoryInfo).toBeDefined()
      expect(typeof memoryInfo.numTensors).toBe('number')
      expect(typeof memoryInfo.numBytes).toBe('number')
    })

    it('should dispose resources properly', () => {
      predictionService.dispose()
      
      // Verify that models are cleared
      expect(predictionService.getModelInfo('Client A')).toBeNull()
      
      // Verify that cache is cleared
      const cacheStats = predictionService.getCacheStats()
      expect(cacheStats.size).toBe(0)
    })

    it('should invalidate cache for specific client', async () => {
      const request: PredictionRequest = {
        clientName: 'Client A',
        monthsAhead: 3,
        modelType: 'linear'
      }
      
      await predictionService.generatePredictions('Client A', mockTranscriptData, request)
      
      predictionService.invalidateClientCache('Client A')
      
      const cacheStats = predictionService.getCacheStats()
      expect(cacheStats.size).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle insufficient data for optimization gracefully', async () => {
      const insufficientData = mockTranscriptData.slice(0, 3)
      
      // Should fallback to regular training
      const result = await predictionService.trainModelWithOptimization('Client A', insufficientData, 'linear')
      
      expect(result).toBeDefined()
      expect(result.modelType).toBe('linear')
    })

    it('should handle batch training failures gracefully', async () => {
      const multiClientData = [
        ...mockTranscriptData,
        // Add client with insufficient data
        {
          id: '13',
          clientName: 'Client C',
          month: '2023-01',
          year: 2023,
          transcriptCount: 50,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01')
        }
      ]
      
      const trainedModels = await predictionService.batchTrainModels(multiClientData, 'linear', false)
      
      // Should still train models for clients with sufficient data
      expect(trainedModels.has('Client A')).toBe(true)
      expect(trainedModels.has('Client B')).toBe(true)
      // Client C might not be trained due to insufficient data
    })
  })
})