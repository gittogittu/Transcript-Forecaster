import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/middleware/security-middleware'
import { csrfProtection } from '@/lib/security/csrf-protection'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/security/csrf - Get CSRF token for authenticated users
 */
export const GET = withSecurity(async function(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = csrfProtection.generateToken()
    const response = NextResponse.json({
      success: true,
      csrfToken: token
    })

    // Set CSRF cookie
    csrfProtection.setCSRFCookie(response, token)

    return response
  } catch (error) {
    console.error('Error generating CSRF token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}, { 
  enableCSRF: false, // Don't validate CSRF for getting CSRF token
  rateLimitType: 'auth'
})