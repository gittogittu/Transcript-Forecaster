"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ExtendedSession } from "@/lib/auth"

export default function UnauthorizedPage() {
  const { data: session } = useSession() as { 
    data: ExtendedSession | null 
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <Shield className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Access Denied
          </CardTitle>
          <CardDescription>
            You don't have permission to access this resource
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            {session && (
              <div className="mb-4 p-3 bg-gray-100 rounded">
                <p className="text-sm text-gray-600">
                  <strong>Current Role:</strong> {session.user.role}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>User:</strong> {session.user.email}
                </p>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground mb-4">
              This page requires higher privileges than your current role allows. 
              Please contact an administrator if you believe you should have access.
            </p>
            
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  Go Home
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500 text-center">
            <p>Role Hierarchy: Viewer → Analyst → Admin</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}