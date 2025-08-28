import { errorLogger } from './error-logger'
import { toast } from 'sonner'

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string,
    public response?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any,
    public errors: Record<string, string[]> = {}
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class AuthenticationError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class PredictionError extends Error {
  constructor(
    message: string,
    public modelType: string,
    public dataSize: number,
    public suggestedAction?: string
  ) {
    super(message)
    this.name = 'PredictionError'
  }
}

// Global error handler for API requests
export async function handleAPIRequest<T>(
  request: () => Promise<Response>,
  endpoint: string,
  options: {
    retries?: number
    retryDelay?: number
    showToast?: boolean
    logError?: boolean
  } = {}
): Promise<T> {
  const {
    retries = 3,
    retryDelay = 1000,
    showToast = true,
    logError = true,
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await request()

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const apiError = new APIError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          endpoint,
          errorData
        )

        if (response.status >= 500) {
          // Server error - retry
          lastError = apiError
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
            continue
          }
        }

        throw apiError
      }

      const data = await response.json()
      return data
    } catch (error) {
      lastError = error as Error

      // Don't retry for client errors (4xx) except 429 (rate limit)
      if (error instanceof APIError && error.status >= 400 && error.status < 500 && error.status !== 429) {
        break
      }

      // Don't retry for validation errors
      if (error instanceof ValidationError) {
        break
      }

      // Retry for network errors and server errors
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
        continue
      }
    }
  }

  // All retries failed
  if (lastError) {
    if (logError) {
      errorLogger.logError(lastError, {
        category: 'api_request',
        component: 'api_handler',
        url: endpoint,
      })
    }

    if (showToast) {
      showErrorToast(lastError)
    }

    throw lastError
  }

  throw new Error('Unexpected error in API request handler')
}

// Network error handler with retry logic
export async function handleNetworkRequest<T>(
  request: () => Promise<T>,
  options: {
    retries?: number
    retryDelay?: number
    timeout?: number
    showToast?: boolean
  } = {}
): Promise<T> {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
    showToast = true,
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add timeout to the request
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new NetworkError('Request timeout')), timeout)
      })

      const result = await Promise.race([request(), timeoutPromise])
      return result
    } catch (error) {
      lastError = error as Error

      // Convert fetch errors to NetworkError
      if (error instanceof TypeError && error.message.includes('fetch')) {
        lastError = new NetworkError('Network connection failed', error)
      }

      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
        continue
      }
    }
  }

  if (lastError) {
    errorLogger.logError(lastError, {
      category: 'network',
      component: 'network_handler',
    })

    if (showToast) {
      showErrorToast(lastError)
    }

    throw lastError
  }

  throw new Error('Unexpected error in network request handler')
}

// Validation error handler
export function handleValidationError(
  error: any,
  context: string = 'form_validation'
): ValidationError {
  let validationError: ValidationError

  if (error.name === 'ZodError') {
    // Handle Zod validation errors
    const errors: Record<string, string[]> = {}
    error.errors.forEach((err: any) => {
      const field = err.path.join('.')
      if (!errors[field]) {
        errors[field] = []
      }
      errors[field].push(err.message)
    })

    const firstError = error.errors[0]
    validationError = new ValidationError(
      `Validation failed: ${firstError.message}`,
      firstError.path.join('.'),
      firstError.received,
      errors
    )
  } else if (error instanceof ValidationError) {
    validationError = error
  } else {
    validationError = new ValidationError(
      error.message || 'Validation failed',
      'unknown',
      null
    )
  }

  errorLogger.logError(validationError, {
    category: 'validation',
    component: context,
  })

  return validationError
}

// Authentication error handler
export function handleAuthError(error: any): AuthenticationError {
  let authError: AuthenticationError

  if (error.code) {
    authError = new AuthenticationError(error.message, error.code)
  } else {
    authError = new AuthenticationError(
      error.message || 'Authentication failed',
      'AUTH_ERROR'
    )
  }

  errorLogger.logError(authError, {
    category: 'authentication',
    component: 'auth_handler',
  })

  return authError
}

// Prediction error handler
export function handlePredictionError(
  error: any,
  modelType: string,
  dataSize: number
): PredictionError {
  let predictionError: PredictionError
  let suggestedAction: string | undefined

  if (error.message.includes('insufficient data')) {
    suggestedAction = 'Add more historical data (at least 30 data points recommended)'
  } else if (error.message.includes('memory')) {
    suggestedAction = 'Try using a simpler model or reduce the prediction period'
  } else if (error.message.includes('tensorflow')) {
    suggestedAction = 'Try refreshing the page or use the linear model as fallback'
  }

  predictionError = new PredictionError(
    error.message || 'Prediction generation failed',
    modelType,
    dataSize,
    suggestedAction
  )

  errorLogger.logError(predictionError, {
    category: 'ml_predictions',
    component: 'prediction_handler',
  })

  return predictionError
}

// User-friendly error messages
export function showErrorToast(error: Error) {
  let title = 'Error'
  let message = 'An unexpected error occurred'

  if (error instanceof APIError) {
    title = 'API Error'
    if (error.status >= 500) {
      message = 'Server error. Please try again later.'
    } else if (error.status === 404) {
      message = 'Resource not found.'
    } else if (error.status === 403) {
      message = 'You do not have permission to perform this action.'
    } else if (error.status === 401) {
      message = 'Please sign in to continue.'
    } else {
      message = error.message
    }
  } else if (error instanceof NetworkError) {
    title = 'Connection Error'
    message = 'Please check your internet connection and try again.'
  } else if (error instanceof ValidationError) {
    title = 'Validation Error'
    message = error.message
  } else if (error instanceof AuthenticationError) {
    title = 'Authentication Error'
    message = 'Please sign in again.'
  } else if (error instanceof PredictionError) {
    title = 'Prediction Error'
    message = error.suggestedAction || error.message
  } else {
    message = error.message
  }

  toast.error(title, {
    description: message,
    action: {
      label: 'Dismiss',
      onClick: () => {},
    },
  })
}

// Recovery suggestions based on error type
export function getRecoverySuggestions(error: Error): string[] {
  const suggestions: string[] = []

  if (error instanceof APIError) {
    if (error.status >= 500) {
      suggestions.push('Try again in a few minutes')
      suggestions.push('Check our status page for known issues')
    } else if (error.status === 429) {
      suggestions.push('Wait a moment before trying again')
      suggestions.push('You may be making requests too quickly')
    } else if (error.status === 401) {
      suggestions.push('Sign in to your account')
      suggestions.push('Check if your session has expired')
    }
  } else if (error instanceof NetworkError) {
    suggestions.push('Check your internet connection')
    suggestions.push('Try refreshing the page')
    suggestions.push('Disable any VPN or proxy')
  } else if (error instanceof ValidationError) {
    suggestions.push('Check the highlighted fields')
    suggestions.push('Ensure all required fields are filled')
    suggestions.push('Verify data format matches requirements')
  } else if (error instanceof PredictionError) {
    if (error.suggestedAction) {
      suggestions.push(error.suggestedAction)
    }
    suggestions.push('Try using a different prediction model')
    suggestions.push('Reduce the prediction time period')
  }

  if (suggestions.length === 0) {
    suggestions.push('Try refreshing the page')
    suggestions.push('Contact support if the problem persists')
  }

  return suggestions
}