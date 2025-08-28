import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'

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
    return randomBytes(this.config.tokenLength).toString('hex')
  }

  createTokenHash(token: string): string {
    return createHash('sha256')
      .update(token + this.config.secret)
      .digest('hex')
  }

  verifyToken(token: string, hash: string): boolean {
    const expectedHash = this.createTokenHash(token)
    return expectedHash === hash
  }

  setCSRFCookie(response: NextResponse, token: string): void {
    const hash = this.createTokenHash(token)
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

  validateCSRF(request: NextRequest): boolean {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true
    }

    const token = this.getCSRFToken(request)
    const cookieHash = this.getCSRFCookie(request)

    if (!token || !cookieHash) {
      return false
    }

    return this.verifyToken(token, cookieHash)
  }
}

export const csrfProtection = new CSRFProtection()