import { NextRequest, NextResponse } from 'next/server'
import { csrfProtection } from '@/lib/security/csrf-protection'
import { apiRateLimit, authRateLimit, uploadRateLimit, predictionRateLimit, createRateLimitMiddleware } from '@/lib/security/rate-limiting'
import { inputSanitizer } from '@/lib/security/input-sanitization'
import { SecurityHeaders, XSSProtection } from '@/lib/security/security-headers'
import { withSecurityContext } from '@/lib/database/security-context'

export interface SecurityMiddlewareConfig {
  enableCSRF?: boolean
  enableRateLimit?: boolean
  enableXSSProtection?: boolean
  enableInputSanitization?: boolean
  enableSecurityHeaders?: boolean
  rateLimitType?: 'api' | 'auth' | 'upload' | 'prediction'
}

export class SecurityMiddleware {
  private config: Required<SecurityMiddlewareConfig>

  constructor(config: SecurityMiddlewareConfig = {}) {
    this.config = {
      enableCSRF: true,
      enableRateLimit: true,
      enableXSSProtection: true,
      enableInputSanitization: true,
      enableSecurityHeaders: true,
      rateLimitType: 'api',
      ...config
    }
  }

  async process(request: NextRequest): Promise<NextResponse | null> {
    try {
      // 1. Apply security headers
      if (this.config.enableSecurityHeaders) {
        const response = this.applySecurityHeaders(request)
        if (response) return response
      }

      // 2. Rate limiting
      if (this.config.enableRateLimit) {
        const rateLimitResponse = this.applyRateLimit(request)
        if (rateLimitResponse) return rateLimitResponse
      }

      // 3. CSRF protection
      if (this.config.enableCSRF) {
        const csrfResponse = this.applyCSRFProtection(request)
        if (csrfResponse) return csrfResponse
      }

      // 4. XSS protection
      if (this.config.enableXSSProtection) {
        const xssResponse = this.applyXSSProtection(request)
        if (xssResponse) return xssResponse
      }

      // 5. Input sanitization (for POST/PUT requests)
      if (this.config.enableInputSanitization && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const sanitizationResponse = await this.applySanitization(request)
        if (sanitizationResponse) return sanitizationResponse
      }

      return null // Continue to next middleware
    } catch (error) {
      console.error('Security middleware error:', error)
      return new NextResponse(
        JSON.stringify({ error: 'Security validation failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  private applySecurityHeaders(request: NextRequest): NextResponse | null {
    // Security headers are applied in the response, not here
    // This is handled in the response phase
    return null
  }

  private applyRateLimit(request: NextRequest): NextResponse | null {
    let limiter = apiRateLimit

    // Choose appropriate rate limiter based on endpoint
    const pathname = request.nextUrl.pathname

    if (pathname.includes('/auth/')) {
      limiter = authRateLimit
    } else if (pathname.includes('/upload/')) {
      limiter = uploadRateLimit
    } else if (pathname.includes('/predictions/')) {
      limiter = predictionRateLimit
    }

    const middleware = createRateLimitMiddleware(limiter)
    return middleware(request)
  }

  private applyCSRFProtection(request: NextRequest): NextResponse | null {
    if (!csrfProtection.validateCSRF(request)) {
      return new NextResponse(
        JSON.stringify({
          error: 'CSRF token validation failed',
          message: 'Invalid or missing CSRF token'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    return null
  }

  private applyXSSProtection(request: NextRequest): NextResponse | null {
    // Check URL parameters for XSS
    const url = request.nextUrl
    for (const [key, value] of url.searchParams.entries()) {
      if (XSSProtection.detectXSS(value)) {
        return new NextResponse(
          JSON.stringify({
            error: 'Potential XSS detected',
            message: `Suspicious content detected in parameter: ${key}`
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Check headers for XSS
    const dangerousHeaders = ['referer', 'user-agent', 'x-forwarded-for']
    for (const header of dangerousHeaders) {
      const value = request.headers.get(header)
      if (value && XSSProtection.detectXSS(value)) {
        return new NextResponse(
          JSON.stringify({
            error: 'Potential XSS detected',
            message: `Suspicious content detected in header: ${header}`
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    return null
  }

  private async applySanitization(request: NextRequest): Promise<NextResponse | null> {
    try {
      const contentType = request.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        const body = await request.json()
        
        // Check for XSS in JSON payload
        const jsonString = JSON.stringify(body)
        if (XSSProtection.detectXSS(jsonString)) {
          return new NextResponse(
            JSON.stringify({
              error: 'Potential XSS detected in request body',
              message: 'Request contains suspicious content'
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
      }
    } catch (error) {
      // If we can't parse the body, let it continue
      // The actual endpoint will handle the parsing error
    }

    return null
  }

  static createForEndpoint(endpoint: string): SecurityMiddleware {
    const config: SecurityMiddlewareConfig = {}

    if (endpoint.includes('/auth/')) {
      config.rateLimitType = 'auth'
      config.enableCSRF = false // OAuth flows handle CSRF differently
    } else if (endpoint.includes('/upload/')) {
      config.rateLimitType = 'upload'
    } else if (endpoint.includes('/predictions/')) {
      config.rateLimitType = 'prediction'
    }

    return new SecurityMiddleware(config)
  }
}

// Wrapper function for API routes
export function withSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: SecurityMiddlewareConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const security = new SecurityMiddleware(config)
    
    // Apply security middleware
    const securityResponse = await security.process(request)
    if (securityResponse) {
      return securityResponse
    }

    // Execute the actual handler
    let response: NextResponse
    try {
      response = await handler(request)
    } catch (error) {
      console.error('Handler error:', error)
      response = new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Apply security headers to response
    return SecurityHeaders.applySecurityHeaders(response)
  }
}

// Wrapper function for API routes with database context
export function withSecurityAndContext(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>,
  config?: SecurityMiddlewareConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const security = new SecurityMiddleware(config)
    
    // Apply security middleware
    const securityResponse = await security.process(request)
    if (securityResponse) {
      return securityResponse
    }

    // Execute with security context
    try {
      return await withSecurityContext(request, async (context) => {
        const response = await handler(request, context)
        return SecurityHeaders.applySecurityHeaders(response)
      })
    } catch (error) {
      console.error('Handler with context error:', error)
      
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return SecurityHeaders.createSecureResponse(
          JSON.stringify({ error: 'Unauthorized access' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      return SecurityHeaders.createSecureResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}