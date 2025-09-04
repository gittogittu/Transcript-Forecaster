// Types for automated insight generation engine

export interface BusinessInsight {
  id: string
  type: 'trend' | 'seasonal' | 'anomaly' | 'correlation' | 'forecast' | 'pattern'
  title: string
  description: string
  confidence: number // 0-1 scale
  impact: 'low' | 'medium' | 'high' | 'critical'
  timeframe: DateRange
  supportingData: SupportingData
  visualizations: VisualizationConfig[]
  createdAt: Date
  isActive: boolean
}

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface SupportingData {
  metrics: Record<string, number>
  correlations: CorrelationData[]
  statisticalTests: StatisticalTest[]
  dataPoints: DataPoint[]
}

export interface CorrelationData {
  factor: string
  correlation: number
  significance: number
  pValue: number
}

export interface StatisticalTest {
  testName: string
  statistic: number
  pValue: number
  significant: boolean
  interpretation: string
}

export interface DataPoint {
  timestamp: Date
  value: number
  metadata?: Record<string, any>
}

export interface VisualizationConfig {
  type: 'line' | 'bar' | 'scatter' | 'heatmap' | 'distribution'
  title: string
  data: any[]
  config: Record<string, any>
}

export interface Recommendation {
  id: string
  insightId: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'operational' | 'strategic' | 'tactical'
  title: string
  description: string
  expectedImpact: string
  implementationEffort: 'low' | 'medium' | 'high'
  timeframe: string
  metrics: string[]
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed'
  confidence: number
  businessValue: number
  createdAt: Date
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile'
  strength: number // 0-1 scale
  significance: number
  changeRate: number
  seasonality: SeasonalPattern[]
  changePoints: ChangePoint[]
  forecast: TrendForecast
}

export interface SeasonalPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  strength: number
  period: number
  phase: number
  confidence: number
}

export interface ChangePoint {
  timestamp: Date
  magnitude: number
  direction: 'increase' | 'decrease'
  confidence: number
  explanation: string
}

export interface TrendForecast {
  nextPeriods: number
  expectedDirection: 'up' | 'down' | 'stable'
  confidence: number
  expectedChange: number
}

export interface PatternRecognition {
  patterns: DetectedPattern[]
  similarities: PatternSimilarity[]
  anomalies: PatternAnomaly[]
  cyclicalBehavior: CyclicalBehavior[]
}

export interface DetectedPattern {
  id: string
  type: 'recurring' | 'seasonal' | 'trend' | 'cyclical' | 'irregular'
  description: string
  frequency: number
  strength: number
  confidence: number
  timeRange: DateRange
  examples: DataPoint[]
}

export interface PatternSimilarity {
  patternId: string
  similarPatterns: string[]
  similarity: number
  timeOffset: number
}

export interface PatternAnomaly {
  timestamp: Date
  expectedPattern: string
  actualValue: number
  expectedValue: number
  deviation: number
  severity: 'low' | 'medium' | 'high'
}

export interface CyclicalBehavior {
  cycle: string
  period: number
  amplitude: number
  phase: number
  regularity: number
}

export interface InsightGenerationRequest {
  clientId?: string
  timeRange: DateRange
  dataTypes: string[]
  analysisDepth: 'basic' | 'detailed' | 'comprehensive'
  includeRecommendations: boolean
  customFilters?: Record<string, any>
}

export interface InsightGenerationResult {
  insights: BusinessInsight[]
  recommendations: Recommendation[]
  trendAnalysis: TrendAnalysis
  patternRecognition: PatternRecognition
  summary: string
  confidence: number
  processingTime: number
}

export interface BusinessImpactAssessment {
  impactScore: number // 0-100 scale
  category: 'revenue' | 'cost' | 'efficiency' | 'risk' | 'quality'
  quantifiedImpact: QuantifiedImpact
  timeToImpact: string
  certainty: number
  dependencies: string[]
}

export interface QuantifiedImpact {
  metric: string
  currentValue: number
  projectedValue: number
  changePercent: number
  monetaryValue?: number
  currency?: string
}

export interface InsightValidation {
  validationScore: number // 0-1 scale
  validationMethods: ValidationMethod[]
  crossValidation: CrossValidationResult
  historicalAccuracy: number
  dataQuality: DataQualityScore
}

export interface ValidationMethod {
  method: string
  score: number
  details: string
}

export interface CrossValidationResult {
  folds: number
  averageScore: number
  standardDeviation: number
  consistency: number
}

export interface DataQualityScore {
  completeness: number
  accuracy: number
  consistency: number
  timeliness: number
  overall: number
}

export interface NaturalLanguageConfig {
  model: string
  temperature: number
  maxTokens: number
  language: string
  tone: 'professional' | 'casual' | 'technical'
  audience: 'executive' | 'analyst' | 'technical' | 'general'
}