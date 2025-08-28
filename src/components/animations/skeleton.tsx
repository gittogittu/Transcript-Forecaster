"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  animate?: boolean
}

export function Skeleton({ className, animate = true }: SkeletonProps) {
  const Component = animate ? motion.div : "div"

  return (
    <Component
      className={cn("bg-muted rounded-md", className)}
      {...(animate && {
        animate: {
          opacity: [0.5, 1, 0.5]
        },
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }
      })}
    />
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="flex space-x-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          className="flex space-x-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </motion.div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <motion.div
      className="p-6 border rounded-lg space-y-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
      </div>
    </motion.div>
  )
}

export function ChartSkeleton() {
  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Chart title */}
      <Skeleton className="h-6 w-48" />

      {/* Chart area */}
      <div className="relative h-64 bg-muted rounded-lg p-4">
        {/* Y-axis labels */}
        <div className="absolute left-2 top-4 space-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>

        {/* Chart bars/lines */}
        <div className="ml-12 mt-4 flex items-end space-x-2 h-48">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="bg-primary/20 rounded-t"
              style={{
                width: '20px',
                height: `${Math.random() * 80 + 20}%`
              }}
              initial={{ height: 0 }}
              animate={{ height: `${Math.random() * 80 + 20}%` }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            />
          ))}
        </div>

        {/* X-axis labels */}
        <div className="ml-12 mt-2 flex space-x-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-5" />
          ))}
        </div>
      </div>
    </motion.div>
  )
}