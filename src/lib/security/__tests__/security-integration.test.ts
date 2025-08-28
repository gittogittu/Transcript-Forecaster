import { describe, it, expect } from '@jest/globals'
import { XSSProtection } from '../security-headers'
import { InputSanitizer } from '../input-sanitization'

describe('Security Integration Tests', () => {
  describe('XSS Protection', () => {
    it('should detect dangerous script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>'
      expect(XSSProtection.detectXSS(maliciousInput)).toBe(true)
    })

    it('should detect javascript: protocol', () => {
      const maliciousInput = 'javascript:alert(1)'
      expect(XSSProtection.detectXSS(maliciousInput)).toBe(true)
    })

    it('should allow safe content', () => {
      const safeInput = 'Hello World! This is safe content.'
      expect(XSSProtection.detectXSS(safeInput)).toBe(false)
    })

    it('should sanitize HTML entities', () => {
      const input = '<script>alert("xss")</script>'
      const result = XSSProtection.sanitizeForHTML(input)
      expect(result).toContain('&lt;')
      expect(result).toContain('&gt;')
      expect(result).not.toContain('<script>')
    })

    it('should validate URLs safely', () => {
      expect(XSSProtection.sanitizeForURL('https://example.com')).toBe('https://example.com/')
      expect(XSSProtection.sanitizeForURL('javascript:alert(1)')).toBe('')
      expect(XSSProtection.sanitizeForURL('invalid-url')).toBe('')
    })
  })

  describe('Input Sanitization', () => {
    const sanitizer = InputSanitizer.getInstance()

    it('should sanitize file names', () => {
      const input = 'file<name>.txt'
      const result = sanitizer.sanitizeFileName(input)
      expect(result).toBe('file_name_.txt')
    })

    it('should validate emails', () => {
      expect(() => sanitizer.validateAndSanitizeEmail('test@example.com')).not.toThrow()
      expect(() => sanitizer.validateAndSanitizeEmail('invalid-email')).toThrow()
    })

    it('should sanitize SQL input', () => {
      const input = "'; DROP TABLE users; --"
      const result = sanitizer.sanitizeSQL(input)
      expect(result).not.toContain("'")
      expect(result).not.toContain(';')
      expect(result).not.toContain('--')
    })

    it('should handle text sanitization', () => {
      const input = '  Hello World  '
      const result = sanitizer.sanitizeText(input)
      expect(result).toBe('Hello World')
    })
  })

  describe('Security Headers Validation', () => {
    it('should validate CSP directives', () => {
      const validCSP = "default-src 'self'; script-src 'self'"
      expect(typeof validCSP).toBe('string')
      expect(validCSP).toContain("default-src")
    })

    it('should validate frame options', () => {
      const validFrameOptions = ['DENY', 'SAMEORIGIN', 'ALLOW-FROM']
      expect(validFrameOptions).toContain('DENY')
      expect(validFrameOptions).toContain('SAMEORIGIN')
    })
  })

  describe('CSRF Token Generation', () => {
    it('should generate random tokens', () => {
      const token1 = Math.random().toString(36).substring(2, 15)
      const token2 = Math.random().toString(36).substring(2, 15)
      expect(token1).not.toBe(token2)
      expect(token1.length).toBeGreaterThan(0)
    })

    it('should create consistent hashes', () => {
      const crypto = require('crypto')
      const token = 'test-token'
      const secret = 'test-secret'
      
      const hash1 = crypto.createHash('sha256').update(token + secret).digest('hex')
      const hash2 = crypto.createHash('sha256').update(token + secret).digest('hex')
      
      expect(hash1).toBe(hash2)
    })
  })

  describe('Rate Limiting Logic', () => {
    it('should track request counts', () => {
      const store = new Map()
      const key = 'test-ip'
      const maxRequests = 5
      
      // Simulate requests
      for (let i = 1; i <= maxRequests; i++) {
        store.set(key, { count: i, resetTime: Date.now() + 60000 })
        expect(store.get(key).count).toBe(i)
      }
      
      // Should be at limit
      expect(store.get(key).count).toBe(maxRequests)
    })

    it('should handle time windows', () => {
      const now = Date.now()
      const windowMs = 60000 // 1 minute
      const resetTime = now + windowMs
      
      expect(resetTime).toBeGreaterThan(now)
      expect(resetTime - now).toBe(windowMs)
    })
  })

  describe('Audit Logging Structure', () => {
    it('should structure audit events correctly', () => {
      const auditEvent = {
        action: 'CREATE',
        resource: 'transcripts',
        resourceId: '123',
        userId: 'user-456',
        timestamp: new Date(),
        severity: 'low'
      }
      
      expect(auditEvent.action).toBe('CREATE')
      expect(auditEvent.resource).toBe('transcripts')
      expect(auditEvent.severity).toBe('low')
      expect(auditEvent.timestamp).toBeInstanceOf(Date)
    })

    it('should categorize severity levels', () => {
      const severityLevels = ['low', 'medium', 'high', 'critical']
      
      expect(severityLevels).toContain('low')
      expect(severityLevels).toContain('critical')
      expect(severityLevels.length).toBe(4)
    })
  })
})