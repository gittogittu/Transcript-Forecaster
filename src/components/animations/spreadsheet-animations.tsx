"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface AnimatedCellProps {
  children: ReactNode
  className?: string
  isSelected?: boolean
  isEditing?: boolean
  hasError?: boolean
  isDirty?: boolean
  onClick?: () => void
  onDoubleClick?: () => void
  onHover?: (isHovered: boolean) => void
}

export function AnimatedCell({
  children,
  className,
  isSelected = false,
  isEditing = false,
  hasError = false,
  isDirty = false,
  onClick,
  onDoubleClick,
  onHover
}: AnimatedCellProps) {
  return (
    <motion.td
      className={cn(
        "border-b border-r p-2 relative cursor-pointer transition-colors",
        isSelected && "ring-2 ring-primary ring-inset",
        hasError && "bg-red-50",
        isDirty && "bg-yellow-50",
        className
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onHoverStart={() => onHover?.(true)}
      onHoverEnd={() => onHover?.(false)}
      whileHover={{
        backgroundColor: isSelected ? undefined : "rgba(59, 130, 246, 0.05)",
        scale: 1.01,
        transition: { duration: 0.15 }
      }}
      whileTap={{
        scale: 0.99,
        transition: { duration: 0.1 }
      }}
      animate={{
        backgroundColor: isSelected 
          ? "rgba(59, 130, 246, 0.1)" 
          : hasError 
          ? "rgba(239, 68, 68, 0.05)"
          : isDirty
          ? "rgba(245, 158, 11, 0.05)"
          : "transparent",
        borderColor: isSelected 
          ? "rgb(59, 130, 246)" 
          : hasError 
          ? "rgb(239, 68, 68)"
          : "rgb(229, 231, 235)"
      }}
      transition={{ duration: 0.2 }}
    >
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status indicators with animations */}
      <div className="absolute top-1 right-1 flex gap-1">
        <AnimatePresence>
          {isDirty && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-2 w-2 bg-yellow-400 rounded-full"
            />
          )}
          {hasError && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-2 w-2 bg-red-500 rounded-full"
            />
          )}
        </AnimatePresence>
      </div>
    </motion.td>
  )
}

interface AnimatedRowProps {
  children: ReactNode
  className?: string
  index: number
  isNew?: boolean
  onDelete?: () => void
}

export function AnimatedRow({ 
  children, 
  className, 
  index, 
  isNew = false,
  onDelete 
}: AnimatedRowProps) {
  return (
    <motion.tr
      className={cn(
        "hover:bg-muted/50 transition-colors",
        index % 2 === 0 ? "bg-background" : "bg-muted/20",
        isNew && "bg-blue-50",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100, height: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: Math.min(index * 0.05, 0.5),
        layout: { duration: 0.2 }
      }}
      whileHover={{
        backgroundColor: "rgba(59, 130, 246, 0.02)",
        transition: { duration: 0.15 }
      }}
      layout
    >
      {children}
    </motion.tr>
  )
}

interface AnimatedTableHeaderProps {
  children: ReactNode
  className?: string
  sortable?: boolean
  sortDirection?: 'asc' | 'desc' | null
  onSort?: () => void
}

export function AnimatedTableHeader({
  children,
  className,
  sortable = false,
  sortDirection = null,
  onSort
}: AnimatedTableHeaderProps) {
  return (
    <motion.th
      className={cn(
        "border-b border-r p-2 text-left font-medium text-sm bg-muted/50",
        sortable && "cursor-pointer select-none",
        className
      )}
      onClick={sortable ? onSort : undefined}
      whileHover={sortable ? {
        backgroundColor: "rgba(59, 130, 246, 0.05)",
        transition: { duration: 0.15 }
      } : {}}
      whileTap={sortable ? {
        scale: 0.98,
        transition: { duration: 0.1 }
      } : {}}
    >
      <div className="flex items-center gap-2">
        {children}
        <AnimatePresence>
          {sortable && sortDirection && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                animate={{ 
                  rotate: sortDirection === 'desc' ? 180 : 0 
                }}
                transition={{ duration: 0.2 }}
                className="text-primary"
              >
                ↑
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.th>
  )
}

interface SpreadsheetLoadingOverlayProps {
  isVisible: boolean
  message?: string
}

export function SpreadsheetLoadingOverlay({ 
  isVisible, 
  message = "Loading..." 
}: SpreadsheetLoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex items-center gap-3 bg-card p-4 rounded-lg shadow-lg border"
          >
            <motion.div
              className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span className="text-sm font-medium">{message}</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface CellErrorTooltipProps {
  isVisible: boolean
  message: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function CellErrorTooltip({ 
  isVisible, 
  message, 
  position = 'top' 
}: CellErrorTooltipProps) {
  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2"
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute z-50 px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded shadow-lg whitespace-nowrap",
            positionClasses[position]
          )}
        >
          {message}
          <div className={cn(
            "absolute w-2 h-2 bg-destructive transform rotate-45",
            position === 'top' && "top-full left-1/2 -translate-x-1/2 -mt-1",
            position === 'bottom' && "bottom-full left-1/2 -translate-x-1/2 -mb-1",
            position === 'left' && "left-full top-1/2 -translate-y-1/2 -ml-1",
            position === 'right' && "right-full top-1/2 -translate-y-1/2 -mr-1"
          )} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface AnimatedInputProps {
  children: ReactNode
  className?: string
  isFocused?: boolean
  hasError?: boolean
  autoFocus?: boolean
}

export function AnimatedInput({ 
  children, 
  className, 
  isFocused = false, 
  hasError = false,
  autoFocus = false 
}: AnimatedInputProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      initial={autoFocus ? { scale: 0.95, opacity: 0 } : false}
      animate={{ 
        scale: 1, 
        opacity: 1,
        borderColor: hasError 
          ? "rgb(239, 68, 68)" 
          : isFocused 
          ? "rgb(59, 130, 246)" 
          : "rgb(229, 231, 235)"
      }}
      transition={{ duration: 0.2 }}
      whileFocus={{
        scale: 1.02,
        transition: { duration: 0.15 }
      }}
    >
      {children}
    </motion.div>
  )
}

interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
  className?: string
}

export function SaveIndicator({ status, className }: SaveIndicatorProps) {
  const statusConfig = {
    idle: { color: "text-muted-foreground", icon: "○", message: "" },
    saving: { color: "text-blue-500", icon: "⟳", message: "Saving..." },
    saved: { color: "text-green-500", icon: "✓", message: "Saved" },
    error: { color: "text-red-500", icon: "✗", message: "Error" }
  }

  const config = statusConfig[status]

  return (
    <AnimatePresence mode="wait">
      {status !== 'idle' && (
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex items-center gap-1 text-xs",
            config.color,
            className
          )}
        >
          <motion.span
            animate={status === 'saving' ? { rotate: 360 } : {}}
            transition={status === 'saving' ? { 
              duration: 1, 
              repeat: Infinity, 
              ease: "linear" 
            } : {}}
          >
            {config.icon}
          </motion.span>
          {config.message && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              {config.message}
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}