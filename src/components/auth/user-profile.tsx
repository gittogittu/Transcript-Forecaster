"use client"

import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogoutButton } from "./logout-button"
import { User } from "lucide-react"

export function UserProfile() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!session?.user) {
    return null
  }

  const { user } = session

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.image || ""} alt={user.name || ""} />
            <AvatarFallback>
              {user.name ? user.name.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle>{user.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </CardHeader>
      <CardContent className="text-center">
        <div className="space-y-2 mb-4">
          <p className="text-sm">
            <span className="font-medium">Role:</span> {user.role || "user"}
          </p>
          <p className="text-sm">
            <span className="font-medium">Provider:</span> {session.provider}
          </p>
        </div>
        <LogoutButton className="w-full" />
      </CardContent>
    </Card>
  )
}