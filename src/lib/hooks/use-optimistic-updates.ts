import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { TranscriptData, TranscriptFormData } from '@/types/transcript'
import { transcriptKeys } from './use-transcripts'
import { getSyncService } from '@/lib/services/sync-service'

export interface OptimisticUpdateContext {
  previousData: any
  rollbackFn: () => void
  timestamp: Date
}

export interface OptimisticUpdateOptions {
  enableRollback?: boolean
  rollbackDelay?: number
  showOptimisticState?: boolean
}

/**
 * Hook for optimistic updates with automatic rollback on failure
 */
export function useOptimisticUpdates() {
  const queryClient = useQueryClient()
  const [optimisticOperations, setOptimisticOperations] = useState<Map<string, OptimisticUpdateContext>>(new Map())

  /**
   * Perform optimistic update for transcript creation
   */
  const optimisticCreate = useCallback(async (
    newTranscript: TranscriptFormData,
    options: OptimisticUpdateOptions = {}
  ) => {
    const { enableRollback = true, showOptimisticState = true } = options
    const tempId = `temp_${Date.now()}_${Math.random()}`
    
    const optimisticTranscript: TranscriptData = {
      id: tempId,
      ...newTranscript,
      year: parseInt(newTranscript.month.split('-')[0]),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (showOptimisticState) {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: transcriptKeys.lists() })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(transcriptKeys.lists())

      // Optimistically update the cache
      queryClient.setQueryData(transcriptKeys.lists(), (old: TranscriptData[] | undefined) => {
        return old ? [...old, optimisticTranscript] : [optimisticTranscript]
      })

      // Store rollback context
      if (enableRollback) {
        const rollbackFn = () => {
          queryClient.setQueryData(transcriptKeys.lists(), previousData)
          setOptimisticOperations(prev => {
            const newMap = new Map(prev)
            newMap.delete(tempId)
            return newMap
          })
        }

        setOptimisticOperations(prev => new Map(prev).set(tempId, {
          previousData,
          rollbackFn,
          timestamp: new Date()
        }))

        return { tempId, rollbackFn }
      }
    }

    return { tempId, rollbackFn: () => {} }
  }, [queryClient])

  /**
   * Perform optimistic update for transcript modification
   */
  const optimisticUpdate = useCallback(async (
    id: string,
    updates: Partial<TranscriptData>,
    options: OptimisticUpdateOptions = {}
  ) => {
    const { enableRollback = true, showOptimisticState = true } = options

    if (showOptimisticState) {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: transcriptKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: transcriptKeys.lists() })

      // Snapshot the previous values
      const previousDetailData = queryClient.getQueryData(transcriptKeys.detail(id))
      const previousListData = queryClient.getQueryData(transcriptKeys.lists())

      // Optimistically update the detail cache
      queryClient.setQueryData(transcriptKeys.detail(id), (old: TranscriptData | undefined) => {
        if (!old) return old
        return { ...old, ...updates, updatedAt: new Date() }
      })

      // Optimistically update the list cache
      queryClient.setQueryData(transcriptKeys.lists(), (old: TranscriptData[] | undefined) => {
        if (!old) return old
        return old.map(item => 
          item.id === id 
            ? { ...item, ...updates, updatedAt: new Date() }
            : item
        )
      })

      // Store rollback context
      if (enableRollback) {
        const rollbackFn = () => {
          queryClient.setQueryData(transcriptKeys.detail(id), previousDetailData)
          queryClient.setQueryData(transcriptKeys.lists(), previousListData)
          setOptimisticOperations(prev => {
            const newMap = new Map(prev)
            newMap.delete(id)
            return newMap
          })
        }

        setOptimisticOperations(prev => new Map(prev).set(id, {
          previousData: { detail: previousDetailData, list: previousListData },
          rollbackFn,
          timestamp: new Date()
        }))

        return { rollbackFn }
      }
    }

    return { rollbackFn: () => {} }
  }, [queryClient])

  /**
   * Perform optimistic delete
   */
  const optimisticDelete = useCallback(async (
    id: string,
    options: OptimisticUpdateOptions = {}
  ) => {
    const { enableRollback = true, showOptimisticState = true } = options

    if (showOptimisticState) {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: transcriptKeys.lists() })

      // Snapshot the previous value
      const previousListData = queryClient.getQueryData(transcriptKeys.lists())

      // Optimistically remove from cache
      queryClient.setQueryData(transcriptKeys.lists(), (old: TranscriptData[] | undefined) => {
        return old ? old.filter(item => item.id !== id) : []
      })

      // Remove detail cache
      queryClient.removeQueries({ queryKey: transcriptKeys.detail(id) })

      // Store rollback context
      if (enableRollback) {
        const rollbackFn = () => {
          queryClient.setQueryData(transcriptKeys.lists(), previousListData)
          setOptimisticOperations(prev => {
            const newMap = new Map(prev)
            newMap.delete(id)
            return newMap
          })
        }

        setOptimisticOperations(prev => new Map(prev).set(id, {
          previousData: previousListData,
          rollbackFn,
          timestamp: new Date()
        }))

        return { rollbackFn }
      }
    }

    return { rollbackFn: () => {} }
  }, [queryClient])

  /**
   * Confirm optimistic update (remove rollback capability)
   */
  const confirmOptimisticUpdate = useCallback((id: string) => {
    setOptimisticOperations(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
  }, [])

  /**
   * Rollback specific optimistic update
   */
  const rollbackOptimisticUpdate = useCallback((id: string) => {
    const operation = optimisticOperations.get(id)
    if (operation) {
      operation.rollbackFn()
    }
  }, [optimisticOperations])

  /**
   * Rollback all optimistic updates
   */
  const rollbackAllOptimisticUpdates = useCallback(() => {
    optimisticOperations.forEach(operation => {
      operation.rollbackFn()
    })
    setOptimisticOperations(new Map())
  }, [optimisticOperations])

  /**
   * Get current optimistic operations
   */
  const getOptimisticOperations = useCallback(() => {
    return Array.from(optimisticOperations.entries()).map(([id, context]) => ({
      id,
      timestamp: context.timestamp,
      age: Date.now() - context.timestamp.getTime()
    }))
  }, [optimisticOperations])

  /**
   * Clean up old optimistic operations
   */
  const cleanupOldOperations = useCallback((maxAge: number = 30000) => {
    const now = Date.now()
    setOptimisticOperations(prev => {
      const newMap = new Map()
      prev.forEach((context, id) => {
        if (now - context.timestamp.getTime() < maxAge) {
          newMap.set(id, context)
        }
      })
      return newMap
    })
  }, [])

  return {
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete,
    confirmOptimisticUpdate,
    rollbackOptimisticUpdate,
    rollbackAllOptimisticUpdates,
    getOptimisticOperations,
    cleanupOldOperations,
    hasOptimisticOperations: optimisticOperations.size > 0
  }
}

/**
 * Hook for optimistic mutations with automatic sync
 */
export function useOptimisticMutations() {
  const queryClient = useQueryClient()
  const syncService = getSyncService()
  const { optimisticCreate, optimisticUpdate, optimisticDelete, confirmOptimisticUpdate, rollbackOptimisticUpdate } = useOptimisticUpdates()

  /**
   * Create transcript with optimistic update
   */
  const createTranscriptOptimistic = useMutation({
    mutationFn: async (data: TranscriptFormData) => {
      const response = await fetch('/api/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create transcript: ${response.statusText}`)
      }
      
      return response.json()
    },
    onMutate: async (data) => {
      // Perform optimistic update
      const { tempId, rollbackFn } = await optimisticCreate(data)
      return { tempId, rollbackFn }
    },
    onSuccess: (result, variables, context) => {
      // Confirm optimistic update
      if (context?.tempId) {
        confirmOptimisticUpdate(context.tempId)
      }
      
      // Queue background sync
      syncService.queueSync(async () => {
        await syncService.backgroundSync({ direction: 'push' })
      })
      
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: transcriptKeys.all })
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.rollbackFn) {
        context.rollbackFn()
      }
      
      console.error('Failed to create transcript:', error)
    }
  })

  /**
   * Update transcript with optimistic update
   */
  const updateTranscriptOptimistic = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TranscriptFormData> }) => {
      const response = await fetch(`/api/transcripts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update transcript: ${response.statusText}`)
      }
      
      return response.json()
    },
    onMutate: async ({ id, data }) => {
      // Perform optimistic update
      const { rollbackFn } = await optimisticUpdate(id, data)
      return { rollbackFn }
    },
    onSuccess: (result, { id }, context) => {
      // Confirm optimistic update
      confirmOptimisticUpdate(id)
      
      // Queue background sync
      syncService.queueSync(async () => {
        await syncService.backgroundSync({ direction: 'push' })
      })
      
      // Invalidate specific queries
      queryClient.invalidateQueries({ queryKey: transcriptKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: transcriptKeys.summary() })
    },
    onError: (error, { id }, context) => {
      // Rollback optimistic update
      if (context?.rollbackFn) {
        context.rollbackFn()
      }
      
      console.error('Failed to update transcript:', error)
    }
  })

  /**
   * Delete transcript with optimistic update
   */
  const deleteTranscriptOptimistic = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/transcripts/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error(`Failed to delete transcript: ${response.statusText}`)
      }
    },
    onMutate: async (id) => {
      // Perform optimistic delete
      const { rollbackFn } = await optimisticDelete(id)
      return { rollbackFn }
    },
    onSuccess: (result, id, context) => {
      // Confirm optimistic update
      confirmOptimisticUpdate(id)
      
      // Queue background sync
      syncService.queueSync(async () => {
        await syncService.backgroundSync({ direction: 'push' })
      })
      
      // Remove from cache permanently
      queryClient.removeQueries({ queryKey: transcriptKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: transcriptKeys.summary() })
    },
    onError: (error, id, context) => {
      // Rollback optimistic update
      if (context?.rollbackFn) {
        context.rollbackFn()
      }
      
      console.error('Failed to delete transcript:', error)
    }
  })

  return {
    createTranscriptOptimistic,
    updateTranscriptOptimistic,
    deleteTranscriptOptimistic
  }
}

/**
 * Hook for managing optimistic update conflicts
 */
export function useOptimisticConflictResolution() {
  const [conflicts, setConflicts] = useState<Array<{
    id: string
    field: string
    localValue: any
    serverValue: any
    timestamp: Date
  }>>([])

  const addConflict = useCallback((conflict: {
    id: string
    field: string
    localValue: any
    serverValue: any
  }) => {
    setConflicts(prev => [...prev, { ...conflict, timestamp: new Date() }])
  }, [])

  const resolveConflict = useCallback((conflictId: string, resolution: 'local' | 'server' | 'merge') => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId))
    // Implementation would depend on the specific resolution strategy
  }, [])

  const clearConflicts = useCallback(() => {
    setConflicts([])
  }, [])

  return {
    conflicts,
    addConflict,
    resolveConflict,
    clearConflicts,
    hasConflicts: conflicts.length > 0
  }
}