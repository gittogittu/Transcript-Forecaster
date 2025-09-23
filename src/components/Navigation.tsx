'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Database,
  Home,
  Settings,
  Users,
  Brain,
  Zap
} from 'lucide-react'

const navigationItems = [
  {
    name: 'Home',
    href: '/',
    icon: Home
  },
  {
    name: 'Enhanced Dashboard',
    href: '/analytics/enhanced-dashboard',
    icon: Brain,
    badge: 'NEW'
  },
  {
    name: 'Interactive Dashboard',
    href: '/analytics/interactive-dashboard',
    icon: BarChart3
  },
  {
    name: 'Comprehensive Analytics',
    href: '/analytics/comprehensive-dashboard',
    icon: TrendingUp
  },
  {
    name: 'Analytics Dashboard',
    href: '/analytics/dashboard',
    icon: AlertTriangle
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: Users
  },
  {
    name: 'Data Import',
    href: '/data/import',
    icon: Database
  }
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Analytics Platform
          </Link>
          
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center space-x-2 relative"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </nav>
  )
}