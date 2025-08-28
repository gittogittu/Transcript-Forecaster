import { errorLogger, ErrorLogEntry } from '../error-logger'

// Mock window and performance APIs
const mockPerformance = {
  now: jest.fn(() => 100),
  getEntriesByType: jest.fn(() => [{
    responseEnd: 150,
    requestStart: 100,
  }]),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  },
}

const mockNavigator = {
  userAgent: 'test-user-agent',
}

Object.defineProperty(global, 'window', {
  value: {
    performance: mockPerformance,
    navigator: mockNavigator,
    location: { href: 'http://localhost:3000/test' },
    addEventListener: jest.fn(),
  },
  writable: true,
})

Object.defineProperty(global, 'PerformanceObserver', {
  value: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  })),
  writable: true,
})

// Mock fetch for external logging
global.fetch = jest.fn()
global.Response = jest.fn().mockImplementation((body, init) => ({
  ok: true,
  status: init?.status || 200,
  json: () => Promise.resolve(JSON.parse(body || '{}')),
}))

describe('ErrorLogger', () => {
  beforeEach(() => {
    errorLogger.clearErrors()
    jest.clearAllMocks()
  })

  describe('logError', () => {
    it('should log an error with basic information', () => {
      const error = new Error('Test error')
      const errorId = errorLogger.logError(error)

      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/)
      
      const errors = errorLogger.getErrors()
      expect(errors).toHaveLength(1)
      expect(errors[0]).toMatchObject({
        id: errorId,
        error: {
          name: 'Error',
          message: 'Test error',
        },
        severity: 'low',
        resolved: false,
      })
    })

    it('should include context information', () => {
      const error = new Error('Test error')
      const context = {
        component: 'TestComponent',
        category: 'test_category',
      }

      const errorId = errorLogger.logError(error, context)
      const errors = errorLogger.getErrors()

      expect(errors[0].context).toMatchObject({
        component: 'TestComponent',
        category: 'test_category',
        userAgent: 'test-user-agent',
        url: 'http://localhost:3000/test',
      })
    })

    it('should include performance metrics', () => {
      const error = new Error('Test error')
      const performance = {
        memoryUsage: 100 * 1024 * 1024,
        renderTime: 150,
      }

      errorLogger.logError(error, {}, performance)
      const errors = errorLogger.getErrors()

      expect(errors[0].performance).toMatchObject({
        memoryUsage: 100 * 1024 * 1024,
        renderTime: 150,
      })
    })

    it('should determine correct severity levels', () => {
      // Critical error
      const criticalError = new Error('ChunkLoadError')
      errorLogger.logError(criticalError)
      
      // High severity error
      const networkError = new Error('Network request failed')
      errorLogger.logError(networkError, { category: 'data_operations' })
      
      // Medium severity error
      const validationError = new Error('Validation failed')
      errorLogger.logError(validationError, { category: 'ui_interaction' })

      const errors = errorLogger.getErrors()
      expect(errors[2].severity).toBe('critical')
      expect(errors[1].severity).toBe('high')
      expect(errors[0].severity).toBe('medium')
    })

    it('should limit stored errors to maximum', () => {
      // Log more than the maximum number of errors
      for (let i = 0; i < 1100; i++) {
        errorLogger.logError(new Error(`Error ${i}`))
      }

      const errors = errorLogger.getErrors()
      expect(errors.length).toBe(1000)
      
      // Should keep the most recent errors
      expect(errors[0].error.message).toBe('Error 1099')
      expect(errors[999].error.message).toBe('Error 100')
    })
  })

  describe('getErrors', () => {
    beforeEach(() => {
      // Set up test data
      errorLogger.logError(new Error('Auth error'), { category: 'authentication', component: 'AuthComponent' })
      errorLogger.logError(new Error('Data error'), { category: 'data_operations', component: 'DataComponent' })
      errorLogger.logError(new Error('UI error'), { category: 'ui_interaction', component: 'UIComponent' })
    })

    it('should return all errors when no filters applied', () => {
      const errors = errorLogger.getErrors()
      expect(errors).toHaveLength(3)
    })

    it('should filter by category', () => {
      const authErrors = errorLogger.getErrors({ category: 'authentication' })
      expect(authErrors).toHaveLength(1)
      expect(authErrors[0].error.message).toBe('Auth error')
    })

    it('should filter by component', () => {
      const dataErrors = errorLogger.getErrors({ component: 'DataComponent' })
      expect(dataErrors).toHaveLength(1)
      expect(dataErrors[0].error.message).toBe('Data error')
    })

    it('should filter by severity', () => {
      const highSeverityErrors = errorLogger.getErrors({ severity: 'high' })
      expect(highSeverityErrors).toHaveLength(1)
      expect(highSeverityErrors[0].context.category).toBe('data_operations')
    })

    it('should filter by resolved status', () => {
      const errorId = errorLogger.logError(new Error('Resolved error'))
      errorLogger.markErrorAsResolved(errorId)

      const unresolvedErrors = errorLogger.getErrors({ resolved: false })
      const resolvedErrors = errorLogger.getErrors({ resolved: true })

      expect(unresolvedErrors).toHaveLength(3)
      expect(resolvedErrors).toHaveLength(1)
    })

    it('should filter by date range', () => {
      const since = new Date(Date.now() - 1000) // 1 second ago
      const recentErrors = errorLogger.getErrors({ since })

      expect(recentErrors).toHaveLength(3)
    })
  })

  describe('getErrorMetrics', () => {
    beforeEach(() => {
      // Set up test data with different categories and severities
      errorLogger.logError(new Error('Auth error 1'), { category: 'authentication' })
      errorLogger.logError(new Error('Auth error 2'), { category: 'authentication' })
      errorLogger.logError(new Error('Data error'), { category: 'data_operations' })
      errorLogger.logError(new Error('Network error'), { category: 'network' })
      errorLogger.logError(new Error('Critical error'), { category: 'authentication' }) // Will be high severity
    })

    it('should calculate error metrics correctly', () => {
      const metrics = errorLogger.getErrorMetrics()

      expect(metrics.totalErrors).toBe(5)
      expect(metrics.errorsByCategory).toEqual({
        authentication: 3,
        data_operations: 1,
        network: 1,
      })
      expect(metrics.errorsBySeverity.high).toBe(2) // data_operations and network
      expect(metrics.errorsBySeverity.low).toBe(3) // authentication errors
    })

    it('should calculate performance impact', () => {
      // Log errors with performance data
      errorLogger.logError(new Error('Memory error'), {}, { memoryUsage: 100 * 1024 * 1024 })
      errorLogger.logError(new Error('Render error'), {}, { renderTime: 200 })
      errorLogger.logError(new Error('Network error'), { category: 'network' })

      const metrics = errorLogger.getErrorMetrics()

      expect(metrics.performanceImpact.memoryIncrease).toBe(1)
      expect(metrics.performanceImpact.renderDelays).toBe(1)
      expect(metrics.performanceImpact.networkFailures).toBe(2) // One from setup, one new
    })

    it('should filter metrics by time range', () => {
      const start = new Date(Date.now() - 1000)
      const end = new Date()

      const metrics = errorLogger.getErrorMetrics({ start, end })
      expect(metrics.totalErrors).toBe(5)
    })
  })

  describe('markErrorAsResolved', () => {
    it('should mark an error as resolved', () => {
      const errorId = errorLogger.logError(new Error('Test error'))
      
      errorLogger.markErrorAsResolved(errorId)
      
      const errors = errorLogger.getErrors()
      expect(errors[0].resolved).toBe(true)
    })

    it('should handle non-existent error IDs gracefully', () => {
      expect(() => {
        errorLogger.markErrorAsResolved('non-existent-id')
      }).not.toThrow()
    })
  })

  describe('external logging', () => {
    it('should send errors to external logger in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      })
      global.fetch = mockFetch

      errorLogger.logError(new Error('Production error'))

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockFetch).toHaveBeenCalledWith('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Production error'),
      })

      process.env.NODE_ENV = originalEnv
    })

    it('should handle external logging failures gracefully', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const mockFetch = jest.fn().mockRejectedValueOnce(new Error('Network error'))
      global.fetch = mockFetch

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      errorLogger.logError(new Error('Test error'))

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send error to external logger:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('clearErrors', () => {
    it('should clear all stored errors', () => {
      errorLogger.logError(new Error('Error 1'))
      errorLogger.logError(new Error('Error 2'))

      expect(errorLogger.getErrors()).toHaveLength(2)

      errorLogger.clearErrors()

      expect(errorLogger.getErrors()).toHaveLength(0)
    })
  })
})