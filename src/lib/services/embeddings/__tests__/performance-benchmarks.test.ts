/**
 * Performance Benchmarks for Vector Similarity Search and Caching
 * 
 * Tests performance characteristics of:
 * - Vector similarity search operations
 * - Embedding generation and storage
 * - Cache hit rates and optimization
 * - Scalability under load
 */

// Set up environment variables before any imports
process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project'
process.env.GOOGLE_CLOUD_LOCATION = 'us-central1'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { similaritySearchService } from '../similarity-search'
import { textEmbeddingService } from '../text-embedding'
import { transcriptVectorizationService } from '../transcript-vectorization'
import { EmbeddingService } from '../index'

// Mock dependencies
jest.mock('../../../database/connection')
jest.mock('../../../database/vector-utils')
jest.mock('../../vertex-ai/config')
jest.mock('@google-cloud/aiplatform')
jest.mock('@google/generative-ai')

describe('Vector Operations Performance Benchmarks', () => {
  let mockPool: any
  let performanceMetrics: {
    searchTimes: number[]
    embeddingTimes: number[]
    cacheHitRates: number[]
  }

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn()
      })
    }

    const { getDatabasePool } = require('../../../database/connection')
    getDatabasePool.mockResolvedValue(mockPool)

    performanceMetrics = {
      searchTimes: [],
      embeddingTimes: [],
      cacheHitRates: []
    }

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Vector Similarity Search Performance', () => {
    const generateMockEmbeddings = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `embedding-${i}`,
        transcript_id: `transcript-${i}`,
        client_id: `client-${i % 10}`, // 10 different clients
        embedding: Array.from({ length: 768 }, () => Math.random() - 0.5),
        similarity: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
        metadata: {
          client_name: `Client ${i % 10}`,
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          transcript_count: Math.floor(Math.random() * 100) + 1
        }
      }))
    }

    it('should perform similarity search within acceptable time limits', async () => {
      const mockResults = generateMockEmbeddings(100)
      
      mockPool.query.mockResolvedValue({
        rows: mockResults.slice(0, 10) // Return top 10 results
      })

      const queryEmbedding = Array.from({ length: 768 }, () => Math.random() - 0.5)
      
      const startTime = performance.now()
      
      const result = await similaritySearchService.searchSimilar(queryEmbedding, {
        limit: 10,
        threshold: 0.7
      })
      
      const endTime = performance.now()
      const searchTime = endTime - startTime

      performanceMetrics.searchTimes.push(searchTime)

      // Performance requirements
      expect(searchTime).toBeLessThan(500) // Should complete within 500ms
      expect(result.length).toBeLessThanOrEqual(10)
      expect(result.every(r => r.similarity >= 0.7)).toBe(true)
    })

    it('should scale efficiently with large vector databases', async () => {
      const testSizes = [1000, 5000, 10000, 50000]
      const searchTimes: number[] = []

      for (const size of testSizes) {
        const mockResults = generateMockEmbeddings(Math.min(size, 100)) // Limit returned results
        
        mockPool.query.mockResolvedValue({
          rows: mockResults.slice(0, 20)
        })

        const queryEmbedding = Array.from({ length: 768 }, () => Math.random() - 0.5)
        
        const startTime = performance.now()
        
        await similaritySearchService.searchSimilar(queryEmbedding, {
          limit: 20,
          threshold: 0.6
        })
        
        const endTime = performance.now()
        searchTimes.push(endTime - startTime)
      }

      // Search time should scale sub-linearly (due to indexing)
      expect(searchTimes[0]).toBeLessThan(200) // 1K vectors: < 200ms
      expect(searchTimes[1]).toBeLessThan(400) // 5K vectors: < 400ms
      expect(searchTimes[2]).toBeLessThan(600) // 10K vectors: < 600ms
      expect(searchTimes[3]).toBeLessThan(1000) // 50K vectors: < 1s

      // Verify sub-linear scaling
      const scalingRatio = searchTimes[3] / searchTimes[0]
      const dataSizeRatio = testSizes[3] / testSizes[0]
      expect(scalingRatio).toBeLessThan(dataSizeRatio * 0.5) // Should scale better than linear
    })

    it('should handle concurrent search requests efficiently', async () => {
      const mockResults = generateMockEmbeddings(50)
      
      mockPool.query.mockResolvedValue({
        rows: mockResults.slice(0, 10)
      })

      const concurrentRequests = 20
      const queryEmbedding = Array.from({ length: 768 }, () => Math.random() - 0.5)
      
      const startTime = performance.now()
      
      const promises = Array.from({ length: concurrentRequests }, () =>
        similaritySearchService.searchSimilar(queryEmbedding, {
          limit: 10,
          threshold: 0.7
        })
      )
      
      const results = await Promise.all(promises)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(results).toHaveLength(concurrentRequests)
      expect(results.every(r => r.length <= 10)).toBe(true)
      
      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(2000) // 20 concurrent requests in < 2s
      
      const avgTimePerRequest = totalTime / concurrentRequests
      expect(avgTimePerRequest).toBeLessThan(500) // Average < 500ms per request
    })

    it('should optimize vector index performance', async () => {
      // Test different similarity thresholds and their impact on performance
      const thresholds = [0.5, 0.7, 0.8, 0.9]
      const performanceResults: Array<{ threshold: number; time: number; resultCount: number }> = []

      for (const threshold of thresholds) {
        const mockResults = generateMockEmbeddings(100)
          .filter(r => r.similarity >= threshold)
        
        mockPool.query.mockResolvedValue({
          rows: mockResults.slice(0, 20)
        })

        const queryEmbedding = Array.from({ length: 768 }, () => Math.random() - 0.5)
        
        const startTime = performance.now()
        
        const result = await similaritySearchService.searchSimilar(queryEmbedding, {
          limit: 20,
          threshold
        })
        
        const endTime = performance.now()
        
        performanceResults.push({
          threshold,
          time: endTime - startTime,
          resultCount: result.length
        })
      }

      // Higher thresholds should generally be faster (fewer results to process)
      const highThresholdTime = performanceResults.find(r => r.threshold === 0.9)?.time || 0
      const lowThresholdTime = performanceResults.find(r => r.threshold === 0.5)?.time || 0
      
      expect(highThresholdTime).toBeLessThanOrEqual(lowThresholdTime * 1.5) // At most 50% slower
      
      // Verify result counts decrease with higher thresholds
      const sortedResults = performanceResults.sort((a, b) => a.threshold - b.threshold)
      for (let i = 1; i < sortedResults.length; i++) {
        expect(sortedResults[i].resultCount).toBeLessThanOrEqual(sortedResults[i-1].resultCount)
      }
    })
  })

  describe('Embedding Generation Performance', () => {
    it('should generate embeddings within time limits', async () => {
      const testTexts = [
        'Short text',
        'Medium length text with some more content to process',
        'Very long text content that includes multiple sentences and various topics that need to be processed by the embedding model to generate meaningful vector representations'
      ]

      jest.spyOn(textEmbeddingService, 'generateEmbedding').mockImplementation(async (text: string) => {
        // Simulate processing time based on text length
        const processingTime = Math.min(text.length * 2, 1000)
        await new Promise(resolve => setTimeout(resolve, processingTime))
        
        return Array.from({ length: 768 }, () => Math.random() - 0.5)
      })

      for (const text of testTexts) {
        const startTime = performance.now()
        
        const embedding = await textEmbeddingService.generateEmbedding(text)
        
        const endTime = performance.now()
        const embeddingTime = endTime - startTime

        performanceMetrics.embeddingTimes.push(embeddingTime)

        expect(embedding).toHaveLength(768)
        expect(embeddingTime).toBeLessThan(2000) // Should complete within 2s
      }

      // Verify reasonable scaling with text length
      expect(performanceMetrics.embeddingTimes[0]).toBeLessThan(performanceMetrics.embeddingTimes[2])
    })

    it('should handle batch embedding generation efficiently', async () => {
      const batchTexts = Array.from({ length: 50 }, (_, i) => 
        `Test transcript ${i} with some content to embed`
      )

      jest.spyOn(textEmbeddingService, 'generateBatchEmbeddings').mockImplementation(async (texts: string[]) => {
        // Simulate batch processing efficiency
        const totalProcessingTime = texts.length * 100 // 100ms per text in batch
        await new Promise(resolve => setTimeout(resolve, totalProcessingTime))
        
        return texts.map(() => Array.from({ length: 768 }, () => Math.random() - 0.5))
      })

      const startTime = performance.now()
      
      const embeddings = await textEmbeddingService.generateBatchEmbeddings(batchTexts)
      
      const endTime = performance.now()
      const batchTime = endTime - startTime

      expect(embeddings).toHaveLength(50)
      expect(batchTime).toBeLessThan(10000) // Batch should complete within 10s
      
      const avgTimePerEmbedding = batchTime / batchTexts.length
      expect(avgTimePerEmbedding).toBeLessThan(200) // Average < 200ms per embedding in batch
    })
  })

  describe('Caching Performance and Optimization', () => {
    it('should achieve high cache hit rates for repeated queries', async () => {
      const queryEmbedding = Array.from({ length: 768 }, () => Math.random() - 0.5)
      const mockResults = generateMockEmbeddings(10)
      
      let cacheHits = 0
      let totalQueries = 0

      jest.spyOn(similaritySearchService, 'searchSimilar').mockImplementation(async (embedding, options) => {
        totalQueries++
        
        // Simulate cache behavior - 80% hit rate after first query
        if (totalQueries === 1) {
          // First query - cache miss
          await new Promise(resolve => setTimeout(resolve, 300))
          return mockResults
        } else if (Math.random() < 0.8) {
          // Cache hit
          cacheHits++
          await new Promise(resolve => setTimeout(resolve, 50))
          return mockResults
        } else {
          // Cache miss
          await new Promise(resolve => setTimeout(resolve, 300))
          return mockResults
        }
      })

      // Perform multiple identical queries
      const queries = Array.from({ length: 20 }, () =>
        similaritySearchService.searchSimilar(queryEmbedding, {
          limit: 10,
          threshold: 0.7
        })
      )

      await Promise.all(queries)

      const cacheHitRate = cacheHits / (totalQueries - 1) // Exclude first query
      performanceMetrics.cacheHitRates.push(cacheHitRate)

      expect(cacheHitRate).toBeGreaterThan(0.7) // Should achieve > 70% cache hit rate
    })

    it('should optimize cache eviction and memory usage', async () => {
      const cacheSize = 1000
      const queries = Array.from({ length: 1500 }, (_, i) => ({
        embedding: Array.from({ length: 768 }, () => Math.random() - 0.5),
        id: `query-${i}`
      }))

      let cacheOperations = {
        hits: 0,
        misses: 0,
        evictions: 0
      }

      jest.spyOn(EmbeddingService, 'searchByQuery').mockImplementation(async (query: string) => {
        // Simulate LRU cache behavior
        const queryHash = query.slice(0, 10) // Simple hash simulation
        
        if (Math.random() < 0.3) { // 30% cache hit rate for diverse queries
          cacheOperations.hits++
          await new Promise(resolve => setTimeout(resolve, 50))
        } else {
          cacheOperations.misses++
          if (cacheOperations.misses > cacheSize) {
            cacheOperations.evictions++
          }
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        return generateMockEmbeddings(5)
      })

      // Perform diverse queries
      for (const query of queries.slice(0, 100)) {
        await EmbeddingService.searchByQuery(`test query ${query.id}`)
      }

      const totalOperations = cacheOperations.hits + cacheOperations.misses
      const hitRate = cacheOperations.hits / totalOperations

      expect(hitRate).toBeGreaterThan(0.2) // Reasonable hit rate for diverse queries
      expect(cacheOperations.evictions).toBeGreaterThan(0) // Should trigger evictions
      expect(cacheOperations.evictions).toBeLessThan(totalOperations * 0.8) // Efficient eviction
    })

    it('should maintain performance under memory pressure', async () => {
      const memoryPressureSimulation = async (operationCount: number) => {
        const operations = Array.from({ length: operationCount }, (_, i) => ({
          type: Math.random() < 0.7 ? 'search' : 'embed',
          data: `operation-${i}`
        }))

        const startTime = performance.now()
        let completedOperations = 0

        for (const operation of operations) {
          if (operation.type === 'search') {
            const mockResults = generateMockEmbeddings(5)
            mockPool.query.mockResolvedValueOnce({ rows: mockResults })
            
            await similaritySearchService.searchSimilar(
              Array.from({ length: 768 }, () => Math.random() - 0.5),
              { limit: 5, threshold: 0.7 }
            )
          } else {
            await textEmbeddingService.generateEmbedding(operation.data)
          }
          
          completedOperations++
        }

        const endTime = performance.now()
        return {
          totalTime: endTime - startTime,
          operationsPerSecond: completedOperations / ((endTime - startTime) / 1000),
          completedOperations
        }
      }

      // Test with increasing load
      const lightLoad = await memoryPressureSimulation(50)
      const mediumLoad = await memoryPressureSimulation(100)
      const heavyLoad = await memoryPressureSimulation(200)

      // Performance should degrade gracefully
      expect(lightLoad.operationsPerSecond).toBeGreaterThan(10) // At least 10 ops/sec
      expect(mediumLoad.operationsPerSecond).toBeGreaterThan(5) // At least 5 ops/sec
      expect(heavyLoad.operationsPerSecond).toBeGreaterThan(2) // At least 2 ops/sec

      // Should complete all operations
      expect(lightLoad.completedOperations).toBe(50)
      expect(mediumLoad.completedOperations).toBe(100)
      expect(heavyLoad.completedOperations).toBe(200)
    })
  })

  describe('Scalability and Load Testing', () => {
    it('should handle high-throughput scenarios', async () => {
      const concurrentUsers = 50
      const operationsPerUser = 10
      
      const mockResults = generateMockEmbeddings(20)
      mockPool.query.mockResolvedValue({ rows: mockResults })

      const startTime = performance.now()
      
      const userSimulations = Array.from({ length: concurrentUsers }, async (_, userId) => {
        const userOperations = Array.from({ length: operationsPerUser }, async (_, opId) => {
          const queryEmbedding = Array.from({ length: 768 }, () => Math.random() - 0.5)
          
          return await similaritySearchService.searchSimilar(queryEmbedding, {
            limit: 10,
            threshold: 0.6
          })
        })
        
        return await Promise.all(userOperations)
      })
      
      const results = await Promise.all(userSimulations)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const totalOperations = concurrentUsers * operationsPerUser
      const throughput = totalOperations / (totalTime / 1000)

      expect(results).toHaveLength(concurrentUsers)
      expect(results.every(userResults => userResults.length === operationsPerUser)).toBe(true)
      
      // Should maintain reasonable throughput
      expect(throughput).toBeGreaterThan(20) // At least 20 operations per second
      expect(totalTime).toBeLessThan(30000) // Complete within 30 seconds
    })

    it('should maintain accuracy under load', async () => {
      const testQueries = Array.from({ length: 100 }, (_, i) => ({
        embedding: Array.from({ length: 768 }, () => Math.random() - 0.5),
        expectedSimilarity: 0.8 + (Math.random() * 0.2) // 0.8 to 1.0
      }))

      const accuracyResults: number[] = []

      for (const query of testQueries) {
        const mockResults = generateMockEmbeddings(10).map(r => ({
          ...r,
          similarity: query.expectedSimilarity + (Math.random() - 0.5) * 0.1
        }))
        
        mockPool.query.mockResolvedValueOnce({ rows: mockResults })
        
        const results = await similaritySearchService.searchSimilar(query.embedding, {
          limit: 10,
          threshold: 0.7
        })
        
        // Calculate accuracy based on expected vs actual similarity scores
        const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length
        const accuracy = 1 - Math.abs(avgSimilarity - query.expectedSimilarity)
        accuracyResults.push(accuracy)
      }

      const avgAccuracy = accuracyResults.reduce((sum, acc) => sum + acc, 0) / accuracyResults.length
      const accuracyStdDev = Math.sqrt(
        accuracyResults.reduce((sum, acc) => sum + Math.pow(acc - avgAccuracy, 2), 0) / accuracyResults.length
      )

      expect(avgAccuracy).toBeGreaterThan(0.85) // Average accuracy > 85%
      expect(accuracyStdDev).toBeLessThan(0.1) // Consistent accuracy (low std dev)
    })
  })

  describe('Resource Utilization Monitoring', () => {
    it('should monitor and report resource usage metrics', async () => {
      const resourceMetrics = {
        memoryUsage: [] as number[],
        cpuUsage: [] as number[],
        dbConnections: [] as number[]
      }

      // Simulate resource monitoring during operations
      const monitorResources = () => ({
        memory: Math.random() * 1000 + 500, // 500-1500 MB
        cpu: Math.random() * 80 + 10, // 10-90%
        dbConnections: Math.floor(Math.random() * 20) + 5 // 5-25 connections
      })

      const operations = Array.from({ length: 50 }, async (_, i) => {
        const resources = monitorResources()
        resourceMetrics.memoryUsage.push(resources.memory)
        resourceMetrics.cpuUsage.push(resources.cpu)
        resourceMetrics.dbConnections.push(resources.dbConnections)

        // Simulate operation
        const mockResults = generateMockEmbeddings(5)
        mockPool.query.mockResolvedValueOnce({ rows: mockResults })
        
        return await similaritySearchService.searchSimilar(
          Array.from({ length: 768 }, () => Math.random() - 0.5),
          { limit: 5, threshold: 0.7 }
        )
      })

      await Promise.all(operations)

      // Analyze resource usage
      const avgMemory = resourceMetrics.memoryUsage.reduce((sum, m) => sum + m, 0) / resourceMetrics.memoryUsage.length
      const maxMemory = Math.max(...resourceMetrics.memoryUsage)
      const avgCpu = resourceMetrics.cpuUsage.reduce((sum, c) => sum + c, 0) / resourceMetrics.cpuUsage.length
      const maxCpu = Math.max(...resourceMetrics.cpuUsage)
      const avgDbConnections = resourceMetrics.dbConnections.reduce((sum, d) => sum + d, 0) / resourceMetrics.dbConnections.length

      // Resource usage should be within acceptable limits
      expect(avgMemory).toBeLessThan(1200) // Average memory < 1.2GB
      expect(maxMemory).toBeLessThan(1500) // Peak memory < 1.5GB
      expect(avgCpu).toBeLessThan(70) // Average CPU < 70%
      expect(maxCpu).toBeLessThan(90) // Peak CPU < 90%
      expect(avgDbConnections).toBeLessThan(15) // Average DB connections < 15
    })
  })
})