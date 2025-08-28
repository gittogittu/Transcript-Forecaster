"use client"

import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogoutButton } from "./logout-button"
import { User, Settings, LogOut, Shield, Eye, BarChart3 } from "lucide-react"
import { signOut } from "next-auth/react"
import { ExtendedSession, UserRole } from "@/lib/auth"
import { cn } from "@/lib/utils"

const roleConfig = {
  admin: {
    label: "Administrator",
    icon: Shield,
    color: "bg-red-100 text-red-800 hover:bg-red-100",
    description: "Full system access"
  },
  analyst: {
    label: "Analyst",
    icon: BarChart3,
    color: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    description: "Data analysis and predictions"
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    description: "Read-only access"
  }
} as const

export function UserProfile() {
  const { data: session, status } = useSession() as { 
    data: ExtendedSession | null, 
    status: string 
  }

  if (status === "loading") {
    return (
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
    )
  }

  if (!session?.user) {
    return null
  }

  const { user } = session
  const userRole = user.role || 'viewer'
  const roleInfo = roleConfig[userRole]
  const RoleIcon = roleInfo.icon

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || ""} alt={user.name || ""} />
            <AvatarFallback>
              {user.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          {/* Role indicator */}
          <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-white border border-gray-200 flex items-center justify-center">
            <RoleIcon className="h-2 w-2 text-gray-600" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground mt-1">
                  {user.email}
                </p>
              </div>
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.image || ""} alt={user.name || ""} />
                <AvatarFallback>
                  {user.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={cn("flex items-center space-x-1", roleInfo.color)}>
                <RoleIcon className="h-3 w-3" />
                <span className="text-xs">{roleInfo.label}</span>
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {roleInfo.description}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">
          <div className="flex flex-col space-y-1">
            <span>Session Details</span>
            <span className="text-muted-foreground/70">
              Provider: {session.provider || "Unknown"}
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Account Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}