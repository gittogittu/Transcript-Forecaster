'use client'

import { useCallback, useState } from 'react'
import { 
  handleAPIRequest, 
  handleNetworkRequest, 
  handleValidationError,
  handleAuthError,
  handlePredictionError,
  showErrorToast,
  getRecoverySuggestions,
  APIError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  PredictionError
} from '@/lib/errors/error-handlers'
import { errorLogger } from '@/lib/errors/error-logger'

interface ErrorState {
  error: Error | null
  isRetrying: boolean
  retryCount: number
  suggestions: string[]
}

interface UseErrorHandlerOptions {
  maxRetries?: number
  showToast?: boolean
  logErrors?: boolean
  onError?: (error: Error) => void
  onRetry?: () => void
  onRecover?: () => void
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    maxRetries = 3,
    showToast = true,
    logErrors = true,
    onError,
    onRetry,
    onRecover,
  } = options

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    suggestions: [],
  })

  const handleError = useCallback((error: Error, context?: string) => {
    const suggestions = getRecoverySuggestions(error)
    
    setErrorState({
      error,
      isRetrying: false,
      retryCount: 0,
      suggestions,
    })

    if (logErrors) {
      errorLogger.logError(error, {
        component: context || 'error_handler',
        category: getErrorCategory(error),
      })
    }

    if (showToast) {
      showErrorToast(error)
    }

    onError?.(error)
  }, [logErrors, showToast, onError])

  const retry = useCallback(async (retryFn: () => Promise<void> | void) => {
    if (errorState.retryCount >= maxRetries) {
      return
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
    }))

    try {
      await retryFn()
      clearError()
      onRecover?.()
    } catch (error) {
      handleError(error as Error)
    } finally {
      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
      }))
    }

    onRetry?.()
  }, [errorState.retryCount, maxRetries, handleError, onRecover, onRetry])

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      suggestions: [],
    })
  }, [])

  // Specialized error handlers
  const handleAPIError = useCallback(async <T>(
    request: () => Promise<Response>,
    endpoint: string,
    options?: Parameters<typeof handleAPIRequest>[2]
  ): Promise<T> => {
    try {
      return await handleAPIRequest<T>(request, endpoint, {
        showToast,
        logError: logErrors,
        ...options,
      })
    } catch (error) {
      handleError(error as Error, 'api_request')
      throw error
    }
  }, [handleError, showToast, logErrors])

  const handleNetworkError = useCallback(async <T>(
    request: () => Promise<T>,
    options?: Parameters<typeof handleNetworkRequest>[1]
  ): Promise<T> => {
    try {
      return await handleNetworkRequest(request, {
        showToast,
        ...options,
      })
    } catch (error) {
      handleError(error as Error, 'network_request')
      throw error
    }
  }, [handleError, showToast])

  const handleValidation = useCallback((error: any, context?: string) => {
    const validationError = handleValidationError(error, context)
    handleError(validationError, context)
    return validationError
  }, [handleError])

  const handleAuth = useCallback((error: any) => {
    const authError = handleAuthError(error)
    handleError(authError, 'authentication')
    return authError
  }, [handleError])

  const handlePrediction = useCallback((error: any, modelType: string, dataSize: number) => {
    const predictionError = handlePredictionError(error, modelType, dataSize)
    handleError(predictionError, 'prediction')
    return predictionError
  }, [handleError])

  return {
    // Error state
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    suggestions: errorState.suggestions,
    canRetry: errorState.retryCount < maxRetries,

    // Error handlers
    handleError,
    handleAPIError,
    handleNetworkError,
    handleValidation,
    handleAuth,
    handlePrediction,

    // Actions
    retry,
    clearError,

    // Utilities
    isAPIError: (error: Error): error is APIError => error instanceof APIError,
    isNetworkError: (error: Error): error is NetworkError => error instanceof NetworkError,
    isValidationError: (error: Error): error is ValidationError => error instanceof ValidationError,
    isAuthError: (error: Error): error is AuthenticationError => error instanceof AuthenticationError,
    isPredictionError: (error: Error): error is PredictionError => error instanceof PredictionError,
  }
}

function getErrorCategory(error: Error): string {
  if (error instanceof APIError) return 'api_request'
  if (error instanceof NetworkError) return 'network'
  if (error instanceof ValidationError) return 'validation'
  if (error instanceof AuthenticationError) return 'authentication'
  if (error instanceof PredictionError) return 'ml_predictions'
  return 'unknown'
}

// Specialized hooks for different contexts
export function useAPIErrorHandler(options?: UseErrorHandlerOptions) {
  return useErrorHandler({
    ...options,
    maxRetries: 3,
  })
}

export function useValidationErrorHandler(options?: UseErrorHandlerOptions) {
  return useErrorHandler({
    ...options,
    maxRetries: 0, // Don't retry validation errors
    showToast: false, // Handle validation errors in forms
  })
}

export function usePredictionErrorHandler(options?: UseErrorHandlerOptions) {
  return useErrorHandler({
    ...options,
    maxRetries: 2, // Limited retries for ML operations
  })
}