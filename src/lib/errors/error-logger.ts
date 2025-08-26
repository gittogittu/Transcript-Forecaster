import { AppError, ErrorInfo, ErrorLogEntry } from './error-types'

/**
 * Error logging service for the Transcript Analytics Platform
 */
class ErrorLogger {
  private logs: ErrorLogEntry[] = []

  /**
   * Log an error with context information
   */
  logError(
    error: AppError,
    errorInfo?: ErrorInfo,
    additionalContext?: Record<string, any>
  ): void {
    const logEntry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      error,
      errorInfo,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      additionalContext
    }

    // Store locally
    this.logs.push(logEntry)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error: ${error.name}`)
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
      if (errorInfo) {
        console.error('Component Stack:', errorInfo.componentStack)
      }
      if (additionalContext) {
        console.error('Additional Context:', additionalContext)
      }
      console.groupEnd()
    }

    // In production, you would send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(logEntry)
    }
  }

  /**
   * Get recent error logs
   */
  getRecentLogs(limit: number = 10): ErrorLogEntry[] {
    return this.logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Clear error logs
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * Generate unique ID for error log entry
   */
  private generateId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Send error to external logging service (placeholder)
   */
  private async sendToExternalService(logEntry: ErrorLogEntry): Promise<void> {
    try {
      // In a real application, you would send to services like:
      // - Sentry
      // - LogRocket
      // - Datadog
      // - Custom logging endpoint
      
      // For now, we'll just store in localStorage as a fallback
      if (typeof window !== 'undefined') {
        const existingLogs = JSON.parse(localStorage.getItem('error_logs') || '[]')
        existingLogs.push({
          ...logEntry,
          error: {
            name: logEntry.error.name,
            message: logEntry.error.message,
            stack: logEntry.error.stack
          }
        })
        
        // Keep only last 50 logs in localStorage
        const recentLogs = existingLogs.slice(-50)
        localStorage.setItem('error_logs', JSON.stringify(recentLogs))
      }
    } catch (loggingError) {
      console.error('Failed to log error to external service:', loggingError)
    }
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger()

/**
 * Utility function to log errors with automatic context detection
 */
export function logError(
  error: AppError,
  context?: Record<string, any>
): void {
  errorLogger.logError(error, undefined, context)
}

/**
 * Utility function to create and log API errors
 */
export function logAPIError(
  message: string,
  status: number,
  endpoint: string,
  context?: Record<string, any>
): void {
  const { APIError } = require('./error-types')
  const error = new APIError(message, status, endpoint)
  errorLogger.logError(error, undefined, context)
}

/**
 * Utility function to create and log network errors
 */
export function logNetworkError(
  message: string,
  url: string,
  status?: number,
  context?: Record<string, any>
): void {
  const { NetworkError } = require('./error-types')
  const error = new NetworkError(message, url, status)
  errorLogger.logError(error, undefined, context)
}