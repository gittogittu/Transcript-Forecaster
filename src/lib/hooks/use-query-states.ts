import { useQuery, useMutation, UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { useState, useCallback } from 'react'

// Enhanced loading states
export interface LoadingState {
  isLoading: boolean
  isInitialLoading: boolean
  isFetching: boolean
  isRefetching: boolean
  isLoadingError: boolean
  isStale: boolean
}

// Enhanced error state
export interface ErrorState {
  error: Error | null
  isError: boolean
  errorMessage: string | null
  errorCode: string | null
  canRetry: boolean
  retryCount: number
}

// Combined query state
export interface QueryState<T> extends LoadingState, ErrorState {
  data: T | undefined
  isSuccess: boolean
  dataUpdatedAt: number
  lastSuccessAt: number
}

// Hook to extract enhanced loading states from query result
export function useQueryLoadingState<T>(queryResult: UseQueryResult<T>): LoadingState {
  const {
    isLoading,
    isFetching,
    isRefetching,
    isError,
    isStale,
    dataUpdatedAt,
  } = queryResult

  return {
    isLoading,
    isInitialLoading: isLoading && !dataUpdatedAt,
    isFetching,
    isRefetching,
    isLoadingError: isError && isLoading,
    isStale,
  }
}

// Hook to extract enhanced error states from query result
export function useQueryErrorState<T>(queryResult: UseQueryResult<T>): ErrorState {
  const { error, isError, failureCount, failureReason } = queryResult

  const errorMessage = error?.message || null
  const errorCode = error instanceof Error && 'code' in error 
    ? (error as any).code 
    : null

  return {
    error,
    isError,
    errorMessage,
    errorCode,
    canRetry: failureCount < 3, // Allow retry up to 3 times
    retryCount: failureCount,
  }
}

// Combined hook for complete query state
export function useQueryState<T>(queryResult: UseQueryResult<T>): QueryState<T> {
  const loadingState = useQueryLoadingState(queryResult)
  const errorState = useQueryErrorState(queryResult)

  return {
    ...loadingState,
    ...errorState,
    data: queryResult.data,
    isSuccess: queryResult.isSuccess,
    dataUpdatedAt: queryResult.dataUpdatedAt,
    lastSuccessAt: queryResult.dataUpdatedAt,
  }
}

// Hook for mutation loading states
export interface MutationState {
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  error: Error | null
  errorMessage: string | null
  canRetry: boolean
  reset: () => void
}

export function useMutationState<T, V>(mutationResult: UseMutationResult<T, Error, V>): MutationState {
  const { isPending, isSuccess, isError, error, reset } = mutationResult

  return {
    isLoading: isPending,
    isSuccess,
    isError,
    error,
    errorMessage: error?.message || null,
    canRetry: !isPending && isError,
    reset,
  }
}

// Hook for managing retry logic
export function useRetryLogic() {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const retry = useCallback(async (retryFn: () => Promise<void>, maxRetries: number = 3) => {
    if (retryCount >= maxRetries) {
      return false
    }

    setIsRetrying(true)
    try {
      await retryFn()
      setRetryCount(0)
      return true
    } catch (error) {
      setRetryCount(prev => prev + 1)
      return false
    } finally {
      setIsRetrying(false)
    }
  }, [retryCount])

  const resetRetry = useCallback(() => {
    setRetryCount(0)
    setIsRetrying(false)
  }, [])

  return {
    retryCount,
    isRetrying,
    canRetry: retryCount < 3,
    retry,
    resetRetry,
  }
}

// Hook for managing global loading state across multiple queries
export function useGlobalLoadingState(queries: UseQueryResult<any>[]) {
  const hasAnyLoading = queries.some(query => query.isLoading)
  const hasAnyFetching = queries.some(query => query.isFetching)
  const hasAnyError = queries.some(query => query.isError)
  const allSuccess = queries.every(query => query.isSuccess)

  const errors = queries
    .filter(query => query.isError)
    .map(query => query.error)
    .filter(Boolean) as Error[]

  return {
    isLoading: hasAnyLoading,
    isFetching: hasAnyFetching,
    isError: hasAnyError,
    isSuccess: allSuccess && !hasAnyLoading,
    errors,
    errorMessages: errors.map(error => error.message),
  }
}

// Hook for debounced loading states (prevents flickering)
export function useDebouncedLoadingState(isLoading: boolean, delay: number = 200) {
  const [debouncedLoading, setDebouncedLoading] = useState(false)

  useState(() => {
    let timeoutId: NodeJS.Timeout

    if (isLoading) {
      timeoutId = setTimeout(() => setDebouncedLoading(true), delay)
    } else {
      setDebouncedLoading(false)
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  })

  return debouncedLoading
}

// Hook for error recovery strategies
export function useErrorRecovery() {
  const [recoveryAttempts, setRecoveryAttempts] = useState(0)

  const attemptRecovery = useCallback(async (
    recoveryFn: () => Promise<void>,
    maxAttempts: number = 3
  ) => {
    if (recoveryAttempts >= maxAttempts) {
      return { success: false, reason: 'Max recovery attempts reached' }
    }

    try {
      await recoveryFn()
      setRecoveryAttempts(0)
      return { success: true }
    } catch (error) {
      setRecoveryAttempts(prev => prev + 1)
      return { 
        success: false, 
        reason: error instanceof Error ? error.message : 'Unknown error',
        canRetry: recoveryAttempts + 1 < maxAttempts
      }
    }
  }, [recoveryAttempts])

  const resetRecovery = useCallback(() => {
    setRecoveryAttempts(0)
  }, [])

  return {
    recoveryAttempts,
    attemptRecovery,
    resetRecovery,
    canAttemptRecovery: recoveryAttempts < 3,
  }
}

// Hook for optimistic update error handling
export function useOptimisticErrorHandling<T>() {
  const [optimisticData, setOptimisticData] = useState<T | null>(null)
  const [hasOptimisticError, setHasOptimisticError] = useState(false)

  const setOptimistic = useCallback((data: T) => {
    setOptimisticData(data)
    setHasOptimisticError(false)
  }, [])

  const handleOptimisticError = useCallback(() => {
    setHasOptimisticError(true)
    // Keep optimistic data for potential retry
  }, [])

  const clearOptimistic = useCallback(() => {
    setOptimisticData(null)
    setHasOptimisticError(false)
  }, [])

  return {
    optimisticData,
    hasOptimisticError,
    setOptimistic,
    handleOptimisticError,
    clearOptimistic,
  }
}