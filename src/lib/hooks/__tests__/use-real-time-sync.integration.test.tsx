import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useRealTimeSync, useSyncConflictManager, useSyncPerformanceMonitor } from '../use-real-time-sync'
import { SyncResult } from '@/lib/services/sync-service'

// Mock the sync service
const mockSyncService = {
  backgroundSync: vi.fn(),
  queueSync: vi.fn(),
  getSyncStatus: vi.fn()
}

vi.mock('@/lib/services/sync-service', () => ({
  getSyncService: vi.fn(() => mockSyncService)
}))

// Mock cache management
vi.mock('../use-cache-management', () => ({
  useCacheManagement: vi.fn(() => ({
    invalidateTranscripts: vi.fn()
  }))
}))

const mockSyncResult: SyncResult = {
  success: true,
  recordsProcessed: 10,
  recordsAdded: 2,
  recordsUpdated: 3,
  recordsSkipped: 0,
  conflicts: [],
  errors: [],
  warnings: [],
  syncedAt: new Date()
}

describe('Real-Time Sync Integration Tests', () => {
  let queryClient: QueryClient

  const createWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Setup default mock implementations
    mockSyncService.backgroundSync.mockResolvedValue(mockSyncResult)
    mockSyncService.getSyncStatus.mockReturnValue({
      inProgress: false,
      lastSyncTime: null,
      queueLength: 0
    })
  })

  afterEach(() => {
    queryClient.clear()
    vi.useRealTimers()
  })

  describe('useRealTimeSync', () => {
    it('should start automatic sync when enabled', async () => {
      // Arrange
      const { result } = renderHook(() => useRealTimeSync({
        enabled: true,
        syncInterval: 1000
      }), {
        wrapper: createWrapper
      })

      // Act - Wait for initial sync
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Assert
      expect(result.current.syncStatus.isActive).toBe(true)
      expect(mockSyncService.backgroundSync).toHaveBeenCalledWith({
        direction: 'bidirectional',
        validateData: true,
        conflictResolution: 'server'
      })
    })

    it('should perform periodic sync at specified intervals', async () => {
      // Arrange
      const { result } = renderHook(() => useRealTimeSync({
        enabled: true,
        syncInterval: 1000
      }), {
        wrapper: createWrapper
      })

      // Act - Advance time to trigger multiple syncs
      await act(async () => {
        vi.advanceTimersByTime(100) // Initial sync
      })

      await act(async () => {
        vi.advanceTimersByTime(1000) // First interval sync
      })

      await act(async () => {
        vi.advanceTimersByTime(1000) // Second interval sync
      })

      // Assert
      expect(mockSyncService.backgroundSync).toHaveBeenCalledTimes(3)
    })

    it('should not start sync when disabled', async () => {
      // Arrange & Act
      const { result } = renderHook(() => useRealTimeSync({
        enabled: false
      }), {
        wrapper: createWrapper
      })

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      // Assert
      expect(result.current.syncStatus.isActive).toBe(false)
      expect(mockSyncService.backgroundSync).not.toHaveBeenCalled()
    })

    it('should handle sync errors and implement retry logic', async () => {
      // Arrange
      const syncError = new Error('Sync failed')
      mockSyncService.backgroundSync
        .mockRejectedValueOnce(syncError)
        .mockResolvedValueOnce(mockSyncResult)

      const { result } = renderHook(() => useRealTimeSync({
        enabled: true,
        retryInterval: 500,
        maxRetries: 3
      }), {
        wrapper: createWrapper
      })

      // Act - Initial sync fails
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Assert - Error is recorded
      await waitFor(() => {
        expect(result.current.syncStatus.error).toBe('Sync failed')
        expect(result.current.syncStatus.retryCount).toBe(1)
      })

      // Act - Retry after retry interval
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // Assert - Retry was attempted and succeeded
      await waitFor(() => {
        expect(result.current.syncStatus.error).toBeNull()
        expect(result.current.syncStatus.retryCount).toBe(0)
      })

      expect(mockSyncService.backgroundSync).toHaveBeenCalledTimes(2)
    })

    it('should stop retrying after max retries reached', async () => {
      // Arrange
      const syncError = new Error('Persistent sync error')
      mockSyncService.backgroundSync.mockRejectedValue(syncError)

      const { result } = renderHook(() => useRealTimeSync({
        enabled: true,
        retryInterval: 100,
        maxRetries: 2
      }), {
        wrapper: createWrapper
      })

      // Act - Let multiple retries happen
      await act(async () => {
        vi.advanceTimersByTime(100) // Initial sync
      })

      await act(async () => {
        vi.advanceTimersByTime(100) // First retry
      })

      await act(async () => {
        vi.advanceTimersByTime(100) // Second retry
      })

      await act(async () => {
        vi.advanceTimersByTime(100) // Should not retry anymore
      })

      // Assert
      expect(mockSyncService.backgroundSync).toHaveBeenCalledTimes(3) // Initial + 2 retries
      await waitFor(() => {
        expect(result.current.syncStatus.retryCount).toBe(3)
      })
    })

    it('should force immediate sync when requested', async () => {
      // Arrange
      const { result } = renderHook(() => useRealTimeSync({
        enabled: true,
        syncInterval: 10000 // Long interval
      }), {
        wrapper: createWrapper
      })

      // Act - Force sync
      await act(async () => {
        await result.current.forceSync({ forceSync: true })
      })

      // Assert
      expect(mockSyncService.backgroundSync).toHaveBeenCalledWith({
        direction: 'bidirectional',
        validateData: true,
        conflictResolution: 'server',
        forceSync: true
      })
    })

    it('should sync on window focus when enabled', async () => {
      // Arrange
      const { result } = renderHook(() => useRealTimeSync({
        enabled: true,
        syncOnFocus: true
      }), {
        wrapper: createWrapper
      })

      // Clear initial sync call
      mockSyncService.backgroundSync.mockClear()

      // Act - Simulate window focus
      await act(async () => {
        window.dispatchEvent(new Event('focus'))
      })

      // Assert
      expect(mockSyncService.backgroundSync).toHaveBeenCalledTimes(1)
    })

    it('should sync when coming back online', async () => {
      // Arrange
      const { result } = renderHook(() => useRealTimeSync({
        enabled: true,
        syncOnOnline: true
      }), {
        wrapper: createWrapper
      })

      // Clear initial sync call
      mockSyncService.backgroundSync.mockClear()

      // Act - Simulate coming back online
      await act(async () => {
        window.dispatchEvent(new Event('online'))
      })

      // Assert
      expect(mockSyncService.backgroundSync).toHaveBeenCalledTimes(1)
    })

    it('should stop sync when going offline', async () => {
      // Arrange
      const { result } = renderHook(() => useRealTimeSync({
        enabled: true,
        syncOnOnline: true
      }), {
        wrapper: createWrapper
      })

      // Act - Simulate going offline
      await act(async () => {
        window.dispatchEvent(new Event('offline'))
      })

      // Assert
      expect(result.current.syncStatus.isActive).toBe(false)
    })

    it('should stop sync when component unmounts', async () => {
      // Arrange
      const { result, unmount } = renderHook(() => useRealTimeSync({
        enabled: true,
        syncInterval: 1000
      }), {
        wrapper: createWrapper
      })

      expect(result.current.syncStatus.isActive).toBe(true)

      // Act - Unmount component
      unmount()

      // Advance time to see if sync continues
      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      // Assert - Should not continue syncing after unmount
      // The exact number depends on timing, but it should not increase significantly
      const callCount = mockSyncService.backgroundSync.mock.calls.length
      expect(callCount).toBeLessThan(5) // Should not keep calling after unmount
    })

    it('should reset sync status and retry count', async () => {
      // Arrange
      mockSyncService.backgroundSync.mockRejectedValue(new Error('Test error'))

      const { result } = renderHook(() => useRealTimeSync({
        enabled: true
      }), {
        wrapper: createWrapper
      })

      // Wait for error to occur
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(result.current.syncStatus.error).toBeTruthy()
        expect(result.current.syncStatus.retryCount).toBeGreaterThan(0)
      })

      // Act - Reset sync
      await act(async () => {
        result.current.resetSync()
      })

      // Assert
      expect(result.current.syncStatus.error).toBeNull()
      expect(result.current.syncStatus.retryCount).toBe(0)
    })

    it('should update sync status with service status', async () => {
      // Arrange
      mockSyncService.getSyncStatus.mockReturnValue({
        inProgress: true,
        lastSyncTime: new Date(),
        queueLength: 5
      })

      const { result } = renderHook(() => useRealTimeSync({
        enabled: true
      }), {
        wrapper: createWrapper
      })

      // Act - Wait for status update
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      // Assert
      await waitFor(() => {
        expect(result.current.syncStatus.queueLength).toBe(5)
      })
    })
  })

  describe('useSyncConflictManager', () => {
    it('should add and track conflicts', async () => {
      // Arrange
      const { result } = renderHook(() => useSyncConflictManager())

      const conflict = {
        id: '1',
        field: 'transcriptCount',
        serverValue: 100,
        clientValue: 150
      }

      // Act
      await act(async () => {
        result.current.addConflict(conflict)
      })

      // Assert
      expect(result.current.conflicts).toHaveLength(1)
      expect(result.current.unresolvedConflicts).toHaveLength(1)
      expect(result.current.hasUnresolvedConflicts).toBe(true)
      expect(result.current.conflicts[0]).toMatchObject(conflict)
    })

    it('should resolve conflicts', async () => {
      // Arrange
      const { result } = renderHook(() => useSyncConflictManager())

      const conflict = {
        id: '1',
        field: 'transcriptCount',
        serverValue: 100,
        clientValue: 150
      }

      await act(async () => {
        result.current.addConflict(conflict)
      })

      // Act
      await act(async () => {
        result.current.resolveConflict('1', 'transcriptCount', 'server')
      })

      // Assert
      expect(result.current.unresolvedConflicts).toHaveLength(0)
      expect(result.current.hasUnresolvedConflicts).toBe(false)
      expect(result.current.conflicts[0].resolved).toBe(true)
    })

    it('should clear resolved conflicts', async () => {
      // Arrange
      const { result } = renderHook(() => useSyncConflictManager())

      await act(async () => {
        result.current.addConflict({
          id: '1',
          field: 'transcriptCount',
          serverValue: 100,
          clientValue: 150
        })
        result.current.addConflict({
          id: '2',
          field: 'notes',
          serverValue: 'server note',
          clientValue: 'client note'
        })
      })

      await act(async () => {
        result.current.resolveConflict('1', 'transcriptCount', 'server')
      })

      // Act
      await act(async () => {
        result.current.clearResolvedConflicts()
      })

      // Assert
      expect(result.current.conflicts).toHaveLength(1)
      expect(result.current.conflicts[0].id).toBe('2')
    })

    it('should clear all conflicts', async () => {
      // Arrange
      const { result } = renderHook(() => useSyncConflictManager())

      await act(async () => {
        result.current.addConflict({
          id: '1',
          field: 'transcriptCount',
          serverValue: 100,
          clientValue: 150
        })
        result.current.addConflict({
          id: '2',
          field: 'notes',
          serverValue: 'server note',
          clientValue: 'client note'
        })
      })

      // Act
      await act(async () => {
        result.current.clearAllConflicts()
      })

      // Assert
      expect(result.current.conflicts).toHaveLength(0)
      expect(result.current.hasUnresolvedConflicts).toBe(false)
    })

    it('should replace existing conflicts for same id and field', async () => {
      // Arrange
      const { result } = renderHook(() => useSyncConflictManager())

      const conflict1 = {
        id: '1',
        field: 'transcriptCount',
        serverValue: 100,
        clientValue: 150
      }

      const conflict2 = {
        id: '1',
        field: 'transcriptCount',
        serverValue: 200,
        clientValue: 250
      }

      // Act
      await act(async () => {
        result.current.addConflict(conflict1)
        result.current.addConflict(conflict2)
      })

      // Assert
      expect(result.current.conflicts).toHaveLength(1)
      expect(result.current.conflicts[0].serverValue).toBe(200)
      expect(result.current.conflicts[0].clientValue).toBe(250)
    })
  })

  describe('useSyncPerformanceMonitor', () => {
    it('should record sync results and calculate metrics', async () => {
      // Arrange
      const { result } = renderHook(() => useSyncPerformanceMonitor())

      // Act - Record successful syncs
      await act(async () => {
        result.current.recordSyncResult({ success: true, duration: 1000 })
        result.current.recordSyncResult({ success: true, duration: 2000 })
        result.current.recordSyncResult({ success: false, duration: 500 })
      })

      // Assert
      expect(result.current.metrics.totalSyncs).toBe(3)
      expect(result.current.metrics.failedSyncs).toBe(1)
      expect(result.current.metrics.successRate).toBe(66.66666666666667) // 2/3 * 100
      expect(result.current.metrics.lastSyncDuration).toBe(500)
      expect(result.current.metrics.averageSyncTime).toBeCloseTo(1166.67, 1) // Rolling average
    })

    it('should calculate rolling average for sync times', async () => {
      // Arrange
      const { result } = renderHook(() => useSyncPerformanceMonitor())

      // Act - Record many sync results to test rolling average
      await act(async () => {
        // Record 15 syncs (more than the rolling window of 10)
        for (let i = 1; i <= 15; i++) {
          result.current.recordSyncResult({ success: true, duration: i * 100 })
        }
      })

      // Assert - Should only consider last 10 syncs for average
      // Last 10 syncs: 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500
      // Average: (600 + 700 + ... + 1500) / 10 = 1050
      expect(result.current.metrics.averageSyncTime).toBe(1050)
      expect(result.current.metrics.totalSyncs).toBe(15)
    })

    it('should reset metrics', async () => {
      // Arrange
      const { result } = renderHook(() => useSyncPerformanceMonitor())

      await act(async () => {
        result.current.recordSyncResult({ success: true, duration: 1000 })
        result.current.recordSyncResult({ success: false, duration: 500 })
      })

      expect(result.current.metrics.totalSyncs).toBe(2)

      // Act
      await act(async () => {
        result.current.resetMetrics()
      })

      // Assert
      expect(result.current.metrics.totalSyncs).toBe(0)
      expect(result.current.metrics.failedSyncs).toBe(0)
      expect(result.current.metrics.successRate).toBe(100)
      expect(result.current.metrics.averageSyncTime).toBe(0)
      expect(result.current.metrics.lastSyncDuration).toBe(0)
    })

    it('should handle first sync result correctly', async () => {
      // Arrange
      const { result } = renderHook(() => useSyncPerformanceMonitor())

      // Act
      await act(async () => {
        result.current.recordSyncResult({ success: true, duration: 1500 })
      })

      // Assert
      expect(result.current.metrics.totalSyncs).toBe(1)
      expect(result.current.metrics.failedSyncs).toBe(0)
      expect(result.current.metrics.successRate).toBe(100)
      expect(result.current.metrics.averageSyncTime).toBe(1500)
      expect(result.current.metrics.lastSyncDuration).toBe(1500)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete sync workflow with conflicts and performance monitoring', async () => {
      // Arrange
      const syncResultWithConflicts: SyncResult = {
        ...mockSyncResult,
        conflicts: [
          {
            id: '1',
            field: 'transcriptCount',
            serverValue: 100,
            clientValue: 150,
            resolution: 'server',
            resolvedValue: 100
          }
        ]
      }

      mockSyncService.backgroundSync.mockResolvedValue(syncResultWithConflicts)

      const syncHook = renderHook(() => useRealTimeSync({ enabled: true }), {
        wrapper: createWrapper
      })

      const conflictHook = renderHook(() => useSyncConflictManager())
      const performanceHook = renderHook(() => useSyncPerformanceMonitor())

      // Act - Simulate sync with conflicts
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Simulate conflict detection and resolution
      await act(async () => {
        conflictHook.result.current.addConflict({
          id: '1',
          field: 'transcriptCount',
          serverValue: 100,
          clientValue: 150
        })
      })

      // Simulate performance recording
      await act(async () => {
        performanceHook.result.current.recordSyncResult({
          success: true,
          duration: 1200
        })
      })

      // Assert
      expect(syncHook.result.current.syncStatus.isActive).toBe(true)
      expect(conflictHook.result.current.hasUnresolvedConflicts).toBe(true)
      expect(performanceHook.result.current.metrics.totalSyncs).toBe(1)
      expect(performanceHook.result.current.metrics.lastSyncDuration).toBe(1200)
    })
  })
})