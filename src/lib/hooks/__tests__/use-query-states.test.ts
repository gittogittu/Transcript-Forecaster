import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query'
import React, { ReactNode } from 'react'
import {
  useEnhancedQuery,
  useEnhancedMutation,
  useGlobalErrorHandler,
} from '../use-query-states'

// Mock fetch globally
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

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

describe('useEnhancedQuery', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should provide enhanced loading states', async () => {
    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ data: 'test' }),
        } as Response), 100)
      )
    )

    const { result } = renderHook(() => {
      const queryResult = useQuery({
        queryKey: ['test'],
        queryFn: () => fetch('/api/test').then(res => res.json()),
      })
      return useEnhancedQuery(queryResult)
    }, {
      wrapper: createWrapper(),
    })

    // Initial loading state
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isInitialLoading).toBe(true)
    expect(result.current.isFetching).toBe(true)
    expect(result.current.isRefetching).toBe(false)
    expect(result.current.isStale).toBe(true)

    // Wait for completion
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isInitialLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toEqual({ data: 'test' })
  })

  it('should provide enhanced error states', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    } as Response)

    const { result } = renderHook(() => {
      const queryResult = useQuery({
        queryKey: ['test-error'],
        queryFn: async () => {
          const response = await fetch('/api/test-error')
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          return response.json()
        },
      })
      return useEnhancedQuery(queryResult)
    }, {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.isError).toBe(true)
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.errorMessage).toContain('HTTP 404')
    expect(result.current.errorCode).toBe('404')
    expect(result.current.canRetry).toBe(true)
  })

  it('should handle retry functionality', async () => {
    let callCount = 0
    mockFetch.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          statusText: 'Server Error',
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response)
    })

    const { result } = renderHook(() => {
      const queryResult = useQuery({
        queryKey: ['test-retry'],
        queryFn: async () => {
          const response = await fetch('/api/test-retry')
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          return response.json()
        },
      })
      return useEnhancedQuery(queryResult)
    }, {
      wrapper: createWrapper(),
    })

    // Wait for initial error
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.isError).toBe(true)
    expect(result.current.canRetry).toBe(true)

    // Retry
    act(() => {
      result.current.retry()
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toEqual({ data: 'success' })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('useEnhancedMutation', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should provide enhanced mutation states', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)

    const { result } = renderHook(() => {
      const mutationResult = useMutation({
        mutationFn: (data: any) => 
          fetch('/api/test', {
            method: 'POST',
            body: JSON.stringify(data),
          }).then(res => res.json()),
      })
      return useEnhancedMutation(mutationResult)
    }, {
      wrapper: createWrapper(),
    })

    expect(result.current.isPending).toBe(false)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.isError).toBe(false)

    // Trigger mutation
    act(() => {
      (result.current as any).mutate({ test: 'data' })
    })

    expect(result.current.isPending).toBe(true)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.isPending).toBe(false)
    expect(result.current.isSuccess).toBe(true)
  })

  it('should handle mutation errors and retry', async () => {
    let callCount = 0
    mockFetch.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          statusText: 'Bad Request',
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)
    })

    const { result } = renderHook(() => {
      const mutationResult = useMutation({
        mutationFn: async (data: any) => {
          const response = await fetch('/api/test', {
            method: 'POST',
            body: JSON.stringify(data),
          })
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          return response.json()
        },
      })
      return useEnhancedMutation(mutationResult)
    }, {
      wrapper: createWrapper(),
    })

    // Trigger mutation
    act(() => {
      (result.current as any).mutate({ test: 'data' })
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.isError).toBe(true)
    expect(result.current.errorMessage).toContain('HTTP 400')
    expect(result.current.canRetry).toBe(true)

    // Retry mutation
    act(() => {
      result.current.retry()
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.isSuccess).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should reset mutation state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)

    const { result } = renderHook(() => {
      const mutationResult = useMutation({
        mutationFn: (data: any) => 
          fetch('/api/test', {
            method: 'POST',
            body: JSON.stringify(data),
          }).then(res => res.json()),
      })
      return useEnhancedMutation(mutationResult)
    }, {
      wrapper: createWrapper(),
    })

    // Trigger mutation
    act(() => {
      (result.current as any).mutate({ test: 'data' })
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.isSuccess).toBe(true)

    // Reset state
    act(() => {
      result.current.reset()
    })

    expect(result.current.isSuccess).toBe(false)
    expect(result.current.isPending).toBe(false)
    expect(result.current.isError).toBe(false)
  })
})

describe('useGlobalErrorHandler', () => {
  it('should handle and store global errors', () => {
    const { result } = renderHook(() => useGlobalErrorHandler())

    expect(result.current.globalError).toBeNull()

    const testError = new Error('Test error')
    
    act(() => {
      result.current.handleError(testError, 'test context')
    })

    expect(result.current.globalError).toBe(testError)
  })

  it('should clear global errors', () => {
    const { result } = renderHook(() => useGlobalErrorHandler())

    const testError = new Error('Test error')
    
    act(() => {
      result.current.handleError(testError)
    })

    expect(result.current.globalError).toBe(testError)

    act(() => {
      result.current.clearError()
    })

    expect(result.current.globalError).toBeNull()
  })

  it('should log errors to console', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    const { result } = renderHook(() => useGlobalErrorHandler())

    const testError = new Error('Test error')
    
    act(() => {
      result.current.handleError(testError, 'test context')
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error in test context:', testError)

    consoleSpy.mockRestore()
  })
})