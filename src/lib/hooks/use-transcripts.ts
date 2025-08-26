import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TranscriptData, TranscriptFormData, TranscriptFilters, TranscriptSummary } from '@/types/transcript'

// Query keys for consistent cache management
export const transcriptKeys = {
  all: ['transcripts'] as const,
  lists: () => [...transcriptKeys.all, 'list'] as const,
  list: (filters: TranscriptFilters) => [...transcriptKeys.lists(), { filters }] as const,
  details: () => [...transcriptKeys.all, 'detail'] as const,
  detail: (id: string) => [...transcriptKeys.details(), id] as const,
  summary: () => [...transcriptKeys.all, 'summary'] as const,
}

// API functions
async function fetchTranscripts(): Promise<TranscriptData[]> {
  const response = await fetch('/api/transcripts')
  if (!response.ok) {
    throw new Error(`Failed to fetch transcripts: ${response.statusText}`)
  }
  return response.json()
}

async function fetchTranscriptById(id: string): Promise<TranscriptData> {
  const response = await fetch(`/api/transcripts/${id}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch transcript: ${response.statusText}`)
  }
  return response.json()
}

async function fetchTranscriptSummary(): Promise<TranscriptSummary> {
  const response = await fetch('/api/transcripts/summary')
  if (!response.ok) {
    throw new Error(`Failed to fetch transcript summary: ${response.statusText}`)
  }
  return response.json()
}

async function createTranscript(data: TranscriptFormData): Promise<void> {
  const response = await fetch('/api/transcripts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create transcript: ${error}`)
  }
}

async function updateTranscript(id: string, data: Partial<TranscriptFormData>): Promise<void> {
  const response = await fetch(`/api/transcripts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update transcript: ${error}`)
  }
}

async function deleteTranscript(id: string): Promise<void> {
  const response = await fetch(`/api/transcripts/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete transcript: ${error}`)
  }
}

async function syncTranscripts(): Promise<TranscriptData[]> {
  const response = await fetch('/api/transcripts/sync', {
    method: 'POST',
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to sync transcripts: ${error}`)
  }
  
  return response.json()
}

// Custom hooks
export function useTranscripts(filters: TranscriptFilters = {}) {
  return useQuery({
    queryKey: transcriptKeys.list(filters),
    queryFn: fetchTranscripts,
    select: (data) => {
      // Apply client-side filtering if needed
      let filteredData = data

      if (filters.clientName) {
        filteredData = filteredData.filter(item =>
          item.clientName.toLowerCase().includes(filters.clientName!.toLowerCase())
        )
      }

      if (filters.startMonth) {
        filteredData = filteredData.filter(item => item.month >= filters.startMonth!)
      }

      if (filters.endMonth) {
        filteredData = filteredData.filter(item => item.month <= filters.endMonth!)
      }

      if (filters.minCount !== undefined) {
        filteredData = filteredData.filter(item => item.transcriptCount >= filters.minCount!)
      }

      if (filters.maxCount !== undefined) {
        filteredData = filteredData.filter(item => item.transcriptCount <= filters.maxCount!)
      }

      return filteredData
    },
  })
}

export function useTranscript(id: string) {
  return useQuery({
    queryKey: transcriptKeys.detail(id),
    queryFn: () => fetchTranscriptById(id),
    enabled: !!id,
  })
}

export function useTranscriptSummary() {
  return useQuery({
    queryKey: transcriptKeys.summary(),
    queryFn: fetchTranscriptSummary,
  })
}

export function useCreateTranscript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTranscript,
    onSuccess: () => {
      // Invalidate and refetch transcript queries
      queryClient.invalidateQueries({ queryKey: transcriptKeys.all })
    },
    onError: (error) => {
      console.error('Failed to create transcript:', error)
    },
  })
}

export function useUpdateTranscript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TranscriptFormData> }) =>
      updateTranscript(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific transcript and list queries
      queryClient.invalidateQueries({ queryKey: transcriptKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: transcriptKeys.lists() })
      queryClient.invalidateQueries({ queryKey: transcriptKeys.summary() })
    },
    onError: (error) => {
      console.error('Failed to update transcript:', error)
    },
  })
}

export function useDeleteTranscript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTranscript,
    onSuccess: (_, id) => {
      // Remove from cache and invalidate list queries
      queryClient.removeQueries({ queryKey: transcriptKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: transcriptKeys.lists() })
      queryClient.invalidateQueries({ queryKey: transcriptKeys.summary() })
    },
    onError: (error) => {
      console.error('Failed to delete transcript:', error)
    },
  })
}

export function useSyncTranscripts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: syncTranscripts,
    onSuccess: (data) => {
      // Update cache with fresh data
      queryClient.setQueryData(transcriptKeys.lists(), data)
      queryClient.invalidateQueries({ queryKey: transcriptKeys.summary() })
    },
    onError: (error) => {
      console.error('Failed to sync transcripts:', error)
    },
  })
}

// Utility hook for optimistic updates
export function useOptimisticTranscriptUpdate() {
  const queryClient = useQueryClient()

  const optimisticUpdate = (id: string, updatedData: Partial<TranscriptData>) => {
    // Cancel any outgoing refetches
    queryClient.cancelQueries({ queryKey: transcriptKeys.detail(id) })

    // Snapshot the previous value
    const previousData = queryClient.getQueryData(transcriptKeys.detail(id))

    // Optimistically update to the new value
    queryClient.setQueryData(transcriptKeys.detail(id), (old: TranscriptData | undefined) => {
      if (!old) return old
      return { ...old, ...updatedData, updatedAt: new Date() }
    })

    // Return a context object with the snapshotted value
    return { previousData }
  }

  const rollback = (id: string, context: { previousData: any }) => {
    queryClient.setQueryData(transcriptKeys.detail(id), context.previousData)
  }

  return { optimisticUpdate, rollback }
}