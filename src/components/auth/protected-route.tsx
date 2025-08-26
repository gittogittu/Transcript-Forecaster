"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: "admin" | "user"
  fallbackUrl?: string
}

export function ProtectedRoute({ 
  children, 
  requiredRole = "user",
  fallbackUrl = "/auth/signin"
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (!session) {
      router.push(fallbackUrl)
      return
    }

    // Check role if required
    if (requiredRole === "admin" && session.user.role !== "admin") {
      router.push("/unauthorized")
      return
    }
  }, [session, status, router, requiredRole, fallbackUrl])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Loading...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect
  }

  if (requiredRole === "admin" && session.user.role !== "admin") {
    return null // Will redirect
  }

  return <>{children}</>
}