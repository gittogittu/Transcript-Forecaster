"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ExtendedSession, ExtendedUser, UserRole } from "@/lib/auth"

export function useAuth() {
  const { data: session, status } = useSession() as { 
    data: ExtendedSession | null, 
    status: string 
  }
  const router = useRouter()

  const login = async (provider: string = "auth0", callbackUrl: string = "/dashboard") => {
    try {
      await signIn(provider, { callbackUrl })
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }

  const logout = async (callbackUrl: string = "/") => {
    try {
      await signOut({ callbackUrl })
    } catch (error) {
      console.error("Logout error:", error)
      throw error
    }
  }

  const requireAuth = (requiredRole?: UserRole) => {
    if (status === "loading") return

    if (!session) {
      router.push("/auth/signin")
      return
    }

    if (requiredRole && session.user.role !== requiredRole) {
      // Check role hierarchy
      const roleHierarchy: Record<UserRole, number> = {
        viewer: 1,
        analyst: 2,
        admin: 3,
      }
      
      if (roleHierarchy[session.user.role] < roleHierarchy[requiredRole]) {
        router.push("/unauthorized")
        return
      }
    }
  }

  return {
    user: session?.user as ExtendedUser | undefined,
    session: session as ExtendedSession | null,
    isLoading: status === "loading",
    isAuthenticated: !!session,
    isAdmin: session?.user?.role === "admin",
    login,
    logout,
    requireAuth,
  }
}