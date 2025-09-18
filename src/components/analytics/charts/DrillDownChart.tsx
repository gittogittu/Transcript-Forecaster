'use client'

import React, { useState, useCallback } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { DrillDownConfig, DrillDownLevel } from '../dashboard/types'

interface DrillDownChartProps {
  data: any[]
  config: DrillDownConfig
  onDrillDown?: (level: number, value: string) => void
  className?: string
  height?: number
}

interface BreadcrumbItem {
  level: number
  label: string
  value: string
}

export function DrillDownChart({ 
  data, 
  config, 
  onDrillDown, 
  className = '',
  height = 400 
}: DrillDownChartProps) {
  const [currentLevel, setCurrentLevel] = useState(0)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [currentData, setCurrentData] = useState(data)
  const [isLoading, setIsLoading] = useState(false)

  const currentLevelConfig = config.levels[currentLevel]
  const canDrillDown = currentLevel < config.levels.length - 1
  const canDrillUp = currentLevel > 0

  const handleBarClick = useCallback(async (clickData: any) => {
    if (!canDrillDown || !clickData?.activePayload?.[0]?.payload) return
    
    const payload = clickData.activePayload[0].payload
    const nextLevel = currentLevel + 1
    const nextLevelConfig = config.levels[nextLevel]
    
    setIsLoading(true)
    
    try {
      // Add to breadcrumbs
      const newBreadcrumb: BreadcrumbItem = {
        level: currentLevel,
        label: currentLevelConfig.label,
        value: payload[currentLevelConfig.field]
      }
      
      setBreadcrumbs(prev => [...prev, newBreadcrumb])
      setCurrentLevel(nextLevel)
      
      // Simulate API call for drill-down data
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Generate mock drill-down data
      const drillDownData = generateDrillDownData(nextLevelConfig, payload[currentLevelConfig.field])
      setCurrentData(drillDownData)
      
      // Notify parent component
      if (onDrillDown) {
        onDrillDown(nextLevel, payload[currentLevelConfig.field])
      }
      
    } catch (error) {
      console.error('Drill-down error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [canDrillDown, currentLevel, currentLevelConfig, config.levels, onDrillDown])

  const handleDrillUp = useCallback((targetLevel?: number) => {
    const newLevel = targetLevel !== undefined ? targetLevel : currentLevel - 1
    
    if (newLevel < 0) return
    
    setCurrentLevel(newLevel)
    setBreadcrumbs(prev => prev.slice(0, newLevel))
    
    // Reset to original data or fetch data for the target level
    if (newLevel === 0) {
      setCurrentData(data)
    } else {
      // In a real implementation, you would fetch data for the target level
      const levelData = generateDrillDownData(config.levels[newLevel], breadcrumbs[newLevel - 1]?.value)
      setCurrentData(levelData)
    }
  }, [currentLevel, data, config.levels, breadcrumbs])

  const generateDrillDownData = (levelConfig: DrillDownLevel, parentValue?: string) => {
    // Generate mock data based on the level configuration
    const mockData = []
    const itemCount = Math.floor(Math.random() * 8) + 3 // 3-10 items
    
    for (let i = 0; i < itemCount; i++) {
      const item: any = {}
      item[levelConfig.field] = `${levelConfig.label} ${i + 1}`
      item.value = Math.floor(Math.random() * 100) + 10
      item.change = (Math.random() - 0.5) * 20
      item.parentValue = parentValue
      mockData.push(item)
    }
    
    return mockData.sort((a, b) => b.value - a.value)
  }

  const renderChart = () => {
    const chartType = currentLevelConfig.chartType || 'bar'
    
    const commonProps = {
      data: currentData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
      onClick: canDrillDown ? handleBarClick : undefined
    }

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={currentLevelConfig.field} />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={{ r: 4, cursor: canDrillDown ? 'pointer' : 'default' }}
            />
          </LineChart>
        )
      
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={currentLevelConfig.field} />
            <YAxis />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#2563eb" 
              fill="#3b82f6"
              fillOpacity={0.6}
            />
          </AreaChart>
        )
      
      default: // bar
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={currentLevelConfig.field} />
            <YAxis />
            <Tooltip />
            <Bar 
              dataKey="value" 
              fill="#3b82f6"
              cursor={canDrillDown ? 'pointer' : 'default'}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        )
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg"
        >
          <p className="font-semibold text-gray-900">{label}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600">Value:</span>
            <span className="text-sm font-medium">{data.value}</span>
          </div>
          {data.change && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Change:</span>
              <span className={`text-xs font-medium ${
                data.change > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}%
              </span>
            </div>
          )}
          {canDrillDown && (
            <div className="mt-2 text-xs text-blue-600">
              Click to drill down
            </div>
          )}
        </motion.div>
      )
    }
    return null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => handleDrillUp(0)}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-3 h-3" />
          Root
        </button>
        
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <button
              onClick={() => handleDrillUp(crumb.level + 1)}
              className="text-blue-600 hover:text-blue-700"
            >
              {crumb.value}
            </button>
          </React.Fragment>
        ))}
        
        {breadcrumbs.length > 0 && (
          <>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className="text-gray-600">{currentLevelConfig.label}</span>
          </>
        )}
      </div>

      {/* Level Information */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">
            {currentLevelConfig.label}
          </h3>
          <p className="text-sm text-gray-600">
            Level {currentLevel + 1} of {config.levels.length}
            {canDrillDown && ' • Click items to drill down'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {canDrillUp && (
            <button
              onClick={() => handleDrillUp()}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md"
            >
              Back
            </button>
          )}
          
          <span className="text-sm text-gray-500">
            {currentData.length} items
          </span>
        </div>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10"
          >
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600">Loading...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart */}
      <motion.div
        key={currentLevel}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </motion.div>

      {/* Data Summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {currentData.reduce((sum, item) => sum + item.value, 0)}
          </div>
          <div className="text-xs text-gray-600">Total</div>
        </div>
        
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {Math.round(currentData.reduce((sum, item) => sum + item.value, 0) / currentData.length)}
          </div>
          <div className="text-xs text-gray-600">Average</div>
        </div>
        
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {Math.max(...currentData.map(item => item.value))}
          </div>
          <div className="text-xs text-gray-600">Maximum</div>
        </div>
      </div>
    </div>
  )
}