import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter, createRateLimitMiddleware } from '../rate-limiting'

// Mock Date.now for consistent testing
const mockNow = jest.fn()
Date.now = mockNow

// Create fresh rate limiters for testing
let apiRateLimit: RateLimiter
let authRateLimit: RateLimiter

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Create fresh rate limiters for each test
    apiRateLimit = new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100
    })
    authRateLimit = new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5
    })
    mockNow.mockReturnValue(1000000) // Fixed timestamp
  })

  describe('apiRateLimit', () => {
    it('should allow requests within limit', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })

      const result = apiRateLimit.check(request)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(99) // 100 - 1
    })

    it('should track multiple requests from same IP', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })

      // First request
      let result = apiRateLimit.check(request)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(99)

      // Second request
      result = apiRateLimit.check(request)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(98)
    })

    it('should handle different IPs separately', () => {
      const request1 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })
      const request2 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.2' }
      })

      const result1 = apiRateLimit.check(request1)
      const result2 = apiRateLimit.check(request2)

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.remaining).toBe(99)
      expect(result2.remaining).toBe(99)
    })
  })

  describe('createRateLimitMiddleware', () => {
    it('should return null for requests within limit', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })

      const middleware = createRateLimitMiddleware(apiRateLimit)
      const response = middleware(request)

      expect(response).toBeNull()
    })

    it('should return 429 response when limit exceeded', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })

      // Simulate exceeding the limit by making many requests
      for (let i = 0; i < 101; i++) {
        apiRateLimit.check(request)
      }

      const middleware = createRateLimitMiddleware(apiRateLimit)
      const response = middleware(request)

      expect(response).not.toBeNull()
      expect(response?.status).toBe(429)
    })

    it('should include rate limit headers in 429 response', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })

      // Exceed the limit
      for (let i = 0; i < 101; i++) {
        apiRateLimit.check(request)
      }

      const middleware = createRateLimitMiddleware(apiRateLimit)
      const response = middleware(request)

      expect(response?.headers.get('X-RateLimit-Limit')).toBeTruthy()
      expect(response?.headers.get('X-RateLimit-Remaining')).toBeTruthy()
      expect(response?.headers.get('X-RateLimit-Reset')).toBeTruthy()
      expect(response?.headers.get('Retry-After')).toBeTruthy()
    })
  })

  describe('authRateLimit', () => {
    it('should have stricter limits than API rate limit', () => {
      const request = new NextRequest('http://localhost/auth/signin', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })

      // Make 6 requests (auth limit is 5)
      let result
      for (let i = 0; i < 6; i++) {
        result = authRateLimit.check(request)
      }

      expect(result?.success).toBe(false)
    })
  })

  describe('IP extraction', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }
      })

      const result = apiRateLimit.check(request)
      expect(result.success).toBe(true)
    })

    it('should extract IP from x-real-ip header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'x-real-ip': '192.168.1.1' }
      })

      const result = apiRateLimit.check(request)
      expect(result.success).toBe(true)
    })

    it('should extract IP from cf-connecting-ip header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'cf-connecting-ip': '192.168.1.1' }
      })

      const result = apiRateLimit.check(request)
      expect(result.success).toBe(true)
    })

    it('should use unknown when no IP headers present', () => {
      const request = new NextRequest('http://localhost/api/test')

      const result = apiRateLimit.check(request)
      expect(result.success).toBe(true)
    })
  })
})