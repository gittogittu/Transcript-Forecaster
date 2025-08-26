/**
 * Performance testing utilities for prediction algorithms and data loading
 */

export interface PerformanceMetrics {
  executionTime: number
  memoryUsage: number
  iterations: number
}

/**
 * Measure execution time of a function
 */
export const measureExecutionTime = async <T>(
  fn: () => Promise<T> | T,
  iterations: number = 1
): Promise<PerformanceMetrics> => {
  const startMemory = process.memoryUsage().heapUsed
  const startTime = performance.now()

  for (let i = 0; i < iterations; i++) {
    await fn()
  }

  const endTime = performance.now()
  const endMemory = process.memoryUsage().heapUsed

  return {
    executionTime: endTime - startTime,
    memoryUsage: endMemory - startMemory,
    iterations,
  }
}

/**
 * Test that a function executes within acceptable time limits
 */
export const expectExecutionTimeWithin = async <T>(
  fn: () => Promise<T> | T,
  maxTimeMs: number,
  iterations: number = 1
) => {
  const metrics = await measureExecutionTime(fn, iterations)
  const avgTime = metrics.executionTime / iterations
  
  expect(avgTime).toBeLessThanOrEqual(maxTimeMs)
  return metrics
}

/**
 * Test memory usage is within acceptable limits
 */
export const expectMemoryUsageWithin = async <T>(
  fn: () => Promise<T> | T,
  maxMemoryBytes: number,
  iterations: number = 1
) => {
  const metrics = await measureExecutionTime(fn, iterations)
  
  expect(metrics.memoryUsage).toBeLessThanOrEqual(maxMemoryBytes)
  return metrics
}

/**
 * Benchmark a function and return detailed metrics
 */
export const benchmark = async <T>(
  name: string,
  fn: () => Promise<T> | T,
  iterations: number = 100
): Promise<PerformanceMetrics & { name: string; avgTime: number }> => {
  console.log(`Benchmarking ${name} with ${iterations} iterations...`)
  
  const metrics = await measureExecutionTime(fn, iterations)
  const avgTime = metrics.executionTime / iterations
  
  console.log(`${name} Results:`)
  console.log(`  Total time: ${metrics.executionTime.toFixed(2)}ms`)
  console.log(`  Average time: ${avgTime.toFixed(2)}ms`)
  console.log(`  Memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`)
  
  return {
    ...metrics,
    name,
    avgTime,
  }
}

/**
 * Create mock data for performance testing
 */
export const createMockTranscriptData = (count: number) => {
  const clients = ['Client A', 'Client B', 'Client C', 'Client D', 'Client E']
  const data = []
  
  for (let i = 0; i < count; i++) {
    const date = new Date(2020, 0, 1)
    date.setMonth(date.getMonth() + i)
    
    data.push({
      id: String(i + 1),
      clientName: clients[i % clients.length],
      month: date.toISOString().slice(0, 7), // YYYY-MM format
      year: date.getFullYear(),
      transcriptCount: Math.floor(Math.random() * 500) + 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
  
  return data
}

/**
 * Test data loading performance
 */
export const testDataLoadingPerformance = async (
  loadFn: () => Promise<any>,
  expectedMaxTime: number = 1000
) => {
  const metrics = await expectExecutionTimeWithin(loadFn, expectedMaxTime)
  
  // Log performance metrics for monitoring
  console.log(`Data loading performance:`)
  console.log(`  Execution time: ${metrics.executionTime.toFixed(2)}ms`)
  console.log(`  Memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`)
  
  return metrics
}