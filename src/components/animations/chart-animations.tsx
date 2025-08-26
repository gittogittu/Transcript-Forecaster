"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface AnimatedChartContainerProps {
  children: ReactNode
  className?: string
  isLoading?: boolean
}

export function AnimatedChartContainer({ 
  children, 
  className, 
  isLoading 
}: AnimatedChartContainerProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg"
          >
            <motion.div
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface ChartDataTransitionProps {
  children: ReactNode
  dataKey: string | number
  className?: string
}

export function ChartDataTransition({ 
  children, 
  dataKey, 
  className 
}: ChartDataTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={dataKey}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

interface AnimatedMetricCardProps {
  title: string
  value: string | number
  change?: number
  className?: string
  delay?: number
}

export function AnimatedMetricCard({ 
  title, 
  value, 
  change, 
  className, 
  delay = 0 
}: AnimatedMetricCardProps) {
  return (
    <motion.div
      className={cn(
        "p-6 bg-card text-card-foreground rounded-lg border shadow-sm",
        className
      )}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}
    >
      <motion.h3
        className="text-sm font-medium text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.1 }}
      >
        {title}
      </motion.h3>
      
      <motion.div
        className="text-2xl font-bold mt-2"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
      >
        {value}
      </motion.div>
      
      {change !== undefined && (
        <motion.div
          className={cn(
            "text-sm mt-2 flex items-center",
            change >= 0 ? "text-green-600" : "text-red-600"
          )}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + 0.3 }}
        >
          <motion.span
            animate={{ rotate: change >= 0 ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            ↗
          </motion.span>
          {Math.abs(change)}%
        </motion.div>
      )}
    </motion.div>
  )
}

interface StaggeredListProps {
  children: ReactNode[]
  className?: string
  staggerDelay?: number
}

export function StaggeredList({ 
  children, 
  className, 
  staggerDelay = 0.1 
}: StaggeredListProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            duration: 0.3, 
            delay: index * staggerDelay,
            ease: "easeOut"
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

interface CountUpAnimationProps {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function CountUpAnimation({ 
  value, 
  duration = 1, 
  className, 
  prefix = "", 
  suffix = "" 
}: CountUpAnimationProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span
        initial={{ textContent: "0" }}
        animate={{ textContent: value.toString() }}
        transition={{ 
          duration,
          ease: "easeOut",
          onUpdate: (latest) => {
            // This would need a custom implementation for actual counting
            // For now, we'll just show the final value
          }
        }}
      >
        {prefix}{value}{suffix}
      </motion.span>
    </motion.span>
  )
}

interface FadeInViewProps {
  children: ReactNode
  className?: string
  threshold?: number
}

export function FadeInView({ 
  children, 
  className, 
  threshold = 0.1 
}: FadeInViewProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: threshold }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}