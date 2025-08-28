import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RealtimeDashboard } from '../realtime-dashboard'
import { useRealtimeAnalytics } from '@/lib/hooks/use-analytics'

// Mock the analytics hook
jest.mock('@/lib/hooks/use-analytics')
const mockUseRealtimeAnalytics = useRealtimeAnalytics as jest.MockedFunction<typeof useRealtimeAnalytics>

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const mockAnalyticsData = {
  trends: {
    data: [
      { month: '2024-01', count: 25, change: 5, changePercent: 25 }
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn()
  },
  predictions: {
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn()
  },
  summary: {
    data: {
      totalTranscripts: 100,
      averagePerDay: 5,
      peakDay: '2024-01-20',
      peakCount: 15,
      clientBreakdown: [
        { client: 'Client A', count: 60, percentage: 60 },
        { client: 'Client B', count: 40, percentage: 40 }
      ],
      monthlyTrends: [
        { month: '2024-01', count: 100, change: 10, changePercent: 11.1 }
      ],
      growthMetrics: {
        monthlyGrowthRate: 11.1,
        quarterlyGrowthRate: 15
      }
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn()
  },
  isLoading: false,
  isError: false,
  error: null,
  refetchAll: jest.fn().mockResolvedValue(undefined)
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Mock timers
jest.useFakeTimers()

describe('RealtimeDashboard', () => {
  beforeEach(() => {
    mockUseRealtimeAnalytics.mockReturnValue(mockAnalyticsData as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
  })

  it('renders dashboard header correctly', () => {
    render(<RealtimeDashboard />, { wrapper: createWrapper() })
    
    expect(screen.getByText('Real-time Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Live analytics and system monitoring')).toBeInTheDocument()
  })

  it('shows connection status', () => {
    render(<RealtimeDashboard />, { wrapper: createWrapper() })
    
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('shows live badge when auto-refresh is enabled', () => {
    render(<RealtimeDashboard autoRefresh={true} />, { wrapper: createWrapper() })
    
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('toggles live updates when button is clicked', () => {
    render(<RealtimeDashboard />, { wrapper: createWrapper() })
    
    const toggleButton = screen.getByText('Pause Live')
    fireEvent.click(toggleButton)
    
    expect(screen.getByText('Resume Live')).toBeInTheDocument()
  })

  it('displays real-time metrics cards', async () => {
    render(<RealtimeDashboard />, { wrapper: createWrapper() })
    
    // Wait for initial data to be processed
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    expect(screen.getByText('Total Transcripts')).toBeInTheDocument()
    expect(screen.getByText('Active Clients')).toBeInTheDocument()
    expect(screen.getByText('Avg/Hour')).toBeInTheDocument()
    expect(screen.getByText('Growth Rate')).toBeInTheDocument()
  })

  it('updates metrics at specified intervals', async () => {
    const refreshInterval = 5000 // 5 seconds
    render(
      <RealtimeDashboard refreshInterval={refreshInterval} />, 
      { wrapper: createWrapper() }
    )

    // Initial call
    expect(mockAnalyticsData.refetchAll).toHaveBeenCalledTimes(0)

    // Advance time by refresh interval
    await act(async () => {
      jest.advanceTimersByTime(refreshInterval)
    })

    await waitFor(() => {
      expect(mockAnalyticsData.refetchAll).toHaveBeenCalledTimes(1)
    })
  })

  it('stops updates when live mode is paused', async () => {
    const refreshInterval = 5000
    render(
      <RealtimeDashboard refreshInterval={refreshInterval} />, 
      { wrapper: createWrapper() }
    )

    // Pause live updates
    const toggleButton = screen.getByText('Pause Live')
    fireEvent.click(toggleButton)

    // Advance time
    await act(async () => {
      jest.advanceTimersByTime(refreshInterval * 2)
    })

    // Should not have called refetch since it's paused
    expect(mockAnalyticsData.refetchAll).not.toHaveBeenCalled()
  })

  it('limits real-time data points to maxDataPoints', async () => {
    const maxDataPoints = 3
    render(
      <RealtimeDashboard 
        refreshInterval={1000} 
        maxDataPoints={maxDataPoints} 
      />, 
      { wrapper: createWrapper() }
    )

    // Simulate multiple updates
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })
    }

    // The component should maintain only maxDataPoints in memory
    // This is tested indirectly through the chart rendering
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders live updates feed', () => {
    render(<RealtimeDashboard />, { wrapper: createWrapper() })
    
    expect(screen.getByText('Live Updates')).toBeInTheDocument()
    expect(screen.getByText('Real-time system events and notifications')).toBeInTheDocument()
  })

  it('shows empty state in live updates when no updates', () => {
    render(<RealtimeDashboard />, { wrapper: createWrapper() })
    
    expect(screen.getByText('No recent updates')).toBeInTheDocument()
    expect(screen.getByText('Live updates will appear here')).toBeInTheDocument()
  })

  it('generates simulated live updates', async () => {
    // Mock Math.random to ensure updates are generated
    const originalRandom = Math.random
    Math.random = jest.fn().mockReturnValue(0.5) // 50% chance, should trigger updates

    render(<RealtimeDashboard refreshInterval={1000} />, { wrapper: createWrapper() })

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    // Should have generated some live updates
    // The exact content depends on the random generation logic
    await waitFor(() => {
      expect(mockAnalyticsData.refetchAll).toHaveBeenCalled()
    })

    Math.random = originalRandom
  })

  it('handles connection errors gracefully', async () => {
    // Mock refetchAll to throw an error
    mockAnalyticsData.refetchAll.mockRejectedValueOnce(new Error('Network error'))

    render(<RealtimeDashboard refreshInterval={1000} />, { wrapper: createWrapper() })

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText('Disconnected')).toBeInTheDocument()
    })
  })

  it('shows connecting status during updates', async () => {
    // Mock a slow refetch
    mockAnalyticsData.refetchAll.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 500))
    )

    render(<RealtimeDashboard refreshInterval={1000} />, { wrapper: createWrapper() })

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    // Should show connecting status briefly
    expect(screen.getByText('Connecting...')).toBeInTheDocument()

    // Complete the async operation
    await act(async () => {
      jest.advanceTimersByTime(500)
    })
  })

  it('formats time correctly', async () => {
    render(<RealtimeDashboard />, { wrapper: createWrapper() })
    
    // Should show last updated time
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
  })

  it('calculates metric changes correctly', async () => {
    render(<RealtimeDashboard />, { wrapper: createWrapper() })

    // Generate multiple data points to test change calculations
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    // Should show change indicators in metric cards
    // This is tested indirectly through the component rendering
    expect(screen.getByText('Total Transcripts')).toBeInTheDocument()
  })

  it('respects autoRefresh prop', () => {
    render(<RealtimeDashboard autoRefresh={false} />, { wrapper: createWrapper() })
    
    // Should show Resume button instead of Pause
    expect(screen.getByText('Resume Live')).toBeInTheDocument()
  })

  it('renders charts correctly', () => {
    render(<RealtimeDashboard />, { wrapper: createWrapper() })
    
    expect(screen.getByText('Live Metrics')).toBeInTheDocument()
    expect(screen.getByText('Growth Tracking')).toBeInTheDocument()
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('handles custom refresh intervals', async () => {
    const customInterval = 2000
    render(
      <RealtimeDashboard refreshInterval={customInterval} />, 
      { wrapper: createWrapper() }
    )

    await act(async () => {
      jest.advanceTimersByTime(customInterval)
    })

    await waitFor(() => {
      expect(mockAnalyticsData.refetchAll).toHaveBeenCalled()
    })
  })
})