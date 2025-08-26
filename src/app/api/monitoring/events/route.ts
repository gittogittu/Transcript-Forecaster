/**
 * Monitoring Events API Endpoint
 * Receives and processes monitoring data from the client
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schemas
const ErrorEventSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  url: z.string(),
  timestamp: z.string(),
  userId: z.string().optional(),
  sessionId: z.string(),
  userAgent: z.string(),
  additionalContext: z.record(z.any()).optional()
});

const PerformanceMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  timestamp: z.string(),
  url: z.string(),
  sessionId: z.string(),
  additionalData: z.record(z.any()).optional()
});

const UserEventSchema = z.object({
  event: z.string(),
  properties: z.record(z.any()),
  timestamp: z.string(),
  userId: z.string().optional(),
  sessionId: z.string()
});

const MonitoringPayloadSchema = z.object({
  errors: z.array(ErrorEventSchema),
  performance: z.array(PerformanceMetricSchema),
  userEvents: z.array(UserEventSchema),
  metadata: z.object({
    sessionId: z.string(),
    userId: z.string().optional(),
    timestamp: z.string(),
    environment: z.string(),
    userAgent: z.string(),
    url: z.string()
  })
});

interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: string;
  metadata: Record<string, any>;
}

class MonitoringLogger {
  private static instance: MonitoringLogger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  static getInstance(): MonitoringLogger {
    if (!MonitoringLogger.instance) {
      MonitoringLogger.instance = new MonitoringLogger();
    }
    return MonitoringLogger.instance;
  }

  log(level: LogEntry['level'], message: string, metadata: Record<string, any> = {}): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata
    };

    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      console[level](`[MONITORING] ${message}`, metadata);
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(entry);
    }
  }

  private async sendToExternalLogger(entry: LogEntry): Promise<void> {
    try {
      // Example: Send to Sentry, DataDog, or other logging service
      if (process.env.SENTRY_DSN && entry.level === 'error') {
        // Sentry integration would go here
      }

      // Example: Send to custom logging endpoint
      if (process.env.LOGGING_ENDPOINT) {
        await fetch(process.env.LOGGING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LOGGING_API_KEY}`
          },
          body: JSON.stringify(entry)
        });
      }
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  getLogs(level?: LogEntry['level'], limit = 100): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }

    return filteredLogs.slice(-limit);
  }
}

class MonitoringProcessor {
  private logger: MonitoringLogger;

  constructor() {
    this.logger = MonitoringLogger.getInstance();
  }

  async processErrors(errors: z.infer<typeof ErrorEventSchema>[]): Promise<void> {
    for (const error of errors) {
      this.logger.log('error', `Client Error: ${error.message}`, {
        stack: error.stack,
        url: error.url,
        userId: error.userId,
        sessionId: error.sessionId,
        userAgent: error.userAgent,
        additionalContext: error.additionalContext,
        timestamp: error.timestamp
      });

      // Check for critical errors that need immediate attention
      if (this.isCriticalError(error)) {
        await this.handleCriticalError(error);
      }
    }
  }

  async processPerformanceMetrics(metrics: z.infer<typeof PerformanceMetricSchema>[]): Promise<void> {
    for (const metric of metrics) {
      this.logger.log('info', `Performance Metric: ${metric.name} = ${metric.value}ms`, {
        url: metric.url,
        sessionId: metric.sessionId,
        additionalData: metric.additionalData,
        timestamp: metric.timestamp
      });

      // Check for performance issues
      if (this.isPerformanceIssue(metric)) {
        await this.handlePerformanceIssue(metric);
      }
    }
  }

  async processUserEvents(events: z.infer<typeof UserEventSchema>[]): Promise<void> {
    for (const event of events) {
      this.logger.log('info', `User Event: ${event.event}`, {
        properties: event.properties,
        userId: event.userId,
        sessionId: event.sessionId,
        timestamp: event.timestamp
      });
    }

    // Aggregate user events for analytics
    await this.aggregateUserEvents(events);
  }

  private isCriticalError(error: z.infer<typeof ErrorEventSchema>): boolean {
    const criticalPatterns = [
      /authentication/i,
      /payment/i,
      /security/i,
      /data loss/i,
      /corruption/i
    ];

    return criticalPatterns.some(pattern => 
      pattern.test(error.message) || 
      (error.stack && pattern.test(error.stack))
    );
  }

  private async handleCriticalError(error: z.infer<typeof ErrorEventSchema>): Promise<void> {
    this.logger.log('error', `CRITICAL ERROR DETECTED: ${error.message}`, error);

    // Send immediate alert (email, Slack, etc.)
    if (process.env.ALERT_WEBHOOK_URL) {
      try {
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 CRITICAL ERROR: ${error.message}`,
            attachments: [{
              color: 'danger',
              fields: [
                { title: 'URL', value: error.url, short: true },
                { title: 'User ID', value: error.userId || 'Anonymous', short: true },
                { title: 'Session ID', value: error.sessionId, short: true },
                { title: 'Timestamp', value: error.timestamp, short: true }
              ]
            }]
          })
        });
      } catch (alertError) {
        this.logger.log('error', 'Failed to send critical error alert', { alertError });
      }
    }
  }

  private isPerformanceIssue(metric: z.infer<typeof PerformanceMetricSchema>): boolean {
    const thresholds: Record<string, number> = {
      'LCP': 2500, // Largest Contentful Paint > 2.5s
      'FID': 100,  // First Input Delay > 100ms
      'CLS': 0.1,  // Cumulative Layout Shift > 0.1
      'Navigation_Total Load Time': 5000, // Total load time > 5s
      'Slow_Resource': 3000 // Resource load time > 3s
    };

    const threshold = thresholds[metric.name];
    return threshold !== undefined && metric.value > threshold;
  }

  private async handlePerformanceIssue(metric: z.infer<typeof PerformanceMetricSchema>): Promise<void> {
    this.logger.log('warn', `Performance Issue: ${metric.name} = ${metric.value}`, metric);

    // Could trigger performance alerts or automatic optimizations
  }

  private async aggregateUserEvents(events: z.infer<typeof UserEventSchema>[]): Promise<void> {
    // Simple aggregation - in production, you might use a proper analytics service
    const eventCounts: Record<string, number> = {};
    
    events.forEach(event => {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    });

    this.logger.log('info', 'User Event Aggregation', { eventCounts });
  }
}

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 100; // requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (clientData.count >= RATE_LIMIT_MAX) {
    return false;
  }

  clientData.count++;
  return true;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = MonitoringPayloadSchema.parse(body);

    // Process monitoring data
    const processor = new MonitoringProcessor();
    
    await Promise.all([
      processor.processErrors(validatedData.errors),
      processor.processPerformanceMetrics(validatedData.performance),
      processor.processUserEvents(validatedData.userEvents)
    ]);

    return NextResponse.json({ 
      success: true, 
      processed: {
        errors: validatedData.errors.length,
        performance: validatedData.performance.length,
        userEvents: validatedData.userEvents.length
      }
    });

  } catch (error) {
    console.error('Monitoring endpoint error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid monitoring data format', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(): Promise<NextResponse> {
  const logger = MonitoringLogger.getInstance();
  const recentLogs = logger.getLogs(undefined, 10);
  
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    recentLogs: recentLogs.length,
    environment: process.env.NODE_ENV
  });
}