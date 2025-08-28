export interface PerformanceMetrics {
  id: string
  timestamp: Date
  queriesPerSecond: number
  modelRuntime: number
  dataSyncLatency: number
  errorCount: number
  activeUsers: number
  memoryUsage: number
  cpuUsage: number
}

export interface SystemHealthIndicator {
  component: string
  status: 'healthy' | 'warning' | 'critical'
  message: string
  lastChecked: Date
  responseTime?: number
}

export interface AlertConfig {
  id: string
  name: string
  metric: keyof PerformanceMetrics
  threshold: number
  operator: 'gt' | 'lt' | 'eq'
  enabled: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface Alert {
  id: string
  configId: string
  message: string
  severity: AlertConfig['severity']
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
}

export interface UserActivity {
  id: string
  userId: string
  action: string
  endpoint?: string
  timestamp: Date
  duration?: number
  success: boolean
  errorMessage?: string
}

export interface MetricsSummary {
  timeRange: {
    start: Date
    end: Date
  }
  averageResponseTime: number
  totalRequests: number
  errorRate: number
  peakActiveUsers: number
  averageMemoryUsage: number
  averageCpuUsage: number
  topErrors: Array<{
    message: string
    count: number
  }>
}