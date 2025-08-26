/**
 * Authentication type definitions
 */

export interface AuthUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
}

export interface AuthSession {
  user: AuthUser
  provider: string
  accessToken: string
  expires: string
}

export interface AuthError {
  name: 'AuthenticationError'
  message: string
  code: 'AUTH_ERROR' | 'ACCESS_DENIED' | 'CONFIGURATION_ERROR' | 'VERIFICATION_ERROR'
  timestamp: Date
  context?: {
    provider?: string
    redirectUrl?: string
    errorType?: string
  }
}