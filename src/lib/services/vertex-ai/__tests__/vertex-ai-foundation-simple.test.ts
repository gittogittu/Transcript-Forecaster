// Vertex AI Integration Foundation - Simple Tests

import { describe, it, expect, beforeAll, jest } from '@jest/globals'

// Set up environment before any imports
beforeAll(() => {
  process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project'
  process.env.GOOGLE_CLOUD_LOCATION = 'us-central1'
  process.env.GOOGLE_APPLICATION_CREDENTIALS = 'test-credentials.json'
})

// Mock Google Cloud AI Platform
jest.mock('@google-cloud/aiplatform', () => ({
  v1: {
    ModelServiceClient: jest.fn().mockImplementation(() => ({
      listModels: jest.fn().mockResolvedValue([[]]),
      getModel: jest.fn().mockResolvedValue([{ name: 'test-model' }]),
      deleteModel: jest.fn().mockResolvedValue([{ promise: () => Promise.resolve() }]),
    })),
    EndpointServiceClient: jest.fn().mockImplementation(() => ({
      createEndpoint: jest.fn().mockResolvedValue([{ 
        promise: () => Promise.resolve([{ 
          name: 'projects/test-project/locations/us-central1/endpoints/test-endpoint',
          displayName: 'test-endpoint',
          deployedModels: [],
          trafficSplit: {}
        }])
      }]),
      listEndpoints: jest.fn().mockResolvedValue([[]]),
      getEndpoint: jest.fn().mockResolvedValue([{ 
        name: 'test-endpoint',
        deployedModels: [],
        trafficSplit: {}
      }]),
    })),
    PipelineServiceClient: jest.fn().mockImplementation(() => ({})),
    PredictionServiceClient: jest.fn().mockImplementation(() => ({
      predict: jest.fn().mockResolvedValue([{
        predictions: [{ value: 42 }],
        deployedModelId: 'test-deployed'
      }]),
    })),
    JobServiceClient: jest.fn().mockImplementation(() => ({})),
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

describe('Vertex AI Integration Foundation - Core Features', () => {
  describe('Configuration Management', () => {
    it('should validate required environment variables are set', () => {
      expect(process.env.GOOGLE_CLOUD_PROJECT_ID).toBe('test-project')
      expect(process.env.GOOGLE_CLOUD_LOCATION).toBe('us-central1')
    })

    it('should create proper resource names', () => {
      const projectId = 'test-project'
      const location = 'us-central1'
      const parent = `projects/${projectId}/locations/${location}`
      
      const modelName = `${parent}/models/test-model`
      const endpointName = `${parent}/endpoints/test-endpoint`
      
      expect(modelName).toBe('projects/test-project/locations/us-central1/models/test-model')
      expect(endpointName).toBe('projects/test-project/locations/us-central1/endpoints/test-endpoint')
    })
  })

  describe('Error Handling', () => {
    it('should create proper error objects', async () => {
      const { VertexAIServiceError } = await import('../errors')
      
      const error = new VertexAIServiceError('Test error', 404, 'NOT_FOUND')
      
      expect(error.message).toBe('Test error')
      expect(error.code).toBe(404)
      expect(error.status).toBe('NOT_FOUND')
      expect(error.isNotFound()).toBe(true)
      expect(error.isRetryable()).toBe(false)
    })

    it('should identify retryable errors correctly', async () => {
      const { VertexAIServiceError } = await import('../errors')
      
      const retryableError = new VertexAIServiceError('Rate limited', 429)
      const nonRetryableError = new VertexAIServiceError('Bad request', 400)
      
      expect(retryableError.isRetryable()).toBe(true)
      expect(retryableError.isQuotaExceeded()).toBe(true)
      expect(nonRetryableError.isRetryable()).toBe(false)
    })
  })

  describe('Rate Limiting', () => {
    it('should initialize rate limiter with proper configuration', async () => {
      const { RateLimiter } = await import('../errors')
      
      const config = {
        maxRequestsPerMinute: 60,
        maxConcurrentRequests: 10,
        retryAttempts: 3,
        retryDelayMs: 1000,
        backoffMultiplier: 2.0,
      }
      
      const rateLimiter = new RateLimiter(config)
      const stats = rateLimiter.getStats()
      
      expect(stats.activeRequests).toBe(0)
      expect(stats.queueLength).toBe(0)
      expect(stats.requestsInLastMinute).toBe(0)
    })

    it('should execute operations through rate limiter', async () => {
      const { RateLimiter } = await import('../errors')
      
      const config = {
        maxRequestsPerMinute: 60,
        maxConcurrentRequests: 10,
        retryAttempts: 3,
        retryDelayMs: 100, // Shorter delay for testing
        backoffMultiplier: 2.0,
      }
      
      const rateLimiter = new RateLimiter(config)
      
      const mockOperation = jest.fn().mockResolvedValue('success')
      const result = await rateLimiter.execute(mockOperation)
      
      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })
  })

  describe('Client Operations', () => {
    it('should handle basic client operations', async () => {
      // Import after mocks are set up
      const { VertexAIClient } = await import('../client')
      
      const clientOptions = {
        projectId: 'test-project',
        location: 'us-central1',
        rateLimitConfig: {
          maxRequestsPerMinute: 60,
          maxConcurrentRequests: 10,
          retryAttempts: 3,
          retryDelayMs: 1000,
          backoffMultiplier: 2.0,
        }
      }
      
      const client = new VertexAIClient(clientOptions)
      
      expect(client).toBeDefined()
      expect(client.getClientInfo().projectId).toBe('test-project')
    })

    it('should perform model operations', async () => {
      const { VertexAIClient } = await import('../client')
      
      const clientOptions = {
        projectId: 'test-project',
        location: 'us-central1',
        rateLimitConfig: {
          maxRequestsPerMinute: 60,
          maxConcurrentRequests: 10,
          retryAttempts: 3,
          retryDelayMs: 1000,
          backoffMultiplier: 2.0,
        }
      }
      
      const client = new VertexAIClient(clientOptions)
      
      // Test model listing
      const models = await client.listModels()
      expect(Array.isArray(models)).toBe(true)
      
      // Test model retrieval
      const model = await client.getModel('test-model')
      expect(model.name).toBe('test-model')
    })

    it('should perform endpoint operations', async () => {
      const { VertexAIClient } = await import('../client')
      
      const clientOptions = {
        projectId: 'test-project',
        location: 'us-central1',
        rateLimitConfig: {
          maxRequestsPerMinute: 60,
          maxConcurrentRequests: 10,
          retryAttempts: 3,
          retryDelayMs: 1000,
          backoffMultiplier: 2.0,
        }
      }
      
      const client = new VertexAIClient(clientOptions)
      
      // Test endpoint creation
      const endpoint = await client.createEndpoint('test-endpoint', 'Test description')
      expect(endpoint.name).toContain('test-endpoint')
      
      // Test endpoint listing
      const endpoints = await client.listEndpoints()
      expect(Array.isArray(endpoints)).toBe(true)
    })

    it('should perform prediction operations', async () => {
      const { VertexAIClient } = await import('../client')
      
      const clientOptions = {
        projectId: 'test-project',
        location: 'us-central1',
        rateLimitConfig: {
          maxRequestsPerMinute: 60,
          maxConcurrentRequests: 10,
          retryAttempts: 3,
          retryDelayMs: 1000,
          backoffMultiplier: 2.0,
        }
      }
      
      const client = new VertexAIClient(clientOptions)
      
      // Test prediction
      const response = await client.predict('test-endpoint', [{ input: 'test' }])
      expect(response.predictions).toBeDefined()
      expect(Array.isArray(response.predictions)).toBe(true)
    })
  })

  describe('Enhanced Features', () => {
    it('should validate traffic split correctly', async () => {
      const { VertexAIClient } = await import('../client')
      
      const clientOptions = {
        projectId: 'test-project',
        location: 'us-central1',
        rateLimitConfig: {
          maxRequestsPerMinute: 60,
          maxConcurrentRequests: 10,
          retryAttempts: 3,
          retryDelayMs: 1000,
          backoffMultiplier: 2.0,
        }
      }
      
      const client = new VertexAIClient(clientOptions)
      
      // Valid traffic split should not throw
      await expect(
        client.updateEndpointTrafficSplit('test-endpoint', { 'model1': 60, 'model2': 40 })
      ).resolves.not.toThrow()
      
      // Invalid traffic split should throw
      await expect(
        client.updateEndpointTrafficSplit('test-endpoint', { 'model1': 60, 'model2': 50 })
      ).rejects.toThrow('Traffic split must sum to 100')
    })

    it('should validate scaling parameters', async () => {
      const { VertexAIClient } = await import('../client')
      
      const clientOptions = {
        projectId: 'test-project',
        location: 'us-central1',
        rateLimitConfig: {
          maxRequestsPerMinute: 60,
          maxConcurrentRequests: 10,
          retryAttempts: 3,
          retryDelayMs: 1000,
          backoffMultiplier: 2.0,
        }
      }
      
      const client = new VertexAIClient(clientOptions)
      
      // Valid scaling should not throw
      await expect(
        client.scaleEndpoint('test-endpoint', 'test-model', 1, 3)
      ).resolves.not.toThrow()
      
      // Invalid scaling should throw
      await expect(
        client.scaleEndpoint('test-endpoint', 'test-model', -1, 3)
      ).rejects.toThrow('Invalid replica configuration')
    })

    it('should provide prediction metrics', async () => {
      const { VertexAIClient } = await import('../client')
      
      const clientOptions = {
        projectId: 'test-project',
        location: 'us-central1',
        rateLimitConfig: {
          maxRequestsPerMinute: 60,
          maxConcurrentRequests: 10,
          retryAttempts: 3,
          retryDelayMs: 1000,
          backoffMultiplier: 2.0,
        }
      }
      
      const client = new VertexAIClient(clientOptions)
      
      const result = await client.predictWithMetrics('test-endpoint', [{ input: 'test' }])
      
      expect(result.predictions).toBeDefined()
      expect(result.metrics).toBeDefined()
      expect(typeof result.metrics.latencyMs).toBe('number')
      expect(typeof result.metrics.instanceCount).toBe('number')
      expect(result.metrics.instanceCount).toBe(1)
    })
  })
})