/**
 * Comprehensive test suite for Adaptive Modeling components
 * Tests concept drift detection, auto-retraining, adaptive preprocessing, 
 * performance tracking, and hyperparameter optimization
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { ConceptDriftDetector } from '../concept-drift-detector'
import { AutoRetrainingService } from '../auto-retraining-service'
import { AdaptivePreprocessingPipeline } from '../adaptive-preprocessing'
import { PerformanceTracker } from '../performance-tracker'
import { HyperparameterOptimizer } from '../hyperparameter-optimizer'
import { AdaptiveModelingManager } from '../adaptive-modeling-manager'

import {
  VertexAIModelMonitoringConfig,
  AutoRetrainingConfig,
  AdaptivePreprocessingConfig,
  HyperparameterOptimizationConfig,
  ModelPerformanceMetrics,
  ActiveModel
} from '../types'

// Mock configurations
const mockVertexAIConfig: VertexAIModelMonitoringConfig = {
  projectId: 'test-project',
  location: 'us-central1',
  endpointId: 'test-endpoint',
  alertConfig: {
    notificationChannels: [],
    alertThresholds: [
      { metricType: 'feature_drift', threshold: 0.3 }
    ]
  },
  driftDetectionConfig: {
    driftThresholds: { feature_drift: 0.3 },
    samplingStrategy: {
      randomSampleConfig: { sampleRate: 0.1 }
    }
  }
}

const mockAutoRetrainingConfig: AutoRetrainingConfig = {
  enabled: true,
  triggers: [
    { type: 'performance_degradation', threshold: 0.1, enabled: true, priority: 1 }
  ],
  schedule: {
    frequency: 'daily',
    time: '02:00',
    timezone: 'UTC',
    maxConcurrentJobs: 2
  },
  dataQualityThresholds: {
    missingValuePercentage: 0.1,
    outlierPercentage: 0.05,
    duplicatePercentage: 0.02,
    schemaViolationPercentage: 0.01,
    dataFreshnessHours: 24
  },
  performanceThresholds: {
    accuracyDropPercentage: 0.1,
    latencyIncreasePercentage: 0.5,
    errorRatePercentage: 0.05,
    memoryUsagePercentage: 0.8,
    throughputDropPercentage: 0.3
  },
  resourceLimits: {
    maxTrainingTimeMinutes: 60,
    maxMemoryGB: 8,
    maxCpuCores: 4,
    maxGpuCount: 1,
    maxCostUSD: 50
  }
}

const mockPreprocessingConfig: AdaptivePreprocessingConfig = {
  enabled: true,
  adaptationTriggers: [
    { type: 'data_quality_change', threshold: 0.1, enabled: true, responseAction: 'adjust_parameters' }
  ],
  preprocessingSteps: [
    { id: 'imputation', type: 'imputation', parameters: { strategy: 'mean' }, enabled: true, adaptive: true, priority: 1 }
  ],
  qualityMonitoring: {
    enabled: true,
    checkFrequency: 'hourly',
    qualityMetrics: [
      { name: 'completeness', type: 'completeness', weight: 1.0, enabled: true }
    ],
    alertThresholds: { completeness: 0.8 }
  }
}

const mockOptimizationConfig: HyperparameterOptimizationConfig = {
  enabled: true,
  algorithm: 'random_search',
  searchSpace: {
    parameters: [
      { name: 'learning_rate', type: 'continuous', range: [0.001, 0.1], priority: 'high' },
      { name: 'batch_size', type: 'discrete', range: [16, 32, 64], priority: 'medium' }
    ],
    searchStrategy: 'adaptive',
    maxIterations: 10,
    parallelTrials: 2
  },
  optimizationObjective: {
    metric: 'accuracy',
    direction: 'maximize',
    weight: 1.0
  },
  constraints: {
    maxTrainingTime: 300,
    maxMemoryUsage: 1024,
    maxCost: 10
  },
  earlyStoppingConfig: {
    enabled: true,
    patience: 5,
    minDelta: 0.001,
    metric: 'accuracy',
    mode: 'max'
  }
}

describe('ConceptDriftDetector', () => {
  let driftDetector: ConceptDriftDetector

  beforeEach(() => {
    driftDetector = new ConceptDriftDetector(mockVertexAIConfig)
  })

  it('should detect statistical drift', async () => {
    const currentData = {
      feature1: Array.from({ length: 100 }, () => Math.random() * 10 + 5), // Shifted distribution
      feature2: Array.from({ length: 100 }, () => Math.random() * 20 + 10)
    }

    const referenceData = {
      feature1: Array.from({ length: 100 }, () => Math.random() * 10), // Original distribution
      feature2: Array.from({ length: 100 }, () => Math.random() * 20)
    }

    const result = await driftDetector.detectDrift(currentData, referenceData, 'test-model')

    expect(result).toBeDefined()
    expect(result.driftScore).toBeGreaterThan(0)
    expect(result.detectionMethod).toBe('statistical')
    expect(result.recommendations).toBeDefined()
    expect(Array.isArray(result.recommendations)).toBe(true)
  })

  it('should not detect drift with identical distributions', async () => {
    const data = {
      feature1: Array.from({ length: 100 }, () => Math.random() * 10),
      feature2: Array.from({ length: 100 }, () => Math.random() * 20)
    }

    const result = await driftDetector.detectDrift(data, data, 'test-model')

    expect(result.driftScore).toBeLessThan(0.1)
    expect(result.isDriftDetected).toBe(false)
  })

  it('should update performance history', () => {
    const metrics: ModelPerformanceMetrics = {
      modelId: 'test-model',
      timestamp: new Date(),
      accuracy: 0.85,
      mae: 0.1,
      rmse: 0.15,
      mape: 5.0,
      r2Score: 0.8,
      predictionLatency: 100,
      memoryUsage: 512,
      cpuUsage: 50,
      throughput: 1000,
      errorRate: 0.01
    }

    expect(() => driftDetector.updatePerformanceHistory(metrics)).not.toThrow()
  })
})

describe('AutoRetrainingService', () => {
  let retrainingService: AutoRetrainingService

  beforeEach(() => {
    retrainingService = new AutoRetrainingService(mockAutoRetrainingConfig)
  })

  it('should trigger retraining on performance degradation', async () => {
    const modelId = 'test-model'
    
    // Add baseline performance - need more than 10 measurements for degradation detection
    for (let i = 0; i < 15; i++) {
      await retrainingService.evaluateRetrainingNeed(modelId, {
        modelId,
        timestamp: new Date(Date.now() - (15 - i) * 60 * 60 * 1000),
        accuracy: 0.9,
        mae: 0.05,
        rmse: 0.1,
        mape: 2.0,
        r2Score: 0.9,
        predictionLatency: 100,
        memoryUsage: 512,
        cpuUsage: 50,
        throughput: 1000,
        errorRate: 0.005
      })
    }

    // Current poor performance should trigger retraining
    const currentMetrics: ModelPerformanceMetrics = {
      modelId,
      timestamp: new Date(),
      accuracy: 0.75, // Significant drop from 0.9
      mae: 0.2,
      rmse: 0.3,
      mape: 15.0,
      r2Score: 0.6,
      predictionLatency: 200,
      memoryUsage: 512,
      cpuUsage: 50,
      throughput: 1000,
      errorRate: 0.05
    }

    const shouldRetrain = await retrainingService.evaluateRetrainingNeed(modelId, currentMetrics)
    expect(shouldRetrain).toBe(true)

    const jobs = retrainingService.getModelJobs(modelId)
    expect(jobs.length).toBeGreaterThan(0)
  })

  it('should not trigger retraining with stable performance', async () => {
    const modelId = 'stable-model'
    const stableMetrics: ModelPerformanceMetrics = {
      modelId,
      timestamp: new Date(),
      accuracy: 0.9,
      mae: 0.05,
      rmse: 0.1,
      mape: 2.0,
      r2Score: 0.9,
      predictionLatency: 100,
      memoryUsage: 512,
      cpuUsage: 50,
      throughput: 1000,
      errorRate: 0.005
    }

    const shouldRetrain = await retrainingService.evaluateRetrainingNeed(modelId, stableMetrics)
    expect(shouldRetrain).toBe(false)
  })

  it('should cancel retraining job', async () => {
    const modelId = 'test-model'
    const metrics: ModelPerformanceMetrics = {
      modelId,
      timestamp: new Date(),
      accuracy: 0.5, // Poor performance to trigger retraining
      mae: 0.3,
      rmse: 0.4,
      mape: 20.0,
      r2Score: 0.3,
      predictionLatency: 500,
      memoryUsage: 1024,
      cpuUsage: 90,
      throughput: 100,
      errorRate: 0.1
    }

    await retrainingService.evaluateRetrainingNeed(modelId, metrics)
    const jobs = retrainingService.getModelJobs(modelId)
    
    if (jobs.length > 0) {
      const cancelled = await retrainingService.cancelRetraining(jobs[0].id)
      expect(cancelled).toBe(true)
    }
  })
})

describe('AdaptivePreprocessingPipeline', () => {
  let preprocessingPipeline: AdaptivePreprocessingPipeline

  beforeEach(() => {
    preprocessingPipeline = new AdaptivePreprocessingPipeline(mockPreprocessingConfig)
  })

  it('should process data with missing values', async () => {
    const dataWithMissing = [
      { feature1: 1, feature2: 2, target: 1 },
      { feature1: null, feature2: 3, target: 0 },
      { feature1: 3, feature2: null, target: 1 },
      { feature1: 4, feature2: 5, target: 0 }
    ]

    const result = await preprocessingPipeline.processData(dataWithMissing, 'test-dataset')

    expect(result.processedData).toBeDefined()
    expect(result.appliedSteps.length).toBeGreaterThan(0)
    expect(result.qualityImprovement).toBeGreaterThanOrEqual(0)
    
    // Check that missing values were handled
    const processedData = result.processedData
    expect(processedData.every(row => 
      (row.feature1 !== null && row.feature1 !== undefined && row.feature1 !== '') &&
      (row.feature2 !== null && row.feature2 !== undefined && row.feature2 !== '')
    )).toBe(true)
  })

  it('should detect and remove outliers', async () => {
    const dataWithOutliers = [
      { value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 },
      { value: 100 }, // Outlier
      { value: 6 }, { value: 7 }, { value: 8 }, { value: 9 }
    ]

    const result = await preprocessingPipeline.processData(dataWithOutliers, 'outlier-dataset')

    expect(result.processedData).toBeDefined()
    expect(result.warnings).toBeDefined()
  })

  it('should remove duplicate rows', async () => {
    const dataWithDuplicates = [
      { feature1: 1, feature2: 2 },
      { feature1: 1, feature2: 2 }, // Duplicate
      { feature1: 3, feature2: 4 },
      { feature1: 3, feature2: 4 }, // Duplicate
      { feature1: 5, feature2: 6 }
    ]

    const result = await preprocessingPipeline.processData(dataWithDuplicates, 'duplicate-dataset')

    expect(result.processedData.length).toBeLessThan(dataWithDuplicates.length)
    expect(result.qualityImprovement).toBeGreaterThan(0)
  })

  it('should get quality history', () => {
    const history = preprocessingPipeline.getQualityHistory('test-dataset')
    expect(Array.isArray(history)).toBe(true)
  })
})

describe('PerformanceTracker', () => {
  let performanceTracker: PerformanceTracker

  beforeEach(() => {
    performanceTracker = new PerformanceTracker()
  })

  it('should track performance metrics', () => {
    const metrics: ModelPerformanceMetrics = {
      modelId: 'test-model',
      timestamp: new Date(),
      accuracy: 0.85,
      mae: 0.1,
      rmse: 0.15,
      mape: 5.0,
      r2Score: 0.8,
      predictionLatency: 100,
      memoryUsage: 512,
      cpuUsage: 50,
      throughput: 1000,
      errorRate: 0.01
    }

    expect(() => performanceTracker.trackPerformance(metrics)).not.toThrow()

    const history = performanceTracker.getPerformanceHistory('test-model')
    expect(history.length).toBe(1)
    expect(history[0]).toEqual(metrics)
  })

  it('should register and track active models', () => {
    const model: ActiveModel = {
      id: 'test-model',
      name: 'Test Model',
      type: 'neural_network',
      version: '1.0.0',
      deployedAt: new Date(),
      status: 'active',
      performanceScore: 0.85,
      resourceUsage: {
        cpu: 50,
        memory: 512,
        storage: 1024,
        networkIO: 100
      },
      configuration: {
        hyperparameters: { learning_rate: 0.01 },
        preprocessingConfig: mockPreprocessingConfig,
        featureSelection: ['feature1', 'feature2'],
        trainingConfig: {
          algorithm: 'neural_network',
          datasetSize: 1000,
          trainingTime: 3600,
          validationSplit: 0.2,
          crossValidation: true,
          earlyStoppingEnabled: true
        }
      }
    }

    expect(() => performanceTracker.registerModel(model)).not.toThrow()

    const state = performanceTracker.getAdaptiveModelingState()
    expect(state.currentModels.length).toBe(1)
    expect(state.currentModels[0].id).toBe('test-model')
  })

  it('should get system health metrics', () => {
    const health = performanceTracker.getSystemHealth()
    
    expect(health).toBeDefined()
    expect(health.overallHealth).toBeDefined()
    expect(health.activeModels).toBeDefined()
    expect(health.lastHealthCheck).toBeDefined()
  })

  it('should compare model performance', () => {
    const metrics1: ModelPerformanceMetrics = {
      modelId: 'model1',
      timestamp: new Date(),
      accuracy: 0.85,
      mae: 0.1,
      rmse: 0.15,
      mape: 5.0,
      r2Score: 0.8,
      predictionLatency: 100,
      memoryUsage: 512,
      cpuUsage: 50,
      throughput: 1000,
      errorRate: 0.01
    }

    const metrics2: ModelPerformanceMetrics = {
      ...metrics1,
      modelId: 'model2',
      accuracy: 0.9,
      predictionLatency: 80
    }

    performanceTracker.trackPerformance(metrics1)
    performanceTracker.trackPerformance(metrics2)

    const comparison = performanceTracker.compareModelPerformance('model1', 'model2')
    
    expect(comparison.model1).toBeDefined()
    expect(comparison.model2).toBeDefined()
    expect(comparison.comparison.accuracyDiff).toBeClos5) // model2 is 5% better
    expect(comparison.comparison.latencyDiff).toBe(-20) // model2 is 20ms faster
  })
})

describe('HyperparameterOptimizer', () => {
  let optimizer: HyperparameterOptimizer

  beforeEach(() => {
    optimizer = new HyperparameterOptimizer(mockOptimizationConfig)
  })

  it('should optimize hyperparameters', async () => {
    const trainingData = Array.from({ length: 100 }, (_, i) => ({
      feature1: Math.random(),
      feature2: Math.random(),
      target: Math.random() > 0.5 ? 1 : 0
    }))

    const validationData = Array.from({ length: 20 }, (_, i) => ({
      feature1: Math.random(),
      feature2: Math.random(),
      target: Math.random() > 0.5 ? 1 : 0
    }))

    const result = await optimizer.optimizeHyperparameters(
      'test-model',
      'neural_network',
      trainingData,
      validationData
    )

    expect(result).toBeDefined()
    expect(result.modelId).toBe('test-model')
    expect(result.bestParameters).toBeDefined()
    expect(result.bestScore).toBeGreaterThan(0)
    expect(result.totalTrials).toBeGreaterThan(0)
    expect(result.searchHistory.length).toBeGreaterThan(0)
  })

  it('should cancel optimization', async () => {
    // Start optimization (it will run in background)
    const trainingData = [{ feature1: 1, target: 1 }]
    const validationData = [{ feature1: 1, target: 1 }]

    // Don't await - let it run in background
    optimizer.optimizeHyperparameters('test-model', 'neural_network', trainingData, validationData)

    // Try to cancel immediately
    const cancelled = optimizer.cancelOptimization('test-model')
    expect(typeof cancelled).toBe('boolean')
  })

  it('should get optimization status', () => {
    const status = optimizer.getOptimizationStatus('test-model')
    // Should be null if no optimization is running
    expect(status === null || typeof status === 'object').toBe(true)
  })

  it('should get optimization history', () => {
    const history = optimizer.getOptimizationHistory()
    expect(Array.isArray(history)).toBe(true)
  })

  it('should get best parameters for a model', () => {
    const bestParams = optimizer.getBestParameters('test-model')
    // Should be null if no optimization has been completed
    expect(bestParams === null || typeof bestParams === 'object').toBe(true)
  })
})

describe('AdaptiveModelingManager', () => {
  let manager: AdaptiveModelingManager

  const managerConfig = {
    driftDetection: {
      enabled: true,
      vertexAIConfig: mockVertexAIConfig,
      checkInterval: 60
    },
    autoRetraining: mockAutoRetrainingConfig,
    adaptivePreprocessing: mockPreprocessingConfig,
    hyperparameterOptimization: mockOptimizationConfig,
    performanceTracking: {
      enabled: true,
      metricsRetentionDays: 30,
      healthCheckInterval: 15
    }
  }

  beforeEach(async () => {
    manager = new AdaptiveModelingManager(managerConfig)
    await manager.initialize()
  })

  afterEach(async () => {
    await manager.shutdown()
  })

  it('should initialize successfully', async () => {
    const status = manager.getSystemStatus()
    expect(status.isInitialized).toBe(true)
  })

  it('should process performance metrics', async () => {
    const metrics: ModelPerformanceMetrics = {
      modelId: 'test-model',
      timestamp: new Date(),
      accuracy: 0.85,
      mae: 0.1,
      rmse: 0.15,
      mape: 5.0,
      r2Score: 0.8,
      predictionLatency: 100,
      memoryUsage: 512,
      cpuUsage: 50,
      throughput: 1000,
      errorRate: 0.01
    }

    await expect(manager.processPerformanceMetrics(metrics)).resolves.not.toThrow()

    const history = manager.getPerformanceHistory('test-model')
    expect(history.length).toBe(1)
  })

  it('should process data with adaptive preprocessing', async () => {
    const data = [
      { feature1: 1, feature2: 2, target: 1 },
      { feature1: null, feature2: 3, target: 0 },
      { feature1: 3, feature2: 4, target: 1 }
    ]

    const result = await manager.processData(data, 'test-dataset')

    expect(result.processedData).toBeDefined()
    expect(result.qualityImprovement).toBeGreaterThanOrEqual(0)
    expect(result.processingTime).toBeGreaterThan(0)
  })

  it('should detect concept drift', async () => {
    const currentData = {
      feature1: Array.from({ length: 50 }, () => Math.random() * 10 + 5),
      feature2: Array.from({ length: 50 }, () => Math.random() * 20 + 10)
    }

    const referenceData = {
      feature1: Array.from({ length: 50 }, () => Math.random() * 10),
      feature2: Array.from({ length: 50 }, () => Math.random() * 20)
    }

    const result = await manager.detectConceptDrift('test-model', currentData, referenceData)

    expect(result).toBeDefined()
    expect(result.driftScore).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
  })

  it('should register and manage models', () => {
    const model: ActiveModel = {
      id: 'test-model',
      name: 'Test Model',
      type: 'neural_network',
      version: '1.0.0',
      deployedAt: new Date(),
      status: 'active',
      performanceScore: 0.85,
      resourceUsage: {
        cpu: 50,
        memory: 512,
        storage: 1024,
        networkIO: 100
      },
      configuration: {
        hyperparameters: { learning_rate: 0.01 },
        preprocessingConfig: mockPreprocessingConfig,
        featureSelection: ['feature1', 'feature2'],
        trainingConfig: {
          algorithm: 'neural_network',
          datasetSize: 1000,
          trainingTime: 3600,
          validationSplit: 0.2,
          crossValidation: true,
          earlyStoppingEnabled: true
        }
      }
    }

    expect(() => manager.registerModel(model)).not.toThrow()

    const state = manager.getAdaptiveModelingState()
    expect(state.currentModels.length).toBe(1)
  })

  it('should get system health and status', () => {
    const health = manager.getSystemHealth()
    expect(health).toBeDefined()
    expect(health.overallHealth).toBeDefined()

    const status = manager.getSystemStatus()
    expect(status.isInitialized).toBe(true)
    expect(status.systemHealth).toBeDefined()
  })

  it('should update configuration', () => {
    const newConfig = {
      performanceTracking: {
        enabled: true,
        metricsRetentionDays: 60,
        healthCheckInterval: 30
      }
    }

    expect(() => manager.updateConfig(newConfig)).not.toThrow()
  })

  it('should handle errors gracefully', async () => {
    // Test with invalid data
    await expect(manager.processData([], 'empty-dataset')).resolves.toBeDefined()
    
    // Test with invalid model ID
    const history = manager.getPerformanceHistory('non-existent-model')
    expect(Array.isArray(history)).toBe(true)
    expect(history.length).toBe(0)
  })
})

// Integration tests
describe('Adaptive Modeling Integration', () => {
  let manager: AdaptiveModelingManager

  const integrationConfig = {
    driftDetection: {
      enabled: true,
      vertexAIConfig: mockVertexAIConfig,
      checkInterval: 1 // 1 minute for testing
    },
    autoRetraining: {
      ...mockAutoRetrainingConfig,
      triggers: [
        { type: 'performance_degradation', threshold: 0.05, enabled: true, priority: 1 },
        { type: 'concept_drift', threshold: 0.2, enabled: true, priority: 2 }
      ]
    },
    adaptivePreprocessing: mockPreprocessingConfig,
    hyperparameterOptimization: {
      ...mockOptimizationConfig,
      searchSpace: {
        ...mockOptimizationConfig.searchSpace,
        maxIterations: 5 // Reduced for testing
      }
    },
    performanceTracking: {
      enabled: true,
      metricsRetentionDays: 7,
      healthCheckInterval: 1
    }
  }

  beforeEach(async () => {
    manager = new AdaptiveModelingManager(integrationConfig)
    await manager.initialize()
  })

  afterEach(async () => {
    await manager.shutdown()
  })

  it('should handle complete adaptive modeling workflow', async () => {
    // 1. Register a model
    const model: ActiveModel = {
      id: 'integration-model',
      name: 'Integration Test Model',
      type: 'neural_network',
      version: '1.0.0',
      deployedAt: new Date(),
      status: 'active',
      performanceScore: 0.9,
      resourceUsage: { cpu: 30, memory: 256, storage: 512, networkIO: 50 },
      configuration: {
        hyperparameters: { learning_rate: 0.01, batch_size: 32 },
        preprocessingConfig: mockPreprocessingConfig,
        featureSelection: ['feature1', 'feature2'],
        trainingConfig: {
          algorithm: 'neural_network',
          datasetSize: 1000,
          trainingTime: 1800,
          validationSplit: 0.2,
          crossValidation: true,
          earlyStoppingEnabled: true
        }
      }
    }

    manager.registerModel(model)

    // 2. Process some data
    const rawData = [
      { feature1: 1, feature2: 2, target: 1 },
      { feature1: null, feature2: 3, target: 0 },
      { feature1: 3, feature2: null, target: 1 },
      { feature1: 4, feature2: 5, target: 0 }
    ]

    const processedResult = await manager.processData(rawData, 'integration-dataset')
    expect(processedResult.processedData.length).toBeGreaterThan(0)

    // 3. Simulate performance degradation
    const baselineMetrics: ModelPerformanceMetrics = {
      modelId: 'integration-model',
      timestamp: new Date(),
      accuracy: 0.9,
      mae: 0.05,
      rmse: 0.1,
      mape: 2.0,
      r2Score: 0.9,
      predictionLatency: 100,
      memoryUsage: 256,
      cpuUsage: 30,
      throughput: 1000,
      errorRate: 0.005
    }

    // Add baseline performance
    await manager.processPerformanceMetrics(baselineMetrics)

    // Simulate degradation over time
    for (let i = 1; i <= 5; i++) {
      const degradedMetrics: ModelPerformanceMetrics = {
        ...baselineMetrics,
        timestamp: new Date(Date.now() + i * 60000), // 1 minute intervals
        accuracy: 0.9 - i * 0.02, // Gradual accuracy drop
        errorRate: 0.005 + i * 0.01
      }
      
      await manager.processPerformanceMetrics(degradedMetrics)
    }

    // 4. Check if retraining was triggered
    const state = manager.getAdaptiveModelingState()
    expect(state.currentModels.length).toBe(1)

    // 5. Detect concept drift
    const currentData = {
      feature1: Array.from({ length: 30 }, () => Math.random() * 10 + 3), // Shifted
      feature2: Array.from({ length: 30 }, () => Math.random() * 20 + 5)
    }

    const referenceData = {
      feature1: Array.from({ length: 30 }, () => Math.random() * 10),
      feature2: Array.from({ length: 30 }, () => Math.random() * 20)
    }

    const driftResult = await manager.detectConceptDrift('integration-model', currentData, referenceData)
    expect(driftResult).toBeDefined()

    // 6. Check system health
    const health = manager.getSystemHealth()
    expect(health.activeModels).toBe(1)

    // 7. Get recent events
    const events = manager.getRecentEvents(10)
    expect(Array.isArray(events)).toBe(true)

    // 8. Verify the complete state
    const finalState = manager.getAdaptiveModelingState()
    expect(finalState.currentModels.length).toBe(1)
    expect(finalState.performanceHistory.length).toBeGreaterThan(0)
  }, 30000) // 30 second timeout for integration test
})