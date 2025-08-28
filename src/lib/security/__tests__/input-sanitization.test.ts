import { describe, it, expect, beforeEach } from '@jest/globals'
import { InputSanitizer, inputSanitizer } from '../input-sanitization'
import { z } from 'zod'

describe('InputSanitizer', () => {
  let sanitizer: InputSanitizer

  beforeEach(() => {
    sanitizer = InputSanitizer.getInstance()
  })

  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello World'
      const result = sanitizer.sanitizeHTML(input, { stripTags: true })
      expect(result).toBe('Hello World')
    })

    it('should remove dangerous attributes', () => {
      const input = '<div onclick="alert(1)">Hello</div>'
      const result = sanitizer.sanitizeHTML(input, { stripTags: true })
      expect(result).toBe('Hello')
    })

    it('should allow safe HTML when configured', () => {
      const input = '<p>Hello <strong>World</strong></p>'
      const result = sanitizer.sanitizeHTML(input, {
        allowedTags: ['p', 'strong'],
        allowedAttributes: { p: [], strong: [] }
      })
      expect(result).toContain('Hello')
      expect(result).toContain('World')
    })

    it('should respect maxLength option', () => {
      const input = 'This is a very long string that should be truncated'
      const result = sanitizer.sanitizeHTML(input, { maxLength: 10 })
      expect(result).toHaveLength(10)
    })
  })

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World'
      const result = sanitizer.sanitizeText(input)
      expect(result).toBe('Hello World')
    })

    it('should remove HTML entities', () => {
      const input = 'Hello &amp; World &lt;test&gt;'
      const result = sanitizer.sanitizeText(input)
      expect(result).toBe('Hello  World')
    })

    it('should trim whitespace', () => {
      const input = '  Hello World  '
      const result = sanitizer.sanitizeText(input)
      expect(result).toBe('Hello World')
    })

    it('should respect maxLength', () => {
      const input = 'This is a very long string'
      const result = sanitizer.sanitizeText(input, 10)
      expect(result).toHaveLength(10)
    })
  })

  describe('sanitizeFileName', () => {
    it('should replace invalid characters with underscores', () => {
      const input = 'file<name>.txt'
      const result = sanitizer.sanitizeFileName(input)
      expect(result).toBe('file_name_.txt')
    })

    it('should remove multiple consecutive underscores', () => {
      const input = 'file___name.txt'
      const result = sanitizer.sanitizeFileName(input)
      expect(result).toBe('file_name.txt')
    })

    it('should remove leading and trailing underscores', () => {
      const input = '_filename_'
      const result = sanitizer.sanitizeFileName(input)
      expect(result).toBe('filename')
    })

    it('should limit length to 255 characters', () => {
      const input = 'a'.repeat(300)
      const result = sanitizer.sanitizeFileName(input)
      expect(result).toHaveLength(255)
    })
  })

  describe('sanitizeSQL', () => {
    it('should remove dangerous SQL characters', () => {
      const input = "'; DROP TABLE users; --"
      const result = sanitizer.sanitizeSQL(input)
      expect(result).not.toContain("'")
      expect(result).not.toContain(';')
      expect(result).not.toContain('--')
    })

    it('should remove SQL comments', () => {
      const input = 'SELECT * FROM users /* comment */'
      const result = sanitizer.sanitizeSQL(input)
      expect(result).not.toContain('/*')
      expect(result).not.toContain('*/')
    })
  })

  describe('validateAndSanitizeEmail', () => {
    it('should accept valid email', () => {
      const input = 'test@example.com'
      const result = sanitizer.validateAndSanitizeEmail(input)
      expect(result).toBe('test@example.com')
    })

    it('should convert to lowercase', () => {
      const input = 'TEST@EXAMPLE.COM'
      const result = sanitizer.validateAndSanitizeEmail(input)
      expect(result).toBe('test@example.com')
    })

    it('should trim whitespace', () => {
      const input = '  test@example.com  '
      const result = sanitizer.validateAndSanitizeEmail(input)
      expect(result).toBe('test@example.com')
    })

    it('should throw on invalid email', () => {
      const input = 'invalid-email'
      expect(() => sanitizer.validateAndSanitizeEmail(input)).toThrow()
    })
  })

  describe('validateAndSanitizeURL', () => {
    it('should accept valid HTTPS URL', () => {
      const input = 'https://example.com'
      const result = sanitizer.validateAndSanitizeURL(input)
      expect(result).toBe('https://example.com')
    })

    it('should accept valid HTTP URL', () => {
      const input = 'http://example.com'
      const result = sanitizer.validateAndSanitizeURL(input)
      expect(result).toBe('http://example.com')
    })

    it('should reject invalid protocols', () => {
      const input = 'javascript:alert(1)'
      expect(() => sanitizer.validateAndSanitizeURL(input)).toThrow()
    })

    it('should reject malformed URLs', () => {
      const input = 'not-a-url'
      expect(() => sanitizer.validateAndSanitizeURL(input)).toThrow()
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize string values in object', () => {
      const schema = z.object({
        name: z.string(),
        description: z.string()
      })
      
      const input = {
        name: '<script>alert(1)</script>John',
        description: 'Hello &amp; World'
      }
      
      const result = sanitizer.sanitizeObject(input, schema)
      expect(result.name).toBe('John')
      expect(result.description).toBe('Hello  World')
    })

    it('should handle nested objects', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string()
        })
      })
      
      const input = {
        user: {
          name: '<b>John</b>',
          email: 'john@example.com'
        }
      }
      
      const result = sanitizer.sanitizeObject(input, schema)
      expect(result.user.name).toBe('John')
      expect(result.user.email).toBe('john@example.com')
    })

    it('should handle arrays', () => {
      const schema = z.object({
        tags: z.array(z.string())
      })
      
      const input = {
        tags: ['<script>tag1</script>', 'tag2']
      }
      
      const result = sanitizer.sanitizeObject(input, schema)
      expect(result.tags[0]).toBe('tag1')
      expect(result.tags[1]).toBe('tag2')
    })

    it('should validate with Zod first', () => {
      const schema = z.object({
        age: z.number()
      })
      
      const input = {
        age: 'not-a-number'
      }
      
      expect(() => sanitizer.sanitizeObject(input, schema)).toThrow()
    })
  })

  describe('deepSanitize', () => {
    it('should preserve non-string values', () => {
      const input = {
        name: 'John',
        age: 30,
        active: true,
        score: null,
        metadata: undefined
      }
      
      const result = sanitizer['deepSanitize'](input)
      expect(result.age).toBe(30)
      expect(result.active).toBe(true)
      expect(result.score).toBe(null)
      expect(result.metadata).toBe(undefined)
    })
  })
})