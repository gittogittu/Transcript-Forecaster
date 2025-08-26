import { useEffect, useCallback, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSyncService, SyncResult, SyncOptions } from '@/lib/services/sync-service'
import { transcriptKeys } from './use-transcripts'
import { useCacheManagement } from './use-cache-management'

export interface RealTimeSyncConfig {
  enabled?: boolean
  syncInterval?: number // in milliseconds
  retryInterval?: number // in milliseconds
  maxRetries?: number
  syncOnFocus?: boolean
  syncOnOnline?: boolean
  conflictResolution?: 'server' | 'client' | 'merge'
}

export interface SyncStatus {
  isActive: boolean
  lastSync: Date | null
  nextSync: Date | null
  isSyncing: boolean
  error: string | null
  retryCount: number
  queueLength: number
}

const DEFAULT_CONFIG: Required<RealTimeSyncConfig> = {
  enabled: true,
  syncInterval: 5 * 60 * 1000, // 5 minutes
  retryInterval: 30 * 1000, // 30 seconds
  maxRetries: 3,
  syncOnFocus: true,
  syncOnOnline: true,
  conflictResolution: 'server'
}

/**
 * Hook for managing real-time data synchronization
 */
export function useRealTimeSync(config: RealTimeSyncConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const queryClient = useQueryClient()
  const syncService = getSyncService()
  const { invalidateTranscripts } = useCacheManagement()

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isActive: false,
    lastSync: null,
    nextSync: null,
    isSyncing: false,
    error: null,
    retryCount: 0,
    queueLength: 0
  })

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isComponentMountedRef = useRef(true)

  /**
   * Perform synchronization
   */
  const performSync = useCallback(async (options: SyncOptions = {}) => {
    if (!isComponentMountedRef.current || syncStatus.isSyncing) {
      return null
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }))

    try {
      const syncOptions: SyncOptions = {
        direction: 'bidirectional',
        validateData: true,
        conflictResolution: finalConfig.conflictResolution,
        ...options
      }

      const result = await syncService.backgroundSync(syncOptions)

      if (isComponentMountedRef.current) {
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          lastSync: new Date(),
          nextSync: new Date(Date.now() + finalConfig.syncInterval),
          error: result.success ? null : result.errors.join(', '),
          retryCount: result.success ? 0 : prev.retryCount + 1
        }))

        // Invalidate queries if sync was successful
        if (result.success && (result.recordsAdded > 0 || result.recordsUpdated > 0)) {
          invalidateTranscripts()
        }
      }

      return result
    } catch (error) {
      if (isComponentMountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          error: errorMessage,
          retryCount: prev.retryCount + 1
        }))

        // Schedule retry if within retry limit
        if (syncStatus.retryCount < finalConfig.maxRetries) {
          retryTimeoutRef.current = setTimeout(() => {
            performSync(options)
          }, finalConfig.retryInterval)
        }
      }

      return null
    }
  }, [syncStatus.isSyncing, syncStatus.retryCount, finalConfig, syncService, invalidateTranscripts])

  /**
   * Start automatic synchronization
   */
  const startSync = useCallback(() => {
    if (!finalConfig.enabled || syncStatus.isActive) {
      return
    }

    setSyncStatus(prev => ({
      ...prev,
      isActive: true,
      nextSync: new Date(Date.now() + finalConfig.syncInterval)
    }))

    // Perform initial sync
    performSync()

    // Set up interval for regular syncing
    syncIntervalRef.current = setInterval(() => {
      performSync()
    }, finalConfig.syncInterval)
  }, [finalConfig.enabled, finalConfig.syncInterval, syncStatus.isActive, performSync])

  /**
   * Stop automatic synchronization
   */
  const stopSync = useCallback(() => {
    setSyncStatus(prev => ({
      ...prev,
      isActive: false,
      nextSync: null
    }))

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  /**
   * Force immediate synchronization
   */
  const forceSync = useCallback(async (options: SyncOptions = {}) => {
    return performSync({ ...options, forceSync: true })
  }, [performSync])

  /**
   * Reset sync status and retry count
   */
  const resetSync = useCallback(() => {
    setSyncStatus(prev => ({
      ...prev,
      error: null,
      retryCount: 0
    }))
  }, [])

  /**
   * Update sync status with service status
   */
  const updateSyncStatus = useCallback(() => {
    const serviceStatus = syncService.getSyncStatus()
    setSyncStatus(prev => ({
      ...prev,
      queueLength: serviceStatus.queueLength
    }))
  }, [syncService])

  // Set up automatic sync on mount
  useEffect(() => {
    if (finalConfig.enabled) {
      startSync()
    }

    return () => {
      stopSync()
    }
  }, [finalConfig.enabled, startSync, stopSync])

  // Set up focus-based sync
  useEffect(() => {
    if (!finalConfig.syncOnFocus) return

    const handleFocus = () => {
      if (syncStatus.isActive) {
        performSync()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [finalConfig.syncOnFocus, syncStatus.isActive, performSync])

  // Set up online/offline sync
  useEffect(() => {
    if (!finalConfig.syncOnOnline) return

    const handleOnline = () => {
      if (syncStatus.isActive) {
        // Reset retry count and perform sync when coming back online
        setSyncStatus(prev => ({ ...prev, retryCount: 0 }))
        performSync()
      }
    }

    const handleOffline = () => {
      // Stop sync when offline
      stopSync()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [finalConfig.syncOnOnline, syncStatus.isActive, performSync, stopSync])

  // Update sync status periodically
  useEffect(() => {
    const statusInterval = setInterval(updateSyncStatus, 1000)
    return () => clearInterval(statusInterval)
  }, [updateSyncStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMountedRef.current = false
      stopSync()
    }
  }, [stopSync])

  return {
    syncStatus,
    startSync,
    stopSync,
    forceSync,
    resetSync,
    performSync
  }
}

/**
 * Hook for managing sync conflicts
 */
export function useSyncConflictManager() {
  const [conflicts, setConflicts] = useState<Array<{
    id: string
    field: string
    serverValue: any
    clientValue: any
    timestamp: Date
    resolved: boolean
  }>>([])

  const addConflict = useCallback((conflict: {
    id: string
    field: string
    serverValue: any
    clientValue: any
  }) => {
    setConflicts(prev => [
      ...prev.filter(c => !(c.id === conflict.id && c.field === conflict.field)),
      { ...conflict, timestamp: new Date(), resolved: false }
    ])
  }, [])

  const resolveConflict = useCallback((
    conflictId: string,
    field: string,
    resolution: 'server' | 'client' | 'merge',
    mergedValue?: any
  ) => {
    setConflicts(prev =>
      prev.map(conflict =>
        conflict.id === conflictId && conflict.field === field
          ? { ...conflict, resolved: true }
          : conflict
      )
    )

    // Here you would apply the resolution to your data
    // This depends on your specific implementation
  }, [])

  const clearResolvedConflicts = useCallback(() => {
    setConflicts(prev => prev.filter(c => !c.resolved))
  }, [])

  const clearAllConflicts = useCallback(() => {
    setConflicts([])
  }, [])

  return {
    conflicts,
    unresolvedConflicts: conflicts.filter(c => !c.resolved),
    addConflict,
    resolveConflict,
    clearResolvedConflicts,
    clearAllConflicts,
    hasUnresolvedConflicts: conflicts.some(c => !c.resolved)
  }
}

/**
 * Hook for sync performance monitoring
 */
export function useSyncPerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    averageSyncTime: number
    successRate: number
    totalSyncs: number
    failedSyncs: number
    lastSyncDuration: number
  }>({
    averageSyncTime: 0,
    successRate: 100,
    totalSyncs: 0,
    failedSyncs: 0,
    lastSyncDuration: 0
  })

  const recordSyncResult = useCallback((result: {
    success: boolean
    duration: number
  }) => {
    setMetrics(prev => {
      const newTotalSyncs = prev.totalSyncs + 1
      const newFailedSyncs = prev.failedSyncs + (result.success ? 0 : 1)
      const newSuccessRate = ((newTotalSyncs - newFailedSyncs) / newTotalSyncs) * 100

      // Calculate rolling average (last 10 syncs)
      const newAverageSyncTime = prev.totalSyncs === 0
        ? result.duration
        : (prev.averageSyncTime * Math.min(prev.totalSyncs, 9) + result.duration) / Math.min(newTotalSyncs, 10)

      return {
        averageSyncTime: newAverageSyncTime,
        successRate: newSuccessRate,
        totalSyncs: newTotalSyncs,
        failedSyncs: newFailedSyncs,
        lastSyncDuration: result.duration
      }
    })
  }, [])

  const resetMetrics = useCallback(() => {
    setMetrics({
      averageSyncTime: 0,
      successRate: 100,
      totalSyncs: 0,
      failedSyncs: 0,
      lastSyncDuration: 0
    })
  }, [])

  return {
    metrics,
    recordSyncResult,
    resetMetrics
  }
}

/**
 * Hook for managing sync queue
 */
export function useSyncQueue() {
  const syncService = getSyncService()
  const [queueStatus, setQueueStatus] = useState({
    length: 0,
    processing: false
  })

  const addToQueue = useCallback((syncFn: () => Promise<void>) => {
    syncService.queueSync(syncFn)
    updateQueueStatus()
  }, [syncService])

  const updateQueueStatus = useCallback(() => {
    const status = syncService.getSyncStatus()
    setQueueStatus({
      length: status.queueLength,
      processing: status.inProgress
    })
  }, [syncService])

  // Update queue status periodically
  useEffect(() => {
    const interval = setInterval(updateQueueStatus, 1000)
    return () => clearInterval(interval)
  }, [updateQueueStatus])

  return {
    queueStatus,
    addToQueue,
    updateQueueStatus
  }
}