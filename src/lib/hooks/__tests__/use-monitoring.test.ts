import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMonitoring } from '../use-monitoring'
import { ReactNode } from 'react'

// Mock fetch
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useMonitoring', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('fetches monitoring data successfully', async () => {
    const mockMetricsResponse = {
      currentMetrics: {
        id: 'test-metrics',
        timestamp: new Date().toISOString(),
        queriesPerSecond: 2.5,
        modelRuntime: 1500,
        dataSyncLatency: 100,
        errorCount: 3,
        activeUsers: 15,
        memoryUsage: 65.5,
        cpuUsage: 42.3,
      },
      metricsSummary: {
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        averageResponseTime: 250,
        totalRequests: 1250,
        errorRate: 2.4,
        peakActiveUsers: 25,
        averageMemoryUsage: 68.2,
        averageCpuUsage: 45.1,
        topErrors: [],
      },
    }

    const mockHealthResponse = {
      overallStatus: 'healthy',
      indicators: [
        {
          component: 'api',
          status: 'healthy',
          message: 'API is operational',
          lastChecked: new Date().toISOString(),
        },
      ],
      timestamp: new Date().toISOString(),
    }

    const mockAlertsResponse = {
      alerts: [],
      type: 'active',
      timestamp: new Date().toISOString(),
    }

    const mockActivityResponse = {
      activities: [],
      summary: {
        totalActivities: 0,
        successfulActivities: 0,
        errorActivities: 0,
        uniqueUsers: 0,
        averageResponseTime: 0,
        actionCounts: {},
        topErrors: [],
      },
      timeWindow: 300000,
      timestamp: new Date().toISOString(),
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealthResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertsResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockActivityResponse,
      } as Response)

    const { result } = renderHook(() => useMonitoring(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.currentMetrics).toBeDefined()
    expect(result.current.currentMetrics?.queriesPerSecond).toBe(2.5)
    expect(result.current.metricsSummary).toBeDefined()
    expect(result.current.systemHealth).toBeDefined()
    expect(result.current.overallSystemStatus).toBe('healthy')
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() => useMonitoring(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.currentMetrics).toBeNull()
  })

  it('uses correct time range parameter', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)

    renderHook(() => useMonitoring('6h'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('timeRange=6h')
      )
    })
  })

  it('resolves alerts successfully', async () => {
    const mockResponse = { success: true }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

    const { result } = renderHook(() => useMonitoring(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await result.current.resolveAlert('test-alert-id')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/monitoring/alerts',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_alert',
          data: { alertId: 'test-alert-id' },
        }),
      })
    )
  })

  it('updates alert configuration successfully', async () => {
    const mockResponse = { success: true }
    const alertConfig = {
      id: 'test-config',
      name: 'Test Alert',
      metric: 'errorCount' as const,
      threshold: 5,
      operator: 'gt' as const,
      enabled: true,
      severity: 'high' as const,
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

    const { result } = renderHook(() => useMonitoring(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await result.current.updateAlertConfig(alertConfig)

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/monitoring/alerts',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_config',
          data: alertConfig,
        }),
      })
    )
  })

  it('records user activity successfully', async () => {
    const mockResponse = { success: true }
    const activity = {
      action: 'test_action',
      endpoint: '/api/test',
      duration: 150,
      success: true,
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

    const { result } = renderHook(() => useMonitoring(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await result.current.recordActivity(activity)

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/monitoring/activity',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      })
    )
  })

  it('refreshes metrics when called', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)

    const { result } = renderHook(() => useMonitoring(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Clear previous calls
    mockFetch.mockClear()

    result.current.refreshMetrics()

    // Should trigger new API calls
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  it('provides mutation states correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)

    const { result } = renderHook(() => useMonitoring(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(typeof result.current.isResolvingAlert).toBe('boolean')
    expect(typeof result.current.isUpdatingConfig).toBe('boolean')
    expect(typeof result.current.isRecordingActivity).toBe('boolean')
  })

  it('handles network errors in mutations', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response)

    const { result } = renderHook(() => useMonitoring(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await expect(result.current.resolveAlert('test-alert-id')).rejects.toThrow()
  })
})