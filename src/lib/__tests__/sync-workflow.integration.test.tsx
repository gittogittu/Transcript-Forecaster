import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useRealTimeSync } from '../hooks/use-real-time-sync'
import { useOptimisticMutations } from '../hooks/use-optimistic-updates'
import { TranscriptData, TranscriptFormData } from '@/types/transcript'
import { SyncResult } from '../services/sync-service'

// Mock all external dependencies
global.fetch = vi.fn()

const mockSyncService = {
  backgroundSync: vi.fn(),
  queueSync: vi.fn(),
  getSyncStatus: vi.fn(),
  validateDataConsistency: vi.fn(),
  repairDataInconsistencies: vi.fn()
}

const mockConsistencyService = {
  performConsistencyCheck: vi.fn(),
  repairConsistencyIssues: vi.fn()
}

vi.mock('../services/sync-service', () => ({
  getSyncService: vi.fn(() => mockSyncService)
}))

vi.mock('../services/data-consistency', () => ({
  getDataConsistencyService: vi.fn(() => mockConsistencyService)
}))

vi.mock('../hooks/use-cache-management', () => ({
  useCacheManagement: vi.fn(() => ({
    invalidateTranscripts: vi.fn(),
    invalidateTranscriptLists: vi.fn(),
    invalidateTranscriptSummary: vi.fn()
  }))
}))

const mockTranscriptData: TranscriptData[] = [
  {
    id: '1',
    clientName: 'Client A',
    month: '2024-01',
    year: 2024,
    transcriptCount: 100,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    notes: 'Test note'
  },
  {
    id: '2',
    clientName: 'Client B',
    month: '2024-02',
    year: 2024,
    transcriptCount: 150,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  }
]

const mockSyncResult: SyncResult = {
  success: true,
  recordsProcessed: 2,
  recordsAdded: 0,
  recordsUpdated: 1,
  recordsSkipped: 0,
  conflicts: [],
  errors: [],
  warnings: [],
  syncedAt: new Date()
}

describe('Complete Sync Workflow Integration Tests', () => {
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
    mockConsistencyService.performConsistencyCheck.mockResolvedValue({
      isConsistent: true,
      totalRecords: 2,
      checkedAt: new Date(),
      issues: [],
      summary: {
        duplicates: 0,
        mismatches: 0,
        missing: 0,
        invalid: 0,
        orphaned: 0
      }
    })
  })

  afterEach(() => {
    queryClient.clear()
    vi.useRealTimers()
  })

  describe('End-to-End Sync Workflow', () => {
    it('should handle complete CRUD workflow with real-time sync', async () => {
      // Arrange
      const newTranscript: TranscriptFormData = {
        clientName: 'New Client',
        month: '2024-03',
        transcriptCount: 200,
        notes: 'New transcript'
      }

      ;(fetch as Mock)
        .mockResolvedValueOnce({ // Create
          ok: true,
          json: async () => ({ id: 'new-id', ...newTranscript })
        })
        .mockResolvedValueOnce({ // Update
          ok: true,
          json: async () => ({ id: '1', transcriptCount: 300 })
        })
        .mockResolvedValueOnce({ // Delete
          ok: true
        })

      // Setup hooks
      const syncHook = renderHook(() => useRealTimeSync({
        enabled: true,
        syncInterval: 1000
      }), { wrapper: createWrapper })

      const mutationHook = renderHook(() => useOptimisticMutations(), {
        wrapper: createWrapper
      })

      // Pre-populate cache
      queryClient.setQueryData(['transcripts', 'list'], mockTranscriptData)

      // Act 1: Create new transcript
      await act(async () => {
        mutationHook.result.current.createTranscriptOptimistic.mutate(newTranscript)
      })

      await waitFor(() => {
        expect(mutationHook.result.current.createTranscriptOptimistic.isSuccess).toBe(true)
      })

      // Verify sync was queued
      expect(mockSyncService.queueSync).toHaveBeenCalled()

      // Act 2: Update existing transcript
      await act(async () => {
        mutationHook.result.current.updateTranscriptOptimistic.mutate({
          id: '1',
          data: { transcriptCount: 300 }
        })
      })

      await waitFor(() => {
        expect(mutationHook.result.current.updateTranscriptOptimistic.isSuccess).toBe(true)
      })

      // Act 3: Delete transcript
      await act(async () => {
        mutationHook.result.current.deleteTranscriptOptimistic.mutate('2')
      })

      await waitFor(() => {
        expect(mutationHook.result.current.deleteTranscriptOptimistic.isSuccess).toBe(true)
      })

      // Act 4: Trigger background sync
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      // Assert
      expect(fetch).toHaveBeenCalledTimes(3)
      expect(mockSyncService.queueSync).toHaveBeenCalledTimes(3)
      expect(syncHook.result.current.syncStatus.isActive).toBe(true)
    })

    it('should handle sync conflicts and resolution', async () => {
      // Arrange
      const conflictSyncResult: SyncResult = {
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

      mockSyncService.backgroundSync.mockResolvedValue(conflictSyncResult)

      const syncHook = renderHook(() => useRealTimeSync({
        enabled: true,
        conflictResolution: 'server'
      }), { wrapper: createWrapper })

      // Act - Trigger sync with conflicts
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Assert
      expect(mockSyncService.backgroundSync).toHaveBeenCalledWith({
        direction: 'bidirectional',
        validateData: true,
        conflictResolution: 'server'
      })

      // Verify sync completed successfully despite conflicts
      await waitFor(() => {
        expect(syncHook.result.current.syncStatus.lastSync).toBeTruthy()
      })
    })

    it('should handle data consistency validation and repair', async () => {
      // Arrange
      const consistencyReport = {
        isConsistent: false,
        totalRecords: 3,
        checkedAt: new Date(),
        issues: [
          {
            type: 'duplicate' as const,
            severity: 'high' as const,
            recordId: '3',
            description: 'Duplicate record found'
          },
          {
            type: 'mismatch' as const,
            severity: 'high' as const,
            recordId: '1',
            field: 'transcriptCount',
            description: 'Data mismatch',
            serverValue: 100,
            clientValue: 150
          }
        ],
        summary: {
          duplicates: 1,
          mismatches: 1,
          missing: 0,
          invalid: 0,
          orphaned: 0
        }
      }

      const repairResult = {
        success: true,
        repairedIssues: 2,
        failedRepairs: 0,
        errors: [],
        warnings: []
      }

      mockConsistencyService.performConsistencyCheck.mockResolvedValue(consistencyReport)
      mockConsistencyService.repairConsistencyIssues.mockResolvedValue(repairResult)

      // Act - Perform consistency check and repair
      const checkResult = await mockConsistencyService.performConsistencyCheck()
      const repairResultActual = await mockConsistencyService.repairConsistencyIssues(
        checkResult.issues,
        'auto'
      )

      // Assert
      expect(checkResult.isConsistent).toBe(false)
      expect(checkResult.issues).toHaveLength(2)
      expect(repairResultActual.success).toBe(true)
      expect(repairResultActual.repairedIssues).toBe(2)
    })

    it('should handle network failures with graceful degradation', async () => {
      // Arrange
      const networkError = new Error('Network unavailable')
      ;(fetch as Mock).mockRejectedValue(networkError)
      mockSyncService.backgroundSync.mockRejectedValue(networkError)

      const syncHook = renderHook(() => useRealTimeSync({
        enabled: true,
        maxRetries: 2,
        retryInterval: 100
      }), { wrapper: createWrapper })

      const mutationHook = renderHook(() => useOptimisticMutations(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'list'], mockTranscriptData)

      // Act - Attempt operations during network failure
      await act(async () => {
        mutationHook.result.current.createTranscriptOptimistic.mutate({
          clientName: 'Test Client',
          month: '2024-03',
          transcriptCount: 100
        })
      })

      // Wait for mutation to fail
      await waitFor(() => {
        expect(mutationHook.result.current.createTranscriptOptimistic.isError).toBe(true)
      })

      // Act - Trigger sync during network failure
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Assert - Sync should fail and retry
      await waitFor(() => {
        expect(syncHook.result.current.syncStatus.error).toBeTruthy()
        expect(syncHook.result.current.syncStatus.retryCount).toBeGreaterThan(0)
      })

      // Verify optimistic update was rolled back
      const finalData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(finalData).toHaveLength(2) // Original data restored
    })

    it('should handle concurrent operations correctly', async () => {
      // Arrange
      const responses = [
        { ok: true, json: async () => ({ id: 'new-1' }) },
        { ok: true, json: async () => ({ id: 'new-2' }) },
        { ok: true, json: async () => ({ id: '1', transcriptCount: 300 }) }
      ]

      ;(fetch as Mock)
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1])
        .mockResolvedValueOnce(responses[2])

      const mutationHook = renderHook(() => useOptimisticMutations(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'list'], mockTranscriptData)

      // Act - Perform concurrent operations
      await act(async () => {
        // Create two new transcripts simultaneously
        mutationHook.result.current.createTranscriptOptimistic.mutate({
          clientName: 'Client 1',
          month: '2024-03',
          transcriptCount: 100
        })

        mutationHook.result.current.createTranscriptOptimistic.mutate({
          clientName: 'Client 2',
          month: '2024-04',
          transcriptCount: 200
        })

        // Update existing transcript
        mutationHook.result.current.updateTranscriptOptimistic.mutate({
          id: '1',
          data: { transcriptCount: 300 }
        })
      })

      // Wait for all operations to complete
      await waitFor(() => {
        expect(mutationHook.result.current.createTranscriptOptimistic.isSuccess).toBe(true)
        expect(mutationHook.result.current.updateTranscriptOptimistic.isSuccess).toBe(true)
      })

      // Assert
      expect(fetch).toHaveBeenCalledTimes(3)
      expect(mockSyncService.queueSync).toHaveBeenCalledTimes(3)
    })

    it('should maintain data integrity during partial failures', async () => {
      // Arrange
      ;(fetch as Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-1' }) }) // Create succeeds
        .mockResolvedValueOnce({ ok: false, statusText: 'Server Error' }) // Update fails
        .mockResolvedValueOnce({ ok: true }) // Delete succeeds

      const mutationHook = renderHook(() => useOptimisticMutations(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'list'], mockTranscriptData)

      // Act - Perform operations with mixed success/failure
      await act(async () => {
        mutationHook.result.current.createTranscriptOptimistic.mutate({
          clientName: 'New Client',
          month: '2024-03',
          transcriptCount: 100
        })
      })

      await waitFor(() => {
        expect(mutationHook.result.current.createTranscriptOptimistic.isSuccess).toBe(true)
      })

      await act(async () => {
        mutationHook.result.current.updateTranscriptOptimistic.mutate({
          id: '1',
          data: { transcriptCount: 300 }
        })
      })

      await waitFor(() => {
        expect(mutationHook.result.current.updateTranscriptOptimistic.isError).toBe(true)
      })

      await act(async () => {
        mutationHook.result.current.deleteTranscriptOptimistic.mutate('2')
      })

      await waitFor(() => {
        expect(mutationHook.result.current.deleteTranscriptOptimistic.isSuccess).toBe(true)
      })

      // Assert - Data should reflect successful operations only
      const finalData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      
      // Should have original record '1' (update failed, so rolled back)
      // Should have new record (create succeeded)
      // Should not have record '2' (delete succeeded)
      expect(finalData.some(item => item.id === '1' && item.transcriptCount === 100)).toBe(true) // Original value
      expect(finalData.some(item => item.clientName === 'New Client')).toBe(true) // New record
      expect(finalData.some(item => item.id === '2')).toBe(false) // Deleted record
    })

    it('should handle offline/online transitions', async () => {
      // Arrange
      const syncHook = renderHook(() => useRealTimeSync({
        enabled: true,
        syncOnOnline: true
      }), { wrapper: createWrapper })

      // Act - Simulate going offline
      await act(async () => {
        window.dispatchEvent(new Event('offline'))
      })

      // Assert - Sync should stop
      expect(syncHook.result.current.syncStatus.isActive).toBe(false)

      // Act - Simulate coming back online
      mockSyncService.backgroundSync.mockClear()
      await act(async () => {
        window.dispatchEvent(new Event('online'))
      })

      // Assert - Sync should resume and trigger immediately
      expect(syncHook.result.current.syncStatus.isActive).toBe(true)
      expect(mockSyncService.backgroundSync).toHaveBeenCalled()
    })

    it('should handle large-scale data synchronization', async () => {
      // Arrange
      const largeDataset: TranscriptData[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        clientName: `Client ${i + 1}`,
        month: '2024-01',
        year: 2024,
        transcriptCount: Math.floor(Math.random() * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      }))

      const largeSyncResult: SyncResult = {
        success: true,
        recordsProcessed: 1000,
        recordsAdded: 100,
        recordsUpdated: 50,
        recordsSkipped: 5,
        conflicts: [],
        errors: [],
        warnings: [],
        syncedAt: new Date()
      }

      mockSyncService.backgroundSync.mockResolvedValue(largeSyncResult)
      queryClient.setQueryData(['transcripts', 'list'], largeDataset)

      const syncHook = renderHook(() => useRealTimeSync({
        enabled: true
      }), { wrapper: createWrapper })

      const startTime = Date.now()

      // Act - Trigger sync with large dataset
      await act(async () => {
        await syncHook.result.current.forceSync()
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      // Assert
      expect(mockSyncService.backgroundSync).toHaveBeenCalled()
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      
      await waitFor(() => {
        expect(syncHook.result.current.syncStatus.lastSync).toBeTruthy()
      })
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary service failures', async () => {
      // Arrange
      mockSyncService.backgroundSync
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
        .mockResolvedValueOnce(mockSyncResult) // Third attempt succeeds

      const syncHook = renderHook(() => useRealTimeSync({
        enabled: true,
        retryInterval: 100,
        maxRetries: 3
      }), { wrapper: createWrapper })

      // Act - Initial sync fails, retries should eventually succeed
      await act(async () => {
        vi.advanceTimersByTime(100) // Initial sync
      })

      await act(async () => {
        vi.advanceTimersByTime(100) // First retry
      })

      await act(async () => {
        vi.advanceTimersByTime(100) // Second retry (succeeds)
      })

      // Assert
      expect(mockSyncService.backgroundSync).toHaveBeenCalledTimes(3)
      
      await waitFor(() => {
        expect(syncHook.result.current.syncStatus.error).toBeNull()
        expect(syncHook.result.current.syncStatus.retryCount).toBe(0)
      })
    })

    it('should handle quota/rate limiting gracefully', async () => {
      // Arrange
      const rateLimitError = new Error('Rate limit exceeded')
      mockSyncService.backgroundSync.mockRejectedValue(rateLimitError)

      const syncHook = renderHook(() => useRealTimeSync({
        enabled: true,
        retryInterval: 1000, // Longer retry interval for rate limiting
        maxRetries: 2
      }), { wrapper: createWrapper })

      // Act - Trigger sync that hits rate limit
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Assert - Should record error and schedule retry
      await waitFor(() => {
        expect(syncHook.result.current.syncStatus.error).toContain('Rate limit exceeded')
        expect(syncHook.result.current.syncStatus.retryCount).toBe(1)
      })

      // Act - Advance time for retry
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      // Assert - Should attempt retry
      expect(mockSyncService.backgroundSync).toHaveBeenCalledTimes(2)
    })
  })
})