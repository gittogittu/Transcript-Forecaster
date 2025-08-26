import { useCallback } from 'react'
import { AppError } from '@/lib/errors/error-types'
import { handleError, getRecoverySuggestions } from '@/lib/errors/error-handlers'

interface UseErrorHandlerReturn {
  handleError: (error: AppError, context?: Record<string, any>) => void
  handleAsyncError: <T>(
    promise: Promise<T>, 
    context?: Record<string, any>
  ) => Promise<T>
  getRecoverySuggestions: (error: AppError) => string[]
}

/**
 * Custom hook for consistent error handling across components
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const handleErrorCallback = useCallback((error: AppError, context?: Record<string, any>) => {
    handleError(error, context)
  }, [])

  const handleAsyncErrorCallback = useCallback(<T>(
    promise: Promise<T>,
    context?: Record<string, any>
  ): Promise<T> => {
    return promise.catch((error) => {
      handleError(error as AppError, context)
      throw error
    })
  }, [])

  const getRecoverySuggestionsCallback = useCallback((error: AppError) => {
    return getRecoverySuggestions(error)
  }, [])

  return {
    handleError: handleErrorCallback,
    handleAsyncError: handleAsyncErrorCallback,
    getRecoverySuggestions: getRecoverySuggestionsCallback
  }
}