import { NextRequest } from 'next/server'
import { performanceMiddleware, measureModelPerformance } from '@/lib/middleware/performance-middleware'
import { metricsCollector } from '@/lib/monitoring/metrics-collector'

// Mock metrics collector
jest.mock('@/lib/monitoring/metrics-collector', () => ({
  metricsCollector: {
    recordQuery: jest.fn(),
    recordError: jest.fn(),
    recordUserActivity: jest.fn(),
    recordModelExecution: jest.fn()
  }
}))

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

describe('Performance Monitoring Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Performance middleware', () => {
    it('should record successful API calls', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )

      const request = new NextRequest('http://localhost:3000/api/test')
      
      await performanceMiddleware(request, mockHandler)

      expect(metricsCollector.recordQuery).toHaveBeenCalledWith(
        expect.any(Number), // duration
        '/api/test', // endpoint
        true // success
      )
    })

    it('should record failed API calls', async () => {
      const mockError = new Error('Test error')
      const mockHandler = jest.fn().mockRejectedValue(mockError)

      const request = new NextRequest('http://localhost:3000/api/test')
      
      try {
        await performanceMiddleware(request, mockHandler)
      } catch (error) {
        // Expected to throw
      }

      expect(metricsCollector.recordError).toHaveBeenCalledWith(
        mockError,
        '/api/test',
        undefined // no user session
      )

      expect(metricsCollector.recordQuery).toHaveBeenCalledWith(
        expect.any(Number), // duration
        '/api/test', // endpoint
        false // success = false
      )
    })

    it('should record user activity when session exists', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue({
        user: { id: 'user-123' }
      })

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )

      const request = new NextRequest('http://localhost:3000/api/test')
      
      await performanceMiddleware(request, mockHandler)

      expect(metricsCollector.recordUserActivity).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'api_request',
        endpoint: '/api/test',
        timestamp: expect.any(Date),
        duration: expect.any(Number),
        success: true,
        errorMessage: undefined
      })
    })

    it('should handle session errors gracefully', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockRejectedValue(new Error('Session error'))

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )

      const request = new NextRequest('http://localhost:3000/api/test')
      
      // Should not throw despite session error
      await expect(performanceMiddleware(request, mockHandler)).resolves.toBeDefined()

      expect(metricsCollector.recordQuery).toHaveBeenCalled()
    })

    it('should measure execution time accurately', async () => {
      const delay = 100 // ms
      const mockHandler = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, delay))
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const request = new NextRequest('http://localhost:3000/api/test')
      
      await performanceMiddleware(request, mockHandler)

      const recordedDuration = (metricsCollector.recordQuery as jest.Mock).mock.calls[0][0]
      expect(recordedDuration).toBeGreaterThanOrEqual(delay - 10) // Allow some tolerance
    })
  })

  describe('Model performance measurement', () => {
    it('should record successful model execution', async () => {
      const mockOperation = jest.fn().mockResolvedValue('model result')
      
      const result = await measureModelPerformance('linear', mockOperation)

      expect(result).toBe('model result')
      expect(metricsCollector.recordModelExecution).toHaveBeenCalledWith(
        'linear',
        expect.any(Number), // duration
        true // success
      )
    })

    it('should record failed model execution', async () => {
      const mockError = new Error('Model error')
      const mockOperation = jest.fn().mockRejectedValue(mockError)
      
      await expect(measureModelPerformance('polynomial', mockOperation)).rejects.toThrow('Model error')

      expect(metricsCollector.recordModelExecution).toHaveBeenCalledWith(
        'polynomial',
        expect.any(Number), // duration
        false // success = false
      )
    })

    it('should measure model execution time', async () => {
      const delay = 50 // ms
      const mockOperation = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, delay))
        return 'result'
      })
      
      await measureModelPerformance('arima', mockOperation)

      const recordedDuration = (metricsCollector.recordModelExecution as jest.Mock).mock.calls[0][1]
      expect(recordedDuration).toBeGreaterThanOrEqual(delay - 10) // Allow some tolerance
    })
  })

  describe('Error handling and logging', () => {
    it('should record different error types correctly', async () => {
      const validationError = new Error('Validation failed')
      validationError.name = 'ValidationError'

      const mockHandler = jest.fn().mockRejectedValue(validationError)
      const request = new NextRequest('http://localhost:3000/api/test')
      
      try {
        await performanceMiddleware(request, mockHandler)
      } catch (error) {
        // Expected to throw
      }

      expect(metricsCollector.recordError).toHaveBeenCalledWith(
        validationError,
        '/api/test',
        undefined
      )
    })

    it('should handle non-Error objects', async () => {
      const mockHandler = jest.fn().mockRejectedValue('String error')
      const request = new NextRequest('http://localhost:3000/api/test')
      
      try {
        await performanceMiddleware(request, mockHandler)
      } catch (error) {
        // Expected to throw
      }

      expect(metricsCollector.recordError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unknown error'
        }),
        '/api/test',
        undefined
      )
    })
  })

  describe('Performance metrics collection', () => {
    it('should collect metrics for different endpoints', async () => {
      const endpoints = ['/api/transcripts', '/api/analytics', '/api/users']
      
      for (const endpoint of endpoints) {
        const mockHandler = jest.fn().mockResolvedValue(
          new Response(JSON.stringify({ success: true }), { status: 200 })
        )

        const request = new NextRequest(`http://localhost:3000${endpoint}`)
        await performanceMiddleware(request, mockHandler)
      }

      expect(metricsCollector.recordQuery).toHaveBeenCalledTimes(3)
      
      const calls = (metricsCollector.recordQuery as jest.Mock).mock.calls
      expect(calls[0][1]).toBe('/api/transcripts')
      expect(calls[1][1]).toBe('/api/analytics')
      expect(calls[2][1]).toBe('/api/users')
    })

    it('should differentiate between success and failure', async () => {
      // Successful request
      const successHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )
      
      const request1 = new NextRequest('http://localhost:3000/api/test')
      await performanceMiddleware(request1, successHandler)

      // Failed request (4xx status)
      const failHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
      )
      
      const request2 = new NextRequest('http://localhost:3000/api/test')
      await performanceMiddleware(request2, failHandler)

      const calls = (metricsCollector.recordQuery as jest.Mock).mock.calls
      expect(calls[0][2]).toBe(true)  // success
      expect(calls[1][2]).toBe(false) // failure (4xx status)
    })
  })
})