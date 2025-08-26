/**
 * Unit tests for PredictionService
 */

import { PredictionService } from '../prediction-service'
import { TranscriptData, PredictionRequest } from '@/types/transcript'

// Mock TensorFlow.js
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

// Mock data preprocessing functions
jest.mock('@/lib/utils/data-preprocessing', () => ({
  convertToTimeSeries: jest.fn().mockReturnValue([
    { timestamp: 1672531200000, value: 100, month: '2023-01', year: 2023 },
    { timestamp: 1675209600000, value: 110, month: '2023-02', year: 2023 },
    { timestamp: 1677628800000, value: 120, month: '2023-03', year: 2023 },
    { timestamp: 1680307200000, value: 115, month: '2023-04', year: 2023 },
    { timestamp: 1682899200000, value: 125, month: '2023-05', year: 2023 },
    { timestamp: 1685577600000, value: 130, month: '2023-06', year: 2023 }
  ]),
  groupByClient: jest.fn().mockReturnValue(new Map([
    ['Client A', [
      { timestamp: 1672531200000, value: 100, month: '2023-01', year: 2023 },
      { timestamp: 1675209600000, value: 110, month: '2023-02', year: 2023 }
    ]],
    ['Client B', [
      { timestamp: 1672531200000, value: 80, month: '2023-01', year: 2023 },
      { timestamp: 1675209600000, value: 90, month: '2023-02', year: 2023 }
    ]]
  ])),
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
  }
]

describe('PredictionService', () => {
  let predictionService: PredictionService
  
  beforeEach(() => {
    predictionService = new PredictionService()
    jest.clearAllMocks()
  })

  afterEach(() => {
    predictionService.dispose()
  })

  describe('initialization', () => {
    it('should initialize TensorFlow.js', async () => {
      const tf = require('@tensorflow/tfjs')
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(tf.setBackend).toHaveBeenCalledWith('webgl')
      expect(tf.ready).toHaveBeenCalled()
    })

    it('should fallback to CPU backend if WebGL fails', async () => {
      const tf = require('@tensorflow/tfjs')
      tf.setBackend.mockRejectedValueOnce(new Error('WebGL not supported'))
      
      const service = new PredictionService()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(tf.setBackend).toHaveBeenCalledWith('cpu')
    })
  })

  describe('trainModel', () => {
    it('should train a linear regression model', async () => {
      const result = await predictionService.trainModel('Client A', mockTranscriptData, 'linear')
      
      expect(result).toBeDefined()
      expect(result.modelType).toBe('linear')
      expect(result.windowSize).toBe(3)
      expect(result.metrics).toBeDefined()
      expect(result.trainedAt).toBeInstanceOf(Date)
    })

    it('should train a polynomial regression model', async () => {
      const result = await predictionService.trainModel('Client A', mockTranscriptData, 'polynomial')
      
      expect(result).toBeDefined()
      expect(result.modelType).toBe('polynomial')
    })

    it('should throw error for insufficient data', async () => {
      const insufficientData = mockTranscriptData.slice(0, 2)
      
      await expect(
        predictionService.trainModel('Client A', insufficientData, 'linear')
      ).rejects.toThrow('Insufficient data for client Client A')
    })

    it('should handle custom window size', async () => {
      const result = await predictionService.trainModel('Client A', mockTranscriptData, 'linear', 4)
      
      expect(result.windowSize).toBe(4)
    })
  })

  describe('generatePredictions', () => {
    it('should generate predictions for a client', async () => {
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
    })

    it('should generate predictions with confidence intervals', async () => {
      const request: PredictionRequest = {
        clientName: 'Client A',
        monthsAhead: 2,
        modelType: 'linear'
      }
      
      const result = await predictionService.generatePredictions('Client A', mockTranscriptData, request)
      
      result.predictions.forEach(prediction => {
        expect(prediction.confidenceInterval.lower).toBeLessThanOrEqual(prediction.predictedCount)
        expect(prediction.confidenceInterval.upper).toBeGreaterThanOrEqual(prediction.predictedCount)
        expect(prediction.month).toMatch(/^\d{4}-\d{2}$/)
        expect(prediction.year).toBeGreaterThan(2022)
      })
    })

    it('should throw error for insufficient context data', async () => {
      const request: PredictionRequest = {
        clientName: 'Client A',
        monthsAhead: 3,
        modelType: 'linear'
      }
      
      const insufficientData = mockTranscriptData.slice(0, 1)
      
      await expect(
        predictionService.generatePredictions('Client A', insufficientData, request)
      ).rejects.toThrow('Insufficient data for prediction')
    })
  })

  describe('generateAllPredictions', () => {
    it('should generate predictions for all clients', async () => {
      const multiClientData = [
        ...mockTranscriptData,
        ...mockTranscriptData.map(item => ({ ...item, id: item.id + '_b', clientName: 'Client B' }))
      ]
      
      const request = {
        monthsAhead: 2,
        modelType: 'linear' as const
      }
      
      const results = await predictionService.generateAllPredictions(multiClientData, request)
      
      expect(results).toHaveLength(2)
      expect(results.find(r => r.clientName === 'Client A')).toBeDefined()
      expect(results.find(r => r.clientName === 'Client B')).toBeDefined()
    })

    it('should continue with other clients if one fails', async () => {
      const multiClientData = [
        ...mockTranscriptData,
        {
          id: '7',
          clientName: 'Client C',
          month: '2023-01',
          year: 2023,
          transcriptCount: 50,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01')
        }
      ]
      
      const request = {
        monthsAhead: 2,
        modelType: 'linear' as const
      }
      
      const results = await predictionService.generateAllPredictions(multiClientData, request)
      
      // Should still return results for Client A even if Client C fails
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('validatePredictionRequest', () => {
    it('should validate valid request', () => {
      const request: PredictionRequest = {
        clientName: 'Client A',
        monthsAhead: 6,
        modelType: 'linear'
      }
      
      const result = predictionService.validatePredictionRequest(request)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid monthsAhead', () => {
      const request: PredictionRequest = {
        clientName: 'Client A',
        monthsAhead: 30,
        modelType: 'linear'
      }
      
      const result = predictionService.validatePredictionRequest(request)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('monthsAhead must be between 1 and 24')
    })

    it('should reject invalid modelType', () => {
      const request: PredictionRequest = {
        clientName: 'Client A',
        monthsAhead: 6,
        modelType: 'invalid' as any
      }
      
      const result = predictionService.validatePredictionRequest(request)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('modelType must be linear, polynomial, or arima')
    })
  })

  describe('model management', () => {
    it('should store and retrieve model info', async () => {
      await predictionService.trainModel('Client A', mockTranscriptData, 'linear')
      
      const modelInfo = predictionService.getModelInfo('Client A')
      
      expect(modelInfo).toBeDefined()
      expect(modelInfo?.modelType).toBe('linear')
      expect(modelInfo?.trainedAt).toBeInstanceOf(Date)
    })

    it('should return null for non-existent model', () => {
      const modelInfo = predictionService.getModelInfo('Non-existent Client')
      
      expect(modelInfo).toBeNull()
    })

    it('should clear all models', async () => {
      await predictionService.trainModel('Client A', mockTranscriptData, 'linear')
      
      predictionService.clearModels()
      
      const modelInfo = predictionService.getModelInfo('Client A')
      expect(modelInfo).toBeNull()
    })
  })

  describe('memory management', () => {
    it('should provide memory information', () => {
      const memoryInfo = predictionService.getMemoryInfo()
      
      expect(memoryInfo).toBeDefined()
      expect(typeof memoryInfo.numTensors).toBe('number')
      expect(typeof memoryInfo.numBytes).toBe('number')
    })

    it('should dispose resources properly', () => {
      const tf = require('@tensorflow/tfjs')
      
      predictionService.dispose()
      
      // Verify that dispose was called (through clearModels)
      expect(predictionService.getModelInfo('any-client')).toBeNull()
    })
  })

  describe('prediction caching', () => {
    it('should cache prediction results', async () => {
      const request: PredictionRequest = {
        clientName: 'Client A',
        monthsAhead: 3,
        modelType: 'linear'
      }
      
      // First call should generate prediction
      const result1 = await predictionService.generatePredictions('Client A', mockTranscriptData, request)
      
      // Second call should return cached result
      const result2 = await predictionService.generatePredictions('Client A', mockTranscriptData, request)
      
      expect(result1.generatedAt).toEqual(result2.generatedAt)
      expect(result1.predictions).toEqual(result2.predictions)
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

    it('should provide cache statistics', async () => {
      const request: PredictionRequest = {
        clientName: 'Client A',
        monthsAhead: 3,
        modelType: 'linear'
      }
      
      await predictionService.generatePredictions('Client A', mockTranscriptData, request)
      
      const stats = predictionService.getCacheStats()
      expect(stats.size).toBe(1)
      expect(stats.maxSize).toBe(100)
      expect(stats.oldestEntry).toBeInstanceOf(Date)
      expect(stats.newestEntry).toBeInstanceOf(Date)
    })

    it('should clear all cache', async () => {
      const request: PredictionRequest = {
        clientName: 'Client A',
        monthsAhead: 3,
        modelType: 'linear'
      }
      
      await predictionService.generatePredictions('Client A', mockTranscriptData, request)
      
      predictionService.clearCache()
      
      const stats = predictionService.getCacheStats()
      expect(stats.size).toBe(0)
    })
  })

  describe('model validation', () => {
    it('should validate trained model', async () => {
      await predictionService.trainModel('Client A', mockTranscriptData, 'linear')
      
      const validation = await predictionService.validateModel('Client A', mockTranscriptData, predictionService.getModelInfo('Client A')!)
      
      expect(validation).toBeDefined()
      expect(typeof validation.isValid).toBe('boolean')
      expect(typeof validation.accuracy).toBe('number')
      expect(typeof validation.crossValidationScore).toBe('number')
      expect(validation.residualAnalysis).toBeDefined()
      expect(Array.isArray(validation.recommendations)).toBe(true)
    })

    it('should handle validation with insufficient data', async () => {
      const insufficientData = mockTranscriptData.slice(0, 2)
      
      await predictionService.trainModel('Client A', insufficientData, 'linear')
      
      const validation = await predictionService.validateModel('Client A', insufficientData, predictionService.getModelInfo('Client A')!)
      
      expect(validation.isValid).toBe(false)
      expect(validation.recommendations).toContain('Insufficient data for model validation')
    })

    it('should generate performance report', async () => {
      await predictionService.trainModel('Client A', mockTranscriptData, 'linear')
      
      const report = await predictionService.getModelPerformanceReport('Client A', mockTranscriptData)
      
      expect(report.modelInfo).toBeDefined()
      expect(report.validation).toBeDefined()
      expect(report.dataQuality).toBeDefined()
      expect(Array.isArray(report.recommendations)).toBe(true)
    })

    it('should handle performance report for non-existent model', async () => {
      const report = await predictionService.getModelPerformanceReport('Non-existent Client', mockTranscriptData)
      
      expect(report.modelInfo).toBeNull()
      expect(report.validation).toBeNull()
      expect(report.recommendations).toContain('Train a model first before generating performance report')
    })
  })

  describe('enhanced model training', () => {
    it('should train model with hyperparameter optimization', async () => {
      const result = await predictionService.trainModelWithOptimization('Client A', mockTranscriptData, 'linear')
      
      expect(result).toBeDefined()
      expect(result.modelType).toBe('linear')
      expect(result.metrics).toBeDefined()
      expect(result.trainedAt).toBeInstanceOf(Date)
    })

    it('should handle batch training of multiple models', async () => {
      const multiClientData = [
        ...mockTranscriptData,
        ...mockTranscriptData.map(item => ({ ...item, id: item.id + '_b', clientName: 'Client B' }))
      ]
      
      const trainedModels = await predictionService.batchTrainModels(multiClientData, 'linear', false)
      
      expect(trainedModels.size).toBe(2)
      expect(trainedModels.has('Client A')).toBe(true)
      expect(trainedModels.has('Client B')).toBe(true)
    })

    it('should handle batch training with optimization', async () => {
      const multiClientData = [
        ...mockTranscriptData,
        ...mockTranscriptData.map(item => ({ ...item, id: item.id + '_b', clientName: 'Client B' }))
      ]
      
      const trainedModels = await predictionService.batchTrainModels(multiClientData, 'polynomial', true)
      
      expect(trainedModels.size).toBe(2)
      trainedModels.forEach(model => {
        expect(model.modelType).toBe('polynomial')
        expect(model.metrics).toBeDefined()
      })
    })
  })

  describe('enhanced prediction generation', () => {
    it('should generate predictions with improved confidence intervals', async () => {
      const request: PredictionRequest = {
        clientName: 'Client A',
        monthsAhead: 3,
        modelType: 'linear'
      }
      
      const result = await predictionService.generatePredictions('Client A', mockTranscriptData, request)
      
      expect(result.predictions).toHaveLength(3)
      result.predictions.forEach((prediction, index) => {
        expect(prediction.confidenceInterval.lower).toBeLessThanOrEqual(prediction.predictedCount)
        expect(prediction.confidenceInterval.upper).toBeGreaterThanOrEqual(prediction.predictedCount)
        
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
  })

  describe('performance optimization', () => {
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

    it('should handle concurrent prediction generation', async () => {
      const multiClientData = [
        ...mockTranscriptData,
        ...mockTranscriptData.map(item => ({ ...item, id: item.id + '_b', clientName: 'Client B' })),
        ...mockTranscriptData.map(item => ({ ...item, id: item.id + '_c', clientName: 'Client C' }))
      ]
      
      const request = {
        monthsAhead: 2,
        modelType: 'linear' as const
      }
      
      const startTime = Date.now()
      const results = await predictionService.generateAllPredictions(multiClientData, request)
      const endTime = Date.now()
      
      expect(results.length).toBeGreaterThan(0)
      expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds
    })
  })

  describe('error handling', () => {
    it('should handle TensorFlow initialization failure', async () => {
      const tf = require('@tensorflow/tfjs')
      tf.setBackend.mockRejectedValue(new Error('Backend failed'))
      tf.ready.mockRejectedValue(new Error('Ready failed'))
      
      await expect(async () => {
        const service = new PredictionService()
        await new Promise(resolve => setTimeout(resolve, 100))
      }).rejects.toThrow('Failed to initialize TensorFlow.js')
    })

    it('should handle model training errors gracefully', async () => {
      const tf = require('@tensorflow/tfjs')
      const mockModel = {
        compile: jest.fn(),
        fit: jest.fn().mockRejectedValue(new Error('Training failed')),
        dispose: jest.fn()
      }
      tf.sequential.mockReturnValue(mockModel)
      
      await expect(
        predictionService.trainModel('Client A', mockTranscriptData, 'linear')
      ).rejects.toThrow('Training failed')
    })

    it('should handle cross-validation errors gracefully', async () => {
      const tf = require('@tensorflow/tfjs')
      const mockModel = {
        compile: jest.fn(),
        fit: jest.fn().mockRejectedValue(new Error('Cross-validation failed')),
        dispose: jest.fn()
      }
      tf.sequential.mockReturnValue(mockModel)
      
      await predictionService.trainModel('Client A', mockTranscriptData, 'linear')
      
      // Should not throw error, but return default score
      const validation = await predictionService.validateModel('Client A', mockTranscriptData, predictionService.getModelInfo('Client A')!)
      expect(validation).toBeDefined()
    })

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
          id: '7',
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
      // Client C might not be trained due to insufficient data
    })
  })
})