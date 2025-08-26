import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore: RateLimitStore = {}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key]
    }
  })
}, 60000) // Clean up every minute

/**
 * Rate limiting middleware
 */
export function createRateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const {
      windowMs,
      maxRequests,
      message = 'Too many requests, please try again later.',
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
    } = config

    // Generate key based on IP address and endpoint
    const ip = request.ip || 
               request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    const endpoint = new URL(request.url).pathname
    const key = `${ip}:${endpoint}`

    const now = Date.now()
    const resetTime = now + windowMs

    // Initialize or get existing rate limit data
    if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
      rateLimitStore[key] = {
        count: 0,
        resetTime,
      }
    }

    const current = rateLimitStore[key]

    // Check if limit exceeded
    if (current.count >= maxRequests) {
      const retryAfter = Math.ceil((current.resetTime - now) / 1000)
      
      return NextResponse.json(
        { 
          error: message,
          retryAfter,
          limit: maxRequests,
          remaining: 0,
          resetTime: new Date(current.resetTime).toISOString(),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': current.resetTime.toString(),
            'Retry-After': retryAfter.toString(),
          }
        }
      )
    }

    // Increment counter
    current.count++

    // Add rate limit headers to response (will be added by the calling function)
    const remaining = Math.max(0, maxRequests - current.count)
    
    // Store rate limit info in request for later use
    ;(request as any).rateLimit = {
      limit: maxRequests,
      remaining,
      resetTime: current.resetTime,
      used: current.count,
    }

    return null // Continue to next middleware/handler
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const rateLimit = (request as any).rateLimit
  
  if (rateLimit) {
    response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString())
  }
  
  return response
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
  // Standard API endpoints
  standard: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests from this IP, please try again later.',
  },
  
  // Strict rate limiting for expensive operations
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,
    message: 'Rate limit exceeded for this operation, please try again later.',
  },
  
  // Very strict for prediction generation
  predictions: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5,
    message: 'Prediction generation rate limit exceeded, please wait before requesting more predictions.',
  },
  
  // Moderate for data operations
  data: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 50,
    message: 'Data operation rate limit exceeded, please try again later.',
  },
  
  // Lenient for read operations
  read: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200,
    message: 'Read operation rate limit exceeded, please try again later.',
  },
}

/**
 * Apply rate limiting to an API route handler
 */
export function withRateLimit<T extends any[]>(
  config: RateLimitConfig,
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const rateLimit = createRateLimit(config)
    const rateLimitResponse = await rateLimit(request)
    
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    const response = await handler(request, ...args)
    return addRateLimitHeaders(response, request)
  }
}