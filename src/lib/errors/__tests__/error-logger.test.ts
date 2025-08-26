import { errorLogger, logError, logAPIError, logNetworkError } from '../error-logger'
import { APIError, NetworkError, AuthenticationError } from '../error-types'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock console methods
const mockConsole = {
  group: jest.fn(),
  groupEnd: jest.fn(),
  error: jest.fn()
}
Object.assign(console, mockConsole)

describe('ErrorLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    errorLogger.clearLogs()
    mockLocalStorage.getItem.mockReturnValue('[]')
  })

  describe('logError', () => {
    it('logs error with basic information', () => {
      const error = new Error('Test error')
      
      errorLogger.logError(error)
      
      const logs = errorLogger.getRecentLogs(1)
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        error,
        timestamp: expect.any(Date),
        userAgent: expect.any(String),
        url: expect.any(String)
      })
    })

    it('logs error with error info and additional context', () => {
      const error = new AuthenticationError('Auth failed', 'AUTH_FAILED')
      const errorInfo = {
        componentStack: 'Component stack trace',
        errorBoundary: 'TestBoundary'
      }
      const additionalContext = {
        userId: '123',
        action: 'login'
      }
      
      errorLogger.logError(error, errorInfo, additionalContext)
      
      const logs = errorLogger.getRecentLogs(1)
      expect(logs[0]).toMatchObject({
        error,
        errorInfo,
        additionalContext
      })
    })

    it('generates unique IDs for each log entry', () => {
      const error1 = new Error('Error 1')
      const error2 = new Error('Error 2')
      
      errorLogger.logError(error1)
      errorLogger.logError(error2)
      
      const logs = errorLogger.getRecentLogs(2)
      expect(logs[0].id).not.toBe(logs[1].id)
      expect(logs[0].id).toMatch(/^error_\d+_[a-z0-9]+$/)
      expect(logs[1].id).toMatch(/^error_\d+_[a-z0-9]+$/)
    })

    it('logs to console in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const error = new Error('Dev error')
      const errorInfo = {
        componentStack: 'Component stack'
      }
      
      errorLogger.logError(error, errorInfo, { extra: 'context' })
      
      expect(mockConsole.group).toHaveBeenCalledWith('🚨 Error: Error')
      expect(mockConsole.error).toHaveBeenCalledWith('Message:', 'Dev error')
      expect(mockConsole.error).toHaveBeenCalledWith('Stack:', error.stack)
      expect(mockConsole.error).toHaveBeenCalledWith('Component Stack:', 'Component stack')
      expect(mockConsole.error).toHaveBeenCalledWith('Additional Context:', { extra: 'context' })
      expect(mockConsole.groupEnd).toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })

    it('sends to external service in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      const error = new Error('Prod error')
      errorLogger.logError(error)
      
      // Should store in localStorage as fallback
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'error_logs',
        expect.stringContaining('"message":"Prod error"')
      )
      
      process.env.NODE_ENV = originalEnv
    })

    it('handles localStorage errors gracefully', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full')
      })
      
      const error = new Error('Storage test error')
      
      // Should not throw
      expect(() => errorLogger.logError(error)).not.toThrow()
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('getRecentLogs', () => {
    it('returns logs in reverse chronological order', () => {
      const error1 = new Error('First error')
      const error2 = new Error('Second error')
      const error3 = new Error('Third error')
      
      errorLogger.logError(error1)
      // Small delay to ensure different timestamps
      setTimeout(() => errorLogger.logError(error2), 1)
      setTimeout(() => errorLogger.logError(error3), 2)
      
      const logs = errorLogger.getRecentLogs(3)
      expect(logs[0].error.message).toBe('Third error')
      expect(logs[1].error.message).toBe('Second error')
      expect(logs[2].error.message).toBe('First error')
    })

    it('limits results to specified count', () => {
      for (let i = 0; i < 15; i++) {
        errorLogger.logError(new Error(`Error ${i}`))
      }
      
      const logs = errorLogger.getRecentLogs(5)
      expect(logs).toHaveLength(5)
    })

    it('returns all logs when limit exceeds log count', () => {
      errorLogger.logError(new Error('Only error'))
      
      const logs = errorLogger.getRecentLogs(10)
      expect(logs).toHaveLength(1)
    })
  })

  describe('clearLogs', () => {
    it('removes all stored logs', () => {
      errorLogger.logError(new Error('Error 1'))
      errorLogger.logError(new Error('Error 2'))
      
      expect(errorLogger.getRecentLogs()).toHaveLength(2)
      
      errorLogger.clearLogs()
      
      expect(errorLogger.getRecentLogs()).toHaveLength(0)
    })
  })

  describe('localStorage integration', () => {
    it('maintains only last 50 logs in localStorage', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      // Mock existing logs in localStorage
      const existingLogs = Array.from({ length: 48 }, (_, i) => ({
        id: `existing_${i}`,
        error: { message: `Existing error ${i}` }
      }))
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingLogs))
      
      // Add 3 more logs (should exceed 50)
      errorLogger.logError(new Error('New error 1'))
      errorLogger.logError(new Error('New error 2'))
      errorLogger.logError(new Error('New error 3'))
      
      // Should have called setItem with only last 50 logs
      const setItemCalls = mockLocalStorage.setItem.mock.calls
      const lastCall = setItemCalls[setItemCalls.length - 1]
      const storedLogs = JSON.parse(lastCall[1])
      
      expect(storedLogs).toHaveLength(50)
      
      process.env.NODE_ENV = originalEnv
    })
  })
})

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    errorLogger.clearLogs()
  })

  describe('logError', () => {
    it('logs error with context using errorLogger', () => {
      const error = new Error('Utility error')
      const context = { component: 'TestComponent' }
      
      logError(error, context)
      
      const logs = errorLogger.getRecentLogs(1)
      expect(logs[0]).toMatchObject({
        error,
        additionalContext: context
      })
    })
  })

  describe('logAPIError', () => {
    it('creates and logs APIError', () => {
      logAPIError('Server error', 500, '/api/test', { requestId: '123' })
      
      const logs = errorLogger.getRecentLogs(1)
      expect(logs[0].error).toBeInstanceOf(APIError)
      expect(logs[0].error.message).toBe('Server error')
      expect((logs[0].error as APIError).status).toBe(500)
      expect((logs[0].error as APIError).endpoint).toBe('/api/test')
      expect(logs[0].additionalContext).toEqual({ requestId: '123' })
    })
  })

  describe('logNetworkError', () => {
    it('creates and logs NetworkError', () => {
      logNetworkError('Connection failed', 'https://api.example.com', 0, { timeout: true })
      
      const logs = errorLogger.getRecentLogs(1)
      expect(logs[0].error).toBeInstanceOf(NetworkError)
      expect(logs[0].error.message).toBe('Connection failed')
      expect((logs[0].error as NetworkError).url).toBe('https://api.example.com')
      expect((logs[0].error as NetworkError).status).toBe(0)
      expect(logs[0].additionalContext).toEqual({ timeout: true })
    })

    it('creates NetworkError without status', () => {
      logNetworkError('DNS error', 'https://invalid.domain')
      
      const logs = errorLogger.getRecentLogs(1)
      expect(logs[0].error).toBeInstanceOf(NetworkError)
      expect((logs[0].error as NetworkError).status).toBeUndefined()
    })
  })
})