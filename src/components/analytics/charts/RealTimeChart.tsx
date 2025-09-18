'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { ChartDataPoint } from '../dashboard/types'
import { format } from 'date-fns'

interface RealTimeChartProps {
  dataSource: string
  refreshInterval?: number
  maxDataPoints?: number
  onDataUpdate?: (data: ChartDataPoint[]) => void
  className?: string
  height?: number
  showGrid?: boolean
  showTooltip?: boolean
  animated?: boolean
}

interface RealTimeDataPoint {
  timestamp: Date
  value: number
  trend?: 'up' | 'down' | 'stable'
  change?: number
}

export function RealTimeChart({
  dataSource,
  refreshInterval = 5000,
  maxDataPoints = 50,
  onDataUpdate,
  className = '',
  height = 300,
  showGrid = true,
  showTooltip = true,
  animated = true
}: RealTimeChartProps) {
  const [data, setData] = useState<RealTimeDataPoint[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Simulate real-time data generation
  const generateDataPoint = useCallback((): RealTimeDataPoint => {
    const now = new Date()
    const baseValue = 100
    const variation = Math.sin(now.getTime() / 10000) * 20 + Math.random() * 10 - 5
    const value = Math.max(0, baseValue + variation)
    
    return {
      timestamp: now,
      value: Math.round(value * 100) / 100,
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
      change: Math.random() * 10 - 5
    }
  }, [])

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setError(null)
      
      // For demo purposes, generate mock data
      // In real implementation, this would fetch from the API
      const newPoint = generateDataPoint()
      
      setData(prevData => {
        const newData = [...prevData, newPoint]
        
        // Keep only the last maxDataPoints
        if (newData.length > maxDataPoints) {
          newData.splice(0, newData.length - maxDataPoints)
        }
        
        // Notify parent component
        if (onDataUpdate) {
          onDataUpdate(newData.map(d => ({
            timestamp: d.timestamp,
            value: d.value
          })))
        }
        
        return newData
      })
      
      setLastUpdate(new Date())
      setIsConnected(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
      setIsConnected(false)
    }
  }, [dataSource, generateDataPoint, maxDataPoints, onDataUpdate])

  // Initialize WebSocket connection (for real-time updates)
  const initializeWebSocket = useCallback(() => {
    // In a real implementation, this would connect to a WebSocket endpoint
    // For demo purposes, we'll use polling
    return null
  }, [])

  // Start real-time updates
  const startRealTimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    // Initial fetch
    fetchData()
    
    // Set up polling
    intervalRef.current = setInterval(fetchData, refreshInterval)
  }, [fetchData, refreshInterval])

  // Stop real-time updates
  const stopRealTimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
  }, [])

  // Initialize on mount
  useEffect(() => {
    startRealTimeUpdates()
    
    return () => {
      stopRealTimeUpdates()
    }
  }, [startRealTimeUpdates, stopRealTimeUpdates])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && showTooltip) {
      const data = payload[0].payload
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg"
        >
          <p className="font-semibold text-gray-900">
            {format(new Date(label), 'HH:mm:ss')}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600">Value:</span>
            <span className="text-sm font-medium">{data.value}</span>
          </div>
          {data.change && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Change:</span>
              <span className={`text-xs font-medium ${
                data.change > 0 ? 'text-green-600' : data.change < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {data.change > 0 ? '+' : ''}{data.change.toFixed(2)}
              </span>
            </div>
          )}
        </motion.div>
      )
    }
    return null
  }

  // Calculate trend
  const currentTrend = data.length >= 2 
    ? data[data.length - 1].value > data[data.length - 2].value ? 'up' : 'down'
    : 'stable'

  const latestValue = data.length > 0 ? data[data.length - 1].value : 0

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm font-medium">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              Last update: {format(lastUpdate, 'HH:mm:ss')}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              {latestValue.toFixed(2)}
            </div>
            <div className={`text-xs flex items-center gap-1 ${
              currentTrend === 'up' ? 'text-green-600' : 
              currentTrend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {currentTrend === 'up' && '↗'}
              {currentTrend === 'down' && '↘'}
              {currentTrend === 'stable' && '→'}
              <span className="capitalize">{currentTrend}</span>
            </div>
          </div>
          
          <button
            onClick={isConnected ? stopRealTimeUpdates : startRealTimeUpdates}
            className={`px-3 py-1 text-xs rounded-md ${
              isConnected 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isConnected ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <p className="text-sm text-red-600">{error}</p>
        </motion.div>
      )}

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey="timestamp"
              tickFormatter={(value) => format(new Date(value), 'HH:mm')}
              stroke="#666"
              fontSize={12}
            />
            <YAxis stroke="#666" fontSize={12} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              isAnimationActive={animated}
              animationDuration={300}
            />
            
            {/* Reference line for average */}
            {data.length > 0 && (
              <ReferenceLine 
                y={data.reduce((sum, d) => sum + d.value, 0) / data.length}
                stroke="#94a3b8"
                strokeDasharray="2 2"
                label={{ value: "Avg", position: "right" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Data Points Info */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Showing {data.length} of {maxDataPoints} data points</span>
        <span>Refresh interval: {refreshInterval / 1000}s</span>
      </div>
    </div>
  )
}