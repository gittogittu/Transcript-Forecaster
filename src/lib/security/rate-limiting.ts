import { NextRequest, NextResponse } from 'next/server'

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (request: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

class RateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>()
  private config: Required<RateLimitConfig>

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req) => this.getClientIP(req),
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    }
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    return cfConnectingIP || realIP || forwarded?.split(',')[0] || 'unknown'
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime <= now) {
        this.store.delete(key)
      }
    }
  }

  check(request: NextRequest): RateLimitResult {
    this.cleanup()
    
    const key = this.config.keyGenerator(request)
    const now = Date.now()
    const resetTime = now + this.config.windowMs
    
    const current = this.store.get(key)
    
    if (!current || current.resetTime <= now) {
      // First request or window expired
      this.store.set(key, { count: 1, resetTime })
      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime
      }
    }
    
    if (current.count >= this.config.maxRequests) {
      return {
        success: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: current.resetTime
      }
    }
    
    current.count++
    return {
      success: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - current.count,
      resetTime: current.resetTime
    }
  }

  reset(request: NextRequest): void {
    const key = this.config.keyGenerator(request)
    this.store.delete(key)
  }
}

// Predefined rate limiters for different endpoints
export const apiRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100
})

export const authRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5
})

export const uploadRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10
})

export const predictionRateLimit = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20
})

export function createRateLimitMiddleware(limiter: RateLimiter) {
  return (request: NextRequest): NextResponse | null => {
    const result = limiter.check(request)
    
    if (!result.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          resetTime: result.resetTime
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
          }
        }
      )
    }
    
    return null // Continue to next middleware
  }
}