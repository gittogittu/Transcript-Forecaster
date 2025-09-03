/**
 * Transcript Data Vectorization Pipeline
 * 
 * This service handles the complete pipeline for vectorizing transcript data:
 * - Data preprocessing and cleaning
 * - Embedding generation
 * - Vector storage in Neon DB
 * - Batch processing capabilities
 */

import { Pool } from 'pg'
import { getDatabasePool } from '../../database/connection'
import { textEmbeddingService, EmbeddingResponse } from './text-embedding'
import { vectorUtils, VectorDatabaseUtils } from '../../database/vector-utils'

export interface TranscriptData {
  id: string
  clientId: string
  clientName: string
  date: string
  transcriptCount: number
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface VectorizationRequest {
  transcriptId: string
  forceRegenerate?: boolean
  embeddingModel?: 'text-embedding-004' | 'text-embedding-gecko'
}

export interface BatchVectorizationRequest {
  transcriptIds?: string[]
  clientId?: string
  dateRange?: {
    startDate: string
    endDate: string
  }
  forceRegenerate?: boolean
  embeddingModel?: 'text-embedding-004' | 'text-embedding-gecko'
  batchSize?: number
}

export interface VectorizationResult {
  transcriptId: string
  embeddingId: string
  success: boolean
  error?: string
  dimensions: number
  processingTime: number
}

export interface BatchVectorizationResult {
  results: VectorizationResult[]
  totalProcessed: number
  successCount: number
  errorCount: number
  totalProcessingTime: number
  averageProcessingTime: number
}

export interface SimilarTranscript {
  transcriptId: string
  clientId: string
  clientName: string
  date: string
  transcriptCount: number
  similarity: number
  distance: number
  notes?: string
}

export class TranscriptVectorizationService {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = await getDatabasePool()
    }
    return this.pool
  }

  /**
   * Vectorize a single transcript
   */
  async vectorizeTranscript(request: VectorizationRequest): Promise<VectorizationResult> {
    const startTime = Date.now()
    const { transcriptId, forceRegenerate = false, embeddingModel = 'text-embedding-004' } = request

    try {
      // Check if embedding already exists
      if (!forceRegenerate) {
        const existingEmbedding = await this.getExistingEmbedding(transcriptId, embeddingModel)
        if (existingEmbedding) {
          return {
            transcriptId,
            embeddingId: existingEmbedding.id,
            success: true,
            dimensions: existingEmbedding.dimensions,
            processingTime: Date.now() - startTime
          }
        }
      }

      // Get transcript data
      const transcriptData = await this.getTranscriptData(transcriptId)
      if (!transcriptData) {
        throw new Error(`Transcript not found: ${transcriptId}`)
      }

      // Generate embedding
      const embeddingResponse = await textEmbeddingService.generateTranscriptEmbedding({
        clientName: transcriptData.clientName,
        date: transcriptData.date,
        count: transcriptData.transcriptCount,
        notes: transcriptData.notes
      })

      // Store embedding in database
      const embeddingId = await this.storeEmbedding(
        transcriptId,
        embeddingResponse,
        embeddingModel
      )

      return {
        transcriptId,
        embeddingId,
        success: true,
        dimensions: embeddingResponse.dimensions,
        processingTime: Date.now() - startTime
      }
    } catch (error) {
      console.error(`Failed to vectorize transcript ${transcriptId}:`, error)
      return {
        transcriptId,
        embeddingId: '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        dimensions: 0,
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Vectorize multiple transcripts in batches
   */
  async batchVectorizeTranscripts(request: BatchVectorizationRequest): Promise<BatchVectorizationResult> {
    const startTime = Date.now()
    const {
      transcriptIds,
      clientId,
      dateRange,
      forceRegenerate = false,
      embeddingModel = 'text-embedding-004',
      batchSize = 50
    } = request

    try {
      // Get transcript IDs to process
      let idsToProcess: string[]
      
      if (transcriptIds) {
        idsToProcess = transcriptIds
      } else {
        idsToProcess = await this.getTranscriptIds({ clientId, dateRange })
      }

      if (idsToProcess.length === 0) {
        return {
          results: [],
          totalProcessed: 0,
          successCount: 0,
          errorCount: 0,
          totalProcessingTime: 0,
          averageProcessingTime: 0
        }
      }

      // Process in batches
      const results: VectorizationResult[] = []
      
      for (let i = 0; i < idsToProcess.length; i += batchSize) {
        const batch = idsToProcess.slice(i, i + batchSize)
        
        // Process batch concurrently
        const batchPromises = batch.map(transcriptId =>
          this.vectorizeTranscript({
            transcriptId,
            forceRegenerate,
            embeddingModel
          })
        )

        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)

        // Log progress
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(idsToProcess.length / batchSize)} (${results.length}/${idsToProcess.length} transcripts)`)

        // Add small delay between batches to avoid overwhelming the API
        if (i + batchSize < idsToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      const totalProcessingTime = Date.now() - startTime
      const successCount = results.filter(r => r.success).length
      const errorCount = results.filter(r => !r.success).length

      return {
        results,
        totalProcessed: results.length,
        successCount,
        errorCount,
        totalProcessingTime,
        averageProcessingTime: totalProcessingTime / results.length
      }
    } catch (error) {
      console.error('Batch vectorization failed:', error)
      throw new Error(`Batch vectorization failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Find similar transcripts using vector similarity
   */
  async findSimilarTranscripts(
    transcriptId: string,
    limit: number = 10,
    threshold: number = 0.7,
    embeddingModel: string = 'text-embedding-004'
  ): Promise<SimilarTranscript[]> {
    try {
      // Get the embedding for the source transcript
      const sourceEmbedding = await this.getTranscriptEmbedding(transcriptId, embeddingModel)
      if (!sourceEmbedding) {
        throw new Error(`No embedding found for transcript ${transcriptId}`)
      }

      // Perform vector similarity search
      const searchResults = await vectorUtils.vectorSearch({
        table: 'transcript_embeddings te JOIN transcripts t ON te.transcript_id = t.id JOIN clients c ON t.client_id = c.id',
        vectorColumn: 'te.embedding',
        embedding: sourceEmbedding,
        limit: limit + 1, // +1 to exclude the source transcript
        threshold,
        filters: {
          'te.embedding_model': embeddingModel,
          'te.transcript_id': `!= '${transcriptId}'` // Exclude source transcript
        }
      })

      // Transform results to SimilarTranscript format
      const similarTranscripts: SimilarTranscript[] = []
      
      for (const result of searchResults) {
        if (result.data.transcript_id !== transcriptId) { // Double-check exclusion
          similarTranscripts.push({
            transcriptId: result.data.transcript_id,
            clientId: result.data.client_id,
            clientName: result.data.name, // from clients table
            date: result.data.date,
            transcriptCount: result.data.transcript_count,
            similarity: result.similarity,
            distance: result.distance,
            notes: result.data.notes
          })
        }
      }

      return similarTranscripts.slice(0, limit)
    } catch (error) {
      console.error(`Failed to find similar transcripts for ${transcriptId}:`, error)
      throw new Error(`Failed to find similar transcripts: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Find transcripts similar to a query text
   */
  async searchTranscriptsByQuery(
    query: string,
    limit: number = 10,
    threshold: number = 0.6,
    clientId?: string,
    embeddingModel: string = 'text-embedding-004'
  ): Promise<SimilarTranscript[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await textEmbeddingService.generateQueryEmbedding(query)

      // Build filters
      const filters: Record<string, any> = {
        'te.embedding_model': embeddingModel
      }
      
      if (clientId) {
        filters['t.client_id'] = clientId
      }

      // Perform vector similarity search
      const searchResults = await vectorUtils.vectorSearch({
        table: 'transcript_embeddings te JOIN transcripts t ON te.transcript_id = t.id JOIN clients c ON t.client_id = c.id',
        vectorColumn: 'te.embedding',
        embedding: queryEmbedding.embedding,
        limit,
        threshold,
        filters
      })

      // Transform results
      return searchResults.map(result => ({
        transcriptId: result.data.transcript_id,
        clientId: result.data.client_id,
        clientName: result.data.name,
        date: result.data.date,
        transcriptCount: result.data.transcript_count,
        similarity: result.similarity,
        distance: result.distance,
        notes: result.data.notes
      }))
    } catch (error) {
      console.error(`Failed to search transcripts by query "${query}":`, error)
      throw new Error(`Failed to search transcripts: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get vectorization statistics
   */
  async getVectorizationStats(): Promise<{
    totalTranscripts: number
    vectorizedTranscripts: number
    vectorizationRate: number
    modelDistribution: Record<string, number>
    avgDimensions: number
  }> {
    const pool = await this.getPool()

    try {
      // Get total transcripts
      const totalResult = await pool.query('SELECT COUNT(*) as count FROM transcripts')
      const totalTranscripts = parseInt(totalResult.rows[0].count)

      // Get vectorized transcripts
      const vectorizedResult = await pool.query(`
        SELECT 
          COUNT(*) as count,
          embedding_model,
          AVG(vector_dims(embedding)) as avg_dimensions
        FROM transcript_embeddings 
        GROUP BY embedding_model
      `)

      const modelDistribution: Record<string, number> = {}
      let totalVectorized = 0
      let avgDimensions = 0

      for (const row of vectorizedResult.rows) {
        const count = parseInt(row.count)
        modelDistribution[row.embedding_model] = count
        totalVectorized += count
        avgDimensions = parseFloat(row.avg_dimensions) || 0
      }

      const vectorizationRate = totalTranscripts > 0 ? (totalVectorized / totalTranscripts) * 100 : 0

      return {
        totalTranscripts,
        vectorizedTranscripts: totalVectorized,
        vectorizationRate,
        modelDistribution,
        avgDimensions
      }
    } catch (error) {
      console.error('Failed to get vectorization stats:', error)
      throw new Error(`Failed to get vectorization stats: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Clean up old or invalid embeddings
   */
  async cleanupEmbeddings(options: {
    olderThanDays?: number
    invalidModels?: string[]
    dryRun?: boolean
  } = {}): Promise<{ deletedCount: number, errors: string[] }> {
    const pool = await this.getPool()
    const { olderThanDays = 30, invalidModels = [], dryRun = false } = options

    try {
      let query = 'SELECT id FROM transcript_embeddings WHERE 1=1'
      const params: any[] = []
      let paramIndex = 1

      if (olderThanDays > 0) {
        query += ` AND created_at < NOW() - INTERVAL '${olderThanDays} days'`
      }

      if (invalidModels.length > 0) {
        query += ` AND embedding_model = ANY($${paramIndex})`
        params.push(invalidModels)
        paramIndex++
      }

      // Get IDs to delete
      const result = await pool.query(query, params)
      const idsToDelete = result.rows.map(row => row.id)

      if (dryRun) {
        return { deletedCount: idsToDelete.length, errors: [] }
      }

      // Delete embeddings
      let deletedCount = 0
      const errors: string[] = []

      for (const id of idsToDelete) {
        try {
          await pool.query('DELETE FROM transcript_embeddings WHERE id = $1', [id])
          deletedCount++
        } catch (error) {
          errors.push(`Failed to delete embedding ${id}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      return { deletedCount, errors }
    } catch (error) {
      console.error('Failed to cleanup embeddings:', error)
      throw new Error(`Failed to cleanup embeddings: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Private helper methods

  private async getExistingEmbedding(
    transcriptId: string,
    embeddingModel: string
  ): Promise<{ id: string, dimensions: number } | null> {
    const pool = await this.getPool()

    try {
      const result = await pool.query(`
        SELECT id, vector_dims(embedding) as dimensions
        FROM transcript_embeddings
        WHERE transcript_id = $1 AND embedding_model = $2
        ORDER BY created_at DESC
        LIMIT 1
      `, [transcriptId, embeddingModel])

      if (result.rows.length === 0) {
        return null
      }

      return {
        id: result.rows[0].id,
        dimensions: parseInt(result.rows[0].dimensions)
      }
    } catch (error) {
      console.error('Failed to get existing embedding:', error)
      return null
    }
  }

  private async getTranscriptData(transcriptId: string): Promise<TranscriptData | null> {
    const pool = await this.getPool()

    try {
      const result = await pool.query(`
        SELECT 
          t.id,
          t.client_id,
          c.name as client_name,
          t.date::text as date,
          t.transcript_count,
          t.notes,
          t.created_at,
          t.updated_at
        FROM transcripts t
        JOIN clients c ON t.client_id = c.id
        WHERE t.id = $1
      `, [transcriptId])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id,
        clientId: row.client_id,
        clientName: row.client_name,
        date: row.date,
        transcriptCount: row.transcript_count,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    } catch (error) {
      console.error('Failed to get transcript data:', error)
      return null
    }
  }

  private async storeEmbedding(
    transcriptId: string,
    embeddingResponse: EmbeddingResponse,
    embeddingModel: string
  ): Promise<string> {
    const pool = await this.getPool()

    try {
      // Delete existing embedding for this transcript and model
      await pool.query(`
        DELETE FROM transcript_embeddings
        WHERE transcript_id = $1 AND embedding_model = $2
      `, [transcriptId, embeddingModel])

      // Insert new embedding
      const result = await pool.query(`
        INSERT INTO transcript_embeddings (
          transcript_id,
          embedding,
          embedding_model,
          metadata
        ) VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [
        transcriptId,
        VectorDatabaseUtils.arrayToVector(embeddingResponse.embedding),
        embeddingModel,
        JSON.stringify({
          dimensions: embeddingResponse.dimensions,
          tokenCount: embeddingResponse.tokenCount,
          generatedAt: new Date().toISOString()
        })
      ])

      return result.rows[0].id
    } catch (error) {
      console.error('Failed to store embedding:', error)
      throw new Error(`Failed to store embedding: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async getTranscriptIds(filters: {
    clientId?: string
    dateRange?: { startDate: string, endDate: string }
  }): Promise<string[]> {
    const pool = await this.getPool()

    try {
      let query = 'SELECT id FROM transcripts WHERE 1=1'
      const params: any[] = []
      let paramIndex = 1

      if (filters.clientId) {
        query += ` AND client_id = $${paramIndex}`
        params.push(filters.clientId)
        paramIndex++
      }

      if (filters.dateRange) {
        query += ` AND date >= $${paramIndex} AND date <= $${paramIndex + 1}`
        params.push(filters.dateRange.startDate, filters.dateRange.endDate)
        paramIndex += 2
      }

      query += ' ORDER BY date DESC'

      const result = await pool.query(query, params)
      return result.rows.map(row => row.id)
    } catch (error) {
      console.error('Failed to get transcript IDs:', error)
      throw new Error(`Failed to get transcript IDs: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async getTranscriptEmbedding(
    transcriptId: string,
    embeddingModel: string
  ): Promise<number[] | null> {
    const pool = await this.getPool()

    try {
      const result = await pool.query(`
        SELECT embedding
        FROM transcript_embeddings
        WHERE transcript_id = $1 AND embedding_model = $2
        ORDER BY created_at DESC
        LIMIT 1
      `, [transcriptId, embeddingModel])

      if (result.rows.length === 0) {
        return null
      }

      return VectorDatabaseUtils.vectorToArray(result.rows[0].embedding)
    } catch (error) {
      console.error('Failed to get transcript embedding:', error)
      return null
    }
  }
}

// Export singleton instance
export const transcriptVectorizationService = new TranscriptVectorizationService()