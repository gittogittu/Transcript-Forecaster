"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import { UserRole, ExtendedSession } from "@/lib/auth"
import { 
  BarChart3, 
  Database, 
  TrendingUp, 
  FileText,
  Settings,
  Home,
  Clock,
  Shield,
  Users
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

export function DashboardNavigation() {
  const pathname = usePathname()
  const { data: session } = useSession() as { data: ExtendedSession | null }
  
  const userRole = session?.user?.role || 'viewer'
  
  // Filter navigation items based on user role
  const accessibleItems = navigationItems.filter(item => hasAccess(userRole, item))
  const accessibleAdminItems = adminItems.filter(item => hasAccess(userRole, item))

  return (
    <NavigationMenu className="hidden md:flex">
      <NavigationMenuList>
        {accessibleItems.map((item, index) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <NavigationMenuItem key={item.href}>
              <NavigationMenuLink asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 relative",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </motion.div>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
        
        <NavigationMenuItem>
          <NavigationMenuTrigger className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>More</span>
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid gap-3 p-6 w-[500px] lg:w-[600px]">
              <div className="grid gap-3 lg:grid-cols-2">
                {/* AHT Analytics - Available to all roles */}
                <NavigationMenuLink asChild>
                  <Link
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-blue-50 to-blue-100 p-6 no-underline outline-none focus:shadow-md"
                    href="/analytics/aht"
                  >
                    <Clock className="h-6 w-6 text-blue-600" />
                    <div className="mb-2 mt-4 text-lg font-medium">
                      AHT Analytics
                    </div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      Average Handling Time performance insights and client analytics.
                    </p>
                  </Link>
                </NavigationMenuLink>
                
                {/* Settings - Available to all roles */}
                <NavigationMenuLink asChild>
                  <Link
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                    href="/dashboard/settings"
                  >
                    <Settings className="h-6 w-6" />
                    <div className="mb-2 mt-4 text-lg font-medium">
                      Settings
                    </div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      Configure your analytics platform preferences and integrations.
                    </p>
                  </Link>
                </NavigationMenuLink>
                
                {/* Admin items - Only for admin users */}
                {accessibleAdminItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavigationMenuLink key={item.href} asChild>
                      <Link
                        className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-red-50 to-red-100 p-6 no-underline outline-none focus:shadow-md"
                        href={item.href}
                      >
                        <Icon className="h-6 w-6 text-red-600" />
                        <div className="mb-2 mt-4 text-lg font-medium">
                          {item.title}
                        </div>
                        <p className="text-sm leading-tight text-muted-foreground">
                          {item.description}
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  )
                })}
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}