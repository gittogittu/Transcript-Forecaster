/**
 * Pattern Embedding Generator
 * Handles pattern embedding generation for time-series data
 * Requirement 4.1: Pattern embedding generation for time-series data
 */

import { Pool } from 'pg'
import { getDatabasePool } from '../../database/connection'
import { textEmbeddingService } from './text-embedding'
import {
  PatternEmbeddingRequest,
  PatternEmbeddingResult,
  PatternCharacteristics,
  TimeSeriesPattern
} from '../../../types/pattern-matching'

export class PatternEmbeddingGenerator {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = await getDatabasePool()
    }
    return this.pool
  }

  /**
   * Generate pattern embedding for time-series data
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

  /**
   * Extract time-series data for pattern analysis
   */
  private async extractTimeSeriesData(clientId: string, timeWindow: { startDate: Date, endDate: Date }) {
    const pool = await this.getPool()
    
    const result = await pool.query(`
      SELECT 
        date,
        transcript_count,
        notes,
        EXTRACT(DOW FROM date) as day_of_week,
        EXTRACT(HOUR FROM created_at) as hour_of_day
      FROM transcripts
      WHERE client_id = $1 
        AND date >= $2 
        AND date <= $3
      ORDER BY date ASC
    `, [clientId, timeWindow.startDate, timeWindow.endDate])

    return result.rows.map(row => ({
      date: new Date(row.date),
      count: row.transcript_count,
      notes: row.notes,
      dayOfWeek: row.day_of_week,
      hourOfDay: row.hour_of_day
    }))
  }

  /**
   * Generate pattern characteristics from time-series data
   */
  private async generatePatternCharacteristics(
    timeSeriesData: any[], 
    patternType: string
  ): Promise<PatternCharacteristics> {
    const counts = timeSeriesData.map(d => d.count)
    
    // Statistical features
    const mean = counts.reduce((sum, val) => sum + val, 0) / counts.length
    const variance = counts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / counts.length
    const skewness = this.calculateSkewness(counts, mean, Math.sqrt(variance))
    const kurtosis = this.calculateKurtosis(counts, mean, Math.sqrt(variance))

    // Trend analysis
    const trendAnalysis = this.analyzeTrend(counts)
    
    // Seasonal analysis
    const seasonalAnalysis = this.analyzeSeasonality(timeSeriesData)
    
    // Volume analysis
    const volumeAnalysis = this.analyzeVolume(counts)
    
    // Anomaly detection
    const anomalyAnalysis = this.detectAnomalies(counts)

    return {
      mean,
      variance,
      skewness,
      kurtosis,
      trendDirection: trendAnalysis.direction,
      trendStrength: trendAnalysis.strength,
      changePoints: trendAnalysis.changePoints,
      seasonalityStrength: seasonalAnalysis.strength,
      seasonalPeriods: seasonalAnalysis.periods,
      seasonalPhases: seasonalAnalysis.phases,
      volumeLevel: volumeAnalysis.level,
      volumeVariability: volumeAnalysis.variability,
      peakDays: volumeAnalysis.peakDays,
      anomalyCount: anomalyAnalysis.count,
      anomalyIntensity: anomalyAnalysis.intensity,
      anomalyTypes: anomalyAnalysis.types
    }
  }

  /**
   * Generate text description for pattern embedding
   */
  private generatePatternDescription(characteristics: PatternCharacteristics, timeSeriesData: any[]): string {
    const { mean, trendDirection, volumeLevel, seasonalityStrength, anomalyCount } = characteristics
    
    let description = `Time series pattern with ${volumeLevel} volume averaging ${mean.toFixed(1)} transcripts. `
    description += `Trend is ${trendDirection} with ${seasonalityStrength > 0.5 ? 'strong' : 'weak'} seasonality. `
    
    if (anomalyCount > 0) {
      description += `Contains ${anomalyCount} anomalies. `
    }
    
    // Add temporal context
    const dayPatterns = this.analyzeDayOfWeekPatterns(timeSeriesData)
    if (dayPatterns.length > 0) {
      description += `Peak activity on ${dayPatterns.join(', ')}. `
    }
    
    return description
  }

  // Helper methods for statistical calculations
  private calculateSkewness(values: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0
    const n = values.length
    const skew = values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0)
    return (n / ((n - 1) * (n - 2))) * skew
  }

  private calculateKurtosis(values: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0
    const n = values.length
    const kurt = values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0)
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurt - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3))
  }

  private analyzeTrend(counts: number[]) {
    // Simple linear regression for trend
    const n = counts.length
    const x = Array.from({ length: n }, (_, i) => i)
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = counts.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * counts[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const strength = Math.abs(slope) / (counts.reduce((sum, val) => sum + val, 0) / n)
    
    let direction: 'increasing' | 'decreasing' | 'stable' | 'volatile'
    if (Math.abs(slope) < 0.1) direction = 'stable'
    else if (slope > 0) direction = 'increasing'
    else direction = 'decreasing'
    
    // Detect change points (simplified)
    const changePoints: number[] = []
    for (let i = 1; i < counts.length - 1; i++) {
      const before = counts.slice(0, i)
      const after = counts.slice(i)
      const beforeMean = before.reduce((sum, val) => sum + val, 0) / before.length
      const afterMean = after.reduce((sum, val) => sum + val, 0) / after.length
      
      if (Math.abs(afterMean - beforeMean) > beforeMean * 0.3) {
        changePoints.push(i)
      }
    }
    
    return { direction, strength, changePoints }
  }

  private analyzeSeasonality(timeSeriesData: any[]) {
    // Analyze day-of-week patterns
    const dayOfWeekCounts: { [key: number]: number[] } = {}
    
    timeSeriesData.forEach(data => {
      if (!dayOfWeekCounts[data.dayOfWeek]) {
        dayOfWeekCounts[data.dayOfWeek] = []
      }
      dayOfWeekCounts[data.dayOfWeek].push(data.count)
    })
    
    // Calculate variance across days
    const dayAverages = Object.keys(dayOfWeekCounts).map(day => {
      const counts = dayOfWeekCounts[parseInt(day)]
      return counts.reduce((sum, val) => sum + val, 0) / counts.length
    })
    
    const overallMean = dayAverages.reduce((sum, val) => sum + val, 0) / dayAverages.length
    const seasonalVariance = dayAverages.reduce((sum, val) => sum + Math.pow(val - overallMean, 2), 0) / dayAverages.length
    const strength = seasonalVariance / (overallMean * overallMean)
    
    return {
      strength,
      periods: [7], // Weekly pattern
      phases: dayAverages
    }
  }

  private analyzeVolume(counts: number[]) {
    const mean = counts.reduce((sum, val) => sum + val, 0) / counts.length
    const max = Math.max(...counts)
    const variance = counts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / counts.length
    
    let level: 'low' | 'medium' | 'high' | 'very_high'
    if (mean < 5) level = 'low'
    else if (mean < 20) level = 'medium'
    else if (mean < 50) level = 'high'
    else level = 'very_high'
    
    const variability = Math.sqrt(variance) / mean
    
    // Find peak days (top 20% of days)
    const threshold = counts.sort((a, b) => b - a)[Math.floor(counts.length * 0.2)]
    const peakDays = counts.map((count, index) => count >= threshold ? index : -1).filter(i => i >= 0)
    
    return { level, variability, peakDays }
  }

  private detectAnomalies(counts: number[]) {
    const mean = counts.reduce((sum, val) => sum + val, 0) / counts.length
    const stdDev = Math.sqrt(counts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / counts.length)
    
    const anomalies = counts.filter(count => Math.abs(count - mean) > 2 * stdDev)
    const intensity = anomalies.length > 0 ? 
      anomalies.reduce((sum, val) => sum + Math.abs(val - mean), 0) / (anomalies.length * mean) : 0
    
    return {
      count: anomalies.length,
      intensity,
      types: anomalies.length > 0 ? ['statistical'] : []
    }
  }

  private analyzeDayOfWeekPatterns(timeSeriesData: any[]): string[] {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayTotals: { [key: number]: number } = {}
    
    timeSeriesData.forEach(data => {
      dayTotals[data.dayOfWeek] = (dayTotals[data.dayOfWeek] || 0) + data.count
    })
    
    const sortedDays = Object.entries(dayTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([day]) => dayNames[parseInt(day)])
    
    return sortedDays
  }

  private calculatePatternConfidence(characteristics: PatternCharacteristics, timeSeriesData: any[]): number {
    let confidence = 0.5 // Base confidence
    
    // Increase confidence based on data quality
    if (timeSeriesData.length >= 30) confidence += 0.2
    if (timeSeriesData.length >= 90) confidence += 0.1
    
    // Increase confidence for clear patterns
    if (characteristics.trendStrength > 0.3) confidence += 0.1
    if (characteristics.seasonalit