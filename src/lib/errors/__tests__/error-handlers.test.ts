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
  PredictionError,
} from '../error-handlers'

// Mock dependencies
jest.mock('../error-logger', () => ({
  errorLogger: {
    logError: jest.fn(() => 'mock-error-id'),
  },
}))

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}))

// Mock Response for tests
global.Response = jest.fn().mockImplementation((body, init) => ({
  ok: init?.status >= 200 && init?.status < 300,
  status: init?.status || 200,
  statusText: init?.statusText || 'OK',
  json: () => Promise.resolve(typeof body === 'string' ? JSON.parse(body) : body),
}))

const mockToast = require('sonner').toast

describe('Error Classes', () => {
  describe('APIError', () => {
    it('should create APIError with correct properties', () => {
      const error = new APIError('Not found', 404, '/api/test', { detail: 'Resource not found' })
      
      expect(error.name).toBe('APIError')
      expect(error.message).toBe('Not found')
      expect(error.status).toBe(404)
      expect(error.endpoint).toBe('/api/test')
      expect(error.response).toEqual({ detail: 'Resource not found' })
    })
  })

  describe('ValidationError', () => {
    it('should create ValidationError with field information', () => {
      const errors = { email: ['Invalid email format'] }
      const error = new ValidationError('Validation failed', 'email', 'invalid-email', errors)
      
      expect(error.name).toBe('ValidationError')
      expect(error.field).toBe('email')
      expect(error.value).toBe('invalid-email')
      expect(error.errors).toEqual(errors)
    })
  })

  describe('PredictionError', () => {
    it('should create PredictionError with model information', () => {
      const error = new PredictionError('Insufficient data', 'linear', 10, 'Add more data points')
      
      expect(error.name).toBe('PredictionError')
      expect(error.modelType).toBe('linear')
      expect(error.dataSize).toBe(10)
      expect(error.suggestedAction).toBe('Add more data points')
    })
  })
})

describe('handleAPIRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle successful API requests', async () => {
    const mockResponse = new Response(JSON.stringify({ data: 'success' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

    const request = jest.fn().mockResolvedValue(mockResponse)
    
    const result = await handleAPIRequest(request, '/api/test')
    
    expect(result).toEqual({ data: 'success' })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('should retry on server errors', async () => {
    const mockErrorResponse = new Response('Server Error', { status: 500 })
    const mockSuccessResponse = new Response(JSON.stringify({ data: 'success' }), { status: 200 })

    const request = jest.fn()
      .mockResolvedValueOnce(mockErrorResponse)
      .mockResolvedValueOnce(mockSuccessResponse)

    const result = await handleAPIRequest(request, '/api/test', { retries: 1, retryDelay: 10 })
    
    expect(result).toEqual({ data: 'success' })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('should not retry on client errors', async () => {
    const mockResponse = new Response('Bad Request', { status: 400 })
    const request = jest.fn().mockResolvedValue(mockResponse)

    await expect(
      handleAPIRequest(request, '/api/test', { retries: 3 })
    ).rejects.toThrow(APIError)
    
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('should retry on rate limit errors', async () => {
    const mockRateLimitResponse = new Response('Rate Limited', { status: 429 })
    const mockSuccessResponse = new Response(JSON.stringify({ data: 'success' }), { status: 200 })

    const request = jest.fn()
      .mockResolvedValueOnce(mockRateLimitResponse)
      .mockResolvedValueOnce(mockSuccessResponse)

    const result = await handleAPIRequest(request, '/api/test', { retries: 1, retryDelay: 10 })
    
    expect(result).toEqual({ data: 'success' })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('should handle network errors with retries', async () => {
    const networkError = new TypeError('Failed to fetch')
    const mockSuccessResponse = new Response(JSON.stringify({ data: 'success' }), { status: 200 })

    const request = jest.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(mockSuccessResponse)

    const result = await handleAPIRequest(request, '/api/test', { retries: 1, retryDelay: 10 })
    
    expect(result).toEqual({ data: 'success' })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('should throw after all retries exhausted', async () => {
    const mockResponse = new Response('Server Error', { status: 500 })
    const request = jest.fn().mockResolvedValue(mockResponse)

    await expect(
      handleAPIRequest(request, '/api/test', { retries: 2, retryDelay: 10 })
    ).rejects.toThrow(APIError)
    
    expect(request).toHaveBeenCalledTimes(3) // Initial + 2 retries
  })
})

describe('handleNetworkRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle successful network requests', async () => {
    const request = jest.fn().mockResolvedValue('success')
    
    const result = await handleNetworkRequest(request)
    
    expect(result).toBe('success')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('should handle timeout errors', async () => {
    const request = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('success'), 100))
    )

    await expect(
      handleNetworkRequest(request, { timeout: 50, retries: 0 })
    ).rejects.toThrow(NetworkError)
  })

  it('should retry on network failures', async () => {
    const networkError = new TypeError('Failed to fetch')
    const request = jest.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce('success')

    const result = await handleNetworkRequest(request, { retries: 1, retryDelay: 10 })
    
    expect(result).toBe('success')
    expect(request).toHaveBeenCalledTimes(2)
  })
})

describe('handleValidationError', () => {
  it('should handle Zod validation errors', () => {
    const zodError = {
      name: 'ZodError',
      errors: [
        { path: ['email'], message: 'Invalid email', received: 'invalid-email' },
        { path: ['name'], message: 'Required', received: undefined },
      ],
    }

    const result = handleValidationError(zodError)

    expect(result).toBeInstanceOf(ValidationError)
    expect(result.errors).toEqual({
      email: ['Invalid email'],
      name: ['Required'],
    })
  })

  it('should handle existing ValidationError', () => {
    const existingError = new ValidationError('Test error', 'field', 'value')
    
    const result = handleValidationError(existingError)
    
    expect(result).toBe(existingError)
  })

  it('should handle generic errors', () => {
    const genericError = new Error('Generic validation error')
    
    const result = handleValidationError(genericError)
    
    expect(result).toBeInstanceOf(ValidationError)
    expect(result.message).toBe('Generic validation error')
    expect(result.field).toBe('unknown')
  })
})

describe('handleAuthError', () => {
  it('should handle errors with codes', () => {
    const authError = { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }
    
    const result = handleAuthError(authError)
    
    expect(result).toBeInstanceOf(AuthenticationError)
    expect(result.message).toBe('Invalid credentials')
    expect(result.code).toBe('INVALID_CREDENTIALS')
  })

  it('should handle errors without codes', () => {
    const authError = { message: 'Auth failed' }
    
    const result = handleAuthError(authError)
    
    expect(result).toBeInstanceOf(AuthenticationError)
    expect(result.code).toBe('AUTH_ERROR')
  })
})

describe('handlePredictionError', () => {
  it('should provide suggestions for insufficient data', () => {
    const error = new Error('insufficient data for prediction')
    
    const result = handlePredictionError(error, 'linear', 5)
    
    expect(result).toBeInstanceOf(PredictionError)
    expect(result.suggestedAction).toBe('Add more historical data (at least 30 data points recommended)')
  })

  it('should provide suggestions for memory errors', () => {
    const error = new Error('memory allocation failed')
    
    const result = handlePredictionError(error, 'polynomial', 100)
    
    expect(result.suggestedAction).toBe('Try using a simpler model or reduce the prediction period')
  })

  it('should provide suggestions for TensorFlow errors', () => {
    const error = new Error('tensorflow model loading failed')
    
    const result = handlePredictionError(error, 'arima', 50)
    
    expect(result.suggestedAction).toBe('Try refreshing the page or use the linear model as fallback')
  })
})

describe('showErrorToast', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show appropriate toast for API errors', () => {
    const apiError = new APIError('Not found', 404, '/api/test')
    
    showErrorToast(apiError)
    
    expect(mockToast.error).toHaveBeenCalledWith('API Error', {
      description: 'Resource not found.',
      action: {
        label: 'Dismiss',
        onClick: expect.any(Function),
      },
    })
  })

  it('should show appropriate toast for network errors', () => {
    const networkError = new NetworkError('Connection failed')
    
    showErrorToast(networkError)
    
    expect(mockToast.error).toHaveBeenCalledWith('Connection Error', {
      description: 'Please check your internet connection and try again.',
      action: {
        label: 'Dismiss',
        onClick: expect.any(Function),
      },
    })
  })

  it('should show appropriate toast for validation errors', () => {
    const validationError = new ValidationError('Invalid input', 'email', 'test')
    
    showErrorToast(validationError)
    
    expect(mockToast.error).toHaveBeenCalledWith('Validation Error', {
      description: 'Invalid input',
      action: {
        label: 'Dismiss',
        onClick: expect.any(Function),
      },
    })
  })
})

describe('getRecoverySuggestions', () => {
  it('should provide suggestions for API errors', () => {
    const serverError = new APIError('Server error', 500, '/api/test')
    const suggestions = getRecoverySuggestions(serverError)
    
    expect(suggestions).toContain('Try again in a few minutes')
    expect(suggestions).toContain('Check our status page for known issues')
  })

  it('should provide suggestions for rate limit errors', () => {
    const rateLimitError = new APIError('Rate limited', 429, '/api/test')
    const suggestions = getRecoverySuggestions(rateLimitError)
    
    expect(suggestions).toContain('Wait a moment before trying again')
    expect(suggestions).toContain('You may be making requests too quickly')
  })

  it('should provide suggestions for network errors', () => {
    const networkError = new NetworkError('Connection failed')
    const suggestions = getRecoverySuggestions(networkError)
    
    expect(suggestions).toContain('Check your internet connection')
    expect(suggestions).toContain('Try refreshing the page')
    expect(suggestions).toContain('Disable any VPN or proxy')
  })

  it('should provide suggestions for validation errors', () => {
    const validationError = new ValidationError('Invalid input', 'email', 'test')
    const suggestions = getRecoverySuggestions(validationError)
    
    expect(suggestions).toContain('Check the highlighted fields')
    expect(suggestions).toContain('Ensure all required fields are filled')
    expect(suggestions).toContain('Verify data format matches requirements')
  })

  it('should provide suggestions for prediction errors', () => {
    const predictionError = new PredictionError('Model failed', 'linear', 10, 'Use more data')
    const suggestions = getRecoverySuggestions(predictionError)
    
    expect(suggestions).toContain('Use more data')
    expect(suggestions).toContain('Try using a different prediction model')
  })

  it('should provide default suggestions for unknown errors', () => {
    const unknownError = new Error('Unknown error')
    const suggestions = getRecoverySuggestions(unknownError)
    
    expect(suggestions).toContain('Try refreshing the page')
    expect(suggestions).toContain('Contact support if the problem persists')
  })
})