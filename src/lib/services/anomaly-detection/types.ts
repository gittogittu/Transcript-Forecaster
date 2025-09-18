// Anomaly Detection Types

export interface TimeSeriesData {
  timestamps: Date[]
  values: number[]
  clientId?: string
  metadata?: Record<string, any>
}

export type AnomalyType = 'point' | 'contextual' | 'collective'
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'
export type DetectionMethod = 'z_score' | 'iqr' | 'seasonal_decomposition' | 'isolation_forest' | 'ensemble'

export interface DetectedAnomaly {
  id: string
  clientId: string
  timestamp: Date
  actualValue: number
  expectedValue: number
  deviationScore: number
  type: AnomalyType
  severity: AnomalySeverity
  detectionMethod: DetectionMethod
  explanation: string
  confidence: number
  isResolved: boolean
  metadata?: Record<string, any>
}

export interface AnomalyDetectionResult {
  anomalies: DetectedAnomaly[]
  overallSeverity: AnomalySeverity
  detectionSummary: string
  recommendedActions: string[]
  confidence: number
  processingTime: number
}

export interface AnomalyAlert {
  id: string
  anomalyId: string
  severity: AnomalySeverity
  title: string
  message: string
  timestamp: Date
  clientId: string
  isAcknowledged: boolean
  recommendedActions: string[]
}

export interface AnomalyExplanation {
  anomalyId: string
  primaryCause: string
  contributingFactors: string[]
  historicalContext: string
  businessImpact: string
  confidence: number
}

export interface AnomalyRecommendation {
  id: string
  anomalyId: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'immediate' | 'preventive' | 'investigative'
  title: string
  description: string
  expectedOutcome: string
  implementationEffort: 'low' | 'medium' | 'high'
  timeframe: string
}

export interface StatisticalAnomalyConfig {
  zScoreThreshold: number
  iqrMultiplier: number
  seasonalPeriods: number[]
  windowSize: number
  minDataPoints: number
}

export interface IsolationForestConfig {
  nEstimators: number
  maxSamples: number | string
  contamination: number
  maxFeatures: number
  randomState?: number
}

export interface RealTimeMonitorConfig {
  checkInterval: number // milliseconds
  batchSize: number
  alertThreshold: AnomalySeverity
  enableAutoRetraining: boolean
  maxAlertsPerHour: number
}

export interface SeasonalDecomposition {
  trend: number[]
  seasonal: number[]
  residual: number[]
  timestamps: Date[]
}

export interface StatisticalMetrics {
  mean: number
  std: number
  median: number
  q1: number
  q3: number
  iqr: number
  min: number
  max: number
}

export interface AnomalyPattern {
  patternType: 'spike' | 'drop' | 'drift' | 'oscillation' | 'level_shift'
  duration: number
  magnitude: number
  frequency?: number
}

export interface ContextualFeatures {
  dayOfWeek: number
  hourOfDay: number
  isHoliday: boolean
  isWeekend: boolean
  seasonalIndex: number
  trendValue: number
}