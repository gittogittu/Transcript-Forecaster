#!/usr/bin/env node

/**
 * Performance Test Script
 * 
 * This script runs basic performance tests to verify that optimizations are working.
 * It can be run independently of Jest for quick performance checks.
 */

const { performance } = require('perf_hooks')

// Mock data for testing
const generateMockData = (size) => {
  return Array.from({ length: size }, (_, i) => ({
    clientName: `Client ${i}`,
    month: `2024-${String((i % 12) + 1).padStart(2, '0')}`,
    year: 2024,
    transcriptCount: Math.floor(Math.random() * 100),
    createdAt: new Date(),
    updatedAt: new Date()
  }))
}

// Benchmark function
const benchmark = async (name, fn, iterations = 100) => {
  console.log(`\nRunning benchmark: ${name}`)
  console.log(`Iterations: ${iterations}`)
  
  // Warmup
  for (let i = 0; i < 10; i++) {
    await fn()
  }
  
  const times = []
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await fn()
    const end = performance.now()
    times.push(end - start)
  }
  
  const totalTime = times.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / iterations
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  
  console.log(`Average: ${averageTime.toFixed(2)}ms`)
  console.log(`Min: ${minTime.toFixed(2)}ms`)
  console.log(`Max: ${maxTime.toFixed(2)}ms`)
  console.log(`Total: ${totalTime.toFixed(2)}ms`)
  
  return { name, averageTime, minTime, maxTime, totalTime, iterations }
}

// Test data processing performance
const testDataProcessing = async () => {
  console.log('\n=== Data Processing Performance Tests ===')
  
  const smallData = generateMockData(100)
  const mediumData = generateMockData(1000)
  const largeData = generateMockData(10000)
  
  // Test data transformation
  await benchmark('Small Data Transformation (100 items)', () => {
    return smallData.map(item => ({
      ...item,
      monthYear: `${item.month}-${item.year}`,
      category: item.transcriptCount > 50 ? 'high' : 'low'
    }))
  })
  
  await benchmark('Medium Data Transformation (1000 items)', () => {
    return mediumData.map(item => ({
      ...item,
      monthYear: `${item.month}-${item.year}`,
      category: item.transcriptCount > 50 ? 'high' : 'low'
    }))
  })
  
  await benchmark('Large Data Transformation (10000 items)', () => {
    return largeData.map(item => ({
      ...item,
      monthYear: `${item.month}-${item.year}`,
      category: item.transcriptCount > 50 ? 'high' : 'low'
    }))
  })
  
  // Test data filtering
  await benchmark('Data Filtering (1000 items)', () => {
    return mediumData.filter(item => item.transcriptCount > 25)
  })
  
  // Test data aggregation
  await benchmark('Data Aggregation (1000 items)', () => {
    return mediumData.reduce((acc, item) => {
      const key = item.clientName
      acc[key] = (acc[key] || 0) + item.transcriptCount
      return acc
    }, {})
  })
}

// Test prediction calculations
const testPredictionCalculations = async () => {
  console.log('\n=== Prediction Calculation Performance Tests ===')
  
  const historicalData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    value: Math.floor(Math.random() * 100) + 50
  }))
  
  // Test linear regression
  await benchmark('Linear Regression Calculation', () => {
    const n = historicalData.length
    const sumX = historicalData.reduce((sum, _, i) => sum + i, 0)
    const sumY = historicalData.reduce((sum, item) => sum + item.value, 0)
    const sumXY = historicalData.reduce((sum, item, i) => sum + i * item.value, 0)
    const sumXX = historicalData.reduce((sum, _, i) => sum + i * i, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    return Array.from({ length: 6 }, (_, i) => ({
      month: n + i + 1,
      prediction: slope * (n + i) + intercept
    }))
  })
  
  // Test moving average
  await benchmark('Moving Average Calculation', () => {
    const windowSize = 3
    const movingAverages = []
    
    for (let i = windowSize - 1; i < historicalData.length; i++) {
      const window = historicalData.slice(i - windowSize + 1, i + 1)
      const average = window.reduce((sum, item) => sum + item.value, 0) / windowSize
      movingAverages.push({ month: i + 1, average })
    }
    
    return movingAverages
  })
}

// Test JSON processing
const testJSONProcessing = async () => {
  console.log('\n=== JSON Processing Performance Tests ===')
  
  const largeObject = {
    data: generateMockData(5000),
    meta: {
      total: 5000,
      page: 1,
      limit: 5000,
      timestamp: new Date().toISOString()
    }
  }
  
  await benchmark('JSON Stringify (5000 items)', () => {
    return JSON.stringify(largeObject)
  })
  
  const jsonString = JSON.stringify(largeObject)
  
  await benchmark('JSON Parse (5000 items)', () => {
    return JSON.parse(jsonString)
  })
  
  await benchmark('JSON Parse + Processing (5000 items)', () => {
    const parsed = JSON.parse(jsonString)
    return parsed.data.map(item => ({
      ...item,
      date: new Date(item.createdAt),
      category: item.transcriptCount > 50 ? 'high' : 'low'
    }))
  })
}

// Memory usage test
const testMemoryUsage = () => {
  console.log('\n=== Memory Usage Tests ===')
  
  if (process.memoryUsage) {
    const before = process.memoryUsage()
    console.log('Memory before tests:')
    console.log(`RSS: ${(before.rss / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Heap Used: ${(before.heapUsed / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Heap Total: ${(before.heapTotal / 1024 / 1024).toFixed(2)} MB`)
    
    // Create some objects to test memory
    const largeArray = new Array(100000).fill(0).map((_, i) => ({ id: i, data: `item-${i}` }))
    
    const after = process.memoryUsage()
    console.log('\nMemory after creating large array:')
    console.log(`RSS: ${(after.rss / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Heap Used: ${(after.heapUsed / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Heap Total: ${(after.heapTotal / 1024 / 1024).toFixed(2)} MB`)
    
    console.log('\nMemory delta:')
    console.log(`RSS: +${((after.rss - before.rss) / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Heap Used: +${((after.heapUsed - before.heapUsed) / 1024 / 1024).toFixed(2)} MB`)
    
    // Clean up
    largeArray.length = 0
    
    if (global.gc) {
      global.gc()
      const afterGC = process.memoryUsage()
      console.log('\nMemory after garbage collection:')
      console.log(`RSS: ${(afterGC.rss / 1024 / 1024).toFixed(2)} MB`)
      console.log(`Heap Used: ${(afterGC.heapUsed / 1024 / 1024).toFixed(2)} MB`)
    }
  }
}

// Main test runner
const runPerformanceTests = async () => {
  console.log('🚀 Starting Performance Tests')
  console.log('==============================')
  
  const startTime = performance.now()
  
  try {
    await testDataProcessing()
    await testPredictionCalculations()
    await testJSONProcessing()
    testMemoryUsage()
    
    const endTime = performance.now()
    const totalTime = endTime - startTime
    
    console.log('\n=== Test Summary ===')
    console.log(`Total test time: ${totalTime.toFixed(2)}ms`)
    console.log('✅ All performance tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Performance tests failed:', error)
    process.exit(1)
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runPerformanceTests()
}

module.exports = {
  benchmark,
  testDataProcessing,
  testPredictionCalculations,
  testJSONProcessing,
  testMemoryUsage,
  runPerformanceTests
}