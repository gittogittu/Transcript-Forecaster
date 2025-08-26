/**
 * Production Security Configuration
 * Security headers, CSP, and other security measures for production
 */

import { NextRequest, NextResponse } from 'next/server';

interface SecurityConfig {
  enableCSP: boolean;
  enableHSTS: boolean;
  enableXSSProtection: boolean;
  enableFrameOptions: boolean;
  enableContentTypeOptions: boolean;
  enableReferrerPolicy: boolean;
  corsOrigins: string[];
  rateLimiting: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
}

const defaultSecurityConfig: SecurityConfig = {
  enableCSP: true,
  enableHSTS: true,
  enableXSSProtection: true,
  enableFrameOptions: true,
  enableContentTypeOptions: true,
  enableReferrerPolicy: true,
  corsOrigins: process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : ['http://localhost:3000'],
  rateLimiting: {
    enabled: true,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000') // 15 minutes
  }
};

class SecurityHeaders {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...defaultSecurityConfig, ...config };
  }

  generateCSP(): string {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "media-src 'self' data: https:",
      "connect-src 'self' https://api.github.com https://vercel.live wss://ws-us3.pusher.com https://sockjs-us3.pusher.com",
      "frame-src 'self' https://vercel.live",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ];

    // Add Google Sheets API domains if configured
    if (process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
      csp[5] += " https://sheets.googleapis.com https://www.googleapis.com";
    }

    // Add authentication provider domains
    if (process.env.AUTH0_ISSUER) {
      const auth0Domain = new URL(process.env.AUTH0_ISSUER).hostname;
      csp[5] += ` https://${auth0Domain}`;
      csp[7] += ` https://${auth0Domain}`;
    }

    // Add monitoring service domains
    if (process.env.SENTRY_DSN) {
      const sentryDomain = new URL(process.env.SENTRY_DSN).hostname;
      csp[5] += ` https://${sentryDomain}`;
    }

    return csp.join('; ');
  }

  applySecurityHeaders(response: NextResponse): NextResponse {
    if (this.config.enableCSP) {
      response.headers.set('Content-Security-Policy', this.generateCSP());
    }

    if (this.config.enableHSTS) {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload'
      );
    }

    if (this.config.enableXSSProtection) {
      response.headers.set('X-XSS-Protection', '1; mode=block');
    }

    if (this.config.enableFrameOptions) {
      response.headers.set('X-Frame-Options', 'DENY');
    }

    if (this.config.enableContentTypeOptions) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
    }

    if (this.config.enableReferrerPolicy) {
      response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
    }

    // Additional security headers
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('Permissions-Policy', 
      'camera=(), microphone=(), geolocation=(), interest-cohort=()');

    return response;
  }

  validateCORS(request: NextRequest): boolean {
    const origin = request.headers.get('origin');
    
    if (!origin) {
      return true; // Allow same-origin requests
    }

    return this.config.corsOrigins.includes(origin) || 
           this.config.corsOrigins.includes('*');
  }

  applyCORSHeaders(response: NextResponse, request: NextRequest): NextResponse {
    const origin = request.headers.get('origin');
    
    if (origin && this.validateCORS(request)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With'
      );
      response.headers.set('Access-Control-Max-Age', '86400');
    }

    return response;
  }
}

class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private config: SecurityConfig['rateLimiting'];

  constructor(config: SecurityConfig['rateLimiting']) {
    this.config = config;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private getClientId(request: NextRequest): string {
    return request.headers.get('x-forwarded-for') ||
           request.headers.get('x-real-ip') ||
           request.ip ||
           'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  checkRateLimit(request: NextRequest): { allowed: boolean; remaining: number; resetTime: number } {
    if (!this.config.enabled) {
      return { allowed: true, remaining: this.config.maxRequests, resetTime: 0 };
    }

    const clientId = this.getClientId(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let clientData = this.requests.get(clientId);

    if (!clientData || clientData.resetTime < now) {
      clientData = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
      this.requests.set(clientId, clientData);
    }

    clientData.count++;

    const allowed = clientData.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - clientData.count);

    return {
      allowed,
      remaining,
      resetTime: clientData.resetTime
    };
  }

  applyRateLimitHeaders(response: NextResponse, rateLimit: ReturnType<RateLimiter['checkRateLimit']>): NextResponse {
    response.headers.set('X-RateLimit-Limit', this.config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000).toString());

    return response;
  }
}

class InputSanitizer {
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

class SecurityLogger {
  static logSecurityEvent(event: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
      environment: process.env.NODE_ENV
    };

    console.warn(`[SECURITY] ${event}:`, logEntry);

    // Send to external security monitoring service
    if (process.env.SECURITY_WEBHOOK_URL && severity === 'critical') {
      fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      }).catch(error => {
        console.error('Failed to send security alert:', error);
      });
    }
  }
}

// Global instances
let securityHeaders: SecurityHeaders;
let rateLimiter: RateLimiter;

export function initializeSecurity(config: Partial<SecurityConfig> = {}): void {
  const finalConfig = { ...defaultSecurityConfig, ...config };
  securityHeaders = new SecurityHeaders(finalConfig);
  rateLimiter = new RateLimiter(finalConfig.rateLimiting);
}

export function applySecurityMiddleware(request: NextRequest): NextResponse | null {
  // Initialize if not already done
  if (!securityHeaders) {
    initializeSecurity();
  }

  // Check rate limiting
  const rateLimit = rateLimiter.checkRateLimit(request);
  
  if (!rateLimit.allowed) {
    SecurityLogger.logSecurityEvent('Rate limit exceeded', {
      clientId: request.headers.get('x-forwarded-for') || 'unknown',
      path: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent')
    }, 'medium');

    const response = NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );

    rateLimiter.applyRateLimitHeaders(response, rateLimit);
    return securityHeaders.applySecurityHeaders(response);
  }

  // Validate CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!securityHeaders.validateCORS(request)) {
      SecurityLogger.logSecurityEvent('CORS violation', {
        origin: request.headers.get('origin'),
        path: request.nextUrl.pathname
      }, 'medium');

      return new NextResponse('CORS policy violation', { status: 403 });
    }
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    securityHeaders.applyCORSHeaders(response, request);
    return securityHeaders.applySecurityHeaders(response);
  }

  return null; // Continue to next middleware
}

export function applySecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  if (!securityHeaders) {
    initializeSecurity();
  }

  const rateLimit = rateLimiter.checkRateLimit(request);
  rateLimiter.applyRateLimitHeaders(response, rateLimit);
  
  securityHeaders.applyCORSHeaders(response, request);
  return securityHeaders.applySecurityHeaders(response);
}

export { SecurityHeaders, RateLimiter, InputSanitizer, SecurityLogger };
export type { SecurityConfig };