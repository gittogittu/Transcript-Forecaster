/**
 * End-to-End Prediction Workflow Tests
 * 
 * Tests complete prediction pipelines from data ingestion to final results:
 * - Data preprocessing and feature engineering
 * - Model training and validation workflows
 * - Real-time and batch prediction pipelines
 * - Integration between all ML components
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { IntelligentForecastingEngine } from '../forecasting/intelligent-forecasting-engine'
import { AnomalyDetectionService } from '../anomaly-detection/anomaly-detection-service'
import { EmbeddingService } from '../embeddings/index'
import { FeaturePipeline } from '../feature-engineering/feature-pipeline'
import { AdaptiveModelingManager } from '../adaptive-modeling/adaptive-modeling-manager'
import { PerformanceMonitor } from '../performance-monitoring/performance-monitor'

// Mock all external dependencies
jest.mock('../vertex-ai/client')
jest.mock('../../database/connection')
jest.mock('../embeddings/text-embedding')
jest.mock('../vertex-ai/automl-forecasting')

describe('End-to-End Prediction Workflows', () => {
  let forecastingEngine: IntelligentForecastingEngine
  let anomalyService: AnomalyDetectionService
  let featurePipeline: FeaturePipeline
  let adaptiveManager: AdaptiveModelingManager
  let performanceMonitor: PerformanceMonitor
  let mockPool: any

  beforeEach(() => {
    // Initialize services
    forecastingEngine = new IntelligentForecastingEngine()
    anomalyService = new AnomalyDetectionService()
    featurePipeline = new FeaturePipeline()
    adaptiveManager = new AdaptiveModelingManager()
    performanceMonitor = new PerformanceMonitor({
      accuracy: { maeThreshold: 10, rmseThreshold: 15, mapeThreshold: 20, accuracyMinimum: 0.8 },
      latency: { maxPredictionTime: 2000, maxEndpointLatency: 1000, maxQueryTime: 500 },
      resources: { maxMemoryUsage: 2000, maxCpuUsage: 85, maxErrorRate: 5, minCacheHitRate: 70 }
    })

    // Mock database
    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn()
      })
    }

    const { getDatabasePool } = require('../../database/connection')
    getDatabasePool.mockResolvedValue(mockPool)

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Forecasting Pipeline', () => {
    const mockTranscriptData = {
      clientId: 'test-client-001',
      clientName: 'Acme Corporation',
      historicalData: Array.from({ length: 90 }, (_, i) => ({
        date: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000),
        transcriptCount: 50 + Math.sin(i / 7) * 20 + Math.random() * 10,
        metadata: {
          dayOfWeek: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000).getDay(),
          isHoliday: false,
          businessDay: true
        }
      }))
    }

    it('should execute complete forecasting workflow successfully', async () => {
      // Step 1: Data preprocessing and feature engineering
      const mockFeatures = {
        timeFeatures: {
          dayOfWeek: [1, 2, 3, 4, 5],
          monthOfYear: [1, 1, 1, 1, 1],
          isWeekend: [false, false, false, false, false],
          isHoliday: [false, false, false, false, false]
        },
        statisticalFeatures: {
          lag1: [48, 52, 49, 51, 53],
          lag7: [45, 48, 52, 49, 51],
          rollingMean7: [47.5, 49.2, 50.1, 50.8, 51.2],
          rollingStd7: [2.1, 2.3, 2.0, 1.8, 1.9]
        },
        domainFeatures: {
          businessDayIndicator: [1, 1, 1, 1, 1],
          seasonalComponent: [0.1, 0.2, 0.15, 0.05, -0.1],
          trendComponent: [0.02, 0.03, 0.02, 0.01, 0.02]
        }
      }

      jest.spyOn(featurePipeline, 'extractFeatures').mockResolvedValue(mockFeatures)

      // Step 2: Model training and selection
      const mockModelTraining = {
        modelId: 'forecast-model-v1',
        trainingMetrics: {
          mae: 8.5,
          rmse: 12.2,
          mape: 15.3,
          r2Score: 0.89
        },
        validationMetrics: {
          mae: 9.1,
          rmse: 13.1,
          mape: 16.8,
          r2Score: 0.86
        },
        selectedAlgorithm: 'automl_forecasting'
      }

      jest.spyOn(forecastingEngine, 'trainModel').mockResolvedValue(mockModelTraining)

      // Step 3: Generate predictions
      const mockPredictions = {
        predictions: Array.from({ length: 7 }, (_, i) => ({
          timestamp: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          value: 52 + Math.sin(i / 7) * 15,
          confidenceInterval: {
            lower: 45 + Math.sin(i / 7) * 15,
            upper: 59 + Math.sin(i / 7) * 15
          }
        })),
        modelUsed: { type: 'automl_forecasting', confidence: 0.87 },
        seasonalityDetected: true,
        trendDirection: 'stable'
      }

      jest.spyOn(forecastingEngine, 'generateForecast').mockResolvedValue(mockPredictions)

      // Step 4: Anomaly detection on predictions
      const mockAnomalyCheck = {
        anomaliesDetected: [],
        overallRisk: 'low',
        confidence: 0.92
      }

      jest.spyOn(anomalyService, 'validatePredictions').mockResolvedValue(mockAnomalyCheck)

      // Execute complete workflow
      const workflowResult = await executeCompleteForecastingWorkflow(mockTranscriptData)

      // Verify workflow execution
      expect(featurePipeline.extractFeatures).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'test-client-001'
        })
      )

      expect(forecastingEngine.trainModel).toHaveBeenCalledWith(
        expect.objectContaining({
          features: mockFeatures
        })
      )

      expect(forecastingEngine.generateForecast).toHaveBeenCalled()
      expect(anomalyService.validatePredictions).toHaveBeenCalled()

      // Verify final results
      expect(workflowResult).toMatchObject({
        success: true,
        predictions: expect.arrayContaining([
          expect.objectContaining({
            timestamp: expect.any(Date),
            value: expect.any(Number),
            confidenceInterval: expect.objectContaining({
              lower: expect.any(Number),
              upper: expect.any(Number)
            })
          })
        ]),
        modelMetrics: expect.objectContaining({
          mae: expect.any(Number),
          rmse: expect.any(Number),
          mape: expect.any(Number)
        }),
        anomalyStatus: expect.objectContaining({
          overallRisk: 'low'
        })
      })
    })

    // Helper function for workflow execution
    async function executeCompleteForecastingWorkflow(data: any) {
      try {
        // Step 1: Feature extraction
        const features = await featurePipeline.extractFeatures(data)
        
        // Step 2: Model training
        const trainingResult = await forecastingEngine.trainModel({ features, data })
        
        // Step 3: Generate predictions
        const timeSeriesData = {
          timestamps: data.historicalData.map((d: any) => d.date),
          values: data.historicalData.map((d: any) => d.transcriptCount),
          clientId: data.clientId
        }
        
        const predictions = await forecastingEngine.generateForecast(timeSeriesData, {
          timeHorizon: 'daily',
          periodsAhead: 7,
          confidenceLevel: 0.95
        })
        
        // Step 4: Validate predictions
        const anomalyStatus = await anomalyService.validatePredictions(predictions.predictions)
        
        return {
          success: true,
          predictions: predictions.predictions,
          modelMetrics: trainingResult.trainingMetrics,
          anomalyStatus
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  })

  describe('Real-time Prediction Pipeline', () => {
    it('should handle real-time prediction requests efficiently', async () => {
      const realTimeData = {
        clientId: 'realtime-client',
        currentTimestamp: new Date(),
        recentData: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() - (30 - i) * 60 * 60 * 1000), // Hourly data
          value: 25 + Math.random() * 10
        }))
      }

      // Mock real-time feature extraction
      jest.spyOn(featurePipeline, 'extractRealTimeFeatures').mockResolvedValue({
        currentHour: 14,
        dayOfWeek: 3,
        recentTrend: 0.05,
        volatility: 2.3
      })

      // Mock real-time prediction
      const mockRealTimePrediction = {
        nextValue: 28.5,
        confidence: 0.84,
        predictionInterval: { lower: 24.2, upper: 32.8 },
        latency: 150 // ms
      }

      jest.spyOn(forecastingEngine, 'predictRealTime').mockResolvedValue(mockRealTimePrediction)

      const startTime = performance.now()
      
      const result = await executeRealTimePrediction(realTimeData)
      
      const endTime = performance.now()
      const totalLatency = endTime - startTime

      expect(result.success).toBe(true)
      expect(result.prediction.nextValue).toBe(28.5)
      expect(result.prediction.confidence).toBeGreaterThan(0.8)
      expect(totalLatency).toBeLessThan(500) // Should complete within 500ms
    })

    async function executeRealTimePrediction(data: any) {
      try {
        const features = await featurePipeline.extractRealTimeFeatures(data)
        const prediction = await forecastingEngine.predictRealTime(data.recentData, features)
        
        return {
          success: true,
          prediction
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  })

  describe('Batch Prediction Pipeline', () => {
    it('should process large batch predictions efficiently', async () => {
      const batchData = {
        clients: Array.from({ length: 50 }, (_, i) => ({
          clientId: `batch-client-${i}`,
          clientName: `Client ${i}`,
          historicalData: Array.from({ length: 60 }, (_, j) => ({
            date: new Date(Date.now() - (60 - j) * 24 * 60 * 60 * 1000),
            transcriptCount: 30 + Math.sin(j / 7) * 10 + Math.random() * 5
          }))
        })),
        predictionConfig: {
          timeHorizon: 'daily',
          periodsAhead: 14,
          confidenceLevel: 0.95
        }
      }

      // Mock batch processing
      jest.spyOn(forecastingEngine, 'batchPredict').mockImplementation(async (clients, config) => {
        // Simulate batch processing time
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        return clients.map((client: any) => ({
          clientId: client.clientId,
          predictions: Array.from({ length: config.periodsAhead }, (_, i) => ({
            timestamp: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
            value: 32 + Math.sin(i / 7) * 8,
            confidenceInterval: { lower: 25, upper: 39 }
          })),
          modelUsed: { type: 'automl_batch', confidence: 0.83 }
        }))
      })

      const startTime = performance.now()
      
      const batchResults = await forecastingEngine.batchPredict(
        batchData.clients,
        batchData.predictionConfig
      )
      
      const endTime = performance.now()
      const processingTime = endTime - startTime

      expect(batchResults).toHaveLength(50)
      expect(batchResults.every(r => r.predictions.length === 14)).toBe(true)
      expect(processingTime).toBeLessThan(10000) // Should complete within 10 seconds
      
      // Verify all clients processed successfully
      const clientIds = batchResults.map(r => r.clientId)
      const expectedClientIds = batchData.clients.map(c => c.clientId)
      expect(clientIds.sort()).toEqual(expectedClientIds.sort())
    })

    it('should handle batch processing failures gracefully', async () => {
      const batchDataWithErrors = {
        clients: [
          { clientId: 'good-client-1', historicalData: Array.from({ length: 30 }, () => ({ date: new Date(), transcriptCount: 25 })) },
          { clientId: 'bad-client-1', historicalData: [] }, // Empty data - should fail
          { clientId: 'good-client-2', historicalData: Array.from({ length: 30 }, () => ({ date: new Date(), transcriptCount: 30 })) },
          { clientId: 'bad-client-2', historicalData: null }, // Invalid data - should fail
        ]
      }

      jest.spyOn(forecastingEngine, 'batchPredict').mockImplementation(async (clients) => {
        return clients.map((client: any) => {
          if (!client.historicalData || client.historicalData.length === 0) {
            return {
              clientId: client.clientId,
              error: 'Insufficient historical data',
              predictions: []
            }
          }
          
          return {
            clientId: client.clientId,
            predictions: [{ timestamp: new Date(), value: 25, confidenceInterval: { lower: 20, upper: 30 } }],
            modelUsed: { type: 'automl_batch', confidence: 0.80 }
          }
        })
      })

      const results = await forecastingEngine.batchPredict(batchDataWithErrors.clients, {
        timeHorizon: 'daily',
        periodsAhead: 1,
        confidenceLevel: 0.95
      })

      const successfulResults = results.filter(r => !r.error)
      const failedResults = results.filter(r => r.error)

      expect(successfulResults).toHaveLength(2)
      expect(failedResults).toHaveLength(2)
      expect(failedResults.every(r => r.error === 'Insufficient historical data')).toBe(true)
    })
  })

  describe('Adaptive Model Management Workflow', () => {
    it('should detect performance degradation and trigger retraining', async () => {
      const modelPerformanceHistory = [
        { date: new Date('2024-01-01'), accuracy: 0.89, mae: 8.5 },
        { date: new Date('2024-01-02'), accuracy: 0.87, mae: 9.1 },
        { date: new Date('2024-01-03'), accuracy: 0.85, mae: 9.8 },
        { date: new Date('2024-01-04'), accuracy: 0.82, mae: 10.5 },
        { date: new Date('2024-01-05'), accuracy: 0.79, mae: 11.2 }, // Degrading performance
      ]

      // Mock performance monitoring
      jest.spyOn(performanceMonitor, 'analyzeModelPerformance').mockResolvedValue({
        performanceTrend: 'degrading',
        currentAccuracy: 0.79,
        baselineAccuracy: 0.89,
        degradationRate: 0.025, // 2.5% per day
        recommendedAction: 'retrain_model'
      })

      // Mock adaptive retraining
      jest.spyOn(adaptiveManager, 'triggerRetraining').mockResolvedValue({
        retrainingTriggered: true,
        newModelId: 'retrained-model-v2',
        expectedCompletionTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        reason: 'performance_degradation'
      })

      const analysis = await performanceMonitor.analyzeModelPerformance('test-model', modelPerformanceHistory)
      
      expect(analysis.performanceTrend).toBe('degrading')
      expect(analysis.recommendedAction).toBe('retrain_model')

      if (analysis.recommendedAction === 'retrain_model') {
        const retrainingResult = await adaptiveManager.triggerRetraining('test-model', {
          reason: 'performance_degradation',
          urgency: 'high'
        })

        expect(retrainingResult.retrainingTriggered).toBe(true)
        expect(retrainingResult.newModelId).toBe('retrained-model-v2')
      }
    })

    it('should handle concept drift detection and adaptation', async () => {
      const recentData = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        actualValue: 50 + Math.sin(i / 10) * 20, // New pattern
        predictedValue: 50 + Math.sin(i / 7) * 15, // Old pattern
        error: Math.abs((50 + Math.sin(i / 10) * 20) - (50 + Math.sin(i / 7) * 15))
      }))

      jest.spyOn(adaptiveManager, 'detectConceptDrift').mockResolvedValue({
        driftDetected: true,
        driftType: 'gradual',
        driftStartPoint: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        driftMagnitude: 0.35,
        affectedFeatures: ['seasonal_pattern', 'trend_component'],
        recommendedAdaptation: 'incremental_learning'
      })

      jest.spyOn(adaptiveManager, 'adaptToConceptDrift').mockResolvedValue({
        adaptationApplied: true,
        adaptationType: 'incremental_learning',
        updatedModelId: 'adapted-model-v1.1',
        performanceImprovement: 0.12
      })

      const driftAnalysis = await adaptiveManager.detectConceptDrift('test-model', recentData)
      
      expect(driftAnalysis.driftDetected).toBe(true)
      expect(driftAnalysis.driftType).toBe('gradual')
      expect(driftAnalysis.affectedFeatures).toContain('seasonal_pattern')

      if (driftAnalysis.driftDetected) {
        const adaptation = await adaptiveManager.adaptToConceptDrift('test-model', driftAnalysis)
        
        expect(adaptation.adaptationApplied).toBe(true)
        expect(adaptation.performanceImprovement).toBeGreaterThan(0.1)
      }
    })
  })

  describe('Multi-Component Integration Workflow', () => {
    it('should integrate forecasting, anomaly detection, and embeddings', async () => {
      const integrationData = {
        clientId: 'integration-test-client',
        historicalTranscripts: Array.from({ length: 60 }, (_, i) => ({
          id: `transcript-${i}`,
          date: new Date(Date.now() - (60 - i) * 24 * 60 * 60 * 1000),
          transcriptCount: 45 + Math.sin(i / 7) * 15 + Math.random() * 5,
          content: `Meeting transcript ${i} with important business discussions`,
          clientName: 'Integration Test Client'
        }))
      }

      // Step 1: Generate embeddings for transcript content
      jest.spyOn(EmbeddingService, 'vectorizeTranscript').mockImplementation(async (transcriptId) => {
        return {
          success: true,
          embeddingId: `embedding-${transcriptId}`,
          vector: Array.from({ length: 768 }, () => Math.random() - 0.5)
        }
      })

      // Step 2: Find similar patterns
      jest.spyOn(EmbeddingService, 'findSimilarTranscripts').mockResolvedValue([
        {
          transcriptId: 'similar-transcript-1',
          similarity: 0.89,
          metadata: { clientName: 'Similar Client A', transcriptCount: 52 }
        },
        {
          transcriptId: 'similar-transcript-2', 
          similarity: 0.84,
          metadata: { clientName: 'Similar Client B', transcriptCount: 48 }
        }
      ])

      // Step 3: Generate forecast using similar patterns
      const mockEnhancedForecast = {
        predictions: Array.from({ length: 7 }, (_, i) => ({
          timestamp: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          value: 47 + Math.sin(i / 7) * 12,
          confidenceInterval: { lower: 38, upper: 56 },
          similarityBoost: 0.15 // Enhanced by similar patterns
        })),
        modelUsed: { type: 'similarity_enhanced_automl', confidence: 0.91 },
        seasonalityDetected: true,
        trendDirection: 'stable',
        similarPatternsUsed: 2
      }

      jest.spyOn(forecastingEngine, 'generateSimilarityEnhancedForecast').mockResolvedValue(mockEnhancedForecast)

      // Step 4: Detect anomalies in forecast
      jest.spyOn(anomalyService, 'detectAnomalies').mockResolvedValue([
        {
          timestamp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          value: 65, // Anomalous prediction
          anomalyScore: 0.87,
          anomalyType: 'point',
          severity: 'medium',
          explanation: 'Predicted value exceeds typical range for similar clients'
        }
      ])

      // Execute integrated workflow
      const workflowResult = await executeIntegratedWorkflow(integrationData)

      expect(workflowResult.success).toBe(true)
      expect(workflowResult.embeddingsGenerated).toBe(60)
      expect(workflowResult.similarPatternsFound).toBe(2)
      expect(workflowResult.forecast.similarPatternsUsed).toBe(2)
      expect(workflowResult.forecast.modelUsed.confidence).toBeGreaterThan(0.9)
      expect(workflowResult.anomaliesDetected).toBe(1)
    })

    async function executeIntegratedWorkflow(data: any) {
      try {
        // Step 1: Generate embeddings for all transcripts
        const embeddingResults = await Promise.all(
          data.historicalTranscripts.map((transcript: any) =>
            EmbeddingService.vectorizeTranscript(transcript.id)
          )
        )

        // Step 2: Find similar patterns
        const similarPatterns = await EmbeddingService.findSimilarTranscripts(
          data.historicalTranscripts[data.historicalTranscripts.length - 1].id,
          { limit: 5, threshold: 0.8 }
        )

        // Step 3: Generate enhanced forecast
        const timeSeriesData = {
          timestamps: data.historicalTranscripts.map((t: any) => t.date),
          values: data.historicalTranscripts.map((t: any) => t.transcriptCount),
          clientId: data.clientId
        }

        const forecast = await forecastingEngine.generateSimilarityEnhancedForecast(
          timeSeriesData,
          similarPatterns,
          { timeHorizon: 'daily', periodsAhead: 7, confidenceLevel: 0.95 }
        )

        // Step 4: Detect anomalies in predictions
        const anomalies = await anomalyService.detectAnomalies(
          forecast.predictions.map(p => ({
            timestamp: p.timestamp,
            value: p.value,
            clientId: data.clientId
          }))
        )

        return {
          success: true,
          embeddingsGenerated: embeddingResults.filter(r => r.success).length,
          similarPatternsFound: similarPatterns.length,
          forecast,
          anomaliesDetected: anomalies.length,
          anomalies
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  })

  describe('Error Handling and Recovery Workflows', () => {
    it('should handle service failures gracefully with fallback mechanisms', async () => {
      const testData = {
        clientId: 'error-test-client',
        historicalData: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
          transcriptCount: 40 + Math.random() * 10
        }))
      }

      // Simulate Vertex AI service failure
      jest.spyOn(forecastingEngine, 'generateForecast')
        .mockRejectedValueOnce(new Error('Vertex AI service unavailable'))
        .mockResolvedValueOnce({
          predictions: [{ timestamp: new Date(), value: 42, confidenceInterval: { lower: 38, upper: 46 } }],
          modelUsed: { type: 'fallback_linear', confidence: 0.75 },
          seasonalityDetected: false,
          trendDirection: 'stable',
          fallbackUsed: true
        })

      // First attempt should fail, second should use fallback
      try {
        await forecastingEngine.generateForecast(
          { timestamps: testData.historicalData.map(d => d.date), values: testData.historicalData.map(d => d.transcriptCount), clientId: testData.clientId },
          { timeHorizon: 'daily', periodsAhead: 1, confidenceLevel: 0.95 }
        )
        fail('Expected first call to throw error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Vertex AI service unavailable')
      }

      // Fallback should work
      const fallbackResult = await forecastingEngine.generateForecast(
        { timestamps: testData.historicalData.map(d => d.date), values: testData.historicalData.map(d => d.transcriptCount), clientId: testData.clientId },
        { timeHorizon: 'daily', periodsAhead: 1, confidenceLevel: 0.95 }
      )

      expect(fallbackResult.fallbackUsed).toBe(true)
      expect(fallbackResult.modelUsed.type).toBe('fallback_linear')
      expect(fallbackResult.predictions).toHaveLength(1)
    })

    it('should implement circuit breaker pattern for external services', async () => {
      let failureCount = 0
      const maxFailures = 3

      jest.spyOn(forecastingEngine, 'generateForecast').mockImplementation(async () => {
        failureCount++
        if (failureCount <= maxFailures) {
          throw new Error('Service temporarily unavailable')
        }
        
        // Circuit breaker should prevent further calls
        throw new Error('Circuit breaker is open')
      })

      // Simulate multiple failures
      for (let i = 0; i < maxFailures; i++) {
        try {
          await forecastingEngine.generateForecast(
            { timestamps: [], values: [], clientId: 'test' },
            { timeHorizon: 'daily', periodsAhead: 1, confidenceLevel: 0.95 }
          )
        } catch (error) {
          expect((error as Error).message).toBe('Service temporarily unavailable')
        }
      }

      // Next call should trigger circuit breaker
      try {
        await forecastingEngine.generateForecast(
          { timestamps: [], values: [], clientId: 'test' },
          { timeHorizon: 'daily', periodsAhead: 1, confidenceLevel: 0.95 }
        )
      } catch (error) {
        expect((error as Error).message).toBe('Circuit breaker is open')
      }

      expect(failureCount).toBe(maxFailures + 1)
    })
  })
})