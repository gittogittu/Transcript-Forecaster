/**
 * Types for Vector-Based Pattern Matching and Similarity System
 * 
 * Supports Requirements 4.1, 4.2, 8.1, 10.1:
 * - Pattern embedding generation for time-series data
 * - Similarity search for finding clients with similar patterns
 * - Pattern classification and clustering using vector embeddings
 * - Historical pattern matching for prediction improvement
 * - Pattern-based recommendation system for similar clients
 */

export interface TimeSeriesPattern {
  id: string
  clientId: string
  clientName: string
  patternType: 'seasonal' | 'trend' | 'anomaly' | 'volume' | 'cyclical' | 'growth'
  timeWindow: {
    startDate: Date
    endDate: Date
    duration: number // days
  }
  embedding: number[]
  characteristics: PatternCharacteristics
  metadata: PatternMetadata
  createdAt: Date
  updatedAt: Date
}

export interface PatternCharacteristics {
  // Statistical features
  mean: number
  variance: number
  skewness: number
  kurtosis: number
  
  // Trend features
  trendDirection: 'increasing' | 'decreasing' | 'stable' | 'volatile'
  trendStrength: number
  changePoints: number[]
  
  // Seasonal features
  seasonalityStrength: number
  seasonalPeriods: number[]
  seasonalPhases: number[]
  
  // Volume features
  volumeLevel: 'low' | 'medium' | 'high' | 'very_high'
  volumeVariability: number
  peakDays: number[]
  
  // Anomaly features
  anomalyCount: number
  anomalyIntensity: number
  anomalyTypes: string[]
}

export interface PatternMetadata {
  embeddingModel: string
  dimensions: number
  confidence: number
  dataQuality: number
  sampleSize: number
  generationMethod: 'statistical' | 'ml_based' | 'hybrid'
  tags: string[]
}

export interface PatternEmbeddingRequest {
  clientId: string
  timeWindow: {
    startDate: Date
    endDate: Date
  }
  patternType?: 'seasonal' | 'trend' | 'anomaly' | 'volume' | 'cyclical' | 'growth'
  embeddingModel?: string
  forceRegenerate?: boolean
}

export interface PatternEmbeddingResult {
  patternId: string
  embedding: number[]
  characteristics: PatternCharacteristics
  confidence: number
  processingTime: number
  success: boolean
  error?: string
}

export interface SimilaritySearchQuery {
  sourcePatternId?: string
  sourceClientId?: string
  queryEmbedding?: number[]
  patternTypes?: string[]
  timeWindowDays?: number
  similarityThreshold?: number
  limit?: number
  filters?: PatternSearchFilters
}

export interface PatternSearchFilters {
  clientIds?: string[]
  excludeClientIds?: string[]
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  volumeLevels?: string[]
  trendDirections?: string[]
  minConfidence?: number
  maxAge?: number // days
  tags?: string[]
}

export interface SimilarPatternResult {
  patternId: string
  clientId: string
  clientName: string
  patternType: string
  similarity: number
  distance: number
  confidence: number
  timeWindow: {
    startDate: Date
    endDate: Date
  }
  characteristics: PatternCharacteristics
  explanation: string
  rank: number
}

export interface PatternClusteringRequest {
  clientIds?: string[]
  patternTypes?: string[]
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  numClusters?: number
  minClusterSize?: number
  clusteringMethod?: 'kmeans' | 'hierarchical' | 'dbscan'
  embeddingModel?: string
}

export interface PatternCluster {
  clusterId: string
  centroid: number[]
  patterns: SimilarPatternResult[]
  size: number
  cohesion: number
  separation: number
  dominantCharacteristics: Partial<PatternCharacteristics>
  description: string
  representativePattern?: SimilarPatternResult
}

export interface PatternClusteringResult {
  clusters: PatternCluster[]
  totalPatterns: number
  silhouetteScore: number
  inertia: number
  processingTime: number
  clusteringMethod: string
}

export interface HistoricalPatternMatch {
  historicalPatternId: string
  currentPatternId: string
  matchStrength: number
  temporalDistance: number // days between patterns
  contextSimilarity: number
  predictionImprovement: number
  confidence: number
  explanation: string
}

export interface PatternBasedRecommendation {
  id: string
  targetClientId: string
  targetClientName: string
  recommendationType: 'capacity_planning' | 'resource_allocation' | 'trend_preparation' | 'anomaly_prevention'
  priority: 'low' | 'medium' | 'high' | 'critical'
  
  // Source patterns that led to this recommendation
  sourcePatterns: SimilarPatternResult[]
  
  // Recommendation details
  title: string
  description: string
  actionItems: RecommendationAction[]
  expectedImpact: string
  timeframe: string
  confidence: number
  
  // Supporting data
  historicalEvidence: HistoricalPatternMatch[]
  riskFactors: string[]
  successProbability: number
  
  createdAt: Date
  expiresAt?: Date
}

export interface RecommendationAction {
  id: string
  action: string
  description: string
  priority: number
  estimatedEffort: 'low' | 'medium' | 'high'
  expectedOutcome: string
  deadline?: Date
  dependencies?: string[]
}

export interface PatternClassificationRequest {
  patternId?: string
  clientId?: string
  timeWindow?: {
    startDate: Date
    endDate: Date
  }
  embedding?: number[]
  classificationModel?: string
}

export interface PatternClassificationResult {
  patternId: string
  primaryClass: string
  confidence: number
  secondaryClasses: Array<{
    class: string
    confidence: number
  }>
  characteristics: PatternCharacteristics
  explanation: string
  recommendations: string[]
}

export interface PatternEvolutionAnalysis {
  clientId: string
  clientName: string
  timeRange: {
    startDate: Date
    endDate: Date
  }
  patterns: TimeSeriesPattern[]
  evolution: {
    trendChanges: Array<{
      date: Date
      fromTrend: string
      toTrend: string
      significance: number
    }>
    seasonalityChanges: Array<{
      date: Date
      change: string
      impact: number
    }>
    volumeShifts: Array<{
      date: Date
      fromLevel: string
      toLevel: string
      magnitude: number
    }>
  }
  predictions: {
    nextPatternType: string
    confidence: number
    expectedDuration: number
    riskFactors: string[]
  }
}

export interface PatternMatchingConfig {
  embeddingModel: string
  defaultTimeWindow: number
  similarityThreshold: number
  minPatternDuration: number
  maxPatternAge: number
  clusteringParams: {
    defaultClusters: number
    minClusterSize: number
    maxIterations: number
  }
  recommendationParams: {
    minConfidence: number
    maxRecommendations: number
    expirationDays: number
  }
}

export interface PatternMatchingStats {
  totalPatterns: number
  patternsByType: Record<string, number>
  patternsByClient: Record<string, number>
  averageConfidence: number
  embeddingModels: Record<string, number>
  clusteringStats: {
    totalClusters: number
    averageClusterSize: number
    averageSilhouetteScore: number
  }
  recommendationStats: {
    totalRecommendations: number
    activeRecommendations: number
    averageConfidence: number
    successRate: number
  }
  lastUpdated: Date
}

// Utility types for pattern analysis
export interface PatternFeatureVector {
  temporal: number[]      // Time-based features (hour, day, week, month patterns)
  statistical: number[]   // Statistical moments and distributions
  spectral: number[]      // Frequency domain features
  morphological: number[] // Shape and structure features
  contextual: number[]    // Business context features
}

export interface PatternSimilarityMetrics {
  cosine: number
  euclidean: number
  manhattan: number
  pearson: number
  spearman: number
  dtw: number // Dynamic Time Warping distance
}

export interface PatternValidationResult {
  isValid: boolean
  confidence: number
  issues: Array<{
    type: 'data_quality' | 'insufficient_data' | 'anomalous_pattern' | 'temporal_gap'
    severity: 'low' | 'medium' | 'high'
    description: string
    suggestion?: string