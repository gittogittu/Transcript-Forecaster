'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Database,
  Home,
  Users,
  FolderKanban
} from 'lucide-react'

const navigationItems = [
  {
    name: 'Home',
    href: '/',
    icon: Home
  },
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderKanban
  },
  {
    name: 'Data Sources',
    href: '/clients',
    icon: Users
  },
  {
    name: 'Import Data',
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
          <Link href="/" className="text-xl font-semibold text-gray-900">
            Universal Analytics
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
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}