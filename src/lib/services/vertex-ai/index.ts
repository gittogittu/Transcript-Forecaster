// Main Vertex AI Service - Orchestrates all Vertex AI components

import { getVertexAIClient } from './client'
import { getAutoMLForecastingService } from './automl-forecasting'
import { vertexAIConfig, validateVertexAIEnvironment } from './config'
import { VertexAIErrorHandler, isVertexAIError } from './errors'
import type {
  VertexAIModelConfig,
  ModelTrainingJob,
  ModelDeployment,
  ModelEndpoint,
  PredictionResponse,
  BatchPredictionJob,
  ModelEvaluation,
} from '@/types/vertex-ai'

export interface VertexAIServiceConfig {
  enableAutoRetry?: boolean
  defaultMachineType?: string
  defaultMinReplicas?: number
  defaultMaxReplicas?: number
  enableModelMonitoring?: boolean
  enableExplainability?: boolean
}

export class VertexAIService {
  private client = getVertexAIClient()
  private autoMLService = getAutoMLForecastingService()
  private errorHandler = VertexAIErrorHandler.getInstance()
  private config: VertexAIServiceConfig

  constructor(config: VertexAIServiceConfig = {}) {
    this.config = {
      enableAutoRetry: true,
      defaultMachineType: 'n1-standard-2',
      defaultMinReplicas: 1,
      defaultMaxReplicas: 3,
      enableModelMonitoring: true,
      enableExplainability: false,
      ...config,
    }

    // Validate environment on initialization
    try {
      validateVertexAIEnvironment()
    } catch (error) {
      console.error('Vertex AI environment validation failed:', error)
      throw error
    }
  }

  // Model Management

  async createAutoMLForecastingModel(config: VertexAIModelConfig & {
    dataSourceUri: string
    forecastHorizon: number
    contextWindow?: number
  }): Promise<ModelTrainingJob> {
    try {
      return await this.autoMLService.createForecastingModel({
        ...config,
        modelType: 'automl_forecasting',
      })
    } catch (error) {
      throw this.errorHandler.handleError(error, 'createAutoMLForecastingModel')
    }
  }

  async deployModel(
    modelId: string,
    endpointDisplayName: string,
    options: {
      machineType?: string
      minReplicaCount?: number
      maxReplicaCount?: number
      trafficPercentage?: number
    } = {}
  ): Promise<ModelDeployment> {
    try {
      const {
        machineType = this.config.defaultMachineType!,
        minReplicaCount = this.config.defaultMinReplicas!,
        maxReplicaCount = this.config.defaultMaxReplicas!,
      } = options

      return await this.autoMLService.deployForecastingModel(
        modelId,
        endpointDisplayName,
        machineType,
        minReplicaCount,
        maxReplicaCount
      )
    } catch (error) {
      throw this.errorHandler.handleError(error, 'deployModel')
    }
  }

  async listModels(filter?: string): Promise<any[]> {
    try {
      return await this.client.listModels(filter)
    } catch (error) {
      throw this.errorHandler.handleError(error, 'listModels')
    }
  }

  async getModel(modelId: string): Promise<any> {
    try {
      return await this.client.getModel(modelId)
    } catch (error) {
      throw this.errorHandler.handleError(error, 'getModel')
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    try {
      await this.client.deleteModel(modelId)
    } catch (error) {
      throw this.errorHandler.handleError(error, 'deleteModel')
    }
  }

  // Endpoint Management

  async createEndpoint(displayName: string, description?: string): Promise<ModelEndpoint> {
    try {
      return await this.client.createEndpoint(displayName, description)
    } catch (error) {
      throw this.errorHandler.handleError(error, 'createEndpoint')
    }
  }

  async listEndpoints(filter?: string): Promise<ModelEndpoint[]> {
    try {
      return await this.client.listEndpoints(filter)
    } catch (error) {
      throw this.errorHandler.handleError(error, 'listEndpoints')
    }
  }

  async getEndpoint(endpointId: string): Promise<ModelEndpoint> {
    try {
      return await this.client.getEndpoint(endpointId)
    } catch (error) {
      throw this.errorHandler.handleError(error, 'getEndpoint')
    }
  }

  async deleteEndpoint(endpointId: string): Promise<void> {
    try {
      // First undeploy all models from the endpoint
      const endpoint = await this.getEndpoint(endpointId)
      
      for (const deployedModel of endpoint.deployedModels) {
        await this.client.undeployModel(endpointId, deployedModel.id)
      }

      // Then delete the endpoint
      await this.client.deleteEndpoint(endpointId)
    } catch (error) {
      throw this.errorHandler.handleError(error, 'deleteEndpoint')
    }
  }

  // Prediction Services

  async generateForecast(
    endpointId: string,
    timeSeriesData: Array<{
      timestamp: string
      timeSeriesIdentifier?: string
      [key: string]: any
    }>,
    forecastHorizon: number,
    confidenceLevel = 0.95
  ) {
    try {
      return await this.autoMLService.generateForecast(
        endpointId,
        timeSeriesData,
        forecastHorizon,
        confidenceLevel
      )
    } catch (error) {
      throw this.errorHandler.handleError(error, 'generateForecast')
    }
  }

  async batchPredict(
    modelId: string,
    inputGcsUri: string,
    outputGcsUri: string,
    jobDisplayName: string
  ): Promise<BatchPredictionJob> {
    try {
      return await this.autoMLService.batchForecast(
        modelId,
        inputGcsUri,
        outputGcsUri,
        jobDisplayName
      )
    } catch (error) {
      throw this.errorHandler.handleError(error, 'batchPredict')
    }
  }

  async getBatchPredictionJob(jobId: string): Promise<BatchPredictionJob> {
    try {
      return await this.client.getBatchPredictionJob(jobId)
    } catch (error) {
      throw this.errorHandler.handleError(error, 'getBatchPredictionJob')
    }
  }

  // Model Evaluation and Monitoring

  async getModelEvaluation(modelId: string): Promise<ModelEvaluation | null> {
    try {
      return await this.autoMLService.getModelEvaluation(modelId)
    } catch (error) {
      throw this.errorHandler.handleError(error, 'getModelEvaluation')
    }
  }

  async getTrainingJobStatus(jobId: string): Promise<ModelTrainingJob> {
    try {
      return await this.client.getTrainingPipeline(jobId)
    } catch (error) {
      throw this.errorHandler.handleError(error, 'getTrainingJobStatus')
    }
  }

  async cancelTrainingJob(jobId: string): Promise<void> {
    try {
      await this.client.cancelTrainingPipeline(jobId)
    } catch (error) {
      throw this.errorHandler.handleError(error, 'cancelTrainingJob')
    }
  }

  // Health and Monitoring

  async healthCheck(): Promise<{
    isHealthy: boolean
    services: {
      client: boolean
      autoML: boolean
      config: boolean
    }
    errors: string[]
  }> {
    const errors: string[] = []
    const services = {
      client: false,
      autoML: false,
      config: false,
    }

    try {
      // Test configuration
      vertexAIConfig.validateConfig()
      services.config = true
    } catch (error) {
      errors.push(`Config error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    try {
      // Test client connection
      services.client = await this.client.healthCheck()
      if (!services.client) {
        errors.push('Client health check failed')
      }
    } catch (error) {
      errors.push(`Client error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    try {
      // Test AutoML service (by listing models)
      await this.autoMLService.listForecastingModels()
      services.autoML = true
    } catch (error) {
      errors.push(`AutoML error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    const isHealthy = services.client && services.config && services.autoML

    return {
      isHealthy,
      services,
      errors,
    }
  }

  async getServiceStats() {
    return {
      rateLimiter: this.client.getRateLimiterStats(),
      errors: this.errorHandler.getErrorStats(),
      client: this.client.getClientInfo(),
      config: {
        projectId: vertexAIConfig.getProjectId(),
        location: vertexAIConfig.getLocation(),
        serviceConfig: this.config,
      },
    }
  }

  // Utility Methods

  async testConnection(): Promise<boolean> {
    try {
      const healthCheck = await this.healthCheck()
      return healthCheck.isHealthy
    } catch (error) {
      console.error('Vertex AI connection test failed:', error)
      return false
    }
  }

  isCircuitBreakerTripped(context?: string): boolean {
    return this.errorHandler.isCircuitBreakerTripped(context || 'general')
  }

  clearErrorStats(): void {
    this.errorHandler.clearErrorStats()
  }

  updateConfig(newConfig: Partial<VertexAIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): VertexAIServiceConfig {
    return { ...this.config }
  }
}

// Singleton instance
let vertexAIServiceInstance: VertexAIService | null = null

export function getVertexAIService(config?: VertexAIServiceConfig): VertexAIService {
  if (!vertexAIServiceInstance) {
    vertexAIServiceInstance = new VertexAIService(config)
  }
  return vertexAIServiceInstance
}

export function resetVertexAIService(): void {
  vertexAIServiceInstance = null
}

// Re-export individual services
export { getVertexAIClient, resetVertexAIClient } from './client'
export { 
  getAutoMLForecastingService, 
  resetAutoMLForecastingService,
  type AutoMLForecastingConfig,
  type ForecastPrediction,
  type ForecastResult
} from './automl-forecasting'

// Dataset Preparation
export {
  getDatasetPreparationService,
  resetDatasetPreparationService,
  type DatasetConfig,
  type TimeSeriesDatasetConfig,
  type DataSource,
  type DatasetImportConfig,
  type DataValidationResult,
  type Dataset,
  type DatasetImportJob
} from './dataset-preparation'

// Model Training
export {
  getModelTrainingService,
  resetModelTrainingService,
  type TrainingJobConfig,
  type HyperparameterConfig,
  type TrainingMetrics,
  type ModelVersion,
  type TrainingProgress,
  type OptimizationObjective
} from './model-training'

// Model Evaluation
export {
  getModelEvaluationService,
  resetModelEvaluationService,
  type EvaluationMetrics,
  type ForecastingEvaluation,
  type ConfidenceInterval,
  type ResidualAnalysis,
  type FeatureImportance,
  type SeasonalityAnalysis,
  type CrossValidationResult,
  type ModelComparison,
  type EvaluationConfig
} from './model-evaluation'

// Model Deployment
export {
  getModelDeploymentService,
  resetModelDeploymentService,
  type DeploymentConfig,
  type AutoScalingConfig,
  type EndpointStatus,
  type DeployedModelStatus,
  type EndpointMetrics,
  type DeploymentStrategy,
  type DeploymentHistory
} from './model-deployment'

// Model Versioning
export {
  getModelVersioningService,
  resetModelVersioningService,
  type ModelMetadata,
  type TrainingConfiguration,
  type DeploymentInfo,
  type ModelStatus,
  type ModelLineage,
  type ModelExperiment,
  type ModelRegistry
} from './model-versioning'

// Re-export types and utilities
export type {
  VertexAIModelConfig,
  ModelTrainingJob,
  ModelDeployment,
  ModelEndpoint,
  PredictionResponse,
  BatchPredictionJob,
  ModelEvaluation,
} from '@/types/vertex-ai'

export {
  vertexAIConfig,
  validateVertexAIEnvironment,
} from './config'

export { VertexAIServiceError, isVertexAIError } from './errors'