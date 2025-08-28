import { describe, it, expect, beforeEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { CSRFProtection } from '../csrf-protection'

// Mock NextRequest for testing
class MockNextRequest extends NextRequest {
  constructor(url: string, init?: RequestInit & { cookies?: Record<string, string> }) {
    super(url, init)
    if (init?.cookies) {
      // Mock cookies for testing
      Object.defineProperty(this, 'cookies', {
        value: {
          get: (name: string) => ({ value: init.cookies![name] })
        }
      })
    }
  }
}

describe('CSRFProtection', () => {
  let csrfProtection: CSRFProtection
  
  beforeEach(() => {
    csrfProtection = new CSRFProtection({
      secret: 'test-secret',
      tokenLength: 32
    })
  })

  describe('generateToken', () => {
    it('should generate a token of correct length', () => {
      const token = csrfProtection.generateToken()
      expect(token).toHaveLength(64) // 32 bytes = 64 hex chars
      expect(typeof token).toBe('string')
    })

    it('should generate unique tokens', () => {
      const token1 = csrfProtection.generateToken()
      const token2 = csrfProtection.generateToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('createTokenHash', () => {
    it('should create consistent hash for same token', () => {
      const token = 'test-token'
      const hash1 = csrfProtection.createTokenHash(token)
      const hash2 = csrfProtection.createTokenHash(token)
      expect(hash1).toBe(hash2)
    })

    it('should create different hashes for different tokens', () => {
      const hash1 = csrfProtection.createTokenHash('token1')
      const hash2 = csrfProtection.createTokenHash('token2')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = 'test-token'
      const hash = csrfProtection.createTokenHash(token)
      expect(csrfProtection.verifyToken(token, hash)).toBe(true)
    })

    it('should reject invalid token', () => {
      const token = 'test-token'
      const hash = csrfProtection.createTokenHash('different-token')
      expect(csrfProtection.verifyToken(token, hash)).toBe(false)
    })
  })

  describe('validateCSRF', () => {
    it('should allow GET requests without CSRF token', () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET'
      })
      expect(csrfProtection.validateCSRF(request)).toBe(true)
    })

    it('should allow HEAD requests without CSRF token', () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'HEAD'
      })
      expect(csrfProtection.validateCSRF(request)).toBe(true)
    })

    it('should allow OPTIONS requests without CSRF token', () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'OPTIONS'
      })
      expect(csrfProtection.validateCSRF(request)).toBe(true)
    })

    it('should reject POST request without CSRF token', () => {
      const request = new MockNextRequest('http://localhost/api/test', {
        method: 'POST'
      }) as any
      expect(csrfProtection.validateCSRF(request)).toBe(false)
    })

    it('should accept POST request with valid CSRF token', () => {
      const token = csrfProtection.generateToken()
      const hash = csrfProtection.createTokenHash(token)
      
      const request = new MockNextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': token
        },
        cookies: {
          'csrf-token': hash
        }
      }) as any
      
      expect(csrfProtection.validateCSRF(request)).toBe(true)
    })

    it('should reject POST request with invalid CSRF token', () => {
      const token = csrfProtection.generateToken()
      const wrongHash = csrfProtection.createTokenHash('wrong-token')
      
      const request = new MockNextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': token
        },
        cookies: {
          'csrf-token': wrongHash
        }
      }) as any
      
      expect(csrfProtection.validateCSRF(request)).toBe(false)
    })
  })
})