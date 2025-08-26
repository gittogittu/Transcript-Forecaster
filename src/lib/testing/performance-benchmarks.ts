// Performance benchmarking utilities
export interface BenchmarkResult {
  name: string
  duration: number
  iterations: number
  averageTime: number
  minTime: number
  maxTime: number
  standardDeviation: number
  memoryUsage?: {
    before: number
    after: number
    delta: number
  }
}

export class PerformanceBenchmark {
  private results: BenchmarkResult[] = []

  // Run a benchmark test
  async benchmark(
    name: string,
    testFn: () => void | Promise<void>,
    options: {
      iterations?: number
      warmupIterations?: number
      measureMemory?: boolean
    } = {}
  ): Promise<BenchmarkResult> {
    const {
      iterations = 100,
      warmupIterations = 10,
      measureMemory = false
    } = options

    // Warmup runs
    for (let i = 0; i < warmupIterations; i++) {
      await testFn()
    }

    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc()
    }

    const times: number[] = []
    let memoryBefore = 0
    let memoryAfter = 0

    // Measure memory before if requested
    if (measureMemory && typeof window !== 'undefined' && (performance as any).memory) {
      memoryBefore = (performance as any).memory.usedJSHeapSize
    }

    // Run benchmark iterations
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      await testFn()
      const endTime = performance.now()
      times.push(endTime - startTime)
    }

    // Measure memory after if requested
    if (measureMemory && typeof window !== 'undefined' && (performance as any).memory) {
      memoryAfter = (performance as any).memory.usedJSHeapSize
    }

    // Calculate statistics
    const totalTime = times.reduce((sum, time) => sum + time, 0)
    const averageTime = totalTime / iterations
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    
    // Calculate standard deviation
    const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / iterations
    const standardDeviation = Math.sqrt(variance)

    const result: BenchmarkResult = {
      name,
      duration: totalTime,
      iterations,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      ...(measureMemory && {
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          delta: memoryAfter - memoryBefore
        }
      })
    }

    this.results.push(result)
    return result
  }

  // Compare two benchmark results
  compare(result1: BenchmarkResult, result2: BenchmarkResult): {
    fasterResult: BenchmarkResult
    slowerResult: BenchmarkResult
    speedupFactor: number
    percentageImprovement: number
  } {
    const faster = result1.averageTime < result2.averageTime ? result1 : result2
    const slower = result1.averageTime >= result2.averageTime ? result1 : result2
    
    const speedupFactor = slower.averageTime / faster.averageTime
    const percentageImprovement = ((slower.averageTime - faster.averageTime) / slower.averageTime) * 100

    return {
      fasterResult: faster,
      slowerResult: slower,
      speedupFactor,
      percentageImprovement
    }
  }

  // Get all benchmark results
  getResults(): BenchmarkResult[] {
    return [...this.results]
  }

  // Clear all results
  clearResults(): void {
    this.results = []
  }

  // Export results as JSON
  exportResults(): string {
    return JSON.stringify({
      results: this.results,
      exportedAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'
    }, null, 2)
  }

  // Generate performance report
  generateReport(): string {
    if (this.results.length === 0) {
      return 'No benchmark results available'
    }

    let report = 'Performance Benchmark Report\n'
    report += '================================\n\n'

    this.results.forEach((result, index) => {
      report += `${index + 1}. ${result.name}\n`
      report += `   Average Time: ${result.averageTime.toFixed(2)}ms\n`
      report += `   Min Time: ${result.minTime.toFixed(2)}ms\n`
      report += `   Max Time: ${result.maxTime.toFixed(2)}ms\n`
      report += `   Standard Deviation: ${result.standardDeviation.toFixed(2)}ms\n`
      report += `   Iterations: ${result.iterations}\n`
      
      if (result.memoryUsage) {
        report += `   Memory Delta: ${(result.memoryUsage.delta / 1024 / 1024).toFixed(2)}MB\n`
      }
      
      report += '\n'
    })

    return report
  }
}

// Specific benchmark tests for the application
export class TranscriptAnalyticsBenchmarks {
  private benchmark = new PerformanceBenchmark()

  // Benchmark data processing functions
  async benchmarkDataProcessing(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []

    // Mock data for testing
    const mockData = Array.from({ length: 1000 }, (_, i) => ({
      clientName: `Client ${i}`,
      month: `2024-${String((i % 12) + 1).padStart(2, '0')}`,
      year: 2024,
      transcriptCount: Math.floor(Math.random() * 100),
      createdAt: new Date(),
      updatedAt: new Date()
    }))

    // Benchmark data transformation
    results.push(await this.benchmark.benchmark(
      'Data Transformation',
      () => {
        const transformed = mockData.map(item => ({
          ...item,
          monthYear: `${item.month}-${item.year}`,
          category: item.transcriptCount > 50 ? 'high' : 'low'
        }))
        return transformed
      },
      { iterations: 1000, measureMemory: true }
    ))

    // Benchmark data filtering
    results.push(await this.benchmark.benchmark(
      'Data Filtering',
      () => {
        const filtered = mockData.filter(item => item.transcriptCount > 25)
        return filtered
      },
      { iterations: 1000 }
    ))

    // Benchmark data aggregation
    results.push(await this.benchmark.benchmark(
      'Data Aggregation',
      () => {
        const aggregated = mockData.reduce((acc, item) => {
          const key = item.clientName
          acc[key] = (acc[key] || 0) + item.transcriptCount
          return acc
        }, {} as Record<string, number>)
        return aggregated
      },
      { iterations: 1000 }
    ))

    return results
  }

  // Benchmark prediction calculations
  async benchmarkPredictionCalculations(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []

    // Mock historical data
    const historicalData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      value: Math.floor(Math.random() * 100) + 50
    }))

    // Benchmark linear regression
    results.push(await this.benchmark.benchmark(
      'Linear Regression Calculation',
      () => {
        // Simple linear regression implementation
        const n = historicalData.length
        const sumX = historicalData.reduce((sum, _, i) => sum + i, 0)
        const sumY = historicalData.reduce((sum, item) => sum + item.value, 0)
        const sumXY = historicalData.reduce((sum, item, i) => sum + i * item.value, 0)
        const sumXX = historicalData.reduce((sum, _, i) => sum + i * i, 0)
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
        const intercept = (sumY - slope * sumX) / n
        
        // Generate predictions
        const predictions = Array.from({ length: 6 }, (_, i) => ({
          month: n + i + 1,
          prediction: slope * (n + i) + intercept
        }))
        
        return predictions
      },
      { iterations: 500, measureMemory: true }
    ))

    // Benchmark moving average calculation
    results.push(await this.benchmark.benchmark(
      'Moving Average Calculation',
      () => {
        const windowSize = 3
        const movingAverages = []
        
        for (let i = windowSize - 1; i < historicalData.length; i++) {
          const window = historicalData.slice(i - windowSize + 1, i + 1)
          const average = window.reduce((sum, item) => sum + item.value, 0) / windowSize
          movingAverages.push({ month: i + 1, average })
        }
        
        return movingAverages
      },
      { iterations: 1000 }
    ))

    return results
  }

  // Benchmark component rendering
  async benchmarkComponentRendering(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []

    // Mock React component rendering simulation
    const mockProps = {
      data: Array.from({ length: 100 }, (_, i) => ({ x: i, y: Math.random() * 100 })),
      width: 800,
      height: 400
    }

    // Benchmark chart data processing
    results.push(await this.benchmark.benchmark(
      'Chart Data Processing',
      () => {
        // Simulate chart data processing
        const processedData = mockProps.data.map(point => ({
          ...point,
          scaledX: (point.x / 100) * mockProps.width,
          scaledY: (point.y / 100) * mockProps.height
        }))
        return processedData
      },
      { iterations: 500 }
    ))

    // Benchmark form validation
    results.push(await this.benchmark.benchmark(
      'Form Validation',
      () => {
        const formData = {
          clientName: 'Test Client',
          month: '2024-01',
          transcriptCount: 50
        }
        
        // Simulate validation logic
        const errors: string[] = []
        if (!formData.clientName) errors.push('Client name required')
        if (!formData.month) errors.push('Month required')
        if (formData.transcriptCount < 0) errors.push('Count must be positive')
        
        return { isValid: errors.length === 0, errors }
      },
      { iterations: 2000 }
    ))

    return results
  }

  // Benchmark API response processing
  async benchmarkAPIProcessing(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []

    // Mock API response
    const mockAPIResponse = {
      data: Array.from({ length: 500 }, (_, i) => ({
        id: i,
        clientName: `Client ${i}`,
        transcriptCount: Math.floor(Math.random() * 100),
        timestamp: new Date().toISOString()
      })),
      meta: {
        total: 500,
        page: 1,
        limit: 500
      }
    }

    // Benchmark JSON parsing simulation
    results.push(await this.benchmark.benchmark(
      'JSON Response Processing',
      () => {
        const jsonString = JSON.stringify(mockAPIResponse)
        const parsed = JSON.parse(jsonString)
        
        // Process the data
        const processed = parsed.data.map((item: any) => ({
          ...item,
          date: new Date(item.timestamp),
          category: item.transcriptCount > 50 ? 'high' : 'low'
        }))
        
        return processed
      },
      { iterations: 200, measureMemory: true }
    ))

    return results
  }

  // Run all benchmarks
  async runAllBenchmarks(): Promise<{
    dataProcessing: BenchmarkResult[]
    predictions: BenchmarkResult[]
    components: BenchmarkResult[]
    api: BenchmarkResult[]
  }> {
    console.log('Running performance benchmarks...')
    
    const dataProcessing = await this.benchmarkDataProcessing()
    const predictions = await this.benchmarkPredictionCalculations()
    const components = await this.benchmarkComponentRendering()
    const api = await this.benchmarkAPIProcessing()
    
    console.log('Benchmarks completed')
    
    return {
      dataProcessing,
      predictions,
      components,
      api
    }
  }

  // Get benchmark instance for custom tests
  getBenchmark(): PerformanceBenchmark {
    return this.benchmark
  }
}

// Export singleton instance
export const transcriptBenchmarks = new TranscriptAnalyticsBenchmarks()