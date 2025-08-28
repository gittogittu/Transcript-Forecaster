'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/query-client'

// Types for monitoring data
interface PerformanceMetrics {
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

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  uptime: number
  lastCheck: Date
  services: Array<{
    name: string
    status: 'up' | 'down' | 'degraded'
    responseTime: number
  }>
}

interface AlertConfig {
  metric: string
  threshold: number
  operator: 'gt' | 'lt' | 'eq'
  enabled: boolean
}

// API functions for monitoring operations
const monitoringApi = {
  // Get performance metrics
  getMetrics: async (timeRange?: { start: Date; end: Date }): Promise<PerformanceMetrics[]> => {
    const params = new URLSearchParams()
    if (timeRange) {
      params.append('start', timeRange.start.toISOString())
      params.append('end', timeRange.end.toISOString())
    }
    
    const response = await fetch(`/api/monitoring/metrics?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.statusText}`)
    }
    return response.json()
  },

  // Get system health
  getHealth: async (): Promise<SystemHealth> => {
    const response = await fetch('/api/monitoring/health')
    if (!response.ok) {
      throw new Error(`Failed to fetch health: ${response.statusText}`)
    }
    return response.json()
  },

  // Create performance alert
  createAlert: async (config: AlertConfig): Promise<void> => {
    const response = await fetch('/api/monitoring/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (!response.ok) {
      throw new Error(`Failed to create alert: ${response.statusText}`)
    }
  },

  // Record custom metric
  recordMetric: async (metric: Partial<PerformanceMetrics>): Promise<void> => {
    const response = await fetch('/api/monitoring/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    })
    if (!response.ok) {
      throw new Error(`Failed to record metric: ${response.statusText}`)
    }
  },
}

// Hook for fetching performance metrics
export function usePerformanceMetrics(timeRange?: { start: Date; end: Date }) {
  return useQuery({
    queryKey: [...queryKeys.monitoring.metrics(), timeRange],
    queryFn: () => monitoringApi.getMetrics(timeRange),
    staleTime: 30 * 1000, // 30 seconds for real-time monitoring
    refetchInterval: 60 * 1000, // Auto-refetch every minute
  })
}

// Hook for system health monitoring
export function useSystemHealth() {
  return useQuery({
    queryKey: queryKeys.monitoring.health(),
    queryFn: monitoringApi.getHealth,
    staleTime: 15 * 1000, // 15 seconds for health checks
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    retry: 5, // Retry more aggressively for health checks
  })
}

// Hook for creating alerts
export function useCreateAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: monitoringApi.createAlert,
    onSuccess: () => {
      // Invalidate monitoring queries to reflect new alert
      queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.all })
    },
  })
}

// Hook for recording custom metrics
export function useRecordMetric() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: monitoringApi.recordMetric,
    onSuccess: () => {
      // Invalidate metrics to show new data
      queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.metrics() })
    },
  })
}

// Hook for real-time monitoring dashboard
export function useRealtimeMonitoring(timeRange?: { start: Date; end: Date }) {
  const metrics = usePerformanceMetrics(timeRange)
  const health = useSystemHealth()

  return {
    metrics,
    health,
    isLoading: metrics.isLoading || health.isLoading,
    isError: metrics.isError || health.isError,
    error: metrics.error || health.error,
    refetchAll: () => {
      metrics.refetch()
      health.refetch()
    },
  }
}

// Custom hook for performance tracking
export function usePerformanceTracker() {
  const recordMetric = useRecordMetric()

  const trackQuery = (duration: number, endpoint: string) => {
    recordMetric.mutate({
      timestamp: new Date(),
      queriesPerSecond: 1000 / duration, // Approximate QPS based on duration
      dataSyncLatency: duration,
    })
  }

  const trackModelExecution = (duration: number, modelType: string) => {
    recordMetric.mutate({
      timestamp: new Date(),
      modelRuntime: duration,
    })
  }

  const trackError = (error: Error, context: string) => {
    recordMetric.mutate({
      timestamp: new Date(),
      errorCount: 1,
    })
  }

  return {
    trackQuery,
    trackModelExecution,
    trackError,
    isRecording: recordMetric.isPending,
  }
}