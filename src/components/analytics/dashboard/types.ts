// Types for the interactive visual analytics dashboard

export interface DashboardWidget {
  id: string
  type: 'chart' | 'metric' | 'table' | 'insight'
  title: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  config: WidgetConfig
  data?: any
  refreshInterval?: number
}

export interface WidgetConfig {
  chartType?: 'line' | 'bar' | 'area' | 'scatter' | 'heatmap'
  dataSource: string
  filters?: FilterConfig[]
  aggregation?: AggregationConfig
  visualization?: VisualizationConfig
}

export interface FilterConfig {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between'
  value: any
  label: string
}

export interface AggregationConfig {
  groupBy?: string[]
  metrics: MetricConfig[]
  timeGrain?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
}

export interface MetricConfig {
  field: string
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median'
  label: string
}

export interface VisualizationConfig {
  showConfidenceBands?: boolean
  showAnomalies?: boolean
  showPredictions?: boolean
  showActuals?: boolean
  colorScheme?: string[]
  animations?: boolean
  drillDown?: DrillDownConfig
}

export interface DrillDownConfig {
  enabled: boolean
  levels: DrillDownLevel[]
}

export interface DrillDownLevel {
  field: string
  label: string
  chartType?: 'line' | 'bar' | 'area' | 'scatter'
}

export interface DashboardLayout {
  id: string
  name: string
  widgets: DashboardWidget[]
  filters: GlobalFilter[]
  refreshInterval: number
  isDefault: boolean
}

export interface GlobalFilter {
  id: string
  field: string
  label: string
  type: 'select' | 'date' | 'range' | 'text'
  options?: { value: any; label: string }[]
  value: any
}

export interface ChartDataPoint {
  timestamp: Date
  value: number
  predicted?: number
  confidenceUpper?: number
  confidenceLower?: number
  anomaly?: boolean
  anomalySeverity?: 'low' | 'medium' | 'high' | 'critical'
}

export interface PredictionComparisonData {
  actual: ChartDataPoint[]
  predicted: ChartDataPoint[]
  accuracy: {
    mae: number
    rmse: number
    mape: number
    r2Score: number
  }
}

export interface RealTimeDataUpdate {
  widgetId: string
  data: any
  timestamp: Date
  type: 'append' | 'replace' | 'update'
}

export interface DashboardState {
  layout: DashboardLayout
  isEditing: boolean
  selectedWidget?: string
  globalFilters: Record<string, any>
  realTimeEnabled: boolean
  lastUpdate: Date
}