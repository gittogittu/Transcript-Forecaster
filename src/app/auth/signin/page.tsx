"use client"

import { getProviders, signIn, getSession } from "next-auth/react"
import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Github, Chrome, Shield } from "lucide-react"

interface Provider {
  id: string
  name: string
  type: string
  signinUrl: string
  callbackUrl: string
}

const providerIcons = {
  google: Chrome,
  github: Github,
  auth0: Shield,
}

function SignInContent() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const error = searchParams.get("error")

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders()
      setProviders(res)
    }
    fetchProviders()
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        router.push(callbackUrl)
      }
    }
    checkSession()
  }, [router, callbackUrl])

  const handleSignIn = async (providerId: string) => {
    setLoading(providerId)
    try {
      await signIn(providerId, { callbackUrl })
    } catch (error) {
      console.error("Sign in error:", error)
    } finally {
      setLoading(null)
    }
  }

  const getErrorMessage = (error: string) => {
    switch (error) {
      case "OAuthSignin":
        return "Error occurred during OAuth sign in"
      case "OAuthCallback":
        return "Error occurred during OAuth callback"
      case "OAuthCreateAccount":
        return "Could not create OAuth account"
      case "EmailCreateAccount":
        return "Could not create email account"
      case "Callback":
        return "Error occurred during callback"
      case "OAuthAccountNotLinked":
        return "OAuth account is not linked to an existing account"
      case "EmailSignin":
        return "Check your email for a sign in link"
      case "CredentialsSignin":
        return "Invalid credentials"
      case "SessionRequired":
        return "Please sign in to access this page"
      default:
        return "An error occurred during sign in"
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Sign in to Transcript Analytics
          </CardTitle>
          <CardDescription>
            Choose your preferred authentication method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {getErrorMessage(error)}
            </div>
          )}

          {providers && Object.values(providers).map((provider) => {
            const Icon = providerIcons[provider.id as keyof typeof providerIcons]
            
            return (
              <div key={provider.name}>
                <Button
                  onClick={() => handleSignIn(provider.id)}
                  disabled={loading === provider.id}
                  className="w-full"
                  variant="outline"
                >
                  {loading === provider.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
                  ) : (
                    Icon && <Icon className="w-4 h-4 mr-2" />
                  )}
                  {loading === provider.id 
                    ? "Signing in..." 
                    : `Sign in with ${provider.name}`
                  }
                </Button>
                {provider.id !== Object.values(providers)[Object.values(providers).length - 1].id && (
                  <Separator className="my-4" />
                )}
              </div>
            )
          })}

          <div className="text-center text-sm text-muted-foreground mt-6">
            <p>By signing in, you agree to our terms of service.</p>
            <p className="mt-2">
              New users will be assigned viewer role by default.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}