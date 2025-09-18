/**
 * Tests for Transcript Vectorization Service
 */

import { transcriptVectorizationService, TranscriptVectorizationService } from '../transcript-vectorization'
import { textEmbeddingService } from '../text-embedding'
import { vectorUtils } from '../../../database/vector-utils'

// Mock dependencies
jest.mock('../text-embedding')
jest.mock('../../../database/vector-utils')
jest.mock('../../../database/connection', () => ({
  getDatabasePool: jest.fn().mockResolvedValue({
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    })
  })
}))

const mockTextEmbeddingService = textEmbeddingService as jest.Mocked<typeof textEmbeddingService>
const mockVectorUtils = vectorUtils as jest.Mocked<typeof vectorUtils>

describe('TranscriptVectorizationService', () => {
  let service: TranscriptVectorizationService
  let mockPool: any

  beforeEach(() => {
    service = new TranscriptVectorizationService()
    
    // Setup mock pool
    mockPool = {
      query: jest.fn()
    }
    
    // Mock getDatabasePool to return our mock
    const { getDatabasePool } = require('../../../database/connection')
    getDatabasePool.mockResolvedValue(mockPool)

    jest.clearAllMocks()
  })

  describe('vectorizeTranscript', () => {
    const mockTranscriptData = {
      id: 'transcript-1',
      clientId: 'client-1',
      clientName: 'Test Client',
      date: '2024-01-15',
      transcriptCount: 25,
      notes: 'Test notes'
    }

    const mockEmbeddingResponse = {
      embedding: new Array(768).fill(0.1),
      model: 'text-embedding-004',
      dimensions: 768,
      tokenCount: 10
    }

    beforeEach(() => {
      // Mock existing embedding check (no existing embedding)
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // getExistingEmbedding
        .mockResolvedValueOnce({ rows: [mockTranscriptData] }) // getTranscriptData
        .mockResolvedValueOnce({ rows: [] }) // delete existing
        .mockResolvedValueOnce({ rows: [{ id: 'embedding-1' }] }) // insert new

      mockTextEmbeddingService.generateTranscriptEmbedding.mockResolvedValue(mockEmbeddingResponse)
    })

    it('should vectorize a transcript successfully', async () => {
      const result = await service.vectorizeTranscript({
        transcriptId: 'transcript-1'
      })

      expect(result).toMatchObject({
        transcriptId: 'transcript-1',
        embeddingId: 'embedding-1',
        success: true,
        dimensions: 768,
        processingTime: expect.any(Number)
      })

      expect(mockTextEmbeddingService.generateTranscriptEmbedding).toHaveBeenCalledWith({
        clientName: 'Test Client',
        date: '2024-01-15',
        count: 25,
        notes: 'Test notes'
      })
    })

    it('should return existing embedding when not forcing regeneration', async () => {
      // Mock existing embedding
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-embedding', dimensions: 768 }]
      })

      const result = await service.vectorizeTranscript({
        transcriptId: 'transcript-1',
        forceRegenerate: false
      })

      expect(result).toMatchObject({
        transcriptId: 'transcript-1',
        embeddingId: 'existing-embedding',
        success: true,
        dimensions: 768
      })

      expect(mockTextEmbeddingService.generateTranscriptEmbedding).not.toHaveBeenCalled()
    })

    it('should handle transcript not found', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // no existing embedding
        .mockResolvedValueOnce({ rows: [] }) // no transcript data

      const result = await service.vectorizeTranscript({
        transcriptId: 'nonexistent'
      })

      expect(result).toMatchObject({
        transcriptId: 'nonexistent',
        success: false,
        error: 'Transcript not found: nonexistent'
      })
    })

    it('should handle embedding generation errors', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // no existing embedding
        .mockResolvedValueOnce({ rows: [mockTranscriptData] }) // transcript data

      mockTextEmbeddingService.generateTranscriptEmbedding.mockRejectedValue(
        new Error('Embedding generation failed')
      )

      const result = await service.vectorizeTranscript({
        transcriptId: 'transcript-1'
      })

      expect(result).toMatchObject({
        transcriptId: 'transcript-1',
        success: false,
        error: 'Embedding generation failed'
      })
    })
  })

  describe('batchVectorizeTranscripts', () => {
    it('should vectorize multiple transcripts', async () => {
      const transcriptIds = ['transcript-1', 'transcript-2', 'transcript-3']

      // Mock successful vectorization for all transcripts
      jest.spyOn(service, 'vectorizeTranscript').mockImplementation(async ({ transcriptId }) => ({
        transcriptId,
        embeddingId: `embedding-${transcriptId}`,
        success: true,
        dimensions: 768,
        processingTime: 100
      }))

      const result = await service.batchVectorizeTranscripts({
        transcriptIds,
        batchSize: 2
      })

      expect(result).toMatchObject({
        totalProcessed: 3,
        successCount: 3,
        errorCount: 0,
        results: expect.arrayContaining([
          expect.objectContaining({ transcriptId: 'transcript-1', success: true }),
          expect.objectContaining({ transcriptId: 'transcript-2', success: true }),
          expect.objectContaining({ transcriptId: 'transcript-3', success: true })
        ])
      })
    })

    it('should handle mixed success and failure results', async () => {
      const transcriptIds = ['transcript-1', 'transcript-2']

      jest.spyOn(service, 'vectorizeTranscript')
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
          error: 'Failed to vectorize',
          dimensions: 0,
          processingTime: 50
        })

      const result = await service.batchVectorizeTranscripts({
        transcriptIds
      })

      expect(result).toMatchObject({
        totalProcessed: 2,
        successCount: 1,
        errorCount: 1
      })
    })

    it('should get transcript IDs by filters when not provided', async () => {
      // Mock getTranscriptIds
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'transcript-1' }, { id: 'transcript-2' }]
      })

      jest.spyOn(service, 'vectorizeTranscript').mockResolvedValue({
        transcriptId: 'transcript-1',
        embeddingId: 'embedding-1',
        success: true,
        dimensions: 768,
        processingTime: 100
      })

      const result = await service.batchVectorizeTranscripts({
        clientId: 'client-1',
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM transcripts'),
        ['client-1', '2024-01-01', '2024-01-31']
      )
    })

    it('should handle empty transcript list', async () => {
      const result = await service.batchVectorizeTranscripts({
        transcriptIds: []
      })

      expect(result).toMatchObject({
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0,
        results: []
      })
    })
  })

  describe('findSimilarTranscripts', () => {
    const mockEmbedding = new Array(768).fill(0.1)
    const mockSearchResults = [
      {
        id: 'transcript-2',
        similarity: 0.85,
        distance: 0.15,
        data: {
          transcript_id: 'transcript-2',
          client_id: 'client-2',
          name: 'Client 2',
          date: '2024-01-16',
          transcript_count: 30,
          notes: 'Similar notes'
        }
      }
    ]

    beforeEach(() => {
      // Mock getTranscriptEmbedding
      mockPool.query.mockResolvedValueOnce({
        rows: [{ embedding: `[${mockEmbedding.join(',')}]` }]
      })

      mockVectorUtils.vectorSearch.mockResolvedValue(mockSearchResults)
    })

    it('should find similar transcripts', async () => {
      const result = await service.findSimilarTranscripts('transcript-1')

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        transcriptId: 'transcript-2',
        clientId: 'client-2',
        clientName: 'Client 2',
        similarity: 0.85,
        distance: 0.15
      })

      expect(mockVectorUtils.vectorSearch).toHaveBeenCalledWith({
        table: expect.stringContaining('transcript_embeddings'),
        vectorColumn: 'te.embedding',
        embedding: mockEmbedding,
        limit: 11, // +1 to exclude source
        threshold: 0.7,
        filters: expect.objectContaining({
          'te.embedding_model': 'text-embedding-004'
        })
      })
    })

    it('should handle no embedding found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      await expect(service.findSimilarTranscripts('transcript-1'))
        .rejects.toThrow('No embedding found for transcript transcript-1')
    })

    it('should exclude source transcript from results', async () => {
      const resultsWithSource = [
        ...mockSearchResults,
        {
          id: 'transcript-1',
          similarity: 1.0,
          distance: 0.0,
          data: {
            transcript_id: 'transcript-1',
            client_id: 'client-1',
            name: 'Client 1',
            date: '2024-01-15',
            transcript_count: 25,
            notes: 'Source notes'
          }
        }
      ]

      mockVectorUtils.vectorSearch.mockResolvedValue(resultsWithSource)

      const result = await service.findSimilarTranscripts('transcript-1')

      expect(result).toHaveLength(1)
      expect(result[0].transcriptId).toBe('transcript-2')
    })
  })

  describe('searchTranscriptsByQuery', () => {
    const mockQueryEmbedding = {
      embedding: new Array(768).fill(0.2),
      model: 'text-embedding-004',
      dimensions: 768
    }

    const mockSearchResults = [
      {
        id: 'transcript-1',
        similarity: 0.75,
        distance: 0.25,
        data: {
          transcript_id: 'transcript-1',
          client_id: 'client-1',
          name: 'Client 1',
          date: '2024-01-15',
          transcript_count: 25,
          notes: 'Matching notes'
        }
      }
    ]

    beforeEach(() => {
      mockTextEmbeddingService.generateQueryEmbedding.mockResolvedValue(mockQueryEmbedding)
      mockVectorUtils.vectorSearch.mockResolvedValue(mockSearchResults)
    })

    it('should search transcripts by query', async () => {
      const result = await service.searchTranscriptsByQuery('high volume meetings')

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        transcriptId: 'transcript-1',
        clientId: 'client-1',
        clientName: 'Client 1',
        similarity: 0.75
      })

      expect(mockTextEmbeddingService.generateQueryEmbedding).toHaveBeenCalledWith('high volume meetings')
    })

    it('should apply client filter when provided', async () => {
      await service.searchTranscriptsByQuery('test query', 10, 0.6, 'client-1')

      expect(mockVectorUtils.vectorSearch).toHaveBeenCalledWith({
        table: expect.any(String),
        vectorColumn: 'te.embedding',
        embedding: mockQueryEmbedding.embedding,
        limit: 10,
        threshold: 0.6,
        filters: expect.objectContaining({
          't.client_id': 'client-1'
        })
      })
    })
  })

  describe('getVectorizationStats', () => {
    it('should return vectorization statistics', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // total transcripts
        .mockResolvedValueOnce({ // vectorized transcripts
          rows: [
            { count: '80', embedding_model: 'text-embedding-004', avg_dimensions: '768' },
            { count: '20', embedding_model: 'text-embedding-gecko', avg_dimensions: '768' }
          ]
        })

      const result = await service.getVectorizationStats()

      expect(result).toMatchObject({
        totalTranscripts: 100,
        vectorizedTranscripts: 100,
        vectorizationRate: 100,
        modelDistribution: {
          'text-embedding-004': 80,
          'text-embedding-gecko': 20
        },
        avgDimensions: 768
      })
    })

    it('should handle no vectorized transcripts', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [] })

      const result = await service.getVectorizationStats()

      expect(result).toMatchObject({
        totalTranscripts: 50,
        vectorizedTranscripts: 0,
        vectorizationRate: 0,
        modelDistribution: {},
        avgDimensions: 0
      })
    })
  })

  describe('cleanupEmbeddings', () => {
    it('should cleanup old embeddings', async () => {
      const idsToDelete = ['embedding-1', 'embedding-2', 'embedding-3']
      
      mockPool.query
        .mockResolvedValueOnce({ // get IDs to delete
          rows: idsToDelete.map(id => ({ id }))
        })
        .mockResolvedValue({ rowCount: 1 }) // delete operations

      const result = await service.cleanupEmbeddings({
        olderThanDays: 30,
        dryRun: false
      })

      expect(result).toMatchObject({
        deletedCount: 3,
        errors: []
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM transcript_embeddings'),
        ['embedding-1']
      )
    })

    it('should perform dry run without deleting', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'embedding-1' }, { id: 'embedding-2' }]
      })

      const result = await service.cleanupEmbeddings({
        olderThanDays: 30,
        dryRun: true
      })

      expect(result).toMatchObject({
        deletedCount: 2,
        errors: []
      })

      // Should not call delete queries
      expect(mockPool.query).toHaveBeenCalledTimes(1)
    })

    it('should handle deletion errors', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'embedding-1' }] })
        .mockRejectedValueOnce(new Error('Delete failed'))

      const result = await service.cleanupEmbeddings({ dryRun: false })

      expect(result).toMatchObject({
        deletedCount: 0,
        errors: ['Failed to delete embedding embedding-1: Delete failed']
      })
    })
  })
})

describe('transcriptVectorizationService singleton', () => {
  it('should export a singleton instance', () => {
    expect(transcriptVectorizationService).toBeInstanceOf(TranscriptVectorizationService)
  })
})