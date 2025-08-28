'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/query-client'

// Types for analytics data
interface TrendData {
  date: string
  count: number
  client?: string
}

interface PredictionData {
  date: string
  predicted: number
  actual?: number
  confidence: {
    lower: number
    upper: number
  }
}

interface SummaryStats {
  totalTranscripts: number
  averagePerDay: number
  peakDay: string
  peakCount: number
  clientBreakdown: Array<{
    client: string
    count: number
    percentage: number
  }>
}

interface PredictionRequest {
  clientName?: string
  predictionType: 'daily' | 'weekly' | 'monthly'
  periodsAhead: number
  modelType: 'linear' | 'polynomial' | 'arima'
}

// API functions for analytics operations
const analyticsApi = {
  // Get trend data with filters
  getTrends: async (filters?: Record<string, any>): Promise<TrendData[]> => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }
    
    const response = await fetch(`/api/analytics/trends?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch trends: ${response.statusText}`)
    }
    return response.json()
  },

  // Get predictions
  getPredictions: async (filters?: Record<string, any>): Promise<PredictionData[]> => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }
    
    const response = await fetch(`/api/analytics/predictions?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch predictions: ${response.statusText}`)
    }
    return response.json()
  },

  // Generate new predictions
  generatePredictions: async (request: PredictionRequest): Promise<PredictionData[]> => {
    const response = await fetch('/api/analytics/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (!response.ok) {
      throw new Error(`Failed to generate predictions: ${response.statusText}`)
    }
    return response.json()
  },

  // Get summary statistics
  getSummary: async (filters?: Record<string, any>): Promise<SummaryStats> => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }
    
    const response = await fetch(`/api/analytics/summary?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch summary: ${response.statusText}`)
    }
    return response.json()
  },
}

// Hook for fetching trend data
export function useTrends(filters?: Record<string, any>) {
  return useQuery({
    queryKey: [...queryKeys.analytics.trends(), filters || {}],
    queryFn: () => analyticsApi.getTrends(filters),
    staleTime: 3 * 60 * 1000, // 3 minutes for trend data
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes for real-time updates
  })
}

// Hook for fetching predictions
export function usePredictions(filters?: Record<string, any>) {
  return useQuery({
    queryKey: [...queryKeys.analytics.predictions(), filters || {}],
    queryFn: () => analyticsApi.getPredictions(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes for predictions (they don't change often)
  })
}

// Hook for generating new predictions
export function useGeneratePredictions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: analyticsApi.generatePredictions,
    onSuccess: () => {
      // Invalidate predictions cache to show new results
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.predictions() })
    },
  })
}

// Hook for fetching summary statistics
export function useSummaryStats(filters?: Record<string, any>) {
  return useQuery({
    queryKey: [...queryKeys.analytics.summary(), filters || {}],
    queryFn: () => analyticsApi.getSummary(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes for summary stats
    refetchInterval: 3 * 60 * 1000, // Auto-refetch every 3 minutes
  })
}

// Hook for real-time analytics dashboard
export function useRealtimeAnalytics(filters?: Record<string, any>) {
  const trends = useTrends(filters)
  const predictions = usePredictions(filters)
  const summary = useSummaryStats(filters)

  return {
    trends,
    predictions,
    summary,
    isLoading: trends.isLoading || predictions.isLoading || summary.isLoading,
    isError: trends.isError || predictions.isError || summary.isError,
    error: trends.error || predictions.error || summary.error,
    refetchAll: () => {
      trends.refetch()
      predictions.refetch()
      summary.refetch()
    },
  }
}