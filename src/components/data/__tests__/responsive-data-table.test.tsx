import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ResponsiveDataTable } from '../responsive-data-table'
import { useTranscripts } from '@/lib/hooks/use-transcripts'

// Mock the hooks
jest.mock('@/lib/hooks/use-transcripts')
const mockUseTranscripts = useTranscripts as jest.MockedFunction<typeof useTranscripts>

// Mock data
const mockData = [
  {
    id: '1',
    clientName: 'Client A',
    month: '2024-01',
    year: 2024,
    transcriptCount: 150,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    notes: 'Test note A'
  }
]

// Mock window.innerWidth
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  window.dispatchEvent(new Event('resize'))
}

describe('ResponsiveDataTable', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    mockUseTranscripts.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isFetching: false,
      isSuccess: true,
      status: 'success'
    } as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('renders desktop table on large screens', async () => {
    mockInnerWidth(1024) // Desktop width
    
    renderWithQueryClient(<ResponsiveDataTable />)
    
    await waitFor(() => {
      // Should render the full data table with headers
      expect(screen.getByText('Historical Transcript Data')).toBeInTheDocument()
      expect(screen.getByText('Client Name')).toBeInTheDocument()
      expect(screen.getByText('Month')).toBeInTheDocument()
      expect(screen.getByText('Transcript Count')).toBeInTheDocument()
    })
  })

  it('renders mobile table on small screens', async () => {
    mockInnerWidth(600) // Mobile width
    
    renderWithQueryClient(<ResponsiveDataTable />)
    
    await waitFor(() => {
      // Should render mobile cards instead of table headers
      expect(screen.getByText('Client A')).toBeInTheDocument()
      expect(screen.queryByText('Client Name')).not.toBeInTheDocument() // No table headers
    })
  })

  it('switches between desktop and mobile views on resize', async () => {
    mockInnerWidth(1024) // Start with desktop
    
    renderWithQueryClient(<ResponsiveDataTable />)
    
    await waitFor(() => {
      expect(screen.getByText('Historical Transcript Data')).toBeInTheDocument()
    })
    
    // Resize to mobile
    mockInnerWidth(600)
    
    await waitFor(() => {
      // Should switch to mobile view
      expect(screen.queryByText('Client Name')).not.toBeInTheDocument()
    })
  })

  it('passes filters to useTranscripts hook', () => {
    const filters = { clientName: 'Test Client' }
    
    renderWithQueryClient(<ResponsiveDataTable filters={filters} />)
    
    expect(mockUseTranscripts).toHaveBeenCalledWith(filters)
  })

  it('handles loading state correctly', async () => {
    mockUseTranscripts.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isFetching: true,
      isSuccess: false,
      status: 'loading'
    } as any)

    mockInnerWidth(1024)
    
    renderWithQueryClient(<ResponsiveDataTable />)
    
    await waitFor(() => {
      // Should show loading skeletons - check for skeleton class instead of testid
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  it('handles error state correctly', async () => {
    const errorMessage = 'Failed to fetch data'
    mockUseTranscripts.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: errorMessage },
      refetch: jest.fn(),
      isError: true,
      isFetching: false,
      isSuccess: false,
      status: 'error'
    } as any)

    mockInnerWidth(1024)
    
    renderWithQueryClient(<ResponsiveDataTable />)
    
    await waitFor(() => {
      expect(screen.getByText(`Error loading data: ${errorMessage}`)).toBeInTheDocument()
    })
  })

  it('calls refetch when refresh is triggered', async () => {
    const mockRefetch = jest.fn()
    const mockOnRefresh = jest.fn()
    
    mockUseTranscripts.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isError: false,
      isFetching: false,
      isSuccess: true,
      status: 'success'
    } as any)

    mockInnerWidth(1024)
    
    renderWithQueryClient(<ResponsiveDataTable onRefresh={mockOnRefresh} />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    refreshButton.click()
    
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalledTimes(1)
      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })
  })

  it('applies additional client-side filtering if needed', () => {
    const filters = { clientName: 'Client A' }
    
    renderWithQueryClient(<ResponsiveDataTable filters={filters} />)
    
    // The component should pass filters to useTranscripts
    expect(mockUseTranscripts).toHaveBeenCalledWith(filters)
  })

  it('handles empty data state correctly', async () => {
    mockUseTranscripts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isFetching: false,
      isSuccess: true,
      status: 'success'
    } as any)

    mockInnerWidth(1024)
    
    renderWithQueryClient(<ResponsiveDataTable />)
    
    await waitFor(() => {
      expect(screen.getByText('No transcript data available')).toBeInTheDocument()
    })
  })

  it('cleans up resize event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    
    const { unmount } = renderWithQueryClient(<ResponsiveDataTable />)
    
    unmount()
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    
    removeEventListenerSpy.mockRestore()
  })

  it('uses correct breakpoint for mobile detection', async () => {
    // Test right at the breakpoint
    mockInnerWidth(768) // Should be desktop (>= 768)
    
    renderWithQueryClient(<ResponsiveDataTable />)
    
    await waitFor(() => {
      expect(screen.getByText('Historical Transcript Data')).toBeInTheDocument()
    })
    
    // Test just below breakpoint
    mockInnerWidth(767) // Should be mobile (< 768)
    
    await waitFor(() => {
      expect(screen.queryByText('Client Name')).not.toBeInTheDocument()
    })
  })

  it('maintains state during view transitions', async () => {
    mockInnerWidth(1024)
    
    renderWithQueryClient(<ResponsiveDataTable />)
    
    await waitFor(() => {
      expect(screen.getByText('Client A')).toBeInTheDocument()
    })
    
    // Switch to mobile
    mockInnerWidth(600)
    
    await waitFor(() => {
      // Data should still be visible in mobile view
      expect(screen.getByText('Client A')).toBeInTheDocument()
    })
  })
})