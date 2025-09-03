// Vertex AI AutoML Forecasting Service

import { getVertexAIClient } from './client'
import { vertexAIConfig } from './config'
import { withErrorHandling } from './errors'
import type {
  VertexAIModelConfig,
  ModelTrainingJob,
  ModelDeployment,
  PredictionInstance,
  PredictionResponse,
  BatchPredictionJob,
  ModelEvaluation,
} from '@/types/vertex-ai'

export interface AutoMLForecastingConfig extends VertexAIModelConfig {
  dataSourceUri: string
  targetColumn: string
  timeColumn: string
  timeSeriesIdentifierColumn?: string
  unavailableAtForecastColumns?: string[]
  availableAtForecastColumns?: string[]
  forecastHorizon: number
  contextWindow?: number
  dataGranularity?: {
    unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
    quantity: number
  }
  holidayRegions?: string[]
  exportEvaluatedDataItemsConfig?: {
    destinationBigqueryUri?: string
    overrideExistingTable?: boolean
  }
}

export interface ForecastPrediction {
  timestamp: string
  value: number
  lowerBound?: number
  upperBound?: number
  predictionInterval?: number
}

export interface ForecastResult {
  predictions: ForecastPrediction[]
  modelId: string
  forecastHorizon: number
  confidenceLevel: number
  metadata: {
    modelDisplayName: string
    trainingDataEndTime: string
    predictionStartTime: string
    predictionEndTime: string
  }
}

export class AutoMLForecastingService {
  private client = getVertexAIClient()

  async createForecastingModel(config: AutoMLForecastingConfig): Promise<ModelTrainingJob> {
    return withErrorHandling(async () => {
      const trainingTaskDefinition = 'gs://google-cloud-aiplatform/schema/trainingjob/definition/automl_forecasting_1.0.0.yaml'
      
      const trainingTaskInputs = {
        targetColumn: config.targetColumn,
        timeColumn: config.timeColumn,
        timeSeriesIdentifierColumn: config.timeSeriesIdentifierColumn,
        unavailableAtForecastColumns: config.unavailableAtForecastColumns || [],
        availableAtForecastColumns: config.availableAtForecastColumns || [],
        forecastHorizon: config.forecastHorizon,
        contextWindow: config.contextWindow,
        dataGranularity: config.dataGranularity,
        holidayRegions: config.holidayRegions || [],
        optimizationObjective: config.optimizationObjective,
        trainBudgetMilliNodeHours: config.budgetMilliNodeHours || 1000,
        exportEvaluatedDataItemsConfig: config.exportEvaluatedDataItemsConfig,
      }

      const modelToUpload = {
        displayName: config.displayName,
        description: `AutoML Forecasting model for ${config.targetColumn}`,
        metadata: {
          inputDataConfig: {
            datasetId: config.datasetId,
            gcsSource: {
              uris: [config.dataSourceUri],
            },
          },
        },
      }

      return await this.client.createTrainingPipeline(
        config.displayName,
        trainingTaskDefinition,
        trainingTaskInputs,
        modelToUpload
      )
    }, 'createForecastingModel')
  }

  async deployForecastingModel(
    modelId: string,
    endpointDisplayName: string,
    machineType = 'n1-standard-2',
    minReplicaCount = 1,
    maxReplicaCount = 3
  ): Promise<ModelDeployment> {
    return withErrorHandling(async () => {
      // First, create an endpoint
      const endpoint = await this.client.createEndpoint(
        endpointDisplayName,
        `Endpoint for forecasting model ${modelId}`
      )

      // Extract endpoint ID from the resource name
      const endpointId = endpoint.name.split('/').pop() || ''

      // Deploy the model to the endpoint
      return await this.client.deployModelToEndpoint(
        endpointId,
        modelId,
        `${endpointDisplayName}-deployment`,
        100, // 100% traffic
        machineType,
        minReplicaCount,
        maxReplicaCount
      )
    }, 'deployForecastingModel')
  }

  async generateForecast(
    endpointId: string,
    timeSeriesData: Array<{
      timestamp: string
      timeSeriesIdentifier?: string
      [key: string]: any
    }>,
    forecastHorizon: number,
    confidenceLevel = 0.95
  ): Promise<ForecastResult> {
    return withErrorHandling(async () => {
      const instances: PredictionInstance[] = timeSeriesData.map(data => ({
        ...data,
        timestamp: data.timestamp,
      }))

      const parameters = {
        confidenceLevel,
        forecastHorizon,
      }

      const response = await this.client.predict(endpointId, instances, parameters)

      // Parse the predictions into a structured format
      const predictions: ForecastPrediction[] = response.predictions.map((pred: any) => ({
        timestamp: pred.timestamp,
        value: pred.value,
        lowerBound: pred.prediction_interval?.lower_bound,
        upperBound: pred.prediction_interval?.upper_bound,
        predictionInterval: confidenceLevel,
      }))

      return {
        predictions,
        modelId: response.model,
        forecastHorizon,
        confidenceLevel,
        metadata: {
          modelDisplayName: response.modelDisplayName,
          trainingDataEndTime: '', // This would come from model metadata
          predictionStartTime: predictions[0]?.timestamp || '',
          predictionEndTime: predictions[predictions.length - 1]?.timestamp || '',
        },
      }
    }, 'generateForecast')
  }

  async batchForecast(
    modelId: string,
    inputGcsUri: string,
    outputGcsUri: string,
    jobDisplayName: string
  ): Promise<BatchPredictionJob> {
    return withErrorHandling(async () => {
      const inputConfig = {
        instancesFormat: 'jsonl' as const,
        gcsSource: {
          uris: [inputGcsUri],
        },
      }

      const outputConfig = {
        predictionsFormat: 'jsonl' as const,
        gcsDestination: {
          outputUriPrefix: outputGcsUri,
        },
      }

      return await this.client.createBatchPredictionJob(
        jobDisplayName,
        vertexAIConfig.getModelResourceName(modelId),
        inputConfig,
        outputConfig
      )
    }, 'batchForecast')
  }

  async getModelEvaluation(modelId: string): Promise<ModelEvaluation | null> {
    return withErrorHandling(async () => {
      try {
        const model = await this.client.getModel(modelId)
        
        // For AutoML models, evaluation metrics are typically stored in the model metadata
        if (model.metadata && model.metadata.evaluation) {
          return {
            name: `${model.name}/evaluations/default`,
            displayName: 'AutoML Forecasting Evaluation',
            metricsSchemaUri: 'gs://google-cloud-aiplatform/schema/modelevaluation/forecasting_metrics/1.0.0.yaml',
            metrics: model.metadata.evaluation,
            createTime: model.createTime || new Date().toISOString(),
          } as ModelEvaluation
        }

        return null
      } catch (error) {
        console.warn('Could not retrieve model evaluation:', error)
        return null
      }
    }, 'getModelEvaluation')
  }

  async explainForecast(
    endpointId: string,
    timeSeriesData: Array<{
      timestamp: string
      timeSeriesIdentifier?: string
      [key: string]: any
    }>
  ): Promise<any> {
    return withErrorHandling(async () => {
      const instances: PredictionInstance[] = timeSeriesData.map(data => ({
        ...data,
        timestamp: data.timestamp,
      }))

      return await this.client.explain(endpointId, instances)
    }, 'explainForecast')
  }

  async listForecastingModels(filter?: string): Promise<any[]> {
    return withErrorHandling(async () => {
      const allModels = await this.client.listModels(filter)
      
      // Filter for forecasting models
      return allModels.filter(model => 
        model.metadata?.trainingPipeline?.trainingTaskDefinition?.includes('automl_forecasting') ||
        model.displayName?.toLowerCase().includes('forecast')
      )
    }, 'listForecastingModels')
  }

  async getTrainingJobStatus(jobId: string): Promise<ModelTrainingJob> {
    return withErrorHandling(async () => {
      return await this.client.getTrainingPipeline(jobId)
    }, 'getTrainingJobStatus')
  }

  async cancelTrainingJob(jobId: string): Promise<void> {
    return withErrorHandling(async () => {
      await this.client.cancelTrainingPipeline(jobId)
    }, 'cancelTrainingJob')
  }

  async getBatchPredictionJobStatus(jobId: string): Promise<BatchPredictionJob> {
    return withErrorHandling(async () => {
      return await this.client.getBatchPredictionJob(jobId)
    }, 'getBatchPredictionJobStatus')
  }

  async validateForecastingData(
    dataUri: string,
    targetColumn: string,
    timeColumn: string,
    timeSeriesIdentifierColumn?: string
  ): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    statistics: {
      totalRows: number
      timeSeriesCount: number
      dateRange: {
        start: string
        end: string
      }
      missingValues: Record<string, number>
    }
  }> {
    return withErrorHandling(async () => {
      // This would typically involve reading the data and performing validation
      // For now, we'll return a placeholder structure
      return {
        isValid: true,
        errors: [],
        warnings: [],
        statistics: {
          totalRows: 0,
          timeSeriesCount: 0,
          dateRange: {
            start: '',
            end: '',
          },
          missingValues: {},
        },
      }
    }, 'validateForecastingData')
  }

  async getOptimalHyperparameters(
    dataUri: string,
    targetColumn: string,
    timeColumn: string,
    forecastHorizon: number
  ): Promise<{
    contextWindow: number
    dataGranularity: {
      unit: string
      quantity: number
    }
    optimizationObjective: string
    budgetRecommendation: number
  }> {
    return withErrorHandling(async () => {
      // This would involve analyzing the data to suggest optimal parameters
      // For now, we'll return reasonable defaults
      return {
        contextWindow: Math.max(forecastHorizon * 2, 50),
        dataGranularity: {
          unit: 'day',
          quantity: 1,
        },
        optimizationObjective: 'minimize_rmse',
        budgetRecommendation: Math.max(1000, forecastHorizon * 10),
      }
    }, 'getOptimalHyperparameters')
  }
}

// Singleton instance
let autoMLForecastingServiceInstance: AutoMLForecastingService | null = null

export function getAutoMLForecastingService(): AutoMLForecastingService {
  if (!autoMLForecastingServiceInstance) {
    autoMLForecastingServiceInstance = new AutoMLForecastingService()
  }
  return autoMLForecastingServiceInstance
}

export function resetAutoMLForecastingService(): void {
  autoMLForecastingServiceInstance = null
}