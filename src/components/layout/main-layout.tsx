"use client"

import { useSession } from "next-auth/react"
import { Header } from "./header"
import { cn } from "@/lib/utils"

interface MainLayoutProps {
  children: React.ReactNode
  className?: string
  showHeader?: boolean
}

export function MainLayout({ 
  children, 
  className,
  showHeader = true 
}: MainLayoutProps) {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-background">
      {showHeader && <Header />}
      <main className={cn(
        "flex-1",
        showHeader && "pt-0", // Header is sticky, so no padding needed
        className
      )}>
        {children}
      </main>
    </div>
  )
}