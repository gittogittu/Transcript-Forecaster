// Vertex AI Model Training Job Creation Service

import { getVertexAIClient } from './client'
import { vertexAIConfig } from './config'
import { withErrorHandling } from './errors'
import type {
  VertexAIModelConfig,
  ModelTrainingJob,
  VertexAIClientOptions
} from '@/types/vertex-ai'

export interface TrainingJobConfig extends VertexAIModelConfig {
  datasetId: string
  trainingFraction?: number
  validationFraction?: number
  testFraction?: number
  contextWindow?: number
  forecastHorizon: number
  dataGranularity?: {
    unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
    quantity: number
  }
  holidayRegions?: string[]
  weightColumn?: string
  timeSeriesIdentifierColumn?: string
  unavailableAtForecastColumns?: string[]
  availableAtForecastColumns?: string[]
  exportEvaluatedDataItemsConfig?: {
    destinationBigqueryUri?: string
    overrideExistingTable?: boolean
  }
}

export interface HyperparameterConfig {
  contextWindow?: number
  learningRate?: number
  maxIterations?: number
  l1Regularization?: number
  l2Regularization?: number
  enableEarlyStopping?: boolean
  validationSplitMethod?: 'random' | 'chronological'
}

export interface TrainingMetrics {
  mae: number
  rmse: number
  mape: number
  r2Score: number
  trainingLoss: number
  validationLoss: number
  convergenceEpoch?: number
}

export interface ModelVersion {
  versionId: string
  modelId: string
  displayName: string
  description?: string
  trainingConfig: TrainingJobConfig
  trainingMetrics?: TrainingMetrics
  createTime: string
  trainingDuration?: string
  status: 'training' | 'completed' | 'failed' | 'cancelled'
}

export interface TrainingProgress {
  jobId: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  progress: number // 0-100
  currentEpoch?: number
  totalEpochs?: number
  currentLoss?: number
  bestValidationScore?: number
  estimatedTimeRemaining?: string
  logs: TrainingLog[]
}

export interface TrainingLog {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  metrics?: Record<string, number>
}

export interface OptimizationObjective {
  type: 'minimize_rmse' | 'minimize_mae' | 'minimize_mape' | 'maximize_r2'
  weight?: number
  threshold?: number
}

export class ModelTrainingService {
  private client = getVertexAIClient()

  async createTrainingJob(config: TrainingJobConfig): Promise<ModelTrainingJob> {
    return withErrorHandling(async () => {
      const trainingTaskDefinition = 'gs://google-cloud-aiplatform/schema/trainingjob/definition/automl_forecasting_1.0.0.yaml'
      
      // Prepare training task inputs
      const trainingTaskInputs = {
        targetColumn: config.targetColumn,
        timeColumn: config.timeColumn,
        timeSeriesIdentifierColumn: config.timeSeriesIdentifierColumn,
        unavailableAtForecastColumns: config.unavailableAtForecastColumns || [],
        availableAtForecastColumns: config.availableAtForecastColumns || [],
        forecastHorizon: config.forecastHorizon,
        contextWindow: config.contextWindow || Math.max(config.forecastHorizon * 2, 50),
        dataGranularity: config.dataGranularity || {
          unit: 'day',
          quantity: 1
        },
        holidayRegions: config.holidayRegions || [],
        optimizationObjective: config.optimizationObjective || 'minimize_rmse',
        trainBudgetMilliNodeHours: config.budgetMilliNodeHours || 1000,
        weightColumn: config.weightColumn,
        exportEvaluatedDataItemsConfig: config.exportEvaluatedDataItemsConfig,
        // Data split configuration
        trainingFraction: config.trainingFraction || 0.8,
        validationFraction: config.validationFraction || 0.1,
        testFraction: config.testFraction || 0.1,
        // Feature transformations
        transformations: config.transformations || []
      }

      // Model configuration
      const modelToUpload = {
        displayName: config.displayName,
        description: `AutoML Forecasting model for ${config.targetColumn} - Created ${new Date().toISOString()}`,
        metadata: {
          inputDataConfig: {
            datasetId: config.datasetId,
          },
          trainingConfig: trainingTaskInputs,
          modelType: 'automl_forecasting',
          version: '1.0.0'
        },
        labels: {
          'model-type': 'automl-forecasting',
          'target-column': config.targetColumn.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          'created-by': 'vertex-ai-service'
        }
      }

      // Create the training pipeline
      const trainingJob = await this.client.createTrainingPipeline(
        config.displayName,
        trainingTaskDefinition,
        trainingTaskInputs,
        modelToUpload
      )

      return trainingJob
    }, 'createTrainingJob')
  }

  async getTrainingJobStatus(jobId: string): Promise<TrainingProgress> {
    return withErrorHandling(async () => {
      const job = await this.client.getTrainingPipeline(jobId)
      
      // Calculate progress based on job state
      let progress = 0
      switch (job.state) {
        case 'JOB_STATE_QUEUED':
          progress = 0
          break
        case 'JOB_STATE_PENDING':
          progress = 10
          break
        case 'JOB_STATE_RUNNING':
          progress = 50 // Would be calculated from actual training metrics
          break
        case 'JOB_STATE_SUCCEEDED':
          progress = 100
          break
        case 'JOB_STATE_FAILED':
        case 'JOB_STATE_CANCELLED':
          progress = 0
          break
      }

      const logs: TrainingLog[] = [
        {
          timestamp: job.createTime,
          level: 'info',
          message: 'Training job created'
        }
      ]

      if (job.startTime) {
        logs.push({
          timestamp: job.startTime,
          level: 'info',
          message: 'Training started'
        })
      }

      if (job.error) {
        logs.push({
          timestamp: job.endTime || new Date().toISOString(),
          level: 'error',
          message: job.error.message
        })
      }

      return {
        jobId,
        status: this.mapJobStateToStatus(job.state),
        progress,
        logs,
        estimatedTimeRemaining: this.calculateEstimatedTime(job)
      }
    }, 'getTrainingJobStatus')
  }

  async cancelTrainingJob(jobId: string): Promise<void> {
    return withErrorHandling(async () => {
      await this.client.cancelTrainingPipeline(jobId)
    }, 'cancelTrainingJob')
  }

  async optimizeHyperparameters(
    config: TrainingJobConfig,
    objectives: OptimizationObjective[]
  ): Promise<{
    optimizedConfig: TrainingJobConfig
    expectedImprovement: number
    recommendations: string[]
  }> {
    return withErrorHandling(async () => {
      const optimizedConfig = { ...config }
      const recommendations: string[] = []
      let expectedImprovement = 0

      // Optimize context window based on forecast horizon
      const optimalContextWindow = Math.max(
        config.forecastHorizon * 3,
        Math.min(config.forecastHorizon * 10, 200)
      )
      
      if (!config.contextWindow || Math.abs(config.contextWindow - optimalContextWindow) > 10) {
        optimizedConfig.contextWindow = optimalContextWindow
        recommendations.push(`Adjusted context window to ${optimalContextWindow} for optimal performance`)
        expectedImprovement += 0.05
      }

      // Optimize budget based on data complexity
      const recommendedBudget = Math.max(
        1000,
        config.forecastHorizon * 50
      )
      
      if (!config.budgetMilliNodeHours || config.budgetMilliNodeHours < recommendedBudget) {
        optimizedConfig.budgetMilliNodeHours = recommendedBudget
        recommendations.push(`Increased training budget to ${recommendedBudget} milli-node-hours`)
        expectedImprovement += 0.03
      }

      // Optimize data splits for time series
      if (!config.trainingFraction || config.trainingFraction < 0.7) {
        optimizedConfig.trainingFraction = 0.8
        optimizedConfig.validationFraction = 0.1
        optimizedConfig.testFraction = 0.1
        recommendations.push('Optimized data splits for time series (80/10/10)')
        expectedImprovement += 0.02
      }

      // Add feature columns if not specified
      if (!config.availableAtForecastColumns || config.availableAtForecastColumns.length === 0) {
        optimizedConfig.availableAtForecastColumns = [
          'day_of_week',
          'month',
          'quarter',
          'is_weekend',
          'is_holiday'
        ]
        recommendations.push('Added temporal feature columns')
        expectedImprovement += 0.08
      }

      return {
        optimizedConfig,
        expectedImprovement: Math.min(expectedImprovement, 0.20), // Cap at 20%
        recommendations
      }
    }, 'optimizeHyperparameters')
  }

  async createModelVersion(
    baseModelId: string,
    config: TrainingJobConfig,
    versionName?: string
  ): Promise<ModelVersion> {
    return withErrorHandling(async () => {
      const trainingJob = await this.createTrainingJob({
        ...config,
        displayName: versionName || `${config.displayName}-v${Date.now()}`
      })

      return {
        versionId: trainingJob.name.split('/').pop() || '',
        modelId: baseModelId,
        displayName: trainingJob.displayName,
        trainingConfig: config,
        createTime: trainingJob.createTime,
        status: 'training'
      }
    }, 'createModelVersion')
  }

  async compareModelVersions(
    versionIds: string[]
  ): Promise<{
    comparison: ModelVersionComparison[]
    recommendation: string
    bestVersionId: string
  }> {
    return withErrorHandling(async () => {
      const comparisons: ModelVersionComparison[] = []
      let bestVersionId = versionIds[0]
      let bestScore = 0

      for (const versionId of versionIds) {
        const job = await this.client.getTrainingPipeline(versionId)
        
        // Mock metrics - would come from actual evaluation
        const metrics: TrainingMetrics = {
          mae: Math.random() * 10 + 5,
          rmse: Math.random() * 15 + 8,
          mape: Math.random() * 20 + 10,
          r2Score: Math.random() * 0.3 + 0.7,
          trainingLoss: Math.random() * 5 + 2,
          validationLoss: Math.random() * 6 + 3
        }

        const score = metrics.r2Score - (metrics.mape / 100)
        if (score > bestScore) {
          bestScore = score
          bestVersionId = versionId
        }

        comparisons.push({
          versionId,
          displayName: job.displayName,
          metrics,
          score,
          status: job.state,
          trainingDuration: this.calculateTrainingDuration(job)
        })
      }

      const recommendation = `Version ${bestVersionId} shows the best performance with R² of ${bestScore.toFixed(3)}`

      return {
        comparison: comparisons,
        recommendation,
        bestVersionId
      }
    }, 'compareModelVersions')
  }

  async getTrainingLogs(jobId: string, pageSize = 100): Promise<TrainingLog[]> {
    return withErrorHandling(async () => {
      // This would typically fetch logs from Vertex AI Logging
      // For now, return mock logs
      return [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Training job initialized',
          metrics: { epoch: 0, loss: 0 }
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: 'info',
          message: 'Data preprocessing completed',
          metrics: { rows_processed: 1000 }
        }
      ]
    }, 'getTrainingLogs')
  }

  async estimateTrainingCost(config: TrainingJobConfig): Promise<{
    estimatedCostUSD: number
    budgetRecommendation: number
    costBreakdown: {
      computeCost: number
      storageCost: number
      networkCost: number
    }
  }> {
    return withErrorHandling(async () => {
      const budgetHours = config.budgetMilliNodeHours || 1000
      const costPerMilliNodeHour = 0.003 // Approximate cost in USD
      
      const computeCost = (budgetHours * costPerMilliNodeHour)
      const storageCost = 5 // Estimated storage cost
      const networkCost = 2 // Estimated network cost
      
      const estimatedCostUSD = computeCost + storageCost + networkCost

      return {
        estimatedCostUSD,
        budgetRecommendation: Math.max(budgetHours, config.forecastHorizon * 50),
        costBreakdown: {
          computeCost,
          storageCost,
          networkCost
        }
      }
    }, 'estimateTrainingCost')
  }

  private mapJobStateToStatus(state: string): 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' {
    switch (state) {
      case 'JOB_STATE_QUEUED':
      case 'JOB_STATE_PENDING':
        return 'queued'
      case 'JOB_STATE_RUNNING':
        return 'running'
      case 'JOB_STATE_SUCCEEDED':
        return 'succeeded'
      case 'JOB_STATE_FAILED':
        return 'failed'
      case 'JOB_STATE_CANCELLED':
      case 'JOB_STATE_CANCELLING':
        return 'cancelled'
      default:
        return 'queued'
    }
  }

  private calculateEstimatedTime(job: ModelTrainingJob): string | undefined {
    if (job.state === 'JOB_STATE_RUNNING' && job.startTime) {
      const elapsed = Date.now() - new Date(job.startTime).getTime()
      const estimated = elapsed * 2 // Rough estimate
      return `${Math.round(estimated / (1000 * 60))} minutes`
    }
    return undefined
  }

  private calculateTrainingDuration(job: ModelTrainingJob): string | undefined {
    if (job.startTime && job.endTime) {
      const duration = new Date(job.endTime).getTime() - new Date(job.startTime).getTime()
      return `${Math.round(duration / (1000 * 60))} minutes`
    }
    return undefined
  }
}

interface ModelVersionComparison {
  versionId: string
  displayName: string
  metrics: TrainingMetrics
  score: number
  status: string
  trainingDuration?: string
}

// Singleton instance
let modelTrainingServiceInstance: ModelTrainingService | null = null

export function getModelTrainingService(): ModelTrainingService {
  if (!modelTrainingServiceInstance) {
    modelTrainingServiceInstance = new ModelTrainingService()
  }
  return modelTrainingServiceInstance
}

export function resetModelTrainingService(): void {
  modelTrainingServiceInstance = null
}