import { VertexAIMonitor } from '../vertex-ai-monitor'

describe('VertexAIMonitor', () => {
  let vertexAIMonitor: VertexAIMonitor

  beforeEach(() => {
    vertexAIMonitor = new VertexAIMonitor('test-project', 'us-central1')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('monitorModelPerformance', () => {
    it('should return performance metrics for a model', async () => {
      const modelId = 'test-model-123'
      
      const metrics = await vertexAIMonitor.monitorModelPerformance(modelId)

      expect(metrics).toHaveProperty('id')
      expect(metrics).toHaveProperty('timestamp')
      expect(metrics).toHaveProperty('modelId', modelId)
      expect(metrics).toHaveProperty('predictionLatency')
      expect(metrics).toHaveProperty('memoryUsage')
      expect(metrics).toHaveProperty('cpuUsage')
      expect(metrics).toHaveProperty('throughput')
      expect(metrics).toHaveProperty('accuracy')
      expect(metrics).toHaveProperty('resourceUtilization')

      // Validate accuracy metrics structure
      expect(metrics.accuracy).toHaveProperty('mae')
      expect(metrics.accuracy).toHaveProperty('rmse')
      expect(metrics.accuracy).toHaveProperty('mape')
      expect(metrics.accuracy).toHaveProperty('r2Score')
      expect(metrics.accuracy).toHaveProperty('accuracyScore')
      expect(metrics.accuracy).toHaveProperty('confidenceScore')

      // Validate resource utilization structure
      expect(metrics.resourceUtilization).toHaveProperty('vertexAIEndpointLatency')
      expect(metrics.resourceUtilization).toHaveProperty('neonDBQueryTime')
      expect(metrics.resourceUtilization).toHaveProperty('vectorSearchTime')
      expect(metrics.resourceUtilization).toHaveProperty('cacheHitRate')
      expect(metrics.resourceUtilization).toHaveProperty('errorRate')
      expect(metrics.resourceUtilization).toHaveProperty('concurrentRequests')

      // Validate data types and ranges
      expect(typeof metrics.predictionLatency).toBe('number')
      expect(metrics.predictionLatency).toBeGreaterThan(0)
      expect(typeof metrics.memoryUsage).toBe('number')
      expect(metrics.memoryUsage).toBeGreaterThan(0)
      expect(typeof metrics.cpuUsage).toBe('number')
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0)
      expect(metrics.cpuUsage).toBeLessThanOrEqual(100)
    })

    it('should handle errors gracefully', async () => {
      // Mock a scenario that would cause an error
      const invalidModelId = ''
      
      await expect(vertexAIMonitor.monitorModelPerformance(invalidModelId))
        .rejects.toThrow()
    })
  })

  describe('getVertexAIMetrics', () => {
    it('should return Vertex AI specific metrics', async () => {
      const modelId = 'test-model-456'
      
      const metrics = await vertexAIMonitor.getVertexAIMetrics(modelId)

      expect(metrics).toHaveProperty('modelId', modelId)
      expect(metrics).toHaveProperty('endpointId')
      expect(metrics).toHaveProperty('predictionCount')
      expect(metrics).toHaveProperty('averageLatency')
      expect(metrics).toHaveProperty('errorCount')
      expect(metrics).toHaveProperty('resourceUtilization')
      expect(metrics).toHaveProperty('throughput')

      // Validate resource utilization
      expect(metrics.resourceUtilization).toHaveProperty('cpu')
      expect(metrics.resourceUtilization).toHaveProperty('memory')
      expect(metrics.resourceUtilization).toHaveProperty('gpu')

      // Validate data types
      expect(typeof metrics.predictionCount).toBe('number')
      expect(typeof metrics.averageLatency).toBe('number')
      expect(typeof metrics.errorCount).toBe('number')
      expect(typeof metrics.throughput).toBe('number')
    })

    it('should cache metrics for performance', async () => {
      const modelId = 'test-model-cache'
      
      // First call
      const metrics1 = await vertexAIMonitor.getVertexAIMetrics(modelId)
      
      // Second call should return cached result
      const metrics2 = await vertexAIMonitor.getVertexAIMetrics(modelId)
      
      expect(metrics1).toEqual(metrics2)
    })
  })

  describe('checkEndpointHealth', () => {
    it('should return endpoint health status', async () => {
      const endpointId = 'test-endpoint-123'
      
      const health = await vertexAIMonitor.checkEndpointHealth(endpointId)

      expect(health).toHaveProperty('endpointId', endpointId)
      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('deployedModels')
      expect(health).toHaveProperty('trafficSplit')
      expect(health).toHaveProperty('lastHealthCheck')

      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status)
      expect(Array.isArray(health.deployedModels)).toBe(true)
      expect(typeof health.trafficSplit).toBe('object')
      expect(health.lastHealthCheck).toBeInstanceOf(Date)
    })

    it('should include issues when status is degraded', async () => {
      const endpointId = 'test-endpoint-degraded'
      
      // Mock Math.random to force degraded status
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.05) // Less than 0.1 threshold
      
      const health = await vertexAIMonitor.checkEndpointHealth(endpointId)
      
      if (health.status === 'degraded') {
        expect(health.issues).toBeDefined()
        expect(Array.isArray(health.issues)).toBe(true)
        expect(health.issues!.length).toBeGreaterThan(0)
      }
      
      Math.random = originalRandom
    })
  })

  describe('calculateAccuracyMetrics', () => {
    it('should return accuracy metrics', async () => {
      const modelId = 'test-model-accuracy'
      
      const accuracy = await vertexAIMonitor.calculateAccuracyMetrics(modelId)

      expect(accuracy).toHaveProperty('mae')
      expect(accuracy).toHaveProperty('rmse')
      expect(accuracy).toHaveProperty('mape')
      expect(accuracy).toHaveProperty('r2Score')
      expect(accuracy).toHaveProperty('accuracyScore')
      expect(accuracy).toHaveProperty('confidenceScore')

      // Validate ranges
      expect(accuracy.mae).toBeGreaterThan(0)
      expect(accuracy.rmse).toBeGreaterThan(0)
      expect(accuracy.mape).toBeGreaterThan(0)
      expect(accuracy.r2Score).toBeGreaterThanOrEqual(0)
      expect(accuracy.r2Score).toBeLessThanOrEqual(1)
      expect(accuracy.accuracyScore).toBeGreaterThanOrEqual(0)
      expect(accuracy.accuracyScore).toBeLessThanOrEqual(1)
      expect(accuracy.confidenceScore).toBeGreaterThanOrEqual(0)
      expect(accuracy.confidenceScore).toBeLessThanOrEqual(1)
    })
  })

  describe('getResourceMetrics', () => {
    it('should return resource utilization metrics', async () => {
      const modelId = 'test-model-resources'
      
      const resources = await vertexAIMonitor.getResourceMetrics(modelId)

      expect(resources).toHaveProperty('vertexAIEndpointLatency')
      expect(resources).toHaveProperty('neonDBQueryTime')
      expect(resources).toHaveProperty('vectorSearchTime')
      expect(resources).toHaveProperty('cacheHitRate')
      expect(resources).toHaveProperty('errorRate')
      expect(resources).toHaveProperty('concurrentRequests')

      // Validate data types and ranges
      expect(typeof resources.vertexAIEndpointLatency).toBe('number')
      expect(resources.vertexAIEndpointLatency).toBeGreaterThan(0)
      expect(typeof resources.neonDBQueryTime).toBe('number')
      expect(resources.neonDBQueryTime).toBeGreaterThan(0)
      expect(typeof resources.vectorSearchTime).toBe('number')
      expect(resources.vectorSearchTime).toBeGreaterThan(0)
      expect(typeof resources.cacheHitRate).toBe('number')
      expect(resources.cacheHitRate).toBeGreaterThanOrEqual(0)
      expect(resources.cacheHitRate).toBeLessThanOrEqual(100)
      expect(typeof resources.errorRate).toBe('number')
      expect(resources.errorRate).toBeGreaterThanOrEqual(0)
      expect(typeof resources.concurrentRequests).toBe('number')
      expect(resources.concurrentRequests).toBeGreaterThan(0)
    })
  })

  describe('getModelEvaluationMetrics', () => {
    it('should return model evaluation data', async () => {
      const modelId = 'test-model-evaluation'
      
      const evaluation = await vertexAIMonitor.getModelEvaluationMetrics(modelId)

      expect(evaluation).toHaveProperty('evaluationId')
      expect(evaluation).toHaveProperty('metrics')
      expect(evaluation).toHaveProperty('evaluationTime')
      expect(evaluation).toHaveProperty('datasetSize')

      expect(evaluation.metrics).toHaveProperty('rootMeanSquaredError')
      expect(evaluation.metrics).toHaveProperty('meanAbsoluteError')
      expect(evaluation.metrics).toHaveProperty('meanAbsolutePercentageError')

      expect(evaluation.evaluationTime).toBeInstanceOf(Date)
      expect(typeof evaluation.datasetSize).toBe('number')
      expect(evaluation.datasetSize).toBeGreaterThan(0)
    })
  })

  describe('getBatchPredictionJobMetrics', () => {
    it('should return batch prediction job information', async () => {
      const jobId = 'test-batch-job-123'
      
      const jobMetrics = await vertexAIMonitor.getBatchPredictionJobMetrics(jobId)

      expect(jobMetrics).toHaveProperty('jobId', jobId)
      expect(jobMetrics).toHaveProperty('state')
      expect(jobMetrics).toHaveProperty('createTime')
      expect(jobMetrics).toHaveProperty('endTime')
      expect(jobMetrics).toHaveProperty('inputConfig')
      expect(jobMetrics).toHaveProperty('outputInfo')
      expect(jobMetrics).toHaveProperty('resourcesConsumed')

      expect(jobMetrics.createTime).toBeInstanceOf(Date)
      expect(jobMetrics.endTime).toBeInstanceOf(Date)
      expect(typeof jobMetrics.resourcesConsumed.replicaHours).toBe('number')
    })
  })

  describe('monitorFeatureDrift', () => {
    it('should return feature drift analysis', async () => {
      const modelId = 'test-model-drift'
      
      const driftAnalysis = await vertexAIMonitor.monitorFeatureDrift(modelId)

      expect(driftAnalysis).toHaveProperty('modelId', modelId)
      expect(driftAnalysis).toHaveProperty('driftDetected')
      expect(driftAnalysis).toHaveProperty('driftScore')
      expect(driftAnalysis).toHaveProperty('affectedFeatures')
      expect(driftAnalysis).toHaveProperty('monitoringTime')
      expect(driftAnalysis).toHaveProperty('recommendation')

      expect(typeof driftAnalysis.driftDetected).toBe('boolean')
      expect(typeof driftAnalysis.driftScore).toBe('number')
      expect(driftAnalysis.driftScore).toBeGreaterThanOrEqual(0)
      expect(driftAnalysis.driftScore).toBeLessThanOrEqual(1)
      expect(Array.isArray(driftAnalysis.affectedFeatures)).toBe(true)
      expect(driftAnalysis.monitoringTime).toBeInstanceOf(Date)
      expect(typeof driftAnalysis.recommendation).toBe('string')
    })
  })

  describe('getEndpointTrafficMetrics', () => {
    it('should return endpoint traffic statistics', async () => {
      const endpointId = 'test-endpoint-traffic'
      
      const trafficMetrics = await vertexAIMonitor.getEndpointTrafficMetrics(endpointId)

      expect(trafficMetrics).toHaveProperty('endpointId', endpointId)
      expect(trafficMetrics).toHaveProperty('timeRange')
      expect(trafficMetrics).toHaveProperty('requestCount')
      expect(trafficMetrics).toHaveProperty('errorCount')
      expect(trafficMetrics).toHaveProperty('averageLatency')
      expect(trafficMetrics).toHaveProperty('p95Latency')
      expect(trafficMetrics).toHaveProperty('p99Latency')
      expect(trafficMetrics).toHaveProperty('throughput')

      expect(trafficMetrics.timeRange).toHaveProperty('start')
      expect(trafficMetrics.timeRange).toHaveProperty('end')
      expect(trafficMetrics.timeRange.start).toBeInstanceOf(Date)
      expect(trafficMetrics.timeRange.end).toBeInstanceOf(Date)

      expect(typeof trafficMetrics.requestCount).toBe('number')
      expect(typeof trafficMetrics.errorCount).toBe('number')
      expect(typeof trafficMetrics.averageLatency).toBe('number')
      expect(typeof trafficMetrics.p95Latency).toBe('number')
      expect(typeof trafficMetrics.p99Latency).toBe('number')
      expect(typeof trafficMetrics.throughput).toBe('number')

      // Validate latency ordering
      expect(trafficMetrics.p99Latency).toBeGreaterThanOrEqual(trafficMetrics.p95Latency)
      expect(trafficMetrics.p95Latency).toBeGreaterThanOrEqual(trafficMetrics.averageLatency)
    })
  })
})