"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AuthUser, AuthSession } from "@/lib/types/auth"

export function useAuth() {
  const { data: session, status } = useSession()
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

  const requireAuth = (requiredRole?: "admin" | "user") => {
    if (status === "loading") return

    if (!session) {
      router.push("/auth/signin")
      return
    }

    if (requiredRole === "admin" && session.user.role !== "admin") {
      router.push("/unauthorized")
      return
    }
  }

  return {
    user: session?.user as AuthUser | undefined,
    session: session as AuthSession | null,
    isLoading: status === "loading",
    isAuthenticated: !!session,
    isAdmin: session?.user?.role === "admin",
    login,
    logout,
    requireAuth,
  }
}