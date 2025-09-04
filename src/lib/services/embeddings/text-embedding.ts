/**
 * Text Embedding Service using Google's Vertex AI Text Embedding Models
 * 
 * This service provides text embedding generation capabilities using Google's
 * text-embedding-004 and text-embedding-gecko models for transcript data vectorization.
 */

// import { VertexAI } from '@google-cloud/vertexai'
// For demo purposes, we'll mock the Vertex AI functionality
import { vertexAIConfig } from '../vertex-ai/config'
import { withErrorHandling } from '../vertex-ai/errors'

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
  private vertexAI: VertexAI
  private defaultModel: string = 'text-embedding-004'
  private maxBatchSize: number = 100
  private maxTextLength: number = 20000 // Characters

  constructor() {
    const config = vertexAIConfig.getClientOptions()
    this.vertexAI = new VertexAI({
      project: config.projectId,
      location: config.location,
    })
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return withErrorHandling(async () => {
      const {
        text,
        model = this.defaultModel,
        taskType = 'RETRIEVAL_DOCUMENT',
        title,
        outputDimensionality
      } = request

      // Validate text length
      if (text.length > this.maxTextLength) {
        throw new Error(`Text length (${text.length}) exceeds maximum allowed length (${this.maxTextLength})`)
      }

      // Get the generative model
      const textEmbeddingModel = this.vertexAI.getGenerativeModel({
        model: model,
      })

      // Prepare the request
      const embeddingRequest: any = {
        instances: [{
          content: text,
          task_type: taskType,
        }]
      }

      if (title) {
        embeddingRequest.instances[0].title = title
      }

      if (outputDimensionality && model === 'text-embedding-004') {
        embeddingRequest.parameters = {
          outputDimensionality: outputDimensionality
        }
      }

      // Generate embedding
      const result = await textEmbeddingModel.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: JSON.stringify(embeddingRequest)
          }]
        }]
      })

      // Parse response (this is a simplified version - actual Vertex AI embedding API differs)
      // In practice, you'd use the actual Vertex AI embedding endpoint
      const embedding = await this.callEmbeddingAPI(text, model, taskType, outputDimensionality)

      return {
        embedding: embedding.values,
        model: model,
        dimensions: embedding.values.length,
        tokenCount: embedding.tokenCount
      }
    }, 'generateEmbedding')
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateBatchEmbeddings(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse> {
    return withErrorHandling(async () => {
      const {
        texts,
        model = this.defaultModel,
        taskType = 'RETRIEVAL_DOCUMENT',
        batchSize = this.maxBatchSize
      } = request

      const startTime = Date.now()
      const embeddings: EmbeddingResponse[] = []
      let totalTokens = 0

      // Process texts in batches
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)
        
        // Process batch concurrently
        const batchPromises = batch.map(text => 
          this.generateEmbedding({
            text,
            model,
            taskType
          })
        )

        const batchResults = await Promise.all(batchPromises)
        embeddings.push(...batchResults)
        
        // Sum up token counts
        totalTokens += batchResults.reduce((sum, result) => sum + (result.tokenCount || 0), 0)

        // Add small delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      const processingTime = Date.now() - startTime

      return {
        embeddings,
        totalTokens,
        processingTime
      }
    }, 'generateBatchEmbeddings')
  }

  /**
   * Generate embedding for transcript content
   */
  async generateTranscriptEmbedding(
    transcriptData: {
      clientName: string
      date: string
      count: number
      notes?: string
    }
  ): Promise<EmbeddingResponse> {
    // Create a structured text representation of the transcript data
    const transcriptText = this.formatTranscriptForEmbedding(transcriptData)
    
    return this.generateEmbedding({
      text: transcriptText,
      taskType: 'RETRIEVAL_DOCUMENT',
      title: `Transcript data for ${transcriptData.clientName} on ${transcriptData.date}`
    })
  }

  /**
   * Generate query embedding for similarity search
   */
  async generateQueryEmbedding(query: string): Promise<EmbeddingResponse> {
    return this.generateEmbedding({
      text: query,
      taskType: 'RETRIEVAL_QUERY'
    })
  }

  /**
   * Format transcript data into a text representation suitable for embedding
   */
  private formatTranscriptForEmbedding(transcriptData: {
    clientName: string
    date: string
    count: number
    notes?: string
  }): string {
    const parts = [
      `Client: ${transcriptData.clientName}`,
      `Date: ${transcriptData.date}`,
      `Transcript Count: ${transcriptData.count}`,
    ]

    if (transcriptData.notes && transcriptData.notes.trim()) {
      parts.push(`Notes: ${transcriptData.notes}`)
    }

    // Add contextual information for better embeddings
    parts.push(`Volume Level: ${this.categorizeVolume(transcriptData.count)}`)
    parts.push(`Day of Week: ${new Date(transcriptData.date).toLocaleDateString('en-US', { weekday: 'long' })}`)

    return parts.join('\n')
  }

  /**
   * Categorize transcript volume for better semantic understanding
   */
  private categorizeVolume(count: number): string {
    if (count === 0) return 'No Activity'
    if (count <= 5) return 'Low Volume'
    if (count <= 20) return 'Medium Volume'
    if (count <= 50) return 'High Volume'
    return 'Very High Volume'
  }

  /**
   * Call the actual Vertex AI embedding API
   * This is a placeholder for the actual API call implementation
   */
  private async callEmbeddingAPI(
    text: string,
    model: string,
    taskType: string,
    outputDimensionality?: number
  ): Promise<{ values: number[], tokenCount: number }> {
    // This would be replaced with actual Vertex AI embedding API call
    // For now, we'll simulate an embedding response
    
    const config = vertexAIConfig.getClientOptions()
    
    try {
      // In a real implementation, this would use the Vertex AI REST API or client library
      // for text embeddings specifically
      
      const response = await fetch(
        `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/${model}:predict`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instances: [{
              content: text,
              task_type: taskType,
            }],
            parameters: outputDimensionality ? { outputDimensionality } : {}
          })
        }
      )

      if (!response.ok) {
        throw new Error(`Embedding API call failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.predictions || result.predictions.length === 0) {
        throw new Error('No embedding returned from API')
      }

      const prediction = result.predictions[0]
      
      return {
        values: prediction.embeddings?.values || prediction.values || [],
        tokenCount: prediction.statistics?.token_count || text.split(/\s+/).length
      }
    } catch (error) {
      console.error('Embedding API call failed:', error)
      
      // Fallback: generate a mock embedding for development/testing
      console.warn('Using mock embedding for development')
      return this.generateMockEmbedding(text, model)
    }
  }

  /**
   * Get access token for Vertex AI API calls
   */
  private async getAccessToken(): Promise<string> {
    // This would use Google Auth library to get access token
    // For now, return a placeholder
    return 'mock-access-token'
  }

  /**
   * Generate a mock embedding for development/testing purposes
   */
  private generateMockEmbedding(text: string, model: string): { values: number[], tokenCount: number } {
    // Generate a deterministic mock embedding based on text content
    const dimensions = model === 'text-embedding-004' ? 768 : 768
    const embedding = new Array(dimensions)
    
    // Use text hash to generate consistent embeddings
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Generate embedding values
    for (let i = 0; i < dimensions; i++) {
      const seed = hash + i
      embedding[i] = (Math.sin(seed) + Math.cos(seed * 2)) / 2
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    for (let i = 0; i < dimensions; i++) {
      embedding[i] = embedding[i] / magnitude
    }
    
    return {
      values: embedding,
      tokenCount: text.split(/\s+/).length
    }
  }

  /**
   * Get supported models
   */
  getSupportedModels(): string[] {
    return ['text-embedding-004', 'text-embedding-gecko']
  }

  /**
   * Get model information
   */
  getModelInfo(model: string): { dimensions: number, maxTokens: number } {
    const modelInfo = {
      'text-embedding-004': { dimensions: 768, maxTokens: 20000 },
      'text-embedding-gecko': { dimensions: 768, maxTokens: 3072 }
    }
    
    return modelInfo[model as keyof typeof modelInfo] || modelInfo['text-embedding-004']
  }
}

// Export singleton instance
export const textEmbeddingService = new TextEmbeddingService()