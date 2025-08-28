import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { ReactNode } from 'react'
import {
  useTrends,
  usePredictions,
  useGeneratePredictions,
  useSummaryStats,
  useRealtimeAnalytics,
} from '../use-analytics'

// Mock fetch globally
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Mock analytics data
const mockTrends = [
  { date: '2024-01-01', count: 10, client: 'Client A' },
  { date: '2024-01-02', count: 15, client: 'Client A' },
  { date: '2024-01-03', count: 12, client: 'Client B' },
]

const mockPredictions = [
  {
    date: '2024-02-01',
    predicted: 18,
    actual: 16,
    confidence: { lower: 15, upper: 21 },
  },
  {
    date: '2024-02-02',
    predicted: 20,
    confidence: { lower: 17, upper: 23 },
  },
]

const mockSummary = {
  totalTranscripts: 1250,
  averagePerDay: 12.5,
  peakDay: '2024-01-15',
  peakCount: 45,
  clientBreakdown: [
    { client: 'Client A', count: 500, percentage: 40 },
    { client: 'Client B', count: 750, percentage: 60 },
  ],
}

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        refetchInterval: false, // Disable auto-refetch for tests
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useTrends', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should fetch trends successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrends,
    } as Response)

    const { result } = renderHook(() => useTrends(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockTrends)
    expect(mockFetch).toHaveBeenCalledWith('/api/analytics/trends?')
  })

  it('should handle filters in query parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrends,
    } as Response)

    const filters = { client: 'Client A', startDate: '2024-01-01' }
    const { result } = renderHook(() => useTrends(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/analytics/trends?client=Client%20A&startDate=2024-01-01'
    )
  })

  it('should handle fetch errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    } as Response)

    const { result } = renderHook(() => useTrends(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toContain('Failed to fetch trends')
  })
})

describe('usePredictions', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should fetch predictions successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPredictions,
    } as Response)

    const { result } = renderHook(() => usePredictions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockPredictions)
    expect(mockFetch).toHaveBeenCalledWith('/api/analytics/predictions?')
  })

  it('should use longer stale time for predictions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPredictions,
    } as Response)

    const { result } = renderHook(() => usePredictions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Predictions should have longer stale time (10 minutes)
    expect(result.current.isStale).toBe(false)
  })
})

describe('useGeneratePredictions', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should generate predictions successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPredictions,
    } as Response)

    const { result } = renderHook(() => useGeneratePredictions(), {
      wrapper: createWrapper(),
    })

    const predictionRequest = {
      clientName: 'Client A',
      predictionType: 'monthly' as const,
      periodsAhead: 30,
      modelType: 'linear' as const,
    }

    result.current.mutate(predictionRequest)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/analytics/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(predictionRequest),
    })
  })

  it('should handle generation errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
    } as Response)

    const { result } = renderHook(() => useGeneratePredictions(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      predictionType: 'daily',
      periodsAhead: 7,
      modelType: 'linear',
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toContain('Failed to generate predictions')
  })
})

describe('useSummaryStats', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should fetch summary statistics successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSummary,
    } as Response)

    const { result } = renderHook(() => useSummaryStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockSummary)
    expect(mockFetch).toHaveBeenCalledWith('/api/analytics/summary?')
  })

  it('should handle filters for summary stats', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSummary,
    } as Response)

    const filters = { dateRange: '2024-01-01,2024-01-31' }
    const { result } = renderHook(() => useSummaryStats(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/analytics/summary?dateRange=2024-01-01%2C2024-01-31'
    )
  })
})

describe('useRealtimeAnalytics', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should fetch all analytics data simultaneously', async () => {
    // Mock all three API calls
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrends,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredictions,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummary,
      } as Response)

    const { result } = renderHook(() => useRealtimeAnalytics(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.trends.data).toEqual(mockTrends)
    expect(result.current.predictions.data).toEqual(mockPredictions)
    expect(result.current.summary.data).toEqual(mockSummary)

    // Should have made all three API calls
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(mockFetch).toHaveBeenCalledWith('/api/analytics/trends?')
    expect(mockFetch).toHaveBeenCalledWith('/api/analytics/predictions?')
    expect(mockFetch).toHaveBeenCalledWith('/api/analytics/summary?')
  })

  it('should handle partial errors gracefully', async () => {
    // Mock trends success, predictions error, summary success
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrends,
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Service Unavailable',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummary,
      } as Response)

    const { result } = renderHook(() => useRealtimeAnalytics(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.trends.isSuccess).toBe(true)
    expect(result.current.predictions.isError).toBe(true)
    expect(result.current.summary.isSuccess).toBe(true)
    expect(result.current.isError).toBe(true) // Overall error state
  })

  it('should provide refetchAll function', async () => {
    mockFetch
      .mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response)

    const { result } = renderHook(() => useRealtimeAnalytics(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Clear previous calls
    mockFetch.mockClear()

    // Call refetchAll
    result.current.refetchAll()

    // Should trigger refetch for all queries
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })
})

// Cache behavior tests
describe('Analytics cache behavior', () => {
  it('should cache analytics data with appropriate stale times', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrends,
    } as Response)

    const wrapper = createWrapper()
    
    // First render
    const { result: result1 } = renderHook(() => useTrends(), { wrapper })
    
    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true)
    })

    // Second render should use cached data
    const { result: result2 } = renderHook(() => useTrends(), { wrapper })
    
    // Should immediately have data from cache
    expect(result2.current.data).toEqual(mockTrends)
    expect(result2.current.isLoading).toBe(false)
    
    // Should only have called fetch once
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should invalidate predictions cache after generation', async () => {
    // Mock initial predictions fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPredictions,
    } as Response)

    // Mock prediction generation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [...mockPredictions, mockPredictions[0]],
    } as Response)

    // Mock refetch after invalidation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [...mockPredictions, mockPredictions[0]],
    } as Response)

    const wrapper = createWrapper()
    
    // Fetch initial predictions
    const { result: queryResult } = renderHook(() => usePredictions(), { wrapper })
    const { result: mutationResult } = renderHook(() => useGeneratePredictions(), { wrapper })
    
    await waitFor(() => {
      expect(queryResult.current.isSuccess).toBe(true)
    })

    // Generate new predictions
    mutationResult.current.mutate({
      predictionType: 'daily',
      periodsAhead: 7,
      modelType: 'linear',
    })

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true)
    })

    // Cache should be invalidated and refetched
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3) // Initial + generate + refetch
    })
  })
})