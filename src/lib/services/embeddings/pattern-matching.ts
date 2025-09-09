/**
 * Vector-Based Pattern Matching and Similarity System
 * 
 * This service implements advanced pattern matching capabilities using vector embeddings:
 * - Pattern embedding generation for time-series data
 * - Similarity search for finding clients with similar patterns
 * - Pattern classification and clustering using vector embeddings
 * - Historical pattern matching for prediction improvement
 * - Pattern-based recommendation system for similar clients
 * 
 * Requirements: 4.1, 4.2, 8.1, 10.1
 */

import { Pool } from 'pg'
import { getDatabasePool } from '../../database/connection'
import { textEmbeddingService } from './text-embedding'
import { vectorUtils } from '../../database/vector-utils'
import {
  TimeSeriesPattern,
  PatternCharacteristics,
  PatternEmbeddingRequest,
  PatternEmbeddingResult,
  SimilaritySearchQuery,
  SimilarPatternResult,
  PatternClusteringRequest,
  PatternClusteringResult,
  PatternCluster,
  HistoricalPatternMatch,
  PatternBasedRecommendation,
  PatternClassificationRequest,
  PatternClassificationResult,
  PatternEvolutionAnalysis,
  PatternMatchingStats,
  PatternFeatureVector,
  PatternSimilarityMetrics
} from '../../../types/pattern-matching'

export class PatternMatchingService {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = await getDatabasePool()
    }
    return this.pool
  }

  /**
   * Generate pattern embedding for time-series data
   * Requirement 4.1: Pattern embedding generation for time-series data
   */
  async generatePatternEmbedding(request: PatternEmbeddingRequest): Promise<PatternEmbeddingResult> {
    const startTime = Date.now()
    const { 
      clientId, 
      timeWindow, 
      patternType = 'volume',
      embeddingModel = 'text-embedding-004',
      forceRegenerate = false 
    } = request

    try {
      // Check if pattern embedding already exists
      if (!forceRegenerate) {
        const existingPattern = await this.getExistingPattern(clientId, timeWindow, patternType)
        if (existingPattern) {
          return {
            patternId: existingPattern.id,
            embedding: existingPattern.embedding,
            characteristics: existingPattern.characteristics,
            confidence: existingPattern.metadata.confidence,
            processingTime: Date.now() - startTime,
            success: true
          }
        }
      }

      // Extract time-series data for the specified window
      const timeSeriesData = await this.extractTimeSeriesData(clientId, timeWindow)
      if (timeSeriesData.length === 0) {
        throw new Error(`No data found for client ${clientId} in the specified time window`)
      }

      // Generate pattern characteristics
      const characteristics = await this.generatePatternCharacteristics(timeSeriesData, patternType)
      
      // Create feature vector for embedding
      const featureVector = await this.createPatternFeatureVector(timeSeriesData, characteristics)
      
      // Generate text representation for embedding
      const patternDescription = this.generatePatternDescription(characteristics, timeSeriesData)
      
      // Generate embedding using text embedding service
      const embeddingResponse = await textEmbeddingService.generateQueryEmbedding(patternDescription)
      
      // Store pattern in database
      const patternId = await this.storePattern({
        clientId,
        patternType,
        timeWindow,
        embedding: embeddingResponse.embedding,
        characteristics,
        embeddingModel,
        confidence: this.calculatePatternConfidence(characteristics, timeSeriesData)
      })

      return {
        patternId,
        embedding: embeddingResponse.embedding,
        characteristics,
        confidence: this.calculatePatternConfidence(characteristics, timeSeriesData),
        processingTime: Date.now() - startTime,
        success: true
      }
    } catch (error) {
      console.error('Pattern embedding generation failed:', error)
      return {
        patternId: '',
        embedding: [],
        characteristics: {} as PatternCharacteristics,
        confidence: 0,
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }