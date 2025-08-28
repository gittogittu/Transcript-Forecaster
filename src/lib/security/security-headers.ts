import { NextResponse } from 'next/server'

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string
  strictTransportSecurity?: string
  xFrameOptions?: string
  xContentTypeOptions?: string
  referrerPolicy?: string
  permissionsPolicy?: string
}

export class SecurityHeaders {
  private static defaultCSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.github.com https://accounts.google.com https://*.auth0.com wss:",
    "frame-src 'self' https://accounts.google.com https://*.auth0.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')

  private static defaultConfig: Required<SecurityHeadersConfig> = {
    contentSecurityPolicy: SecurityHeaders.defaultCSP,
    strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()'
    ].join(', ')
  }

  static applySecurityHeaders(
    response: NextResponse, 
    config: SecurityHeadersConfig = {}
  ): NextResponse {
    const finalConfig = { ...SecurityHeaders.defaultConfig, ...config }

    // Content Security Policy
    response.headers.set('Content-Security-Policy', finalConfig.contentSecurityPolicy)
    
    // HTTPS enforcement
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', finalConfig.strictTransportSecurity)
    }
    
    // Clickjacking protection
    response.headers.set('X-Frame-Options', finalConfig.xFrameOptions)
    
    // MIME type sniffing protection
    response.headers.set('X-Content-Type-Options', finalConfig.xContentTypeOptions)
    
    // Referrer policy
    response.headers.set('Referrer-Policy', finalConfig.referrerPolicy)
    
    // Permissions policy
    response.headers.set('Permissions-Policy', finalConfig.permissionsPolicy)
    
    // XSS protection (legacy but still useful)
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    // Remove server information
    response.headers.delete('Server')
    response.headers.delete('X-Powered-By')
    
    return response
  }

  static createSecureResponse(
    body?: BodyInit | null,
    init?: ResponseInit,
    config?: SecurityHeadersConfig
  ): NextResponse {
    const response = new NextResponse(body, init)
    return SecurityHeaders.applySecurityHeaders(response, config)
  }
}

// XSS Protection utilities
export class XSSProtection {
  private static dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
    /data:text\/html/gi
  ]

  static detectXSS(input: string): boolean {
    return XSSProtection.dangerousPatterns.some(pattern => pattern.test(input))
  }

  static sanitizeForHTML(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  static sanitizeForAttribute(input: string): string {
    return input
      .replace(/[^\w\s-_.]/g, '') // Only allow safe characters
      .trim()
  }

  static sanitizeForURL(input: string): string {
    try {
      const url = new URL(input)
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol')
      }
      return url.toString()
    } catch {
      return ''
    }
  }

  static validateCSS(input: string): boolean {
    // Basic CSS validation - reject dangerous patterns
    const dangerousCSS = [
      /expression\s*\(/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /@import/gi,
      /behavior\s*:/gi,
      /-moz-binding/gi
    ]
    
    return !dangerousCSS.some(pattern => pattern.test(input))
  }
}

export { SecurityHeaders as default }