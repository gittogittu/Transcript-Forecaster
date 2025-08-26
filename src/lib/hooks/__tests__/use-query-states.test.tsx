import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useQueryLoadingState,
  useQueryErrorState,
  useQueryState,
  useMutationState,
  useRetryLogic,
  useGlobalLoadingState,
  useDebouncedLoadingState,
  useErrorRecovery,
  useOptimisticErrorHandling,
} from '../use-query-states'
import { it } from 'zod/v4/locales'
import { describe } from 'node:test'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { describe } from 'node:test'
import { it } from 'zod/v4/locales'
import { afterEach } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'
import { it } from 'zod/v4/locales'
import { describe } from 'node:test'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'
import { it } from 'zod/v4/locales'
import { describe } from 'node:test'
import { it } from 'zod/v4/locales'
import { describe } from 'node:test'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { describe } from 'node:test'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { describe } from 'node:test'

// Mock fetch
global.fetch = jest.fn()

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

describe('useQueryLoadingState', () => {
  it('should extract loading states correctly', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' }),
    } as Response)

    const wrapper = createWrapper()
    
    const { result } = renderHook(() => {
      const queryResult = useQuery({
        queryKey: ['test'],
        queryFn: async () => {
          const response = await fetch('/api/test')
          return response.json()
        },
      })
      
      return useQueryLoadingState(queryResult)
    }, { wrapper })

    // Initially loading
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isInitialLoading).toBe(true)
    expect(result.current.isFetching).toBe(true)

    // Wait for completion
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
  })

  it('should detect stale data correctly', () => {
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => {
      const queryResult = useQuery({
        queryKey: ['test'],
        queryFn: () => Promise.resolve({ data: 'test' }),
        staleTime: 0, // Immediately stale
      })
      
      return useQueryLoadingState(queryResult)
    }, { wrapper })

    // Check stale state (may vary based on timing)
    expect(typeof result.current.isStale).toBe('boolean')
  })
})

describe('useQueryErrorState', () => {
  it('should extract error states correctly', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockRejectedValueOnce(new Error('Test error'))

    const wrapper = createWrapper()
    
    const { result } = renderHook(() => {
      const queryResult = useQuery({
        queryKey: ['test-error'],
        queryFn: async () => {
          const response = await fetch('/api/test-error')
          return response.json()
        },
      })
      
      return useQueryErrorState(queryResult)
    }, { wrapper })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(result.current.isError).toBe(true)
    expect(result.current.errorMessage).toBe('Test error')
    expect(result.current.canRetry).toBe(true)
    expect(result.current.retryCount).toBeGreaterThanOrEqual(0)
  })

  it('should handle error with code', async () => {
    const errorWithCode = new Error('Test error with code')
    ;(errorWithCode as any).code = 'TEST_ERROR'

    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockRejectedValueOnce(errorWithCode)

    const wrapper = createWrapper()
    
    const { result } = renderHook(() => {
      const queryResult = useQuery({
        queryKey: ['test-error-code'],
        queryFn: async () => {
          const response = await fetch('/api/test-error-code')
          return response.json()
        },
      })
      
      return useQueryErrorState(queryResult)
    }, { wrapper })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(result.current.errorCode).toBe('TEST_ERROR')
  })
})

describe('useQueryState', () => {
  it('should combine loading and error states', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' }),
    } as Response)

    const wrapper = createWrapper()
    
    const { result } = renderHook(() => {
      const queryResult = useQuery({
        queryKey: ['test-combined'],
        queryFn: async () => {
          const response = await fetch('/api/test-combined')
          return response.json()
        },
      })
      
      return useQueryState(queryResult)
    }, { wrapper })

    // Initially loading
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isError).toBe(false)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toEqual({ data: 'test' })
  })
})

describe('useMutationState', () => {
  it('should extract mutation states correctly', () => {
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => {
      const mutationResult = useMutation({
        mutationFn: async (data: any) => {
          const response = await fetch('/api/test', {
            method: 'POST',
            body: JSON.stringify(data),
          })
          return response.json()
        },
      })
      
      return useMutationState(mutationResult)
    }, { wrapper })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.canRetry).toBe(false)
    expect(typeof result.current.reset).toBe('function')
  })
})

describe('useRetryLogic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle successful retry', async () => {
    const { result } = renderHook(() => useRetryLogic())

    const mockRetryFn = jest.fn().mockResolvedValueOnce(undefined)

    await act(async () => {
      const success = await result.current.retry(mockRetryFn)
      expect(success).toBe(true)
    })

    expect(mockRetryFn).toHaveBeenCalledTimes(1)
    expect(result.current.retryCount).toBe(0)
    expect(result.current.isRetrying).toBe(false)
  })

  it('should handle failed retry', async () => {
    const { result } = renderHook(() => useRetryLogic())

    const mockRetryFn = jest.fn().mockRejectedValueOnce(new Error('Retry failed'))

    await act(async () => {
      const success = await result.current.retry(mockRetryFn)
      expect(success).toBe(false)
    })

    expect(result.current.retryCount).toBe(1)
    expect(result.current.canRetry).toBe(true)
  })

  it('should respect max retries', async () => {
    const { result } = renderHook(() => useRetryLogic())

    // Simulate multiple failed retries
    const mockRetryFn = jest.fn().mockRejectedValue(new Error('Failed'))

    await act(async () => {
      await result.current.retry(mockRetryFn)
    })
    await act(async () => {
      await result.current.retry(mockRetryFn)
    })
    await act(async () => {
      await result.current.retry(mockRetryFn)
    })

    await act(async () => {
      const success = await result.current.retry(mockRetryFn, 3)
      expect(success).toBe(false)
    })

    expect(result.current.canRetry).toBe(false)
  })

  it('should reset retry state', () => {
    const { result } = renderHook(() => useRetryLogic())

    act(() => {
      result.current.resetRetry()
    })

    expect(result.current.retryCount).toBe(0)
    expect(result.current.isRetrying).toBe(false)
  })
})

describe('useGlobalLoadingState', () => {
  it('should aggregate loading states from multiple queries', () => {
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => {
      const query1 = useQuery({
        queryKey: ['query1'],
        queryFn: () => Promise.resolve('data1'),
      })
      
      const query2 = useQuery({
        queryKey: ['query2'],
        queryFn: () => Promise.resolve('data2'),
      })
      
      return useGlobalLoadingState([query1, query2])
    }, { wrapper })

    expect(typeof result.current.isLoading).toBe('boolean')
    expect(typeof result.current.isFetching).toBe('boolean')
    expect(typeof result.current.isError).toBe('boolean')
    expect(typeof result.current.isSuccess).toBe('boolean')
    expect(Array.isArray(result.current.errors)).toBe(true)
    expect(Array.isArray(result.current.errorMessages)).toBe(true)
  })
})

describe('useDebouncedLoadingState', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should debounce loading state', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useDebouncedLoadingState(isLoading, 200),
      { initialProps: { isLoading: false } }
    )

    expect(result.current).toBe(false)

    // Start loading
    rerender({ isLoading: true })
    expect(result.current).toBe(false) // Still false due to debounce

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(200)
    })

    // Stop loading
    rerender({ isLoading: false })
    expect(result.current).toBe(false) // Immediately false
  })
})

describe('useErrorRecovery', () => {
  it('should handle successful recovery', async () => {
    const { result } = renderHook(() => useErrorRecovery())

    const mockRecoveryFn = jest.fn().mockResolvedValueOnce(undefined)

    await act(async () => {
      const recoveryResult = await result.current.attemptRecovery(mockRecoveryFn)
      expect(recoveryResult.success).toBe(true)
    })

    expect(result.current.recoveryAttempts).toBe(0)
    expect(result.current.canAttemptRecovery).toBe(true)
  })

  it('should handle failed recovery', async () => {
    const { result } = renderHook(() => useErrorRecovery())

    const mockRecoveryFn = jest.fn().mockRejectedValueOnce(new Error('Recovery failed'))

    await act(async () => {
      const recoveryResult = await result.current.attemptRecovery(mockRecoveryFn)
      expect(recoveryResult.success).toBe(false)
      expect(recoveryResult.reason).toBe('Recovery failed')
      expect(recoveryResult.canRetry).toBe(true)
    })

    expect(result.current.recoveryAttempts).toBe(1)
  })

  it('should respect max recovery attempts', async () => {
    const { result } = renderHook(() => useErrorRecovery())

    // Simulate max attempts reached
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.attemptRecovery(
          jest.fn().mockRejectedValue(new Error('Failed'))
        )
      })
    }

    await act(async () => {
      const recoveryResult = await result.current.attemptRecovery(jest.fn())
      expect(recoveryResult.success).toBe(false)
      expect(recoveryResult.reason).toBe('Max recovery attempts reached')
    })

    expect(result.current.canAttemptRecovery).toBe(false)
  })

  it('should reset recovery state', () => {
    const { result } = renderHook(() => useErrorRecovery())

    act(() => {
      result.current.resetRecovery()
    })

    expect(result.current.recoveryAttempts).toBe(0)
  })
})

describe('useOptimisticErrorHandling', () => {
  it('should manage optimistic data and errors', () => {
    const { result } = renderHook(() => useOptimisticErrorHandling<string>())

    expect(result.current.optimisticData).toBe(null)
    expect(result.current.hasOptimisticError).toBe(false)

    act(() => {
      result.current.setOptimistic('test data')
    })

    expect(result.current.optimisticData).toBe('test data')
    expect(result.current.hasOptimisticError).toBe(false)

    act(() => {
      result.current.handleOptimisticError()
    })

    expect(result.current.optimisticData).toBe('test data') // Data preserved
    expect(result.current.hasOptimisticError).toBe(true)

    act(() => {
      result.current.clearOptimistic()
    })

    expect(result.current.optimisticData).toBe(null)
    expect(result.current.hasOptimisticError).toBe(false)
  })
})