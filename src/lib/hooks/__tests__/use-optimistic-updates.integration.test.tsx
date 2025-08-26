import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useOptimisticUpdates, useOptimisticMutations } from '../use-optimistic-updates'
import { TranscriptData, TranscriptFormData } from '@/types/transcript'

// Mock fetch
global.fetch = vi.fn()

// Mock the sync service
vi.mock('@/lib/services/sync-service', () => ({
  getSyncService: vi.fn(() => ({
    queueSync: vi.fn()
  }))
}))

const mockTranscriptData: TranscriptData = {
  id: '1',
  clientName: 'Test Client',
  month: '2024-01',
  year: 2024,
  transcriptCount: 100,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  notes: 'Test note'
}

const mockFormData: TranscriptFormData = {
  clientName: 'New Client',
  month: '2024-02',
  transcriptCount: 200,
  notes: 'New note'
}

describe('Optimistic Updates Integration Tests', () => {
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
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('useOptimisticUpdates', () => {
    it('should perform optimistic create and rollback on failure', async () => {
      // Arrange
      const { result } = renderHook(() => useOptimisticUpdates(), {
        wrapper: createWrapper
      })

      // Pre-populate cache with existing data
      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      // Act - Perform optimistic create
      let rollbackFn: () => void
      await act(async () => {
        const { rollbackFn: fn } = await result.current.optimisticCreate(mockFormData)
        rollbackFn = fn
      })

      // Assert - Check optimistic state
      const optimisticData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(optimisticData).toHaveLength(2)
      expect(optimisticData[1].clientName).toBe('New Client')
      expect(optimisticData[1].id).toMatch(/^temp_/)

      // Act - Rollback
      await act(async () => {
        rollbackFn()
      })

      // Assert - Check rollback
      const rolledBackData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(rolledBackData).toHaveLength(1)
      expect(rolledBackData[0]).toEqual(mockTranscriptData)
    })

    it('should perform optimistic update and rollback on failure', async () => {
      // Arrange
      const { result } = renderHook(() => useOptimisticUpdates(), {
        wrapper: createWrapper
      })

      // Pre-populate cache
      queryClient.setQueryData(['transcripts', 'detail', '1'], mockTranscriptData)
      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      const updates = { transcriptCount: 300, notes: 'Updated note' }

      // Act - Perform optimistic update
      let rollbackFn: () => void
      await act(async () => {
        const { rollbackFn: fn } = await result.current.optimisticUpdate('1', updates)
        rollbackFn = fn
      })

      // Assert - Check optimistic state
      const optimisticDetailData = queryClient.getQueryData(['transcripts', 'detail', '1']) as TranscriptData
      const optimisticListData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]

      expect(optimisticDetailData.transcriptCount).toBe(300)
      expect(optimisticDetailData.notes).toBe('Updated note')
      expect(optimisticListData[0].transcriptCount).toBe(300)

      // Act - Rollback
      await act(async () => {
        rollbackFn()
      })

      // Assert - Check rollback
      const rolledBackDetailData = queryClient.getQueryData(['transcripts', 'detail', '1']) as TranscriptData
      const rolledBackListData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]

      expect(rolledBackDetailData.transcriptCount).toBe(100)
      expect(rolledBackDetailData.notes).toBe('Test note')
      expect(rolledBackListData[0].transcriptCount).toBe(100)
    })

    it('should perform optimistic delete and rollback on failure', async () => {
      // Arrange
      const { result } = renderHook(() => useOptimisticUpdates(), {
        wrapper: createWrapper
      })

      // Pre-populate cache
      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      // Act - Perform optimistic delete
      let rollbackFn: () => void
      await act(async () => {
        const { rollbackFn: fn } = await result.current.optimisticDelete('1')
        rollbackFn = fn
      })

      // Assert - Check optimistic state
      const optimisticData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(optimisticData).toHaveLength(0)

      // Act - Rollback
      await act(async () => {
        rollbackFn()
      })

      // Assert - Check rollback
      const rolledBackData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(rolledBackData).toHaveLength(1)
      expect(rolledBackData[0]).toEqual(mockTranscriptData)
    })

    it('should manage multiple optimistic operations', async () => {
      // Arrange
      const { result } = renderHook(() => useOptimisticUpdates(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      // Act - Perform multiple optimistic operations
      await act(async () => {
        await result.current.optimisticCreate(mockFormData)
        await result.current.optimisticUpdate('1', { transcriptCount: 300 })
      })

      // Assert - Check operations tracking
      const operations = result.current.getOptimisticOperations()
      expect(operations).toHaveLength(2)
      expect(result.current.hasOptimisticOperations).toBe(true)

      // Act - Rollback all
      await act(async () => {
        result.current.rollbackAllOptimisticUpdates()
      })

      // Assert - Check all operations rolled back
      expect(result.current.hasOptimisticOperations).toBe(false)
      const finalData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(finalData).toHaveLength(1)
      expect(finalData[0].transcriptCount).toBe(100)
    })

    it('should clean up old optimistic operations', async () => {
      // Arrange
      const { result } = renderHook(() => useOptimisticUpdates(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      // Act - Create optimistic operation
      await act(async () => {
        await result.current.optimisticCreate(mockFormData)
      })

      expect(result.current.getOptimisticOperations()).toHaveLength(1)

      // Act - Clean up with very short max age
      await act(async () => {
        result.current.cleanupOldOperations(0) // 0ms max age
      })

      // Assert - Operation should be cleaned up
      expect(result.current.getOptimisticOperations()).toHaveLength(0)
    })
  })

  describe('useOptimisticMutations', () => {
    it('should create transcript with optimistic update and handle success', async () => {
      // Arrange
      const mockResponse = { id: 'new-id', ...mockFormData }
      ;(fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const { result } = renderHook(() => useOptimisticMutations(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      // Act
      await act(async () => {
        result.current.createTranscriptOptimistic.mutate(mockFormData)
      })

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.createTranscriptOptimistic.isSuccess).toBe(true)
      })

      // Assert
      expect(fetch).toHaveBeenCalledWith('/api/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockFormData)
      })

      // Check that optimistic update was applied and confirmed
      const finalData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(finalData).toHaveLength(2)
    })

    it('should create transcript with optimistic update and handle failure', async () => {
      // Arrange
      ;(fetch as Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request'
      })

      const { result } = renderHook(() => useOptimisticMutations(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      // Act
      await act(async () => {
        result.current.createTranscriptOptimistic.mutate(mockFormData)
      })

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.createTranscriptOptimistic.isError).toBe(true)
      })

      // Assert - Optimistic update should be rolled back
      const finalData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(finalData).toHaveLength(1)
      expect(finalData[0]).toEqual(mockTranscriptData)
    })

    it('should update transcript with optimistic update and handle success', async () => {
      // Arrange
      const updateData = { transcriptCount: 300 }
      const mockResponse = { ...mockTranscriptData, ...updateData }
      ;(fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const { result } = renderHook(() => useOptimisticMutations(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'detail', '1'], mockTranscriptData)
      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      // Act
      await act(async () => {
        result.current.updateTranscriptOptimistic.mutate({
          id: '1',
          data: updateData
        })
      })

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.updateTranscriptOptimistic.isSuccess).toBe(true)
      })

      // Assert
      expect(fetch).toHaveBeenCalledWith('/api/transcripts/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      // Check that optimistic update was applied
      const detailData = queryClient.getQueryData(['transcripts', 'detail', '1']) as TranscriptData
      const listData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(detailData.transcriptCount).toBe(300)
      expect(listData[0].transcriptCount).toBe(300)
    })

    it('should update transcript with optimistic update and handle failure', async () => {
      // Arrange
      const updateData = { transcriptCount: 300 }
      ;(fetch as Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      })

      const { result } = renderHook(() => useOptimisticMutations(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'detail', '1'], mockTranscriptData)
      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      // Act
      await act(async () => {
        result.current.updateTranscriptOptimistic.mutate({
          id: '1',
          data: updateData
        })
      })

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.updateTranscriptOptimistic.isError).toBe(true)
      })

      // Assert - Optimistic update should be rolled back
      const detailData = queryClient.getQueryData(['transcripts', 'detail', '1']) as TranscriptData
      const listData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(detailData.transcriptCount).toBe(100)
      expect(listData[0].transcriptCount).toBe(100)
    })

    it('should delete transcript with optimistic update and handle success', async () => {
      // Arrange
      ;(fetch as Mock).mockResolvedValueOnce({
        ok: true
      })

      const { result } = renderHook(() => useOptimisticMutations(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      // Act
      await act(async () => {
        result.current.deleteTranscriptOptimistic.mutate('1')
      })

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.deleteTranscriptOptimistic.isSuccess).toBe(true)
      })

      // Assert
      expect(fetch).toHaveBeenCalledWith('/api/transcripts/1', {
        method: 'DELETE'
      })

      // Check that optimistic delete was applied
      const finalData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(finalData).toHaveLength(0)
    })

    it('should delete transcript with optimistic update and handle failure', async () => {
      // Arrange
      ;(fetch as Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden'
      })

      const { result } = renderHook(() => useOptimisticMutations(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      // Act
      await act(async () => {
        result.current.deleteTranscriptOptimistic.mutate('1')
      })

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.deleteTranscriptOptimistic.isError).toBe(true)
      })

      // Assert - Optimistic delete should be rolled back
      const finalData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(finalData).toHaveLength(1)
      expect(finalData[0]).toEqual(mockTranscriptData)
    })
  })

  describe('Network Conditions', () => {
    it('should handle network failures gracefully', async () => {
      // Arrange
      ;(fetch as Mock).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useOptimisticMutations(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      // Act
      await act(async () => {
        result.current.createTranscriptOptimistic.mutate(mockFormData)
      })

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.createTranscriptOptimistic.isError).toBe(true)
      })

      // Assert - Optimistic update should be rolled back
      const finalData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(finalData).toHaveLength(1)
      expect(finalData[0]).toEqual(mockTranscriptData)
      expect(result.current.createTranscriptOptimistic.error?.message).toBe('Network error')
    })

    it('should handle slow network responses', async () => {
      // Arrange
      const mockResponse = { id: 'new-id', ...mockFormData }
      ;(fetch as Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => mockResponse
          }), 1000)
        )
      )

      const { result } = renderHook(() => useOptimisticMutations(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      // Act
      await act(async () => {
        result.current.createTranscriptOptimistic.mutate(mockFormData)
      })

      // Assert - Optimistic update should be visible immediately
      const immediateData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(immediateData).toHaveLength(2)
      expect(result.current.createTranscriptOptimistic.isPending).toBe(true)

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.createTranscriptOptimistic.isSuccess).toBe(true)
      }, { timeout: 2000 })

      // Assert - Final state should be correct
      const finalData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(finalData).toHaveLength(2)
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent optimistic updates', async () => {
      // Arrange
      ;(fetch as Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-1', ...mockFormData }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-2', ...mockFormData }) })

      const { result } = renderHook(() => useOptimisticMutations(), {
        wrapper: createWrapper
      })

      queryClient.setQueryData(['transcripts', 'list'], [mockTranscriptData])

      // Act - Trigger multiple concurrent mutations
      await act(async () => {
        result.current.createTranscriptOptimistic.mutate(mockFormData)
        result.current.createTranscriptOptimistic.mutate({
          ...mockFormData,
          clientName: 'Another Client'
        })
      })

      // Wait for mutations to complete
      await waitFor(() => {
        expect(result.current.createTranscriptOptimistic.isSuccess).toBe(true)
      })

      // Assert - Both optimistic updates should be applied
      const finalData = queryClient.getQueryData(['transcripts', 'list']) as TranscriptData[]
      expect(finalData.length).toBeGreaterThan(1)
    })
  })
})