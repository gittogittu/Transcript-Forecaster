import DOMPurify from 'isomorphic-dompurify'
import { z } from 'zod'

export interface SanitizationOptions {
  allowedTags?: string[]
  allowedAttributes?: Record<string, string[]>
  stripTags?: boolean
  maxLength?: number
}

export class InputSanitizer {
  private static instance: InputSanitizer
  
  static getInstance(): InputSanitizer {
    if (!InputSanitizer.instance) {
      InputSanitizer.instance = new InputSanitizer()
    }
    return InputSanitizer.instance
  }

  sanitizeHTML(input: string, options: SanitizationOptions = {}): string {
    const config = {
      ALLOWED_TAGS: options.allowedTags || [],
      ALLOWED_ATTR: options.allowedAttributes || {},
      KEEP_CONTENT: !options.stripTags,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false
    }

    let sanitized = DOMPurify.sanitize(input, config)
    
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength)
    }
    
    return sanitized
  }

  sanitizeText(input: string, maxLength?: number): string {
    // Remove HTML tags and decode entities
    let sanitized = input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[#\w]+;/g, '') // Remove HTML entities
      .trim()
    
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength)
    }
    
    return sanitized
  }

  sanitizeFileName(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 255) // Limit length
  }

  sanitizeSQL(input: string): string {
    // Basic SQL injection prevention (use parameterized queries instead)
    return input
      .replace(/['";\\]/g, '') // Remove dangerous characters
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove block comments start
      .replace(/\*\//g, '') // Remove block comments end
  }

  validateAndSanitizeEmail(email: string): string {
    const emailSchema = z.string().email().max(254)
    const validated = emailSchema.parse(email.toLowerCase().trim())
    return this.sanitizeText(validated)
  }

  validateAndSanitizeURL(url: string): string {
    const urlSchema = z.string().url().max(2048)
    const validated = urlSchema.parse(url.trim())
    
    // Additional URL validation
    const parsedUrl = new URL(validated)
    const allowedProtocols = ['http:', 'https:']
    
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      throw new Error('Invalid URL protocol')
    }
    
    return validated
  }

  sanitizeObject<T extends Record<string, any>>(
    obj: T, 
    schema: z.ZodSchema<T>
  ): T {
    // Validate with Zod first
    const validated = schema.parse(obj)
    
    // Recursively sanitize string values
    const sanitized = this.deepSanitize(validated)
    
    return sanitized as T
  }

  private deepSanitize(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeText(obj)
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitize(item))
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeText(key)
        sanitized[sanitizedKey] = this.deepSanitize(value)
      }
      return sanitized
    }
    
    return obj
  }
}

// Validation schemas with sanitization
export const sanitizedStringSchema = z.string().transform((val) => 
  InputSanitizer.getInstance().sanitizeText(val)
)

export const sanitizedHTMLSchema = z.string().transform((val) => 
  InputSanitizer.getInstance().sanitizeHTML(val, { stripTags: true })
)

export const sanitizedFileNameSchema = z.string().transform((val) => 
  InputSanitizer.getInstance().sanitizeFileName(val)
)

// Export singleton instance
export const inputSanitizer = InputSanitizer.getInstance()