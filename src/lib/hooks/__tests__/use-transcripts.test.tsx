import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useTranscripts,
  useTranscript,
  useTranscriptSummary,
  useCreateTranscript,
  useUpdateTranscript,
  useDeleteTranscript,
  useSyncTranscripts,
  useOptimisticTranscriptUpdate,
  transcriptKeys,
} from '../use-transcripts'
import { TranscriptData, TranscriptFormData, TranscriptSummary } from '@/types/transcript'

// Mock fetch
global.fetch = jest.fn()

const mockTranscriptData: TranscriptData[] = [
  {
    id: '1',
    clientName: 'Client A',
    month: '2024-01',
    year: 2024,
    transcriptCount: 10,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    clientName: 'Client B',
    month: '2024-01',
    year: 2024,
    transcriptCount: 15,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
]

const mockTranscriptSummary: TranscriptSummary = {
  totalClients: 2,
  totalTranscripts: 25,
  averageTranscriptsPerClient: 12.5,
  dateRange: { start: '2024-01', end: '2024-01' },
  clientBreakdown: [
    {
      clientName: 'Client A',
      totalTranscripts: 10,
      monthlyAverage: 10,
      firstMonth: '2024-01',
      lastMonth: '2024-01',
    },
    {
      clientName: 'Client B',
      totalTranscripts: 15,
      monthlyAverage: 15,
      firstMonth: '2024-01',
      lastMonth: '2024-01',
    },
  ],
}

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useTranscripts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch transcripts successfully', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscriptData,
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useTranscripts(), { wrapper })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockTranscriptData)
    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts')
  })

  it('should handle fetch error', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useTranscripts(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toContain('Failed to fetch transcripts')
  })

  it('should apply client-side filters', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscriptData,
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useTranscripts({ clientName: 'Client A' }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].clientName).toBe('Client A')
  })

  it('should apply multiple filters', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscriptData,
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useTranscripts({ 
        clientName: 'Client',
        minCount: 12,
      }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].clientName).toBe('Client B')
    expect(result.current.data?.[0].transcriptCount).toBe(15)
  })
})

describe('useTranscript', () => {
  it('should fetch single transcript successfully', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscriptData[0],
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useTranscript('1'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockTranscriptData[0])
    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts/1')
  })

  it('should not fetch when id is empty', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useTranscript(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useTranscriptSummary', () => {
  it('should fetch transcript summary successfully', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscriptSummary,
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useTranscriptSummary(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockTranscriptSummary)
    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts/summary')
  })
})

describe('useCreateTranscript', () => {
  it('should create transcript successfully', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCreateTranscript(), { wrapper })

    const newTranscript: TranscriptFormData = {
      clientName: 'New Client',
      month: '2024-02',
      transcriptCount: 20,
    }

    result.current.mutate(newTranscript)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newTranscript),
    })
  })

  it('should handle create error', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Validation error',
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCreateTranscript(), { wrapper })

    const newTranscript: TranscriptFormData = {
      clientName: 'New Client',
      month: '2024-02',
      transcriptCount: 20,
    }

    result.current.mutate(newTranscript)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toContain('Failed to create transcript')
  })
})

describe('useUpdateTranscript', () => {
  it('should update transcript successfully', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useUpdateTranscript(), { wrapper })

    const updateData = { transcriptCount: 25 }

    result.current.mutate({ id: '1', data: updateData })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts/1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })
  })
})

describe('useDeleteTranscript', () => {
  it('should delete transcript successfully', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useDeleteTranscript(), { wrapper })

    result.current.mutate('1')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts/1', {
      method: 'DELETE',
    })
  })
})

describe('useSyncTranscripts', () => {
  it('should sync transcripts successfully', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscriptData,
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useSyncTranscripts(), { wrapper })

    result.current.mutate()

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockTranscriptData)
    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts/sync', {
      method: 'POST',
    })
  })
})

describe('useOptimisticTranscriptUpdate', () => {
  it('should perform optimistic update', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useOptimisticTranscriptUpdate(), { wrapper })

    const updatedData = { transcriptCount: 30 }
    const context = result.current.optimisticUpdate('1', updatedData)

    expect(context).toHaveProperty('previousData')
  })

  it('should rollback optimistic update', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useOptimisticTranscriptUpdate(), { wrapper })

    const context = { previousData: mockTranscriptData[0] }
    result.current.rollback('1', context)

    // Test passes if no error is thrown
    expect(true).toBe(true)
  })
})

describe('transcriptKeys', () => {
  it('should generate correct query keys', () => {
    expect(transcriptKeys.all).toEqual(['transcripts'])
    expect(transcriptKeys.lists()).toEqual(['transcripts', 'list'])
    expect(transcriptKeys.list({ clientName: 'Test' })).toEqual([
      'transcripts',
      'list',
      { filters: { clientName: 'Test' } },
    ])
    expect(transcriptKeys.details()).toEqual(['transcripts', 'detail'])
    expect(transcriptKeys.detail('1')).toEqual(['transcripts', 'detail', '1'])
    expect(transcriptKeys.summary()).toEqual(['transcripts', 'summary'])
  })
})