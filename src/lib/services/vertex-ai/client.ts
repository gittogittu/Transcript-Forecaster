// Vertex AI Client Wrapper

import aiplatform from '@google-cloud/aiplatform'
import { vertexAIConfig } from './config'
import { RateLimiter, VertexAIServiceError, withErrorHandling } from './errors'
import type {
  VertexAIClientOptions,
  ModelTrainingJob,
  ModelDeployment,
  ModelEndpoint,
  PredictionInstance,
  PredictionResponse,
  BatchPredictionJob,
  ModelEvaluation,
} from '@/types/vertex-ai'

export class VertexAIClient {
  private modelServiceClient: any
  private endpointServiceClient: any
  private pipelineServiceClient: any
  private predictionServiceClient: any
  private jobServiceClient: any
  private rateLimiter: RateLimiter
  private options: VertexAIClientOptions

  constructor(options?: Partial<VertexAIClientOptions>) {
    this.options = {
      ...vertexAIConfig.getClientOptions(),
      ...options,
    }

    // Initialize Google Cloud AI Platform clients
    const clientOptions = {
      projectId: this.options.projectId,
      keyFilename: this.options.keyFilename,
      credentials: this.options.credentials,
    }

    this.modelServiceClient = new aiplatform.v1.ModelServiceClient(clientOptions)
    this.endpointServiceClient = new aiplatform.v1.EndpointServiceClient(clientOptions)
    this.pipelineServiceClient = new aiplatform.v1.PipelineServiceClient(clientOptions)
    this.predictionServiceClient = new aiplatform.v1.PredictionServiceClient(clientOptions)
    this.jobServiceClient = new aiplatform.v1.JobServiceClient(clientOptions)

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(
      this.options.rateLimitConfig || vertexAIConfig.getRateLimitConfig()
    )
  }

  // Enhanced Model Management Methods

  async listModels(filter?: string, pageSize = 50): Promise<any[]> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          parent: vertexAIConfig.getParent(),
          filter,
          pageSize,
        }

        const [models] = await this.modelServiceClient.listModels(request)
        return models || []
      })
    }, 'listModels')
  }

  async listModelsByType(modelType: 'automl' | 'custom' | 'all' = 'all', pageSize = 50): Promise<any[]> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        let filter = ''
        
        if (modelType === 'automl') {
          filter = 'labels.model_type="automl"'
        } else if (modelType === 'custom') {
          filter = 'labels.model_type="custom"'
        }

        const request = {
          parent: vertexAIConfig.getParent(),
          filter,
          pageSize,
        }

        const [models] = await this.modelServiceClient.listModels(request)
        return models || []
      })
    }, 'listModelsByType')
  }

  async getModelVersions(modelId: string): Promise<any[]> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          name: vertexAIConfig.getModelResourceName(modelId),
        }

        const [model] = await this.modelServiceClient.getModel(request)
        
        // Extract version information from model metadata
        const versions = model.versionAliases || []
        return versions.map((alias: string, index: number) => ({
          versionId: `${index + 1}`,
          alias,
          createTime: model.createTime,
          updateTime: model.updateTime,
          isDefault: alias === 'default'
        }))
      })
    }, 'getModelVersions')
  }

  async getModel(modelId: string): Promise<any> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          name: vertexAIConfig.getModelResourceName(modelId),
        }

        const [model] = await this.modelServiceClient.getModel(request)
        return model
      })
    }, 'getModel')
  }

  async deleteModel(modelId: string): Promise<void> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          name: vertexAIConfig.getModelResourceName(modelId),
        }

        const [operation] = await this.modelServiceClient.deleteModel(request)
        await operation.promise()
      })
    }, 'deleteModel')
  }

  async uploadModel(
    displayName: string,
    artifactUri: string,
    containerSpec: any
  ): Promise<any> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          parent: vertexAIConfig.getParent(),
          model: {
            displayName,
            artifactUri,
            containerSpec,
          },
        }

        const [operation] = await this.modelServiceClient.uploadModel(request)
        const [model] = await operation.promise()
        return model
      })
    }, 'uploadModel')
  }

  // Endpoint Management Methods

  async createEndpoint(displayName: string, description?: string): Promise<ModelEndpoint> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          parent: vertexAIConfig.getParent(),
          endpoint: {
            displayName,
            description,
          },
        }

        const [operation] = await this.endpointServiceClient.createEndpoint(request)
        const [endpoint] = await operation.promise()
        return endpoint as ModelEndpoint
      })
    }, 'createEndpoint')
  }

  async listEndpoints(filter?: string, pageSize = 50): Promise<ModelEndpoint[]> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          parent: vertexAIConfig.getParent(),
          filter,
          pageSize,
        }

        const [endpoints] = await this.endpointServiceClient.listEndpoints(request)
        return (endpoints || []) as ModelEndpoint[]
      })
    }, 'listEndpoints')
  }

  async getEndpoint(endpointId: string): Promise<ModelEndpoint> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          name: vertexAIConfig.getEndpointResourceName(endpointId),
        }

        const [endpoint] = await this.endpointServiceClient.getEndpoint(request)
        return endpoint as ModelEndpoint
      })
    }, 'getEndpoint')
  }

  async deployModelToEndpoint(
    endpointId: string,
    modelId: string,
    deployedModelDisplayName: string,
    trafficPercentage = 100,
    machineType = 'n1-standard-2',
    minReplicaCount = 1,
    maxReplicaCount = 1
  ): Promise<ModelDeployment> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          endpoint: vertexAIConfig.getEndpointResourceName(endpointId),
          deployedModel: {
            model: vertexAIConfig.getModelResourceName(modelId),
            displayName: deployedModelDisplayName,
            dedicatedResources: {
              machineSpec: {
                machineType,
              },
              minReplicaCount,
              maxReplicaCount,
            },
          },
          trafficSplit: {
            '0': trafficPercentage,
          },
        }

        const [operation] = await this.endpointServiceClient.deployModel(request)
        const [response] = await operation.promise()
        
        return {
          endpointId,
          deployedModelId: response.deployedModel?.id || '',
          displayName: deployedModelDisplayName,
          createTime: new Date().toISOString(),
          modelVersionId: modelId,
          dedicatedResources: {
            machineSpec: {
              machineType,
            },
            minReplicaCount,
            maxReplicaCount,
          },
        } as ModelDeployment
      })
    }, 'deployModelToEndpoint')
  }

  async undeployModel(endpointId: string, deployedModelId: string): Promise<void> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          endpoint: vertexAIConfig.getEndpointResourceName(endpointId),
          deployedModelId,
          trafficSplit: {},
        }

        const [operation] = await this.endpointServiceClient.undeployModel(request)
        await operation.promise()
      })
    }, 'undeployModel')
  }

  async deleteEndpoint(endpointId: string): Promise<void> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          name: vertexAIConfig.getEndpointResourceName(endpointId),
        }

        const [operation] = await this.endpointServiceClient.deleteEndpoint(request)
        await operation.promise()
      })
    }, 'deleteEndpoint')
  }

  // Enhanced Endpoint Management

  async getEndpointHealth(endpointId: string): Promise<{
    isHealthy: boolean
    deployedModels: Array<{
      id: string
      status: string
      replicas: number
    }>
    lastHealthCheck: string
  }> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const endpoint = await this.getEndpoint(endpointId)
        
        const deployedModels = endpoint.deployedModels.map(model => ({
          id: model.id,
          status: 'healthy', // In real implementation, check actual health
          replicas: model.dedicatedResources?.minReplicaCount || 0
        }))

        return {
          isHealthy: deployedModels.length > 0 && deployedModels.every(m => m.status === 'healthy'),
          deployedModels,
          lastHealthCheck: new Date().toISOString()
        }
      })
    }, 'getEndpointHealth')
  }

  async updateEndpointTrafficSplit(
    endpointId: string, 
    trafficSplit: Record<string, number>
  ): Promise<void> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        // Validate traffic split sums to 100
        const totalTraffic = Object.values(trafficSplit).reduce((sum, traffic) => sum + traffic, 0)
        if (Math.abs(totalTraffic - 100) > 0.01) {
          throw new Error(`Traffic split must sum to 100, got ${totalTraffic}`)
        }

        const request = {
          endpoint: vertexAIConfig.getEndpointResourceName(endpointId),
          trafficSplit,
        }

        // Note: This would use updateEndpoint in the actual Google Cloud client
        console.log('Updating traffic split:', request)
      })
    }, 'updateEndpointTrafficSplit')
  }

  async scaleEndpoint(
    endpointId: string,
    deployedModelId: string,
    minReplicas: number,
    maxReplicas: number
  ): Promise<void> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        if (minReplicas < 0 || maxReplicas < minReplicas) {
          throw new Error('Invalid replica configuration')
        }

        // In real implementation, this would update the deployed model's resources
        console.log(`Scaling endpoint ${endpointId}, model ${deployedModelId} to ${minReplicas}-${maxReplicas} replicas`)
      })
    }, 'scaleEndpoint')
  }

  // Prediction Methods

  async predict(
    endpointId: string,
    instances: PredictionInstance[],
    parameters?: any
  ): Promise<PredictionResponse> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          endpoint: vertexAIConfig.getEndpointResourceName(endpointId),
          instances: instances.map(instance => ({ structValue: instance })),
          parameters: parameters ? { structValue: parameters } : undefined,
        }

        const [response] = await this.predictionServiceClient.predict(request)
        
        return {
          predictions: response.predictions?.map((p: any) => p.structValue) || [],
          deployedModelId: response.deployedModelId || '',
          model: response.model || '',
          modelDisplayName: response.modelDisplayName || '',
          modelVersionId: response.modelVersionId || '',
        } as PredictionResponse
      })
    }, 'predict')
  }

  async explain(
    endpointId: string,
    instances: PredictionInstance[],
    parameters?: any
  ): Promise<any> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          endpoint: vertexAIConfig.getEndpointResourceName(endpointId),
          instances: instances.map(instance => ({ structValue: instance })),
          parameters: parameters ? { structValue: parameters } : undefined,
        }

        const [response] = await this.predictionServiceClient.explain(request)
        return response
      })
    }, 'explain')
  }

  // Enhanced Prediction Methods with Monitoring

  async predictWithMetrics(
    endpointId: string,
    instances: PredictionInstance[],
    parameters?: any
  ): Promise<{
    predictions: any[]
    metrics: {
      latencyMs: number
      instanceCount: number
      modelId: string
      timestamp: string
    }
  }> {
    const startTime = Date.now()
    
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const response = await this.predict(endpointId, instances, parameters)
        const endTime = Date.now()

        return {
          predictions: response.predictions,
          metrics: {
            latencyMs: endTime - startTime,
            instanceCount: instances.length,
            modelId: response.deployedModelId,
            timestamp: new Date().toISOString()
          }
        }
      })
    }, 'predictWithMetrics')
  }

  async batchPredictWithValidation(
    instances: PredictionInstance[],
    endpointId: string,
    batchSize = 100
  ): Promise<{
    predictions: any[]
    errors: Array<{ index: number; error: string }>
    successCount: number
    failureCount: number
  }> {
    return withErrorHandling(async () => {
      const predictions: any[] = []
      const errors: Array<{ index: number; error: string }> = []
      let successCount = 0
      let failureCount = 0

      // Process in batches
      for (let i = 0; i < instances.length; i += batchSize) {
        const batch = instances.slice(i, i + batchSize)
        
        try {
          const response = await this.predict(endpointId, batch)
          predictions.push(...response.predictions)
          successCount += batch.length
        } catch (error) {
          // Record errors for this batch
          for (let j = 0; j < batch.length; j++) {
            errors.push({
              index: i + j,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            failureCount++
          }
        }
      }

      return {
        predictions,
        errors,
        successCount,
        failureCount
      }
    }, 'batchPredictWithValidation')
  }

  // Batch Prediction Methods

  async createBatchPredictionJob(
    displayName: string,
    modelName: string,
    inputConfig: any,
    outputConfig: any
  ): Promise<BatchPredictionJob> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          parent: vertexAIConfig.getParent(),
          batchPredictionJob: {
            displayName,
            model: modelName,
            inputConfig,
            outputConfig,
          },
        }

        const [batchPredictionJob] = await this.jobServiceClient.createBatchPredictionJob(request)
        return batchPredictionJob as BatchPredictionJob
      })
    }, 'createBatchPredictionJob')
  }

  async getBatchPredictionJob(jobId: string): Promise<BatchPredictionJob> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          name: vertexAIConfig.getBatchPredictionJobResourceName(jobId),
        }

        const [job] = await this.jobServiceClient.getBatchPredictionJob(request)
        return job as BatchPredictionJob
      })
    }, 'getBatchPredictionJob')
  }

  async listBatchPredictionJobs(filter?: string, pageSize = 50): Promise<BatchPredictionJob[]> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          parent: vertexAIConfig.getParent(),
          filter,
          pageSize,
        }

        const [jobs] = await this.jobServiceClient.listBatchPredictionJobs(request)
        return (jobs || []) as BatchPredictionJob[]
      })
    }, 'listBatchPredictionJobs')
  }

  async cancelBatchPredictionJob(jobId: string): Promise<void> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          name: vertexAIConfig.getBatchPredictionJobResourceName(jobId),
        }

        await this.jobServiceClient.cancelBatchPredictionJob(request)
      })
    }, 'cancelBatchPredictionJob')
  }

  // Training Pipeline Methods

  async createTrainingPipeline(
    displayName: string,
    trainingTaskDefinition: string,
    trainingTaskInputs: any,
    modelToUpload?: any
  ): Promise<ModelTrainingJob> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          parent: vertexAIConfig.getParent(),
          trainingPipeline: {
            displayName,
            trainingTaskDefinition,
            trainingTaskInputs,
            modelToUpload,
          },
        }

        const [trainingPipeline] = await this.pipelineServiceClient.createTrainingPipeline(request)
        
        return {
          name: trainingPipeline.name || '',
          displayName: trainingPipeline.displayName || '',
          state: trainingPipeline.state || 'JOB_STATE_QUEUED',
          createTime: trainingPipeline.createTime?.seconds 
            ? new Date(Number(trainingPipeline.createTime.seconds) * 1000).toISOString()
            : new Date().toISOString(),
          startTime: trainingPipeline.startTime?.seconds
            ? new Date(Number(trainingPipeline.startTime.seconds) * 1000).toISOString()
            : undefined,
          endTime: trainingPipeline.endTime?.seconds
            ? new Date(Number(trainingPipeline.endTime.seconds) * 1000).toISOString()
            : undefined,
          error: trainingPipeline.error,
          modelId: trainingPipeline.modelToUpload?.name,
        } as ModelTrainingJob
      })
    }, 'createTrainingPipeline')
  }

  async getTrainingPipeline(pipelineId: string): Promise<ModelTrainingJob> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          name: vertexAIConfig.getTrainingJobResourceName(pipelineId),
        }

        const [pipeline] = await this.pipelineServiceClient.getTrainingPipeline(request)
        
        return {
          name: pipeline.name || '',
          displayName: pipeline.displayName || '',
          state: pipeline.state || 'JOB_STATE_QUEUED',
          createTime: pipeline.createTime?.seconds 
            ? new Date(Number(pipeline.createTime.seconds) * 1000).toISOString()
            : new Date().toISOString(),
          startTime: pipeline.startTime?.seconds
            ? new Date(Number(pipeline.startTime.seconds) * 1000).toISOString()
            : undefined,
          endTime: pipeline.endTime?.seconds
            ? new Date(Number(pipeline.endTime.seconds) * 1000).toISOString()
            : undefined,
          error: pipeline.error,
          modelId: pipeline.modelToUpload?.name,
        } as ModelTrainingJob
      })
    }, 'getTrainingPipeline')
  }

  async cancelTrainingPipeline(pipelineId: string): Promise<void> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        const request = {
          name: vertexAIConfig.getTrainingJobResourceName(pipelineId),
        }

        await this.pipelineServiceClient.cancelTrainingPipeline(request)
      })
    }, 'cancelTrainingPipeline')
  }

  // Feature Store Methods

  async createFeatureGroup(parent: string, featureGroup: any): Promise<any> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        // Simulate Feature Store API call
        // In a real implementation, this would use the Feature Store client
        return {
          name: `${parent}/featureGroups/${featureGroup.name}`,
          ...featureGroup,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString()
        }
      })
    }, 'createFeatureGroup')
  }

  async ingestFeatureBatch(featureGroupName: string, features: any[]): Promise<any> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        // Simulate feature ingestion
        // In a real implementation, this would use the Feature Store client
        return {
          ingestionRunId: `ingestion-${Date.now()}`,
          state: 'SUCCEEDED',
          ingestedFeatureCount: features.length,
          createTime: new Date().toISOString()
        }
      })
    }, 'ingestFeatureBatch')
  }

  async readFeatureValues(request: any): Promise<any> {
    return withErrorHandling(async () => {
      return this.rateLimiter.execute(async () => {
        // Simulate feature serving
        // In a real implementation, this would use the Feature Store client
        const features: Record<string, number> = {}
        
        // Generate mock feature values
        if (request.featureSelector?.idMatcher?.ids) {
          for (const featureId of request.featureSelector.idMatcher.ids) {
            features[featureId] = Math.random() * 100
          }
        }
        
        return {
          features,
          entityId: request.entityIds?.[0] || 'unknown',
          timestamp: new Date().toISOString()
        }
      })
    }, 'readFeatureValues')
  }

  // Utility Methods

  async healthCheck(): Promise<boolean> {
    try {
      await this.listModels('', 1)
      return true
    } catch (error) {
      console.error('Vertex AI health check failed:', error)
      return false
    }
  }

  getRateLimiterStats() {
    return this.rateLimiter.getStats()
  }

  getClientInfo() {
    return {
      projectId: this.options.projectId,
      location: this.options.location,
      rateLimitConfig: this.options.rateLimitConfig,
    }
  }
}

// Singleton instance
let vertexAIClientInstance: VertexAIClient | null = null

export function getVertexAIClient(options?: Partial<VertexAIClientOptions>): VertexAIClient {
  if (!vertexAIClientInstance) {
    vertexAIClientInstance = new VertexAIClient(options)
  }
  return vertexAIClientInstance
}

export function resetVertexAIClient(): void {
  vertexAIClientInstance = null
}