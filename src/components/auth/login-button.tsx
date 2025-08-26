"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"

interface LoginButtonProps {
  provider?: string
  callbackUrl?: string
  className?: string
}

export function LoginButton({ 
  provider = "auth0", 
  callbackUrl = "/dashboard",
  className 
}: LoginButtonProps) {
  const handleSignIn = () => {
    signIn(provider, { callbackUrl })
  }

  const getProviderName = (provider: string) => {
    switch (provider) {
      case "auth0":
        return "Auth0"
      case "google":
        return "Google"
      case "github":
        return "GitHub"
      default:
        return "OAuth"
    }
  }

  return (
    <Button
      onClick={handleSignIn}
      className={className}
      size="lg"
    >
      <LogIn className="mr-2 h-4 w-4" />
      Sign in with {getProviderName(provider)}
    </Button>
  )
}