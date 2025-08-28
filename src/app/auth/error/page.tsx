import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

interface ErrorPageProps {
  searchParams: {
    error?: string
    error_description?: string
  }
}

export default function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const error = searchParams.error
  const errorDescription = searchParams.error_description

  const getErrorMessage = (error: string) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration."
      case "AccessDenied":
        return "Access denied. You do not have permission to sign in."
      case "Verification":
        return "The verification token has expired or has already been used."
      case "OAuthCallback":
        return "OAuth callback error. There might be an issue with the OAuth configuration."
      case "Default":
      default:
        return "An error occurred during authentication."
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Sign In Failed</CardTitle>
            <CardDescription>
              {getErrorMessage(error || "Default")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Please try signing in again. If the problem persists, contact support.
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm font-medium text-red-800">Error Code: {error}</p>
                {errorDescription && (
                  <p className="text-sm text-red-600 mt-1">{errorDescription}</p>
                )}
              </div>
            )}
            <div className="flex space-x-4">
              <Button asChild className="flex-1">
                <Link href="/auth/signin">
                  Try Again
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/">
                  Go Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}