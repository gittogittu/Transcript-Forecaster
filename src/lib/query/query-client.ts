import { QueryClient } from '@tanstack/react-query'

// Create a query client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 5 minutes for most data
      staleTime: 5 * 60 * 1000,
      // Cache time: 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time updates
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect to avoid unnecessary requests
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      // Network mode for offline support
      networkMode: 'online',
    },
  },
})

// Query keys factory for consistent key management
export const queryKeys = {
  // Transcript-related queries
  transcripts: {
    all: ['transcripts'] as const,
    lists: () => [...queryKeys.transcripts.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.transcripts.lists(), filters] as const,
    details: () => [...queryKeys.transcripts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.transcripts.details(), id] as const,
  },
  // Analytics-related queries
  analytics: {
    all: ['analytics'] as const,
    trends: () => [...queryKeys.analytics.all, 'trends'] as const,
    predictions: () => [...queryKeys.analytics.all, 'predictions'] as const,
    summary: () => [...queryKeys.analytics.all, 'summary'] as const,
  },
  // Performance monitoring queries
  monitoring: {
    all: ['monitoring'] as const,
    metrics: () => [...queryKeys.monitoring.all, 'metrics'] as const,
    health: () => [...queryKeys.monitoring.all, 'health'] as const,
  },
  // User-related queries
  users: {
    all: ['users'] as const,
    profile: () => [...queryKeys.users.all, 'profile'] as const,
  },
} as const

// Utility function to invalidate related queries
export const invalidateQueries = {
  transcripts: () => queryClient.invalidateQueries({ queryKey: queryKeys.transcripts.all }),
  analytics: () => queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
  monitoring: () => queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.all }),
  all: () => queryClient.invalidateQueries(),
}