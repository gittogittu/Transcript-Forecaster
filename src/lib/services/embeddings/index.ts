/**
 * Embedding Services Index
 * 
 * Central export point for all embedding-related services:
 * - Text embedding generation
 * - Transcript vectorization pipeline
 * - Similarity search functionality
 */

// Core services
export { TextEmbeddingService } from './text-embedding-demo'
export { transcriptVectorizationService, TranscriptVectorizationService } from './transcript-vectorization'
export { similaritySearchService, SimilaritySearchService } from './similarity-search'
export { PatternMatchingService } from './pattern-matching'
// export const patternMatchingService = new PatternMatchingService()

// Types for text embedding
export type {
  EmbeddingRequest,
  EmbeddingResponse,
  BatchEmbeddingRequest,
  BatchEmbeddingResponse
} from './text-embedding'

// Types for transcript vectorization
export type {
  TranscriptData,
  VectorizationRequest,
  BatchVectorizationRequest,
  VectorizationResult,
  BatchVectorizationResult,
  SimilarTranscript
} from './transcript-vectorization'

// Types for similarity search
export type {
  SimilaritySearchRequest,
  SearchFilters,
  SimilaritySearchResult,
  PatternSearchRequest,
  PatternSearchResult,
  ClusteringRequest,
  ClusteringResult,
  TranscriptCluster
} from './similarity-search'

/**
 * Unified Embedding Service
 * 
 * High-level service that orchestrates all embedding operations
 */
export class EmbeddingService {
  /**
   * Initialize embeddings for all transcripts
   */
  static async initializeAllEmbeddings(options: {
    forceRegenerate?: boolean
    batchSize?: number
    embeddingModel?: 'text-embedding-004' | 'text-embedding-gecko'
  } = {}) {
    const { forceRegenerate = false, batchSize = 50, embeddingModel = 'text-embedding-004' } = options

    console.log('🚀 Starting embedding initialization...')
    
    const result = await transcriptVectorizationService.batchVectorizeTranscripts({
      forceRegenerate,
      batchSize,
      embeddingModel
    })

    console.log(`✅ Embedding initialization complete:`)
    console.log(`   - Total processed: ${result.totalProcessed}`)
    console.log(`   - Successful: ${result.successCount}`)
    console.log(`   - Errors: ${result.errorCount}`)
    console.log(`   - Total time: ${(result.totalProcessingTime / 1000).toFixed(2)}s`)
    console.log(`   - Average time per transcript: ${result.averageProcessingTime.toFixed(0)}ms`)

    return result
  }

  /**
   * Search transcripts by natural language query
   */
  static async searchByQuery(
    query: string,
    options: {
      limit?: number
      threshold?: number
      clientId?: string
      dateRange?: { startDate: string, endDate: string }
    } = {}
  ) {
    const { limit = 10, threshold = 0.6, clientId, dateRange } = options

    const filters: any = {}
    if (clientId) filters.clientIds = [clientId]
    if (dateRange) filters.dateRange = dateRange

    return similaritySearchService.search({
      query,
      limit,
      threshold,
      filters,
      includeMetadata: true
    })
  }

  /**
   * Find similar transcripts to a given transcript
   */
  static async findSimilarTranscripts(
    transcriptId: string,
    options: {
      limit?: number
      threshold?: number
      embeddingModel?: string
    } = {}
  ) {
    const { limit = 10, threshold = 0.7, embeddingModel = 'text-embedding-004' } = options

    return transcriptVectorizationService.findSimilarTranscripts(
      transcriptId,
      limit,
      threshold,
      embeddingModel
    )
  }

  /**
   * Discover patterns across transcripts
   */
  static async discoverPatterns(options: {
    patternType?: 'seasonal' | 'trend' | 'anomaly' | 'volume'
    clientId?: string
    timeWindow?: number
    minSimilarity?: number
    limit?: number
  } = {}) {
    const {
      patternType = 'volume',
      clientId,
      timeWindow = 30,
      minSimilarity = 0.7,
      limit = 5
    } = options

    return similaritySearchService.searchPatterns({
      patternType,
      clientId,
      timeWindow,
      minSimilarity,
      limit
    })
  }

  /**
   * Cluster transcripts by similarity
   */
  static async clusterTranscripts(options: {
    clientIds?: string[]
    dateRange?: { startDate: string, endDate: string }
    numClusters?: number
    minClusterSize?: number
  } = {}) {
    const { clientIds, dateRange, numClusters = 5, minClusterSize = 3 } = options

    return similaritySearchService.clusterTranscripts({
      clientIds,
      dateRange,
      numClusters,
      minClusterSize
    })
  }

  /**
   * Get embedding system statistics
   */
  static async getSystemStats() {
    const vectorizationStats = await transcriptVectorizationService.getVectorizationStats()
    
    return {
      vectorization: vectorizationStats,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Vectorize a single transcript
   */
  static async vectorizeTranscript(
    transcriptId: string,
    options: {
      forceRegenerate?: boolean
      embeddingModel?: 'text-embedding-004' | 'text-embedding-gecko'
    } = {}
  ) {
    const { forceRegenerate = false, embeddingModel = 'text-embedding-004' } = options

    return transcriptVectorizationService.vectorizeTranscript({
      transcriptId,
      forceRegenerate,
      embeddingModel
    })
  }

  /**
   * Get search suggestions for autocomplete
   */
  static async getSearchSuggestions(partialQuery: string, limit: number = 5) {
    return similaritySearchService.getSearchSuggestions(partialQuery, limit)
  }

  /**
   * Find temporal patterns for a client
   */
  static async findTemporalPatterns(
    clientId: string,
    options: {
      timeWindow?: number
      minSimilarity?: number
    } = {}
  ) {
    const { timeWindow = 30, minSimilarity = 0.8 } = options

    return similaritySearchService.findTemporalPatterns(clientId, timeWindow, minSimilarity)
  }

  /**
   * Cleanup old or invalid embeddings
   */
  static async cleanupEmbeddings(options: {
    olderThanDays?: number
    invalidModels?: string[]
    dryRun?: boolean
  } = {}) {
    return transcriptVectorizationService.cleanupEmbeddings(options)
  }

  /**
   * Generate and store a time-series pattern embedding
   */
  static async generatePatternEmbedding(options: {
    clientId: string
    timeWindow: { startDate: Date, endDate: Date }
    patternType?: 'seasonal' | 'trend' | 'anomaly' | 'volume' | 'cyclical' | 'growth'
    embeddingModel?: string
    forceRegenerate?: boolean
  }) {
    return patternMatchingService.generatePatternEmbedding(options)
  }
}

// Export the unified service as default
export default EmbeddingService