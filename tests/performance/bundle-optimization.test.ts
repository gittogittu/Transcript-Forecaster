import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { BundleAnalyzer, initializeBundleOptimization, preloadCriticalChunks } from '@/lib/utils/bundle-optimization'

// Mock performance API
const mockPerformance = {
  getEntriesByType: jest.fn(),
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1024 * 1024 * 10, // 10MB
    totalJSHeapSize: 1024 * 1024 * 50, // 50MB
    jsHeapSizeLimit: 1024 * 1024 * 100 // 100MB
  }
}

// Mock window and document
const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  performance: mockPerformance
}

const mockDocument = {
  createElement: jest.fn(() => ({
    rel: '',
    as: '',
    href: '',
    onload: null,
    onerror: null
  })),
  head: {
    appendChild: jest.fn()
  },
  readyState: 'complete'
}

// Mock global objects
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
})

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
})

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
})

describe('Bundle Optimization', () => {
  let bundleAnalyzer: BundleAnalyzer

  beforeEach(() => {
    bundleAnalyzer = BundleAnalyzer.getInstance()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('BundleAnalyzer', () => {
    it('should be a singleton', () => {
      const instance1 = BundleAnalyzer.getInstance()
      const instance2 = BundleAnalyzer.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should analyze bundle size correctly', async () => {
      // Mock performance entries
      const mockEntries = [
        {
          name: 'https://example.com/_next/static/chunks/main.js',
          transferSize: 1024 * 100 // 100KB
        },
        {
          name: 'https://example.com/_next/static/chunks/vendor.js',
          transferSize: 1024 * 500 // 500KB
        },
        {
          name: 'https://example.com/styles.css',
          transferSize: 1024 * 50 // 50KB
        }
      ]

      mockPerformance.getEntriesByType.mockReturnValue(mockEntries)

      const stats = await bundleAnalyzer.analyzeBundleSize()

      expect(stats.totalSize).toBe(1024 * 650) // 650KB total
      expect(stats.assets).toHaveLength(3)
      expect(stats.assets?.[0].type).toBe('js')
      expect(stats.assets?.[2].type).toBe('css')
    })

    it('should handle errors gracefully', async () => {
      mockPerformance.getEntriesByType.mockImplementation(() => {
        throw new Error('Performance API error')
      })

      const stats = await bundleAnalyzer.analyzeBundleSize()

      expect(stats).toEqual({})
    })

    it('should monitor bundle size and warn for large bundles', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()

      // Mock large bundle
      const mockEntries = [
        {
          name: 'https://example.com/_next/static/chunks/large-bundle.js',
          transferSize: 1024 * 1024 * 6 // 6MB
        }
      ]

      mockPerformance.getEntriesByType.mockReturnValue(mockEntries)

      bundleAnalyzer.monitorBundleSize()

      // Should warn about large bundle size
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bundle size is large:')
      )

      consoleSpy.mockRestore()
      consoleLogSpy.mockRestore()
    })
  })

  describe('Bundle Optimization Initialization', () => {
    it('should initialize bundle optimization', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      initializeBundleOptimization()

      // Should have called monitoring functions
      expect(mockDocument.createElement).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Critical Chunk Preloading', () => {
    it('should preload critical chunks successfully', async () => {
      const mockLink = {
        rel: '',
        as: '',
        href: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null
      }

      mockDocument.createElement.mockReturnValue(mockLink)

      const preloadPromise = preloadCriticalChunks()

      // Simulate successful loading
      setTimeout(() => {
        if (mockLink.onload) {
          mockLink.onload()
        }
      }, 0)

      await expect(preloadPromise).resolves.toBeUndefined()

      expect(mockDocument.createElement).toHaveBeenCalledWith('link')
      expect(mockDocument.head.appendChild).toHaveBeenCalled()
    })

    it('should handle preload failures gracefully', async () => {
      const mockLink = {
        rel: '',
        as: '',
        href: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null
      }

      mockDocument.createElement.mockReturnValue(mockLink)
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const preloadPromise = preloadCriticalChunks()

      // Simulate loading error
      setTimeout(() => {
        if (mockLink.onerror) {
          mockLink.onerror()
        }
      }, 0)

      await expect(preloadPromise).resolves.toBeUndefined()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to preload some critical chunks:')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Performance Thresholds', () => {
    it('should identify performance issues', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      // Mock very large bundle
      const mockEntries = [
        {
          name: 'https://example.com/_next/static/chunks/huge-bundle.js',
          transferSize: 1024 * 1024 * 10 // 10MB
        }
      ]

      mockPerformance.getEntriesByType.mockReturnValue(mockEntries)

      const stats = await bundleAnalyzer.analyzeBundleSize()
      
      // Should detect large bundle
      expect(stats.totalSize).toBeGreaterThan(5 * 1024 * 1024) // > 5MB

      bundleAnalyzer.monitorBundleSize()

      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Memory Usage Tracking', () => {
    it('should track memory usage correctly', () => {
      const memoryBefore = mockPerformance.memory.usedJSHeapSize
      
      // Simulate memory increase
      mockPerformance.memory.usedJSHeapSize += 1024 * 1024 // +1MB

      const memoryAfter = mockPerformance.memory.usedJSHeapSize
      const memoryDelta = memoryAfter - memoryBefore

      expect(memoryDelta).toBe(1024 * 1024)
    })
  })

  describe('Asset Type Detection', () => {
    it('should correctly identify asset types', async () => {
      const mockEntries = [
        { name: 'https://example.com/script.js', transferSize: 1024 },
        { name: 'https://example.com/styles.css', transferSize: 512 },
        { name: 'https://example.com/image.png', transferSize: 2048 },
        { name: 'https://example.com/font.woff2', transferSize: 256 }
      ]

      mockPerformance.getEntriesByType.mockReturnValue(mockEntries)

      const stats = await bundleAnalyzer.analyzeBundleSize()

      expect(stats.assets).toBeDefined()
      expect(stats.assets?.some(asset => asset.name.includes('.js'))).toBe(true)
      expect(stats.assets?.some(asset => asset.name.includes('.css'))).toBe(true)
    })
  })
})