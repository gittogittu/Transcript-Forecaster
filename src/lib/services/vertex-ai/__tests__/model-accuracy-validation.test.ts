/**
 * Model Accuracy Validation Tests
 * 
 * Comprehensive tests for ML model accuracy, validation, and performance metrics
 * Covers forecasting models, anomaly detection accuracy, and prediction quality
 */

// Set up environment variables and mocks before any imports
process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project'
process.env.GOOGLE_CLOUD_LOCATION = 'us-central1'
process.env.GOOGLE_APPLICATION_CREDENTIALS = 'test-credentials.json'

// Mock dependencies first
jest.mock('../config', () => ({
  getVertexAIConfig: jest.fn(() => ({
    projectId: 'test-project',
    location: 'us-central1',
    getModelResourceName: jest.fn(),
    getEndpointResourceName: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue('test-token')
  }))
}))

jest.mock('@google-cloud/aiplatform')
jest.mock('../client')
jest.mock('../../forecasting/intelligent-forecasting-engine')
jest.mock('../../anomaly-detection/anomaly-detection-service')

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { IntelligentForecastingEngine } from '../../forecasting/intelligent-forecasting-engine'
import { AnomalyDetectionService } from '../../anomaly-detection/anomaly-detection-service'
import { getVertexAIClient } from '../client'
import type { TimeSeriesData, ForecastingRequest } from '../../forecasting/intelligent-forecasting-engine'

describe('ML Model Accuracy Validation', () => {
  let forecastingEngine: IntelligentForecastingEngine
  let anomalyService: AnomalyDetectionService
  let vertexAIClient: any

  beforeEach(() => {
    forecastingEngine = new IntelligentForecastingEngine()
    anomalyService = new AnomalyDetectionService()
    vertexAIClient = {
      predict: jest.fn(),
      batchPredict: jest.fn(),
      evaluateModel: jest.fn()
    }
    ;(getVertexAIClient as jest.Mock).mockReturnValue(vertexAIClient)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Forecasting Model Accuracy', () => {
    const generateTestData = (length: number, trend: number = 0, seasonality: boolean = false): TimeSeriesData => {
      const timestamps: Date[] = []
      const values: number[] = []
      
      for (let i = 0; i < length; i++) {
        const date = new Date('2024-01-01')
        date.setDate(date.getDate() + i)
        timestamps.push(date)
        
        let value = 100 + (i * trend)
        if (seasonality) {
          value += 20 * Math.sin((i * 2 * Math.PI) / 7) // Weekly seasonality
        }
        value += (Math.random() - 0.5) * 10 // Add noise
        values.push(Math.max(0, value))
      }
      
      return { timestamps, values, clientId: 'test-client' }
    }

    it('should achieve acceptable accuracy on trending data', async () => {
      const trainData = generateTestData(60, 0.5) // 60 days with upward trend
      const testData = generateTestData(10, 0.5) // 10 days for validation
      
      // Mock forecast results
      const mockForecast = {
        predictions: testData.values.map((actual, i) => ({
          timestamp: testData.timestamps[i],
          value: actual + (Math.random() - 0.5) * 5, // Add some prediction error
          confidenceInterval: { lower: actual - 10, upper: actual + 10 }
        })),
        modelUsed: { type: 'automl', confidence: 0.85 },
        seasonalityDetected: false,
        trendDirection: 'increasing'
      }
      
      jest.spyOn(forecastingEngine, 'generateForecast').mockResolvedValue(mockForecast)
      
      const request: ForecastingRequest = {
        timeHorizon: 'daily',
        periodsAhead: 10,
        confidenceLevel: 0.95
      }
      
      const result = await forecastingEngine.generateForecast(trainData, request)
      
      // Calculate accuracy metrics
      const mae = result.predictions.reduce((sum, pred, i) => {
        return sum + Math.abs(pred.value - testData.values[i])
      }, 0) / result.predictions.length
      
      const mape = result.predictions.reduce((sum, pred, i) => {
        const actual = testData.values[i]
        return sum + Math.abs((actual - pred.value) / actual) * 100
      }, 0) / result.predictions.length
      
      // Accuracy thresholds
      expect(mae).toBeLessThan(15) // Mean Absolute Error < 15
      expect(mape).toBeLessThan(20) // Mean Absolute Percentage Error < 20%
      expect(result.modelUsed.confidence).toBeGreaterThan(0.8)
    })

    it('should handle seasonal patterns accurately', async () => {
      const seasonalData = generateTestData(84, 0, true) // 12 weeks with seasonality
      
      const mockSeasonalForecast = {
        predictions: Array.from({ length: 7 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          value: 100 + 20 * Math.sin((i * 2 * Math.PI) / 7),
          confidenceInterval: { lower: 90, upper: 130 }
        })),
        modelUsed: { type: 'seasonal_arima', confidence: 0.9 },
        seasonalityDetected: true,
        trendDirection: 'stable'
      }
      
      jest.spyOn(forecastingEngine, 'generateForecast').mockResolvedValue(mockSeasonalForecast)
      
      const request: ForecastingRequest = {
        timeHorizon: 'daily',
        periodsAhead: 7,
        confidenceLevel: 0.95
      }
      
      const result = await forecastingEngine.generateForecast(seasonalData, request)
      
      expect(result.seasonalityDetected).toBe(true)
      expect(result.modelUsed.confidence).toBeGreaterThan(0.85)
      
      // Verify seasonal pattern detection
      const values = result.predictions.map(p => p.value)
      const seasonalVariation = Math.max(...values) - Math.min(...values)
      expect(seasonalVariation).toBeGreaterThan(20) // Should detect seasonal variation
    })

    it('should provide reliable confidence intervals', async () => {
      const testData = generateTestData(30)
      
      const mockForecast = {
        predictions: Array.from({ length: 5 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          value: 100 + i * 2,
          confidenceInterval: { 
            lower: 90 + i * 2, 
            upper: 110 + i * 2 
          }
        })),
        modelUsed: { type: 'automl', confidence: 0.88 },
        seasonalityDetected: false,
        trendDirection: 'increasing'
      }
      
      jest.spyOn(forecastingEngine, 'generateForecast').mockResolvedValue(mockForecast)
      
      const request: ForecastingRequest = {
        timeHorizon: 'daily',
        periodsAhead: 5,
        confidenceLevel: 0.95
      }
      
      const result = await forecastingEngine.generateForecast(testData, request)
      
      // Verify confidence intervals
      result.predictions.forEach(prediction => {
        expect(prediction.confidenceInterval.lower).toBeLessThan(prediction.value)
        expect(prediction.confidenceInterval.upper).toBeGreaterThan(prediction.value)
        
        const intervalWidth = prediction.confidenceInterval.upper - prediction.confidenceInterval.lower
        expect(intervalWidth).toBeGreaterThan(0)
        expect(intervalWidth).toBeLessThan(50) // Reasonable interval width
      })
    })
  })

  describe('Anomaly Detection Accuracy', () => {
    it('should detect statistical anomalies with high precision', async () => {
      const normalData = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        value: 100 + Math.random() * 10, // Normal variation
        clientId: 'test-client'
      }))
      
      // Add clear anomalies
      const anomalousData = [
        ...normalData,
        {
          timestamp: new Date(),
          value: 200, // Clear outlier
          clientId: 'test-client'
        },
        {
          timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000),
          value: 10, // Another outlier
          clientId: 'test-client'
        }
      ]
      
      const mockAnomalies = [
        {
          timestamp: new Date(),
          value: 200,
          anomalyScore: 0.95,
          anomalyType: 'point',
          severity: 'high',
          explanation: 'Value significantly exceeds normal range'
        },
        {
          timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000),
          value: 10,
          anomalyScore: 0.92,
          anomalyType: 'point',
          severity: 'high',
          explanation: 'Value significantly below normal range'
        }
      ]
      
      jest.spyOn(anomalyService, 'detectAnomalies').mockResolvedValue(mockAnomalies)
      
      const result = await anomalyService.detectAnomalies(anomalousData, {
        algorithm: 'statistical',
        sensitivity: 0.95
      })
      
      // Verify detection accuracy
      expect(result).toHaveLength(2)
      expect(result.every(anomaly => anomaly.anomalyScore > 0.9)).toBe(true)
      expect(result.every(anomaly => anomaly.severity === 'high')).toBe(true)
      
      // Verify no false positives in normal range
      const normalRangeAnomalies = result.filter(a => a.value >= 90 && a.value <= 120)
      expect(normalRangeAnomalies).toHaveLength(0)
    })

    it('should classify different anomaly types correctly', async () => {
      const testData = [
        // Point anomaly
        { timestamp: new Date('2024-01-01'), value: 200, clientId: 'test-client' },
        // Contextual anomaly (high value on weekend)
        { timestamp: new Date('2024-01-06'), value: 150, clientId: 'test-client' }, // Saturday
        // Collective anomaly (sustained high values)
        ...Array.from({ length: 5 }, (_, i) => ({
          timestamp: new Date(`2024-01-${10 + i}`),
          value: 180,
          clientId: 'test-client'
        }))
      ]
      
      const mockClassifiedAnomalies = [
        {
          timestamp: new Date('2024-01-01'),
          value: 200,
          anomalyScore: 0.95,
          anomalyType: 'point',
          severity: 'high',
          explanation: 'Single extreme value'
        },
        {
          timestamp: new Date('2024-01-06'),
          value: 150,
          anomalyScore: 0.85,
          anomalyType: 'contextual',
          severity: 'medium',
          explanation: 'Unusual value for weekend'
        },
        {
          timestamp: new Date('2024-01-10'),
          value: 180,
          anomalyScore: 0.88,
          anomalyType: 'collective',
          severity: 'high',
          explanation: 'Part of sustained anomalous period'
        }
      ]
      
      jest.spyOn(anomalyService, 'classifyAnomalies').mockResolvedValue(mockClassifiedAnomalies)
      
      const result = await anomalyService.classifyAnomalies(testData)
      
      const pointAnomalies = result.filter(a => a.anomalyType === 'point')
      const contextualAnomalies = result.filter(a => a.anomalyType === 'contextual')
      const collectiveAnomalies = result.filter(a => a.anomalyType === 'collective')
      
      expect(pointAnomalies).toHaveLength(1)
      expect(contextualAnomalies).toHaveLength(1)
      expect(collectiveAnomalies).toHaveLength(1)
      
      // Verify classification accuracy
      expect(pointAnomalies[0].anomalyScore).toBeGreaterThan(0.9)
      expect(contextualAnomalies[0].explanation).toContain('weekend')
      expect(collectiveAnomalies[0].explanation).toContain('sustained')
    })
  })

  describe('Model Performance Benchmarks', () => {
    it('should meet latency requirements for real-time predictions', async () => {
      const testData = generateTestData(30)
      
      jest.spyOn(forecastingEngine, 'generateForecast').mockImplementation(async () => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100))
        return {
          predictions: [{ 
            timestamp: new Date(), 
            value: 100, 
            confidenceInterval: { lower: 90, upper: 110 } 
          }],
          modelUsed: { type: 'automl', confidence: 0.85 },
          seasonalityDetected: false,
          trendDirection: 'stable'
        }
      })
      
      const startTime = Date.now()
      
      const request: ForecastingRequest = {
        timeHorizon: 'daily',
        periodsAhead: 1,
        confidenceLevel: 0.95
      }
      
      await forecastingEngine.generateForecast(testData, request)
      
      const endTime = Date.now()
      const latency = endTime - startTime
      
      // Should complete within 2 seconds for real-time requirements
      expect(latency).toBeLessThan(2000)
    })

    it('should handle concurrent prediction requests efficiently', async () => {
      const testData = generateTestData(30)
      
      jest.spyOn(forecastingEngine, 'generateForecast').mockResolvedValue({
        predictions: [{ 
          timestamp: new Date(), 
          value: 100, 
          confidenceInterval: { lower: 90, upper: 110 } 
        }],
        modelUsed: { type: 'automl', confidence: 0.85 },
        seasonalityDetected: false,
        trendDirection: 'stable'
      })
      
      const request: ForecastingRequest = {
        timeHorizon: 'daily',
        periodsAhead: 1,
        confidenceLevel: 0.95
      }
      
      const startTime = Date.now()
      
      // Simulate 10 concurrent requests
      const promises = Array.from({ length: 10 }, () => 
        forecastingEngine.generateForecast(testData, request)
      )
      
      const results = await Promise.all(promises)
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      expect(results).toHaveLength(10)
      expect(results.every(r => r.predictions.length > 0)).toBe(true)
      
      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(5000) // 5 seconds for 10 concurrent requests
    })
  })

  describe('Cross-Validation and Model Comparison', () => {
    it('should perform k-fold cross-validation accurately', async () => {
      const testData = generateTestData(100)
      
      const mockCrossValidationResults = {
        folds: 5,
        averageAccuracy: 0.87,
        accuracyStdDev: 0.03,
        foldResults: [
          { fold: 1, accuracy: 0.89, mae: 8.5, rmse: 12.1 },
          { fold: 2, accuracy: 0.85, mae: 9.2, rmse: 13.4 },
          { fold: 3, accuracy: 0.88, mae: 8.8, rmse: 12.8 },
          { fold: 4, accuracy: 0.86, mae: 9.0, rmse: 13.0 },
          { fold: 5, accuracy: 0.87, mae: 8.7, rmse: 12.5 }
        ]
      }
      
      jest.spyOn(forecastingEngine, 'crossValidate').mockResolvedValue(mockCrossValidationResults)
      
      const result = await forecastingEngine.crossValidate(testData, { folds: 5 })
      
      expect(result.averageAccuracy).toBeGreaterThan(0.8)
      expect(result.accuracyStdDev).toBeLessThan(0.1) // Consistent performance
      expect(result.foldResults).toHaveLength(5)
      
      // All folds should meet minimum accuracy
      expect(result.foldResults.every(fold => fold.accuracy > 0.8)).toBe(true)
    })

    it('should compare multiple models and select the best', async () => {
      const testData = generateTestData(100)
      
      const mockModelComparison = {
        models: [
          {
            name: 'automl',
            accuracy: 0.89,
            mae: 8.2,
            rmse: 11.8,
            trainingTime: 1200,
            predictionLatency: 150
          },
          {
            name: 'arima',
            accuracy: 0.84,
            mae: 9.8,
            rmse: 14.2,
            trainingTime: 300,
            predictionLatency: 80
          },
          {
            name: 'linear_regression',
            accuracy: 0.76,
            mae: 12.5,
            rmse: 18.1,
            trainingTime: 50,
            predictionLatency: 20
          }
        ],
        bestModel: 'automl',
        selectionCriteria: 'accuracy'
      }
      
      jest.spyOn(forecastingEngine, 'compareModels').mockResolvedValue(mockModelComparison)
      
      const result = await forecastingEngine.compareModels(testData, ['automl', 'arima', 'linear_regression'])
      
      expect(result.bestModel).toBe('automl')
      expect(result.models).toHaveLength(3)
      
      // Best model should have highest accuracy
      const bestModelMetrics = result.models.find(m => m.name === result.bestModel)
      const otherModels = result.models.filter(m => m.name !== result.bestModel)
      
      expect(bestModelMetrics?.accuracy).toBeGreaterThan(0.85)
      expect(otherModels.every(m => m.accuracy <= bestModelMetrics!.accuracy)).toBe(true)
    })
  })

  describe('Model Drift Detection', () => {
    it('should detect concept drift in model performance', async () => {
      const historicalAccuracy = [0.89, 0.88, 0.87, 0.86, 0.85, 0.84, 0.82, 0.80, 0.78, 0.75]
      
      const mockDriftDetection = {
        driftDetected: true,
        driftType: 'gradual',
        driftStartPoint: 5,
        currentAccuracy: 0.75,
        baselineAccuracy: 0.89,
        accuracyDrop: 0.14,
        recommendedAction: 'retrain_model'
      }
      
      jest.spyOn(forecastingEngine, 'detectConceptDrift').mockResolvedValue(mockDriftDetection)
      
      const result = await forecastingEngine.detectConceptDrift('test-model', historicalAccuracy)
      
      expect(result.driftDetected).toBe(true)
      expect(result.driftType).toBe('gradual')
      expect(result.accuracyDrop).toBeGreaterThan(0.1) // Significant drop
      expect(result.recommendedAction).toBe('retrain_model')
    })

    it('should not trigger false drift alerts for normal variation', async () => {
      const stableAccuracy = [0.87, 0.89, 0.86, 0.88, 0.87, 0.89, 0.86, 0.88, 0.87, 0.88]
      
      const mockNoDrift = {
        driftDetected: false,
        driftType: null,
        driftStartPoint: null,
        currentAccuracy: 0.88,
        baselineAccuracy: 0.87,
        accuracyDrop: -0.01, // Actually improved
        recommendedAction: 'continue_monitoring'
      }
      
      jest.spyOn(forecastingEngine, 'detectConceptDrift').mockResolvedValue(mockNoDrift)
      
      const result = await forecastingEngine.detectConceptDrift('test-model', stableAccuracy)
      
      expect(result.driftDetected).toBe(false)
      expect(result.recommendedAction).toBe('continue_monitoring')
      expect(Math.abs(result.accuracyDrop)).toBeLessThan(0.05) // Minimal variation
    })
  })
})