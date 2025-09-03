/**
 * Tests for Text Embedding Service
 */

import { textEmbeddingService, TextEmbeddingService } from '../text-embedding'

// Mock Vertex AI
jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            predictions: [{
              embeddings: { values: new Array(768).fill(0.1) },
              statistics: { token_count: 10 }
            }]
          })
        }
      })
    })
  }))
}))

// Mock config
jest.mock('../../vertex-ai/config', () => ({
  vertexAIConfig: {
    getClientOptions: () => ({
      projectId: 'test-project',
      location: 'us-central1'
    })
  }
}))

describe('TextEmbeddingService', () => {
  let service: TextEmbeddingService

  beforeEach(() => {
    service = new TextEmbeddingService()
    jest.clearAllMocks()
  })

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      const request = {
        text: 'Test transcript data',
        model: 'text-embedding-004' as const,
        taskType: 'RETRIEVAL_DOCUMENT' as const
      }

      const result = await service.generateEmbedding(request)

      expect(result).toMatchObject({
        embedding: expect.any(Array),
        model: 'text-embedding-004',
        dimensions: expect.any(Number),
        tokenCount: expect.any(Number)
      })
      expect(result.embedding).toHaveLength(768)
      expect(result.dimensions).toBe(768)
    })

    it('should handle text length validation', async () => {
      const longText = 'a'.repeat(25000) // Exceeds max length
      
      await expect(service.generateEmbedding({ text: longText }))
        .rejects.toThrow('Text length (25000) exceeds maximum allowed length (20000)')
    })

    it('should use default parameters when not specified', async () => {
      const result = await service.generateEmbedding({ text: 'test' })
      
      expect(result.model).toBe('text-embedding-004')
    })
  })

  describe('generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = [
        'First transcript',
        'Second transcript',
        'Third transcript'
      ]

      const result = await service.generateBatchEmbeddings({ texts })

      expect(result.embeddings).toHaveLength(3)
      expect(result.totalTokens).toBeGreaterThan(0)
      expect(result.processingTime).toBeGreaterThan(0)
      
      result.embeddings.forEach(embedding => {
        expect(embedding.embedding).toHaveLength(768)
        expect(embedding.dimensions).toBe(768)
      })
    })

    it('should process texts in batches', async () => {
      const texts = new Array(150).fill('test text') // More than default batch size
      
      const result = await service.generateBatchEmbeddings({ 
        texts, 
        batchSize: 50 
      })

      expect(result.embeddings).toHaveLength(150)
    })

    it('should handle empty text array', async () => {
      const result = await service.generateBatchEmbeddings({ texts: [] })

      expect(result.embeddings).toHaveLength(0)
      expect(result.totalTokens).toBe(0)
    })
  })

  describe('generateTranscriptEmbedding', () => {
    it('should generate embedding for transcript data', async () => {
      const transcriptData = {
        clientName: 'Test Client',
        date: '2024-01-15',
        count: 25,
        notes: 'Important meeting notes'
      }

      const result = await service.generateTranscriptEmbedding(transcriptData)

      expect(result).toMatchObject({
        embedding: expect.any(Array),
        model: 'text-embedding-004',
        dimensions: 768
      })
    })

    it('should handle transcript data without notes', async () => {
      const transcriptData = {
        clientName: 'Test Client',
        date: '2024-01-15',
        count: 10
      }

      const result = await service.generateTranscriptEmbedding(transcriptData)
      expect(result.embedding).toHaveLength(768)
    })
  })

  describe('generateQueryEmbedding', () => {
    it('should generate embedding for search query', async () => {
      const query = 'high volume transcripts on Monday'

      const result = await service.generateQueryEmbedding(query)

      expect(result).toMatchObject({
        embedding: expect.any(Array),
        model: 'text-embedding-004',
        dimensions: 768
      })
    })
  })

  describe('formatTranscriptForEmbedding', () => {
    it('should format transcript data correctly', async () => {
      const transcriptData = {
        clientName: 'Test Client',
        date: '2024-01-15', // Monday
        count: 25,
        notes: 'Meeting notes'
      }

      // Access private method through any cast for testing
      const formatted = (service as any).formatTranscriptForEmbedding(transcriptData)

      expect(formatted).toContain('Client: Test Client')
      expect(formatted).toContain('Date: 2024-01-15')
      expect(formatted).toContain('Transcript Count: 25')
      expect(formatted).toContain('Notes: Meeting notes')
      expect(formatted).toContain('Volume Level: Medium Volume')
      expect(formatted).toContain('Day of Week: Monday')
    })
  })

  describe('categorizeVolume', () => {
    it('should categorize volumes correctly', () => {
      // Access private method for testing
      const categorize = (service as any).categorizeVolume.bind(service)

      expect(categorize(0)).toBe('No Activity')
      expect(categorize(3)).toBe('Low Volume')
      expect(categorize(15)).toBe('Medium Volume')
      expect(categorize(35)).toBe('High Volume')
      expect(categorize(75)).toBe('Very High Volume')
    })
  })

  describe('getSupportedModels', () => {
    it('should return supported models', () => {
      const models = service.getSupportedModels()
      
      expect(models).toContain('text-embedding-004')
      expect(models).toContain('text-embedding-gecko')
    })
  })

  describe('getModelInfo', () => {
    it('should return model information', () => {
      const info004 = service.getModelInfo('text-embedding-004')
      expect(info004).toEqual({
        dimensions: 768,
        maxTokens: 20000
      })

      const infoGecko = service.getModelInfo('text-embedding-gecko')
      expect(infoGecko).toEqual({
        dimensions: 768,
        maxTokens: 3072
      })
    })

    it('should return default info for unknown model', () => {
      const info = service.getModelInfo('unknown-model')
      expect(info).toEqual({
        dimensions: 768,
        maxTokens: 20000
      })
    })
  })

  describe('generateMockEmbedding', () => {
    it('should generate consistent mock embeddings', () => {
      // Access private method for testing
      const generateMock = (service as any).generateMockEmbedding.bind(service)

      const text = 'test text'
      const model = 'text-embedding-004'

      const embedding1 = generateMock(text, model)
      const embedding2 = generateMock(text, model)

      // Should be deterministic
      expect(embedding1.values).toEqual(embedding2.values)
      expect(embedding1.values).toHaveLength(768)
      
      // Should be normalized (magnitude close to 1)
      const magnitude = Math.sqrt(
        embedding1.values.reduce((sum: number, val: number) => sum + val * val, 0)
      )
      expect(magnitude).toBeCloseTo(1.0, 5)
    })

    it('should generate different embeddings for different texts', () => {
      const generateMock = (service as any).generateMockEmbedding.bind(service)

      const embedding1 = generateMock('text one', 'text-embedding-004')
      const embedding2 = generateMock('text two', 'text-embedding-004')

      expect(embedding1.values).not.toEqual(embedding2.values)
    })
  })

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock fetch to simulate API error
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'))

      const result = await service.generateEmbedding({ text: 'test' })
      
      // Should fall back to mock embedding
      expect(result.embedding).toHaveLength(768)
      expect(result.model).toBe('text-embedding-004')
    })

    it('should handle invalid API response', async () => {
      // Mock fetch to return invalid response
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      const result = await service.generateEmbedding({ text: 'test' })
      
      // Should fall back to mock embedding
      expect(result.embedding).toHaveLength(768)
    })
  })
})

describe('textEmbeddingService singleton', () => {
  it('should export a singleton instance', () => {
    expect(textEmbeddingService).toBeInstanceOf(TextEmbeddingService)
  })
})