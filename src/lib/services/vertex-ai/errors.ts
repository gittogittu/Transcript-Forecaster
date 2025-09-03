// Vertex AI Error Handling and Rate Limiting

import type { VertexAIError, RateLimitConfig } from '@/types/vertex-ai'

export class VertexAIServiceError extends Error implements VertexAIError {
  public code?: number
  public status?: string
  public details?: any[]
  public metadata?: any

  constructor(
    message: string,
    code?: number,
    status?: string,
    details?: any[],
    metadata?: any
  ) {
    super(message)
    this.name = 'VertexAIServiceError'
    this.code = code
    this.status = status
    this.details = details
    this.metadata = metadata
  }

  static fromGoogleCloudError(error: any): VertexAIServiceError {
    return new VertexAIServiceError(
      error.message || 'Unknown Vertex AI error',
      error.code,
      error.status,
      error.details,
      error.metadata
    )
  }

  static fromHttpError(response: Response, body?: any): VertexAIServiceError {
    const message = body?.error?.message || `HTTP ${response.status}: ${response.statusText}`
    return new VertexAIServiceError(
      message,
      response.status,
      response.statusText,
      body?.error?.details,
      { url: response.url, headers: response.headers }
    )
  }

  isRetryable(): boolean {
    // Retry on rate limiting, temporary failures, and server errors
    return (
      this.code === 429 || // Too Many Requests
      this.code === 503 || // Service Unavailable
      this.code === 502 || // Bad Gateway
      this.code === 504 || // Gateway Timeout
      (typeof this.code === 'number' && this.code >= 500 && this.code < 600) // Other server errors
    )
  }

  isQuotaExceeded(): boolean {
    return (
      this.code === 429 ||
      Boolean(this.message && this.message.toLowerCase().includes('quota')) ||
      Boolean(this.message && this.message.toLowerCase().includes('rate limit'))
    )
  }

  isAuthenticationError(): boolean {
    return this.code === 401 || this.code === 403
  }

  isNotFound(): boolean {
    return this.code === 404
  }

  getRetryDelayMs(): number {
    // Extract retry delay from headers if available
    if (this.metadata?.headers?.['retry-after']) {
      const retryAfter = parseInt(this.metadata.headers['retry-after'])
      if (!isNaN(retryAfter)) {
        return retryAfter * 1000 // Convert seconds to milliseconds
      }
    }

    // Default exponential backoff
    return Math.min(1000 * Math.pow(2, Math.random() * 3), 30000) // Max 30 seconds
  }
}

export class RateLimiter {
  private requestQueue: Array<() => Promise<any>> = []
  private activeRequests = 0
  private requestTimes: number[] = []
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.executeWithRetry(operation)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const vertexError = error instanceof VertexAIServiceError 
        ? error 
        : VertexAIServiceError.fromGoogleCloudError(error)

      if (attempt >= this.config.retryAttempts || !vertexError.isRetryable()) {
        throw vertexError
      }

      const delay = this.calculateRetryDelay(attempt, vertexError)
      await this.sleep(delay)

      return this.executeWithRetry(operation, attempt + 1)
    }
  }

  private calculateRetryDelay(attempt: number, error: VertexAIServiceError): number {
    // Use error-specific delay if available
    const errorDelay = error.getRetryDelayMs()
    if (errorDelay > 0) {
      return errorDelay
    }

    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1)
    const jitter = Math.random() * 0.1 * baseDelay // 10% jitter
    return Math.min(baseDelay + jitter, 60000) // Max 60 seconds
  }

  private async processQueue(): Promise<void> {
    if (this.requestQueue.length === 0 || !this.canMakeRequest()) {
      return
    }

    const operation = this.requestQueue.shift()
    if (!operation) return

    this.activeRequests++
    this.recordRequest()

    try {
      await operation()
    } finally {
      this.activeRequests--
      // Process next request after a small delay
      setTimeout(() => this.processQueue(), 100)
    }
  }

  private canMakeRequest(): boolean {
    // Check concurrent request limit
    if (this.activeRequests >= this.config.maxConcurrentRequests) {
      return false
    }

    // Check rate limit (requests per minute)
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    const recentRequests = this.requestTimes.filter(time => time > oneMinuteAgo)
    
    return recentRequests.length < this.config.maxRequestsPerMinute
  }

  private recordRequest(): void {
    const now = Date.now()
    this.requestTimes.push(now)
    
    // Clean up old request times (older than 1 minute)
    const oneMinuteAgo = now - 60000
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getStats(): {
    activeRequests: number
    queueLength: number
    requestsInLastMinute: number
  } {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    const requestsInLastMinute = this.requestTimes.filter(time => time > oneMinuteAgo).length

    return {
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length,
      requestsInLastMinute,
    }
  }
}

export class VertexAIErrorHandler {
  private static instance: VertexAIErrorHandler
  private errorCounts: Map<string, number> = new Map()
  private lastErrorTime: Map<string, number> = new Map()

  public static getInstance(): VertexAIErrorHandler {
    if (!VertexAIErrorHandler.instance) {
      VertexAIErrorHandler.instance = new VertexAIErrorHandler()
    }
    return VertexAIErrorHandler.instance
  }

  handleError(error: any, context?: string): VertexAIServiceError {
    const vertexError = error instanceof VertexAIServiceError 
      ? error 
      : VertexAIServiceError.fromGoogleCloudError(error)

    this.recordError(vertexError, context)
    this.logError(vertexError, context)

    return vertexError
  }

  private recordError(error: VertexAIServiceError, context?: string): void {
    const key = `${context || 'unknown'}:${error.code || 'unknown'}`
    const currentCount = this.errorCounts.get(key) || 0
    this.errorCounts.set(key, currentCount + 1)
    this.lastErrorTime.set(key, Date.now())
  }

  private logError(error: VertexAIServiceError, context?: string): void {
    const logData = {
      context,
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
      timestamp: new Date().toISOString(),
    }

    if (error.isAuthenticationError()) {
      console.error('Vertex AI Authentication Error:', logData)
    } else if (error.isQuotaExceeded()) {
      console.warn('Vertex AI Quota Exceeded:', logData)
    } else if (error.isRetryable()) {
      console.warn('Vertex AI Retryable Error:', logData)
    } else {
      console.error('Vertex AI Error:', logData)
    }
  }

  getErrorStats(): Record<string, { count: number; lastOccurrence: number }> {
    const stats: Record<string, { count: number; lastOccurrence: number }> = {}
    
    for (const [key, count] of this.errorCounts.entries()) {
      stats[key] = {
        count,
        lastOccurrence: this.lastErrorTime.get(key) || 0,
      }
    }
    
    return stats
  }

  clearErrorStats(): void {
    this.errorCounts.clear()
    this.lastErrorTime.clear()
  }

  isCircuitBreakerTripped(context: string, threshold = 10, timeWindowMs = 300000): boolean {
    const now = Date.now()
    let totalErrors = 0

    for (const [key, count] of this.errorCounts.entries()) {
      if (key.startsWith(`${context}:`)) {
        const lastError = this.lastErrorTime.get(key) || 0
        if (now - lastError < timeWindowMs) {
          totalErrors += count
        }
      }
    }

    return totalErrors >= threshold
  }
}

// Utility functions
export function isVertexAIError(error: any): error is VertexAIServiceError {
  return error instanceof VertexAIServiceError
}

export function createVertexAIError(
  message: string,
  code?: number,
  details?: any
): VertexAIServiceError {
  return new VertexAIServiceError(message, code, undefined, details)
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const handler = VertexAIErrorHandler.getInstance()
    throw handler.handleError(error, context)
  }
}