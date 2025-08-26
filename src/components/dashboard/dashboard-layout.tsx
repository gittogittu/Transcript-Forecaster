"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"
import { DashboardNavigation } from "./dashboard-navigation"
import { UserProfile } from "@/components/auth/user-profile"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: ReactNode
  className?: string
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center space-x-2"
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">TA</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Transcript Analytics
              </h1>
            </motion.div>
          </div>
          
          <div className="flex items-center space-x-4">
            <DashboardNavigation />
            <UserProfile />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn("container mx-auto px-4 py-6", className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}