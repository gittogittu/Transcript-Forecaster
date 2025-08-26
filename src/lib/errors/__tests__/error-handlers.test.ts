import { 
  handleAPIResponse,
  handleNetworkRequest,
  handleAuthError,
  handleValidationError,
  handleGoogleSheetsError,
  handlePredictionError,
  handleError,
  handleAsyncError,
  withErrorHandling,
  getRecoverySuggestions
} from '../error-handlers'
import {
  APIError,
  NetworkError,
  AuthenticationError,
  ValidationError,
  GoogleSheetsError,
  PredictionError
} from '../error-types'
import { errorLogger } from '../error-logger'

// Mock dependencies
jest.mock('../error-logger', () => ({
  errorLogger: {
    logError: jest.fn()
  }
}))

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn()
  }
}))

// Mock window.location
const mockLocation = {
  href: ''
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

// Mock window.open
Object.defineProperty(window, 'open', {
  value: jest.fn(),
  writable: true
})

describe('Error Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocation.href = ''
  })

  describe('handleAPIResponse', () => {
    it('returns parsed JSON for successful responses', async () => {
      const mockData = { id: 1, name: 'test' }
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
        headers: new Headers()
      } as unknown as Response

      const result = await handleAPIResponse(mockResponse, '/api/test')
      expect(result).toEqual(mockData)
    })

    it('throws APIError for failed responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: jest.fn().mockResolvedValue('Resource not found'),
        url: 'https://api.example.com/test',
        headers: new Headers()
      } as unknown as Response

      await expect(handleAPIResponse(mockResponse, '/api/test')).rejects.toThrow(APIError)
      expect(errorLogger.logError).toHaveBeenCalled()
    })

    it('handles JSON parsing errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        status: 200,
        headers: new Headers()
      } as unknown as Response

      await expect(handleAPIResponse(mockResponse, '/api/test')).rejects.toThrow(APIError)
    })
  })

  describe('handleNetworkRequest', () => {
    it('returns result on successful request', async () => {
      const mockResult = { success: true }
      const requestFn = jest.fn().mockResolvedValue(mockResult)

      const result = await handleNetworkRequest(requestFn, 'https://api.example.com')
      expect(result).toEqual(mockResult)
      expect(requestFn).toHaveBeenCalledTimes(1)
    })

    it('retries on network failures', async () => {
      const mockResult = { success: true }
      const requestFn = jest.fn()
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValue(mockResult)

      const result = await handleNetworkRequest(requestFn, 'https://api.example.com', 3)
      expect(result).toEqual(mockResult)
      expect(requestFn).toHaveBeenCalledTimes(3)
    })

    it('does not retry authentication errors', async () => {
      const authError = new AuthenticationError('Unauthorized', 'UNAUTHORIZED')
      const requestFn = jest.fn().mockRejectedValue(authError)

      await expect(handleNetworkRequest(requestFn, 'https://api.example.com', 3)).rejects.toThrow(AuthenticationError)
      expect(requestFn).toHaveBeenCalledTimes(1)
    })

    it('throws NetworkError after max retries', async () => {
      const requestFn = jest.fn().mockRejectedValue(new TypeError('fetch failed'))

      await expect(handleNetworkRequest(requestFn, 'https://api.example.com', 2)).rejects.toThrow(NetworkError)
      expect(requestFn).toHaveBeenCalledTimes(2)
    })
  })

  describe('handleAuthError', () => {
    it('logs error and shows toast with sign in action', () => {
      const { toast } = require('sonner')
      const authError = new AuthenticationError('Session expired', 'SESSION_EXPIRED')

      handleAuthError(authError)

      expect(errorLogger.logError).toHaveBeenCalledWith(authError)
      expect(toast.error).toHaveBeenCalledWith('Authentication failed', expect.objectContaining({
        description: 'Please sign in again to continue.',
        action: expect.objectContaining({
          label: 'Sign In'
        })
      }))
    })
  })

  describe('handleValidationError', () => {
    it('logs error and shows field-specific toast', () => {
      const { toast } = require('sonner')
      const validationError = new ValidationError('Required field', 'email', '')

      handleValidationError(validationError)

      expect(errorLogger.logError).toHaveBeenCalledWith(validationError)
      expect(toast.error).toHaveBeenCalledWith('Validation Error', {
        description: 'email: Required field'
      })
    })
  })

  describe('handleGoogleSheetsError', () => {
    it('handles permission errors with setup action', () => {
      const { toast } = require('sonner')
      const sheetsError = new GoogleSheetsError('Permission denied', 'read')

      handleGoogleSheetsError(sheetsError)

      expect(toast.error).toHaveBeenCalledWith('Google Sheets Access Error', expect.objectContaining({
        description: 'Please check your Google Sheets permissions and try again.',
        action: expect.objectContaining({
          label: 'Check Setup'
        })
      }))
    })

    it('handles quota errors', () => {
      const { toast } = require('sonner')
      const sheetsError = new GoogleSheetsError('Quota exceeded', 'write')

      handleGoogleSheetsError(sheetsError)

      expect(toast.error).toHaveBeenCalledWith('Google Sheets Quota Exceeded', {
        description: 'API quota exceeded. Please try again later.'
      })
    })

    it('handles generic sheets errors', () => {
      const { toast } = require('sonner')
      const sheetsError = new GoogleSheetsError('Unknown error', 'update')

      handleGoogleSheetsError(sheetsError)

      expect(toast.error).toHaveBeenCalledWith('Google Sheets Error', {
        description: 'Failed to update. Please try again.'
      })
    })
  })

  describe('handlePredictionError', () => {
    it('handles insufficient data errors with add data action', () => {
      const { toast } = require('sonner')
      const predictionError = new PredictionError('Not enough data', 'linear', 2)

      handlePredictionError(predictionError)

      expect(toast.error).toHaveBeenCalledWith('Insufficient Data', expect.objectContaining({
        description: 'At least 3 months of data are needed for predictions.',
        action: expect.objectContaining({
          label: 'Add Data'
        })
      }))
    })

    it('handles model-specific errors', () => {
      const { toast } = require('sonner')
      const predictionError = new PredictionError('Model failed', 'polynomial', 10)

      handlePredictionError(predictionError)

      expect(toast.error).toHaveBeenCalledWith('Prediction Error', {
        description: 'Failed to generate predictions using polynomial model.'
      })
    })
  })

  describe('handleError', () => {
    it('routes to specific error handlers', () => {
      const authError = new AuthenticationError('Test', 'TEST')
      const validationError = new ValidationError('Test', 'field', 'value')
      const apiError = new APIError('Test', 500, '/api/test')

      handleError(authError)
      handleError(validationError)
      handleError(apiError)

      expect(errorLogger.logError).toHaveBeenCalledTimes(3)
    })

    it('handles generic errors', () => {
      const { toast } = require('sonner')
      const genericError = new Error('Unknown error')

      handleError(genericError)

      expect(toast.error).toHaveBeenCalledWith('Unexpected Error', {
        description: 'Something went wrong. Please try again.'
      })
    })
  })

  describe('handleAsyncError', () => {
    it('handles successful promises', async () => {
      const mockResult = { success: true }
      const promise = Promise.resolve(mockResult)

      const result = await handleAsyncError(promise)
      expect(result).toEqual(mockResult)
    })

    it('handles rejected promises', async () => {
      const error = new Error('Async error')
      const promise = Promise.reject(error)

      await expect(handleAsyncError(promise)).rejects.toThrow(error)
      expect(errorLogger.logError).toHaveBeenCalledWith(error, undefined, undefined)
    })
  })

  describe('withErrorHandling', () => {
    it('handles synchronous functions', () => {
      const mockFn = jest.fn().mockReturnValue('success')
      const wrappedFn = withErrorHandling(mockFn)

      const result = wrappedFn('arg1', 'arg2')
      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('handles synchronous errors', () => {
      const error = new Error('Sync error')
      const mockFn = jest.fn().mockImplementation(() => { throw error })
      const wrappedFn = withErrorHandling(mockFn)

      expect(() => wrappedFn()).toThrow(error)
      expect(errorLogger.logError).toHaveBeenCalledWith(error, undefined, undefined)
    })

    it('handles asynchronous functions', async () => {
      const mockFn = jest.fn().mockResolvedValue('async success')
      const wrappedFn = withErrorHandling(mockFn)

      const result = await wrappedFn()
      expect(result).toBe('async success')
    })

    it('handles asynchronous errors', async () => {
      const error = new Error('Async error')
      const mockFn = jest.fn().mockRejectedValue(error)
      const wrappedFn = withErrorHandling(mockFn)

      await expect(wrappedFn()).rejects.toThrow(error)
      expect(errorLogger.logError).toHaveBeenCalledWith(error, undefined, undefined)
    })
  })

  describe('getRecoverySuggestions', () => {
    it('returns auth-specific suggestions for AuthenticationError', () => {
      const authError = new AuthenticationError('Test', 'TEST')
      const suggestions = getRecoverySuggestions(authError)

      expect(suggestions).toContain('Sign in again')
      expect(suggestions).toContain('Clear browser cache and cookies')
    })

    it('returns network-specific suggestions for NetworkError', () => {
      const networkError = new NetworkError('Test', 'url')
      const suggestions = getRecoverySuggestions(networkError)

      expect(suggestions).toContain('Check your internet connection')
      expect(suggestions).toContain('Try refreshing the page')
    })

    it('returns sheets-specific suggestions for GoogleSheetsError', () => {
      const sheetsError = new GoogleSheetsError('Test', 'read')
      const suggestions = getRecoverySuggestions(sheetsError)

      expect(suggestions).toContain('Verify Google Sheets permissions')
      expect(suggestions).toContain('Check if the sheet still exists')
    })

    it('returns prediction-specific suggestions for PredictionError', () => {
      const predictionError = new PredictionError('Test', 'linear', 5)
      const suggestions = getRecoverySuggestions(predictionError)

      expect(suggestions).toContain('Add more historical data')
      expect(suggestions).toContain('Try a different prediction model')
    })

    it('returns validation-specific suggestions for ValidationError', () => {
      const validationError = new ValidationError('Test', 'field', 'value')
      const suggestions = getRecoverySuggestions(validationError)

      expect(suggestions).toContain('Check the input format')
      expect(suggestions).toContain('Ensure all required fields are filled')
    })

    it('returns generic suggestions for unknown errors', () => {
      const genericError = new Error('Unknown')
      const suggestions = getRecoverySuggestions(genericError)

      expect(suggestions).toContain('Refresh the page')
      expect(suggestions).toContain('Try again in a few moments')
    })
  })
})