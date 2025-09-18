// Integration Tests for Vertex AI AutoML Forecasting Model Creation

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock environment variables
process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project'
process.env.GOOGLE_CLOUD_LOCATION = 'us-central1'

// Mock the config
jest.mock('../config', () => ({
  vertexAIConfig: {
    getProjectId: () => 'test-project',
    getLocation: () => 'us-central1',
    getParent: () => 'projects/test-project/locations/us-central1',
    getModelResourceName: (id: string) => `projects/test-project/locations/us-central1/models/${id}`,
    getEndpointResourceName: (id: string) => `projects/test-project/locations/us-central1/endpoints/${id}`,
    getDatasetResourceName: (id: string) => `projects/test-project/locations/us-central1/datasets/${id}`,
    getTrainingJobResourceName: (id: string) => `projects/test-project/locations/us-central1/trainingPipelines/${id}`,
    getBatchPredictionJobResourceName: (id: string) => `projects/test-project/locations/us-central1/batchPredictionJobs/${id}`,
    getClientOptions: () => ({
      projectId: 'test-project',
      location: 'us-central1',
      rateLimitConfig: {
        maxRequestsPerMinute: 60,
        maxConcurrentRequests: 10,
        retryAttempts: 3,
        retryDelayMs: 1000,
        backoffMultiplier: 2.0
      }
    }),
    getRateLimitConfig: () => ({
      maxRequestsPerMinute: 60,
      maxConcurrentRequests: 10,
      retryAttempts: 3,
      retryDelayMs: 1000,
      backoffMultiplier: 2.0
    }),
    validateConfig: () => {},
    projectId: 'test-project'
  },
  validateVertexAIEnvironment: jest.fn()
}))
import {
  getDatasetPreparationService,
  getModelTrainingService,
  getModelEvaluationService,
  getModelDeploymentService,
  getModelVersioningService,
  resetDatasetPreparationService,
  resetModelTrainingService,
  resetModelEvaluationService,
  resetModelDeploymentService,
  resetModelVersioningService
} from '../index'
import type {
  TimeSeriesDatasetConfig,
  TrainingJobConfig,
  EvaluationConfig,
  DeploymentConfig
} from '../index'

// Mock the Vertex AI client
jest.mock('../client', () => ({
  getVertexAIClient: jest.fn(() => ({
    modelServiceClient: {
      createDataset: jest.fn().mockResolvedValue([{ promise: () => Promise.resolve([mockDataset]) }]),
      getDataset: jest.fn().mockResolvedValue([mockDataset]),
      listDatasets: jest.fn().mockResolvedValue([[mockDataset]]),
      deleteDataset: jest.fn().mockResolvedValue([{ promise: () => Promise.resolve() }]),
      importData: jest.fn().mockResolvedValue([{ name: 'import-job-123' }])
    },
    createTrainingPipeline: jest.fn().mockResolvedValue(mockTrainingJob),
    getTrainingPipeline: jest.fn().mockResolvedValue(mockTrainingJob),
    cancelTrainingPipeline: jest.fn().mockResolvedValue(undefined),
    createEndpoint: jest.fn().mockResolvedValue(mockEndpoint),
    getEndpoint: jest.fn().mockResolvedValue(mockEndpoint),
    listEndpoints: jest.fn().mockResolvedValue([mockEndpoint]),
    deployModelToEndpoint: jest.fn().mockResolvedValue(mockDeployment),
    undeployModel: jest.fn().mockResolvedValue(undefined),
    deleteEndpoint: jest.fn().mockResolvedValue(undefined),
    getModel: jest.fn().mockResolvedValue(mockModel)
  }))
}))

// Mock database queries
jest.mock('@/lib/database', () => ({
  query: jest.fn().mockResolvedValue({
    rows: [{ id: 'model-123', created_at: '2024-01-01T00:00:00Z' }]
  })
}))

const mockDataset = {
  name: 'projects/test-project/locations/us-central1/datasets/dataset-123',
  displayName: 'Test Forecasting Dataset',
  description: 'Test dataset for forecasting',
  metadataSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/time_series_1.0.0.yaml',
  createTime: '2024-01-01T00:00:00Z',
  updateTime: '2024-01-01T00:00:00Z',
  etag: 'etag-123'
}

const mockTrainingJob = {
  name: 'projects/test-project/locations/us-central1/trainingPipelines/training-123',
  displayName: 'Test Forecasting Model',
  state: 'JOB_STATE_SUCCEEDED',
  createTime: '2024-01-01T00:00:00Z',
  startTime: '2024-01-01T01:00:00Z',
  endTime: '2024-01-01T03:00:00Z',
  modelId: 'model-123'
}

const mockEndpoint = {
  name: 'projects/test-project/locations/us-central1/endpoints/endpoint-123',
  displayName: 'Test Forecasting Endpoint',
  deployedModels: [],
  trafficSplit: {},
  createTime: '2024-01-01T00:00:00Z',
  updateTime: '2024-01-01T00:00:00Z'
}

const mockDeployment = {
  endpointId: 'endpoint-123',
  deployedModelId: 'deployed-model-123',
  displayName: 'Test Deployment',
  createTime: '2024-01-01T00:00:00Z',
  modelVersionId: 'model-123'
}

const mockModel = {
  name: 'projects/test-project/locations/us-central1/models/model-123',
  displayName: 'Test Model',
  createTime: '2024-01-01T00:00:00Z',
  metadata: {
    evaluation: {
      mae: 5.2,
      rmse: 8.1,
      mape: 12.3,
      r2Score: 0.847
    }
  }
}

describe('Vertex AI AutoML Forecasting Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    resetDatasetPreparationService()
    resetModelTrainingService()
    resetModelEvaluationService()
    resetModelDeploymentService()
    resetModelVersioningService()
  })

  describe('Dataset Preparation', () => {
    it('should create a time series dataset', async () => {
      const config: TimeSeriesDatasetConfig = {
        displayName: 'Test Forecasting Dataset',
        description: 'Test dataset for forecasting',
        metadataSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/time_series_1.0.0.yaml',
        targetColumn: 'transcript_count',
        timeColumn: 'date',
        timeSeriesIdentifierColumn: 'client_id',
        dataGranularity: {
          unit: 'day',
          quantity: 1
        },
        holidayRegions: ['US']
      }

      const datasetService = getDatasetPreparationService()
      const dataset = await datasetService.createTimeSeriesDataset(config)

      expect(dataset).toBeDefined()
      expect(dataset.displayName).toBe(config.displayName)
      expect(dataset.metadataSchemaUri).toBe(config.metadataSchemaUri)
    })

    it('should validate time series data', async () => {
      const config: TimeSeriesDatasetConfig = {
        displayName: 'Test Dataset',
        metadataSchemaUri: 'test-schema',
        targetColumn: 'transcript_count',
        timeColumn: 'date'
      }

      const dataSource = {
        gcsSource: {
          uris: ['gs://test-bucket/data.csv']
        }
      }

      const datasetService = getDatasetPreparationService()
      const validation = await datasetService.validateTimeSeriesData(dataSource, config)

      expect(validation).toBeDefined()
      expect(validation.isValid).toBe(true)
      expect(validation.statistics).toBeDefined()
      expect(validation.recommendations).toBeDefined()
    })

    it('should import data to dataset', async () => {
      const dataSource = {
        gcsSource: {
          uris: ['gs://test-bucket/data.csv']
        }
      }

      const datasetService = getDatasetPreparationService()
      const importJob = await datasetService.importDataToDataset(
        'dataset-123',
        dataSource,
        'Test Import'
      )

      expect(importJob).toBeDefined()
      expect(importJob.dataset).toContain('dataset-123')
      expect(importJob.state).toBe('JOB_STATE_QUEUED')
    })

    it('should optimize dataset for forecasting', async () => {
      const config: TimeSeriesDatasetConfig = {
        displayName: 'Test Dataset',
        metadataSchemaUri: 'test-schema',
        targetColumn: 'transcript_count',
        timeColumn: 'date'
      }

      const datasetService = getDatasetPreparationService()
      const optimization = await datasetService.optimizeDatasetForForecasting('dataset-123', config)

      expect(optimization).toBeDefined()
      expect(optimization.optimizedConfig).toBeDefined()
      expect(optimization.improvements).toBeInstanceOf(Array)
      expect(optimization.estimatedAccuracyGain).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Model Training', () => {
    it('should create a training job', async () => {
      const config: TrainingJobConfig = {
        displayName: 'Test Forecasting Model',
        modelType: 'automl_forecasting',
        datasetId: 'dataset-123',
        targetColumn: 'transcript_count',
        timeColumn: 'date',
        featureColumns: ['day_of_week', 'month'],
        optimizationObjective: 'minimize_rmse',
        budgetMilliNodeHours: 1000,
        forecastHorizon: 30,
        contextWindow: 90,
        dataGranularity: {
          unit: 'day',
          quantity: 1
        },
        holidayRegions: ['US']
      }

      const trainingService = getModelTrainingService()
      const trainingJob = await trainingService.createTrainingJob(config)

      expect(trainingJob).toBeDefined()
      expect(trainingJob.displayName).toBe(config.displayName)
      expect(trainingJob.state).toBe('JOB_STATE_SUCCEEDED')
    })

    it('should get training job status', async () => {
      const trainingService = getModelTrainingService()
      const status = await trainingService.getTrainingJobStatus('training-123')

      expect(status).toBeDefined()
      expect(status.jobId).toBe('training-123')
      expect(status.status).toBe('succeeded')
      expect(status.progress).toBe(100)
    })

    it('should optimize hyperparameters', async () => {
      const config: TrainingJobConfig = {
        displayName: 'Test Model',
        modelType: 'automl_forecasting',
        datasetId: 'dataset-123',
        targetColumn: 'transcript_count',
        timeColumn: 'date',
        featureColumns: [],
        optimizationObjective: 'minimize_rmse',
        forecastHorizon: 30
      }

      const trainingService = getModelTrainingService()
      const optimization = await trainingService.optimizeHyperparameters(config, [
        { type: 'minimize_rmse' }
      ])

      expect(optimization).toBeDefined()
      expect(optimization.optimizedConfig).toBeDefined()
      expect(optimization.expectedImprovement).toBeGreaterThanOrEqual(0)
      expect(optimization.recommendations).toBeInstanceOf(Array)
    })

    it('should estimate training cost', async () => {
      const config: TrainingJobConfig = {
        displayName: 'Test Model',
        modelType: 'automl_forecasting',
        datasetId: 'dataset-123',
        targetColumn: 'transcript_count',
        timeColumn: 'date',
        featureColumns: [],
        optimizationObjective: 'minimize_rmse',
        forecastHorizon: 30,
        budgetMilliNodeHours: 2000
      }

      const trainingService = getModelTrainingService()
      const cost = await trainingService.estimateTrainingCost(config)

      expect(cost).toBeDefined()
      expect(cost.estimatedCostUSD).toBeGreaterThan(0)
      expect(cost.budgetRecommendation).toBeGreaterThanOrEqual(config.budgetMilliNodeHours!)
      expect(cost.costBreakdown).toBeDefined()
    })
  })

  describe('Model Evaluation', () => {
    it('should evaluate a model', async () => {
      const config: EvaluationConfig = {
        metrics: ['mae', 'rmse', 'mape', 'r2'],
        confidenceLevels: [0.95],
        includeFeatureImportance: true,
        includeResidualAnalysis: true,
        includeSeasonalityAnalysis: true
      }

      const evaluationService = getModelEvaluationService()
      const evaluation = await evaluationService.evaluateModel('model-123', config)

      expect(evaluation).toBeDefined()
      expect(evaluation.modelId).toBe('model-123')
      expect(evaluation.metrics).toBeDefined()
      expect(evaluation.metrics.mae).toBeGreaterThan(0)
      expect(evaluation.confidenceIntervals).toBeInstanceOf(Array)
      expect(evaluation.featureImportance).toBeInstanceOf(Array)
    })

    it('should perform cross validation', async () => {
      const evaluationService = getModelEvaluationService()
      const cvResult = await evaluationService.performCrossValidation({}, 5)

      expect(cvResult).toBeDefined()
      expect(cvResult.folds).toBe(5)
      expect(cvResult.metrics).toHaveLength(5)
      expect(cvResult.averageMetrics).toBeDefined()
      expect(cvResult.metricStandardDeviations).toBeDefined()
    })

    it('should compare models', async () => {
      const evaluationService = getModelEvaluationService()
      const comparison = await evaluationService.compareModels(['model-1', 'model-2'])

      expect(comparison).toBeDefined()
      expect(comparison.models).toHaveLength(2)
      expect(comparison.bestModel).toBeDefined()
      expect(comparison.ranking).toBeInstanceOf(Array)
      expect(comparison.statisticalTests).toBeInstanceOf(Array)
    })

    it('should get model explanation', async () => {
      const instances = [
        { timestamp: '2024-01-01', value: 100 },
        { timestamp: '2024-01-02', value: 105 }
      ]

      const evaluationService = getModelEvaluationService()
      const explanation = await evaluationService.getModelExplanation('model-123', instances)

      expect(explanation).toBeDefined()
      expect(explanation.globalExplanation).toBeInstanceOf(Array)
      expect(explanation.localExplanations).toHaveLength(instances.length)
    })
  })

  describe('Model Deployment', () => {
    it('should deploy a model', async () => {
      const config: DeploymentConfig = {
        endpointDisplayName: 'Test Forecasting Endpoint',
        deployedModelDisplayName: 'Test Deployment',
        machineType: 'n1-standard-2',
        minReplicaCount: 1,
        maxReplicaCount: 3,
        trafficPercentage: 100
      }

      const deploymentService = getModelDeploymentService()
      const deployment = await deploymentService.deployModel('model-123', config)

      expect(deployment).toBeDefined()
      expect(deployment.endpointId).toBe('endpoint-123')
      expect(deployment.deployedModelId).toBe('deployed-model-123')
    })

    it('should get endpoint status', async () => {
      const deploymentService = getModelDeploymentService()
      const status = await deploymentService.getEndpointStatus('endpoint-123')

      expect(status).toBeDefined()
      expect(status.endpointId).toBe('endpoint-123')
      expect(status.status).toBe('ready')
      expect(status.metrics).toBeDefined()
    })

    it('should monitor deployment', async () => {
      const deploymentService = getModelDeploymentService()
      const monitoring = await deploymentService.monitorDeployment(
        'endpoint-123',
        'deployed-model-123',
        30
      )

      expect(monitoring).toBeDefined()
      expect(monitoring.isHealthy).toBeDefined()
      expect(monitoring.metrics).toBeInstanceOf(Array)
      expect(monitoring.alerts).toBeInstanceOf(Array)
      expect(monitoring.recommendation).toBeDefined()
    })

    it('should update traffic split', async () => {
      const deploymentService = getModelDeploymentService()
      
      await expect(
        deploymentService.updateTrafficSplit('endpoint-123', {
          'deployed-model-1': 70,
          'deployed-model-2': 30
        })
      ).resolves.not.toThrow()
    })
  })

  describe('Model Versioning', () => {
    it('should create a model version', async () => {
      const trainingConfig = {
        datasetId: 'dataset-123',
        targetColumn: 'transcript_count',
        timeColumn: 'date',
        forecastHorizon: 30,
        contextWindow: 90,
        optimizationObjective: 'minimize_rmse' as const,
        budgetMilliNodeHours: 1000,
        featureColumns: ['day_of_week'],
        hyperparameters: {},
        trainingDataSplit: {
          trainingFraction: 0.8,
          validationFraction: 0.1,
          testFraction: 0.1
        }
      }

      const versioningService = getModelVersioningService()
      const version = await versioningService.createModelVersion(
        'forecasting-model',
        trainingConfig,
        '1.0.0',
        'Initial version'
      )

      expect(version).toBeDefined()
      expect(version.version).toBe('1.0.0')
      expect(version.modelId).toBe('forecasting-model')
      expect(version.changelog).toBe('Initial version')
    })

    it('should compare model versions', async () => {
      const versioningService = getModelVersioningService()
      const comparison = await versioningService.compareVersions('version-1', 'version-2')

      expect(comparison).toBeDefined()
      expect(comparison.versionA).toBeDefined()
      expect(comparison.versionB).toBeDefined()
      expect(comparison.comparison).toBeDefined()
      expect(comparison.recommendation).toBeDefined()
    })

    it('should get model lineage', async () => {
      const versioningService = getModelVersioningService()
      const lineage = await versioningService.getModelLineage('forecasting-model')

      expect(lineage).toBeDefined()
      expect(lineage.modelId).toBe('forecasting-model')
      expect(lineage.versions).toBeInstanceOf(Array)
      expect(lineage.experiments).toBeInstanceOf(Array)
      expect(lineage.deploymentHistory).toBeInstanceOf(Array)
    })

    it('should get model registry', async () => {
      const versioningService = getModelVersioningService()
      const registry = await versioningService.getModelRegistry({
        modelType: 'automl_forecasting'
      })

      expect(registry).toBeDefined()
      expect(registry.models).toBeInstanceOf(Array)
      expect(registry.totalCount).toBeGreaterThanOrEqual(0)
      expect(registry.activeModels).toBeGreaterThanOrEqual(0)
    })
  })

  describe('End-to-End Workflow', () => {
    it('should complete full AutoML forecasting workflow', async () => {
      // 1. Create dataset
      const datasetConfig: TimeSeriesDatasetConfig = {
        displayName: 'E2E Test Dataset',
        metadataSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/time_series_1.0.0.yaml',
        targetColumn: 'transcript_count',
        timeColumn: 'date',
        dataGranularity: { unit: 'day', quantity: 1 }
      }

      const datasetService = getDatasetPreparationService()
      const dataset = await datasetService.createTimeSeriesDataset(datasetConfig)
      expect(dataset).toBeDefined()

      // 2. Import data
      const dataSource = { gcsSource: { uris: ['gs://test-bucket/data.csv'] } }
      const importJob = await datasetService.importDataToDataset(
        'dataset-123',
        dataSource
      )
      expect(importJob).toBeDefined()

      // 3. Create training job
      const trainingConfig: TrainingJobConfig = {
        displayName: 'E2E Test Model',
        modelType: 'automl_forecasting',
        datasetId: 'dataset-123',
        targetColumn: 'transcript_count',
        timeColumn: 'date',
        featureColumns: [],
        optimizationObjective: 'minimize_rmse',
        forecastHorizon: 30
      }

      const trainingService = getModelTrainingService()
      const trainingJob = await trainingService.createTrainingJob(trainingConfig)
      expect(trainingJob).toBeDefined()

      // 4. Evaluate model
      const evaluationConfig: EvaluationConfig = {
        metrics: ['mae', 'rmse', 'mape', 'r2'],
        confidenceLevels: [0.95],
        includeFeatureImportance: true,
        includeResidualAnalysis: false,
        includeSeasonalityAnalysis: false
      }

      const evaluationService = getModelEvaluationService()
      const evaluation = await evaluationService.evaluateModel('model-123', evaluationConfig)
      expect(evaluation).toBeDefined()

      // 5. Deploy model
      const deploymentConfig: DeploymentConfig = {
        endpointDisplayName: 'E2E Test Endpoint',
        deployedModelDisplayName: 'E2E Test Deployment'
      }

      const deploymentService = getModelDeploymentService()
      const deployment = await deploymentService.deployModel('model-123', deploymentConfig)
      expect(deployment).toBeDefined()

      // 6. Create model version
      const versioningService = getModelVersioningService()
      const version = await versioningService.createModelVersion(
        'e2e-test-model',
        {
          datasetId: 'dataset-123',
          targetColumn: 'transcript_count',
          timeColumn: 'date',
          forecastHorizon: 30,
          contextWindow: 90,
          optimizationObjective: 'minimize_rmse',
          budgetMilliNodeHours: 1000,
          featureColumns: [],
          hyperparameters: {},
          trainingDataSplit: { trainingFraction: 0.8, validationFraction: 0.1, testFraction: 0.1 }
        }
      )
      expect(version).toBeDefined()

      console.log('End-to-end AutoML forecasting workflow completed successfully')
    })
  })
})