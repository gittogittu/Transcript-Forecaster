import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { ReactNode } from 'react'
import {
  useTranscripts,
  useTranscript,
  useCreateTranscript,
  useUpdateTranscript,
  useDeleteTranscript,
  useBulkCreateTranscripts,
} from '../use-transcripts'

// Mock transcript data type
interface TranscriptData {
  id: string
  clientName: string
  date: Date
  transcriptCount: number
  transcriptType?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

// Mock fetch globally
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Mock transcript data
const mockTranscript: TranscriptData = {
  id: '1',
  clientName: 'Test Client',
  date: new Date('2024-01-01'),
  transcriptCount: 10,
  transcriptType: 'meeting',
  notes: 'Test notes',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'user1',
}

const mockTranscripts: TranscriptData[] = [
  mockTranscript,
  {
    ...mockTranscript,
    id: '2',
    clientName: 'Test Client 2',
    transcriptCount: 15,
  },
]

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

  return ({ children }: { children: ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useTranscripts', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should fetch transcripts successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscripts,
    } as Response)

    const { result } = renderHook(() => useTranscripts(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockTranscripts)
    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts?')
  })

  it('should handle filters in query parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscripts,
    } as Response)

    const filters = { clientName: 'Test Client', startDate: '2024-01-01' }
    const { result } = renderHook(() => useTranscripts(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/transcripts?clientName=Test%20Client&startDate=2024-01-01'
    )
  })

  it('should handle fetch errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    } as Response)

    const { result } = renderHook(() => useTranscripts(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toContain('Failed to fetch transcripts')
  })
})

describe('useTranscript', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should fetch single transcript successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscript,
    } as Response)

    const { result } = renderHook(() => useTranscript('1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockTranscript)
    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts/1')
  })

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useTranscript(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('useCreateTranscript', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should create transcript successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscript,
    } as Response)

    const { result } = renderHook(() => useCreateTranscript(), {
      wrapper: createWrapper(),
    })

    const newTranscriptData = {
      clientName: 'New Client',
      date: new Date('2024-01-02'),
      transcriptCount: 5,
      createdBy: 'user1',
    }

    result.current.mutate(newTranscriptData)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTranscriptData),
    })
  })

  it('should handle creation errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
    } as Response)

    const { result } = renderHook(() => useCreateTranscript(), {
      wrapper: createWrapper(),
    })

    const newTranscriptData = {
      clientName: 'New Client',
      date: new Date('2024-01-02'),
      transcriptCount: 5,
      createdBy: 'user1',
    }

    result.current.mutate(newTranscriptData)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toContain('Failed to create transcript')
  })
})

describe('useUpdateTranscript', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should update transcript successfully', async () => {
    const updatedTranscript = { ...mockTranscript, transcriptCount: 20 }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedTranscript,
    } as Response)

    const { result } = renderHook(() => useUpdateTranscript(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: '1',
      data: { transcriptCount: 20 },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcriptCount: 20 }),
    })
  })
})

describe('useDeleteTranscript', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should delete transcript successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
    } as Response)

    const { result } = renderHook(() => useDeleteTranscript(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('1')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts/1', {
      method: 'DELETE',
    })
  })
})

describe('useBulkCreateTranscripts', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should bulk create transcripts successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscripts,
    } as Response)

    const { result } = renderHook(() => useBulkCreateTranscripts(), {
      wrapper: createWrapper(),
    })

    const bulkData = [
      {
        clientName: 'Bulk Client 1',
        date: new Date('2024-01-01'),
        transcriptCount: 10,
        createdBy: 'user1',
      },
      {
        clientName: 'Bulk Client 2',
        date: new Date('2024-01-02'),
        transcriptCount: 15,
        createdBy: 'user1',
      },
    ]

    result.current.mutate(bulkData)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bulkData),
    })
  })
})

// Cache behavior tests
describe('Cache behavior', () => {
  it('should cache transcript data correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscripts,
    } as Response)

    const wrapper = createWrapper()
    
    // First render
    const { result: result1 } = renderHook(() => useTranscripts(), { wrapper })
    
    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true)
    })

    // Second render should use cached data
    const { result: result2 } = renderHook(() => useTranscripts(), { wrapper })
    
    // Should immediately have data from cache
    expect(result2.current.data).toEqual(mockTranscripts)
    expect(result2.current.isLoading).toBe(false)
    
    // Should only have called fetch once
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should invalidate cache on mutations', async () => {
    // Mock successful fetch for initial data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscripts,
    } as Response)

    // Mock successful create
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscript,
    } as Response)

    // Mock refetch after invalidation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [...mockTranscripts, mockTranscript],
    } as Response)

    const wrapper = createWrapper()
    
    // Fetch initial data
    const { result: queryResult } = renderHook(() => useTranscripts(), { wrapper })
    const { result: mutationResult } = renderHook(() => useCreateTranscript(), { wrapper })
    
    await waitFor(() => {
      expect(queryResult.current.isSuccess).toBe(true)
    })

    // Perform mutation
    mutationResult.current.mutate({
      clientName: 'New Client',
      date: new Date(),
      transcriptCount: 5,
      createdBy: 'user1',
    })

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true)
    })

    // Cache should be invalidated and refetched
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3) // Initial + create + refetch
    })
  })
})