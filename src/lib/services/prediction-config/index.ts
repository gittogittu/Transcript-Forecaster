/**
 * Prediction Configuration Services
 * Export all services for customizable prediction parameters and filtering
 */

export { PredictionConfigurationService } from './prediction-config-service'
export { ScenarioModelingService } from './scenario-modeling-service'
export { ModelComparisonService } from './model-comparison-service'

// Re-export types for convenience
export type {
  PredictionConfiguration,
  PredictionTemplate,
  PredictionConfigurationRequest,
  PredictionConfigurationResponse,
  ValidationResult,
  ConfigurationSearchFilters,
  ConfigurationSearchResult,
  WhatIfAnalysis,
  WhatIfScenario,
  ScenarioVariables,
  ExternalEvent,
  CapacityConstraint,
  MarketCondition,
  ModelComparison,
  ModelComparisonEntry,
  ModelComparisonResult,
  CrossValidationConfig,
  ComparisonMetric
} from '@/types/prediction-config'

export type {
  ScenarioResult,
  ImpactAnalysis,
  RiskAssessment,
  ScenarioComparison,
  ComparisonMetric as ScenarioComparisonMetric,
  ScenarioRecommendation
} from './scenario-modeling-service'

export type {
  CrossValidationResult,
  FoldResult,
  ModelPerformanceMetrics,
  ModelBenchmarkResult,
  PerformanceSummary,
  ModelRecommendation
} from './model-comparison-service'