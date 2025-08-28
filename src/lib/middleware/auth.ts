import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { UserRole, ExtendedJWT } from '../auth'
import { hasRole } from '../database/users'

export interface AuthMiddlewareOptions {
  requiredRole?: UserRole
  allowedRoles?: UserRole[]
  requireAuth?: boolean
}

/**
 * Authentication middleware for API routes
 */
export async function withAuth(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
) {
  const { requiredRole, allowedRoles, requireAuth = true } = options

  try {
    // Get the JWT token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    }) as ExtendedJWT | null

    // Check if authentication is required
    if (requireAuth && !token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // If no token but auth not required, continue
    if (!token && !requireAuth) {
      return null
    }

    // Check role-based access
    if (token && (requiredRole || allowedRoles)) {
      const userRole = token.role

      // Check if user has required role
      if (requiredRole && !hasRole(userRole, requiredRole)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      // Check if user role is in allowed roles
      if (allowedRoles && !allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Authentication and authorization successful
    return null
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { error: 'Authentication error' },
      { status: 500 }
    )
  }
}

/**
 * Higher-order function to protect API routes
 */
export function protectRoute(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) {
  return async (request: NextRequest, context?: any) => {
    // Run authentication middleware
    const authResult = await withAuth(request, options)
    
    if (authResult) {
      return authResult
    }

    // If auth passes, run the actual handler
    return handler(request, context)
  }
}

/**
 * Middleware specifically for admin-only routes
 */
export function adminOnly(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return protectRoute(handler, { requiredRole: 'admin' })
}

/**
 * Middleware for analyst and admin routes
 */
export function analystOrAdmin(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return protectRoute(handler, { allowedRoles: ['analyst', 'admin'] })
}

/**
 * Middleware for authenticated users (any role)
 */
export function authenticated(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return protectRoute(handler, { requireAuth: true })
}

/**
 * Get current user from request
 */
export async function getCurrentUser(request: NextRequest): Promise<ExtendedJWT | null> {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    }) as ExtendedJWT | null

    return token
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Check if current user has specific permission
 */
export async function hasPermission(
  request: NextRequest,
  requiredRole: UserRole
): Promise<boolean> {
  const user = await getCurrentUser(request)
  
  if (!user) {
    return false
  }

  return hasRole(user.role, requiredRole)
}