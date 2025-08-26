"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
  color?: "primary" | "secondary" | "muted"
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6", 
  lg: "w-8 h-8"
}

const colorClasses = {
  primary: "border-primary",
  secondary: "border-secondary",
  muted: "border-muted-foreground"
}

export function LoadingSpinner({ 
  size = "md", 
  className,
  color = "primary" 
}: LoadingSpinnerProps) {
  return (
    <motion.div
      className={cn(
        "border-2 border-t-transparent rounded-full",
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  )
}

interface PulsingDotsProps {
  className?: string
  dotCount?: number
}

export function PulsingDots({ className, dotCount = 3 }: PulsingDotsProps) {
  return (
    <div className={cn("flex space-x-1", className)}>
      {Array.from({ length: dotCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-primary rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  )
}

interface LoadingBarProps {
  className?: string
  progress?: number
}

export function LoadingBar({ className, progress }: LoadingBarProps) {
  return (
    <div className={cn("w-full bg-muted rounded-full h-2", className)}>
      <motion.div
        className="bg-primary h-2 rounded-full"
        initial={{ width: 0 }}
        animate={{ 
          width: progress !== undefined ? `${progress}%` : "100%" 
        }}
        transition={{
          duration: progress !== undefined ? 0.3 : 2,
          repeat: progress !== undefined ? 0 : Infinity,
          repeatType: progress !== undefined ? "loop" : "reverse",
          ease: "easeInOut"
        }}
      />
    </div>
  )
}