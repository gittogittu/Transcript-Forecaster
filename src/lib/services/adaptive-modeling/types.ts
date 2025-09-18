/**
 * Types for intelligent data modeling with adaptive capabilities
 * Supports concept drift detection, automatic retraining, and performance optimization
 */

export interface ConceptDriftDetectionResult {
  isDriftDetected: boolean
  driftScore: number
  driftType: 'gradual' | 'sudden' | 'incremental' | 'recurring'
  affectedFeatures: string[]
  confidence: number
  detectionMethod: 'statistical' | 'model_based' | 'distance_based'
  timestamp: Date
  recommendations: DriftRecommendation[]
}

export interface DriftRecommendation {
  action: 'retrain' | 'adjust_preprocessing' | 'feature_selection' | 'model_switch'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  estimatedImpact: number
  implementationCost: 'low' | 'medium' | 'high'
}

export interface ModelPerformanceMetrics {
  modelId: string
  timestamp: Date
  accuracy: number
  mae: number
  rmse: number
  mape: number
  r2Score: number
  predictionLatency: number
  memoryUsage: number
  cpuUsage: number
  throughput: number
  errorRate: number
}

export interface PerformanceDegradationAlert {
  modelId: string
  alertType: 'accuracy_drop' | 'latency_increase' | 'error_spike' | 'resource_exhaustion'
  severity: 'low' | 'medium' | 'high' | 'critical'
  currentValue: number
  baselineValue: number
  degradationPercentage: number
  threshold: number
  detectedAt: Date
  suggestedActions: string[]
}

export interface AutoRetrainingConfig {
  enabled: boolean
  triggers: RetrainingTrigger[]
  schedule: RetrainingSchedule
  dataQualityThresholds: DataQualityThresholds
  performanceThresholds: PerformanceThresholds
  resourceLimits: ResourceLimits
}

export interface RetrainingTrigger {
  type: 'performance_degradation' | 'concept_drift' | 'data_quality' | 'scheduled' | 'manual'
  threshold: number
  enabled: boolean
  priority: number
}

export interface RetrainingSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  time: string // HH:MM format
  timezone: string
  maxConcurrentJobs: number
}

export interface DataQualityThresholds {
  missingValuePercentage: number
  outlierPercentage: number
  duplicatePercentage: number
  schemaViolationPercentage: number
  dataFreshnessHours: number
}

export interface PerformanceThresholds {
  accuracyDropPercentage: number
  latencyIncreasePercentage: number
  errorRatePercentage: number
  memoryUsagePercentage: number
  throughputDropPercentage: number
}

export interface ResourceLimits {
  maxTrainingTimeMinutes: number
  maxMemoryGB: number
  maxCpuCores: number
  maxGpuCount: number
  maxCostUSD: number
}

export interface AdaptivePreprocessingConfig {
  enabled: boolean
  adaptationTriggers: AdaptationTrigger[]
  preprocessingSteps: PreprocessingStep[]
  qualityMonitoring: QualityMonitoringConfig
}

export interface AdaptationTrigger {
  type: 'data_quality_change' | 'distribution_shift' | 'schema_change' | 'performance_impact'
  threshold: number
  enabled: boolean
  responseAction: 'adjust_parameters' | 'add_step' | 'remove_step' | 'replace_step'
}

export interface PreprocessingStep {
  id: string
  type: 'normalization' | 'imputation' | 'outlier_removal' | 'feature_scaling' | 'encoding'
  parameters: Record<string, any>
  enabled: boolean
  adaptive: boolean
  priority: number
}

export interface QualityMonitoringConfig {
  enabled: boolean
  checkFrequency: 'realtime' | 'hourly' | 'daily'
  qualityMetrics: QualityMetric[]
  alertThresholds: Record<string, number>
}

export interface QualityMetric {
  name: string
  type: 'completeness' | 'accuracy' | 'consistency' | 'validity' | 'uniqueness'
  weight: number
  enabled: boolean
}

export interface HyperparameterOptimizationConfig {
  enabled: boolean
  algorithm: 'grid_search' | 'random_search' | 'bayesian' | 'genetic' | 'hyperband'
  searchSpace: SearchSpace
  optimizationObjective: OptimizationObjective
  constraints: OptimizationConstraints
  earlyStoppingConfig: EarlyStoppingConfig
}

export interface SearchSpace {
  parameters: HyperparameterRange[]
  searchStrategy: 'exhaustive' | 'adaptive' | 'guided'
  maxIterations: number
  parallelTrials: number
}

export interface HyperparameterRange {
  name: string
  type: 'continuous' | 'discrete' | 'categorical'
  range: [number, number] | number[] | string[]
  distribution?: 'uniform' | 'log_uniform' | 'normal' | 'log_normal'
  priority: 'high' | 'medium' | 'low'
}

export interface OptimizationObjective {
  metric: 'accuracy' | 'mae' | 'rmse' | 'mape' | 'f1_score' | 'auc_roc'
  direction: 'maximize' | 'minimize'
  weight: number
  constraints?: MetricConstraint[]
}

export interface MetricConstraint {
  metric: string
  operator: 'greater_than' | 'less_than' | 'equal_to' | 'between'
  value: number | [number, number]
}

export interface OptimizationConstraints {
  maxTrainingTime: number
  maxMemoryUsage: number
  maxCost: number
  minAccuracy?: number
  maxLatency?: number
}

export interface EarlyStoppingConfig {
  enabled: boolean
  patience: number
  minDelta: number
  metric: string
  mode: 'min' | 'max'
}

export interface ModelSwitchingDecision {
  currentModelId: string
  recommendedModelId: string
  reason: 'performance_improvement' | 'concept_drift' | 'resource_optimization' | 'accuracy_gain'
  confidenceScore: number
  expectedImprovement: number
  switchingCost: number
  riskAssessment: RiskAssessment
  timeline: string
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high'
  riskFactors: RiskFactor[]
  mitigationStrategies: string[]
  rollbackPlan: string
}

export interface RiskFactor {
  type: 'performance' | 'stability' | 'compatibility' | 'resource' | 'business'
  description: string
  impact: 'low' | 'medium' | 'high'
  probability: number
  mitigation?: string
}

export interface AdaptiveModelingState {
  currentModels: ActiveModel[]
  performanceHistory: ModelPerformanceMetrics[]
  driftDetectionResults: ConceptDriftDetectionResult[]
  retrainingJobs: RetrainingJob[]
  optimizationResults: OptimizationResult[]
  systemHealth: SystemHealthMetrics
}

export interface ActiveModel {
  id: string
  name: string
  type: string
  version: string
  deployedAt: Date
  status: 'active' | 'training' | 'evaluating' | 'deprecated' | 'failed'
  performanceScore: number
  resourceUsage: ResourceUsage
  configuration: ModelConfiguration
}

export interface ResourceUsage {
  cpu: number
  memory: number
  gpu?: number
  storage: number
  networkIO: number
}

export interface ModelConfiguration {
  hyperparameters: Record<string, any>
  preprocessingConfig: AdaptivePreprocessingConfig
  featureSelection: string[]
  trainingConfig: TrainingConfiguration
}

export interface TrainingConfiguration {
  algorithm: string
  datasetSize: number
  trainingTime: number
  validationSplit: number
  crossValidation: boolean
  earlyStoppingEnabled: boolean
}

export interface RetrainingJob {
  id: string
  modelId: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  trigger: RetrainingTrigger
  startedAt: Date
  completedAt?: Date
  progress: number
  estimatedTimeRemaining?: number
  resourcesAllocated: ResourceUsage
  intermediateResults?: OptimizationResult[]
}

export interface OptimizationResult {
  id: string
  modelId: string
  algorithm: string
  bestParameters: Record<string, any>
  bestScore: number
  improvementPercentage: number
  totalTrials: number
  optimizationTime: number
  convergenceReached: boolean
  searchHistory: TrialResult[]
}

export interface TrialResult {
  trialId: string
  parameters: Record<string, any>
  score: number
  trainingTime: number
  status: 'completed' | 'failed' | 'pruned'
  metadata?: Record<string, any>
}

export interface SystemHealthMetrics {
  overallHealth: 'healthy' | 'warning' | 'critical'
  activeModels: number
  averageAccuracy: number
  averageLatency: number
  errorRate: number
  resourceUtilization: number
  driftDetectionRate: number
  retrainingFrequency: number
  lastHealthCheck: Date
}

export interface AdaptiveModelingEvent {
  id: string
  type: 'drift_detected' | 'retraining_started' | 'retraining_completed' | 'model_switched' | 'optimization_completed'
  modelId: string
  timestamp: Date
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  metadata: Record<string, any>
  actionsTaken: string[]
}

// Vertex AI specific types
export interface VertexAIModelMonitoringConfig {
  projectId: string
  location: string
  endpointId: string
  monitoringJobId?: string
  alertConfig: AlertConfiguration
  driftDetectionConfig: DriftDetectionConfiguration
  explanationConfig?: ExplanationConfiguration
}

export interface AlertConfiguration {
  emailAlertConfig?: EmailAlertConfig
  notificationChannels: string[]
  alertThresholds: AlertThreshold[]
}

export interface EmailAlertConfig {
  userEmails: string[]
}

export interface AlertThreshold {
  metricType: 'feature_drift' | 'prediction_drift' | 'feature_attribution_drift'
  threshold: number
}

export interface DriftDetectionConfiguration {
  driftThresholds: Record<string, number>
  attributionScoreThreshold?: number
  samplingStrategy: SamplingStrategy
}

export interface SamplingStrategy {
  randomSampleConfig?: RandomSampleConfig
}

export interface RandomSampleConfig {
  sampleRate: number
}

export interface ExplanationConfiguration {
  enableFeatureBasedExplanation: boolean
  topK?: number
}