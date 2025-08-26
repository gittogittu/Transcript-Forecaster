import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { transcriptKeys } from './use-transcripts'

export function useCacheManagement() {
  const queryClient = useQueryClient()

  // Invalidate all transcript-related queries
  const invalidateTranscripts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: transcriptKeys.all })
  }, [queryClient])

  // Invalidate specific transcript lists
  const invalidateTranscriptLists = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: transcriptKeys.lists() })
  }, [queryClient])

  // Invalidate transcript summary
  const invalidateTranscriptSummary = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: transcriptKeys.summary() })
  }, [queryClient])

  // Prefetch transcript data
  const prefetchTranscripts = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: transcriptKeys.lists(),
      queryFn: async () => {
        const response = await fetch('/api/transcripts')
        if (!response.ok) {
          throw new Error('Failed to prefetch transcripts')
        }
        return response.json()
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }, [queryClient])

  // Clear all transcript cache
  const clearTranscriptCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: transcriptKeys.all })
  }, [queryClient])

  // Background refetch for stale data
  const refetchStaleData = useCallback(() => {
    queryClient.refetchQueries({
      queryKey: transcriptKeys.all,
      type: 'active',
      stale: true,
    })
  }, [queryClient])

  // Set up automatic background refetch on interval
  const setupBackgroundRefetch = useCallback((intervalMs: number = 5 * 60 * 1000) => {
    const interval = setInterval(() => {
      refetchStaleData()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [refetchStaleData])

  // Handle network status changes
  const handleNetworkStatusChange = useCallback(() => {
    const handleOnline = () => {
      // Refetch all queries when coming back online
      queryClient.refetchQueries({
        queryKey: transcriptKeys.all,
        type: 'active',
      })
    }

    const handleOffline = () => {
      // Pause all queries when offline
      queryClient.getQueryCache().getAll().forEach(query => {
        query.cancel()
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [queryClient])

  // Optimistic cache updates
  const updateTranscriptCache = useCallback((id: string, updater: (old: any) => any) => {
    queryClient.setQueryData(transcriptKeys.detail(id), updater)
    
    // Also update the list cache if the item exists there
    queryClient.setQueryData(transcriptKeys.lists(), (oldList: any[] | undefined) => {
      if (!oldList) return oldList
      return oldList.map(item => item.id === id ? updater(item) : item)
    })
  }, [queryClient])

  // Batch invalidation for multiple operations
  const batchInvalidate = useCallback((operations: (() => void)[]) => {
    queryClient.getQueryCache().clear()
    operations.forEach(operation => operation())
  }, [queryClient])

  return {
    invalidateTranscripts,
    invalidateTranscriptLists,
    invalidateTranscriptSummary,
    prefetchTranscripts,
    clearTranscriptCache,
    refetchStaleData,
    setupBackgroundRefetch,
    handleNetworkStatusChange,
    updateTranscriptCache,
    batchInvalidate,
  }
}

// Hook for automatic cache management setup
export function useAutomaticCacheManagement() {
  const {
    setupBackgroundRefetch,
    handleNetworkStatusChange,
    prefetchTranscripts,
  } = useCacheManagement()

  useEffect(() => {
    // Set up background refetch every 5 minutes
    const cleanupRefetch = setupBackgroundRefetch(5 * 60 * 1000)

    // Set up network status handling
    const cleanupNetwork = handleNetworkStatusChange()

    // Prefetch data on mount
    prefetchTranscripts()

    return () => {
      cleanupRefetch()
      cleanupNetwork()
    }
  }, [setupBackgroundRefetch, handleNetworkStatusChange, prefetchTranscripts])
}

// Hook for managing query focus refetch behavior
export function useFocusRefetch(enabled: boolean = true) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const handleFocus = () => {
      // Refetch stale queries when window regains focus
      queryClient.refetchQueries({
        queryKey: transcriptKeys.all,
        type: 'active',
        stale: true,
      })
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [queryClient, enabled])
}