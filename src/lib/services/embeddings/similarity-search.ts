/**
 * Similarity Search Service using pgvector cosine similarity
 * 
 * This service provides advanced similarity search capabilities for transcript data:
 * - Cosine similarity search with pgvector
 * - Pattern matching and clustering
 * - Semantic search with natural language queries
 * - Advanced filtering and ranking
 */

import { Pool } from 'pg'
import { getDatabasePool } from '../../database/connection'
import { vectorUtils, VectorSearchResult } from '../../database/vector-utils'
import { textEmbeddingService } from './text-embedding'
import { transcriptVectorizationService } from './transcript-vectorization'

export interface SimilaritySearchRequest {
  query?: string
  transcriptId?: string
  embedding?: number[]
  limit?: number
  threshold?: number
  filters?: SearchFilters
  embeddingModel?: string
  includeMetadata?: boolean
}

export interface SearchFilters {
  clientIds?: string[]
  dateRange?: {
    startDate: string
    endDate: string
  }
  transcriptCountRange?: {
    min: number
    max: number
  }
  excludeTranscriptIds?: string[]
  includeNotes?: boolean
}

export interface SimilaritySearchResult {
  transcriptId: string
  clientId: string
  clientName: string
  date: string
  transcriptCount: number
  notes?: string
  similarity: number
  distance: number
  rank: number
  metadata?: {
    embeddingModel: string
    dimensions: number
    tokenCount?: number
    generatedAt: string
  }
}

export interface PatternSearchRequest {
  patternType: 'seasonal' | 'trend' | 'anomaly' | 'volume'
  clientId?: string
  timeWindow?: number // days
  minSimilarity?: number
  limit?: number
}

export interface PatternSearchResult {
  patternId: string
  sourceClientId: string
  sourceClientName: string
  matchingTranscripts: SimilaritySearchResult[]
  patternStrength: number
  confidence: number
  description: string
}

export interface ClusteringRequest {
  clientIds?: string[]
  dateRange?: {
    startDate: string
    endDate: string
  }
  numClusters?: number
  minClusterSize?: number
  embeddingModel?: string
}

export interface ClusteringResult {
  clusters: TranscriptCluster[]
  totalTranscripts: number
  silhouetteScore: number
  processingTime: number
}

export interface TranscriptCluster {
  clusterId: string
  centroid: number[]
  transcripts: SimilaritySearchResult[]
  size: number
  cohesion: number
  description: string
  characteristics: string[]
}

export class SimilaritySearchService {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = await getDatabasePool()
    }
    return this.pool
  }

  /**
   * Perform similarity search based on query, transcript, or embedding
   */
  async search(request: SimilaritySearchRequest): Promise<SimilaritySearchResult[]> {
    const {
      query,
      transcriptId,
      embedding,
      limit = 10,
      threshold = 0.6,
      filters = {},
      embeddingModel = 'text-embedding-004',
      includeMetadata = false
    } = request

    try {
      let searchEmbedding: number[]

      // Get or generate embedding
      if (embedding) {
        searchEmbedding = embedding
      } else if (transcriptId) {
        const transcriptEmbedding = await this.getTranscriptEmbedding(transcriptId, embeddingModel)
        if (!transcriptEmbedding) {
          throw new Error(`No embedding found for transcript ${transcriptId}`)
        }
        searchEmbedding = transcriptEmbedding
      } else if (query) {
        const queryEmbedding = await textEmbeddingService.generateQueryEmbedding(query)
        searchEmbedding = queryEmbedding.embedding
      } else {
        throw new Error('Must provide query, transcriptId, or embedding')
      }

      // Build the search query
      const searchQuery = this.buildSearchQuery(filters, embeddingModel, includeMetadata)
      const searchParams = this.buildSearchParams(searchEmbedding, threshold, limit, filters)

      // Execute search
      const pool = await this.getPool()
      const result = await pool.query(searchQuery, searchParams)

      // Transform results
      return result.rows.map((row, index) => ({
        transcriptId: row.transcript_id,
        clientId: row.client_id,
        clientName: row.client_name,
        date: row.date,
        transcriptCount: row.transcript_count,
        notes: row.notes,
        similarity: parseFloat(row.similarity),
        distance: parseFloat(row.distance),
        rank: index + 1,
        metadata: includeMetadata ? {
          embeddingModel: row.embedding_model,
          dimensions: parseInt(row.dimensions),
          tokenCount: row.token_count,
          generatedAt: row.generated_at
        } : undefined
      }))
    } catch (error) {
      console.error('Similarity search failed:', error)
      throw new Error(`Similarity search failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Find patterns across transcripts
   */
  async searchPatterns(request: PatternSearchRequest): Promise<PatternSearchResult[]> {
    const {
      patternType,
      clientId,
      timeWindow = 30,
      minSimilarity = 0.7,
      limit = 5
    } = request

    try {
      const pool = await this.getPool()
      
      // Get pattern embeddings based on type
      const patternEmbeddings = await this.getPatternEmbeddings(patternType, clientId, timeWindow)
      
      const results: PatternSearchResult[] = []

      for (const pattern of patternEmbeddings) {
        // Search for similar patterns
        const similarTranscripts = await this.search({
          embedding: pattern.embedding,
          threshold: minSimilarity,
          limit: 20,
          filters: clientId ? { clientIds: [clientId] } : {}
        })

        if (similarTranscripts.length >= 2) { // Need at least 2 matches for a pattern
          results.push({
            patternId: pattern.id,
            sourceClientId: pattern.clientId,
            sourceClientName: pattern.clientName,
            matchingTranscripts: similarTranscripts,
            patternStrength: this.calculatePatternStrength(similarTranscripts),
            confidence: this.calculatePatternConfidence(similarTranscripts, patternType),
            description: this.generatePatternDescription(patternType, similarTranscripts)
          })
        }
      }

      // Sort by pattern strength and return top results
      return results
        .sort((a, b) => b.patternStrength - a.patternStrength)
        .slice(0, limit)
    } catch (error) {
      console.error('Pattern search failed:', error)
      throw new Error(`Pattern search failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Cluster transcripts based on similarity
   */
  async clusterTranscripts(request: ClusteringRequest): Promise<ClusteringResult> {
    const startTime = Date.now()
    const {
      clientIds,
      dateRange,
      numClusters = 5,
      minClusterSize = 3,
      embeddingModel = 'text-embedding-004'
    } = request

    try {
      // Get embeddings for clustering
      const embeddings = await this.getEmbeddingsForClustering({
        clientIds,
        dateRange,
        embeddingModel
      })

      if (embeddings.length < numClusters * minClusterSize) {
        throw new Error(`Insufficient data for clustering. Need at least ${numClusters * minClusterSize} transcripts, got ${embeddings.length}`)
      }

      // Perform k-means clustering
      const clusters = await this.performKMeansClustering(embeddings, numClusters)
      
      // Filter clusters by minimum size
      const validClusters = clusters.filter(cluster => cluster.size >= minClusterSize)
      
      // Calculate silhouette score
      const silhouetteScore = this.calculateSilhouetteScore(embeddings, clusters)
      
      const processingTime = Date.now() - startTime

      return {
        clusters: validClusters,
        totalTranscripts: embeddings.length,
        silhouetteScore,
        processingTime
      }
    } catch (error) {
      console.error('Clustering failed:', error)
      throw new Error(`Clustering failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Find transcripts with similar temporal patterns
   */
  async findTemporalPatterns(
    clientId: string,
    timeWindow: number = 30,
    minSimilarity: number = 0.8
  ): Promise<SimilaritySearchResult[]> {
    try {
      // Get recent transcripts for the client
      const recentTranscripts = await this.getRecentTranscripts(clientId, timeWindow)
      
      if (recentTranscripts.length === 0) {
        return []
      }

      // Create a temporal pattern embedding
      const temporalEmbedding = await this.createTemporalPatternEmbedding(recentTranscripts)
      
      // Search for similar temporal patterns in other clients
      return this.search({
        embedding: temporalEmbedding,
        threshold: minSimilarity,
        limit: 10,
        filters: {
          excludeTranscriptIds: recentTranscripts.map(t => t.transcriptId)
        }
      })
    } catch (error) {
      console.error('Temporal pattern search failed:', error)
      throw new Error(`Temporal pattern search failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(
    partialQuery: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      const pool = await this.getPool()
      
      // Get common patterns from existing transcripts
      const result = await pool.query(`
        SELECT DISTINCT
          c.name as client_name,
          EXTRACT(DOW FROM t.date) as day_of_week,
          CASE 
            WHEN t.transcript_count = 0 THEN 'no activity'
            WHEN t.transcript_count <= 5 THEN 'low volume'
            WHEN t.transcript_count <= 20 THEN 'medium volume'
            WHEN t.transcript_count <= 50 THEN 'high volume'
            ELSE 'very high volume'
          END as volume_category
        FROM transcripts t
        JOIN clients c ON t.client_id = c.id
        WHERE 
          c.name ILIKE $1 
          OR $2 ILIKE '%' || LOWER(c.name) || '%'
        LIMIT $3
      `, [`%${partialQuery}%`, partialQuery.toLowerCase(), limit])

      const suggestions: string[] = []
      
      for (const row of result.rows) {
        suggestions.push(row.client_name)
        suggestions.push(`${row.volume_category} activity`)
        
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        suggestions.push(`${dayNames[row.day_of_week]} patterns`)
      }

      // Remove duplicates and return top suggestions
      return [...new Set(suggestions)].slice(0, limit)
    } catch (error) {
      console.error('Failed to get search suggestions:', error)
      return []
    }
  }

  // Private helper methods

  private buildSearchQuery(
    filters: SearchFilters,
    embeddingModel: string,
    includeMetadata: boolean
  ): string {
    let query = `
      SELECT 
        t.id as transcript_id,
        t.client_id,
        c.name as client_name,
        t.date::text as date,
        t.transcript_count,
        t.notes,
        (1 - (te.embedding <=> $1::vector)) as similarity,
        (te.embedding <=> $1::vector) as distance
    `

    if (includeMetadata) {
      query += `,
        te.embedding_model,
        vector_dims(te.embedding) as dimensions,
        (te.metadata->>'tokenCount')::int as token_count,
        te.metadata->>'generatedAt' as generated_at
      `
    }

    query += `
      FROM transcript_embeddings te
      JOIN transcripts t ON te.transcript_id = t.id
      JOIN clients c ON t.client_id = c.id
      WHERE te.embedding_model = $4
        AND (1 - (te.embedding <=> $1::vector)) >= $2
    `

    let paramIndex = 5

    if (filters.clientIds && filters.clientIds.length > 0) {
      query += ` AND t.client_id = ANY($${paramIndex})`
      paramIndex++
    }

    if (filters.dateRange) {
      query += ` AND t.date >= $${paramIndex} AND t.date <= $${paramIndex + 1}`
      paramIndex += 2
    }

    if (filters.transcriptCountRange) {
      query += ` AND t.transcript_count >= $${paramIndex} AND t.transcript_count <= $${paramIndex + 1}`
      paramIndex += 2
    }

    if (filters.excludeTranscriptIds && filters.excludeTranscriptIds.length > 0) {
      query += ` AND t.id != ALL($${paramIndex})`
      paramIndex++
    }

    if (filters.includeNotes === false) {
      query += ` AND (t.notes IS NULL OR t.notes = '')`
    } else if (filters.includeNotes === true) {
      query += ` AND t.notes IS NOT NULL AND t.notes != ''`
    }

    query += `
      ORDER BY te.embedding <=> $1::vector
      LIMIT $3
    `

    return query
  }

  private buildSearchParams(
    embedding: number[],
    threshold: number,
    limit: number,
    filters: SearchFilters
  ): any[] {
    const params = [
      `[${embedding.join(',')}]`, // $1: embedding vector
      threshold,                   // $2: similarity threshold
      limit,                      // $3: limit
      'text-embedding-004'        // $4: embedding model
    ]

    if (filters.clientIds && filters.clientIds.length > 0) {
      params.push(filters.clientIds)
    }

    if (filters.dateRange) {
      params.push(filters.dateRange.startDate, filters.dateRange.endDate)
    }

    if (filters.transcriptCountRange) {
      params.push(filters.transcriptCountRange.min, filters.transcriptCountRange.max)
    }

    if (filters.excludeTranscriptIds && filters.excludeTranscriptIds.length > 0) {
      params.push(filters.excludeTranscriptIds)
    }

    return params
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

      // Convert pgvector string to array
      const vectorString = result.rows[0].embedding
      return vectorString
        .replace(/[\[\]]/g, '')
        .split(',')
        .map((num: string) => parseFloat(num.trim()))
    } catch (error) {
      console.error('Failed to get transcript embedding:', error)
      return null
    }
  }

  private async getPatternEmbeddings(
    patternType: string,
    clientId?: string,
    timeWindow: number = 30
  ): Promise<Array<{
    id: string
    clientId: string
    clientName: string
    embedding: number[]
  }>> {
    // This is a simplified implementation
    // In practice, you'd have pre-computed pattern embeddings
    const pool = await this.getPool()

    try {
      let query = `
        SELECT 
          te.id,
          t.client_id,
          c.name as client_name,
          te.embedding
        FROM transcript_embeddings te
        JOIN transcripts t ON te.transcript_id = t.id
        JOIN clients c ON t.client_id = c.id
        WHERE t.date >= NOW() - INTERVAL '${timeWindow} days'
      `

      const params: any[] = []
      if (clientId) {
        query += ` AND t.client_id = $1`
        params.push(clientId)
      }

      query += ` ORDER BY t.date DESC LIMIT 50`

      const result = await pool.query(query, params)

      return result.rows.map(row => ({
        id: row.id,
        clientId: row.client_id,
        clientName: row.client_name,
        embedding: row.embedding
          .replace(/[\[\]]/g, '')
          .split(',')
          .map((num: string) => parseFloat(num.trim()))
      }))
    } catch (error) {
      console.error('Failed to get pattern embeddings:', error)
      return []
    }
  }

  private calculatePatternStrength(transcripts: SimilaritySearchResult[]): number {
    if (transcripts.length === 0) return 0
    
    const avgSimilarity = transcripts.reduce((sum, t) => sum + t.similarity, 0) / transcripts.length
    const consistencyBonus = transcripts.length >= 5 ? 0.1 : 0
    
    return Math.min(avgSimilarity + consistencyBonus, 1.0)
  }

  private calculatePatternConfidence(
    transcripts: SimilaritySearchResult[],
    patternType: string
  ): number {
    // Simplified confidence calculation
    const baseConfidence = Math.min(transcripts.length / 10, 1.0)
    const similarityConfidence = transcripts.reduce((sum, t) => sum + t.similarity, 0) / transcripts.length
    
    return (baseConfidence + similarityConfidence) / 2
  }

  private generatePatternDescription(
    patternType: string,
    transcripts: SimilaritySearchResult[]
  ): string {
    const avgCount = transcripts.reduce((sum, t) => sum + t.transcriptCount, 0) / transcripts.length
    const clientCount = new Set(transcripts.map(t => t.clientId)).size
    
    return `${patternType} pattern found across ${clientCount} clients with average ${avgCount.toFixed(1)} transcripts`
  }

  private async getEmbeddingsForClustering(options: {
    clientIds?: string[]
    dateRange?: { startDate: string, endDate: string }
    embeddingModel: string
  }): Promise<Array<{
    transcriptId: string
    clientId: string
    embedding: number[]
  }>> {
    const pool = await this.getPool()

    try {
      let query = `
        SELECT 
          te.transcript_id,
          t.client_id,
          te.embedding
        FROM transcript_embeddings te
        JOIN transcripts t ON te.transcript_id = t.id
        WHERE te.embedding_model = $1
      `

      const params = [options.embeddingModel]
      let paramIndex = 2

      if (options.clientIds && options.clientIds.length > 0) {
        query += ` AND t.client_id = ANY($${paramIndex})`
        params.push(options.clientIds)
        paramIndex++
      }

      if (options.dateRange) {
        query += ` AND t.date >= $${paramIndex} AND t.date <= $${paramIndex + 1}`
        params.push(options.dateRange.startDate, options.dateRange.endDate)
      }

      const result = await pool.query(query, params)

      return result.rows.map(row => ({
        transcriptId: row.transcript_id,
        clientId: row.client_id,
        embedding: row.embedding
          .replace(/[\[\]]/g, '')
          .split(',')
          .map((num: string) => parseFloat(num.trim()))
      }))
    } catch (error) {
      console.error('Failed to get embeddings for clustering:', error)
      return []
    }
  }

  private async performKMeansClustering(
    embeddings: Array<{ transcriptId: string, clientId: string, embedding: number[] }>,
    numClusters: number
  ): Promise<TranscriptCluster[]> {
    // Simplified k-means implementation
    // In production, you'd use a proper ML library
    
    const clusters: TranscriptCluster[] = []
    const dimensions = embeddings[0].embedding.length

    // Initialize centroids randomly
    for (let i = 0; i < numClusters; i++) {
      const centroid = new Array(dimensions).fill(0).map(() => Math.random() - 0.5)
      clusters.push({
        clusterId: `cluster_${i}`,
        centroid,
        transcripts: [],
        size: 0,
        cohesion: 0,
        description: `Cluster ${i + 1}`,
        characteristics: []
      })
    }

    // Assign embeddings to clusters (simplified)
    for (const item of embeddings) {
      let bestCluster = 0
      let bestDistance = Infinity

      for (let i = 0; i < clusters.length; i++) {
        const distance = this.calculateEuclideanDistance(item.embedding, clusters[i].centroid)
        if (distance < bestDistance) {
          bestDistance = distance
          bestCluster = i
        }
      }

      // This would need to be converted to SimilaritySearchResult format
      // Simplified for now
      clusters[bestCluster].size++
    }

    return clusters.filter(cluster => cluster.size > 0)
  }

  private calculateEuclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0))
  }

  private calculateSilhouetteScore(
    embeddings: Array<{ transcriptId: string, clientId: string, embedding: number[] }>,
    clusters: TranscriptCluster[]
  ): number {
    // Simplified silhouette score calculation
    return 0.5 // Placeholder
  }

  private async getRecentTranscripts(
    clientId: string,
    timeWindow: number
  ): Promise<SimilaritySearchResult[]> {
    const pool = await this.getPool()

    try {
      const result = await pool.query(`
        SELECT 
          t.id as transcript_id,
          t.client_id,
          c.name as client_name,
          t.date::text as date,
          t.transcript_count,
          t.notes
        FROM transcripts t
        JOIN clients c ON t.client_id = c.id
        WHERE t.client_id = $1 
          AND t.date >= NOW() - INTERVAL '${timeWindow} days'
        ORDER BY t.date DESC
      `, [clientId])

      return result.rows.map(row => ({
        transcriptId: row.transcript_id,
        clientId: row.client_id,
        clientName: row.client_name,
        date: row.date,
        transcriptCount: row.transcript_count,
        notes: row.notes,
        similarity: 1.0,
        distance: 0.0,
        rank: 1
      }))
    } catch (error) {
      console.error('Failed to get recent transcripts:', error)
      return []
    }
  }

  private async createTemporalPatternEmbedding(
    transcripts: SimilaritySearchResult[]
  ): Promise<number[]> {
    // Create a temporal pattern representation
    const pattern = transcripts.map(t => ({
      dayOfWeek: new Date(t.date).getDay(),
      count: t.transcriptCount,
      hasNotes: !!t.notes
    }))

    // Generate embedding for the temporal pattern
    const patternText = pattern.map(p => 
      `Day ${p.dayOfWeek}: ${p.count} transcripts${p.hasNotes ? ' with notes' : ''}`
    ).join(', ')

    const embeddingResponse = await textEmbeddingService.generateQueryEmbedding(
      `Temporal pattern: ${patternText}`
    )

    return embeddingResponse.embedding
  }
}

// Export singleton instance
export const similaritySearchService = new SimilaritySearchService()