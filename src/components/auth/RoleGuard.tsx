"use client"

import { useSession } from "next-auth/react"
import { UserRole, ExtendedSession } from "@/lib/auth"
import { hasRole } from "@/lib/database/users"

interface RoleGuardProps {
  children: React.ReactNode
  requiredRole?: UserRole
  allowedRoles?: UserRole[]
  fallback?: React.ReactNode
  showFallback?: boolean
}

export function RoleGuard({ 
  children, 
  requiredRole, 
  allowedRoles, 
  fallback,
  showFallback = false
}: RoleGuardProps) {
  const { data: session, status } = useSession() as { 
    data: ExtendedSession | null, 
    status: string 
  }

  if (status === "loading") {
    return showFallback ? (fallback || null) : null
  }

  if (!session) {
    return showFallback ? (fallback || null) : null
  }

  const userRole = session.user.role

  // Check if user has required role
  if (requiredRole && !hasRole(userRole, requiredRole)) {
    return showFallback ? (fallback || null) : null
  }

  // Check if user role is in allowed roles
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return showFallback ? (fallback || null) : null
  }

  return <>{children}</>
}

// Convenience components for common role checks
export function AdminOnly({ children, fallback, showFallback }: Omit<RoleGuardProps, 'requiredRole'>) {
  return (
    <RoleGuard 
      requiredRole="admin" 
      fallback={fallback} 
      showFallback={showFallback}
    >
      {children}
    </RoleGuard>
  )
}

export function AnalystOrAdmin({ children, fallback, showFallback }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard 
      allowedRoles={["analyst", "admin"]} 
      fallback={fallback} 
      showFallback={showFallback}
    >
      {children}
    </RoleGuard>
  )
}

export function ViewerOrHigher({ children, fallback, showFallback }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard 
      allowedRoles={["viewer", "analyst", "admin"]} 
      fallback={fallback} 
      showFallback={showFallback}
    >
      {children}
    </RoleGuard>
  )
}