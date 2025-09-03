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
      authentication: boolean
      endpoints: boolean
    }
    errors: string[]
    warnings: string[]
    performance: {
      configValidationMs: number
      clientConnectionMs: number
      autoMLTestMs: number
      totalMs: number
    }
  }> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []
    const services = {
      client: false,
      autoML: false,
      config: false,
      authentication: false,
      endpoints: false,
    }
    const performance = {
      configValidationMs: 0,
      clientConnectionMs: 0,
      autoMLTestMs: 0,
      totalMs: 0,
    }

    // Test configuration
    const configStart = Date.now()
    try {
      vertexAIConfig.validateConfig()
      const envValidation = vertexAIConfig.validateEnvironment()
      
      services.config = envValidation.isValid
      warnings.push(...envValidation.warnings)
      
      if (!envValidation.isValid) {
        errors.push(...envValidation.errors)
      }
    } catch (error) {
      errors.push(`Config error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    performance.configValidationMs = Date.now() - configStart

    // Test authentication
    try {
      await vertexAIConfig.getAccessToken()
      services.authentication = true
    } catch (error) {
      errors.push(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Test client connection
    const clientStart = Date.now()
    try {
      services.client = await this.client.healthCheck()
      if (!services.client) {
        errors.push('Client health check failed')
      }
    } catch (error) {
      errors.push(`Client error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    performance.clientConnectionMs = Date.now() - clientStart

    // Test AutoML service
    const autoMLStart = Date.now()
    try {
      await this.autoMLService.listForecastingModels()
      services.autoML = true
    } catch (error) {
      errors.push(`AutoML error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    performance.autoMLTestMs = Date.now() - autoMLStart

    // Test endpoints
    try {
      const endpoints = await this.listEndpoints()
      services.endpoints = true
      
      if (endpoints.length === 0) {
        warnings.push('No endpoints found. Consider creating endpoints for model serving.')
      }
    } catch (error) {
      errors.push(`Endpoints error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    performance.totalMs = Date.now() - startTime
    const isHealthy = services.client && services.config && services.autoML && services.authentication

    return {
      isHealthy,
      services,
      errors,
      warnings,
      performance,
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

  // Enhanced Management and Monitoring Methods

  async getServiceMetrics(): Promise<{
    models: {
      total: number
      autoML: number
      custom: number
      deployed: number
    }
    endpoints: {
      total: number
      healthy: number
      unhealthy: number
    }
    predictions: {
      rateLimiterStats: any
      errorStats: any
    }
    performance: {
      averageLatencyMs: number
      successRate: number
    }
  }> {
    try {
      const [models, endpoints] = await Promise.all([
        this.listModels(),
        this.listEndpoints()
      ])

      // Count model types
      const autoMLModels = models.filter(m => m.labels?.model_type === 'automl').length
      const customModels = models.filter(m => m.labels?.model_type === 'custom').length
      const deployedModels = models.filter(m => m.deployedModels?.length > 0).length

      // Check endpoint health
      const healthyEndpoints = endpoints.filter(e => e.deployedModels.length > 0).length
      const unhealthyEndpoints = endpoints.length - healthyEndpoints

      return {
        models: {
          total: models.length,
          autoML: autoMLModels,
          custom: customModels,
          deployed: deployedModels
        },
        endpoints: {
          total: endpoints.length,
          healthy: healthyEndpoints,
          unhealthy: unhealthyEndpoints
        },
        predictions: {
          rateLimiterStats: this.client.getRateLimiterStats(),
          errorStats: this.errorHandler.getErrorStats()
        },
        performance: {
          averageLatencyMs: 0, // Would be calculated from actual metrics
          successRate: 0.95 // Would be calculated from actual metrics
        }
      }
    } catch (error) {
      throw this.errorHandler.handleError(error, 'getServiceMetrics')
    }
  }

  async validateModelDeployment(modelId: string): Promise<{
    isValid: boolean
    checks: {
      modelExists: boolean
      modelTrained: boolean
      endpointAvailable: boolean
      resourcesAllocated: boolean
    }
    recommendations: string[]
  }> {
    const checks = {
      modelExists: false,
      modelTrained: false,
      endpointAvailable: false,
      resourcesAllocated: false
    }
    const recommendations: string[] = []

    try {
      // Check if model exists
      const model = await this.getModel(modelId)
      checks.modelExists = true

      // Check if model is trained (has evaluation metrics)
      const evaluation = await this.getModelEvaluation(modelId)
      checks.modelTrained = evaluation !== null

      if (!checks.modelTrained) {
        recommendations.push('Model training appears incomplete. Verify training job status.')
      }

      // Check for available endpoints
      const endpoints = await this.listEndpoints()
      const availableEndpoint = endpoints.find(e => 
        e.deployedModels.some(dm => dm.model.includes(modelId))
      )
      
      checks.endpointAvailable = Boolean(availableEndpoint)
      
      if (!checks.endpointAvailable) {
        recommendations.push('No endpoint found for this model. Create an endpoint for serving.')
      }

      // Check resource allocation
      if (availableEndpoint) {
        const hasResources = availableEndpoint.deployedModels.some(dm => 
          dm.dedicatedResources || dm.automaticResources
        )
        checks.resourcesAllocated = hasResources

        if (!hasResources) {
          recommendations.push('No resources allocated to deployed model. Configure machine resources.')
        }
      }

      const isValid = Object.values(checks).every(check => check)

      return {
        isValid,
        checks,
        recommendations
      }
    } catch (error) {
      throw this.errorHandler.handleError(error, 'validateModelDeployment')
    }
  }

  async optimizeEndpointPerformance(endpointId: string): Promise<{
    currentConfig: any
    recommendations: Array<{
      type: 'scaling' | 'machine_type' | 'traffic_split'
      description: string
      impact: 'low' | 'medium' | 'high'
      implementation: string
    }>
  }> {
    try {
      const endpoint = await this.getEndpoint(endpointId)
      const recommendations: Array<{
        type: 'scaling' | 'machine_type' | 'traffic_split'
        description: string
        impact: 'low' | 'medium' | 'high'
        implementation: string
      }> = []

      // Analyze current configuration
      for (const deployedModel of endpoint.deployedModels) {
        const resources = deployedModel.dedicatedResources

        if (resources) {
          // Check scaling configuration
          if (resources.minReplicaCount === resources.maxReplicaCount) {
            recommendations.push({
              type: 'scaling',
              description: 'Enable auto-scaling by setting different min/max replica counts',
              impact: 'medium',
              implementation: `Set minReplicaCount: ${resources.minReplicaCount}, maxReplicaCount: ${resources.minReplicaCount * 2}`
            })
          }

          // Check machine type
          if (resources.machineSpec.machineType === 'n1-standard-2') {
            recommendations.push({
              type: 'machine_type',
              description: 'Consider upgrading to higher performance machine type for better throughput',
              impact: 'high',
              implementation: 'Upgrade to n1-standard-4 or n1-highmem-2 for better performance'
            })
          }
        }
      }

      // Check traffic split
      const trafficValues = Object.values(endpoint.trafficSplit)
      if (trafficValues.length > 1) {
        const isBalanced = trafficValues.every(v => Math.abs(v - trafficValues[0]) < 10)
        if (!isBalanced) {
          recommendations.push({
            type: 'traffic_split',
            description: 'Unbalanced traffic split detected. Consider A/B testing or gradual rollout',
            impact: 'low',
            implementation: 'Implement gradual traffic shifting for safer deployments'
          })
        }
      }

      return {
        currentConfig: {
          deployedModels: endpoint.deployedModels.length,
          trafficSplit: endpoint.trafficSplit,
          resources: endpoint.deployedModels.map(dm => dm.dedicatedResources || dm.automaticResources)
        },
        recommendations
      }
    } catch (error) {
      throw this.errorHandler.handleError(error, 'optimizeEndpointPerformance')
    }
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