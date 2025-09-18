'use client'

import React, { useState, useRef, useCallback } from 'react'
import { motion, PanInfo } from 'framer-motion'
import { DashboardWidget } from '../dashboard/types'
import { useDashboard } from '../dashboard/DashboardProvider'
import { 
  GripVertical, 
  Settings, 
  X, 
  Maximize2, 
  Minimize2,
  RefreshCw,
  MoreVertical
} from 'lucide-react'

interface DraggableWidgetProps {
  widget: DashboardWidget
  children: React.ReactNode
  onResize?: (id: string, size: { width: number; height: number }) => void
  onRemove?: (id: string) => void
  onConfigure?: (id: string) => void
}

export function DraggableWidget({ 
  widget, 
  children, 
  onResize, 
  onRemove, 
  onConfigure 
}: DraggableWidgetProps) {
  const { state, selectWidget, updateLayout } = useDashboard()
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  
  const widgetRef = useRef<HTMLDivElement>(null)
  const isSelected = state.selectedWidget === widget.id
  const isEditing = state.isEditing

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
    selectWidget(widget.id)
  }, [selectWidget, widget.id])

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    setIsDragging(false)
    
    if (Math.abs(info.offset.x) > 5 || Math.abs(info.offset.y) > 5) {
      // Update widget position
      const newPosition = {
        x: Math.max(0, widget.position.x + info.offset.x),
        y: Math.max(0, widget.position.y + info.offset.y)
      }
      
      const updatedWidget = {
        ...widget,
        position: newPosition
      }
      
      const updatedWidgets = state.layout.widgets.map(w => 
        w.id === widget.id ? updatedWidget : w
      )
      
      updateLayout({
        ...state.layout,
        widgets: updatedWidgets
      })
    }
  }, [widget, state.layout, updateLayout])

  const handleResize = useCallback((direction: string, delta: { x: number; y: number }) => {
    if (!onResize) return
    
    const newSize = { ...widget.size }
    
    switch (direction) {
      case 'se': // Southeast (bottom-right)
        newSize.width = Math.max(200, widget.size.width + delta.x)
        newSize.height = Math.max(150, widget.size.height + delta.y)
        break
      case 'sw': // Southwest (bottom-left)
        newSize.width = Math.max(200, widget.size.width - delta.x)
        newSize.height = Math.max(150, widget.size.height + delta.y)
        break
      case 'ne': // Northeast (top-right)
        newSize.width = Math.max(200, widget.size.width + delta.x)
        newSize.height = Math.max(150, widget.size.height - delta.y)
        break
      case 'nw': // Northwest (top-left)
        newSize.width = Math.max(200, widget.size.width - delta.x)
        newSize.height = Math.max(150, widget.size.height - delta.y)
        break
    }
    
    onResize(widget.id, newSize)
  }, [widget, onResize])

  const handleRefresh = useCallback(() => {
    setLastRefresh(new Date())
    // Trigger data refresh for this widget
    // This would typically call an API to refresh the widget's data
  }, [])

  const handleExpand = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  const handleRemove = useCallback(() => {
    if (onRemove) {
      onRemove(widget.id)
    }
  }, [widget.id, onRemove])

  const handleConfigure = useCallback(() => {
    if (onConfigure) {
      onConfigure(widget.id)
    }
    setShowMenu(false)
  }, [widget.id, onConfigure])

  return (
    <motion.div
      ref={widgetRef}
      drag={isEditing && !isResizing}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      initial={{ 
        x: widget.position.x, 
        y: widget.position.y,
        width: widget.size.width,
        height: widget.size.height
      }}
      animate={{ 
        x: widget.position.x, 
        y: widget.position.y,
        width: isExpanded ? '100vw' : widget.size.width,
        height: isExpanded ? '100vh' : widget.size.height,
        zIndex: isExpanded ? 50 : isDragging ? 10 : isSelected ? 5 : 1
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`absolute bg-white rounded-lg shadow-lg border-2 overflow-hidden ${
        isSelected ? 'border-blue-500' : 'border-gray-200'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${
        isExpanded ? 'fixed inset-0 z-50' : ''
      }`}
      style={{
        width: isExpanded ? '100vw' : widget.size.width,
        height: isExpanded ? '100vh' : widget.size.height
      }}
    >
      {/* Widget Header */}
      <div className={`flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 ${
        isEditing ? 'cursor-grab' : ''
      }`}>
        <div className="flex items-center gap-2">
          {isEditing && (
            <GripVertical className="w-4 h-4 text-gray-400" />
          )}
          <h3 className="font-medium text-gray-900 truncate">
            {widget.title}
          </h3>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {/* Expand/Minimize Button */}
          <button
            onClick={handleExpand}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          
          {/* Menu Button */}
          {isEditing && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]"
                >
                  <button
                    onClick={handleConfigure}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Settings className="w-3 h-3" />
                    Configure
                  </button>
                  <button
                    onClick={handleRemove}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <X className="w-3 h-3" />
                    Remove
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Widget Content */}
      <div className="p-4 h-full overflow-auto">
        {children}
      </div>
      
      {/* Resize Handles */}
      {isEditing && !isExpanded && (
        <>
          {/* Southeast handle */}
          <motion.div
            drag
            dragMomentum={false}
            onDragStart={() => setIsResizing(true)}
            onDrag={(event, info) => handleResize('se', info.delta)}
            onDragEnd={() => setIsResizing(false)}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-blue-500 opacity-0 hover:opacity-100 transition-opacity"
            style={{ 
              clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' 
            }}
          />
          
          {/* Southwest handle */}
          <motion.div
            drag
            dragMomentum={false}
            onDragStart={() => setIsResizing(true)}
            onDrag={(event, info) => handleResize('sw', info.delta)}
            onDragEnd={() => setIsResizing(false)}
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize bg-blue-500 opacity-0 hover:opacity-100 transition-opacity"
            style={{ 
              clipPath: 'polygon(0 0, 0 100%, 100% 100%)' 
            }}
          />
          
          {/* Northeast handle */}
          <motion.div
            drag
            dragMomentum={false}
            onDragStart={() => setIsResizing(true)}
            onDrag={(event, info) => handleResize('ne', info.delta)}
            onDragEnd={() => setIsResizing(false)}
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize bg-blue-500 opacity-0 hover:opacity-100 transition-opacity"
            style={{ 
              clipPath: 'polygon(0 0, 100% 0, 100% 100%)' 
            }}
          />
          
          {/* Northwest handle */}
          <motion.div
            drag
            dragMomentum={false}
            onDragStart={() => setIsResizing(true)}
            onDrag={(event, info) => handleResize('nw', info.delta)}
            onDragEnd={() => setIsResizing(false)}
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize bg-blue-500 opacity-0 hover:opacity-100 transition-opacity"
            style={{ 
              clipPath: 'polygon(0 0, 100% 0, 0 100%)' 
            }}
          />
        </>
      )}
      
      {/* Last Refresh Indicator */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-400">
        {lastRefresh.toLocaleTimeString()}
      </div>
    </motion.div>
  )
}