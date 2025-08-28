import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-client'

// Invalidation strategies for different data operations
export class InvalidationStrategies {
  constructor(private queryClient: QueryClient) {}

  // Transcript data invalidation strategies
  transcript = {
    // When a transcript is created
    onCreate: () => {
      // Invalidate all transcript lists
      this.queryClient.invalidateQueries({ queryKey: queryKeys.transcripts.lists() })
      // Invalidate analytics as new data affects predictions
      this.queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
      // Invalidate summary stats
      this.queryClient.invalidateQueries({ queryKey: queryKeys.analytics.summary() })
    },

    // When a transcript is updated
    onUpdate: (id: string) => {
      // Invalidate specific transcript
      this.queryClient.invalidateQueries({ queryKey: queryKeys.transcripts.detail(id) })
      // Invalidate all transcript lists
      this.queryClient.invalidateQueries({ queryKey: queryKeys.transcripts.lists() })
      // Invalidate analytics as data change affects predictions
      this.queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
    },

    // When a transcript is deleted
    onDelete: (id: string) => {
      // Remove specific transcript from cache
      this.queryClient.removeQueries({ queryKey: queryKeys.transcripts.detail(id) })
      // Invalidate all transcript lists
      this.queryClient.invalidateQueries({ queryKey: queryKeys.transcripts.lists() })
      // Invalidate analytics
      this.queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
    },

    // When bulk operations occur
    onBulkOperation: () => {
      // Invalidate all transcript-related queries
      this.queryClient.invalidateQueries({ queryKey: queryKeys.transcripts.all })
      // Invalidate all analytics
      this.queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
    },
  }

  // Analytics invalidation strategies
  analytics = {
    // When new predictions are generated
    onPredictionGenerated: () => {
      // Invalidate all prediction queries
      this.queryClient.invalidateQueries({ queryKey: queryKeys.analytics.predictions() })
      // Invalidate summary stats that might include prediction accuracy
      this.queryClient.invalidateQueries({ queryKey: queryKeys.analytics.summary() })
    },

    // When trend analysis is updated
    onTrendUpdate: () => {
      // Invalidate trend queries
      this.queryClient.invalidateQueries({ queryKey: queryKeys.analytics.trends() })
      // Invalidate summary stats
      this.queryClient.invalidateQueries({ queryKey: queryKeys.analytics.summary() })
    },

    // When data source changes (affects all analytics)
    onDataSourceChange: () => {
      // Invalidate all analytics
      this.queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
    },
  }

  // Monitoring invalidation strategies
  monitoring = {
    // When new metrics are recorded
    onMetricRecorded: () => {
      // Invalidate metrics queries
      this.queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.metrics() })
      // Invalidate health status
      this.queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.health() })
    },

    // When system health changes
    onHealthChange: () => {
      // Invalidate health queries
      this.queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.health() })
    },

    // When alerts are configured
    onAlertConfigured: () => {
      // Invalidate all monitoring queries
      this.queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.all })
    },
  }

  // User-related invalidation strategies
  user = {
    // When user profile is updated
    onProfileUpdate: () => {
      // Invalidate user profile
      this.queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() })
    },

    // When user role changes
    onRoleChange: () => {
      // Invalidate all user queries
      this.queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      // May affect what data user can see, so invalidate everything
      this.queryClient.invalidateQueries()
    },
  }

  // Global invalidation strategies
  global = {
    // When user logs out
    onLogout: () => {
      // Clear all cached data
      this.queryClient.clear()
    },

    // When network reconnects
    onReconnect: () => {
      // Refetch all active queries
      this.queryClient.refetchQueries({ type: 'active' })
    },

    // When app becomes visible again
    onVisibilityChange: () => {
      // Refetch stale queries
      this.queryClient.refetchQueries({ stale: true })
    },

    // Emergency cache clear
    clearAll: () => {
      this.queryClient.clear()
    },
  }
}

// Real-time update strategies
export class RealtimeUpdateStrategies {
  constructor(private queryClient: QueryClient) {}

  // Set up real-time listeners (would integrate with WebSocket/SSE)
  setupRealtimeListeners() {
    // This would typically connect to WebSocket or Server-Sent Events
    // For now, we'll use polling intervals as a fallback

    // Real-time transcript updates
    setInterval(() => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.transcripts.lists(),
        refetchType: 'active' 
      })
    }, 30000) // Every 30 seconds

    // Real-time analytics updates
    setInterval(() => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.analytics.trends(),
        refetchType: 'active' 
      })
    }, 60000) // Every minute

    // Real-time monitoring updates
    setInterval(() => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.monitoring.metrics(),
        refetchType: 'active' 
      })
    }, 15000) // Every 15 seconds
  }

  // Handle WebSocket messages (example implementation)
  handleWebSocketMessage(message: { type: string; data: any }) {
    const invalidation = new InvalidationStrategies(this.queryClient)

    switch (message.type) {
      case 'transcript_created':
        invalidation.transcript.onCreate()
        break
      case 'transcript_updated':
        invalidation.transcript.onUpdate(message.data.id)
        break
      case 'transcript_deleted':
        invalidation.transcript.onDelete(message.data.id)
        break
      case 'prediction_generated':
        invalidation.analytics.onPredictionGenerated()
        break
      case 'metric_recorded':
        invalidation.monitoring.onMetricRecorded()
        break
      default:
        console.warn('Unknown WebSocket message type:', message.type)
    }
  }
}

// Background sync strategies
export class BackgroundSyncStrategies {
  constructor(private queryClient: QueryClient) {}

  // Prefetch related data
  prefetchRelatedData = {
    // When viewing transcript details, prefetch analytics
    onTranscriptView: (id: string) => {
      this.queryClient.prefetchQuery({
        queryKey: queryKeys.analytics.trends(),
        queryFn: () => fetch('/api/analytics/trends').then(res => res.json()),
        staleTime: 5 * 60 * 1000,
      })
    },

    // When viewing analytics, prefetch monitoring data
    onAnalyticsView: () => {
      this.queryClient.prefetchQuery({
        queryKey: queryKeys.monitoring.health(),
        queryFn: () => fetch('/api/monitoring/health').then(res => res.json()),
        staleTime: 30 * 1000,
      })
    },
  }

  // Background refresh strategies
  backgroundRefresh = {
    // Refresh critical data in background
    refreshCriticalData: () => {
      // Refresh system health
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.monitoring.health(),
        refetchType: 'none' // Don't show loading states
      })

      // Refresh recent transcripts
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.transcripts.lists(),
        refetchType: 'none'
      })
    },

    // Refresh analytics data
    refreshAnalytics: () => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.analytics.all,
        refetchType: 'none'
      })
    },
  }
}