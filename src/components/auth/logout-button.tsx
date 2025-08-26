"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

interface LogoutButtonProps {
  callbackUrl?: string
  className?: string
  variant?: "default" | "outline" | "ghost"
}

export function LogoutButton({ 
  callbackUrl = "/", 
  className,
  variant = "outline"
}: LogoutButtonProps) {
  const handleSignOut = () => {
    signOut({ callbackUrl })
  }

  return (
    <Button
      onClick={handleSignOut}
      variant={variant}
      className={className}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sign out
    </Button>
  )
}