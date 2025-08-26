"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ReactNode, useState } from "react"
import { cn } from "@/lib/utils"

interface AnimatedInputProps {
  children: ReactNode
  className?: string
  error?: string
  label?: string
}

export function AnimatedInput({ children, className, error, label }: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(false)

  return (
    <motion.div
      className={cn("relative", className)}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      {label && (
        <motion.label
          className={cn(
            "absolute left-3 text-sm text-muted-foreground pointer-events-none transition-all duration-200",
            (isFocused || hasValue) ? "-top-2 text-xs bg-background px-1" : "top-3"
          )}
          animate={{
            y: (isFocused || hasValue) ? -8 : 0,
            scale: (isFocused || hasValue) ? 0.85 : 1,
            color: isFocused ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"
          }}
          transition={{ duration: 0.2 }}
        >
          {label}
        </motion.label>
      )}
      
      <motion.div
        animate={{
          borderColor: isFocused 
            ? "hsl(var(--primary))" 
            : error 
            ? "hsl(var(--destructive))" 
            : "hsl(var(--border))"
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
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
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