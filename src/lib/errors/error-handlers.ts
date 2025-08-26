import { toast } from 'sonner'
import { 
  APIError, 
  NetworkError, 
  AuthenticationError, 
  ValidationError, 
  GoogleSheetsError,
  PredictionError,
  AppErrorType 
} from './error-types'
import { errorLogger } from './error-logger'

/**
 * Global error handler for API responses
 */
export async function handleAPIResponse<T>(
  response: Response,
  endpoint: string
): Promise<T> {
  if (!response.ok) {
    const errorMessage = await response.text().catch(() => 'Unknown error')
    const error = new APIError(
      errorMessage || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      endpoint
    )
    
    errorLogger.logError(error, undefined, {
      responseHeaders: Object.fromEntries(response.headers.entries()),
      requestUrl: response.url
    })
    
    throw error
  }

  try {
    return await response.json()
  } catch (parseError) {
    const error = new APIError(
      'Failed to parse response JSON',
      response.status,
      endpoint
    )
    errorLogger.logError(error)
    throw error
  }
}

/**
 * Global error handler for network requests
 */
export async function handleNetworkRequest<T>(
  requestFn: () => Promise<T>,
  url: string,
  retries: number = 3
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on authentication or validation errors
      if (error instanceof AuthenticationError || error instanceof ValidationError) {
        throw error
      }

      // Create network error for fetch failures
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new NetworkError(
          'Network request failed - please check your internet connection',
          url
        )
        errorLogger.logError(networkError, undefined, {
          attempt,
          maxRetries: retries,
          originalError: error.message
        })
        lastError = networkError
      }

      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw lastError
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }

  throw lastError!
}

/**
 * Handle authentication errors globally
 */
export function handleAuthError(error: AuthenticationError): void {
  errorLogger.logError(error)
  
  // Show user-friendly message
  toast.error('Authentication failed', {
    description: 'Please sign in again to continue.',
    action: {
      label: 'Sign In',
      onClick: () => {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/signin'
        }
      }
    }
  })
}

/**
 * Handle validation errors globally
 */
export function handleValidationError(error: ValidationError): void {
  errorLogger.logError(error)
  
  toast.error('Validation Error', {
    description: `${error.field}: ${error.message}`
  })
}

/**
 * Handle Google Sheets errors globally
 */
export function handleGoogleSheetsError(error: GoogleSheetsError): void {
  errorLogger.logError(error)
  
  const isPermissionError = error.message.toLowerCase().includes('permission')
  const isQuotaError = error.message.toLowerCase().includes('quota')
  
  if (isPermissionError) {
    toast.error('Google Sheets Access Error', {
      description: 'Please check your Google Sheets permissions and try again.',
      action: {
        label: 'Check Setup',
        onClick: () => {
          if (typeof window !== 'undefined') {
            window.open('/docs/google-sheets-setup', '_blank')
          }
        }
      }
    })
  } else if (isQuotaError) {
    toast.error('Google Sheets Quota Exceeded', {
      description: 'API quota exceeded. Please try again later.'
    })
  } else {
    toast.error('Google Sheets Error', {
      description: `Failed to ${error.operation}. Please try again.`
    })
  }
}

/**
 * Handle prediction errors globally
 */
export function handlePredictionError(error: PredictionError): void {
  errorLogger.logError(error)
  
  if (error.dataSize < 3) {
    toast.error('Insufficient Data', {
      description: 'At least 3 months of data are needed for predictions.',
      action: {
        label: 'Add Data',
        onClick: () => {
          if (typeof window !== 'undefined') {
            window.location.href = '/dashboard?tab=add-data'
          }
        }
      }
    })
  } else {
    toast.error('Prediction Error', {
      description: `Failed to generate predictions using ${error.modelType} model.`
    })
  }
}

/**
 * Generic error handler that routes to specific handlers
 */
export function handleError(error: AppErrorType, context?: Record<string, any>): void {
  // Log the error with context
  errorLogger.logError(error, undefined, context)

  // Route to specific error handlers
  if (error instanceof AuthenticationError) {
    handleAuthError(error)
  } else if (error instanceof ValidationError) {
    handleValidationError(error)
  } else if (error instanceof GoogleSheetsError) {
    handleGoogleSheetsError(error)
  } else if (error instanceof PredictionError) {
    handlePredictionError(error)
  } else if (error instanceof APIError) {
    toast.error('API Error', {
      description: `Server error (${error.status}). Please try again.`
    })
  } else if (error instanceof NetworkError) {
    toast.error('Network Error', {
      description: 'Please check your internet connection and try again.'
    })
  } else {
    // Generic error handling
    toast.error('Unexpected Error', {
      description: 'Something went wrong. Please try again.'
    })
  }
}

/**
 * Async error handler for promises
 */
export function handleAsyncError<T>(
  promise: Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return promise.catch((error) => {
    handleError(error as AppErrorType, context)
    throw error
  })
}

/**
 * Error handler for React components
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  context?: Record<string, any>
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args)
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          handleError(error as AppErrorType, context)
          throw error
        })
      }
      
      return result
    } catch (error) {
      handleError(error as AppErrorType, context)
      throw error
    }
  }) as T
}

/**
 * Recovery suggestions based on error type
 */
export function getRecoverySuggestions(error: AppErrorType): string[] {
  if (error instanceof AuthenticationError) {
    return [
      'Sign in again',
      'Clear browser cache and cookies',
      'Check if your account is still active'
    ]
  }

  if (error instanceof NetworkError) {
    return [
      'Check your internet connection',
      'Try refreshing the page',
      'Wait a moment and try again'
    ]
  }

  if (error instanceof GoogleSheetsError) {
    return [
      'Verify Google Sheets permissions',
      'Check if the sheet still exists',
      'Ensure you have edit access to the sheet'
    ]
  }

  if (error instanceof PredictionError) {
    return [
      'Add more historical data',
      'Try a different prediction model',
      'Check data quality and consistency'
    ]
  }

  if (error instanceof ValidationError) {
    return [
      'Check the input format',
      'Ensure all required fields are filled',
      'Verify data meets the requirements'
    ]
  }

  return [
    'Refresh the page',
    'Try again in a few moments',
    'Contact support if the problem persists'
  ]
}