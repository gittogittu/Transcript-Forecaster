import { QueryClient } from '@tanstack/react-query'
import { InvalidationStrategies, RealtimeUpdateStrategies, BackgroundSyncStrategies } from './invalidation-strategies'

// Global query client instance
let globalQueryClient: QueryClient | null = null

// Initialize the query client with all strategies
export function initializeQueryClient(): QueryClient {
  if (globalQueryClient) {
    return globalQueryClient
  }

  globalQueryClient = new QueryClient({
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

  // Initialize strategies
  const invalidationStrategies = new InvalidationStrategies(globalQueryClient)
  const realtimeStrategies = new RealtimeUpdateStrategies(globalQueryClient)
  const backgroundStrategies = new BackgroundSyncStrategies(globalQueryClient)

  // Set up real-time listeners
  realtimeStrategies.setupRealtimeListeners()

  // Set up visibility change listeners
  if (typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        invalidationStrategies.global.onVisibilityChange()
      }
    })

    // Set up online/offline listeners
    window.addEventListener('online', () => {
      invalidationStrategies.global.onReconnect()
    })
  }

  return globalQueryClient
}

// Get the current query client instance
export function getQueryClient(): QueryClient {
  if (!globalQueryClient) {
    return initializeQueryClient()
  }
  return globalQueryClient
}

// Cleanup function for testing
export function resetQueryClient(): void {
  if (globalQueryClient) {
    globalQueryClient.clear()
    globalQueryClient = null
  }
}