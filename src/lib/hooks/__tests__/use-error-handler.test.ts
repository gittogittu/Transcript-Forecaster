import { renderHook, act } from '@testing-library/react'
import { useErrorHandler, useAPIErrorHandler, useValidationErrorHandler, usePredictionErrorHandler } from '../use-error-handler'
import { 
  APIError, 
  NetworkError, 
  ValidationError, 
  AuthenticationError, 
  PredictionError 
} from '@/lib/errors/error-handlers'

// Mock dependencies
jest.mock('@/lib/errors/error-handlers', () => ({
  ...jest.requireActual('@/lib/errors/error-handlers'),
  handleAPIRequest: jest.fn(),
  handleNetworkRequest: jest.fn(),
  handleValidationError: jest.fn(),
  handleAuthError: jest.fn(),
  handlePredictionError: jest.fn(),
  showErrorToast: jest.fn(),
  getRecoverySuggestions: jest.fn(() => ['Try again', 'Check connection']),
}))

jest.mock('@/lib/errors/error-logger', () => ({
  errorLogger: {
    logError: jest.fn(() => 'mock-error-id'),
  },
}))

const mockHandlers = require('@/lib/errors/error-handlers')

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('basic error handling', () => {
    it('should initialize with no error', () => {
      const { result } = renderHook(() => useErrorHandler())

      expect(result.current.error).toBeNull()
      expect(result.current.isRetrying).toBe(false)
      expect(result.current.retryCount).toBe(0)
      expect(result.current.suggestions).toEqual([])
      expect(result.current.canRetry).toBe(true)
    })

    it('should handle errors and update state', () => {
      const { result } = renderHook(() => useErrorHandler())
      const testError = new Error('Test error')

      act(() => {
        result.current.handleError(testError, 'test-component')
      })

      expect(result.current.error).toBe(testError)
      expect(result.current.suggestions).toEqual(['Try again', 'Check connection'])
      expect(mockHandlers.showErrorToast).toHaveBeenCalledWith(testError)
    })

    it('should call onError callback when provided', () => {
      const onError = jest.fn()
      const { result } = renderHook(() => useErrorHandler({ onError }))
      const testError = new Error('Test error')

      act(() => {
        result.current.handleError(testError)
      })

      expect(onError).toHaveBeenCalledWith(testError)
    })

    it('should not show toast when showToast is false', () => {
      const { result } = renderHook(() => useErrorHandler({ showToast: false }))
      const testError = new Error('Test error')

      act(() => {
        result.current.handleError(testError)
      })

      expect(mockHandlers.showErrorToast).not.toHaveBeenCalled()
    })
  })

  describe('retry functionality', () => {
    it('should handle successful retry', async () => {
      const onRecover = jest.fn()
      const { result } = renderHook(() => useErrorHandler({ onRecover }))
      const testError = new Error('Test error')

      act(() => {
        result.current.handleError(testError)
      })

      expect(result.current.error).toBe(testError)

      const retryFn = jest.fn().mockResolvedValue(undefined)

      await act(async () => {
        await result.current.retry(retryFn)
      })

      expect(retryFn).toHaveBeenCalled()
      expect(result.current.error).toBeNull()
      expect(result.current.retryCount).toBe(1)
      expect(onRecover).toHaveBeenCalled()
    })

    it('should handle failed retry', async () => {
      const { result } = renderHook(() => useErrorHandler({ maxRetries: 2 }))
      const initialError = new Error('Initial error')
      const retryError = new Error('Retry error')

      act(() => {
        result.current.handleError(initialError)
      })

      const retryFn = jest.fn().mockRejectedValue(retryError)

      await act(async () => {
        await result.current.retry(retryFn)
      })

      expect(result.current.error).toBe(retryError)
      expect(result.current.retryCount).toBe(1)
      expect(result.current.isRetrying).toBe(false)
    })

    it('should not retry when max retries reached', async () => {
      const { result } = renderHook(() => useErrorHandler({ maxRetries: 1 }))
      const testError = new Error('Test error')

      act(() => {
        result.current.handleError(testError)
      })

      // First retry
      const retryFn = jest.fn().mockRejectedValue(new Error('Retry failed'))
      await act(async () => {
        await result.current.retry(retryFn)
      })

      expect(result.current.retryCount).toBe(1)
      expect(result.current.canRetry).toBe(false)

      // Second retry should not execute
      const secondRetryFn = jest.fn()
      await act(async () => {
        await result.current.retry(secondRetryFn)
      })

      expect(secondRetryFn).not.toHaveBeenCalled()
    })

    it('should set isRetrying state during retry', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const testError = new Error('Test error')

      act(() => {
        result.current.handleError(testError)
      })

      let resolveRetry: () => void
      const retryPromise = new Promise<void>(resolve => {
        resolveRetry = resolve
      })

      const retryFn = jest.fn().mockReturnValue(retryPromise)

      // Start retry
      const retryCall = act(async () => {
        await result.current.retry(retryFn)
      })

      // Should be retrying
      expect(result.current.isRetrying).toBe(true)

      // Resolve retry
      resolveRetry!()
      await retryCall

      // Should no longer be retrying
      expect(result.current.isRetrying).toBe(false)
    })
  })

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useErrorHandler())
      const testError = new Error('Test error')

      act(() => {
        result.current.handleError(testError)
      })

      expect(result.current.error).toBe(testError)

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.retryCount).toBe(0)
      expect(result.current.suggestions).toEqual([])
    })
  })

  describe('specialized error handlers', () => {
    it('should handle API errors', async () => {
      mockHandlers.handleAPIRequest.mockResolvedValue({ data: 'success' })
      
      const { result } = renderHook(() => useErrorHandler())
      const mockRequest = jest.fn().mockResolvedValue(new Response('{}'))

      const response = await result.current.handleAPIError(mockRequest, '/api/test')

      expect(mockHandlers.handleAPIRequest).toHaveBeenCalledWith(
        mockRequest,
        '/api/test',
        expect.objectContaining({
          showToast: true,
          logError: true,
        })
      )
      expect(response).toEqual({ data: 'success' })
    })

    it('should handle API errors and update state on failure', async () => {
      const apiError = new APIError('API failed', 500, '/api/test')
      mockHandlers.handleAPIRequest.mockRejectedValue(apiError)
      
      const { result } = renderHook(() => useErrorHandler())
      const mockRequest = jest.fn()

      await expect(
        result.current.handleAPIError(mockRequest, '/api/test')
      ).rejects.toThrow(apiError)

      expect(result.current.error).toBe(apiError)
    })

    it('should handle network errors', async () => {
      mockHandlers.handleNetworkRequest.mockResolvedValue('success')
      
      const { result } = renderHook(() => useErrorHandler())
      const mockRequest = jest.fn()

      const response = await result.current.handleNetworkError(mockRequest)

      expect(mockHandlers.handleNetworkRequest).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({
          showToast: true,
        })
      )
      expect(response).toBe('success')
    })

    it('should handle validation errors', () => {
      const validationError = new ValidationError('Invalid', 'field', 'value')
      mockHandlers.handleValidationError.mockReturnValue(validationError)
      
      const { result } = renderHook(() => useErrorHandler())
      const zodError = { name: 'ZodError', errors: [] }

      const error = result.current.handleValidation(zodError, 'form')

      expect(mockHandlers.handleValidationError).toHaveBeenCalledWith(zodError, 'form')
      expect(error).toBe(validationError)
      expect(result.current.error).toBe(validationError)
    })

    it('should handle auth errors', () => {
      const authError = new AuthenticationError('Auth failed', 'AUTH_ERROR')
      mockHandlers.handleAuthError.mockReturnValue(authError)
      
      const { result } = renderHook(() => useErrorHandler())
      const error = { message: 'Auth failed' }

      const handledError = result.current.handleAuth(error)

      expect(mockHandlers.handleAuthError).toHaveBeenCalledWith(error)
      expect(handledError).toBe(authError)
      expect(result.current.error).toBe(authError)
    })

    it('should handle prediction errors', () => {
      const predictionError = new PredictionError('Prediction failed', 'linear', 10)
      mockHandlers.handlePredictionError.mockReturnValue(predictionError)
      
      const { result } = renderHook(() => useErrorHandler())
      const error = { message: 'Prediction failed' }

      const handledError = result.current.handlePrediction(error, 'linear', 10)

      expect(mockHandlers.handlePredictionError).toHaveBeenCalledWith(error, 'linear', 10)
      expect(handledError).toBe(predictionError)
      expect(result.current.error).toBe(predictionError)
    })
  })

  describe('error type utilities', () => {
    it('should correctly identify error types', () => {
      const { result } = renderHook(() => useErrorHandler())

      expect(result.current.isAPIError(new APIError('test', 500, '/api'))).toBe(true)
      expect(result.current.isAPIError(new Error('test'))).toBe(false)

      expect(result.current.isNetworkError(new NetworkError('test'))).toBe(true)
      expect(result.current.isNetworkError(new Error('test'))).toBe(false)

      expect(result.current.isValidationError(new ValidationError('test', 'field', 'value'))).toBe(true)
      expect(result.current.isValidationError(new Error('test'))).toBe(false)

      expect(result.current.isAuthError(new AuthenticationError('test', 'code'))).toBe(true)
      expect(result.current.isAuthError(new Error('test'))).toBe(false)

      expect(result.current.isPredictionError(new PredictionError('test', 'linear', 10))).toBe(true)
      expect(result.current.isPredictionError(new Error('test'))).toBe(false)
    })
  })
})

describe('specialized error handler hooks', () => {
  describe('useAPIErrorHandler', () => {
    it('should use correct default options', () => {
      const { result } = renderHook(() => useAPIErrorHandler())
      
      expect(result.current.canRetry).toBe(true) // maxRetries: 3
    })
  })

  describe('useValidationErrorHandler', () => {
    it('should use correct default options', () => {
      const { result } = renderHook(() => useValidationErrorHandler())
      const testError = new ValidationError('test', 'field', 'value')

      act(() => {
        result.current.handleError(testError)
      })

      expect(result.current.canRetry).toBe(false) // maxRetries: 0
      expect(mockHandlers.showErrorToast).not.toHaveBeenCalled() // showToast: false
    })
  })

  describe('usePredictionErrorHandler', () => {
    it('should use correct default options', () => {
      const { result } = renderHook(() => usePredictionErrorHandler())
      
      // Should allow limited retries
      expect(result.current.canRetry).toBe(true)
    })
  })
})