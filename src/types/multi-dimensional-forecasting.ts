/**
 * Types for multi-dimensional forecasting capabilities
 * Supports hierarchical forecasting, cross-sectional predictions, and reconciliation methods
 */

export interface MultiDimensionalForecast {
  id: string
  name: string
  dimensions: ForecastDimension[]
  hierarchicalForecasts: HierarchicalForecast[]
  reconciliationMethod: ReconciliationMethod
  aggregatedForecast: AggregatedForecastResult
  crossSectionalPredictions: CrossSectionalPrediction[]
  comparativeAnalysis: ComparativeAnalysis
  createdAt: Date
  updatedAt: Date
}

export interface ForecastDimension {
  id: string
  name: string
  type: DimensionType
  values: DimensionValue[]
  hierarchy?: DimensionHierarchy
  aggregationMethod: AggregationMethod
}

export type DimensionType = 
  | 'client_group' 
  | 'business_segment' 
  | 'geographic_region' 
  | 'product_line' 
  | 'time_period'
  | 'custom'

export interface DimensionValue {
  id: string
  name: string
  displayName: string
  parentId?: string
  level: number
  metadata?: Record<string, any>
}

export interface DimensionHierarchy {
  levels: HierarchyLevel[]
  maxDepth: number
  rollupRules: RollupRule[]
}

export interface HierarchyLevel {
  level: number
  name: string
  description?: string
  aggregationMethod: AggregationMethod
}

export interface RollupRule {
  fromLevel: number
  toLevel: number
  method: AggregationMethod
  weights?: Record<string, number>
}

export type AggregationMethod = 
  | 'sum' 
  | 'average' 
  | 'weighted_average' 
  | 'median' 
  | 'max' 
  | 'min'
  | 'custom'

export interface HierarchicalForecast {
  id: string
  dimensionId: string
  dimensionValueId: string
  level: number
  parentId?: string
  children?: HierarchicalForecast[]
  forecast: ForecastResult
  reconciliationAdjustment?: number
  contributionToParent?: number
}

export interface ForecastResult {
  predictions: TimePrediction[]
  accuracy: ModelAccuracy
  confidenceIntervals: ConfidenceInterval[]
  modelUsed: string
  metadata?: Record<string, any>
}

export interface TimePrediction {
  date: Date
  predictedValue: number
  confidenceInterval: {
    lower: number
    upper: number
  }
  seasonalComponent?: number
  trendComponent?: number
  modelContributions?: Record<string, number>
}

export interface ModelAccuracy {
  mae: number
  rmse: number
  mape: number
  r2Score: number
  crossValidationScore: number
}

export interface ConfidenceInterval {
  date: Date
  lower: number
  upper: number
  confidence: number
}

export type ReconciliationMethod = 'bottom_up' | 'top_down' | 'middle_out' | 'optimal'

export interface AggregatedForecastResult {
  totalForecast: ForecastResult
  reconciliationMethod: ReconciliationMethod
  reconciliationMetrics: ReconciliationMetrics
  dimensionBreakdown: DimensionBreakdown[]
}

export interface ReconciliationMetrics {
  coherenceScore: number
  adjustmentMagnitude: number
  informationLoss: number
  reconciliationTime: number
}

export interface DimensionBreakdown {
  dimensionId: string
  dimensionName: string
  contribution: number
  forecast: ForecastResult
  variance: number
}

export interface CrossSectionalPrediction {
  id: string
  name: string
  dimensions: string[]
  segments: CrossSectionalSegment[]
  aggregationRules: CrossSectionalAggregation[]
  predictions: SegmentPrediction[]
}

export interface CrossSectionalSegment {
  id: string
  name: string
  dimensionValues: Record<string, string>
  weight?: number
  isActive: boolean
}

export interface CrossSectionalAggregation {
  targetDimension: string
  sourceDimensions: string[]
  method: AggregationMethod
  weights?: Record<string, number>
}

export interface SegmentPrediction {
  segmentId: string
  forecast: ForecastResult
  relativePerformance: number
  marketShare?: number
}

export interface ComparativeAnalysis {
  id: string
  name: string
  dimensions: string[]
  comparisonMetrics: ComparisonMetric[]
  results: ComparisonResult[]
  insights: AnalysisInsight[]
}

export interface ComparisonMetric {
  id: string
  name: string
  displayName: string
  type: 'growth_rate' | 'variance' | 'accuracy' | 'volume' | 'custom'
  format: 'percentage' | 'decimal' | 'integer' | 'currency'
  higherIsBetter: boolean
}

export interface ComparisonResult {
  dimensionValues: Record<string, string>
  metrics: Record<string, number>
  rank: number
  percentile: number
}

export interface AnalysisInsight {
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk'
  title: string
  description: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  recommendations: string[]
  supportingData: Record<string, any>
}

export interface MultiDimensionalForecastRequest {
  name: string
  dimensions: ForecastDimensionConfig[]
  reconciliationMethod: ReconciliationMethod
  forecastHorizon: number
  confidenceLevel: number
  includeComparativeAnalysis: boolean
  customAggregationRules?: CustomAggregationRule[]
}

export interface ForecastDimensionConfig {
  dimensionType: DimensionType
  values: string[]
  hierarchyConfig?: HierarchyConfig
  aggregationMethod: AggregationMethod
}

export interface HierarchyConfig {
  levels: string[]
  parentChildMappings: Record<string, string>
  rollupWeights?: Record<string, number>
}

export interface CustomAggregationRule {
  name: string
  sourceDimensions: string[]
  targetDimension: string
  formula: string
  parameters?: Record<string, any>
}

export interface PivotTableConfig {
  rows: string[]
  columns: string[]
  values: string[]
  aggregationMethod: AggregationMethod
  filters?: Record<string, any>
  sorting?: SortConfig[]
}

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
  priority: number
}

export interface HeatMapConfig {
  xAxis: string
  yAxis: string
  valueField: string
  colorScale: ColorScale
  aggregationMethod: AggregationMethod
  filters?: Record<string, any>
}

export interface ColorScale {
  type: 'linear' | 'logarithmic' | 'categorical'
  colors: string[]
  domain?: [number, number]
  thresholds?: number[]
}

export interface MultiDimensionalVisualization {
  type: 'pivot_table' | 'heat_map' | 'tree_map' | 'parallel_coordinates'
  config: PivotTableConfig | HeatMapConfig | Record<string, any>
  data: any[]
  interactivity: InteractivityConfig
}

export interface InteractivityConfig {
  enableDrillDown: boolean
  enableFiltering: boolean
  enableSorting: boolean
  enableExport: boolean
  customActions?: CustomAction[]
}

export interface CustomAction {
  id: string
  name: string
  icon?: string
  handler: string
  parameters?: Record<string, any>
}

export interface ForecastReconciliation {
  method: ReconciliationMethod
  hierarchy: ForecastHierarchy
  constraints?: ReconciliationConstraint[]
  optimization?: OptimizationConfig
}

export interface ForecastHierarchy {
  nodes: HierarchyNode[]
  edges: HierarchyEdge[]
  levels: number
}

export interface HierarchyNode {
  id: string
  name: string
  level: number
  forecast?: ForecastResult
  isLeaf: boolean
  metadata?: Record<string, any>
}
