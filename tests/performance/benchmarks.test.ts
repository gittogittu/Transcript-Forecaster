import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { PerformanceBenchmark, TranscriptAnalyticsBenchmarks } from '@/lib/testing/performance-benchmarks'

// Mock performance.now()
const mockPerformanceNow = jest.fn()
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    memory: {
      usedJSHeapSize: 1024 * 1024 * 10
    }
  },
  writable: true
})

// Mock window for memory measurements
Object.defineProperty(global, 'window', {
  value: {
    gc: jest.fn()
  },
  writable: true
})

describe('Performance Benchmarks', () => {
  let benchmark: PerformanceBenchmark
  let transcriptBenchmarks: TranscriptAnalyticsBenchmarks

  beforeEach(() => {
    benchmark = new PerformanceBenchmark()
    transcriptBenchmarks = new TranscriptAnalyticsBenchmarks()
    jest.clearAllMocks()

    // Reset performance.now() mock
    let time = 0
    mockPerformanceNow.mockImplementation(() => {
      time += 10 // Each call adds 10ms
      return time
    })
  })

  afterEach(() => {
    benchmark.clearResults()
    jest.resetAllMocks()
  })

  describe('PerformanceBenchmark', () => {
    it('should run a simple benchmark', async () => {
      const testFunction = jest.fn(() => {
        // Simulate some work
        for (let i = 0; i < 1000; i++) {
          Math.sqrt(i)
        }
      })

      const result = await benchmark.benchmark('Simple Test', testFunction, {
        iterations: 5,
        warmupIterations: 2
      })

      expect(result.name).toBe('Simple Test')
      expect(result.iterations).toBe(5)
      expect(result.averageTime).toBeGreaterThan(0)
      expect(result.minTime).toBeGreaterThan(0)
      expect(result.maxTime).toBeGreaterThan(0)
      expect(result.standardDeviation).toBeGreaterThanOrEqual(0)

      // Should have called warmup + actual iterations
      expect(testFunction).toHaveBeenCalledTimes(7) // 2 warmup + 5 actual
    })

    it('should run async benchmark', async () => {
      const asyncFunction = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 1))
      })

      const result = await benchmark.benchmark('Async Test', asyncFunction, {
        iterations: 3
      })

      expect(result.name).toBe('Async Test')
      expect(result.iterations).toBe(3)
      expect(asyncFunction).toHaveBeenCalledTimes(13) // 10 warmup + 3 actual
    })

    it('should measure memory usage when requested', async () => {
      const testFunction = jest.fn(() => {
        // Create some objects to use memory
        const arr = new Array(1000).fill(0)
        // Don't return anything to match expected signature
      })

      const result = await benchmark.benchmark('Memory Test', testFunction, {
        iterations: 5,
        measureMemory: true
      })

      expect(result.memoryUsage).toBeDefined()
      expect(result.memoryUsage?.before).toBeDefined()
      expect(result.memoryUsage?.after).toBeDefined()
      expect(result.memoryUsage?.delta).toBeDefined()
    })

    it('should calculate statistics correctly', async () => {
      // Mock consistent timing
      let callCount = 0
      mockPerformanceNow.mockImplementation(() => {
        callCount++
        // Return predictable times: 0, 10, 20, 30, 40, 50 (differences: 10, 10, 10, 10, 10)
        return callCount * 10
      })

      const testFunction = jest.fn(() => { })

      const result = await benchmark.benchmark('Stats Test', testFunction, {
        iterations: 5,
        warmupIterations: 0
      })

      expect(result.averageTime).toBe(10) // All intervals are 10ms
      expect(result.minTime).toBe(10)
      expect(result.maxTime).toBe(10)
      expect(result.standardDeviation).toBe(0) // No variation
    })

    it('should compare benchmark results', async () => {
      const fastFunction = jest.fn(() => { })
      const slowFunction = jest.fn(() => { })

      // Mock different timings
      let callCount = 0
      mockPerformanceNow.mockImplementation(() => {
        callCount++
        if (callCount <= 20) { // First benchmark (fast)
          return callCount % 2 === 0 ? callCount * 5 : (callCount - 1) * 5 // 5ms intervals
        } else { // Second benchmark (slow)
          return callCount % 2 === 0 ? callCount * 10 : (callCount - 1) * 10 // 10ms intervals
        }
      })

      const fastResult = await benchmark.benchmark('Fast', fastFunction, {
        iterations: 5,
        warmupIterations: 0
      })

      const slowResult = await benchmark.benchmark('Slow', slowFunction, {
        iterations: 5,
        warmupIterations: 0
      })

      const comparison = benchmark.compare(fastResult, slowResult)

      expect(comparison.fasterResult).toBe(fastResult)
      expect(comparison.slowerResult).toBe(slowResult)
      expect(comparison.speedupFactor).toBeGreaterThan(1)
      expect(comparison.percentageImprovement).toBeGreaterThan(0)
    })

    it('should export results correctly', async () => {
      const testFunction = jest.fn(() => {})

      await benchmark.benchmark('Export Test', testFunction, {
        iterations: 3
      })

      const exported = benchmark.exportResults()
      const parsed = JSON.parse(exported)

      expect(parsed.results).toHaveLength(1)
      expect(parsed.results[0].name).toBe('Export Test')
      expect(parsed.exportedAt).toBeDefined()
      expect(parsed.userAgent).toBeDefined()
    })

    it('should generate performance report', async () => {
      const testFunction = jest.fn(() => {})

      await benchmark.benchmark('Report Test', testFunction, {
        iterations: 5
      })

      const report = benchmark.generateReport()

      expect(report).toContain('Performance Benchmark Report')
      expect(report).toContain('Report Test')
      expect(report).toContain('Average Time:')
      expect(report).toContain('Iterations: 5')
    })

    it('should clear results', async () => {
      const testFunction = jest.fn(() => {})

      await benchmark.benchmark('Clear Test', testFunction)

      expect(benchmark.getResults()).toHaveLength(1)

      benchmark.clearResults()

      expect(benchmark.getResults()).toHaveLength(0)
    })
  })

  describe('TranscriptAnalyticsBenchmarks', () => {
    it('should benchmark data processing operations', async () => {
      const results = await transcriptBenchmarks.benchmarkDataProcessing()

      expect(results).toHaveLength(3)
      expect(results[0].name).toBe('Data Transformation')
      expect(results[1].name).toBe('Data Filtering')
      expect(results[2].name).toBe('Data Aggregation')

      results.forEach(result => {
        expect(result.averageTime).toBeGreaterThan(0)
        expect(result.iterations).toBeGreaterThan(0)
      })
    })

    it('should benchmark prediction calculations', async () => {
      const results = await transcriptBenchmarks.benchmarkPredictionCalculations()

      expect(results).toHaveLength(2)
      expect(results[0].name).toBe('Linear Regression Calculation')
      expect(results[1].name).toBe('Moving Average Calculation')

      results.forEach(result => {
        expect(result.averageTime).toBeGreaterThan(0)
        expect(result.iterations).toBeGreaterThan(0)
      })
    })

    it('should benchmark component rendering', async () => {
      const results = await transcriptBenchmarks.benchmarkComponentRendering()

      expect(results).toHaveLength(2)
      expect(results[0].name).toBe('Chart Data Processing')
      expect(results[1].name).toBe('Form Validation')

      results.forEach(result => {
        expect(result.averageTime).toBeGreaterThan(0)
        expect(result.iterations).toBeGreaterThan(0)
      })
    })

    it('should benchmark API processing', async () => {
      const results = await transcriptBenchmarks.benchmarkAPIProcessing()

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('JSON Response Processing')
      expect(results[0].averageTime).toBeGreaterThan(0)
      expect(results[0].memoryUsage).toBeDefined()
    })

    it('should run all benchmarks', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { })

      const allResults = await transcriptBenchmarks.runAllBenchmarks()

      expect(allResults.dataProcessing).toHaveLength(3)
      expect(allResults.predictions).toHaveLength(2)
      expect(allResults.components).toHaveLength(2)
      expect(allResults.api).toHaveLength(1)

      expect(consoleSpy).toHaveBeenCalledWith('Running performance benchmarks...')
      expect(consoleSpy).toHaveBeenCalledWith('Benchmarks completed')

      consoleSpy.mockRestore()
    })

    it('should provide access to benchmark instance', () => {
      const benchmarkInstance = transcriptBenchmarks.getBenchmark()
      expect(benchmarkInstance).toBeInstanceOf(PerformanceBenchmark)
    })
  })

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      const baselineFunction = jest.fn(() => {})
      const regressionFunction = jest.fn(() => {})

      // Mock baseline timing (fast)
      let callCount = 0
      mockPerformanceNow.mockImplementation(() => {
        callCount++
        if (callCount <= 20) { // Baseline
          return callCount % 2 === 0 ? callCount * 2 : (callCount - 1) * 2 // 2ms intervals
        } else { // Regression
          return callCount % 2 === 0 ? callCount * 10 : (callCount - 1) * 10 // 10ms intervals
        }
      })

      const baselineResult = await benchmark.benchmark('Baseline', baselineFunction, {
        iterations: 5,
        warmupIterations: 0
      })

      const regressionResult = await benchmark.benchmark('Regression', regressionFunction, {
        iterations: 5,
        warmupIterations: 0
      })

      const comparison = benchmark.compare(baselineResult, regressionResult)

      // Should detect significant performance regression
      expect(comparison.percentageImprovement).toBeGreaterThan(50) // More than 50% slower
      expect(comparison.speedupFactor).toBeGreaterThan(2) // More than 2x slower
    })
  })

  describe('Memory Leak Detection', () => {
    it('should detect potential memory leaks', async () => {
      let memoryUsage = 1024 * 1024 * 10 // Start with 10MB

      // Mock increasing memory usage
      Object.defineProperty(global.performance, 'memory', {
        value: {
          get usedJSHeapSize() {
            return memoryUsage
          }
        },
        writable: true
      })

      const memoryLeakFunction = jest.fn(() => {
        // Simulate memory leak
        memoryUsage += 1024 * 1024 // Add 1MB each call
        new Array(1000).fill('data') // Don't return to match signature
      })

      const result = await benchmark.benchmark('Memory Leak Test', memoryLeakFunction, {
        iterations: 10,
        measureMemory: true
      })

      // Should detect significant memory increase
      expect(result.memoryUsage?.delta).toBeGreaterThan(1024 * 1024) // More than 1MB increase
    })
  })
})