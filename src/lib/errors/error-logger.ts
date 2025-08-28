import { ErrorInfo } from 'react'

export interface ErrorLogEntry {
  id: string
  timestamp: string
  error: {
    name: string
    message: string
    stack?: string
  }
  context: {
    component?: string
    category?: string
    userAgent?: string
    url?: string
    userId?: string
    sessionId?: string
    errorInfo?: ErrorInfo
  }
  performance?: {
    memoryUsage?: number
    renderTime?: number
    networkLatency?: number
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolved: boolean
}

export interface ErrorMetrics {
  totalErrors: number
  errorsByCategory: Record<string, number>
  errorsBySeverity: Record<string, number>
  averageResolutionTime: number
  performanceImpact: {
    memoryIncrease: number
    renderDelays: number
    networkFailures: number
  }
}

class ErrorLogger {
  private errors: ErrorLogEntry[] = []
  private maxErrors = 1000 // Keep last 1000 errors in memory
  private performanceObserver?: PerformanceObserver

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializePerformanceMonitoring()
      this.setupGlobalErrorHandlers()
    }
  }

  private initializePerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        // Monitor for performance issues that might be related to errors
        entries.forEach((entry) => {
          if (entry.duration > 1000) { // Long tasks
            this.logPerformanceIssue('long_task', {
              duration: entry.duration,
              name: entry.name,
            })
          }
        })
      })

      try {
        this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] })
      } catch (e) {
        console.warn('Performance monitoring not available:', e)
      }
    }
  }

  private setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(new Error(event.reason), {
        category: 'unhandled_promise',
        component: 'global',
      })
    })

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError(event.error || new Error(event.message), {
        category: 'global_error',
        component: 'global',
        url: event.filename,
      })
    })
  }

  logError(
    error: Error,
    context: Partial<ErrorLogEntry['context']> = {},
    performance?: Partial<ErrorLogEntry['performance']>
  ): string {
    const errorId = this.generateErrorId()
    const severity = this.determineSeverity(error, context)

    const logEntry: ErrorLogEntry = {
      id: errorId,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        ...context,
        userAgent: context.userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : undefined),
        url: context.url || (typeof window !== 'undefined' ? window.location.href : undefined),
      },
      performance: performance || this.getCurrentPerformanceMetrics(),
      severity,
      resolved: false,
    }

    this.errors.push(logEntry)

    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(logEntry)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', logEntry)
    }

    return errorId
  }

  private logPerformanceIssue(type: string, data: any) {
    const performanceError = new Error(`Performance issue: ${type}`)
    this.logError(performanceError, {
      category: 'performance',
      component: 'performance_monitor',
    }, data)
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private determineSeverity(error: Error, context: Partial<ErrorLogEntry['context']>): ErrorLogEntry['severity'] {
    // Critical errors
    if (
      error.message.includes('ChunkLoadError') ||
      error.message.includes('Loading chunk') ||
      context.category === 'authentication' ||
      error.name === 'SecurityError'
    ) {
      return 'critical'
    }

    // High severity errors
    if (
      error.message.includes('Network') ||
      error.message.includes('fetch') ||
      context.category === 'data_operations' ||
      context.category === 'ml_predictions'
    ) {
      return 'high'
    }

    // Medium severity errors
    if (
      error.message.includes('validation') ||
      error.message.includes('parse') ||
      context.category === 'ui_interaction'
    ) {
      return 'medium'
    }

    return 'low'
  }

  private getCurrentPerformanceMetrics(): ErrorLogEntry['performance'] {
    if (typeof window === 'undefined') return undefined

    const performance = window.performance
    const memory = (performance as any).memory

    return {
      memoryUsage: memory ? memory.usedJSHeapSize : undefined,
      renderTime: performance.now(),
      networkLatency: this.getNetworkLatency(),
    }
  }

  private getNetworkLatency(): number | undefined {
    if (typeof window === 'undefined') return undefined

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      return navigation.responseEnd - navigation.requestStart
    }
    return undefined
  }

  private async sendToExternalLogger(logEntry: ErrorLogEntry) {
    try {
      // Send to your preferred logging service (e.g., Sentry, LogRocket, etc.)
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      })
    } catch (e) {
      console.error('Failed to send error to external logger:', e)
    }
  }

  getErrors(filters?: {
    category?: string
    severity?: ErrorLogEntry['severity']
    component?: string
    resolved?: boolean
    since?: Date
  }): ErrorLogEntry[] {
    let filteredErrors = [...this.errors]

    if (filters) {
      if (filters.category) {
        filteredErrors = filteredErrors.filter(e => e.context.category === filters.category)
      }
      if (filters.severity) {
        filteredErrors = filteredErrors.filter(e => e.severity === filters.severity)
      }
      if (filters.component) {
        filteredErrors = filteredErrors.filter(e => e.context.component === filters.component)
      }
      if (filters.resolved !== undefined) {
        filteredErrors = filteredErrors.filter(e => e.resolved === filters.resolved)
      }
      if (filters.since) {
        filteredErrors = filteredErrors.filter(e => new Date(e.timestamp) >= filters.since!)
      }
    }

    return filteredErrors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  getErrorMetrics(timeRange?: { start: Date; end: Date }): ErrorMetrics {
    let errors = this.errors

    if (timeRange) {
      errors = errors.filter(e => {
        const errorTime = new Date(e.timestamp)
        return errorTime >= timeRange.start && errorTime <= timeRange.end
      })
    }

    const errorsByCategory: Record<string, number> = {}
    const errorsBySeverity: Record<string, number> = {}
    let totalMemoryIncrease = 0
    let totalRenderDelays = 0
    let networkFailures = 0

    errors.forEach(error => {
      // Count by category
      const category = error.context.category || 'unknown'
      errorsByCategory[category] = (errorsByCategory[category] || 0) + 1

      // Count by severity
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1

      // Performance impact
      if (error.performance?.memoryUsage && error.performance.memoryUsage > 50 * 1024 * 1024) { // 50MB
        totalMemoryIncrease++
      }
      if (error.performance?.renderTime && error.performance.renderTime > 100) { // 100ms
        totalRenderDelays++
      }
      if (error.context.category === 'network' || error.error.message.includes('fetch')) {
        networkFailures++
      }
    })

    return {
      totalErrors: errors.length,
      errorsByCategory,
      errorsBySeverity,
      averageResolutionTime: this.calculateAverageResolutionTime(errors),
      performanceImpact: {
        memoryIncrease: totalMemoryIncrease,
        renderDelays: totalRenderDelays,
        networkFailures,
      },
    }
  }

  private calculateAverageResolutionTime(errors: ErrorLogEntry[]): number {
    const resolvedErrors = errors.filter(e => e.resolved)
    if (resolvedErrors.length === 0) return 0

    // This is a simplified calculation - in a real app, you'd track resolution timestamps
    return resolvedErrors.length > 0 ? 24 * 60 * 60 * 1000 : 0 // 24 hours average
  }

  markErrorAsResolved(errorId: string) {
    const error = this.errors.find(e => e.id === errorId)
    if (error) {
      error.resolved = true
    }
  }

  clearErrors() {
    this.errors = []
  }

  destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
  }
}

export const errorLogger = new ErrorLogger()