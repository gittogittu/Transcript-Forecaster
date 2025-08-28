"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const getErrorDetails = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return {
          title: "Server Configuration Error",
          description: "There is a problem with the server configuration.",
          suggestion: "Please contact the administrator."
        }
      case "AccessDenied":
        return {
          title: "Access Denied",
          description: "You do not have permission to sign in.",
          suggestion: "Please contact an administrator to request access."
        }
      case "Verification":
        return {
          title: "Verification Error",
          description: "The verification token has expired or has already been used.",
          suggestion: "Please try signing in again."
        }
      case "Default":
      default:
        return {
          title: "Authentication Error",
          description: "An error occurred during authentication.",
          suggestion: "Please try signing in again."
        }
    }
  }

  const errorDetails = getErrorDetails(error)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-900">
            {errorDetails.title}
          </CardTitle>
          <CardDescription className="text-red-700">
            {errorDetails.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {errorDetails.suggestion}
            </p>
            
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/auth/signin">
                  Try Again
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  Go Home
                </Link>
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-3 bg-gray-100 rounded text-xs text-gray-600">
              <strong>Error Code:</strong> {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}