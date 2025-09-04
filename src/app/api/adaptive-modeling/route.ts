/**
 * API routes for Adaptive Modeling functionality
 * Provides endpoints for managing intelligent data modeling with adaptive capabilities
 */

import { NextRequest, NextResponse } from 'next/server'
import { AdaptiveModelingManager, AdaptiveModelingConfig } from '@/lib/services/adaptive-modeling/adaptive-modeling-manager'
import { 
  ModelPerformanceMetrics, 
  ActiveModel,
  ModelSwitchingDecision 
} from '@/lib/services/adaptive-modeling/types'

// Global instance (in production, this would be managed differently)
let adaptiveModelingManager: AdaptiveModelingManager | null = null

// Default configuration
const defaultConfig: AdaptiveModelingConfig = {
  driftDetection: {
    enabled: true,
    vertexAIConfig: {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'transcript-analytics',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
      endpointId: process.env.VERTEX_AI_ENDPOINT_ID || 'default-endpoint',
      alertConfig: {
        notificationChannels: [],
        alertThresholds: [
          { metricType: 'feature_drift', threshold: 0.3 },
          { metricType: 'prediction_drift', threshold: 0.2 }
        ]
      },
      driftDetectionConfig: {
        driftThresholds: {
          feature_drift: 0.3,
          prediction_drift: 0.2
        },
        samplingStrategy: {
          randomSampleConfig: {
            sampleRate: 0.1
          }
        }
      }
    },
    checkInterval: 60 // minutes
  },
  autoRetraining: {
    enabled: true,
    triggers: [
      { type: 'performance_degradation', threshold: 0.1, enabled: true, priority: 1 },
      { type: 'concept_drift', threshold: 0.3, enabled: true, priority: 2 },
      { type: 'data_quality', threshold: 0.05, enabled: true, priority: 3 },
      { type: 'scheduled', threshold: 0, enabled: true, priority: 4 }
    ],
    schedule: {
      frequency: 'weekly',
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
      maxTrainingTimeMinutes: 120,
      maxMemoryGB: 16,
      maxCpuCores: 8,
      maxGpuCount: 2,
      maxCostUSD: 100
    }
  },
  adaptivePreprocessing: {
    enabled: true,
    adaptationTriggers: [
      { type: 'data_quality_change', threshold: 0.1, enabled: true, responseAction: 'adjust_parameters' },
      { type: 'distribution_shift', threshold: 0.2, enabled: true, responseAction: 'add_step' },
      { type: 'performance_impact', threshold: 0.8, enabled: true, responseAction: 'replace_step' }
    ],
    preprocessingSteps: [
      { id: 'imputation', type: 'imputation', parameters: { strategy: 'mean' }, enabled: true, adaptive: true, priority: 3 },
      { id: 'outlier_removal', type: 'outlier_removal', parameters: { method: 'iqr', threshold: 1.5 }, enabled: true, adaptive: true, priority: 2 },
      { id: 'normalization', type: 'normalization', parameters: { method: 'drop_duplicates' }, enabled: true, adaptive: false, priority: 1 },
      { id: 'feature_scaling', type: 'feature_scaling', parameters: { method: 'standard_scaler' }, enabled: true, adaptive: true, priority: 4 }
    ],
    qualityMonitoring: {
      enabled: true,
      checkFrequency: 'hourly',
      qualityMetrics: [
        { name: 'completeness', type: 'completeness', weight: 0.3, enabled: true },
        { name: 'accuracy', type: 'accuracy', weight: 0.25, enabled: true },
        { name: 'consistency', type: 'consistency', weight: 0.2, enabled: true },
        { name: 'validity', type: 'validity', weight: 0.15, enabled: true },
        { name: 'uniqueness', type: 'uniqueness', weight: 0.1, enabled: true }
      ],
      alertThresholds: {
        completeness: 0.8,
        accuracy: 0.85,
        consistency: 0.9,
        validity: 0.95,
        uniqueness: 0.98
      }
    }
  },
  hyperparameterOptimization: {
    enabled: true,
    algorithm: 'bayesian',
    searchSpace: {
      parameters: [
        { name: 'learning_rate', type: 'continuous', range: [0.001, 0.1], distribution: 'log_uniform', priority: 'high' },
        { name: 'batch_size', type: 'discrete', range: [16, 32, 64, 128], priority: 'medium' },
        { name: 'hidden_units', type: 'discrete', range: [64, 128, 256, 512], priority: 'medium' },
        { name: 'dropout_rate', type: 'continuous', range: [0.1, 0.5], distribution: 'uniform', priority: 'low' }
      ],
      searchStrategy: 'adaptive',
      maxIterations: 50,
      parallelTrials: 3
    },
    optimizationObjective: {
      metric: 'accuracy',
      direction: 'maximize',
      weight: 1.0,
      constraints: [
        { metric: 'latency', operator: 'less_than', value: 500 }
      ]
    },
    constraints: {
      maxTrainingTime: 3600, // 1 hour
      maxMemoryUsage: 8192, // 8GB
      maxCost: 50,
      minAccuracy: 0.8,
      maxLatency: 500
    },
    earlyStoppingConfig: {
      enabled: true,
      patience: 10,
      minDelta: 0.001,
      metric: 'accuracy',
      mode: 'max'
    }
  },
  performanceTracking: {
    enabled: true,
    metricsRetentionDays: 90,
    healthCheckInterval: 15 // minutes
  }
}

// Initialize manager
async function getManager(): Promise<AdaptiveModelingManager> {
  if (!adaptiveModelingManager) {
    adaptiveModelingManager = new AdaptiveModelingManager(defaultConfig)
    await adaptiveModelingManager.initialize()
  }
  return adaptiveModelingManager
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const modelId = searchParams.get('modelId')

    const manager = await getManager()

    switch (action) {
      case 'status':
        return NextResponse.json({
          success: true,
          data: manager.getSystemStatus()
        })

      case 'health':
        return NextResponse.json({
          success: true,
          data: manager.getSystemHealth()
        })

      case 'state':
        return NextResponse.json({
          success: true,
          data: manager.getAdaptiveModelingState()
        })

      case 'performance-history':
        if (!modelId) {
          return NextResponse.json({
            success: false,
            error: 'Model ID is required for performance history'
          }, { status: 400 })
        }
        
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
        return NextResponse.json({
          success: true,
          data: manager.getPerformanceHistory(modelId, limit)
        })

      case 'switching-recommendations':
        return NextResponse.json({
          success: true,
          data: manager.getModelSwitchingRecommendations(modelId || undefined)
        })

      case 'events':
        const eventLimit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100
        return NextResponse.json({
          success: true,
          data: manager.getRecentEvents(eventLimit)
        })

      case 'data-quality':
        const datasetId = searchParams.get('datasetId')
        if (!datasetId) {
          return NextResponse.json({
            success: false,
            error: 'Dataset ID is required for data quality history'
          }, { status: 400 })
        }
        
        return NextResponse.json({
          success: true,
          data: manager.getDataQualityHistory(datasetId)
        })

      case 'optimization-status':
        if (!modelId) {
          return NextResponse.json({
            success: false,
            error: 'Model ID is required for optimization status'
          }, { status: 400 })
        }
        
        return NextResponse.json({
          success: true,
          data: manager.getOptimizationStatus(modelId)
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in adaptive modeling GET:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    const manager = await getManager()

    switch (action) {
      case 'track-performance':
        const { metrics } = body as { metrics: ModelPerformanceMetrics }
        if (!metrics) {
          return NextResponse.json({
            success: false,
            error: 'Performance metrics are required'
          }, { status: 400 })
        }

        await manager.processPerformanceMetrics(metrics)
        return NextResponse.json({
          success: true,
          message: 'Performance metrics processed successfully'
        })

      case 'register-model':
        const { model } = body as { model: ActiveModel }
        if (!model) {
          return NextResponse.json({
            success: false,
            error: 'Model configuration is required'
          }, { status: 400 })
        }

        manager.registerModel(model)
        return NextResponse.json({
          success: true,
          message: 'Model registered successfully'
        })

      case 'process-data':
        const { data, datasetId, targetColumn } = body
        if (!data || !datasetId) {
          return NextResponse.json({
            success: false,
            error: 'Data and dataset ID are required'
          }, { status: 400 })
        }

        const result = await manager.processData(data, datasetId, targetColumn)
        return NextResponse.json({
          success: true,
          data: result
        })

      case 'detect-drift':
        const { modelId, currentData, referenceData } = body
        if (!modelId || !currentData || !referenceData) {
          return NextResponse.json({
            success: false,
            error: 'Model ID, current data, and reference data are required'
          }, { status: 400 })
        }

        const driftResult = await manager.detectConceptDrift(modelId, currentData, referenceData)
        return NextResponse.json({
          success: true,
          data: driftResult
        })

      case 'optimize-hyperparameters':
        const { modelId: optModelId, modelType, trainingData, validationData } = body
        if (!optModelId || !modelType || !trainingData || !validationData) {
          return NextResponse.json({
            success: false,
            error: 'Model ID, model type, training data, and validation data are required'
          }, { status: 400 })
        }

        const optimizationResult = await manager.optimizeHyperparameters(
          optModelId, modelType, trainingData, validationData
        )
        return NextResponse.json({
          success: true,
          data: optimizationResult
        })

      case 'execute-model-switch':
        const { decision } = body as { decision: ModelSwitchingDecision }
        if (!decision) {
          return NextResponse.json({
            success: false,
            error: 'Switching decision is required'
          }, { status: 400 })
        }

        const switchResult = await manager.executeModelSwitch(decision)
        return NextResponse.json({
          success: true,
          data: { switched: switchResult }
        })

      case 'update-config':
        const { config } = body
        if (!config) {
          return NextResponse.json({
            success: false,
            error: 'Configuration is required'
          }, { status: 400 })
        }

        manager.updateConfig(config)
        return NextResponse.json({
          success: true,
          message: 'Configuration updated successfully'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in adaptive modeling POST:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID parameter is required'
      }, { status: 400 })
    }

    const manager = await getManager()

    switch (action) {
      case 'cancel-optimization':
        const cancelled = manager.cancelOptimization(id)
        return NextResponse.json({
          success: true,
          data: { cancelled }
        })

      case 'cancel-retraining':
        const retrainingCancelled = await manager.cancelRetraining(id)
        return NextResponse.json({
          success: true,
          data: { cancelled: retrainingCancelled }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in adaptive modeling DELETE:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}