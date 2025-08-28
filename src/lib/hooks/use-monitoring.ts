'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PerformanceMetrics, SystemHealthIndicator, Alert, UserActivity, MetricsSummary, AlertConfig } from '@/types/monitoring'

interface MonitoringData {
  currentMetrics: PerformanceMetrics
  metricsSummary: MetricsSummary
  timeRange: {
    start: string
    end: string
  }
}

interface HealthData {
  overallStatus: 'healthy' | 'warning' | 'critical' | 'unknown'
  indicators: SystemHealthIndicator[]
  timestamp: string
}

interface AlertsData {
  alerts: Alert[] | AlertConfig[]
  type: string
  timestamp: string
}

interface ActivityData {
  activities: UserActivity[]
  summary: {
    totalActivities: number
    successfulActivities: number
    errorActivities: number
    uniqueUsers: number
    averageResponseTime: number
    actionCounts: Record<string, number>
    topErrors: Array<{ message: string; count: number }>
  }
  timeWindow: number
  timestamp: string
}

export function useMonitoring(timeRange: string = '24h') {
  const queryClient = useQueryClient()

  // Fetch current metrics and summary
  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
  } = useQuery<MonitoringData>({
    queryKey: ['monitoring', 'metrics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/monitoring/metrics?timeRange=${timeRange}`)
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }
      return response.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Fetch system health
  const {
    data: healthData,
    isLoading: healthLoading,
    error: healthError,
  } = useQuery<HealthData>({
    queryKey: ['monitoring', 'health'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/health')
      if (!response.ok) {
        throw new Error('Failed to fetch system health')
      }
      return response.json()
    },
    refetchInterval: 60000, // Refetch every minute
  })

  // Fetch active alerts
  const {
    data: activeAlertsData,
    isLoading: alertsLoading,
    error: alertsError,
  } = useQuery<AlertsData>({
    queryKey: ['monitoring', 'alerts', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/alerts?type=active')
      if (!response.ok) {
        throw new Error('Failed to fetch active alerts')
      }
      return response.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Fetch all alerts
  const {
    data: allAlertsData,
  } = useQuery<AlertsData>({
    queryKey: ['monitoring', 'alerts', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/alerts?type=all')
      if (!response.ok) {
        throw new Error('Failed to fetch all alerts')
      }
      return response.json()
    },
    refetchInterval: 60000, // Refetch every minute
  })

  // Fetch alert configurations
  const {
    data: alertConfigsData,
  } = useQuery<AlertsData>({
    queryKey: ['monitoring', 'alerts', 'configs'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/alerts?type=configs')
      if (!response.ok) {
        throw new Error('Failed to fetch alert configs')
      }
      return response.json()
    },
  })

  // Fetch user activity
  const {
    data: activityData,
    isLoading: activityLoading,
    error: activityError,
  } = useQuery<ActivityData>({
    queryKey: ['monitoring', 'activity'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/activity?timeWindow=300000&limit=100')
      if (!response.ok) {
        throw new Error('Failed to fetch user activity')
      }
      return response.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Mutation to resolve alerts
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_alert',
          data: { alertId },
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to resolve alert')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'alerts'] })
    },
  })

  // Mutation to update alert configuration
  const updateAlertConfigMutation = useMutation({
    mutationFn: async (config: AlertConfig) => {
      const response = await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: config.id ? 'update_config' : 'create_config',
          data: config,
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to update alert configuration')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'alerts'] })
    },
  })

  // Mutation to record user activity
  const recordActivityMutation = useMutation({
    mutationFn: async (activity: {
      action: string
      endpoint?: string
      duration?: number
      success?: boolean
      errorMessage?: string
    }) => {
      const response = await fetch('/api/monitoring/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      })
      if (!response.ok) {
        throw new Error('Failed to record activity')
      }
      return response.json()
    },
  })

  const refreshMetrics = () => {
    queryClient.invalidateQueries({ queryKey: ['monitoring'] })
  }

  const getHistoricalMetrics = async (startTime: Date, endTime: Date) => {
    // This would fetch historical metrics from the database
    // For now, return empty array as placeholder
    return []
  }

  const isLoading = metricsLoading || healthLoading || alertsLoading || activityLoading
  const error = metricsError || healthError || alertsError || activityError

  return {
    // Data
    currentMetrics: metricsData?.currentMetrics || null,
    metricsSummary: metricsData?.metricsSummary || null,
    systemHealth: healthData?.indicators || null,
    overallSystemStatus: healthData?.overallStatus || 'unknown',
    activeAlerts: (activeAlertsData?.alerts as Alert[]) || null,
    allAlerts: (allAlertsData?.alerts as Alert[]) || null,
    alertConfigs: (alertConfigsData?.alerts as AlertConfig[]) || null,
    recentActivity: activityData?.activities || null,
    activitySummary: activityData?.summary || null,

    // State
    isLoading,
    error,

    // Actions
    refreshMetrics,
    getHistoricalMetrics,
    resolveAlert: resolveAlertMutation.mutateAsync,
    updateAlertConfig: updateAlertConfigMutation.mutateAsync,
    recordActivity: recordActivityMutation.mutateAsync,

    // Mutation states
    isResolvingAlert: resolveAlertMutation.isPending,
    isUpdatingConfig: updateAlertConfigMutation.isPending,
    isRecordingActivity: recordActivityMutation.isPending,
  }
}

// Legacy hooks for backward compatibility
export function usePerformanceMetrics(timeRange?: { start: Date; end: Date }) {
  const { currentMetrics, isLoading, error } = useMonitoring()
  return {
    data: currentMetrics ? [currentMetrics] : [],
    isLoading,
    error,
    refetch: () => {},
  }
}

export function useSystemHealth() {
  const { systemHealth, overallSystemStatus, isLoading, error } = useMonitoring()
  return {
    data: {
      status: overallSystemStatus,
      uptime: 0,
      lastCheck: new Date(),
      services: systemHealth?.map(h => ({
        name: h.component,
        status: h.status === 'healthy' ? 'up' as const : h.status === 'critical' ? 'down' as const : 'degraded' as const,
        responseTime: h.responseTime || 0,
      })) || [],
    },
    isLoading,
    error,
    refetch: () => {},
  }
}

export function useRealtimeMonitoring(timeRange?: { start: Date; end: Date }) {
  const monitoring = useMonitoring()
  const metrics = usePerformanceMetrics(timeRange)
  const health = useSystemHealth()

  return {
    metrics,
    health,
    isLoading: monitoring.isLoading,
    isError: !!monitoring.error,
    error: monitoring.error,
    refetchAll: monitoring.refreshMetrics,
  }
}

export function usePerformanceTracker() {
  const { recordActivity } = useMonitoring()

  const trackQuery = async (duration: number, endpoint: string) => {
    await recordActivity({
      action: 'api_request',
      endpoint,
      duration,
      success: true,
    })
  }

  const trackModelExecution = async (duration: number, modelType: string) => {
    await recordActivity({
      action: 'ml_prediction',
      endpoint: `/api/analytics/predict/${modelType}`,
      duration,
      success: true,
    })
  }

  const trackError = async (error: Error, context: string) => {
    await recordActivity({
      action: 'error',
      endpoint: context,
      success: false,
      errorMessage: error.message,
    })
  }

  return {
    trackQuery,
    trackModelExecution,
    trackError,
    isRecording: false,
  }
}