import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { PerformanceMonitor, initializePerformanceMonitoring } from '@/lib/monitoring/performance-monitor'

// Mock PerformanceObserver
class MockPerformanceObserver {
  private callback: (list: any) => void
  private options: any

  constructor(callback: (list: any) => void) {
    this.callback = callback
  }

  observe(options: any) {
    this.options = options
  }

  disconnect() {
    // Mock disconnect
  }

  // Simulate performance entries
  simulateEntries(entries: any[]) {
    this.callback({
      getEntries: () => entries
    })
  }
}

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  getEntriesByType: jest.fn(() => []),
  memory: {
    usedJSHeapSize: 1024 * 1024 * 10,
    totalJSHeapSize: 1024 * 1024 * 50,
    jsHeapSizeLimit: 1024 * 1024 * 100
  }
}

// Mock window
const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: {
    href: 'https://example.com/dashboard'
  },
  PerformanceObserver: MockPerformanceObserver,
  performance: mockPerformance
}

// Mock navigator
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)'
}

// Setup global mocks
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
})

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
})

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
})

Object.defineProperty(global, 'PerformanceObserver', {
  value: MockPerformanceObserver,
  writable: true
})

describe('Performance Monitoring', () => {
  let performanceMonitor: PerformanceMonitor

  beforeEach(() => {
    performanceMonitor = PerformanceMonitor.getInstance()
    jest.clearAllMocks()
    performanceMonitor.clearMetrics()
  })

  afterEach(() => {
    performanceMonitor.stopMonitoring()
    jest.resetAllMocks()
  })

  describe('PerformanceMonitor', () => {
    it('should be a singleton', () => {
      const instance1 = PerformanceMonitor.getInstance()
      const instance2 = PerformanceMonitor.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should start monitoring successfully', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      performanceMonitor.startMonitoring()

      expect(consoleSpy).toHaveBeenCalledWith('Performance monitoring started')

      consoleSpy.mockRestore()
    })

    it('should stop monitoring successfully', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      performanceMonitor.startMonitoring()
      performanceMonitor.stopMonitoring()

      expect(consoleSpy).toHaveBeenCalledWith('Performance monitoring stopped')

      consoleSpy.mockRestore()
    })

    it('should record custom metrics', () => {
      const customMetric = {
        componentRenderTime: 15.5,
        timestamp: Date.now(),
        url: 'https://example.com/test',
        userAgent: 'Test Browser'
      }

      performanceMonitor.recordMetric(customMetric)

      const metrics = performanceMonitor.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].componentRenderTime).toBe(15.5)
    })

    it('should measure component render time', () => {
      const testComponent = jest.fn(() => 'rendered')

      const result = performanceMonitor.measureComponentRender(
        'TestComponent',
        testComponent
      )

      expect(result).toBe('rendered')
      expect(testComponent).toHaveBeenCalled()

      const metrics = performanceMonitor.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].componentRenderTime).toBeGreaterThan(0)
    })

    it('should measure async operations', async () => {
      const asyncOperation = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'completed'
      })

      const result = await performanceMonitor.measureAsyncOperation(
        'testOperation',
        asyncOperation
      )

      expect(result).toBe('completed')
      expect(asyncOperation).toHaveBeenCalled()

      const metrics = performanceMonitor.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].apiResponseTime).toBeGreaterThan(0)
    })

    it('should handle async operation errors', async () => {
      const failingOperation = jest.fn(async () => {
        throw new Error('Operation failed')
      })

      await expect(
        performanceMonitor.measureAsyncOperation('failingOperation', failingOperation)
      ).rejects.toThrow('Operation failed')

      const metrics = performanceMonitor.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].apiResponseTime).toBeGreaterThan(0)
    })

    it('should calculate aggregated metrics correctly', () => {
      // Add multiple metrics
      performanceMonitor.recordMetric({ fcp: 100 })
      performanceMonitor.recordMetric({ fcp: 200 })
      performanceMonitor.recordMetric({ fcp: 300 })

      const aggregated = performanceMonitor.getAggregatedMetrics()

      expect(aggregated.count).toBe(3)
      expect(aggregated.averages.fcp).toBe(200) // (100 + 200 + 300) / 3
      expect(aggregated.medians.fcp).toBe(200)
    })

    it('should limit stored metrics to prevent memory leaks', () => {
      // Add more than 100 metrics
      for (let i = 0; i < 150; i++) {
        performanceMonitor.recordMetric({ componentRenderTime: i })
      }

      const metrics = performanceMonitor.getMetrics()
      expect(metrics.length).toBeLessThanOrEqual(100)
    })

    it('should export metrics correctly', () => {
      performanceMonitor.recordMetric({ fcp: 100 })
      performanceMonitor.recordMetric({ lcp: 200 })

      const exported = performanceMonitor.exportMetrics()
      const parsed = JSON.parse(exported)

      expect(parsed.metrics).toHaveLength(2)
      expect(parsed.aggregated).toBeDefined()
      expect(parsed.exportedAt).toBeDefined()
    })

    it('should clear metrics', () => {
      performanceMonitor.recordMetric({ fcp: 100 })
      expect(performanceMonitor.getMetrics()).toHaveLength(1)

      performanceMonitor.clearMetrics()
      expect(performanceMonitor.getMetrics()).toHaveLength(0)
    })
  })

  describe('Web Vitals Monitoring', () => {
    it('should handle LCP measurements', () => {
      performanceMonitor.startMonitoring()

      // Simulate LCP entry
      const lcpEntry = {
        startTime: 1500,
        name: 'largest-contentful-paint'
      }

      // This would be called by the actual PerformanceObserver
      performanceMonitor.recordMetric({
        lcp: lcpEntry.startTime,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })

      const metrics = performanceMonitor.getMetrics()
      expect(metrics[0].lcp).toBe(1500)
    })

    it('should handle FID measurements', () => {
      performanceMonitor.startMonitoring()

      // Simulate FID entry
      const fidEntry = {
        processingStart: 105,
        startTime: 100
      }

      performanceMonitor.recordMetric({
        fid: fidEntry.processingStart - fidEntry.startTime,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })

      const metrics = performanceMonitor.getMetrics()
      expect(metrics[0].fid).toBe(5)
    })

    it('should handle CLS measurements', () => {
      performanceMonitor.startMonitoring()

      // Simulate CLS entries
      const clsEntries = [
        { value: 0.1, hadRecentInput: false },
        { value: 0.05, hadRecentInput: false },
        { value: 0.2, hadRecentInput: true } // Should be ignored
      ]

      const totalCLS = clsEntries
        .filter(entry => !entry.hadRecentInput)
        .reduce((sum, entry) => sum + entry.value, 0)

      performanceMonitor.recordMetric({
        cls: totalCLS,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })

      const metrics = performanceMonitor.getMetrics()
      expect(metrics[0].cls).toBe(0.15) // 0.1 + 0.05
    })
  })

  describe('Memory Monitoring', () => {
    it('should record memory usage', () => {
      performanceMonitor.recordMetric({
        jsHeapSizeUsed: mockPerformance.memory.usedJSHeapSize,
        jsHeapSizeTotal: mockPerformance.memory.totalJSHeapSize,
        jsHeapSizeLimit: mockPerformance.memory.jsHeapSizeLimit
      })

      const metrics = performanceMonitor.getMetrics()
      expect(metrics[0].jsHeapSizeUsed).toBe(1024 * 1024 * 10)
      expect(metrics[0].jsHeapSizeTotal).toBe(1024 * 1024 * 50)
      expect(metrics[0].jsHeapSizeLimit).toBe(1024 * 1024 * 100)
    })
  })

  describe('Performance Thresholds', () => {
    it('should identify good performance metrics', () => {
      const goodMetrics = {
        fcp: 1500, // Good: < 1800ms
        lcp: 2000, // Good: < 2500ms
        fid: 50,   // Good: < 100ms
        cls: 0.05  // Good: < 0.1
      }

      performanceMonitor.recordMetric(goodMetrics)

      const aggregated = performanceMonitor.getAggregatedMetrics()
      expect(aggregated.averages.fcp).toBeLessThan(1800)
      expect(aggregated.averages.lcp).toBeLessThan(2500)
      expect(aggregated.averages.fid).toBeLessThan(100)
      expect(aggregated.averages.cls).toBeLessThan(0.1)
    })

    it('should identify poor performance metrics', () => {
      const poorMetrics = {
        fcp: 3500, // Poor: > 3000ms
        lcp: 4500, // Poor: > 4000ms
        fid: 350,  // Poor: > 300ms
        cls: 0.3   // Poor: > 0.25
      }

      performanceMonitor.recordMetric(poorMetrics)

      const aggregated = performanceMonitor.getAggregatedMetrics()
      expect(aggregated.averages.fcp).toBeGreaterThan(3000)
      expect(aggregated.averages.lcp).toBeGreaterThan(4000)
      expect(aggregated.averages.fid).toBeGreaterThan(300)
      expect(aggregated.averages.cls).toBeGreaterThan(0.25)
    })
  })

  describe('Initialization', () => {
    it('should initialize performance monitoring in browser environment', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      initializePerformanceMonitoring()

      // Should start monitoring
      expect(consoleSpy).toHaveBeenCalledWith('Performance monitoring started')

      consoleSpy.mockRestore()
    })

    it('should not initialize in server environment', () => {
      // Temporarily remove window
      const originalWindow = global.window
      delete (global as any).window

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      initializePerformanceMonitoring()

      // Should not start monitoring
      expect(consoleSpy).not.toHaveBeenCalled()

      // Restore window
      global.window = originalWindow
      consoleSpy.mockRestore()
    })
  })
})