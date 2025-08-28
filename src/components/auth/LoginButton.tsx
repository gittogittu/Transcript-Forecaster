"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogIn, LogOut, User, Settings, Shield } from "lucide-react"
import { ExtendedSession } from "@/lib/auth"

interface LoginButtonProps {
  className?: string
}

export function LoginButton({ className }: LoginButtonProps) {
  const { data: session, status } = useSession() as { 
    data: ExtendedSession | null, 
    status: string 
  }

  if (status === "loading") {
    return (
      <Button variant="ghost" className={className} disabled>
        Loading...
      </Button>
    )
  }

  if (!session) {
    return (
      <Button 
        onClick={() => signIn()} 
        className={className}
        variant="default"
      >
        <LogIn className="w-4 h-4 mr-2" />
        Sign In
      </Button>
    )
  }

  const user = session.user
  const roleColors = {
    admin: "text-red-600",
    analyst: "text-blue-600", 
    viewer: "text-green-600"
  }

  const roleIcons = {
    admin: Shield,
    analyst: Settings,
    viewer: User
  }

  const RoleIcon = roleIcons[user.role]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`relative h-8 w-8 rounded-full ${className}`}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || ""} alt={user.name || ""} />
            <AvatarFallback>
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <div className={`flex items-center text-xs ${roleColors[user.role]}`}>
              <RoleIcon className="w-3 h-3 mr-1" />
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}