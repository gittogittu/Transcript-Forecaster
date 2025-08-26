import { renderHook, act } from '@testing-library/react'
import { useErrorHandler } from '../use-error-handler'
import { APIError, AuthenticationError, NetworkError } from '@/lib/errors/error-types'
import * as errorHandlers from '@/lib/errors/error-handlers'

// Mock the error handlers module
jest.mock('@/lib/errors/error-handlers', () => ({
  handleError: jest.fn(),
  getRecoverySuggestions: jest.fn()
}))

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('handleError', () => {
    it('calls handleError with error and context', () => {
      const { result } = renderHook(() => useErrorHandler())
      const error = new APIError('Test error', 500, '/api/test')
      const context = { component: 'TestComponent' }

      act(() => {
        result.current.handleError(error, context)
      })

      expect(errorHandlers.handleError).toHaveBeenCalledWith(error, context)
    })

    it('calls handleError without context', () => {
      const { result } = renderHook(() => useErrorHandler())
      const error = new AuthenticationError('Auth error', 'AUTH_FAILED')

      act(() => {
        result.current.handleError(error)
      })

      expect(errorHandlers.handleError).toHaveBeenCalledWith(error, undefined)
    })

    it('maintains referential equality across renders', () => {
      const { result, rerender } = renderHook(() => useErrorHandler())
      const firstHandleError = result.current.handleError

      rerender()

      expect(result.current.handleError).toBe(firstHandleError)
    })
  })

  describe('handleAsyncError', () => {
    it('returns resolved value for successful promises', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const mockData = { success: true }
      const promise = Promise.resolve(mockData)

      const resolvedValue = await result.current.handleAsyncError(promise)

      expect(resolvedValue).toEqual(mockData)
      expect(errorHandlers.handleError).not.toHaveBeenCalled()
    })

    it('handles rejected promises and re-throws error', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const error = new NetworkError('Network failed', 'https://api.example.com')
      const promise = Promise.reject(error)
      const context = { operation: 'fetch_data' }

      await expect(result.current.handleAsyncError(promise, context)).rejects.toThrow(error)
      expect(errorHandlers.handleError).toHaveBeenCalledWith(error, context)
    })

    it('handles rejected promises without context', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const error = new Error('Generic error')
      const promise = Promise.reject(error)

      await expect(result.current.handleAsyncError(promise)).rejects.toThrow(error)
      expect(errorHandlers.handleError).toHaveBeenCalledWith(error, undefined)
    })

    it('maintains referential equality across renders', () => {
      const { result, rerender } = renderHook(() => useErrorHandler())
      const firstHandleAsyncError = result.current.handleAsyncError

      rerender()

      expect(result.current.handleAsyncError).toBe(firstHandleAsyncError)
    })
  })

  describe('getRecoverySuggestions', () => {
    it('calls getRecoverySuggestions and returns suggestions', () => {
      const mockSuggestions = ['Suggestion 1', 'Suggestion 2']
      ;(errorHandlers.getRecoverySuggestions as jest.Mock).mockReturnValue(mockSuggestions)

      const { result } = renderHook(() => useErrorHandler())
      const error = new APIError('Test error', 404, '/api/missing')

      const suggestions = result.current.getRecoverySuggestions(error)

      expect(errorHandlers.getRecoverySuggestions).toHaveBeenCalledWith(error)
      expect(suggestions).toEqual(mockSuggestions)
    })

    it('maintains referential equality across renders', () => {
      const { result, rerender } = renderHook(() => useErrorHandler())
      const firstGetRecoverySuggestions = result.current.getRecoverySuggestions

      rerender()

      expect(result.current.getRecoverySuggestions).toBe(firstGetRecoverySuggestions)
    })
  })

  describe('integration scenarios', () => {
    it('handles multiple errors in sequence', async () => {
      const { result } = renderHook(() => useErrorHandler())
      
      const error1 = new APIError('First error', 500, '/api/first')
      const error2 = new AuthenticationError('Second error', 'AUTH_FAILED')
      const promise1 = Promise.reject(error1)
      const promise2 = Promise.reject(error2)

      await expect(result.current.handleAsyncError(promise1)).rejects.toThrow(error1)
      await expect(result.current.handleAsyncError(promise2)).rejects.toThrow(error2)

      expect(errorHandlers.handleError).toHaveBeenCalledTimes(2)
      expect(errorHandlers.handleError).toHaveBeenNthCalledWith(1, error1, undefined)
      expect(errorHandlers.handleError).toHaveBeenNthCalledWith(2, error2, undefined)
    })

    it('handles mixed sync and async errors', async () => {
      const { result } = renderHook(() => useErrorHandler())
      
      const syncError = new NetworkError('Sync error', 'https://sync.example.com')
      const asyncError = new APIError('Async error', 400, '/api/async')
      const promise = Promise.reject(asyncError)

      // Handle sync error
      act(() => {
        result.current.handleError(syncError, { type: 'sync' })
      })

      // Handle async error
      await expect(result.current.handleAsyncError(promise, { type: 'async' })).rejects.toThrow(asyncError)

      expect(errorHandlers.handleError).toHaveBeenCalledTimes(2)
      expect(errorHandlers.handleError).toHaveBeenNthCalledWith(1, syncError, { type: 'sync' })
      expect(errorHandlers.handleError).toHaveBeenNthCalledWith(2, asyncError, { type: 'async' })
    })

    it('provides consistent API across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useErrorHandler())
      const { result: result2 } = renderHook(() => useErrorHandler())

      // Functions should be different instances but behave the same
      expect(result1.current.handleError).not.toBe(result2.current.handleError)
      
      const error = new Error('Test error')
      
      act(() => {
        result1.current.handleError(error)
        result2.current.handleError(error)
      })

      expect(errorHandlers.handleError).toHaveBeenCalledTimes(2)
      expect(errorHandlers.handleError).toHaveBeenNthCalledWith(1, error, undefined)
      expect(errorHandlers.handleError).toHaveBeenNthCalledWith(2, error, undefined)
    })
  })

  describe('error handling edge cases', () => {
    it('handles null/undefined errors gracefully', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const promise = Promise.reject(null)

      await expect(result.current.handleAsyncError(promise)).rejects.toBeNull()
      expect(errorHandlers.handleError).toHaveBeenCalledWith(null, undefined)
    })

    it('handles promises that resolve to undefined', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const promise = Promise.resolve(undefined)

      const resolvedValue = await result.current.handleAsyncError(promise)

      expect(resolvedValue).toBeUndefined()
      expect(errorHandlers.handleError).not.toHaveBeenCalled()
    })

    it('handles promises that resolve to null', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const promise = Promise.resolve(null)

      const resolvedValue = await result.current.handleAsyncError(promise)

      expect(resolvedValue).toBeNull()
      expect(errorHandlers.handleError).not.toHaveBeenCalled()
    })
  })
})