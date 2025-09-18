// Performance monitoring types for prediction engine

export interface PerformanceMetrics {
  id: string
  timestamp: Date
  modelId: string
  clientId?: string
  predictionLatency: number // milliseconds
  memoryUsage: number // MB
  cpuUsage: number // percentage
  throughput: number // predictions per second
  accuracy: ModelAccuracyMetrics
  resourceUtilization: ResourceMetrics
}

export interface ModelAccuracyMetrics {
  mae: number // Mean Absolute Error
  rmse: number // Root Mean Square Error
  mape: number // Mean Absolute Percentage Error
  r2Score: number // R-squared
  accuracyScore: number
  confidenceScore: number
}

export interface ResourceMetrics {
  vertexAIEndpointLatency: number // ms
  neonDBQueryTime: number // ms
  vectorSearchTime: number // ms
  cacheHitRate: number // percentage
  errorRate: number // percentage
  concurrentRequests: number
}

export interface PerformanceAlert {
  id: string
  type: 'accuracy_degradation' | 'latency_spike' | 'resource_exhaustion' | 'error_rate_high'
  severity: 'low' | 'medium' | 'high' | 'critical'
  modelId: string
  message: string
  threshold: number
  currentValue: number
  timestamp: Date
  isResolved: boolean
  resolvedAt?: Date
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical'
  components: {
    vertexAI: ComponentHealth
    neonDB: ComponentHealth
    vectorSearch: ComponentHealth
    predictionEngine: ComponentHealth
    caching: ComponentHealth
  }
  lastUpdated: Date
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'critical'
  latency: number
  errorRate: number
  uptime: number
  lastCheck: Date
  issues?: string[]
}

export interface PerformanceOptimizationRecommendation {
  id: string
  type: 'model_optimization' | 'resource_scaling' | 'caching_strategy' | 'query_optimization'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  expectedImpact: string
  implementationEffort: 'low' | 'medium' | 'high'
  estimatedImprovement: {
    latencyReduction?: number // percentage
    accuracyImprovement?: number // percentage
    resourceSavings?: number // percentage
  }
  actionItems: string[]
  createdAt: Date
}

export interface ModelPerformanceHistory {
  modelId: string
  timeRange: {
    start: Date
    end: Date
  }
  metrics: PerformanceMetrics[]
  trends: {
    accuracy: TrendAnalysis
    latency: TrendAnalysis
    resourceUsage: TrendAnalysis
  }
  alerts: PerformanceAlert[]
  recommendations: PerformanceOptimizationRecommendation[]
}

export interface TrendAnalysis {
  direction: 'improving' | 'stable' | 'degrading'
  changeRate: number // percentage change per day
  confidence: number
  significance: 'low' | 'medium' | 'high'
}

export interface PerformanceThresholds {
  accuracy: {
    maeThreshold: number
    rmseThreshold: number
    mapeThreshold: number
    accuracyMinimum: number
  }
  latency: {
    maxPredictionTime: number // ms
    maxEndpointLatency: number // ms
    maxQueryTime: number // ms
  }
  resources: {
    maxMemoryUsage: number // MB
    maxCpuUsage: number // percentage
    maxErrorRate: number // percentage
    minCacheHitRate: number // percentage
  }
}

export interface PerformanceMonitoringConfig {
  monitoringInterval: number // seconds
  alertingEnabled: boolean
  thresholds: PerformanceThresholds
  retentionPeriod: number // days
  autoOptimizationEnabled: boolean
}