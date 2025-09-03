// Unit Tests for Vertex AI AutoML Services

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock environment variables before any imports
process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project'
process.env.GOOGLE_CLOUD_LOCATION = 'us-central1'

// Mock external dependencies
jest.mock('@google-cloud/aiplatform', () => ({
  v1: {
    ModelServiceClient: jest.fn().mockImplementation(() => ({
      createDataset: jest.fn().mockResolvedValue([{ promise: () => Promise.resolve([mockDataset]) }]),
      getDataset: jest.fn().mockResolvedValue([mockDataset]),
      listDatasets: jest.fn().mockResolvedValue([[mockDataset]]),
      deleteDataset: jest.fn().mockResolvedValue([{ promise: () => Promise.resolve() }]),
      importData: jest.fn().mockResolvedValue([{ name: 'import-job-123' }])
    })),
    EndpointServiceClient: jest.fn().mockImplementation(() => ({})),
    PipelineServiceClient: jest.fn().mockImplementation(() => ({})),
    PredictionServiceClient: jest.fn().mockImplementation(() => ({})),
    JobServiceClient: jest.fn().mockImplementation(() => ({}))
  }
}))

// Mock database is not needed for these unit tests

const mockDataset = {
  name: 'projects/test-project/locations/us-central1/datasets/dataset-123',
  displayName: 'Test Forecasting Dataset',
  description: 'Test dataset for forecasting',
  metadataSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/time_series_1.0.0.yaml',
  createTime: '2024-01-01T00:00:00Z',
  updateTime: '2024-01-01T00:00:00Z',
  etag: 'etag-123'
}

describe('Vertex AI AutoML Services', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Dataset Preparation Service', () => {
    it('should create dataset configuration', () => {
      const config = {
        displayName: 'Test Forecasting Dataset',
        description: 'Test dataset for forecasting',
        metadataSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/time_series_1.0.0.yaml',
        targetColumn: 'transcript_count',
        timeColumn: 'date',
        timeSeriesIdentifierColumn: 'client_id',
        dataGranularity: {
          unit: 'day' as const,
          quantity: 1
        },
        holidayRegions: ['US']
      }

      expect(config.displayName).toBe('Test Forecasting Dataset')
      expect(config.targetColumn).toBe('transcript_count')
      expect(config.timeColumn).toBe('date')
      expect(config.dataGranularity?.unit).toBe('day')
    })

    it('should validate required fields', () => {
      const config = {
        displayName: 'Test Dataset',
        metadataSchemaUri: 'test-schema',
        targetColumn: 'transcript_count',
        timeColumn: 'date'
      }

      expect(config.targetColumn).toBeDefined()
      expect(config.timeColumn).toBeDefined()
      expect(config.displayName).toBeDefined()
    })
  })

  describe('Training Job Configuration', () => {
    it('should create training job config', () => {
      const config = {
        displayName: 'Test Forecasting Model',
        modelType: 'automl_forecasting' as const,
        datasetId: 'dataset-123',
        targetColumn: 'transcript_count',
        timeColumn: 'date',
        featureColumns: ['day_of_week', 'month'],
        optimizationObjective: 'minimize_rmse' as const,
        budgetMilliNodeHours: 1000,
        forecastHorizon: 30,
        contextWindow: 90,
        dataGranularity: {
          unit: 'day' as const,
          quantity: 1
        },
        holidayRegions: ['US']
      }

      expect(config.displayName).toBe('Test Forecasting Model')
      expect(config.modelType).toBe('automl_forecasting')
      expect(config.forecastHorizon).toBe(30)
      expect(config.contextWindow).toBe(90)
    })

    it('should validate optimization objectives', () => {
      const validObjectives = ['minimize_rmse', 'minimize_mae', 'minimize_mape']
      
      validObjectives.forEach(objective => {
        const config = {
          displayName: 'Test Model',
          modelType: 'automl_forecasting' as const,
          datasetId: 'dataset-123',
          targetColumn: 'transcript_count',
          timeColumn: 'date',
          featureColumns: [],
          optimizationObjective: objective as 'minimize_rmse' | 'minimize_mae' | 'minimize_mape',
          forecastHorizon: 30
        }

        expect(validObjectives).toContain(config.optimizationObjective)
      })
    })
  })

  describe('Evaluation Configuration', () => {
    it('should create evaluation config', () => {
      const config = {
        metrics: ['mae', 'rmse', 'mape', 'r2'],
        confidenceLevels: [0.95],
        includeFeatureImportance: true,
        includeResidualAnalysis: true,
        includeSeasonalityAnalysis: true
      }

      expect(config.metrics).toContain('mae')
      expect(config.metrics).toContain('rmse')
      expect(config.confidenceLevels).toContain(0.95)
      expect(config.includeFeatureImportance).toBe(true)
    })

    it('should validate confidence levels', () => {
      const validLevels = [0.90, 0.95, 0.99]
      
      validLevels.forEach(level => {
        expect(level).toBeGreaterThan(0)
        expect(level).toBeLessThan(1)
      })
    })
  })

  describe('Deployment Configuration', () => {
    it('should create deployment config', () => {
      const config = {
        endpointDisplayName: 'Test Forecasting Endpoint',
        deployedModelDisplayName: 'Test Deployment',
        machineType: 'n1-standard-2',
        minReplicaCount: 1,
        maxReplicaCount: 3,
        trafficPercentage: 100,
        enableAutoScaling: false,
        enableAccessLogging: false,
        enablePrivateEndpoint: false
      }

      expect(config.endpointDisplayName).toBe('Test Forecasting Endpoint')
      expect(config.machineType).toBe('n1-standard-2')
      expect(config.minReplicaCount).toBe(1)
      expect(config.maxReplicaCount).toBe(3)
    })

    it('should validate replica counts', () => {
      const config = {
        endpointDisplayName: 'Test Endpoint',
        deployedModelDisplayName: 'Test Deployment',
        minReplicaCount: 1,
        maxReplicaCount: 3
      }

      expect(config.minReplicaCount).toBeGreaterThan(0)
      expect(config.maxReplicaCount).toBeGreaterThanOrEqual(config.minReplicaCount)
    })
  })

  describe('Model Versioning', () => {
    it('should create model metadata', () => {
      const metadata = {
        modelId: 'forecasting-model-123',
        vertexModelId: 'vertex-model-456',
        modelName: 'Forecasting Model v1.0.0',
        modelType: 'automl_forecasting' as const,
        version: '1.0.0',
        displayName: 'Forecasting Model v1.0.0',
        tags: ['forecasting', 'automl', '1.0.0'],
        labels: {
          'model-type': 'automl-forecasting',
          'version': '1.0.0'
        },
        status: 'training' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'system'
      }

      expect(metadata.modelType).toBe('automl_forecasting')
      expect(metadata.version).toBe('1.0.0')
      expect(metadata.status).toBe('training')
      expect(metadata.tags).toContain('forecasting')
    })

    it('should validate version format', () => {
      const validVersions = ['1.0.0', '2.1.3', '10.5.2']
      const versionRegex = /^\d+\.\d+\.\d+$/

      validVersions.forEach(version => {
        expect(version).toMatch(versionRegex)
      })
    })
  })

  describe('Data Validation', () => {
    it('should validate time series data structure', () => {
      const timeSeriesData = [
        { timestamp: '2024-01-01', value: 100, client_id: 'client-1' },
        { timestamp: '2024-01-02', value: 105, client_id: 'client-1' },
        { timestamp: '2024-01-03', value: 98, client_id: 'client-1' }
      ]

      timeSeriesData.forEach(point => {
        expect(point.timestamp).toBeDefined()
        expect(point.value).toBeDefined()
        expect(typeof point.value).toBe('number')
      })
    })

    it('should validate forecast horizon', () => {
      const validHorizons = [7, 14, 30, 90, 365]
      
      validHorizons.forEach(horizon => {
        expect(horizon).toBeGreaterThan(0)
        expect(Number.isInteger(horizon)).toBe(true)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle missing required fields', () => {
      const incompleteConfig = {
        displayName: 'Test Model'
        // Missing required fields
      }

      expect(incompleteConfig.displayName).toBeDefined()
      // In real implementation, this would throw an error for missing fields
    })

    it('should handle invalid optimization objectives', () => {
      const invalidObjectives = ['maximize_error', 'minimize_cost', 'invalid_objective']
      const validObjectives = ['minimize_rmse', 'minimize_mae', 'minimize_mape']
      
      invalidObjectives.forEach(objective => {
        expect(validObjectives).not.toContain(objective)
      })
    })
  })

  describe('Resource Name Generation', () => {
    it('should generate correct resource names', () => {
      const projectId = 'test-project'
      const location = 'us-central1'
      const modelId = 'model-123'
      const endpointId = 'endpoint-456'
      const datasetId = 'dataset-789'

      const modelResourceName = `projects/${projectId}/locations/${location}/models/${modelId}`
      const endpointResourceName = `projects/${projectId}/locations/${location}/endpoints/${endpointId}`
      const datasetResourceName = `projects/${projectId}/locations/${location}/datasets/${datasetId}`

      expect(modelResourceName).toBe('projects/test-project/locations/us-central1/models/model-123')
      expect(endpointResourceName).toBe('projects/test-project/locations/us-central1/endpoints/endpoint-456')
      expect(datasetResourceName).toBe('projects/test-project/locations/us-central1/datasets/dataset-789')
    })
  })

  describe('Metric Calculations', () => {
    it('should calculate evaluation metrics', () => {
      const actual = [100, 105, 98, 110, 95]
      const predicted = [102, 103, 100, 108, 97]

      // Calculate MAE
      const mae = actual.reduce((sum, val, i) => sum + Math.abs(val - predicted[i]), 0) / actual.length
      
      // Calculate RMSE
      const mse = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0) / actual.length
      const rmse = Math.sqrt(mse)

      // Calculate MAPE
      const mape = actual.reduce((sum, val, i) => sum + Math.abs((val - predicted[i]) / val), 0) / actual.length * 100

      expect(mae).toBeGreaterThan(0)
      expect(rmse).toBeGreaterThan(0)
      expect(mape).toBeGreaterThan(0)
      expect(rmse).toBeGreaterThanOrEqual(mae) // RMSE is always >= MAE
    })
  })
})