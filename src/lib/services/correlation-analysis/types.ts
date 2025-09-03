/**
 * Types for correlation analysis and key influencer detection
 */

export interface ExternalFactor {
  id: string
  name: string
  type: 'holiday' | 'weather' | 'economic' | 'seasonal' | 'day_of_week' | 'custom'
  date: Date
  value: number
  description?: string
  source?: string
}

export interface CorrelationResult {
  factor: string
  correlation: number
  pValue: number
  significance: 'high' | 'medium' | 'low' | 'none'
  direction: 'positive' | 'negative'
  timeDelay: number
  confidence: number
  explanation: string
}

export interface InfluencingFactor {
  name: string
  correlation: number
  significance: number
  direction: 'positive' | 'negative'
  timeDelay: number
  confidence: number
  explanation: string
  importance: number
  statisticalTests: StatisticalTest[]
}

export interface StatisticalTest {
  testType: 'pearson' | 'spearman' | 'kendall' | 'granger_causality'
  statistic: number
  pValue: number
  criticalValue?: number
  isSignificant: boolean
  confidenceLevel: number
}

export interface CorrelationMatrix {
  factors: string[]
  correlations: number[][]
  pValues: number[][]
  significanceMatrix: boolean[][]
}

export interface AttributionAnalysis {
  volumeChange: number
  changeDate: Date
  contributingFactors: FactorContribution[]
  totalExplainedVariance: number
  unexplainedVariance: number
  confidence: number
}

export interface FactorContribution {
  factor: string
  contribution: number
  contributionPercentage: number
  direction: 'increase' | 'decrease'
  confidence: number
  explanation: string
}

export interface FeatureImportanceResult {
  feature: string
  importance: number
  rank: number
  category: 'time' | 'statistical' | 'domain' | 'external'
  explanation: string
}

export interface CorrelationAnalysisRequest {
  clientId?: string
  startDate: Date
  endDate: Date
  includeExternalFactors: boolean
  significanceLevel: number
  maxTimeDelay: number
  analysisType: 'correlation' | 'causality' | 'attribution' | 'all'
}

export interface CorrelationAnalysisResult {
  correlations: CorrelationResult[]
  influencingFactors: InfluencingFactor[]
  correlationMatrix: CorrelationMatrix
  attributionAnalysis?: AttributionAnalysis
  featureImportance: FeatureImportanceResult[]
  summary: AnalysisSummary
}

export interface AnalysisSummary {
  totalFactorsAnalyzed: number
  significantFactors: number
  strongestInfluencer: string
  averageCorrelation: number
  explainedVariance: number
  recommendations: string[]
}

export interface VisualizationConfig {
  type: 'correlation_heatmap' | 'factor_importance' | 'attribution_chart' | 'time_series_correlation'
  data: any
  options: {
    showSignificance: boolean
    colorScheme: string
    interactive: boolean
    annotations: boolean
  }
}

export interface TimeSeriesData {
  timestamps: Date[]
  values: number[]
  clientId?: string
  metadata?: Record<string, any>
}