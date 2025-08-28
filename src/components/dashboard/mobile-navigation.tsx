"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { UserRole, ExtendedSession } from "@/lib/auth"
import { 
  Menu,
  BarChart3, 
  Database, 
  TrendingUp, 
  FileText,
  Settings,
  Home,
  Clock,
  Shield,
  Users,
  X
} from "lucide-react"

interface NavigationItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  requiredRole?: UserRole
  allowedRoles?: UserRole[]
}

const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Overview and key metrics",
    allowedRoles: ["viewer", "analyst", "admin"]
  },
  {
    title: "Data",
    href: "/dashboard/data",
    icon: Database,
    description: "Manage transcript data",
    allowedRoles: ["analyst", "admin"]
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "View trends and insights",
    allowedRoles: ["viewer", "analyst", "admin"]
  },
  {
    title: "Predictions",
    href: "/dashboard/predictions",
    icon: TrendingUp,
    description: "Forecast future volumes",
    allowedRoles: ["analyst", "admin"]
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
    description: "Generate detailed reports",
    allowedRoles: ["viewer", "analyst", "admin"]
  },
  {
    title: "AHT Analytics",
    href: "/analytics/aht",
    icon: Clock,
    description: "Average Handling Time insights",
    allowedRoles: ["viewer", "analyst", "admin"]
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    description: "Configure preferences",
    allowedRoles: ["viewer", "analyst", "admin"]
  }
]

const adminItems: NavigationItem[] = [
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
    description: "Manage user accounts and roles",
    requiredRole: "admin"
  },
  {
    title: "Performance",
    href: "/admin/performance",
    icon: Shield,
    description: "System performance monitoring",
    requiredRole: "admin"
  }
]

function hasAccess(userRole: UserRole, item: NavigationItem): boolean {
  if (item.requiredRole) {
    return userRole === item.requiredRole
  }
  if (item.allowedRoles) {
    return item.allowedRoles.includes(userRole)
  }
  return true
}

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession() as { data: ExtendedSession | null }
  
  const userRole = session?.user?.role || 'viewer'
  
  // Filter navigation items based on user role
  const accessibleItems = navigationItems.filter(item => hasAccess(userRole, item))
  const accessibleAdminItems = adminItems.filter(item => hasAccess(userRole, item))
  
  const allAccessibleItems = [...accessibleItems, ...accessibleAdminItems]

  const handleLinkClick = () => {
    setIsOpen(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">TA</span>
              </div>
              <h2 className="text-lg font-semibold">Navigation</h2>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-2 px-4">
              {allAccessibleItems.map((item, index) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                const isAdminItem = adminItems.includes(item)
                
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                        isActive && "bg-accent text-accent-foreground",
                        isAdminItem && "border border-red-200 bg-red-50/50"
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4",
                        isAdminItem && "text-red-600"
                      )} />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span>{item.title}</span>
                          {isAdminItem && (
                            <Badge variant="destructive" className="text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      
                      {isActive && (
                        <motion.div
                          layoutId="activeMobileTab"
                          className="w-1 h-6 bg-primary rounded-full"
                          initial={false}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}
                    </Link>
                  </motion.div>
                )
              })}
            </nav>
          </div>

          {/* User Role Info */}
          {session?.user && (
            <div className="border-t p-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {session.user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {userRole} Access
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}