// Vertex AI Integration Foundation Tests

// Set up environment variables before any imports
process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project'
process.env.GOOGLE_CLOUD_LOCATION = 'us-central1'
process.env.GOOGLE_APPLICATION_CREDENTIALS = 'test-credentials.json'

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock Google Cloud AI Platform
jest.mock('@google-cloud/aiplatform', () => ({
  v1: {
    ModelServiceClient: jest.fn().mockImplementation(() => ({
      listModels: jest.fn().mockResolvedValue([[]]),
      getModel: jest.fn().mockResolvedValue([{ name: 'test-model' }]),
      deleteModel: jest.fn().mockResolvedValue([{ promise: () => Promise.resolve() }]),
      uploadModel: jest.fn().mockResolvedValue([{ promise: () => Promise.resolve({ name: 'test-model' }) }]),
    })),
    EndpointServiceClient: jest.fn().mockImplementation(() => ({
      createEndpoint: jest.fn().mockResolvedValue([{ promise: () => Promise.resolve({ name: 'test-endpoint' }) }]),
      listEndpoints: jest.fn().mockResolvedValue([[]]),
      getEndpoint: jest.fn().mockResolvedValue([{ 
        name: 'test-endpoint',
        deployedModels: [],
        trafficSplit: {}
      }]),
      deployModel: jest.fn().mockResolvedValue([{ promise: () => Promise.resolve({ deployedModel: { id: 'test-deployed' } }) }]),
      undeployModel: jest.fn().mockResolvedValue([{ promise: () => Promise.resolve() }]),
      deleteEndpoint: jest.fn().mockResolvedValue([{ promise: () => Promise.resolve() }]),
    })),
    PipelineServiceClient: jest.fn().mockImplementation(() => ({
      createTrainingPipeline: jest.fn().mockResolvedValue([{ 
        name: 'test-pipeline',
        state: 'JOB_STATE_SUCCEEDED'
      }]),
      getTrainingPipeline: jest.fn().mockResolvedValue([{ 
        name: 'test-pipeline',
        state: 'JOB_STATE_SUCCEEDED'
      }]),
      cancelTrainingPipeline: jest.fn().mockResolvedValue([]),
    })),
    PredictionServiceClient: jest.fn().mockImplementation(() => ({
      predict: jest.fn().mockResolvedValue([{
        predictions: [{ value: 42 }],
        deployedModelId: 'test-deployed'
      }]),
      explain: jest.fn().mockResolvedValue([{ explanations: [] }]),
    })),
    JobServiceClient: jest.fn().mockImplementation(() => ({
      createBatchPredictionJob: jest.fn().mockResolvedValue([{ 
        name: 'test-batch-job',
        state: 'JOB_STATE_SUCCEEDED'
      }]),
      getBatchPredictionJob: jest.fn().mockResolvedValue([{ 
        name: 'test-batch-job',
        state: 'JOB_STATE_SUCCEEDED'
      }]),
      listBatchPredictionJobs: jest.fn().mockResolvedValue([[]]),
      cancelBatchPredictionJob: jest.fn().mockResolvedValue([]),
    })),
  }
}))

// Mock Google Auth
jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getClient: jest.fn().mockResolvedValue({
      getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' })
    })
  }))
}))

// Import after environment setup
import { getVertexAIService, resetVertexAIService } from '../index'
import { getVertexAIClient, resetVertexAIClient } from '../client'
import { vertexAIConfig } from '../config'
import { VertexAIServiceError } from '../errors'

describe('Vertex AI Integration Foundation', () => {
  beforeEach(() => {
    // Reset singletons before each test
    resetVertexAIService()
    resetVertexAIClient()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Configuration and Authentication', () => {
    it('should initialize with valid configuration', () => {
      const config = vertexAIConfig.getConfig()
      
      expect(config.projectId).toBe('test-project')
      expect(config.location).toBe('us-central1')
    })

    it('should validate environment configuration', () => {
      const validation = vertexAIConfig.validateEnvironment()
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should handle missing required environment variables', () => {
      delete process.env.GOOGLE_CLOUD_PROJECT_ID
      
      expect(() => {
        vertexAIConfig.validateConfig()
      }).toThrow('Google Cloud Project ID is required')
    })

    it('should generate correct resource names', () => {
      const modelName = vertexAIConfig.getModelResourceName('test-model')
      const endpointName = vertexAIConfig.getEndpointResourceName('test-endpoint')
      
      expect(modelName).toBe('projects/test-project/locations/us-central1/models/test-model')
      expect(endpointName).toBe('projects/test-project/locations/us-central1/endpoints/test-endpoint')
    })

    it('should get access token successfully', async () => {
      const token = await vertexAIConfig.getAccessToken()
      
      expect(token).toBe('mock-token')
    })
  })

  describe('Client Initialization and Basic Operations', () => {
    it('should initialize Vertex AI client successfully', () => {
      const client = getVertexAIClient()
      
      expect(client).toBeDefined()
      expect(client.getClientInfo().projectId).toBe('test-project')
    })

    it('should perform health check successfully', async () => {
      const client = getVertexAIClient()
      const isHealthy = await client.healthCheck()
      
      expect(isHealthy).toBe(true)
    })

    it('should handle client errors gracefully', async () => {
      const client = getVertexAIClient()
      
      // Mock a client method to throw an error
      const mockError = new Error('Test error')
      jest.spyOn(client as any, 'listModels').mockRejectedValueOnce(mockError)
      
      await expect(client.listModels()).rejects.toThrow(VertexAIServiceError)
    })
  })

  describe('Model Management', () => {
    it('should list models successfully', async () => {
      const client = getVertexAIClient()
      const models = await client.listModels()
      
      expect(Array.isArray(models)).toBe(true)
    })

    it('should list models by type', async () => {
      const client = getVertexAIClient()
      const autoMLModels = await client.listModelsByType('automl')
      
      expect(Array.isArray(autoMLModels)).toBe(true)
    })

    it('should get model details', async () => {
      const client = getVertexAIClient()
      const model = await client.getModel('test-model')
      
      expect(model).toBeDefined()
      expect(model.name).toBe('test-model')
    })

    it('should get model versions', async () => {
      const client = getVertexAIClient()
      const versions = await client.getModelVersions('test-model')
      
      expect(Array.isArray(versions)).toBe(true)
    })

    it('should delete model successfully', async () => {
      const client = getVertexAIClient()
      
      await expect(client.deleteModel('test-model')).resolves.not.toThrow()
    })
  })

  describe('Endpoint Management', () => {
    it('should create endpoint successfully', async () => {
      const client = getVertexAIClient()
      const endpoint = await client.createEndpoint('test-endpoint', 'Test endpoint')
      
      expect(endpoint).toBeDefined()
      expect(endpoint.name).toContain('test-endpoint')
    })

    it('should list endpoints successfully', async () => {
      const client = getVertexAIClient()
      const endpoints = await client.listEndpoints()
      
      expect(Array.isArray(endpoints)).toBe(true)
    })

    it('should get endpoint details', async () => {
      const client = getVertexAIClient()
      const endpoint = await client.getEndpoint('test-endpoint')
      
      expect(endpoint).toBeDefined()
      expect(endpoint.name).toBe('test-endpoint')
    })

    it('should check endpoint health', async () => {
      const client = getVertexAIClient()
      const health = await client.getEndpointHealth('test-endpoint')
      
      expect(health).toBeDefined()
      expect(typeof health.isHealthy).toBe('boolean')
      expect(Array.isArray(health.deployedModels)).toBe(true)
    })

    it('should deploy model to endpoint', async () => {
      const client = getVertexAIClient()
      const deployment = await client.deployModelToEndpoint(
        'test-endpoint',
        'test-model',
        'test-deployment'
      )
      
      expect(deployment).toBeDefined()
      expect(deployment.endpointId).toBe('test-endpoint')
    })

    it('should validate traffic split configuration', async () => {
      const client = getVertexAIClient()
      
      // Valid traffic split (sums to 100)
      await expect(
        client.updateEndpointTrafficSplit('test-endpoint', { 'model1': 60, 'model2': 40 })
      ).resolves.not.toThrow()
      
      // Invalid traffic split (doesn't sum to 100)
      await expect(
        client.updateEndpointTrafficSplit('test-endpoint', { 'model1': 60, 'model2': 50 })
      ).rejects.toThrow('Traffic split must sum to 100')
    })

    it('should scale endpoint successfully', async () => {
      const client = getVertexAIClient()
      
      await expect(
        client.scaleEndpoint('test-endpoint', 'test-model', 1, 3)
      ).resolves.not.toThrow()
    })

    it('should validate scaling parameters', async () => {
      const client = getVertexAIClient()
      
      // Invalid scaling configuration
      await expect(
        client.scaleEndpoint('test-endpoint', 'test-model', -1, 3)
      ).rejects.toThrow('Invalid replica configuration')
      
      await expect(
        client.scaleEndpoint('test-endpoint', 'test-model', 5, 3)
      ).rejects.toThrow('Invalid replica configuration')
    })
  })

  describe('Prediction Services', () => {
    it('should make predictions successfully', async () => {
      const client = getVertexAIClient()
      const response = await client.predict('test-endpoint', [{ input: 'test' }])
      
      expect(response).toBeDefined()
      expect(Array.isArray(response.predictions)).toBe(true)
    })

    it('should make predictions with metrics', async () => {
      const client = getVertexAIClient()
      const result = await client.predictWithMetrics('test-endpoint', [{ input: 'test' }])
      
      expect(result).toBeDefined()
      expect(result.predictions).toBeDefined()
      expect(result.metrics).toBeDefined()
      expect(typeof result.metrics.latencyMs).toBe('number')
    })

    it('should handle batch predictions with validation', async () => {
      const client = getVertexAIClient()
      const instances = [{ input: 'test1' }, { input: 'test2' }]
      
      const result = await client.batchPredictWithValidation(instances, 'test-endpoint')
      
      expect(result).toBeDefined()
      expect(Array.isArray(result.predictions)).toBe(true)
      expect(Array.isArray(result.errors)).toBe(true)
      expect(typeof result.successCount).toBe('number')
      expect(typeof result.failureCount).toBe('number')
    })

    it('should create batch prediction job', async () => {
      const client = getVertexAIClient()
      const job = await client.createBatchPredictionJob(
        'test-batch-job',
        'test-model',
        { instancesFormat: 'jsonl', gcsSource: { uris: ['gs://test/input'] } },
        { predictionsFormat: 'jsonl', gcsDestination: { outputUriPrefix: 'gs://test/output' } }
      )
      
      expect(job).toBeDefined()
      expect(job.name).toBe('test-batch-job')
    })
  })

  describe('Service-Level Operations', () => {
    it('should initialize service successfully', () => {
      const service = getVertexAIService()
      
      expect(service).toBeDefined()
    })

    it('should perform comprehensive health check', async () => {
      const service = getVertexAIService()
      const healthCheck = await service.healthCheck()
      
      expect(healthCheck).toBeDefined()
      expect(typeof healthCheck.isHealthy).toBe('boolean')
      expect(healthCheck.services).toBeDefined()
      expect(healthCheck.performance).toBeDefined()
    })

    it('should get service metrics', async () => {
      const service = getVertexAIService()
      const metrics = await service.getServiceMetrics()
      
      expect(metrics).toBeDefined()
      expect(metrics.models).toBeDefined()
      expect(metrics.endpoints).toBeDefined()
      expect(metrics.predictions).toBeDefined()
    })

    it('should validate model deployment', async () => {
      const service = getVertexAIService()
      const validation = await service.validateModelDeployment('test-model')
      
      expect(validation).toBeDefined()
      expect(typeof validation.isValid).toBe('boolean')
      expect(validation.checks).toBeDefined()
      expect(Array.isArray(validation.recommendations)).toBe(true)
    })

    it('should optimize endpoint performance', async () => {
      const service = getVertexAIService()
      const optimization = await service.optimizeEndpointPerformance('test-endpoint')
      
      expect(optimization).toBeDefined()
      expect(optimization.currentConfig).toBeDefined()
      expect(Array.isArray(optimization.recommendations)).toBe(true)
    })

    it('should test connection', async () => {
      const service = getVertexAIService()
      const isConnected = await service.testConnection()
      
      expect(typeof isConnected).toBe('boolean')
    })

    it('should get service statistics', async () => {
      const service = getVertexAIService()
      const stats = await service.getServiceStats()
      
      expect(stats).toBeDefined()
      expect(stats.rateLimiter).toBeDefined()
      expect(stats.client).toBeDefined()
      expect(stats.config).toBeDefined()
    })
  })

  describe('Error Handling and Rate Limiting', () => {
    it('should handle rate limiting correctly', async () => {
      const client = getVertexAIClient()
      const stats = client.getRateLimiterStats()
      
      expect(stats).toBeDefined()
      expect(typeof stats.activeRequests).toBe('number')
      expect(typeof stats.queueLength).toBe('number')
    })

    it('should handle authentication errors', async () => {
      // Mock authentication failure
      jest.spyOn(vertexAIConfig, 'getAccessToken').mockRejectedValueOnce(
        new Error('Authentication failed')
      )
      
      const service = getVertexAIService()
      const healthCheck = await service.healthCheck()
      
      expect(healthCheck.isHealthy).toBe(false)
      expect(healthCheck.errors.some(e => e.includes('Authentication'))).toBe(true)
    })

    it('should handle service errors with proper error types', async () => {
      const client = getVertexAIClient()
      
      // Mock a service error
      const mockError = { code: 404, message: 'Not found' }
      jest.spyOn(client as any, 'getModel').mockRejectedValueOnce(mockError)
      
      await expect(client.getModel('non-existent')).rejects.toThrow(VertexAIServiceError)
    })

    it('should track error statistics', async () => {
      const service = getVertexAIService()
      
      // Clear existing stats
      service.clearErrorStats()
      
      // Trigger an error
      try {
        await service.getModel('non-existent-model')
      } catch (error) {
        // Expected error
      }
      
      const stats = await service.getServiceStats()
      expect(stats.errors).toBeDefined()
    })

    it('should detect circuit breaker conditions', () => {
      const service = getVertexAIService()
      
      // Initially should not be tripped
      expect(service.isCircuitBreakerTripped()).toBe(false)
    })
  })

  describe('Configuration Management', () => {
    it('should update service configuration', () => {
      const service = getVertexAIService()
      const originalConfig = service.getConfig()
      
      service.updateConfig({
        defaultMachineType: 'n1-standard-4',
        enableModelMonitoring: false
      })
      
      const updatedConfig = service.getConfig()
      expect(updatedConfig.defaultMachineType).toBe('n1-standard-4')
      expect(updatedConfig.enableModelMonitoring).toBe(false)
      expect(updatedConfig.enableAutoRetry).toBe(originalConfig.enableAutoRetry)
    })

    it('should validate configuration changes', () => {
      const config = vertexAIConfig.getConfig()
      
      vertexAIConfig.updateConfig({
        location: 'europe-west1'
      })
      
      const updatedConfig = vertexAIConfig.getConfig()
      expect(updatedConfig.location).toBe('europe-west1')
      expect(updatedConfig.projectId).toBe(config.projectId)
    })
  })
})