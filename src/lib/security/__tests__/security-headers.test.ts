import { describe, it, expect } from '@jest/globals'
import { SecurityHeaders, XSSProtection } from '../security-headers'
import { NextResponse } from 'next/server'
import { NextResponse } from 'next/server'
import { NextResponse } from 'next/server'
import { NextResponse } from 'next/server'
import { NextResponse } from 'next/server'
import { NextResponse } from 'next/server'

// Mock NextResponse for testing
const mockNextResponse = {
  headers: new Map(),
  status: 200
}

jest.mock('next/server', () => ({
  NextResponse: jest.fn().mockImplementation((body?: any, init?: any) => ({
    ...mockNextResponse,
    headers: new Map(),
    status: init?.status || 200,
    body
  }))
}))

describe('SecurityHeaders', () => {
  describe('applySecurityHeaders', () => {
    it('should apply all default security headers', () => {
      const response = new NextResponse('test')
      const securedResponse = SecurityHeaders.applySecurityHeaders(response)

      expect(securedResponse.headers.get('Content-Security-Policy')).toBeTruthy()
      expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY')
      expect(securedResponse.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(securedResponse.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(securedResponse.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })

    it('should apply HSTS in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const response = new NextResponse('test')
      const securedResponse = SecurityHeaders.applySecurityHeaders(response)

      expect(securedResponse.headers.get('Strict-Transport-Security')).toBeTruthy()

      process.env.NODE_ENV = originalEnv
    })

    it('should not apply HSTS in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const response = new NextResponse('test')
      const securedResponse = SecurityHeaders.applySecurityHeaders(response)

      expect(securedResponse.headers.get('Strict-Transport-Security')).toBeFalsy()

      process.env.NODE_ENV = originalEnv
    })

    it('should remove server information headers', () => {
      const response = new NextResponse('test')
      response.headers.set('Server', 'nginx')
      response.headers.set('X-Powered-By', 'Express')

      const securedResponse = SecurityHeaders.applySecurityHeaders(response)

      expect(securedResponse.headers.get('Server')).toBeFalsy()
      expect(securedResponse.headers.get('X-Powered-By')).toBeFalsy()
    })

    it('should allow custom CSP', () => {
      const customCSP = "default-src 'self'; script-src 'self' 'unsafe-inline'"
      const response = new NextResponse('test')
      const securedResponse = SecurityHeaders.applySecurityHeaders(response, {
        contentSecurityPolicy: customCSP
      })

      expect(securedResponse.headers.get('Content-Security-Policy')).toBe(customCSP)
    })

    it('should allow custom frame options', () => {
      const response = new NextResponse('test')
      const securedResponse = SecurityHeaders.applySecurityHeaders(response, {
        xFrameOptions: 'SAMEORIGIN'
      })

      expect(securedResponse.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    })
  })

  describe('createSecureResponse', () => {
    it('should create response with security headers', () => {
      const response = SecurityHeaders.createSecureResponse('test content')

      expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    })

    it('should accept custom init options', () => {
      const response = SecurityHeaders.createSecureResponse('test', {
        status: 201,
        headers: { 'Custom-Header': 'value' }
      })

      expect(response.status).toBe(201)
      expect(response.headers.get('Custom-Header')).toBe('value')
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
    })
  })
})

describe('XSSProtection', () => {
  describe('detectXSS', () => {
    it('should detect script tags', () => {
      const input = '<script>alert("xss")</script>'
      expect(XSSProtection.detectXSS(input)).toBe(true)
    })

    it('should detect javascript: protocol', () => {
      const input = 'javascript:alert(1)'
      expect(XSSProtection.detectXSS(input)).toBe(true)
    })

    it('should detect event handlers', () => {
      const input = '<div onclick="alert(1)">test</div>'
      expect(XSSProtection.detectXSS(input)).toBe(true)
    })

    it('should detect iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>'
      expect(XSSProtection.detectXSS(input)).toBe(true)
    })

    it('should detect object tags', () => {
      const input = '<object data="evil.swf"></object>'
      expect(XSSProtection.detectXSS(input)).toBe(true)
    })

    it('should detect embed tags', () => {
      const input = '<embed src="evil.swf">'
      expect(XSSProtection.detectXSS(input)).toBe(true)
    })

    it('should detect vbscript protocol', () => {
      const input = 'vbscript:msgbox(1)'
      expect(XSSProtection.detectXSS(input)).toBe(true)
    })

    it('should detect data URLs with HTML', () => {
      const input = 'data:text/html,<script>alert(1)</script>'
      expect(XSSProtection.detectXSS(input)).toBe(true)
    })

    it('should not flag safe content', () => {
      const input = 'Hello World! This is safe content.'
      expect(XSSProtection.detectXSS(input)).toBe(false)
    })

    it('should not flag safe HTML', () => {
      const input = '<p>Hello <strong>World</strong></p>'
      expect(XSSProtection.detectXSS(input)).toBe(false)
    })
  })

  describe('sanitizeForHTML', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("xss")</script>'
      const result = XSSProtection.sanitizeForHTML(input)
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
    })

    it('should escape ampersands', () => {
      const input = 'Tom & Jerry'
      const result = XSSProtection.sanitizeForHTML(input)
      expect(result).toBe('Tom &amp; Jerry')
    })

    it('should escape quotes', () => {
      const input = `He said "Hello" and 'Goodbye'`
      const result = XSSProtection.sanitizeForHTML(input)
      expect(result).toBe('He said &quot;Hello&quot; and &#x27;Goodbye&#x27;')
    })
  })

  describe('sanitizeForAttribute', () => {
    it('should remove dangerous characters', () => {
      const input = 'value"onclick="alert(1)'
      const result = XSSProtection.sanitizeForAttribute(input)
      expect(result).toBe('valueonclickalert1')
    })

    it('should allow safe characters', () => {
      const input = 'safe-value_123'
      const result = XSSProtection.sanitizeForAttribute(input)
      expect(result).toBe('safe-value_123')
    })

    it('should trim whitespace', () => {
      const input = '  value  '
      const result = XSSProtection.sanitizeForAttribute(input)
      expect(result).toBe('value')
    })
  })

  describe('sanitizeForURL', () => {
    it('should allow valid HTTPS URLs', () => {
      const input = 'https://example.com/path'
      const result = XSSProtection.sanitizeForURL(input)
      expect(result).toBe('https://example.com/path')
    })

    it('should allow valid HTTP URLs', () => {
      const input = 'http://example.com/path'
      const result = XSSProtection.sanitizeForURL(input)
      expect(result).toBe('http://example.com/path')
    })

    it('should reject javascript: URLs', () => {
      const input = 'javascript:alert(1)'
      const result = XSSProtection.sanitizeForURL(input)
      expect(result).toBe('')
    })

    it('should reject data: URLs', () => {
      const input = 'data:text/html,<script>alert(1)</script>'
      const result = XSSProtection.sanitizeForURL(input)
      expect(result).toBe('')
    })

    it('should reject malformed URLs', () => {
      const input = 'not-a-url'
      const result = XSSProtection.sanitizeForURL(input)
      expect(result).toBe('')
    })
  })

  describe('validateCSS', () => {
    it('should allow safe CSS', () => {
      const input = 'color: red; background: blue;'
      expect(XSSProtection.validateCSS(input)).toBe(true)
    })

    it('should reject CSS with expression', () => {
      const input = 'width: expression(alert(1))'
      expect(XSSProtection.validateCSS(input)).toBe(false)
    })

    it('should reject CSS with javascript:', () => {
      const input = 'background: url(javascript:alert(1))'
      expect(XSSProtection.validateCSS(input)).toBe(false)
    })

    it('should reject CSS with @import', () => {
      const input = '@import url(evil.css)'
      expect(XSSProtection.validateCSS(input)).toBe(false)
    })

    it('should reject CSS with behavior', () => {
      const input = 'behavior: url(evil.htc)'
      expect(XSSProtection.validateCSS(input)).toBe(false)
    })

    it('should reject CSS with -moz-binding', () => {
      const input = '-moz-binding: url(evil.xml)'
      expect(XSSProtection.validateCSS(input)).toBe(false)
    })
  })
})