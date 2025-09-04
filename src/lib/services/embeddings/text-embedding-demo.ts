/**
 * Demo Text Embedding Service
 * 
 * This is a simplified version for demo purposes that doesn't require
 * the actual Google Cloud Vertex AI package.
 */

export interface EmbeddingRequest {
  text: string
  model?: 'text-embedding-004' | 'text-embedding-gecko'
  taskType?: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING'
  title?: string
  outputDimensionality?: number
}

export interface EmbeddingResponse {
  embedding: number[]
  model: string
  dimensions: number
  tokenCount?: number
}

export interface BatchEmbeddingRequest {
  texts: string[]
  model?: 'text-embedding-004' | 'text-embedding-gecko'
  taskType?: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING'
  batchSize?: number
}

export interface BatchEmbeddingResponse {
  embeddings: EmbeddingResponse[]
  totalTokens: number
  processingTime: number
}

export class TextEmbeddingService {
  private defaultModel: string = 'text-embedding-004'
  private maxBatchSize: number = 100
  private maxTextLength: number = 20000

  constructor() {
    console.log('TextEmbeddingService initialized (demo mode)')
  }

  /**
   * Generate embedding for a single text (demo implementation)
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const {
      text,
      model = this.defaultModel,
      outputDimensionality = 768
    } = request

    // Validate text length
    if (text.length > this.maxTextLength) {
      throw new Error(`Text length (${text.length}) exceeds maximum allowed length (${this.maxTextLength})`)
    }

    // Generate mock embedding based on text content
    const embedding = this.generateMockEmbedding(text, outputDimensionality)

    return {
      embedding,
      model,
      dimensions: outputDimensionality,
      tokenCount: Math.ceil(text.length / 4) // Rough token estimate
    }
  }

  /**
   * Generate embeddings for multiple texts (demo implementation)
   */
  async generateBatchEmbeddings(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse> {
    const {
      texts,
      model = this.defaultModel,
      batchSize = this.maxBatchSize
    } = request

    const startTime = Date.now()
    const embeddings: EmbeddingResponse[] = []
    let totalTokens = 0

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      
      for (const text of batch) {
        const embedding = await this.generateEmbedding({ text, model })
        embeddings.push(embedding)
        totalTokens += embedding.tokenCount || 0
      }
    }

    const processingTime = Date.now() - startTime

    return {
      embeddings,
      totalTokens,
      processingTime
    }
  }

  /**
   * Generate a mock embedding vector based on text content
   */
  private generateMockEmbedding(text: string, dimensions: number): number[] {
    const embedding = new Array(dimensions)
    
    // Use text content to generate deterministic but varied embeddings
    const textHash = this.simpleHash(text)
    
    for (let i = 0; i < dimensions; i++) {
      // Generate values between -1 and 1 based on text hash and position
      const seed = (textHash + i) * 0.00001
      embedding[i] = Math.sin(seed) * Math.cos(seed * 2) * 0.8
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return embedding.map(val => val / magnitude)
  }

  /**
   * Simple hash function for generating deterministic embeddings
   */
  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimensions')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  /**
   * Find the most similar embeddings to a query embedding
   */
  static findSimilar(
    queryEmbedding: number[],
    embeddings: { id: string; embedding: number[]; metadata?: any }[],
    topK: number = 5,
    threshold: number = 0.7
  ): Array<{ id: string; similarity: number; metadata?: any }> {
    const similarities = embeddings.map(item => ({
      id: item.id,
      similarity: this.cosineSimilarity(queryEmbedding, item.embedding),
      metadata: item.metadata
    }))

    return similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
  }
}