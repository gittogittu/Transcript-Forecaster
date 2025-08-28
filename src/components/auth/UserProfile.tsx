"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Shield, Settings, User, Calendar } from "lucide-react"
import { ExtendedSession } from "@/lib/auth"

export function UserProfile() {
  const { data: session, status } = useSession() as { 
    data: ExtendedSession | null, 
    status: string 
  }

  if (status === "loading") {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Not signed in</p>
        </CardContent>
      </Card>
    )
  }

  const user = session.user

  const roleConfig = {
    admin: {
      color: "destructive",
      icon: Shield,
      description: "Full system access and user management"
    },
    analyst: {
      color: "default",
      icon: Settings,
      description: "Data analysis and prediction capabilities"
    },
    viewer: {
      color: "secondary",
      icon: User,
      description: "Read-only access to dashboards and reports"
    }
  } as const

  const config = roleConfig[user.role]
  const RoleIcon = config.icon

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.image || ""} alt={user.name || ""} />
            <AvatarFallback>
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-lg font-semibold">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </CardTitle>
        <CardDescription>
          User profile and role information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Role</span>
          <Badge variant={config.color} className="flex items-center gap-1">
            <RoleIcon className="w-3 h-3" />
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {config.description}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>User ID: {user.id}</span>
        </div>
      </CardContent>
    </Card>
  )
}