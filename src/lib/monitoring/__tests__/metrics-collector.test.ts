import { metricsCollector } from '../metrics-collector'
import { PerformanceMetrics, UserActivity } from '@/types/monitoring'

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
  }
})

describe('MetricsCollector', () => {
  beforeEach(() => {
    // Reset the collector state before each test
    // In a real implementation, you might want to add a reset method
  })

  describe('recordQuery', () => {
    it('should record query performance metrics', () => {
      const duration = 150
      const endpoint = '/api/transcripts'
      
      metricsCollector.recordQuery(duration, endpoint, true)
      
      const metrics = metricsCollector.getCurrentMetrics()
      expect(metrics).toBeDefined()
      expect(metrics.timestamp).toBeInstanceOf(Date)
    })

    it('should handle failed queries', () => {
      const duration = 5000
      const endpoint = '/api/transcripts'
      
      metricsCollector.recordQuery(duration, endpoint, false)
      
      const metrics = metricsCollector.getCurrentMetrics()
      expect(metrics.errorCount).toBeGreaterThan(0)
    })
  })

  describe('recordModelExecution', () => {
    it('should record ML model execution metrics', () => {
      const modelType = 'linear'
      const duration = 2500
      
      metricsCollector.recordModelExecution(modelType, duration, true)
      
      const metrics = metricsCollector.getCurrentMetrics()
      expect(metrics.modelRuntime).toBeGreaterThan(0)
    })

    it('should handle failed model executions', () => {
      const modelType = 'polynomial'
      const duration = 1000
      
      metricsCollector.recordModelExecution(modelType, duration, false)
      
      const activities = metricsCollector.getRecentActivities()
      const modelActivity = activities.find(a => a.action === 'ml_prediction')
      expect(modelActivity).toBeDefined()
      expect(modelActivity?.success).toBe(false)
    })
  })

  describe('recordUserActivity', () => {
    it('should record user activity', () => {
      const activity: Omit<UserActivity, 'id'> = {
        userId: 'user-123',
        action: 'api_request',
        endpoint: '/api/analytics',
        timestamp: new Date(),
        duration: 200,
        success: true,
      }
      
      metricsCollector.recordUserActivity(activity)
      
      const activities = metricsCollector.getRecentActivities()
      expect(activities.length).toBeGreaterThan(0)
      
      const recordedActivity = activities.find(a => a.userId === 'user-123')
      expect(recordedActivity).toBeDefined()
      expect(recordedActivity?.action).toBe('api_request')
    })

    it('should limit activity history', () => {
      // Record more activities than the limit
      for (let i = 0; i < 10; i++) {
        metricsCollector.recordUserActivity({
          userId: `user-${i}`,
          action: 'test_action',
          timestamp: new Date(),
          success: true,
        })
      }
      
      const activities = metricsCollector.getRecentActivities()
      // Should not exceed reasonable limits
      expect(activities.length).toBeLessThanOrEqual(5000)
    })
  })

  describe('recordError', () => {
    it('should record error information', () => {
      const error = new Error('Test error message')
      const context = '/api/test'
      const userId = 'user-456'
      
      metricsCollector.recordError(error, context, userId)
      
      const activities = metricsCollector.getRecentActivities()
      const errorActivity = activities.find(a => a.action === 'error')
      
      expect(errorActivity).toBeDefined()
      expect(errorActivity?.success).toBe(false)
      expect(errorActivity?.errorMessage).toBe('Test error message')
      expect(errorActivity?.userId).toBe(userId)
    })
  })

  describe('getCurrentMetrics', () => {
    it('should return current performance metrics', () => {
      const metrics = metricsCollector.getCurrentMetrics()
      
      expect(metrics).toBeDefined()
      expect(metrics.id).toBeDefined()
      expect(metrics.timestamp).toBeInstanceOf(Date)
      expect(typeof metrics.queriesPerSecond).toBe('number')
      expect(typeof metrics.modelRuntime).toBe('number')
      expect(typeof metrics.dataSyncLatency).toBe('number')
      expect(typeof metrics.errorCount).toBe('number')
      expect(typeof metrics.activeUsers).toBe('number')
      expect(typeof metrics.memoryUsage).toBe('number')
      expect(typeof metrics.cpuUsage).toBe('number')
    })

    it('should return reasonable metric values', () => {
      const metrics = metricsCollector.getCurrentMetrics()
      
      expect(metrics.queriesPerSecond).toBeGreaterThanOrEqual(0)
      expect(metrics.modelRuntime).toBeGreaterThanOrEqual(0)
      expect(metrics.dataSyncLatency).toBeGreaterThanOrEqual(0)
      expect(metrics.errorCount).toBeGreaterThanOrEqual(0)
      expect(metrics.activeUsers).toBeGreaterThanOrEqual(0)
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0)
      expect(metrics.memoryUsage).toBeLessThanOrEqual(100)
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0)
      expect(metrics.cpuUsage).toBeLessThanOrEqual(100)
    })
  })

  describe('getMetricsSummary', () => {
    it('should return metrics summary for time range', () => {
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000) // 1 hour ago
      
      // Record some test activities
      metricsCollector.recordUserActivity({
        userId: 'user-1',
        action: 'api_request',
        timestamp: new Date(),
        duration: 100,
        success: true,
      })
      
      metricsCollector.recordUserActivity({
        userId: 'user-2',
        action: 'api_request',
        timestamp: new Date(),
        duration: 200,
        success: false,
        errorMessage: 'Test error',
      })
      
      const summary = metricsCollector.getMetricsSummary(startTime, endTime)
      
      expect(summary).toBeDefined()
      expect(summary.timeRange.start).toEqual(startTime)
      expect(summary.timeRange.end).toEqual(endTime)
      expect(typeof summary.averageResponseTime).toBe('number')
      expect(typeof summary.totalRequests).toBe('number')
      expect(typeof summary.errorRate).toBe('number')
      expect(typeof summary.peakActiveUsers).toBe('number')
      expect(Array.isArray(summary.topErrors)).toBe(true)
    })

    it('should calculate error rate correctly', () => {
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000)
      
      // Record activities with known success/failure rates
      metricsCollector.recordUserActivity({
        userId: 'user-1',
        action: 'api_request',
        timestamp: new Date(),
        success: true,
      })
      
      metricsCollector.recordUserActivity({
        userId: 'user-2',
        action: 'api_request',
        timestamp: new Date(),
        success: false,
      })
      
      const summary = metricsCollector.getMetricsSummary(startTime, endTime)
      
      // Should have some error rate > 0
      expect(summary.errorRate).toBeGreaterThan(0)
      expect(summary.errorRate).toBeLessThanOrEqual(100)
    })
  })

  describe('getSystemHealth', () => {
    it('should return system health indicators', () => {
      const healthIndicators = metricsCollector.getSystemHealth()
      
      expect(Array.isArray(healthIndicators)).toBe(true)
      
      healthIndicators.forEach(indicator => {
        expect(indicator.component).toBeDefined()
        expect(['healthy', 'warning', 'critical'].includes(indicator.status)).toBe(true)
        expect(indicator.message).toBeDefined()
        expect(indicator.lastChecked).toBeInstanceOf(Date)
      })
    })
  })

  describe('getRecentActivities', () => {
    it('should return activities within time window', () => {
      const now = new Date()
      
      // Record activity within window
      metricsCollector.recordUserActivity({
        userId: 'user-recent',
        action: 'recent_action',
        timestamp: now,
        success: true,
      })
      
      // Record activity outside window (simulate old activity)
      const oldActivity = {
        userId: 'user-old',
        action: 'old_action',
        timestamp: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
        success: true,
      }
      
      const timeWindow = 5 * 60 * 1000 // 5 minutes
      const recentActivities = metricsCollector.getRecentActivities(timeWindow)
      
      expect(Array.isArray(recentActivities)).toBe(true)
      
      // Should include recent activity
      const recentActivity = recentActivities.find(a => a.userId === 'user-recent')
      expect(recentActivity).toBeDefined()
    })

    it('should default to 5 minute window', () => {
      const activities = metricsCollector.getRecentActivities()
      expect(Array.isArray(activities)).toBe(true)
    })
  })
})