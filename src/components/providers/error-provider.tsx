'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useErrorHandler } from '@/lib/hooks/use-error-handler'
import { Toaster } from 'sonner'

interface ErrorContextType {
  handleError: (error: Error, context?: string) => void
  handleAPIError: <T>(
    request: () => Promise<Response>,
    endpoint: string,
    options?: any
  ) => Promise<T>
  handleNetworkError: <T>(
    request: () => Promise<T>,
    options?: any
  ) => Promise<T>
  handleValidation: (error: any, context?: string) => any
  handleAuth: (error: any) => any
  handlePrediction: (error: any, modelType: string, dataSize: number) => any
  retry: (retryFn: () => Promise<void> | void) => Promise<void>
  clearError: () => void
  error: Error | null
  isRetrying: boolean
  retryCount: number
  suggestions: string[]
  canRetry: boolean
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

interface ErrorProviderProps {
  children: ReactNode
  maxRetries?: number
  showToast?: boolean
  logErrors?: boolean
}

export function ErrorProvider({
  children,
  maxRetries = 3,
  showToast = true,
  logErrors = true,
}: ErrorProviderProps) {
  const errorHandler = useErrorHandler({
    maxRetries,
    showToast,
    logErrors,
  })

  return (
    <ErrorContext.Provider value={errorHandler}>
      {children}
      {showToast && (
        <Toaster
          position="top-right"
          expand={true}
          richColors={true}
          closeButton={true}
          toastOptions={{
            duration: 5000,
            style: {
              background: 'white',
              border: '1px solid #e5e7eb',
              color: '#374151',
            },
          }}
        />
      )}
    </ErrorContext.Provider>
  )
}

export function useError(): ErrorContextType {
  const context = useContext(ErrorContext)
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}

// Convenience hooks for specific error types
export function useAPIError() {
  const { handleAPIError, error, isRetrying, retry, clearError } = useError()
  return {
    handleAPIError,
    error,
    isRetrying,
    retry,
    clearError,
    isAPIError: error?.name === 'APIError',
  }
}

export function useValidationError() {
  const { handleValidation, error, clearError } = useError()
  return {
    handleValidation,
    error,
    clearError,
    isValidationError: error?.name === 'ValidationError',
    validationErrors: error?.name === 'ValidationError' ? (error as any).errors : {},
  }
}

export function usePredictionError() {
  const { handlePrediction, error, isRetrying, retry, clearError, suggestions } = useError()
  return {
    handlePrediction,
    error,
    isRetrying,
    retry,
    clearError,
    suggestions,
    isPredictionError: error?.name === 'PredictionError',
    suggestedAction: error?.name === 'PredictionError' ? (error as any).suggestedAction : undefined,
  }
}