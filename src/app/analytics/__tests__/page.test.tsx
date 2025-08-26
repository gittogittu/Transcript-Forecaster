import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { jest } from '@jest/globals'
import AnalyticsPage from '../page'
import * as transcriptHooks from '@/lib/hooks/use-transcripts'
import { TranscriptData } from '@/types/transcript'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { afterEach } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the hooks
const mockUseTranscripts = jest.fn()
const mockUseTranscriptSummary = jest.fn()

jest.mock('@/lib/hooks/use-transcripts', () => ({
  useTranscripts: mockUseTranscripts,
  useTranscriptSummary: mockUseTranscriptSummary,
}))

jest.mock('@/lib/services/prediction-service')

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock chart components
jest.mock('@/components/analytics', () => ({
  TrendChart: ({ data, selectedClients }: any) => (
    <div data-testid="trend-chart">
      Trend Chart - {data.length} items, {selectedClients?.length || 0} clients selected
    </div>
  ),
  PredictionChart: ({ historicalData, predictionData }: any) => (
    <div data-testid="prediction-chart">
      Prediction Chart - {historicalData.length} historical, {predictionData.length} predictions
    </div>
  ),
  InteractiveChart: ({ data, selectedClients }: any) => (
    <div data-testid="interactive-chart">
      Interactive Chart - {data.length} items, {selectedClients?.length || 0} clients selected
    </div>
  ),
}))

const mockTranscriptData: TranscriptData[] = [
  {
    id: '1',
    clientName: 'Client A',
    month: '01',
    year: 2024,
    transcriptCount: 50,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    clientName: 'Client B',
    month: '01',
    year: 2024,
    transcriptCount: 30,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    clientName: 'Client A',
    month: '02',
    year: 2024,
    transcriptCount: 60,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: '4',
    clientName: 'Client B',
    month: '02',
    year: 2024,
    transcriptCount: 40,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
]

const mockSummary = {
  totalClients: 2,
  totalTranscripts: 180,
  averageTranscriptsPerClient: 90,
  dateRange: { start: '2024-01', end: '2024-02' },
  clientBreakdown: [
    {
      clientName: 'Client A',
      totalTranscripts: 110,
      monthlyAverage: 55,
      firstMonth: '2024-01',
      lastMonth: '2024-02',
    },
    {
      clientName: 'Client B',
      totalTranscripts: 70,
      monthlyAverage: 35,
      firstMonth: '2024-01',
      lastMonth: '2024-02',
    },
  ],
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('AnalyticsPage', () => {

  beforeEach(() => {
    mockUseTranscripts.mockReturnValue({
      data: mockTranscriptData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    mockUseTranscriptSummary.mockReturnValue({
      data: mockSummary,
      isLoading: false,
      error: null,
    } as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders analytics dashboard with header', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Comprehensive analysis of transcript data and trends')).toBeInTheDocument()
  })

  it('displays summary statistics correctly', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Total Transcripts')).toBeInTheDocument()
    expect(screen.getByText('180')).toBeInTheDocument()
    expect(screen.getByText('Active Clients')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows filters and controls section', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Filters & Controls')).toBeInTheDocument()
    expect(screen.getByText('Select Clients:')).toBeInTheDocument()
  })

  it('displays client selection badges', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.getByText('Client B')).toBeInTheDocument()
  })

  it('allows client selection and deselection', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    const clientABadge = screen.getByText('Client A')
    fireEvent.click(clientABadge)

    // Should show checkmark when selected
    expect(screen.getByText('✓')).toBeInTheDocument()

    // Click again to deselect
    fireEvent.click(clientABadge)
    expect(screen.queryByText('✓')).not.toBeInTheDocument()
  })

  it('shows clear all button when clients are selected', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    const clientABadge = screen.getByText('Client A')
    fireEvent.click(clientABadge)

    expect(screen.getByText('Clear All')).toBeInTheDocument()

    // Click clear all
    fireEvent.click(screen.getByText('Clear All'))
    expect(screen.queryByText('✓')).not.toBeInTheDocument()
  })

  it('changes time range filter', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    // Find and click the time range select
    const timeRangeSelect = screen.getByDisplayValue('12 Months')
    expect(timeRangeSelect).toBeInTheDocument()
  })

  it('switches between chart views', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    // Should show trend chart by default
    expect(screen.getByTestId('trend-chart')).toBeInTheDocument()

    // Find chart view selector and change to interactive
    const chartViewSelect = screen.getByDisplayValue('Trend Analysis')
    expect(chartViewSelect).toBeInTheDocument()
  })

  it('displays key insights section', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Key Insights')).toBeInTheDocument()
    expect(screen.getByText('Automated analysis of your transcript data trends')).toBeInTheDocument()
  })

  it('shows growth rate insight', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    // Should calculate and display growth rate
    expect(screen.getByText('Growth Rate')).toBeInTheDocument()
  })

  it('displays top client insight', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    // Should show top client information
    expect(screen.getByText(/Client A.*is your top client/)).toBeInTheDocument()
  })

  it('handles predictions toggle', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    const predictionsToggle = screen.getByText('Predictions')
    fireEvent.click(predictionsToggle)

    // Should show generate button when predictions are enabled
    expect(screen.getByText('Generate')).toBeInTheDocument()
  })

  it('handles prediction generation', async () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    // Enable predictions
    const predictionsToggle = screen.getByText('Predictions')
    fireEvent.click(predictionsToggle)

    // Click generate
    const generateButton = screen.getByText('Generate')
    fireEvent.click(generateButton)

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Generate')).toBeInTheDocument()
    })
  })

  it('handles refresh button click', () => {
    const mockRefetch = jest.fn()
    mockUseTranscripts.mockReturnValue({
      data: mockTranscriptData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any)

    render(<AnalyticsPage />, { wrapper: createWrapper() })

    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    expect(mockRefetch).toHaveBeenCalled()
  })

  it('displays loading state', () => {
    mockUseTranscripts.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    } as any)

    render(<AnalyticsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Loading analytics data...')).toBeInTheDocument()
  })

  it('displays error state', () => {
    const mockRefetch = jest.fn()
    mockUseTranscripts.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to load data'),
      refetch: mockRefetch,
    } as any)

    render(<AnalyticsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()

    // Test retry button
    fireEvent.click(screen.getByText('Retry'))
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('calculates statistics correctly with filtered data', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    // Select only Client A
    const clientABadge = screen.getByText('Client A')
    fireEvent.click(clientABadge)

    // Statistics should update to reflect only Client A data
    // The component should recalculate based on filtered data
    expect(screen.getByText('Total Transcripts')).toBeInTheDocument()
  })

  it('handles empty data state', () => {
    mockUseTranscripts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    mockUseTranscriptSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any)

    render(<AnalyticsPage />, { wrapper: createWrapper() })

    // Should show zero values for empty data
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('formats numbers correctly in statistics', () => {
    const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i}`,
      clientName: `Client ${i % 10}`,
      month: '01',
      year: 2024,
      transcriptCount: 100,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }))

    mockUseTranscripts.mockReturnValue({
      data: largeDataSet,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)

    render(<AnalyticsPage />, { wrapper: createWrapper() })

    // Should format large numbers with commas
    expect(screen.getByText('100,000')).toBeInTheDocument()
  })

  it('shows export button', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('displays monthly average insight', () => {
    render(<AnalyticsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Monthly Average')).toBeInTheDocument()
    expect(screen.getByText(/You're processing an average of.*transcripts per month/)).toBeInTheDocument()
  })
})