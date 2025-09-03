/**
 * Tests for Similarity Search Service
 */

import { similaritySearchService, SimilaritySearchService } from '../similarity-search'
import { textEmbeddingService } from '../text-embedding'
import { vectorUtils } from '../../../database/vector-utils'

// Mock dependencies
jest.mock('../text-embedding')
jest.mock('../../../database/vector-utils')
jest.mock('../../../database/connection', () => ({
  getDatabasePool: jest.fn().mockResolvedValue({
    query: jest.fn()
  })
}))

const mockTextEmbeddingService = textEmbeddingService as jest.Mocked<typeof textEmbeddingService>
const mockVectorUtils = vectorUtils as jest.Mocked<typeof vectorUtils>

describe('SimilaritySearchService', () => {
  let service: SimilaritySearchService
  let mockPool: any

  beforeEach(() => {
    service = new SimilaritySearchService()
    
    mockPool = {
      query: jest.fn()
    }
    
    const { getDatabasePool } = require('../../../database/connection')
    getDatabasePool.mockResolvedValue(mockPool)

    jest.clearAllMocks()
  })

  describe('search', () => {
    const mockEmbedding = new Array(768).fill(0.1)
    const mockSearchResults = [
      {
        transcript_id: 'transcript-1',
        client_id: 'client-1',
        client_name: 'Client 1',
        date: '2024-01-15',
        transcript_count: 25,
        notes: 'Test notes',
        similarity: 0.85,
        distance: 0.15,
        embedding_model: 'text-embedding-004',
        dimensions: 768,
        token_count: 10,
        generated_at: '2024-01-15T10:00:00Z'
      }
    ]

    it('should search by query', async () => {
      const queryEmbedding = {
        embedding: mockEmbedding,
        model: 'text-embedding-004',
        dimensions: 768
      }

      mockTextEmbeddingService.generateQueryEmbedding.mockResolvedValue(queryEmbedding)
      mockPool.query.mockResolvedValue({ rows: mockSearchResults })

      const result = await service.search({
        query: 'high volume meetings',
        limit: 10,
        threshold: 0.7,
        includeMetadata: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        transcriptId: 'transcript-1',
        clientId: 'client-1',
        clientName: 'Client 1',
        similarity: 0.85,
        distance: 0.15,
        rank: 1,
        metadata: {
          embeddingModel: 'text-embedding-004',
          dimensions: 768,
          tokenCount: 10,
          generatedAt: '2024-01-15T10:00:00Z'
        }
      })

      expect(mockTextEmbeddingService.generateQueryEmbedding).toHaveBeenCalledWith('high volume meetings')
    })

    it('should search by transcript ID', async () => {
      // Mock getTranscriptEmbedding
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ embedding: `[${mockEmbedding.join(',')}]` }] })
        .mockResolvedValueOnce({ rows: mockSearchResults })

      const result = await service.search({
        transcriptId: 'source-transcript',
        limit: 5,
        threshold: 0.8
      })

      expect(result).toHaveLength(1)
      expect(result[0].transcriptId).toBe('transcript-1')
    })

    it('should search by provided embedding', async () => {
      mockPool.query.mockResolvedValue({ rows: mockSearchResults })

      const result = await service.search({
        embedding: mockEmbedding,
        limit: 10,
        threshold: 0.6
      })

      expect(result).toHaveLength(1)
      expect(result[0].transcriptId).toBe('transcript-1')
    })

    it('should apply filters correctly', async () => {
      mockPool.query.mockResolvedValue({ rows: mockSearchResults })

      await service.search({
        embedding: mockEmbedding,
        filters: {
          clientIds: ['client-1', 'client-2'],
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          },
          transcriptCountRange: {
            min: 10,
            max: 50
          },
          excludeTranscriptIds: ['transcript-exclude'],
          includeNotes: true
        }
      })

      const queryCall = mockPool.query.mock.calls[0]
      const query = queryCall[0]
      const params = queryCall[1]

      expect(query).toContain('t.client_id = ANY($5)')
      expect(query).toContain('t.date >= $6 AND t.date <= $7')
      expect(query).toContain('t.transcript_count >= $8 AND t.transcript_count <= $9')
      expect(query).toContain('t.id != ALL($10)')
      expect(query).toContain('t.notes IS NOT NULL AND t.notes != \'\'')

      expect(params).toEqual([
        `[${mockEmbedding.join(',')}]`,
        0.6, // threshold
        10,  // limit
        'text-embedding-004', // model
        ['client-1', 'client-2'], // clientIds
        '2024-01-01', // startDate
        '2024-01-31', // endDate
        10, // min count
        50, // max count
        ['transcript-exclude'] // excludeTranscriptIds
      ])
    })

    it('should handle no results', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const result = await service.search({
        embedding: mockEmbedding
      })

      expect(result).toHaveLength(0)
    })

    it('should throw error when no search criteria provided', async () => {
      await expect(service.search({}))
        .rejects.toThrow('Must provide query, transcriptId, or embedding')
    })

    it('should handle transcript embedding not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      await expect(service.search({ transcriptId: 'nonexistent' }))
        .rejects.toThrow('No embedding found for transcript nonexistent')
    })
  })

  describe('searchPatterns', () => {
    const mockPatternEmbeddings = [
      {
        id: 'pattern-1',
        clientId: 'client-1',
        clientName: 'Client 1',
        embedding: new Array(768).fill(0.1)
      }
    ]

    const mockSimilarTranscripts = [
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
        transcriptCount: 30,
        similarity: 0.80,
        distance: 0.20,
        rank: 2
      }
    ]

    beforeEach(() => {
      // Mock getPatternEmbeddings
      mockPool.query.mockResolvedValue({
        rows: [{
          id: 'pattern-1',
          client_id: 'client-1',
          client_name: 'Client 1',
          embedding: `[${new Array(768).fill(0.1).join(',')}]`
        }]
      })

      // Mock search method
      jest.spyOn(service, 'search').mockResolvedValue(mockSimilarTranscripts)
    })

    it('should search for patterns', async () => {
      const result = await service.searchPatterns({
        patternType: 'volume',
        clientId: 'client-1',
        timeWindow: 30,
        minSimilarity: 0.7,
        limit: 5
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        patternId: 'pattern-1',
        sourceClientId: 'client-1',
        sourceClientName: 'Client 1',
        matchingTranscripts: mockSimilarTranscripts,
        patternStrength: expect.any(Number),
        confidence: expect.any(Number),
        description: expect.stringContaining('volume pattern')
      })
    })

    it('should filter out patterns with insufficient matches', async () => {
      // Mock search to return only 1 transcript (need at least 2 for pattern)
      jest.spyOn(service, 'search').mockResolvedValue([mockSimilarTranscripts[0]])

      const result = await service.searchPatterns({
        patternType: 'seasonal'
      })

      expect(result).toHaveLength(0)
    })

    it('should sort results by pattern strength', async () => {
      // Mock multiple patterns
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 'pattern-1',
            client_id: 'client-1',
            client_name: 'Client 1',
            embedding: `[${new Array(768).fill(0.1).join(',')}]`
          },
          {
            id: 'pattern-2',
            client_id: 'client-2',
            client_name: 'Client 2',
            embedding: `[${new Array(768).fill(0.2).join(',')}]`
          }
        ]
      })

      // Mock different similarity scores for different patterns
      jest.spyOn(service, 'search')
        .mockResolvedValueOnce([
          { ...mockSimilarTranscripts[0], similarity: 0.7 },
          { ...mockSimilarTranscripts[1], similarity: 0.7 }
        ])
        .mockResolvedValueOnce([
          { ...mockSimilarTranscripts[0], similarity: 0.9 },
          { ...mockSimilarTranscripts[1], similarity: 0.9 }
        ])

      const result = await service.searchPatterns({
        patternType: 'trend',
        limit: 2
      })

      expect(result).toHaveLength(2)
      // Should be sorted by pattern strength (higher similarity = higher strength)
      expect(result[0].patternStrength).toBeGreaterThan(result[1].patternStrength)
    })
  })

  describe('clusterTranscripts', () => {
    const mockEmbeddings = [
      {
        transcriptId: 'transcript-1',
        clientId: 'client-1',
        embedding: new Array(768).fill(0.1)
      },
      {
        transcriptId: 'transcript-2',
        clientId: 'client-2',
        embedding: new Array(768).fill(0.2)
      },
      {
        transcriptId: 'transcript-3',
        clientId: 'client-3',
        embedding: new Array(768).fill(0.3)
      }
    ]

    beforeEach(() => {
      // Mock getEmbeddingsForClustering
      mockPool.query.mockResolvedValue({
        rows: mockEmbeddings.map(e => ({
          transcript_id: e.transcriptId,
          client_id: e.clientId,
          embedding: `[${e.embedding.join(',')}]`
        }))
      })
    })

    it('should cluster transcripts', async () => {
      const result = await service.clusterTranscripts({
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
        expect(cluster).toMatchObject({
          clusterId: expect.any(String),
          centroid: expect.any(Array),
          transcripts: expect.any(Array),
          size: expect.any(Number),
          cohesion: expect.any(Number),
          description: expect.any(String),
          characteristics: expect.any(Array)
        })
      })
    })

    it('should filter clusters by minimum size', async () => {
      const result = await service.clusterTranscripts({
        numClusters: 5,
        minClusterSize: 2 // Require at least 2 transcripts per cluster
      })

      // With only 3 transcripts and min size 2, should have fewer clusters
      result.clusters.forEach(cluster => {
        expect(cluster.size).toBeGreaterThanOrEqual(2)
      })
    })

    it('should throw error with insufficient data', async () => {
      // Mock insufficient embeddings
      mockPool.query.mockResolvedValue({ rows: [] })

      await expect(service.clusterTranscripts({
        numClusters: 5,
        minClusterSize: 3
      })).rejects.toThrow('Insufficient data for clustering')
    })

    it('should apply filters when getting embeddings', async () => {
      await service.clusterTranscripts({
        clientIds: ['client-1', 'client-2'],
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        embeddingModel: 'text-embedding-gecko'
      })

      const queryCall = mockPool.query.mock.calls[0]
      const query = queryCall[0]
      const params = queryCall[1]

      expect(query).toContain('te.embedding_model = $1')
      expect(query).toContain('t.client_id = ANY($2)')
      expect(query).toContain('t.date >= $3 AND t.date <= $4')

      expect(params).toEqual([
        'text-embedding-gecko',
        ['client-1', 'client-2'],
        '2024-01-01',
        '2024-01-31'
      ])
    })
  })

  describe('findTemporalPatterns', () => {
    const mockRecentTranscripts = [
      {
        transcriptId: 'transcript-1',
        clientId: 'client-1',
        clientName: 'Client 1',
        date: '2024-01-15',
        transcriptCount: 25,
        notes: 'Notes 1',
        similarity: 1.0,
        distance: 0.0,
        rank: 1
      },
      {
        transcriptId: 'transcript-2',
        clientId: 'client-1',
        clientName: 'Client 1',
        date: '2024-01-16',
        transcriptCount: 30,
        notes: 'Notes 2',
        similarity: 1.0,
        distance: 0.0,
        rank: 2
      }
    ]

    beforeEach(() => {
      // Mock getRecentTranscripts
      mockPool.query.mockResolvedValue({
        rows: mockRecentTranscripts.map(t => ({
          transcript_id: t.transcriptId,
          client_id: t.clientId,
          client_name: t.clientName,
          date: t.date,
          transcript_count: t.transcriptCount,
          notes: t.notes
        }))
      })

      // Mock temporal embedding generation
      mockTextEmbeddingService.generateQueryEmbedding.mockResolvedValue({
        embedding: new Array(768).fill(0.1),
        model: 'text-embedding-004',
        dimensions: 768
      })

      // Mock search results
      jest.spyOn(service, 'search').mockResolvedValue([
        {
          transcriptId: 'transcript-3',
          clientId: 'client-2',
          clientName: 'Client 2',
          date: '2024-01-17',
          transcriptCount: 28,
          similarity: 0.85,
          distance: 0.15,
          rank: 1
        }
      ])
    })

    it('should find temporal patterns', async () => {
      const result = await service.findTemporalPatterns('client-1', 30, 0.8)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        transcriptId: 'transcript-3',
        clientId: 'client-2',
        similarity: 0.85
      })

      expect(mockTextEmbeddingService.generateQueryEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('Temporal pattern:')
      )

      expect(service.search).toHaveBeenCalledWith({
        embedding: expect.any(Array),
        threshold: 0.8,
        limit: 10,
        filters: {
          excludeTranscriptIds: ['transcript-1', 'transcript-2']
        }
      })
    })

    it('should handle no recent transcripts', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const result = await service.findTemporalPatterns('client-1')

      expect(result).toHaveLength(0)
    })
  })

  describe('getSearchSuggestions', () => {
    const mockSuggestionData = [
      {
        client_name: 'Test Client',
        day_of_week: 1, // Monday
        volume_category: 'high volume'
      },
      {
        client_name: 'Another Client',
        day_of_week: 5, // Friday
        volume_category: 'low volume'
      }
    ]

    beforeEach(() => {
      mockPool.query.mockResolvedValue({ rows: mockSuggestionData })
    })

    it('should return search suggestions', async () => {
      const result = await service.getSearchSuggestions('test', 5)

      expect(result).toContain('Test Client')
      expect(result).toContain('high volume activity')
      expect(result).toContain('Monday patterns')
      expect(result).toContain('Another Client')
      expect(result).toContain('low volume activity')
      expect(result).toContain('Friday patterns')

      // Should remove duplicates and limit results
      expect(result.length).toBeLessThanOrEqual(5)
      expect(new Set(result).size).toBe(result.length)
    })

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'))

      const result = await service.getSearchSuggestions('test')

      expect(result).toEqual([])
    })
  })

  describe('helper methods', () => {
    it('should calculate pattern strength correctly', () => {
      const transcripts = [
        { similarity: 0.8 } as any,
        { similarity: 0.9 } as any,
        { similarity: 0.7 } as any,
        { similarity: 0.85 } as any,
        { similarity: 0.75 } as any
      ]

      // Access private method for testing
      const calculateStrength = (service as any).calculatePatternStrength.bind(service)
      const strength = calculateStrength(transcripts)

      // Average similarity (0.8) + consistency bonus (0.1) for 5+ transcripts
      expect(strength).toBeCloseTo(0.9, 2)
    })

    it('should calculate pattern confidence correctly', () => {
      const transcripts = [
        { similarity: 0.8 } as any,
        { similarity: 0.9 } as any
      ]

      const calculateConfidence = (service as any).calculatePatternConfidence.bind(service)
      const confidence = calculateConfidence(transcripts, 'volume')

      expect(confidence).toBeGreaterThan(0)
      expect(confidence).toBeLessThanOrEqual(1)
    })

    it('should generate pattern descriptions', () => {
      const transcripts = [
        { transcriptCount: 20, clientId: 'client-1' } as any,
        { transcriptCount: 30, clientId: 'client-2' } as any,
        { transcriptCount: 25, clientId: 'client-1' } as any
      ]

      const generateDescription = (service as any).generatePatternDescription.bind(service)
      const description = generateDescription('seasonal', transcripts)

      expect(description).toContain('seasonal pattern')
      expect(description).toContain('2 clients') // unique clients
      expect(description).toContain('25.0') // average count
    })

    it('should calculate Euclidean distance correctly', () => {
      const calculateDistance = (service as any).calculateEuclideanDistance.bind(service)
      
      const distance = calculateDistance([1, 2, 3], [4, 5, 6])
      
      // sqrt((4-1)² + (5-2)² + (6-3)²) = sqrt(9 + 9 + 9) = sqrt(27) ≈ 5.196
      expect(distance).toBeCloseTo(5.196, 3)
    })
  })
})

describe('similaritySearchService singleton', () => {
  it('should export a singleton instance', () => {
    expect(similaritySearchService).toBeInstanceOf(SimilaritySearchService)
  })
})