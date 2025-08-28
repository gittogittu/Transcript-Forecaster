import { NextRequest } from 'next/server'
import { createRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'

describe('Rate Limiting Integration Tests', () => {
  beforeEach(() => {
    // Clear rate limit store before each test
    jest.clearAllMocks()
  })

  it('should allow requests within rate limit', async () => {
    const rateLimit = createRateLimit({
      windowMs: 60000, // 1 minute
      maxRequests: 5
    })

    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' }
    })

    // First request should pass
    const response1 = await rateLimit(request)
    expect(response1).toBeNull()

    // Second request should pass
    const response2 = await rateLimit(request)
    expect(response2).toBeNull()
  })

  it('should block requests exceeding rate limit', async () => {
    const rateLimit = createRateLimit({
      windowMs: 60000, // 1 minute
      maxRequests: 2
    })

    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.2' }
    })

    // First two requests should pass
    await rateLimit(request)
    await rateLimit(request)

    // Third request should be blocked
    const response = await rateLimit(request)
    expect(response).not.toBeNull()
    expect(response!.status).toBe(429)

    const data = await response!.json()
    expect(data.error).toContain('Too many requests')
    expect(data.limit).toBe(2)
    expect(data.remaining).toBe(0)
  })

  it('should have different limits for different IPs', async () => {
    const rateLimit = createRateLimit({
      windowMs: 60000,
      maxRequests: 2
    })

    const request1 = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.3' }
    })

    const request2 = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.4' }
    })

    // Use up limit for first IP
    await rateLimit(request1)
    await rateLimit(request1)
    const blocked = await rateLimit(request1)
    expect(blocked!.status).toBe(429)

    // Second IP should still work
    const allowed = await rateLimit(request2)
    expect(allowed).toBeNull()
  })

  it('should have different limits for different endpoints', async () => {
    const rateLimit = createRateLimit({
      windowMs: 60000,
      maxRequests: 2
    })

    const request1 = new NextRequest('http://localhost:3000/api/transcripts', {
      headers: { 'x-forwarded-for': '192.168.1.5' }
    })

    const request2 = new NextRequest('http://localhost:3000/api/analytics', {
      headers: { 'x-forwarded-for': '192.168.1.5' }
    })

    // Use up limit for transcripts endpoint
    await rateLimit(request1)
    await rateLimit(request1)
    const blocked = await rateLimit(request1)
    expect(blocked!.status).toBe(429)

    // Analytics endpoint should still work (different endpoint)
    const allowed = await rateLimit(request2)
    expect(allowed).toBeNull()
  })

  it('should include proper rate limit headers', async () => {
    const rateLimit = createRateLimit({
      windowMs: 60000,
      maxRequests: 3
    })

    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.6' }
    })

    // First request
    await rateLimit(request)
    
    // Check that rate limit info is stored in request
    expect((request as any).rateLimit).toBeDefined()
    expect((request as any).rateLimit.limit).toBe(3)
    expect((request as any).rateLimit.remaining).toBe(2)
    expect((request as any).rateLimit.used).toBe(1)
  })

  it('should reset rate limit after window expires', async () => {
    const rateLimit = createRateLimit({
      windowMs: 100, // Very short window for testing
      maxRequests: 1
    })

    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.7' }
    })

    // Use up the limit
    await rateLimit(request)
    const blocked = await rateLimit(request)
    expect(blocked!.status).toBe(429)

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150))

    // Should work again
    const allowed = await rateLimit(request)
    expect(allowed).toBeNull()
  })

  describe('Predefined rate limit configurations', () => {
    it('should have appropriate limits for different operation types', () => {
      expect(rateLimitConfigs.read.maxRequests).toBeGreaterThan(rateLimitConfigs.data.maxRequests)
      expect(rateLimitConfigs.data.maxRequests).toBeGreaterThan(rateLimitConfigs.predictions.maxRequests)
      expect(rateLimitConfigs.predictions.maxRequests).toBeGreaterThan(0)
    })

    it('should have reasonable time windows', () => {
      expect(rateLimitConfigs.standard.windowMs).toBeGreaterThan(0)
      expect(rateLimitConfigs.strict.windowMs).toBeGreaterThan(0)
      expect(rateLimitConfigs.predictions.windowMs).toBeGreaterThan(0)
    })
  })
})