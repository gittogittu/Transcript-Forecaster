/**
 * Types for customizable prediction parameters and filtering system
 */

export interface PredictionFilters {
  clientIds?: string[]
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  transcriptTypes?: string[]
  businessSegments?: string[]
  customFilters?: Record<string, any>
}

export interface PredictionParameters {
  confidenceLevel: number // 0.8, 0.9, 0.95, 0.99
  forecastHorizon: number // Number of periods ahead
  modelAlgorithm?: 'automl' | 'arima' | 'prophet' | 'lstm' | 'ensemble'
  seasonalityMode?: 'auto' | 'additive' | 'multiplicative' | 'none'
  trendMode?: 'auto' | 'linear' | 'logistic' | 'none'
  includeHolidays?: boolean
  includeExternalFactors?: boolean
}

export interface ScenarioVariables {
  growthRate?: number // Percentage change in growth
  seasonalFactors?: Record<string, number> // Seasonal adjustments by period
  externalEvents?: ExternalEvent[]
  capacityConstraints?: CapacityConstraint[]
  marketConditions?: MarketCondition[]
}

export interface ExternalEvent {
  id: string
  name: string
  startDate: Date
  endDate?: Date
  impact: number // Percentage impact on predictions
  description?: string
}

export interface CapacityConstraint {
  id: string
  name: string
  maxValue: number
  startDate: Date
  endDate?: Date
  description?: string
}

export interface MarketCondition {
  id: string
  name: string
  factor: number // Multiplier for predictions
  startDate: Date
  endDate?: Date
  description?: string
}

export interface PredictionConfiguration {
  id?: string
  name: string
  description?: string
  filters: PredictionFilters
  parameters: PredictionParameters
  scenarioVariables?: ScenarioVariables
  createdAt?: Date
  updatedAt?: Date
  createdBy?: string
  isTemplate?: boolean
  tags?: string[]
}

export interface PredictionTemplate extends PredictionConfiguration {
  isTemplate: true
  templateCategory?: 'standard' | 'seasonal' | 'growth' | 'custom'
  usageCount?: number
  lastUsed?: Date
}

export interface WhatIfAnalysis {
  baselineConfig: PredictionConfiguration
  scenarios: WhatIfScenario[]
  comparisonMetrics: string[]
}

export interface WhatIfScenario {
  id: string
  name: string
  description?: string
  variableChanges: Record<string, any>
  expectedOutcome?: string
}

export interface ModelComparison {
  id: string
  name: string
  models: ModelComparisonEntry[]
  dataset: string
  metrics: ComparisonMetric[]
  crossValidationConfig: CrossValidationConfig
  results?: ModelComparisonResult[]
}

export interface ModelComparisonEntry {
  modelId: string
  modelName: string
  algorithm: string
  parameters: Record<string, any>
  isBaseline?: boolean
}

export interface ComparisonMetric {
  name: string
  displayName: string
  higherIsBetter: boolean
  format?: 'percentage' | 'decimal' | 'integer'
}

export interface CrossValidationConfig {
  method: 'time_series' | 'k_fold' | 'walk_forward'
  folds: number
  testSize?: number
  gap?: number // For time series CV
}

export interface ModelComparisonResult {
  modelId: string
  metrics: Record<string, number>
  crossValidationScores: number[]
  trainingTime: number
  predictionLatency: number
  rank: number
}

export interface PredictionConfigurationRequest {
  config: PredictionConfiguration
  generatePrediction?: boolean
  saveAsTemplate?: boolean
}

export interface PredictionConfigurationResponse {
  config: PredictionConfiguration
  validation: ValidationResult
  prediction?: any // Will be typed based on prediction service
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  suggestion?: string
}

export interface ConfigurationSearchFilters {
  name?: string
  tags?: string[]
  createdBy?: string
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  isTemplate?: boolean
  templateCategory?: string
}

export interface ConfigurationSearchResult {
  configurations: PredictionConfiguration[]
  total: number
  page: number
  pageSize: number
}