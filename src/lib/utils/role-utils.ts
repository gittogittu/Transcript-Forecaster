import { UserRole } from "@/lib/auth"

/**
 * Client-safe role utilities that don't require database access
 */

// Role hierarchy: admin > analyst > viewer
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  analyst: 2,
  viewer: 1
}

/**
 * Check if a user has the required role or higher
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0
  return userLevel >= requiredLevel
}

/**
 * Check if a user role is in the list of allowed roles
 */
export function hasAnyRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}

/**
 * Get all roles that are equal or lower than the given role
 */
export function getRolesAtOrBelow(role: UserRole): UserRole[] {
  const level = ROLE_HIERARCHY[role] || 0
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, roleLevel]) => roleLevel <= level)
    .map(([roleName]) => roleName as UserRole)
}

/**
 * Get all roles that are higher than the given role
 */
export function getRolesAbove(role: UserRole): UserRole[] {
  const level = ROLE_HIERARCHY[role] || 0
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, roleLevel]) => roleLevel > level)
    .map(([roleName]) => roleName as UserRole)
}

/**
 * Check if user can perform action based on role
 */
export function canPerformAction(
  userRole: UserRole, 
  action: 'read' | 'write' | 'delete' | 'admin'
): boolean {
  switch (action) {
    case 'read':
      return hasRole(userRole, 'viewer')
    case 'write':
      return hasRole(userRole, 'analyst')
    case 'delete':
      return hasRole(userRole, 'analyst')
    case 'admin':
      return hasRole(userRole, 'admin')
    default:
      return false
  }
}

/**
 * Get user-friendly role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    admin: 'Administrator',
    analyst: 'Analyst',
    viewer: 'Viewer'
  }
  return displayNames[role] || role
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: 'Full system access including user management and system configuration',
    analyst: 'Can create, edit, and analyze transcript data',
    viewer: 'Read-only access to transcript data and analytics'
  }
  return descriptions[role] || 'Unknown role'
}