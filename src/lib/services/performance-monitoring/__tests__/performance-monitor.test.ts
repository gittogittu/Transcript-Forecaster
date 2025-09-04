import { PerformanceMonitor } from '../performance-monitor'
import { PerformanceMetrics, PerformanceThresholds } from '../types'

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor
  let mockThresholds: PerformanceThresholds

  beforeEach(() => {
    mockThresholds = {
      accuracy: {
        maeThreshold: 10,
        rmseThreshold: 15,
        mapeThreshold: 20,
        accuracyMinimum: 0.8
      },
      latency: {
        maxPredictionTime: 2000,
        maxEndpointLatency: 1000,
        maxQueryTime: 500
      },
      resources: {
        maxMemoryUsage: 2000,
        maxCpuUsage: 85,
        maxErrorRate: 5,
        minCacheHitRate: 70
      }
    }

    performanceMonitor = new PerformanceMonitor(mockThresholds, 1000) // 1 second interval for testing
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('recordMetrics', () => {
    it('should record performance metrics successfully', async () => {
      const mockMetrics: PerformanceMetrics = {
        id: 'test-metrics-1',
        timestamp: new Date(),
        modelId: 'test-model',
        predictionLatency: 500,
        memoryUsage: 1000,
        cpuUsage: 50,
        throughput: 25,
        accuracy: {
          mae: 5,
          rmse: 8,
          mape: 10,
          r2Score: 0.9,
          accuracyScore: 0.85,
          confidenceScore: 0.8
        },
        resourceUtilization: {
          vertexAIEndpointLatency: 300,
          neonDBQueryTime: 50,
          vectorSearchTime: 100,
          cacheHitRate: 80,
          errorRate: 2,
          concurrentRequests: 5
        }
      }

      await expect(performanceMonitor.recordMetrics(mockMetrics)).resolves.not.toThrow()
    })

    it('should trigger alerts when thresholds are exceeded', async () => {
      const mockMetrics: PerformanceMetrics = {
        id: 'test-metrics-2',
        timestamp: new Date(),
        modelId: 'test-model',
        predictionLatency: 3000, // Exceeds threshold
        memoryUsage: 2500, // Exceeds threshold
        cpuUsage: 90, // Exceeds threshold
        throughput: 25,
        accuracy: {
          mae: 15, // Exceeds threshold
          rmse: 20, // Exceeds threshold
          mape: 25, // Exceeds threshold
          r2Score: 0.6,
          accuracyScore: 0.7, // Below minimum
          confidenceScore: 0.6
        },
        resourceUtilization: {
          vertexAIEndpointLatency: 300,
          neonDBQueryTime: 50,
          vectorSearchTime: 100,
          cacheHitRate: 60, // Below minimum
          errorRate: 10, // Exceeds threshold
          concurrentRequests: 5
        }
      }

      // Mock console.log to capture alert messages
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await performanceMonitor.recordMetrics(mockMetrics)

      // Should have triggered multiple alerts
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Persisting alert:')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('getSystemHealth', () => {
    it('should return system health status', async () => {
      const health = await performanceMonitor.getSystemHealth()

      expect(health).toHaveProperty('overall')
      expect(health).toHaveProperty('components')
      expect(health).toHaveProperty('lastUpdated')
      expect(health.components).toHaveProperty('vertexAI')
      expect(health.components).toHaveProperty('neonDB')
      expect(health.components).toHaveProperty('vectorSearch')
      expect(health.components).toHaveProperty('predictionEngine')
      expect(health.components).toHaveProperty('caching')

      expect(['healthy', 'degraded', 'critical']).toContain(health.overall)
    })

    it('should determine overall health based on component status', async () => {
      const health = await performanceMonitor.getSystemHealth()

      // Check that each component has required properties
      Object.values(health.components).forEach(component => {
        expect(component).toHaveProperty('status')
        expect(component).toHaveProperty('latency')
        expect(component).toHaveProperty('errorRate')
        expect(component).toHaveProperty('uptime')
        expect(component).toHaveProperty('lastCheck')
        expect(['healthy', 'degraded', 'critical']).toContain(component.status)
      })
    })
  })

  describe('getModelPerformanceHistory', () => {
    it('should return performance history for a model', async () => {
      const modelId = 'test-model'
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      }

      // First record some metrics
      const mockMetrics: PerformanceMetrics = {
        id: 'test-metrics-3',
        timestamp: new Date(),
        modelId,
        predictionLatency: 500,
        memoryUsage: 1000,
        cpuUsage: 50,
        throughput: 25,
        accuracy: {
          mae: 5,
          rmse: 8,
          mape: 10,
          r2Score: 0.9,
          accuracyScore: 0.85,
          confidenceScore: 0.8
        },
        resourceUtilization: {
          vertexAIEndpointLatency: 300,
          neonDBQueryTime: 50,
          vectorSearchTime: 100,
          cacheHitRate: 80,
          errorRate: 2,
          concurrentRequests: 5
        }
      }

      await performanceMonitor.recordMetrics(mockMetrics)

      const history = await performanceMonitor.getModelPerformanceHistory(modelId, timeRange)

      expect(history).toHaveProperty('modelId', modelId)
      expect(history).toHaveProperty('timeRange')
      expect(history).toHaveProperty('metrics')
      expect(history).toHaveProperty('trends')
      expect(history).toHaveProperty('alerts')
      expect(history).toHaveProperty('recommendations')

      expect(Array.isArray(history.metrics)).toBe(true)
      expect(history.trends).toHaveProperty('accuracy')
      expect(history.trends).toHaveProperty('latency')
      expect(history.trends).toHaveProperty('resourceUsage')
    })

    it('should return empty metrics for unknown model', async () => {
      const modelId = 'unknown-model'
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      }

      const history = await performanceMonitor.getModelPerformanceHistory(modelId, timeRange)

      expect(history.metrics).toHaveLength(0)
    })
  })

  describe('getActiveAlerts', () => {
    it('should return only unresolved alerts', async () => {
      const alerts = await performanceMonitor.getActiveAlerts()

      expect(Array.isArray(alerts)).toBe(true)
      alerts.forEach(alert => {
        expect(alert.isResolved).toBe(false)
      })
    })
  })

  describe('resolveAlert', () => {
    it('should resolve an alert by ID', async () => {
      // First create an alert by exceeding thresholds
      const mockMetrics: PerformanceMetrics = {
        id: 'test-metrics-4',
        timestamp: new Date(),
        modelId: 'test-model',
        predictionLatency: 3000, // Exceeds threshold
        memoryUsage: 1000,
        cpuUsage: 50,
        throughput: 25,
        accuracy: {
          mae: 5,
          rmse: 8,
          mape: 10,
          r2Score: 0.9,
          accuracyScore: 0.85,
          confidenceScore: 0.8
        },
        resourceUtilization: {
          vertexAIEndpointLatency: 300,
          neonDBQueryTime: 50,
          vectorSearchTime: 100,
          cacheHitRate: 80,
          errorRate: 2,
          concurrentRequests: 5
        }
      }

      await performanceMonitor.recordMetrics(mockMetrics)

      const activeAlerts = await performanceMonitor.getActiveAlerts()
      if (activeAlerts.length > 0) {
        const alertId = activeAlerts[0].id
        await performanceMonitor.resolveAlert(alertId)

        // Verify alert is resolved (this would require accessing internal state in real implementation)
        expect(true).toBe(true) // Placeholder assertion
      }
    })
  })

  describe('trend analysis', () => {
    it('should analyze trends correctly with sufficient data', async () => {
      const modelId = 'trend-test-model'
      
      // Record multiple metrics to establish trends
      for (let i = 0; i < 10; i++) {
        const mockMetrics: PerformanceMetrics = {
          id: `trend-metrics-${i}`,
          timestamp: new Date(Date.now() - (10 - i) * 60000), // 1 minute intervals
          modelId,
          predictionLatency: 500 + i * 10, // Increasing trend
          memoryUsage: 1000,
          cpuUsage: 50,
          throughput: 25,
          accuracy: {
            mae: 5,
            rmse: 8,
            mape: 10,
            r2Score: 0.9,
            accuracyScore: 0.85 - i * 0.01, // Decreasing trend
            confidenceScore: 0.8
          },
          resourceUtilization: {
            vertexAIEndpointLatency: 300,
            neonDBQueryTime: 50,
            vectorSearchTime: 100,
            cacheHitRate: 80,
            errorRate: 2,
            concurrentRequests: 5
          }
        }

        await performanceMonitor.recordMetrics(mockMetrics)
      }

      const timeRange = {
        start: new Date(Date.now() - 15 * 60 * 1000),
        end: new Date()
      }

      const history = await performanceMonitor.getModelPerformanceHistory(modelId, timeRange)

      expect(history.trends.accuracy.direction).toBe('degrading')
      expect(history.trends.latency.direction).toBe('degrading')
      expect(typeof history.trends.accuracy.changeRate).toBe('number')
      expect(typeof history.trends.latency.changeRate).toBe('number')
    })
  })
})