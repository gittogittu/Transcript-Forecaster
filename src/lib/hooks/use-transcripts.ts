'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/query-client'
import type { TranscriptData, CreateTranscriptData, UpdateTranscriptData } from '@/types/transcript'

// API functions for transcript operations
const transcriptApi = {
  // Fetch all transcripts with optional filters
  getTranscripts: async (filters?: Record<string, any>): Promise<TranscriptData[]> => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }
    
    const response = await fetch(`/api/transcripts?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch transcripts: ${response.statusText}`)
    }
    return response.json()
  },

  // Fetch single transcript by ID
  getTranscript: async (id: string): Promise<TranscriptData> => {
    const response = await fetch(`/api/transcripts/${id}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch transcript: ${response.statusText}`)
    }
    return response.json()
  },

  // Create new transcript
  createTranscript: async (data: CreateTranscriptData): Promise<TranscriptData> => {
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

  // Update existing transcript
  updateTranscript: async ({ id, data }: { id: string; data: UpdateTranscriptData }): Promise<TranscriptData> => {
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

  // Delete transcript
  deleteTranscript: async (id: string): Promise<void> => {
    const response = await fetch(`/api/transcripts/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`Failed to delete transcript: ${response.statusText}`)
    }
  },

  // Bulk operations
  bulkCreateTranscripts: async (data: CreateTranscriptData[]): Promise<TranscriptData[]> => {
    const response = await fetch('/api/transcripts/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`Failed to bulk create transcripts: ${response.statusText}`)
    }
    return response.json()
  },
}

// Hook for fetching transcripts with filters
export function useTranscripts(filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.transcripts.list(filters || {}),
    queryFn: () => transcriptApi.getTranscripts(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes for list data
  })
}

// Hook for fetching a single transcript
export function useTranscript(id: string) {
  return useQuery({
    queryKey: queryKeys.transcripts.detail(id),
    queryFn: () => transcriptApi.getTranscript(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes for detail data
  })
}

// Hook for creating transcripts with optimistic updates
export function useCreateTranscript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: transcriptApi.createTranscript,
    onMutate: async (newTranscript) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.transcripts.all })

      // Snapshot the previous value
      const previousTranscripts = queryClient.getQueriesData({ queryKey: queryKeys.transcripts.lists() })

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: queryKeys.transcripts.lists() }, (old: TranscriptData[] | undefined) => {
        if (!old) return [{ ...newTranscript, id: 'temp-id', createdAt: new Date(), updatedAt: new Date() }]
        return [...old, { ...newTranscript, id: 'temp-id', createdAt: new Date(), updatedAt: new Date() }]
      })

      return { previousTranscripts }
    },
    onError: (err, newTranscript, context) => {
      // Rollback on error
      if (context?.previousTranscripts) {
        context.previousTranscripts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.transcripts.all })
    },
  })
}

// Hook for updating transcripts with optimistic updates
export function useUpdateTranscript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: transcriptApi.updateTranscript,
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.transcripts.detail(id) })

      // Snapshot the previous value
      const previousTranscript = queryClient.getQueryData(queryKeys.transcripts.detail(id))

      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.transcripts.detail(id), (old: TranscriptData | undefined) => {
        if (!old) return undefined
        return { ...old, ...data, updatedAt: new Date() }
      })

      // Also update in lists
      queryClient.setQueriesData({ queryKey: queryKeys.transcripts.lists() }, (old: TranscriptData[] | undefined) => {
        if (!old) return old
        return old.map(transcript => 
          transcript.id === id 
            ? { ...transcript, ...data, updatedAt: new Date() }
            : transcript
        )
      })

      return { previousTranscript }
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousTranscript) {
        queryClient.setQueryData(queryKeys.transcripts.detail(id), context.previousTranscript)
      }
    },
    onSettled: (data, error, { id }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.transcripts.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.transcripts.lists() })
    },
  })
}

// Hook for deleting transcripts
export function useDeleteTranscript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: transcriptApi.deleteTranscript,
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.transcripts.all })

      // Snapshot the previous value
      const previousTranscripts = queryClient.getQueriesData({ queryKey: queryKeys.transcripts.lists() })

      // Optimistically remove from lists
      queryClient.setQueriesData({ queryKey: queryKeys.transcripts.lists() }, (old: TranscriptData[] | undefined) => {
        if (!old) return old
        return old.filter(transcript => transcript.id !== id)
      })

      return { previousTranscripts }
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousTranscripts) {
        context.previousTranscripts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.transcripts.all })
    },
  })
}

// Hook for bulk operations
export function useBulkCreateTranscripts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: transcriptApi.bulkCreateTranscripts,
    onSuccess: () => {
      // Invalidate and refetch transcript queries
      queryClient.invalidateQueries({ queryKey: queryKeys.transcripts.all })
      // Also invalidate analytics as new data affects predictions
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
    },
  })
}