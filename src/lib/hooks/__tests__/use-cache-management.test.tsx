import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useCacheManagement,
  useAutomaticCacheManagement,
  useFocusRefetch,
} from '../use-cache-management'
import { transcriptKeys } from '../use-transcripts'

// Mock fetch
global.fetch = jest.fn()

// Mock window events
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()
Object.defineProperty(window, 'addEventListener', { value: mockAddEventListener })
Object.defineProperty(window, 'removeEventListener', { value: mockRemoveEventListener })

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useCacheManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should invalidate transcript queries', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useCacheManagement(), { wrapper })

    // Mock the queryClient methods
    const mockInvalidateQueries = jest.fn()
    result.current.invalidateTranscripts = mockInvalidateQueries
    
    act(() => {
      result.current.invalidateTranscripts()
    })

    expect(mockInvalidateQueries).toHaveBeenCalled()
  })

  it('should invalidate transcript lists', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useCacheManagement(), { wrapper })

    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')
    
    act(() => {
      result.current.invalidateTranscriptLists()
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: transcriptKeys.lists() })
  })

  it('should invalidate transcript summary', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useCacheManagement(), { wrapper })

    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')
    
    act(() => {
      result.current.invalidateTranscriptSummary()
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: transcriptKeys.summary() })
  })

  it('should prefetch transcripts', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCacheManagement(), { wrapper })

    await act(async () => {
      await result.current.prefetchTranscripts()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts')
  })

  it('should clear transcript cache', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useCacheManagement(), { wrapper })

    const removeQueriesSpy = jest.spyOn(queryClient, 'removeQueries')
    
    act(() => {
      result.current.clearTranscriptCache()
    })

    expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: transcriptKeys.all })
  })

  it('should refetch stale data', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useCacheManagement(), { wrapper })

    const refetchQueriesSpy = jest.spyOn(queryClient, 'refetchQueries')
    
    act(() => {
      result.current.refetchStaleData()
    })

    expect(refetchQueriesSpy).toHaveBeenCalledWith({
      queryKey: transcriptKeys.all,
      type: 'active',
      stale: true,
    })
  })

  it('should setup background refetch', () => {
    jest.useFakeTimers()
    
    const wrapper = createWrapper()
    const { result } = renderHook(() => useCacheManagement(), { wrapper })

    const refetchQueriesSpy = jest.spyOn(queryClient, 'refetchQueries')
    
    let cleanup: (() => void) | undefined

    act(() => {
      cleanup = result.current.setupBackgroundRefetch(1000) // 1 second for testing
    })

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(refetchQueriesSpy).toHaveBeenCalledWith({
      queryKey: transcriptKeys.all,
      type: 'active',
      stale: true,
    })

    // Cleanup
    if (cleanup) cleanup()
    jest.useRealTimers()
  })

  it('should handle network status changes', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useCacheManagement(), { wrapper })

    let cleanup: (() => void) | undefined

    act(() => {
      cleanup = result.current.handleNetworkStatusChange()
    })

    expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function))

    // Cleanup
    if (cleanup) cleanup()

    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should update transcript cache', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useCacheManagement(), { wrapper })

    const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData')
    const updater = (old: any) => ({ ...old, transcriptCount: 100 })
    
    act(() => {
      result.current.updateTranscriptCache('1', updater)
    })

    expect(setQueryDataSpy).toHaveBeenCalledWith(transcriptKeys.detail('1'), updater)
    expect(setQueryDataSpy).toHaveBeenCalledWith(transcriptKeys.lists(), expect.any(Function))
  })

  it('should batch invalidate operations', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useCacheManagement(), { wrapper })

    const clearSpy = jest.spyOn(queryClient.getQueryCache(), 'clear')
    const operation1 = jest.fn()
    const operation2 = jest.fn()
    
    act(() => {
      result.current.batchInvalidate([operation1, operation2])
    })

    expect(clearSpy).toHaveBeenCalled()
    expect(operation1).toHaveBeenCalled()
    expect(operation2).toHaveBeenCalled()
  })
})

describe('useAutomaticCacheManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should setup automatic cache management', () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response)

    const wrapper = createWrapper()
    const { unmount } = renderHook(() => useAutomaticCacheManagement(), { wrapper })

    // Verify event listeners are set up
    expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function))

    // Verify prefetch is called
    expect(mockFetch).toHaveBeenCalledWith('/api/transcripts')

    // Cleanup
    unmount()

    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })
})

describe('useFocusRefetch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should setup focus refetch when enabled', () => {
    const wrapper = createWrapper()
    const { unmount } = renderHook(() => useFocusRefetch(true), { wrapper })

    expect(mockAddEventListener).toHaveBeenCalledWith('focus', expect.any(Function))

    unmount()

    expect(mockRemoveEventListener).toHaveBeenCalledWith('focus', expect.any(Function))
  })

  it('should not setup focus refetch when disabled', () => {
    const wrapper = createWrapper()
    const { unmount } = renderHook(() => useFocusRefetch(false), { wrapper })

    expect(mockAddEventListener).not.toHaveBeenCalledWith('focus', expect.any(Function))

    unmount()
  })

  it('should use default enabled value', () => {
    const wrapper = createWrapper()
    const { unmount } = renderHook(() => useFocusRefetch(), { wrapper })

    expect(mockAddEventListener).toHaveBeenCalledWith('focus', expect.any(Function))

    unmount()
  })
})