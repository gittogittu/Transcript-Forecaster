/**
 * Production Monitoring System
 * Comprehensive monitoring for production environment
 */

interface MonitoringConfig {
  enableErrorTracking: boolean;
  enablePerformanceMonitoring: boolean;
  enableUserAnalytics: boolean;
  sampleRate: number;
  environment: string;
}

interface ErrorEvent {
  message: string;
  stack?: string;
  url: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  userAgent: string;
  additionalContext?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  url: string;
  sessionId: string;
  additionalData?: Record<string, any>;
}

interface UserEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId: string;
}

class ProductionMonitor {
  private config: MonitoringConfig;
  private sessionId: string;
  private userId?: string;
  private errorQueue: ErrorEvent[] = [];
  private performanceQueue: PerformanceMetric[] = [];
  private userEventQueue: UserEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initialize(): void {
    if (typeof window === 'undefined') return;

    // Set up error tracking
    if (this.config.enableErrorTracking) {
      this.setupErrorTracking();
    }

    // Set up performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      this.setupPerformanceMonitoring();
    }

    // Set up user analytics
    if (this.config.enableUserAnalytics) {
      this.setupUserAnalytics();
    }

    // Start periodic flushing
    this.startPeriodicFlush();

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  private setupErrorTracking(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        url: window.location.href,
        timestamp: new Date(),
        sessionId: this.sessionId,
        userId: this.userId,
        userAgent: navigator.userAgent,
        additionalContext: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        timestamp: new Date(),
        sessionId: this.sessionId,
        userId: this.userId,
        userAgent: navigator.userAgent,
        additionalContext: {
          type: 'unhandledrejection',
          reason: event.reason
        }
      });
    });

    // React error boundary integration
    this.setupReactErrorBoundary();
  }

  private setupReactErrorBoundary(): void {
    // This would be integrated with React Error Boundaries
    (window as any).__PRODUCTION_MONITOR__ = {
      trackError: (error: Error, errorInfo: any) => {
        this.trackError({
          message: error.message,
          stack: error.stack,
          url: window.location.href,
          timestamp: new Date(),
          sessionId: this.sessionId,
          userId: this.userId,
          userAgent: navigator.userAgent,
          additionalContext: {
            type: 'react-error-boundary',
            errorInfo
          }
        });
      }
    };
  }

  private setupPerformanceMonitoring(): void {
    // Core Web Vitals
    this.observeWebVitals();

    // Navigation timing
    this.trackNavigationTiming();

    // Resource timing
    this.trackResourceTiming();

    // Custom performance marks
    this.setupCustomPerformanceTracking();
  }

  private observeWebVitals(): void {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.trackPerformance({
        name: 'LCP',
        value: lastEntry.startTime,
        timestamp: new Date(),
        url: window.location.href,
        sessionId: this.sessionId,
        additionalData: {
          element: (lastEntry as any).element?.tagName,
          size: (lastEntry as any).size
        }
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.trackPerformance({
          name: 'FID',
          value: (entry as any).processingStart - entry.startTime,
          timestamp: new Date(),
          url: window.location.href,
          sessionId: this.sessionId,
          additionalData: {
            eventType: (entry as any).name
          }
        });
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });

      this.trackPerformance({
        name: 'CLS',
        value: clsValue,
        timestamp: new Date(),
        url: window.location.href,
        sessionId: this.sessionId
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }

  private trackNavigationTiming(): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        const metrics = {
          'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
          'TCP Connection': navigation.connectEnd - navigation.connectStart,
          'TLS Handshake': navigation.secureConnectionStart > 0 ? navigation.connectEnd - navigation.secureConnectionStart : 0,
          'Request': navigation.responseStart - navigation.requestStart,
          'Response': navigation.responseEnd - navigation.responseStart,
          'DOM Processing': navigation.domComplete - navigation.domLoading,
          'Load Complete': navigation.loadEventEnd - navigation.loadEventStart,
          'Total Load Time': navigation.loadEventEnd - navigation.navigationStart
        };

        Object.entries(metrics).forEach(([name, value]) => {
          this.trackPerformance({
            name: `Navigation_${name}`,
            value,
            timestamp: new Date(),
            url: window.location.href,
            sessionId: this.sessionId
          });
        });
      }, 0);
    });
  }

  private trackResourceTiming(): void {
    // Monitor resource loading performance
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.duration > 1000) { // Only track slow resources (>1s)
          this.trackPerformance({
            name: 'Slow_Resource',
            value: entry.duration,
            timestamp: new Date(),
            url: window.location.href,
            sessionId: this.sessionId,
            additionalData: {
              resourceUrl: entry.name,
              resourceType: (entry as any).initiatorType,
              transferSize: (entry as any).transferSize
            }
          });
        }
      });
    }).observe({ entryTypes: ['resource'] });
  }

  private setupCustomPerformanceTracking(): void {
    // Track React component render times
    (window as any).__PERFORMANCE_TRACKER__ = {
      markStart: (name: string) => {
        performance.mark(`${name}_start`);
      },
      markEnd: (name: string) => {
        performance.mark(`${name}_end`);
        performance.measure(name, `${name}_start`, `${name}_end`);
        
        const measure = performance.getEntriesByName(name, 'measure')[0];
        if (measure) {
          this.trackPerformance({
            name: `Custom_${name}`,
            value: measure.duration,
            timestamp: new Date(),
            url: window.location.href,
            sessionId: this.sessionId
          });
        }
      }
    };
  }

  private setupUserAnalytics(): void {
    // Track page views
    this.trackUserEvent('page_view', {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer
    });

    // Track user interactions
    this.setupInteractionTracking();

    // Track feature usage
    this.setupFeatureTracking();
  }

  private setupInteractionTracking(): void {
    // Click tracking
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      
      if (['button', 'a', 'input'].includes(tagName) || target.getAttribute('data-track')) {
        this.trackUserEvent('click', {
          element: tagName,
          text: target.textContent?.slice(0, 100),
          id: target.id,
          className: target.className,
          url: window.location.href
        });
      }
    });

    // Form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.trackUserEvent('form_submit', {
        formId: form.id,
        formAction: form.action,
        url: window.location.href
      });
    });
  }

  private setupFeatureTracking(): void {
    // Track feature usage through custom events
    (window as any).__ANALYTICS_TRACKER__ = {
      trackFeature: (featureName: string, properties: Record<string, any> = {}) => {
        this.trackUserEvent('feature_usage', {
          feature: featureName,
          ...properties,
          url: window.location.href
        });
      }
    };
  }

  public trackError(error: ErrorEvent): void {
    if (!this.config.enableErrorTracking) return;
    
    this.errorQueue.push(error);
    
    // Immediate flush for critical errors
    if (this.errorQueue.length >= 5) {
      this.flush();
    }
  }

  public trackPerformance(metric: PerformanceMetric): void {
    if (!this.config.enablePerformanceMonitoring) return;
    
    // Sample performance metrics
    if (Math.random() > this.config.sampleRate) return;
    
    this.performanceQueue.push(metric);
  }

  public trackUserEvent(event: string, properties: Record<string, any>): void {
    if (!this.config.enableUserAnalytics) return;
    
    this.userEventQueue.push({
      event,
      properties,
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId
    });
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000); // Flush every 30 seconds
  }

  private async flush(): Promise<void> {
    if (this.errorQueue.length === 0 && 
        this.performanceQueue.length === 0 && 
        this.userEventQueue.length === 0) {
      return;
    }

    const payload = {
      errors: [...this.errorQueue],
      performance: [...this.performanceQueue],
      userEvents: [...this.userEventQueue],
      metadata: {
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        environment: this.config.environment,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server'
      }
    };

    // Clear queues
    this.errorQueue = [];
    this.performanceQueue = [];
    this.userEventQueue = [];

    try {
      // Send to monitoring endpoint
      await fetch('/api/monitoring/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (error) {
      console.error('Failed to send monitoring data:', error);
      // Could implement retry logic here
    }
  }

  public destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush(); // Final flush
  }
}

// Global monitoring instance
let monitorInstance: ProductionMonitor | null = null;

export function initializeMonitoring(config: Partial<MonitoringConfig> = {}): ProductionMonitor {
  const defaultConfig: MonitoringConfig = {
    enableErrorTracking: true,
    enablePerformanceMonitoring: true,
    enableUserAnalytics: true,
    sampleRate: 0.1, // 10% sampling
    environment: process.env.NODE_ENV || 'development'
  };

  const finalConfig = { ...defaultConfig, ...config };
  
  if (monitorInstance) {
    monitorInstance.destroy();
  }
  
  monitorInstance = new ProductionMonitor(finalConfig);
  return monitorInstance;
}

export function getMonitoringInstance(): ProductionMonitor | null {
  return monitorInstance;
}

export { ProductionMonitor };
export type { MonitoringConfig, ErrorEvent, PerformanceMetric, UserEvent };