'use client'

import React from 'react'
import { useQuery, useMutation, UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

// Enhanced loading states
export interface LoadingState {
  isLoading: boolean
  isInitialLoading: boolean
  isFetching: boolean
  isRefetching: boolean
  isLoadingError: boolean
  isStale: boolean
}

// Enhanced error states
export interface ErrorState {
  isError: boolean
  error: Error | null
  errorMessage: string | null
  errorCode: string | null
  canRetry: boolean
  retryCount: number
}

// Combined query state
export interface QueryState<T> extends LoadingState, ErrorState {
  data: T | undefined
  isSuccess: boolean
  refetch: () => void
  retry: () => void
}

// Hook to enhance query results with better loading and error states
export function useEnhancedQuery<T>(
  queryResult: UseQueryResult<T, Error>
): QueryState<T> {
  const [retryCount, setRetryCount] = useState(0)

  const loadingState: LoadingState = {
    isLoading: queryResult.isLoading,
    isInitialLoading: queryResult.isLoading && !queryResult.data,
    isFetching: queryResult.isFetching,
    isRefetching: queryResult.isFetching && !!queryResult.data,
    isLoadingError: queryResult.isError && queryResult.isLoading,
    isStale: queryResult.isStale,
  }

  const errorState: ErrorState = {
    isError: queryResult.isError,
    error: queryResult.error,
    errorMessage: queryResult.error?.message || null,
    errorCode: getErrorCode(queryResult.error),
    canRetry: queryResult.isError && queryResult.failureCount < 3,
    retryCount,
  }

  const retry = () => {
    setRetryCount(prev => prev + 1)
    queryResult.refetch()
  }

  return {
    ...loadingState,
    ...errorState,
    data: queryResult.data,
    isSuccess: queryResult.isSuccess,
    refetch: queryResult.refetch,
    retry,
  }
}

// Enhanced mutation states
export interface MutationState {
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  error: Error | null
  errorMessage: string | null
  errorCode: string | null
  canRetry: boolean
  reset: () => void
  retry: () => void
}

// Hook to enhance mutation results
export function useEnhancedMutation<TData, TError extends Error, TVariables>(
  mutationResult: UseMutationResult<TData, TError, TVariables>
): MutationState {
  const [lastVariables, setLastVariables] = useState<TVariables | null>(null)

  // Store variables for retry
  useEffect(() => {
    if (mutationResult.isPending && mutationResult.variables) {
      setLastVariables(mutationResult.variables)
    }
  }, [mutationResult.isPending, mutationResult.variables])

  const retry = () => {
    if (lastVariables) {
      mutationResult.mutate(lastVariables)
    }
  }

  return {
    isPending: mutationResult.isPending,
    isSuccess: mutationResult.isSuccess,
    isError: mutationResult.isError,
    error: mutationResult.error,
    errorMessage: mutationResult.error?.message || null,
    errorCode: getErrorCode(mutationResult.error),
    canRetry: mutationResult.isError && !!lastVariables,
    reset: mutationResult.reset,
    retry,
  }
}

// Loading state components
export interface LoadingStateProps {
  isLoading: boolean
  isInitialLoading: boolean
  isFetching: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
  skeleton?: React.ReactNode
}

export function LoadingStateWrapper({
  isLoading,
  isInitialLoading,
  isFetching,
  children,
  fallback,
  skeleton,
}: LoadingStateProps) {
  if (isInitialLoading) {
    return skeleton || fallback || React.createElement(DefaultSkeleton)
  }

  return React.createElement(
    'div',
    { className: 'relative' },
    children,
    isFetching && !isInitialLoading && React.createElement(
      'div',
      { className: 'absolute top-2 right-2' },
      React.createElement(RefreshIndicator)
    )
  )
}

// Error state components
export interface ErrorStateProps {
  isError: boolean
  error: Error | null
  canRetry: boolean
  onRetry: () => void
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ErrorStateWrapper({
  isError,
  error,
  canRetry,
  onRetry,
  children,
  fallback,
}: ErrorStateProps) {
  if (isError) {
    return fallback || React.createElement(DefaultErrorDisplay, {
      error,
      canRetry,
      onRetry
    })
  }

  return React.createElement(React.Fragment, null, children)
}

// Combined query state wrapper
export interface QueryStateWrapperProps<T> {
  queryState: QueryState<T>
  children: (data: T) => React.ReactNode
  loadingSkeleton?: React.ReactNode
  errorFallback?: React.ReactNode
}

export function QueryStateWrapper<T>({
  queryState,
  children,
  loadingSkeleton,
  errorFallback,
}: QueryStateWrapperProps<T>) {
  return React.createElement(
    LoadingStateWrapper,
    {
      isLoading: queryState.isLoading,
      isInitialLoading: queryState.isInitialLoading,
      isFetching: queryState.isFetching,
      skeleton: loadingSkeleton,
    },
    React.createElement(
      ErrorStateWrapper,
      {
        isError: queryState.isError,
        error: queryState.error,
        canRetry: queryState.canRetry,
        onRetry: queryState.retry,
        fallback: errorFallback,
      },
      queryState.data && children(queryState.data)
    )
  )
}

// Utility functions
function getErrorCode(error: Error | null): string | null {
  if (!error) return null

  // Extract error code from different error types
  if ('code' in error) return (error as any).code
  if ('status' in error) return String((error as any).status)
  if (error.message.includes('404')) return '404'
  if (error.message.includes('401')) return '401'
  if (error.message.includes('403')) return '403'
  if (error.message.includes('500')) return '500'

  return 'UNKNOWN'
}

// Default components
function DefaultSkeleton() {
  return React.createElement(
    'div',
    { className: 'animate-pulse space-y-4' },
    React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-3/4' }),
    React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-1/2' }),
    React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-5/6' })
  )
}

function RefreshIndicator() {
  return React.createElement('div', {
    className: 'w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'
  })
}

interface DefaultErrorDisplayProps {
  error: Error | null
  canRetry: boolean
  onRetry: () => void
}

function DefaultErrorDisplay({ error, canRetry, onRetry }: DefaultErrorDisplayProps) {
  return React.createElement(
    'div',
    { className: 'p-4 border border-red-200 rounded-lg bg-red-50' },
    React.createElement('h3', { className: 'text-red-800 font-medium' }, 'Something went wrong'),
    React.createElement(
      'p',
      { className: 'text-red-600 text-sm mt-1' },
      error?.message || 'An unexpected error occurred'
    ),
    canRetry && React.createElement(
      'button',
      {
        onClick: onRetry,
        className: 'mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700'
      },
      'Try Again'
    )
  )
}

// Hook for global error handling
export function useGlobalErrorHandler() {
  const [globalError, setGlobalError] = useState<Error | null>(null)

  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context || 'unknown context'}:`, error)
    setGlobalError(error)

    // Could integrate with error reporting service here
    // reportError(error, context)
  }

  const clearError = () => setGlobalError(null)

  return {
    globalError,
    handleError,
    clearError,
  }
}