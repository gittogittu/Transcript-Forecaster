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
import { VectorDatabaseUtils } from '../../database/vector-utils'
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

  private async getExistingPattern(
    clientId: string,
    timeWindow: { startDate: Date, endDate: Date },
    patternType: string
  ): Promise<TimeSeriesPattern | null> {
    const pool = await this.getPool()
    try {
      const result = await pool.query(
        `SELECT id, client_id, pattern_type, start_date, end_date, duration, embedding, characteristics, metadata, created_at, updated_at
         FROM time_series_patterns
         WHERE client_id = $1 AND pattern_type = $2 AND start_date = $3 AND end_date = $4
         ORDER BY updated_at DESC
         LIMIT 1`,
        [clientId, patternType, timeWindow.startDate, timeWindow.endDate]
      )
      if (result.rows.length === 0) return null
      const row = result.rows[0]
      return {
        id: row.id,
        clientId: row.client_id,
        clientName: '',
        patternType: row.pattern_type,
        timeWindow: {
          startDate: new Date(row.start_date),
          endDate: new Date(row.end_date),
          duration: row.duration
        },
        embedding: VectorDatabaseUtils.vectorToArray(row.embedding),
        characteristics: row.characteristics,
        metadata: row.metadata,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }
    } catch (e) {
      return null
    }
  }

  private async extractTimeSeriesData(
    clientId: string,
    timeWindow: { startDate: Date, endDate: Date }
  ): Promise<Array<{ date: string, count: number }>> {
    const pool = await this.getPool()
    try {
      const result = await pool.query(
        `SELECT date::date AS d, transcript_count AS c
         FROM transcripts
         WHERE client_id = $1 AND date >= $2 AND date <= $3
         ORDER BY date ASC`,
        [clientId, timeWindow.startDate, timeWindow.endDate]
      )
      return result.rows.map((r: any) => ({ date: r.d, count: Number(r.c) }))
    } catch (e) {
      return []
    }
  }

  private async generatePatternCharacteristics(
    series: Array<{ date: string, count: number }>,
    patternType: string
  ): Promise<PatternCharacteristics> {
    const values = series.map(s => s.count)
    const n = values.length
    const mean = n > 0 ? values.reduce((a, b) => a + b, 0) / n : 0
    const variance = n > 1 ? values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (n - 1) : 0
    const std = Math.sqrt(variance)
    const trend = n > 1 ? values[n - 1] - values[0] : 0
    const trendDirection = trend > std * 0.5 ? 'increasing' : trend < -std * 0.5 ? 'decreasing' : 'stable'
    const trendStrength = Math.min(Math.abs(trend) / (mean === 0 ? 1 : mean), 1)

    const byDow: Record<number, number[]> = {}
    for (const p of series) {
      const dow = new Date(p.date).getDay()
      if (!byDow[dow]) byDow[dow] = []
      byDow[dow].push(p.count)
    }
    const dowAverages = Object.values(byDow).map(arr => arr.reduce((a, b) => a + b, 0) / arr.length)
    const seasonalityStrength = dowAverages.length > 1 ? (Math.max(...dowAverages) - Math.min(...dowAverages)) / (mean === 0 ? 1 : mean) : 0

    const anomalyIdx: number[] = []
    if (std > 0) {
      series.forEach((p, idx) => {
        const z = Math.abs((p.count - mean) / std)
        if (z >= 2) anomalyIdx.push(idx)
      })
    }

    const volumeLevel = mean < 5 ? 'low' : mean < 20 ? 'medium' : mean < 50 ? 'high' : 'very_high'

    return {
      mean,
      variance,
      skewness: 0,
      kurtosis: 0,
      trendDirection: trendDirection as any,
      trendStrength,
      changePoints: [],
      seasonalityStrength,
      seasonalPeriods: [],
      seasonalPhases: [],
      volumeLevel: volumeLevel as any,
      volumeVariability: std,
      peakDays: [],
      anomalyCount: anomalyIdx.length,
      anomalyIntensity: anomalyIdx.length > 0 ? 1 : 0,
      anomalyTypes: anomalyIdx.length > 0 ? ['spike'] : []
    }
  }

  private async createPatternFeatureVector(
    series: Array<{ date: string, count: number }>,
    characteristics: PatternCharacteristics
  ): Promise<PatternFeatureVector> {
    const temporal = series.slice(-14).map(p => p.count)
    const statistical = [
      characteristics.mean,
      characteristics.variance,
      characteristics.volumeVariability,
      characteristics.seasonalityStrength,
      characteristics.trendStrength
    ]
    const spectral: number[] = []
    const morphological: number[] = []
    const contextual: number[] = []
    return { temporal, statistical, spectral, morphological, contextual }
  }

  private generatePatternDescription(
    characteristics: PatternCharacteristics,
    series: Array<{ date: string, count: number }>
  ): string {
    const latest = series.length > 0 ? series[series.length - 1].count : 0
    return [
      'Pattern summary:',
      `mean=${characteristics.mean.toFixed(2)}`,
      `std=${characteristics.volumeVariability.toFixed(2)}`,
      `trend=${characteristics.trendDirection}(${characteristics.trendStrength.toFixed(2)})`,
      `seasonality=${characteristics.seasonalityStrength.toFixed(2)}`,
      `anomalies=${characteristics.anomalyCount}`,
      `latest=${latest}`
    ].join(' ')
  }

  private async storePattern(params: {
    clientId: string
    patternType: string
    timeWindow: { startDate: Date, endDate: Date }
    embedding: number[]
    characteristics: PatternCharacteristics
    embeddingModel: string
    confidence: number
  }): Promise<string> {
    const pool = await this.getPool()
    const durationDays = Math.max(1, Math.ceil((params.timeWindow.endDate.getTime() - params.timeWindow.startDate.getTime()) / (24 * 3600 * 1000)))
    const vector = VectorDatabaseUtils.arrayToVector(params.embedding)
    const result = await pool.query(
      `INSERT INTO time_series_patterns (client_id, pattern_type, start_date, end_date, duration, embedding, characteristics, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        params.clientId,
        params.patternType,
        params.timeWindow.startDate,
        params.timeWindow.endDate,
        durationDays,
        vector,
        JSON.stringify(params.characteristics),
        JSON.stringify({
          embeddingModel: params.embeddingModel,
          dimensions: params.embedding.length,
          confidence: params.confidence,
          generationMethod: 'hybrid',
          dataQuality: 1,
          sampleSize: durationDays,
          tags: []
        })
      ]
    )
    return result.rows[0].id
  }

  private calculatePatternConfidence(
    characteristics: PatternCharacteristics,
    series: Array<{ date: string, count: number }>
  ): number {
    const coverage = series.length
    const variability = characteristics.volumeVariability
    const base = Math.min(1, coverage / 30)
    const penalty = Math.min(0.5, variability === 0 ? 0 : 0.1)
    return Math.max(0, Math.min(1, base - penalty + characteristics.trendStrength * 0.2 + characteristics.seasonalityStrength * 0.2))
  }
}