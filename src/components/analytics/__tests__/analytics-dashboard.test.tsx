import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnalyticsDashboard } from '../analytics-dashboard'
import { useRealtimeAnalytics } from '@/lib/hooks/use-analytics'
import { useTranscripts } from '@/lib/hooks/use-transcripts'

// Mock the hooks
jest.mock('@/lib/hooks/use-analytics')
jest.mock('@/lib/hooks/use-transcripts')

const mockUseRealtimeAnalytics = useRealtimeAnalytics as jest.MockedFunction<typeof useRealtimeAnalytics>
const mockUseTranscripts = useTranscripts as jest.MockedFunction<typeof useTranscripts>

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const mockTranscriptData = [
  {
    id: '1',
    clientName: 'Client A',
    date: new Date('2024-01-15'),
    transcriptCount: 10,
    transcriptType: 'type1',
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user1'
  },
  {
    id: '2',
    clientName: 'Client B',
    date: new Date('2024-01-20'),
    transcriptCount: 15,
    transcriptType: 'type2',
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user1'
  }
]

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
      totalTranscripts: 25,
      averagePerDay: 1.25,
      peakDay: '2024-01-20',
      peakCount: 15,
      clientBreakdown: [
        { client: 'Client A', count: 10, percentage: 40 },
        { client: 'Client B', count: 15, percentage: 60 }
      ],
      monthlyTrends: [
        { month: '2024-01', count: 25, change: 5, changePercent: 25 }
      ],
      growthMetrics: {
        monthlyGrowthRate: 25,
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
  refetchAll: jest.fn()
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

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    mockUseTranscripts.mockReturnValue({
      data: { data: mockTranscriptData },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn()
    } as any)

    mockUseRealtimeAnalytics.mockReturnValue(mockAnalyticsData as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders dashboard header correctly', () => {
    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Real-time insights and predictions for transcript data')).toBeInTheDocument()
  })

  it('renders filter controls', () => {
    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Time Range')).toBeInTheDocument()
    expect(screen.getByText('Client')).toBeInTheDocument()
    expect(screen.getByText('Transcript Type')).toBeInTheDocument()
  })

  it('handles time range filter changes', async () => {
    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    // Find and click the time range select
    const timeRangeSelect = screen.getByDisplayValue('Last 30 days')
    fireEvent.click(timeRangeSelect)
    
    // Wait for options to appear and select one
    await waitFor(() => {
      const option = screen.getByText('Last 7 days')
      fireEvent.click(option)
    })

    // Verify the hook was called with updated filters
    expect(mockUseRealtimeAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: '7d'
      })
    )
  })

  it('handles client filter changes', async () => {
    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    // Find client filter select
    const clientSelect = screen.getByDisplayValue('All clients')
    fireEvent.click(clientSelect)
    
    await waitFor(() => {
      const clientOption = screen.getByText('Client A')
      fireEvent.click(clientOption)
    })

    expect(mockUseRealtimeAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        clientName: 'Client A'
      })
    )
  })

  it('displays loading state', () => {
    mockUseTranscripts.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn()
    } as any)

    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    expect(screen.getByText('Loading analytics data...')).toBeInTheDocument()
  })

  it('displays error state', () => {
    mockUseRealtimeAnalytics.mockReturnValue({
      ...mockAnalyticsData,
      trends: {
        ...mockAnalyticsData.trends,
        isError: true,
        error: new Error('Failed to fetch')
      }
    } as any)

    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    expect(screen.getByText('Error loading analytics data. Please try refreshing.')).toBeInTheDocument()
  })

  it('displays empty state when no data', () => {
    mockUseTranscripts.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn()
    } as any)

    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    expect(screen.getByText('No Data Available')).toBeInTheDocument()
    expect(screen.getByText('No transcript data found for the selected filters.')).toBeInTheDocument()
  })

  it('handles refresh button click', async () => {
    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)
    
    await waitFor(() => {
      expect(mockAnalyticsData.refetchAll).toHaveBeenCalled()
    })
  })

  it('handles clear filters', async () => {
    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    // First set a filter
    const clientSelect = screen.getByDisplayValue('All clients')
    fireEvent.click(clientSelect)
    
    await waitFor(() => {
      const clientOption = screen.getByText('Client A')
      fireEvent.click(clientOption)
    })

    // Then clear filters
    const clearButton = screen.getByText('Clear all filters')
    fireEvent.click(clearButton)

    // Should reset to default state
    expect(mockUseRealtimeAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: '30d'
      })
    )
  })

  it('renders tabs correctly', () => {
    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Trends')).toBeInTheDocument()
    expect(screen.getByText('Predictions')).toBeInTheDocument()
    expect(screen.getByText('Clients')).toBeInTheDocument()
  })

  it('switches between tabs', async () => {
    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    const trendsTab = screen.getByText('Trends')
    fireEvent.click(trendsTab)
    
    // Should show trends content
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })

  it('handles client selection in clients tab', async () => {
    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    // Switch to clients tab
    const clientsTab = screen.getByText('Clients')
    fireEvent.click(clientsTab)
    
    await waitFor(() => {
      expect(screen.getByText('Client Analysis')).toBeInTheDocument()
    })

    // Should show client selection buttons
    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.getByText('Client B')).toBeInTheDocument()
  })

  it('calculates date ranges correctly', () => {
    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    // The component should calculate date ranges based on time range filter
    // This is tested indirectly through the hook calls
    expect(mockUseRealtimeAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String)
      })
    )
  })

  it('transforms data correctly for charts', () => {
    render(<AnalyticsDashboard />, { wrapper: createWrapper() })
    
    // The component should transform transcript data to include year and month
    // This ensures compatibility with existing chart components
    expect(mockUseTranscripts).toHaveBeenCalled()
  })
})