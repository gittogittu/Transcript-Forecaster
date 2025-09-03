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

  // Model Management Methods

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