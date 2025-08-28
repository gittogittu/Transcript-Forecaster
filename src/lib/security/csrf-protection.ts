import { NextRequest, NextResponse } from 'next/server'

export interface CSRFConfig {
  secret: string
  tokenLength: number
  cookieName: string
  headerName: string
  sameSite: 'strict' | 'lax' | 'none'
  secure: boolean
}

const defaultConfig: CSRFConfig = {
  secret: process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
  tokenLength: 32,
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production'
}

export class CSRFProtection {
  private config: CSRFConfig

  constructor(config: Partial<CSRFConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  generateToken(): string {
    const array = new Uint8Array(this.config.tokenLength)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  async createTokenHash(token: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(token + this.config.secret)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)
    return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  async verifyToken(token: string, hash: string): Promise<boolean> {
    const expectedHash = await this.createTokenHash(token)
    return expectedHash === hash
  }

  async setCSRFCookie(response: NextResponse, token: string): Promise<void> {
    const hash = await this.createTokenHash(token)
    response.cookies.set(this.config.cookieName, hash, {
      httpOnly: true,
      secure: this.config.secure,
      sameSite: this.config.sameSite,
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    })
  }

  getCSRFToken(request: NextRequest): string | null {
    return request.headers.get(this.config.headerName) || 
           request.nextUrl.searchParams.get('csrf-token')
  }

  getCSRFCookie(request: NextRequest): string | null {
    return request.cookies.get(this.config.cookieName)?.value || null
  }

  async validateCSRF(request: NextRequest): Promise<boolean> {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true
    }

    const token = this.getCSRFToken(request)
    const cookieHash = this.getCSRFCookie(request)

    if (!token || !cookieHash) {
      return false
    }

    return await this.verifyToken(token, cookieHash)
  }
}

export const csrfProtection = new CSRFProtection()