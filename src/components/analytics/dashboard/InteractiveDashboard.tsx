'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw, 
  Save, 
  Filter,
  Layout,
  Maximize2
} from 'lucide-react'
import { DashboardProvider, useDashboard } from './DashboardProvider'
import { DraggableWidget } from '../widgets/DraggableWidget'
import { WidgetLibrary } from '../widgets/WidgetLibrary'
import { PredictionChart } from '../charts/PredictionChart'
import { RealTimeChart } from '../charts/RealTimeChart'
import { DashboardWidget, DashboardLayout, GlobalFilter } from './types'

interface InteractiveDashboardProps {
  initialLayout?: DashboardLayout
  onLayoutChange?: (layout: DashboardLayout) => void
  className?: string
}

// Widget renderer component
function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
  const mockPredictionData = {
    actual: [
      { timestamp: new Date('2024-01-01'), value: 100 },
      { timestamp: new Date('2024-01-02'), value: 105, anomaly: true, anomalySeverity: 'medium' as const },
      { timestamp: new Date('2024-01-03'), value: 98 },
      { timestamp: new Date('2024-01-04'), value: 110 },
      { timestamp: new Date('2024-01-05'), value: 95 }
    ],
    predicted: [
      { timestamp: new Date('2024-01-01'), predicted: 102, confidenceUpper: 108, confidenceLower: 96 },
      { timestamp: new Date('2024-01-02'), predicted: 104, confidenceUpper: 110, confidenceLower: 98 },
      { timestamp: new Date('2024-01-03'), predicted: 100, confidenceUpper: 106, confidenceLower: 94 },
      { timestamp: new Date('2024-01-04'), predicted: 107, confidenceUpper: 113, confidenceLower: 101 },
      { timestamp: new Date('2024-01-05'), predicted: 99, confidenceUpper: 105, confidenceLower: 93 }
    ],
    accuracy: {
      mae: 3.2,
      rmse: 4.1,
      mape: 3.8,
      r2Score: 0.92
    }
  }

  switch (widget.type) {
    case 'chart':
      if (widget.config.dataSource === 'predictions') {
        return (
          <PredictionChart
            data={mockPredictionData}
            config={widget.config.visualization || {}}
            height={widget.size.height - 120}
          />
        )
      } else if (widget.config.dataSource === 'real-time') {
        return (
          <RealTimeChart
            dataSource={widget.config.dataSource}
            height={widget.size.height - 120}
            refreshInterval={widget.refreshInterval}
          />
        )
      }
      return <div className="p-4 text-gray-500">Chart widget - {widget.config.chartType}</div>
    
    case 'metric':
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-3xl font-bold text-blue-600">
            {Math.round(Math.random() * 1000)}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {widget.config.aggregation?.metrics[0]?.label || 'Metric'}
          </div>
        </div>
      )
    
    case 'table':
      return <div className="p-4 text-gray-500">Table widget</div>
    
    case 'insight':
      return (
        <div className="p-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">AI Insight</h4>
            <p className="text-sm text-blue-700">
              Based on recent data patterns, transcript volumes are expected to increase by 15% 
              next week due to seasonal trends.
            </p>
          </div>
        </div>
      )
    
    default:
      return <div className="p-4 text-gray-500">Unknown widget type</div>
  }
}

// Main dashboard component
function DashboardContent({ onLayoutChange }: { onLayoutChange?: (layout: DashboardLayout) => void }) {
  const { state, updateLayout, toggleEditing, toggleRealTime, updateGlobalFilters } = useDashboard()
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showLayoutOptions, setShowLayoutOptions] = useState(false)

  // Handle layout changes
  useEffect(() => {
    if (onLayoutChange) {
      onLayoutChange(state.layout)
    }
  }, [state.layout, onLayoutChange])

  const handleAddWidget = useCallback((template: any) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: template.type,
      title: template.title,
      position: { x: 50, y: 50 },
      size: { width: 400, height: 300 },
      config: template.defaultConfig,
      refreshInterval: 30000
    }

    const updatedLayout = {
      ...state.layout,
      widgets: [...state.layout.widgets, newWidget]
    }

    updateLayout(updatedLayout)
  }, [state.layout, updateLayout])

  const handleRemoveWidget = useCallback((widgetId: string) => {
    const updatedLayout = {
      ...state.layout,
      widgets: state.layout.widgets.filter(w => w.id !== widgetId)
    }
    updateLayout(updatedLayout)
  }, [state.layout, updateLayout])

  const handleResizeWidget = useCallback((widgetId: string, size: { width: number; height: number }) => {
    const updatedLayout = {
      ...state.layout,
      widgets: state.layout.widgets.map(w => 
        w.id === widgetId ? { ...w, size } : w
      )
    }
    updateLayout(updatedLayout)
  }, [state.layout, updateLayout])

  const handleSaveLayout = useCallback(() => {
    // Save layout to localStorage or API
    localStorage.setItem('dashboard-layout', JSON.stringify(state.layout))
    // Show success message
  }, [state.layout])

  const handleResetLayout = useCallback(() => {
    const defaultLayout: DashboardLayout = {
      id: 'default',
      name: 'Default Dashboard',
      widgets: [],
      filters: [],
      refreshInterval: 30000,
      isDefault: true
    }
    updateLayout(defaultLayout)
  }, [updateLayout])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Dashboard Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {state.layout.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{state.layout.widgets.length} widgets</span>
              <span>•</span>
              <span>Last updated: {state.lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Real-time Toggle */}
            <button
              onClick={toggleRealTime}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                state.realTimeEnabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {state.realTimeEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {state.realTimeEnabled ? 'Pause' : 'Start'} Real-time
            </button>
            
            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            
            {/* Layout Options */}
            <button
              onClick={() => setShowLayoutOptions(!showLayoutOptions)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium"
            >
              <Layout className="w-4 h-4" />
              Layout
            </button>
            
            {/* Edit Mode Toggle */}
            <button
              onClick={toggleEditing}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                state.isEditing
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              {state.isEditing ? 'Exit Edit' : 'Edit'}
            </button>
            
            {/* Add Widget */}
            <button
              onClick={() => setShowWidgetLibrary(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Widget
            </button>
          </div>
        </div>
        
        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Date Range:</label>
                  <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                    <option>Custom</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Client:</label>
                  <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
                    <option>All Clients</option>
                    <option>Client A</option>
                    <option>Client B</option>
                    <option>Client C</option>
                  </select>
                </div>
                
                <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                  Apply Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Layout Options Panel */}
        <AnimatePresence>
          {showLayoutOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSaveLayout}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  Save Layout
                </button>
                
                <button
                  onClick={handleResetLayout}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Layout
                </button>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Refresh Interval:</label>
                  <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
                    <option value="5000">5 seconds</option>
                    <option value="10000">10 seconds</option>
                    <option value="30000">30 seconds</option>
                    <option value="60000">1 minute</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Dashboard Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {state.layout.widgets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Maximize2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Your dashboard is empty
              </h3>
              <p className="text-gray-600 mb-6">
                Add widgets to start visualizing your data
              </p>
              <button
                onClick={() => setShowWidgetLibrary(true)}
                className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium"
              >
                Add Your First Widget
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {state.layout.widgets.map(widget => (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                onResize={handleResizeWidget}
                onRemove={handleRemoveWidget}
              >
                <WidgetRenderer widget={widget} />
              </DraggableWidget>
            ))}
          </div>
        )}
      </div>
      
      {/* Widget Library Modal */}
      <WidgetLibrary
        isOpen={showWidgetLibrary}
        onClose={() => setShowWidgetLibrary(false)}
        onAddWidget={handleAddWidget}
      />
    </div>
  )
}

// Main exported component with provider
export function InteractiveDashboard({ 
  initialLayout, 
  onLayoutChange, 
  className = '' 
}: InteractiveDashboardProps) {
  return (
    <div className={`h-full ${className}`}>
      <DashboardProvider initialLayout={initialLayout}>
        <DashboardContent onLayoutChange={onLayoutChange} />
      </DashboardProvider>
    </div>
  )
}