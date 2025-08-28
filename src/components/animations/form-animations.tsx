"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ReactNode, useState } from "react"
import { cn } from "@/lib/utils"

interface AnimatedInputProps {
  children: ReactNode
  className?: string
  error?: string
  label?: string
  success?: boolean
  loading?: boolean
}

export function AnimatedInput({ 
  children, 
  className, 
  error, 
  label, 
  success = false,
  loading = false 
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(false)

  return (
    <motion.div
      className={cn("relative", className)}
      whileHover={{ 
        scale: 1.01,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.99 }}
    >
      {label && (
        <motion.label
          className={cn(
            "absolute left-3 text-sm pointer-events-none transition-all duration-200 z-10",
            (isFocused || hasValue) ? "-top-2 text-xs bg-background px-1" : "top-3"
          )}
          animate={{
            y: (isFocused || hasValue) ? -8 : 0,
            scale: (isFocused || hasValue) ? 0.85 : 1,
            color: error 
              ? "hsl(var(--destructive))"
              : success
              ? "hsl(var(--success))"
              : isFocused 
              ? "hsl(var(--primary))" 
              : "hsl(var(--muted-foreground))"
          }}
          transition={{ duration: 0.2 }}
        >
          {label}
        </motion.label>
      )}
      
      <motion.div
        animate={{
          borderColor: error 
            ? "hsl(var(--destructive))"
            : success
            ? "hsl(var(--success))"
            : isFocused 
            ? "hsl(var(--primary))" 
            : "hsl(var(--border))",
          boxShadow: isFocused 
            ? error
              ? "0 0 0 2px hsla(var(--destructive), 0.2)"
              : success
              ? "0 0 0 2px hsla(var(--success), 0.2)"
              : "0 0 0 2px hsla(var(--primary), 0.2)"
            : "none"
        }}
        transition={{ duration: 0.2 }}
        className="relative"
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          setIsFocused(false)
          setHasValue(e.target.value !== "")
        }}
      >
        {children}
        
        {/* Status indicators */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
            )}
            {success && !loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                className="text-green-500"
              >
                ✓
              </motion.div>
            )}
            {error && !loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                className="text-red-500"
              >
                ✗
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-destructive mt-1 flex items-center gap-1"
          >
            <motion.span
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              transition={{ duration: 0.2 }}
            >
              ⚠
            </motion.span>
            {error}
          </motion.div>
        )}
        {success && !error && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-green-600 mt-1 flex items-center gap-1"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              ✓
            </motion.span>
            Looks good!
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface AnimatedButtonProps {
  children: ReactNode
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
}

export function AnimatedButton({ 
  children, 
  className, 
  disabled, 
  loading,
  onClick,
  ...props 
}: AnimatedButtonProps) {
  return (
    <motion.button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        "h-9 px-4 py-2",
        className
      )}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ duration: 0.1 }}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2"
          >
            <motion.div
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span>Loading...</span>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

interface AnimatedSelectProps {
  children: ReactNode
  className?: string
  error?: string
  label?: string
}

export function AnimatedSelect({ children, className, error, label }: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.div
      className={cn("relative", className)}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      {label && (
        <motion.label
          className="block text-sm font-medium text-foreground mb-2"
          animate={{
            color: isOpen ? "hsl(var(--primary))" : "hsl(var(--foreground))"
          }}
          transition={{ duration: 0.2 }}
        >
          {label}
        </motion.label>
      )}
      
      <motion.div
        animate={{
          borderColor: isOpen 
            ? "hsl(var(--primary))" 
            : error 
            ? "hsl(var(--destructive))" 
            : "hsl(var(--border))"
        }}
        transition={{ duration: 0.2 }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      >
        {children}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-destructive mt-1"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface FormFieldAnimationProps {
  children: ReactNode
  delay?: number
}

export function FormFieldAnimation({ children, delay = 0 }: FormFieldAnimationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      {children}
    </motion.div>
  )
}

interface AnimatedFormProps {
  children: ReactNode | ReactNode[]
  className?: string
  staggerDelay?: number
}

export function AnimatedForm({ 
  children, 
  className, 
  staggerDelay = 0.1 
}: AnimatedFormProps) {
  const childrenArray = Array.isArray(children) ? children : [children]
  
  return (
    <motion.form
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {childrenArray.map((child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.3,
                ease: "easeOut"
              }
            }
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.form>
  )
}

interface HoverCardProps {
  children: ReactNode
  className?: string
  hoverScale?: number
  clickScale?: number
}

export function HoverCard({ 
  children, 
  className, 
  hoverScale = 1.02,
  clickScale = 0.98 
}: HoverCardProps) {
  return (
    <motion.div
      className={cn(
        "cursor-pointer transition-shadow duration-200",
        className
      )}
      whileHover={{ 
        scale: hoverScale,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        transition: { duration: 0.2 }
      }}
      whileTap={{ 
        scale: clickScale,
        transition: { duration: 0.1 }
      }}
    >
      {children}
    </motion.div>
  )
}

interface FocusRingProps {
  children: ReactNode
  className?: string
  isVisible?: boolean
}

export function FocusRing({ children, className, isVisible = false }: FocusRingProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      animate={{
        boxShadow: isVisible 
          ? "0 0 0 2px hsla(var(--primary), 0.5)"
          : "0 0 0 0px hsla(var(--primary), 0)"
      }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}

interface ProgressIndicatorProps {
  progress: number
  className?: string
  showPercentage?: boolean
  animated?: boolean
}

export function ProgressIndicator({ 
  progress, 
  className, 
  showPercentage = false,
  animated = true 
}: ProgressIndicatorProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="w-full bg-muted rounded-full h-2">
        <motion.div
          className="bg-primary h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          transition={animated ? { duration: 0.5, ease: "easeOut" } : { duration: 0 }}
        />
      </div>
      {showPercentage && (
        <motion.div
          className="absolute -top-6 right-0 text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {Math.round(Math.min(Math.max(progress, 0), 100))}%
        </motion.div>
      )}
    </div>
  )
}

interface ValidationMessageProps {
  type: 'error' | 'warning' | 'success' | 'info'
  message: string
  isVisible: boolean
  className?: string
}

export function ValidationMessage({ 
  type, 
  message, 
  isVisible, 
  className 
}: ValidationMessageProps) {
  const config = {
    error: { color: "text-red-600", icon: "⚠", bgColor: "bg-red-50" },
    warning: { color: "text-yellow-600", icon: "⚠", bgColor: "bg-yellow-50" },
    success: { color: "text-green-600", icon: "✓", bgColor: "bg-green-50" },
    info: { color: "text-blue-600", icon: "ℹ", bgColor: "bg-blue-50" }
  }

  const { color, icon, bgColor } = config[type]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -10 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex items-center gap-2 p-2 rounded text-sm",
            color,
            bgColor,
            className
          )}
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            {icon}
          </motion.span>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            {message}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}