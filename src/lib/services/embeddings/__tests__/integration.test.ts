/**
 * Integration Tests for Vector Embedding System
 * 
 * These tests verify the complete embedding pipeline:
 * - End-to-end vectorization workflow
 * - Similarity search accuracy
 * - Performance characteristics
 * - Error handling and recovery
 */

import { EmbeddingService } from '../index'
import { textEmbeddingService } from '../text-embedding'
import { transcriptVectorizationService } from '../transcript-vectorization'
import { similaritySearchService } from '../similarity-search'
import { vectorUtils } from '../../../database/vector-utils'

// Mock external dependencies
jest.mock('@google-cloud/vertexai')
jest.mock('../../vertex-ai/config')
jest.mock('../../../database/connection')
jest.mock('../../../database/vector-utils')

describe('Vector Embedding System Integration', () => {
  let mockPool: any

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

    jest.clearAllMocks()
  })

  describe('End-to-End Vectorization Workflow', () => {
    const mockTranscriptData = {
      id: 'transcript-1',
      clientId: 'client-1',
      clientName: 'Acme Corp',
      date: '2024-01-15',
      transcriptCount: 25,
      notes: 'Important quarterly meeting with key stakeholders'
    }

    const mockEmbedding = new Array(768).fill(0).map((_, i) => Math.sin(i * 0.1))

    beforeEach(() => {
      // Mock successful embedding generation
      jest.spyOn(textEmbeddingService, 'generateTranscriptEmbedding').mockResolvedValue({
        embedding: mockEmbedding,
        model: 'text-embedding-004',
        dimensions: 768,
        tokenCount: 15
      })

      // Mock database operations
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // no existing embedding
        .mockResolvedValueOnce({ rows: [mockTranscriptData] }) // transcript data
        .mockResolvedValueOnce({ rows: [] }) // delete existing
        .mockResolvedValueOnce({ rows: [{ id: 'embedding-1' }] }) // insert new
    })

    it('should complete full vectorization workflow', async () => {
      const result = await EmbeddingService.vectorizeTranscript('transcript-1')

      expect(result).toMatchObject({
        transcriptId: 'transcript-1',
        embeddingId: 'embedding-1',
        success: true,
        dimensions: 768,
        processingTime: expect.any(Number)
      })

      // Verify embedding generation was called with correct data
      expect(textEmbeddingService.generateTranscriptEmbedding).toHaveBeenCalledWith({
        clientName: 'Acme Corp',
        date: '2024-01-15',
        count: 25,
        notes: 'Important quarterly meeting with key stakeholders'
      })

      // Verify database storage
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transcript_embeddings'),
        expect.arrayContaining([
          'transcript-1',
          expect.stringContaining('['), // vector string
          'text-embedding-004',
          expect.any(String) // metadata JSON
        ])
      )
    })

    it('should handle batch vectorization efficiently', async () => {
      const transcriptIds = ['transcript-1', 'transcript-2', 'transcript-3']

      // Mock batch operations
      jest.spyOn(transcriptVectorizationService, 'vectorizeTranscript')
        .mockImplementation(async ({ transcriptId }) => ({
          transcriptId,
          embeddingId: `embedding-${transcriptId}`,
          success: true,
          dimensions: 768,
          processingTime: 100
        }))

      const result = await transcriptVectorizationService.batchVectorizeTranscripts({
        transcriptIds,
        batchSize: 2
      })

      expect(result).toMatchObject({
        totalProcessed: 3,
        successCount: 3,
        errorCount: 0,
        averageProcessingTime: 100
      })

      // Verify all transcripts were processed
      expect(transcriptVectorizationService.vectorizeTranscript).toHaveBeenCalledTimes(3)
    })
  })

  describe('Similarity Search Accuracy', () => {
    const mockEmbeddings = {
      'transcript-1': new Array(768).fill(0).map((_, i) => Math.sin(i * 0.1)), // Base pattern
      'transcript-2': new Array(768).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.1)), // Similar pattern
      'transcript-3': new Array(768).fill(0).map((_, i) => Math.cos(i * 0.2)), // Different pattern
    }

    const mockSearchResults = [
      {
        transcript_id: 'transcript-2',
        client_id: 'client-2',
        client_name: 'Beta Corp',
        date: '2024-01-16',
        transcript_count: 28,
        notes: 'Similar meeting context',
        similarity: 0.92,
        distance: 0.08
      },
      {
        transcript_id: 'transcript-3',
        client_id: 'client-3',
        client_name: 'Gamma Inc',
        date: '2024-01-17',
        transcript_count: 15,
        notes: 'Different context',
        similarity: 0.65,
        distance: 0.35
      }
    ]

    beforeEach(() => {
      // Mock embedding retrieval
      mockPool.query
        .mockResolvedValueOnce({ 
          rows: [{ embedding: `[${mockEmbeddings['transcript-1'].join(',')}]` }] 
        })
        .mockResolvedValueOnce({ rows: mockSearchResults })

      // Mock query embedding generation
      jest.spyOn(textEmbeddingService, 'generateQueryEmbedding').mockResolvedValue({
        embedding: mockEmbeddings['transcript-1'],
        model: 'text-embedding-004',
        dimensions: 768
      })
    })

    it('should find similar transcripts with high accuracy', async () => {
      const result = await EmbeddingService.findSimilarTranscripts('transcript-1', {
        limit: 5,
        threshold: 0.7
      })

      expect(result).toHaveLength(2)
      
      // Results should be ordered by similarity
      expect(result[0].similarity).toBeGreaterThan(result[1].similarity)
      expect(result[0].similarity).toBe(0.92)
      expect(result[1].similarity).toBe(0.65)

      // High similarity result should be more relevant
      expect(result[0]).toMatchObject({
        transcriptId: 'transcript-2',
        clientName: 'Beta Corp',
        transcriptCount: 28
      })
    })

    it('should perform semantic search with natural language queries', async () => {
      mockPool.query.mockResolvedValue({ rows: mockSearchResults })

      const result = await EmbeddingService.searchByQuery('quarterly meetings with stakeholders', {
        limit: 10,
        threshold: 0.6
      })

      expect(result).toHaveLength(2)
      expect(textEmbeddingService.generateQueryEmbedding).toHaveBeenCalledWith(
        'quarterly meetings with stakeholders'
      )

      // Should include metadata
      expect(result[0]).toHaveProperty('metadata')
    })

    it('should filter results by similarity threshold', async () => {
      const result = await EmbeddingService.searchByQuery('test query', {
        threshold: 0.8 // Higher threshold
      })

      // Only transcript-2 with 0.92 similarity should pass
      expect(result).toHaveLength(1)
      expect(result[0].similarity).toBeGreaterThanOrEqual(0.8)
    })
  })

  describe('Pattern Discovery and Clustering', () => {
    const mockClusterData = [
      {
        transcript_id: 'transcript-1',
        client_id: 'client-1',
        embedding: `[${new Array(768).fill(0.1).join(',')}]`
      },
      {
        transcript_id: 'transcript-2',
        client_id: 'client-2',
        embedding: `[${new Array(768).fill(0.2).join(',')}]`
      },
      {
        transcript_id: 'transcript-3',
        client_id: 'client-3',
        embedding: `[${new Array(768).fill(0.3).join(',')}]`
      }
    ]

    beforeEach(() => {
      mockPool.query.mockResolvedValue({ rows: mockClusterData })
    })

    it('should discover meaningful patterns', async () => {
      // Mock pattern search
      jest.spyOn(similaritySearchService, 'searchPatterns').mockResolvedValue([
        {
          patternId: 'pattern-1',
          sourceClientId: 'client-1',
          sourceClientName: 'Client 1',
          matchingTranscripts: [
            {
              transcriptId: 'transcript-1',
              clientId: 'client-1',
              clientName: 'Client 1',
              date: '2024-01-15',
              transcriptCount: 25,
              similarity: 0.85,
              distance: 0.15,
              rank: 1
            },
            {
              transcriptId: 'transcript-2',
              clientId: 'client-2',
              clientName: 'Client 2',
              date: '2024-01-16',
              transcriptCount: 27,
              similarity: 0.82,
              distance: 0.18,
              rank: 2
            }
          ],
          patternStrength: 0.835,
          confidence: 0.9,
          description: 'High volume pattern found across 2 clients'
        }
      ])

      const result = await EmbeddingService.discoverPatterns({
        patternType: 'volume',
        timeWindow: 30,
        minSimilarity: 0.8
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        patternId: 'pattern-1',
        patternStrength: 0.835,
        confidence: 0.9,
        matchingTranscripts: expect.arrayContaining([
          expect.objectContaining({ similarity: expect.any(Number) })
        ])
      })
    })

    it('should cluster transcripts by similarity', async () => {
      const result = await EmbeddingService.clusterTranscripts({
        numClusters: 2,
        minClusterSize: 1
      })

      expect(result).toMatchObject({
        clusters: expect.any(Array),
        totalTranscripts: 3,
        silhouetteScore: expect.any(Number),
        processingTime: expect.any(Number)
      })

      expect(result.clusters.length).toBeGreaterThan(0)
      result.clusters.forEach(cluster => {
        expect(cluster.size).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large batch operations efficiently', async () => {
      const largeTranscriptSet = Array.from({ length: 1000 }, (_, i) => `transcript-${i}`)

      // Mock efficient batch processing
      jest.spyOn(transcriptVectorizationService, 'batchVectorizeTranscripts')
        .mockResolvedValue({
          results: largeTranscriptSet.map(id => ({
            transcriptId: id,
            embeddingId: `embedding-${id}`,
            success: true,
            dimensions: 768,
            processingTime: 50
          })),
          totalProcessed: 1000,
          successCount: 1000,
          errorCount: 0,
          totalProcessingTime: 50000,
          averageProcessingTime: 50
        })

      const result = await EmbeddingService.initializeAllEmbeddings({
        batchSize: 100
      })

      expect(result.totalProcessed).toBe(1000)
      expect(result.successCount).toBe(1000)
      expect(result.averageProcessingTime).toBe(50)
    })

    it('should optimize vector search performance', async () => {
      const startTime = Date.now()

      // Mock optimized search
      mockPool.query.mockResolvedValue({
        rows: Array.from({ length: 100 }, (_, i) => ({
          transcript_id: `transcript-${i}`,
          client_id: `client-${i}`,
          client_name: `Client ${i}`,
          date: '2024-01-15',
          transcript_count: 20 + i,
          similarity: 0.9 - (i * 0.001),
          distance: 0.1 + (i * 0.001)
        }))
      })

      const result = await EmbeddingService.searchByQuery('test query', {
        limit: 100
      })

      const processingTime = Date.now() - startTime

      expect(result).toHaveLength(100)
      expect(processingTime).toBeLessThan(1000) // Should complete within 1 second
      
      // Results should be properly ordered by similarity
      for (let i = 1; i < result.length; i++) {
        expect(result[i-1].similarity).toBeGreaterThanOrEqual(result[i].similarity)
      }
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle embedding generation failures gracefully', async () => {
      // Mock embedding service failure
      jest.spyOn(textEmbeddingService, 'generateTranscriptEmbedding')
        .mockRejectedValue(new Error('API rate limit exceeded'))

      const result = await EmbeddingService.vectorizeTranscript('transcript-1')

      expect(result).toMatchObject({
        transcriptId: 'transcript-1',
        success: false,
        error: 'API rate limit exceeded'
      })
    })

    it('should recover from partial batch failures', async () => {
      const transcriptIds = ['transcript-1', 'transcript-2', 'transcript-3']

      // Mock mixed success/failure results
      jest.spyOn(transcriptVectorizationService, 'vectorizeTranscript')
        .mockResolvedValueOnce({
          transcriptId: 'transcript-1',
          embeddingId: 'embedding-1',
          success: true,
          dimensions: 768,
          processingTime: 100
        })
        .mockResolvedValueOnce({
          transcriptId: 'transcript-2',
          embeddingId: '',
          success: false,
          error: 'Network timeout',
          dimensions: 0,
          processingTime: 5000
        })
        .mockResolvedValueOnce({
          transcriptId: 'transcript-3',
          embeddingId: 'embedding-3',
          success: true,
          dimensions: 768,
          processingTime: 150
        })

      const result = await transcriptVectorizationService.batchVectorizeTranscripts({
        transcriptIds
      })

      expect(result).toMatchObject({
        totalProcessed: 3,
        successCount: 2,
        errorCount: 1
      })

      // Should have detailed results for debugging
      expect(result.results).toHaveLength(3)
      expect(result.results.filter(r => r.success)).toHaveLength(2)
      expect(result.results.filter(r => !r.success)).toHaveLength(1)
    })

    it('should handle database connection issues', async () => {
      // Mock database connection failure
      mockPool.query.mockRejectedValue(new Error('Connection timeout'))

      await expect(EmbeddingService.searchByQuery('test query'))
        .rejects.toThrow('Similarity search failed')
    })

    it('should validate input parameters', async () => {
      await expect(EmbeddingService.vectorizeTranscript(''))
        .rejects.toThrow()

      await expect(EmbeddingService.searchByQuery(''))
        .rejects.toThrow()
    })
  })

  describe('System Statistics and Monitoring', () => {
    it('should provide comprehensive system statistics', async () => {
      // Mock vectorization stats
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1000' }] }) // total transcripts
        .mockResolvedValueOnce({ // vectorized transcripts
          rows: [
            { count: '800', embedding_model: 'text-embedding-004', avg_dimensions: '768' },
            { count: '150', embedding_model: 'text-embedding-gecko', avg_dimensions: '768' }
          ]
        })

      const stats = await EmbeddingService.getSystemStats()

      expect(stats).toMatchObject({
        vectorization: {
          totalTranscripts: 1000,
          vectorizedTranscripts: 950,
          vectorizationRate: 95,
          modelDistribution: {
            'text-embedding-004': 800,
            'text-embedding-gecko': 150
          },
          avgDimensions: 768
        },
        timestamp: expect.any(String)
      })
    })

    it('should support search suggestions for autocomplete', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { client_name: 'Acme Corp', day_of_week: 1, volume_category: 'high volume' },
          { client_name: 'Beta Inc', day_of_week: 5, volume_category: 'low volume' }
        ]
      })

      const suggestions = await EmbeddingService.getSearchSuggestions('acme', 5)

      expect(suggestions).toContain('Acme Corp')
      expect(suggestions).toContain('high volume activity')
      expect(suggestions).toContain('Monday patterns')
      expect(suggestions.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Cleanup and Maintenance', () => {
    it('should cleanup old embeddings', async () => {
      mockPool.query
        .mockResolvedValueOnce({ // get IDs to delete
          rows: [
            { id: 'old-embedding-1' },
            { id: 'old-embedding-2' }
          ]
        })
        .mockResolvedValue({ rowCount: 1 }) // delete operations

      const result = await EmbeddingService.cleanupEmbeddings({
        olderThanDays: 90,
        dryRun: false
      })

      expect(result).toMatchObject({
        deletedCount: 2,
        errors: []
      })
    })

    it('should perform dry run cleanup safely', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'old-embedding-1' }]
      })

      const result = await EmbeddingService.cleanupEmbeddings({
        olderThanDays: 30,
        dryRun: true
      })

      expect(result).toMatchObject({
        deletedCount: 1,
        errors: []
      })

      // Should not perform actual deletions
      expect(mockPool.query).toHaveBeenCalledTimes(1)
    })
  })
})