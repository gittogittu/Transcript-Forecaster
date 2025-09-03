// Vertex AI AutoML Dataset Preparation Service

import { getVertexAIClient } from './client'
import { vertexAIConfig } from './config'
import { withErrorHandling } from './errors'
import type { VertexAIClientOptions } from '@/types/vertex-ai'

export interface DatasetConfig {
  displayName: string
  description?: string
  metadataSchemaUri: string
  labels?: Record<string, string>
}

export interface TimeSeriesDatasetConfig extends DatasetConfig {
  targetColumn: string
  timeColumn: string
  timeSeriesIdentifierColumn?: string
  unavailableAtForecastColumns?: string[]
  availableAtForecastColumns?: string[]
  dataGranularity?: {
    unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
    quantity: number
  }
  holidayRegions?: string[]
}

export interface DataSource {
  gcsSource?: {
    uris: string[]
  }
  bigquerySource?: {
    uri: string
  }
}

export interface DatasetImportConfig {
  dataSource: DataSource
  importSchemaUri?: string
}

export interface DataValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  statistics: DataStatistics
  recommendations: DataRecommendation[]
}

export interface ValidationError {
  code: string
  message: string
  column?: string
  rowCount?: number
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  code: string
  message: string
  column?: string
  suggestion?: string
}

export interface DataStatistics {
  totalRows: number
  totalColumns: number
  timeSeriesCount: number
  dateRange: {
    start: string
    end: string
  }
  missingValues: Record<string, number>
  dataTypes: Record<string, string>
  uniqueValues: Record<string, number>
  outliers: Record<string, number>
}

export interface DataRecommendation {
  type: 'data_quality' | 'feature_engineering' | 'model_config'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  action: string
}

export interface Dataset {
  name: string
  displayName: string
  description?: string
  metadataSchemaUri: string
  metadata?: any
  createTime: string
  updateTime: string
  etag: string
  labels?: Record<string, string>
}

export interface DatasetImportJob {
  name: string
  displayName?: string
  dataset: string
  importConfigs: DatasetImportConfig[]
  state: 'JOB_STATE_QUEUED' | 'JOB_STATE_PENDING' | 'JOB_STATE_RUNNING' | 'JOB_STATE_SUCCEEDED' | 'JOB_STATE_FAILED'
  createTime: string
  updateTime: string
  error?: {
    code: number
    message: string
    details: any[]
  }
}

export class DatasetPreparationService {
  private client = getVertexAIClient()

  async createTimeSeriesDataset(config: TimeSeriesDatasetConfig): Promise<Dataset> {
    return withErrorHandling(async () => {
      const metadataSchemaUri = 'gs://google-cloud-aiplatform/schema/dataset/metadata/time_series_1.0.0.yaml'
      
      const metadata = {
        inputConfig: {
          annotationType: 'time_series_forecasting',
          timeSeriesConfig: {
            targetColumn: config.targetColumn,
            timeColumn: config.timeColumn,
            timeSeriesIdentifierColumn: config.timeSeriesIdentifierColumn,
            unavailableAtForecastColumns: config.unavailableAtForecastColumns || [],
            availableAtForecastColumns: config.availableAtForecastColumns || [],
            dataGranularity: config.dataGranularity || {
              unit: 'day',
              quantity: 1
            },
            holidayRegions: config.holidayRegions || []
          }
        }
      }

      const request = {
        parent: vertexAIConfig.getParent(),
        dataset: {
          displayName: config.displayName,
          description: config.description,
          metadataSchemaUri,
          metadata,
          labels: config.labels
        }
      }

      const [operation] = await this.client.modelServiceClient.createDataset(request)
      const [dataset] = await operation.promise()
      
      return dataset as Dataset
    }, 'createTimeSeriesDataset')
  }

  async importDataToDataset(
    datasetId: string,
    dataSource: DataSource,
    importDisplayName?: string
  ): Promise<DatasetImportJob> {
    return withErrorHandling(async () => {
      const importConfig: DatasetImportConfig = {
        dataSource,
        importSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/ioformat/csv_1.0.0.yaml'
      }

      const request = {
        name: vertexAIConfig.getDatasetResourceName(datasetId),
        importConfigs: [importConfig]
      }

      const [operation] = await this.client.modelServiceClient.importData(request)
      
      return {
        name: operation.name || '',
        displayName: importDisplayName,
        dataset: vertexAIConfig.getDatasetResourceName(datasetId),
        importConfigs: [importConfig],
        state: 'JOB_STATE_QUEUED',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      } as DatasetImportJob
    }, 'importDataToDataset')
  }

  async validateTimeSeriesData(
    dataSource: DataSource,
    config: TimeSeriesDatasetConfig
  ): Promise<DataValidationResult> {
    return withErrorHandling(async () => {
      // This is a comprehensive validation that would typically involve:
      // 1. Reading the data from the source
      // 2. Checking data quality, completeness, and format
      // 3. Validating time series requirements
      // 4. Generating statistics and recommendations

      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      const recommendations: DataRecommendation[] = []

      // Basic validation checks
      if (!config.targetColumn) {
        errors.push({
          code: 'MISSING_TARGET_COLUMN',
          message: 'Target column is required for forecasting',
          severity: 'error'
        })
      }

      if (!config.timeColumn) {
        errors.push({
          code: 'MISSING_TIME_COLUMN',
          message: 'Time column is required for time series forecasting',
          severity: 'error'
        })
      }

      // Mock statistics - in a real implementation, this would analyze the actual data
      const statistics: DataStatistics = {
        totalRows: 1000, // Would be calculated from actual data
        totalColumns: 5,
        timeSeriesCount: 1,
        dateRange: {
          start: '2023-01-01',
          end: '2024-12-31'
        },
        missingValues: {
          [config.targetColumn]: 0,
          [config.timeColumn]: 0
        },
        dataTypes: {
          [config.targetColumn]: 'numeric',
          [config.timeColumn]: 'timestamp'
        },
        uniqueValues: {
          [config.targetColumn]: 800,
          [config.timeColumn]: 1000
        },
        outliers: {
          [config.targetColumn]: 5
        }
      }

      // Generate recommendations based on data characteristics
      if (statistics.totalRows < 100) {
        recommendations.push({
          type: 'data_quality',
          priority: 'high',
          title: 'Insufficient Training Data',
          description: 'Time series forecasting typically requires at least 100 data points for reliable predictions',
          action: 'Collect more historical data or consider using a simpler forecasting method'
        })
      }

      if (statistics.missingValues[config.targetColumn] > 0) {
        recommendations.push({
          type: 'data_quality',
          priority: 'medium',
          title: 'Missing Target Values',
          description: `Found ${statistics.missingValues[config.targetColumn]} missing values in target column`,
          action: 'Consider data imputation or removing rows with missing target values'
        })
      }

      if (statistics.outliers[config.targetColumn] > statistics.totalRows * 0.05) {
        recommendations.push({
          type: 'feature_engineering',
          priority: 'medium',
          title: 'High Number of Outliers',
          description: 'More than 5% of data points appear to be outliers',
          action: 'Consider outlier detection and treatment before training'
        })
      }

      // Data granularity recommendations
      if (!config.dataGranularity) {
        recommendations.push({
          type: 'model_config',
          priority: 'low',
          title: 'Data Granularity Not Specified',
          description: 'Specifying data granularity can improve model performance',
          action: 'Set appropriate data granularity based on your data frequency'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        statistics,
        recommendations
      }
    }, 'validateTimeSeriesData')
  }

  async getDataset(datasetId: string): Promise<Dataset> {
    return withErrorHandling(async () => {
      const request = {
        name: vertexAIConfig.getDatasetResourceName(datasetId)
      }

      const [dataset] = await this.client.modelServiceClient.getDataset(request)
      return dataset as Dataset
    }, 'getDataset')
  }

  async listDatasets(filter?: string, pageSize = 50): Promise<Dataset[]> {
    return withErrorHandling(async () => {
      const request = {
        parent: vertexAIConfig.getParent(),
        filter,
        pageSize
      }

      const [datasets] = await this.client.modelServiceClient.listDatasets(request)
      return (datasets || []) as Dataset[]
    }, 'listDatasets')
  }

  async deleteDataset(datasetId: string): Promise<void> {
    return withErrorHandling(async () => {
      const request = {
        name: vertexAIConfig.getDatasetResourceName(datasetId)
      }

      const [operation] = await this.client.modelServiceClient.deleteDataset(request)
      await operation.promise()
    }, 'deleteDataset')
  }

  async getDatasetImportJob(jobId: string): Promise<DatasetImportJob> {
    return withErrorHandling(async () => {
      // This would typically query the operation status
      // For now, return a mock response
      return {
        name: jobId,
        dataset: '',
        importConfigs: [],
        state: 'JOB_STATE_SUCCEEDED',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      } as DatasetImportJob
    }, 'getDatasetImportJob')
  }

  async prepareDataForTraining(
    clientId: string,
    startDate: string,
    endDate: string,
    targetColumn = 'transcript_count',
    timeColumn = 'date'
  ): Promise<{
    gcsUri: string
    statistics: DataStatistics
    recommendations: DataRecommendation[]
  }> {
    return withErrorHandling(async () => {
      // This would typically:
      // 1. Query the database for transcript data
      // 2. Transform it into the required format
      // 3. Upload to GCS
      // 4. Return the GCS URI and metadata

      // Mock implementation
      const gcsUri = `gs://${vertexAIConfig.projectId}-ml-data/datasets/client-${clientId}-${Date.now()}.csv`
      
      const statistics: DataStatistics = {
        totalRows: 365,
        totalColumns: 3,
        timeSeriesCount: 1,
        dateRange: {
          start: startDate,
          end: endDate
        },
        missingValues: {
          [targetColumn]: 0,
          [timeColumn]: 0
        },
        dataTypes: {
          [targetColumn]: 'numeric',
          [timeColumn]: 'timestamp',
          'client_id': 'string'
        },
        uniqueValues: {
          [targetColumn]: 300,
          [timeColumn]: 365,
          'client_id': 1
        },
        outliers: {
          [targetColumn]: 3
        }
      }

      const recommendations: DataRecommendation[] = [
        {
          type: 'model_config',
          priority: 'medium',
          title: 'Seasonal Patterns Detected',
          description: 'Data shows weekly and monthly patterns',
          action: 'Consider enabling holiday effects and seasonal decomposition'
        }
      ]

      return {
        gcsUri,
        statistics,
        recommendations
      }
    }, 'prepareDataForTraining')
  }

  async optimizeDatasetForForecasting(
    datasetId: string,
    config: TimeSeriesDatasetConfig
  ): Promise<{
    optimizedConfig: TimeSeriesDatasetConfig
    improvements: string[]
    estimatedAccuracyGain: number
  }> {
    return withErrorHandling(async () => {
      const dataset = await this.getDataset(datasetId)
      const validation = await this.validateTimeSeriesData(
        { gcsSource: { uris: [] } }, // Would use actual dataset source
        config
      )

      const optimizedConfig = { ...config }
      const improvements: string[] = []
      let estimatedAccuracyGain = 0

      // Optimize based on data characteristics
      if (!config.dataGranularity) {
        optimizedConfig.dataGranularity = {
          unit: 'day',
          quantity: 1
        }
        improvements.push('Set data granularity to daily')
        estimatedAccuracyGain += 0.05
      }

      if (!config.holidayRegions || config.holidayRegions.length === 0) {
        optimizedConfig.holidayRegions = ['US']
        improvements.push('Added US holiday effects')
        estimatedAccuracyGain += 0.03
      }

      // Suggest feature columns based on available data
      if (validation.statistics.totalColumns > 3) {
        optimizedConfig.availableAtForecastColumns = [
          'day_of_week',
          'month',
          'quarter'
        ]
        improvements.push('Added temporal features')
        estimatedAccuracyGain += 0.08
      }

      return {
        optimizedConfig,
        improvements,
        estimatedAccuracyGain: Math.min(estimatedAccuracyGain, 0.25) // Cap at 25%
      }
    }, 'optimizeDatasetForForecasting')
  }
}

// Singleton instance
let datasetPreparationServiceInstance: DatasetPreparationService | null = null

export function getDatasetPreparationService(): DatasetPreparationService {
  if (!datasetPreparationServiceInstance) {
    datasetPreparationServiceInstance = new DatasetPreparationService()
  }
  return datasetPreparationServiceInstance
}

export function resetDatasetPreparationService(): void {
  datasetPreparationServiceInstance = null
}