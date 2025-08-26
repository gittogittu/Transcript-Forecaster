'use client'

// Performance monitoring utilities
export interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  ttfb?: number // Time to First Byte
  
  // Custom metrics
  componentRenderTime?: number
  apiResponseTime?: number
  predictionCalculationTime?: number
  chartRenderTime?: number
  
  // Resource metrics
  jsHeapSizeUsed?: number
  jsHeapSizeTotal?: number
  jsHeapSizeLimit?: number
  
  // Navigation metrics
  navigationStart?: number
  domContentLoaded?: number
  loadComplete?: number
  
  // User interaction metrics
  interactionToNextPaint?: number
  
  timestamp: number
  url: string
  userAgent: string
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics[] = []
  private observers: PerformanceObserver[] = []
  private isMonitoring = false

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Start performance monitoring
  startMonitoring(): void {
    if (typeof window === 'undefined' || this.isMonitoring) {
      return
    }

    this.isMonitoring = true
    this.setupWebVitalsObservers()
    this.setupResourceObserver()
    this.setupNavigationObserver()
    this.setupMemoryMonitoring()
    
    console.log('Performance monitoring started')
  }

  // Stop performance monitoring
  stopMonitoring(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.isMonitoring = false
    
    console.log('Performance monitoring stopped')
  }

  // Setup Core Web Vitals observers
  private setupWebVitalsObservers(): void {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          
          this.recordMetric({
            lcp: lastEntry.startTime,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
          })
        })
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.push(lcpObserver)
      } catch (error) {
        console.warn('LCP observer not supported:', error)
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            this.recordMetric({
              fid: entry.processingStart - entry.startTime,
              timestamp: Date.now(),
              url: window.location.href,
              userAgent: navigator.userAgent
            })
          })
        })
        
        fidObserver.observe({ entryTypes: ['first-input'] })
        this.observers.push(fidObserver)
      } catch (error) {
        console.warn('FID observer not supported:', error)
      }

      // Cumulative Layout Shift (CLS)
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0
          const entries = list.getEntries()
          
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          })
          
          if (clsValue > 0) {
            this.recordMetric({
              cls: clsValue,
              timestamp: Date.now(),
              url: window.location.href,
              userAgent: navigator.userAgent
            })
          }
        })
        
        clsObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.push(clsObserver)
      } catch (error) {
        console.warn('CLS observer not supported:', error)
      }
    }

    // First Contentful Paint (FCP) - from navigation timing
    this.measureFCP()
  }

  // Setup resource performance observer
  private setupResourceObserver(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        entries.forEach((entry: any) => {
          // Monitor API calls
          if (entry.name.includes('/api/')) {
            this.recordMetric({
              apiResponseTime: entry.duration,
              timestamp: Date.now(),
              url: entry.name,
              userAgent: navigator.userAgent
            })
          }
        })
      })
      
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.push(resourceObserver)
    } catch (error) {
      console.warn('Resource observer not supported:', error)
    }
  }

  // Setup navigation observer
  private setupNavigationObserver(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        entries.forEach((entry: any) => {
          this.recordMetric({
            navigationStart: entry.navigationStart,
            domContentLoaded: entry.domContentLoadedEventEnd - entry.navigationStart,
            loadComplete: entry.loadEventEnd - entry.navigationStart,
            ttfb: entry.responseStart - entry.navigationStart,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
          })
        })
      })
      
      navigationObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navigationObserver)
    } catch (error) {
      console.warn('Navigation observer not supported:', error)
    }
  }

  // Setup memory monitoring
  private setupMemoryMonitoring(): void {
    if (!('memory' in performance)) return

    const measureMemory = () => {
      const memory = (performance as any).memory
      
      this.recordMetric({
        jsHeapSizeUsed: memory.usedJSHeapSize,
        jsHeapSizeTotal: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    }

    // Measure memory every 30 seconds
    const memoryInterval = setInterval(measureMemory, 30000)
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(memoryInterval)
    })
  }

  // Measure First Contentful Paint
  private measureFCP(): void {
    if (!('performance' in window) || !performance.getEntriesByType) return

    const paintEntries = performance.getEntriesByType('paint')
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    
    if (fcpEntry) {
      this.recordMetric({
        fcp: fcpEntry.startTime,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    }
  }

  // Record custom performance metric
  recordMetric(metric: Partial<PerformanceMetrics>): void {
    const fullMetric: PerformanceMetrics = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...metric
    }

    this.metrics.push(fullMetric)
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }

    // Send to analytics if configured
    this.sendToAnalytics(fullMetric)
  }

  // Measure component render time
  measureComponentRender<T>(
    componentName: string,
    renderFn: () => T
  ): T {
    const startTime = performance.now()
    const result = renderFn()
    const endTime = performance.now()
    
    this.recordMetric({
      componentRenderTime: endTime - startTime,
      timestamp: Date.now(),
      url: `${window.location.href}#${componentName}`,
      userAgent: navigator.userAgent
    })
    
    return result
  }

  // Measure async operation time
  async measureAsyncOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    
    try {
      const result = await operation()
      const endTime = performance.now()
      
      this.recordMetric({
        [operationName]: endTime - startTime,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
      
      return result
    } catch (error) {
      const endTime = performance.now()
      
      this.recordMetric({
        [`${operationName}_error`]: endTime - startTime,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
      
      throw error
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  // Get aggregated metrics
  getAggregatedMetrics(): {
    averages: Partial<PerformanceMetrics>
    medians: Partial<PerformanceMetrics>
    p95: Partial<PerformanceMetrics>
    count: number
  } {
    if (this.metrics.length === 0) {
      return { averages: {}, medians: {}, p95: {}, count: 0 }
    }

    const numericKeys = [
      'fcp', 'lcp', 'fid', 'cls', 'ttfb',
      'componentRenderTime', 'apiResponseTime', 'predictionCalculationTime',
      'jsHeapSizeUsed', 'domContentLoaded', 'loadComplete'
    ]

    const averages: any = {}
    const medians: any = {}
    const p95: any = {}

    numericKeys.forEach(key => {
      const values = this.metrics
        .map(m => (m as any)[key])
        .filter(v => typeof v === 'number')
        .sort((a, b) => a - b)

      if (values.length > 0) {
        averages[key] = values.reduce((sum, val) => sum + val, 0) / values.length
        medians[key] = values[Math.floor(values.length / 2)]
        p95[key] = values[Math.floor(values.length * 0.95)]
      }
    })

    return {
      averages,
      medians,
      p95,
      count: this.metrics.length
    }
  }

  // Send metrics to analytics service
  private sendToAnalytics(metric: PerformanceMetrics): void {
    // In production, this would send to your analytics service
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance metric:', metric)
    }

    // Example: Send to Google Analytics, DataDog, or custom endpoint
    // gtag('event', 'performance_metric', {
    //   custom_parameter: metric
    // })
  }

  // Export metrics for analysis
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      aggregated: this.getAggregatedMetrics(),
      exportedAt: new Date().toISOString()
    }, null, 2)
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics = []
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance()

  return {
    startMonitoring: () => monitor.startMonitoring(),
    stopMonitoring: () => monitor.stopMonitoring(),
    recordMetric: (metric: Partial<PerformanceMetrics>) => monitor.recordMetric(metric),
    measureComponentRender: <T>(name: string, fn: () => T) => monitor.measureComponentRender(name, fn),
    measureAsyncOperation: <T>(name: string, fn: () => Promise<T>) => monitor.measureAsyncOperation(name, fn),
    getMetrics: () => monitor.getMetrics(),
    getAggregatedMetrics: () => monitor.getAggregatedMetrics(),
    exportMetrics: () => monitor.exportMetrics(),
    clearMetrics: () => monitor.clearMetrics()
  }
}

// Initialize performance monitoring
export function initializePerformanceMonitoring(): void {
  if (typeof window !== 'undefined') {
    const monitor = PerformanceMonitor.getInstance()
    monitor.startMonitoring()
  }
}