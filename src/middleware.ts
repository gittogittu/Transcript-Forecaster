import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { UserRole } from "./lib/auth"
import { SecurityMiddleware } from "./lib/middleware/security-middleware"
import { csrfProtection } from "./lib/security/csrf-protection"

export default withAuth(
  async function middleware(req) {
    // Apply security middleware first
    const security = SecurityMiddleware.createForEndpoint(req.nextUrl.pathname)
    const securityResponse = await security.process(req)
    
    if (securityResponse) {
      return securityResponse
    }
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith("/auth")
    const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth")
    const isPublicRoute = req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/api/health")

    // Allow API auth routes and health checks
    if (isApiAuthRoute || req.nextUrl.pathname.startsWith("/api/health")) {
      return NextResponse.next()
    }

    // Allow public routes
    if (isPublicRoute) {
      return NextResponse.next()
    }

    // Redirect authenticated users away from auth pages
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Redirect unauthenticated users to sign in
    if (!isAuthPage && !isAuth) {
      let from = req.nextUrl.pathname
      if (req.nextUrl.search) {
        from += req.nextUrl.search
      }

      return NextResponse.redirect(
        new URL(`/auth/signin?from=${encodeURIComponent(from)}`, req.url)
      )
    }

    // Role-based route protection
    if (token && isAuth) {
      const userRole = token.role as UserRole
      const pathname = req.nextUrl.pathname

      // Admin-only routes
      if (pathname.startsWith("/admin") && userRole !== "admin") {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }

      // Performance monitoring (admin only)
      if (pathname.startsWith("/performance") && userRole !== "admin") {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }

      // Analytics routes (analyst and admin)
      if (pathname.startsWith("/analytics") && !["analyst", "admin"].includes(userRole)) {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }

      // API route protection
      if (pathname.startsWith("/api/")) {
        // Admin-only API routes
        if (pathname.startsWith("/api/admin") && userRole !== "admin") {
          return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

        // User management API (admin only)
        if (pathname.startsWith("/api/users") && userRole !== "admin") {
          return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

        // Analytics API (analyst and admin)
        if (pathname.startsWith("/api/analytics") && !["analyst", "admin"].includes(userRole)) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

        // Transcripts API - different permissions based on method
        if (pathname.startsWith("/api/transcripts")) {
          // Viewers can only read
          if (userRole === "viewer" && req.method !== "GET") {
            return NextResponse.json({ error: "Read-only access" }, { status: 403 })
          }
        }
      }
    }

    // Generate and set CSRF token for authenticated users
    if (token && isAuth) {
      const response = NextResponse.next()
      const csrfToken = csrfProtection.generateToken()
      await csrfProtection.setCSRFCookie(response, csrfToken)
      
      // Add CSRF token to response headers for client-side access
      response.headers.set('X-CSRF-Token', csrfToken)
      
      return response
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes and API auth routes
        if (
          req.nextUrl.pathname === "/" ||
          req.nextUrl.pathname.startsWith("/api/auth") ||
          req.nextUrl.pathname.startsWith("/api/health") ||
          req.nextUrl.pathname.startsWith("/auth")
        ) {
          return true
        }

        // For all other routes, require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}