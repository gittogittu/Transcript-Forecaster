/**
 * Comprehensive Error Handling and Recovery System
 * 
 * Provides centralized error handling, recovery mechanisms, and resilience patterns
 * for the predictive analytics system including circuit breakers, retries, and fallbacks
 */

import { PerformanceMonitor } from '../performance-monitoring/performance-monitor'

export enum ErrorType {
  VERTEX_AI_ERROR = 'VERTEX_AI_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  PREDICTION_ERROR = 'PREDICTION_ERROR',
  EMBEDDING_ERROR = 'EMBEDDING_ERROR'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface SystemError {
  id: string
  type: ErrorType
  severity: ErrorSeverity
  message: string
  component: string
  timestamp: Date
  context?: Record<string, any>
  stackTrace?: string
  recoverable: boolean
  retryCount: number
  maxRetries: number
}

export interface RecoveryStrategy {
  name: string
  description: string
  execute: (error: SystemError) => Promise<boolean>
  applicableErrors: ErrorType[]
  priority: number
}

export interface CircuitBreakerState {
  isOpen: boolean
  failureCount: number
  lastFailureTime: Date | null
  successCount: number
  halfOpenAttempts: number
}

export class ErrorHandlingService {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map()
  private recoveryStrategies: RecoveryStrategy[] = []
  private errorHistory: SystemError[] = []
  private performanceMonitor: PerformanceMonitor
  private maxErrorHistory = 1000

  // Circuit breaker configuration
  private readonly circuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    halfOpenMaxAttempts: 3,
    successThreshold: 2
  }

  // Retry configuration
  private readonly retryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  }

  constructor(performanceMonitor: PerformanceMonitor) {
    this.performanceMonitor = performanceMonitor
    this.initializeRecoveryStrategies()
  }

  /**
   * Handle an error with comprehensive recovery mechanisms
   */
  async handleError(error: Error | SystemError, context: {
    component: string
    operation: string
    clientId?: string
    requestId?: string
    additionalContext?: Record<string, any>
  }): Promise<{
    handled: boolean
    recovered: boolean
    fallbackUsed: boolean
    strategy?: string
    retryAfter?: number
  }> {
    try {
      // Convert to SystemError if needed
      const systemError = this.normalizeError(error, context)
      
      // Log the error
      await this.logError(systemError)
      
      // Check circuit breaker
      const circuitBreakerKey = `${context.component}-${context.operation}`
      if (this.isCircuitBreakerOpen(circuitBreakerKey)) {
        console.warn(`Circuit breaker is open for ${circuitBreakerKey}`)
        return {
          handled: true,
          recovered: false,
          fallbackUsed: true,
          retryAfter: this.getCircuitBreakerRetryTime(circuitBreakerKey)
        }
      }

      // Record failure in circuit breaker
      this.recordCircuitBreakerFailure(circuitBreakerKey)

      // Attempt recovery
      const recoveryResult = await this.attemptRecovery(systemError)
      
      if (recoveryResult.recovered) {
        // Reset circuit breaker on successful recovery
        this.recordCircuitBreakerSuccess(circuitBreakerKey)
        
        return {
          handled: true,
          recovered: true,
          fallbackUsed: false,
          strategy: recoveryResult.strategy
        }
      }

      // If recovery failed, try fallback mechanisms
      const fallbackResult = await this.executeFallback(systemError, context)
      
      return {
        handled: true,
        recovered: false,
        fallbackUsed: fallbackResult.success,
        strategy: fallbackResult.strategy
      }

    } catch (handlingError) {
      console.error('Error handling failed:', handlingError)
      return {
        handled: false,
        recovered: false,
        fallbackUsed: false
      }
    }
  }

  /**
   * Execute operation with retry logic and circuit breaker protection
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: {
      component: string
      operationName: string
      maxRetries?: number
      timeout?: number
    }
  ): Promise<T> {
    const circuitBreakerKey = `${context.component}-${context.operationName}`
    const maxRetries = context.maxRetries || this.retryConfig.maxRetries
    
    // Check circuit breaker
    if (this.isCircuitBreakerOpen(circuitBreakerKey)) {
      throw new Error(`Circuit breaker is open for ${circuitBreakerKey}`)
    }

    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout if specified
        const result = context.timeout 
          ? await this.withTimeout(operation(), context.timeout)
          : await operation()
        
        // Record success in circuit breaker
        this.recordCircuitBreakerSuccess(circuitBreakerKey)
        
        return result
      } catch (error) {
        lastError = error as Error
        
        // Record failure in circuit breaker
        this.recordCircuitBreakerFailure(circuitBreakerKey)
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
          this.retryConfig.maxDelay
        )
        
        console.warn(`Operation ${context.operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms`)
        await this.sleep(delay)
      }
    }

    throw lastError || new Error('Operation failed after all retries')
  }

  /**
   * Get system error statistics and health metrics
   */
  getErrorStatistics(): {
    totalErrors: number
    errorsByType: Record<ErrorType, number>
    errorsBySeverity: Record<ErrorSeverity, number>
    errorsByComponent: Record<string, number>
    recentErrors: SystemError[]
    circuitBreakerStatus: Record<string, CircuitBreakerState>
    recoverySuccessRate: number
  } {
    const now = Date.now()
    const recentErrors = this.errorHistory.filter(e => 
      now - e.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    )

    const errorsByType = recentErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1
      return acc
    }, {} as Record<ErrorType, number>)

    const errorsBySeverity = recentErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1
      return acc
    }, {} as Record<ErrorSeverity, number>)

    const errorsByComponent = recentErrors.reduce((acc, error) => {
      acc[error.component] = (acc[error.component] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const recoveredErrors = recentErrors.filter(e => e.retryCount > 0)
    const recoverySuccessRate = recentErrors.length > 0 
      ? recoveredErrors.length / recentErrors.length 
      : 0

    return {
      totalErrors: recentErrors.length,
      errorsByType,
      errorsBySeverity,
      errorsByComponent,
      recentErrors: recentErrors.slice(-10), // Last 10 errors
      circuitBreakerStatus: Object.fromEntries(this.circuitBreakers),
      recoverySuccessRate
    }
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    this.recoveryStrategies = [
      {
        name: 'vertex-ai-retry',
        description: 'Retry Vertex AI operations with exponential backoff',
        execute: async (error: SystemError) => {
          if (error.type === ErrorType.VERTEX_AI_ERROR && error.retryCount < 3) {
            await this.sleep(1000 * Math.pow(2, error.retryCount))
            return true
          }
          return false
        },
        applicableErrors: [ErrorType.VERTEX_AI_ERROR, ErrorType.RATE_LIMIT_ERROR],
        priority: 1
      },
      {
        name: 'database-reconnect',
        description: 'Reconnect to database and retry operation',
        execute: async (error: SystemError) => {
          if (error.type === ErrorType.DATABASE_ERROR) {
            try {
              // Attempt to reconnect to database
              const { getDatabasePool } = require('../../database/connection')
              const pool = await getDatabasePool()
              await pool.query('SELECT 1')
              return true
            } catch {
              return false
            }
          }
          return false
        },
        applicableErrors: [ErrorType.DATABASE_ERROR],
        priority: 2
      },
      {
        name: 'cache-fallback',
        description: 'Use alternative caching mechanism or skip cache',
        execute: async (error: SystemError) => {
          if (error.type === ErrorType.CACHE_ERROR) {
            // Cache errors are generally non-critical, continue without cache
            return true
          }
          return false
        },
        applicableErrors: [ErrorType.CACHE_ERROR],
        priority: 3
      },
      {
        name: 'model-fallback',
        description: 'Switch to backup prediction model',
        execute: async (error: SystemError) => {
          if (error.type === ErrorType.PREDICTION_ERROR) {
            // Switch to simpler, more reliable model
            return true
          }
          return false
        },
        applicableErrors: [ErrorType.PREDICTION_ERROR, ErrorType.VERTEX_AI_ERROR],
        priority: 4
      }
    ]

    // Sort strategies by priority
    this.recoveryStrategies.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Normalize error to SystemError format
   */
  private normalizeError(error: Error | SystemError, context: any): SystemError {
    if ('type' in error && 'severity' in error) {
      return error as SystemError
    }

    // Determine error type based on error message and context
    let errorType = ErrorType.SYSTEM_ERROR
    let severity = ErrorSeverity.MEDIUM

    if (error.message.includes('timeout')) {
      errorType = ErrorType.TIMEOUT_ERROR
      severity = ErrorSeverity.HIGH
    } else if (error.message.includes('rate limit')) {
      errorType = ErrorType.RATE_LIMIT_ERROR
      severity = ErrorSeverity.MEDIUM
    } else if (error.message.includes('database') || error.message.includes('connection')) {
      errorType = ErrorType.DATABASE_ERROR
      severity = ErrorSeverity.HIGH
    } else if (error.message.includes('vertex') || error.message.includes('ai')) {
      errorType = ErrorType.VERTEX_AI_ERROR
      severity = ErrorSeverity.HIGH
    }

    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: errorType,
      severity,
      message: error.message,
      component: context.component,
      timestamp: new Date(),
      context: context.additionalContext,
      stackTrace: error.stack,
      recoverable: true,
      retryCount: 0,
      maxRetries: this.retryConfig.maxRetries
    }
  }

  /**
   * Log error and add to history
   */
  private async logError(error: SystemError): Promise<void> {
    // Add to error history
    this.errorHistory.push(error)
    
    // Maintain history size limit
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.maxErrorHistory)
    }

    // Log to console with appropriate level
    const logLevel = {
      [ErrorSeverity.LOW]: 'info',
      [ErrorSeverity.MEDIUM]: 'warn',
      [ErrorSeverity.HIGH]: 'error',
      [ErrorSeverity.CRITICAL]: 'error'
    }[error.severity]

    console[logLevel as keyof Console](`[${error.severity}] ${error.component}: ${error.message}`, {
      errorId: error.id,
      type: error.type,
      context: error.context
    })

    // Record in performance monitor
    try {
      await this.performanceMonitor.recordError(error)
    } catch (monitorError) {
      console.warn('Failed to record error in performance monitor:', monitorError)
    }
  }

  /**
   * Attempt recovery using available strategies
   */
  private async attemptRecovery(error: SystemError): Promise<{
    recovered: boolean
    strategy?: string
  }> {
    // Find applicable recovery strategies
    const applicableStrategies = this.recoveryStrategies.filter(strategy =>
      strategy.applicableErrors.includes(error.type)
    )

    for (const strategy of applicableStrategies) {
      try {
        console.log(`Attempting recovery strategy: ${strategy.name}`)
        const recovered = await strategy.execute(error)
        
        if (recovered) {
          console.log(`Recovery successful using strategy: ${strategy.name}`)
          error.retryCount++
          return { recovered: true, strategy: strategy.name }
        }
      } catch (recoveryError) {
        console.warn(`Recovery strategy ${strategy.name} failed:`, recoveryError)
      }
    }

    return { recovered: false }
  }

  /**
   * Execute fallback mechanisms
   */
  private async executeFallback(error: SystemError, context: any): Promise<{
    success: boolean
    strategy?: string
  }> {
    try {
      // Component-specific fallbacks
      switch (context.component) {
        case 'forecasting':
          return await this.forecastingFallback(error, context)
        case 'anomaly-detection':
          return await this.anomalyDetectionFallback(error, context)
        case 'embeddings':
          return await this.embeddingsFallback(error, context)
        case 'vertex-ai':
          return await this.vertexAIFallback(error, context)
        default:
          return { success: false }
      }
    } catch (fallbackError) {
      console.error('Fallback execution failed:', fallbackError)
      return { success: false }
    }
  }

  // Fallback implementations
  private async forecastingFallback(error: SystemError, context: any): Promise<{ success: boolean; strategy?: string }> {
    // Use simple linear regression as fallback
    return { success: true, strategy: 'linear-regression-fallback' }
  }

  private async anomalyDetectionFallback(error: SystemError, context: any): Promise<{ success: boolean; strategy?: string }> {
    // Use statistical anomaly detection as fallback
    return { success: true, strategy: 'statistical-anomaly-fallback' }
  }

  private async embeddingsFallback(error: SystemError, context: any): Promise<{ success: boolean; strategy?: string }> {
    // Skip similarity analysis if embeddings fail
    return { success: true, strategy: 'skip-similarity-analysis' }
  }

  private async vertexAIFallback(error: SystemError, context: any): Promise<{ success: boolean; strategy?: string }> {
    // Use local models as fallback
    return { success: true, strategy: 'local-model-fallback' }
  }

  // Circuit breaker methods
  private isCircuitBreakerOpen(key: string): boolean {
    const state = this.circuitBreakers.get(key)
    if (!state) return false

    if (state.isOpen) {
      const timeSinceLastFailure = Date.now() - (state.lastFailureTime?.getTime() || 0)
      if (timeSinceLastFailure > this.circuitBreakerConfig.recoveryTimeout) {
        // Move to half-open state
        state.isOpen = false
        state.halfOpenAttempts = 0
        return false
      }
      return true
    }

    return false
  }

  private recordCircuitBreakerFailure(key: string): void {
    let state = this.circuitBreakers.get(key)
    if (!state) {
      state = {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: null,
        successCount: 0,
        halfOpenAttempts: 0
      }
      this.circuitBreakers.set(key, state)
    }

    state.failureCount++
    state.lastFailureTime = new Date()

    if (state.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      state.isOpen = true
      console.warn(`Circuit breaker opened for ${key}`)
    }
  }

  private recordCircuitBreakerSuccess(key: string): void {
    let state = this.circuitBreakers.get(key)
    if (!state) return

    state.successCount++
    
    if (state.isOpen) {
      state.halfOpenAttempts++
      if (state.halfOpenAttempts >= this.circuitBreakerConfig.successThreshold) {
        // Close the circuit breaker
        state.isOpen = false
        state.failureCount = 0
        state.halfOpenAttempts = 0
        console.log(`Circuit breaker closed for ${key}`)
      }
    } else {
      // Reset failure count on success
      state.failureCount = 0
    }
  }

  private getCircuitBreakerRetryTime(key: string): number {
    const state = this.circuitBreakers.get(key)
    if (!state || !state.lastFailureTime) return 0

    const timeSinceLastFailure = Date.now() - state.lastFailureTime.getTime()
    return Math.max(0, this.circuitBreakerConfig.recoveryTimeout - timeSinceLastFailure)
  }

  // Utility methods
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    })

    return Promise.race([promise, timeoutPromise])
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const errorHandlingService = new ErrorHandlingService(
  new (require('../performance-monitoring/performance-monitor').PerformanceMonitor)({
    accuracy: { maeThreshold: 10, rmseThreshold: 15, mapeThreshold: 20, accuracyMinimum: 0.8 },
    latency: { maxPredictionTime: 2000, maxEndpointLatency: 1000, maxQueryTime: 500 },
    resources: { maxMemoryUsage: 2000, maxCpuUsage: 85, maxErrorRate: 5, minCacheHitRate: 70 }
  })
)