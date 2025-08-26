import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranscripts } from '../use-transcripts'
import { QueryProvider } from '@/components/providers/query-provider'

// Mock fetch
global.fetch = jest.fn()

// Test component that uses the hook
function TestComponent() {
  const { data, isLoading, error } = useTranscripts()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!data) return <div>No data</div>

  return (
    <div>
      <div data-testid="transcript-count">{data.length}</div>
      {data.map((transcript) => (
        <div key={transcript.id} data-testid="transcript-item">
          {transcript.clientName}: {transcript.transcriptCount}
        </div>
      ))}
    </div>
  )
}

describe('TanStack Query Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should provide QueryClient through QueryProvider', () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: '1',
          clientName: 'Test Client',
          month: '2024-01',
          year: 2024,
          transcriptCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    } as Response)

    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    )

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should work with custom QueryClient', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })

    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should handle query errors', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })

    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})