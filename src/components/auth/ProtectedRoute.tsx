"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { UserRole, ExtendedSession } from "@/lib/auth"
import { hasRole } from "@/lib/utils/role-utils"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  allowedRoles?: UserRole[]
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  allowedRoles, 
  fallback 
}: ProtectedRouteProps) {
  const { data: session, status } = useSession() as { 
    data: ExtendedSession | null, 
    status: string 
  }
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (!session) {
      router.push("/auth/signin")
      return
    }

    const userRole = session.user.role

    // Check if user has required role
    if (requiredRole && !hasRole(userRole, requiredRole)) {
      router.push("/unauthorized")
      return
    }

    // Check if user role is in allowed roles
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      router.push("/unauthorized")
      return
    }
  }, [session, status, requiredRole, allowedRoles, router])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please sign in to access this page.</p>
        </div>
      </div>
    )
  }

  const userRole = session.user.role

  // Check permissions
  const hasPermission = () => {
    if (requiredRole && !hasRole(userRole, requiredRole)) {
      return false
    }
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return false
    }
    return true
  }

  if (!hasPermission()) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Your role: {userRole}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}