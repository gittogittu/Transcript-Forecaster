'use client'

import React, { useMemo, useState } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Scatter
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { ChartDataPoint, PredictionComparisonData, VisualizationConfig } from '../dashboard/types'
import { format } from 'date-fns'

interface PredictionChartProps {
  data: PredictionComparisonData
  config: VisualizationConfig
  onDrillDown?: (dataPoint: ChartDataPoint) => void
  className?: string
  height?: number
}

interface TooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg"
      >
        <p className="font-semibold text-gray-900">
          {format(new Date(label || ''), 'MMM dd, yyyy HH:mm')}
        </p>
        
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mt-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.name}:</span>
            <span className="text-sm font-medium">{entry.value?.toFixed(2)}</span>
          </div>
        ))}
        
        {data.anomaly && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <span className="text-xs text-red-600 font-medium">
              Anomaly Detected ({data.anomalySeverity})
            </span>
          </div>
        )}
        
        {data.confidenceUpper && data.confidenceLower && (
          <div className="mt-2 text-xs text-gray-500">
            Confidence: [{data.confidenceLower?.toFixed(2)}, {data.confidenceUpper?.toFixed(2)}]
          </div>
        )}
      </motion.div>
    )
  }
  return null
}

const AnomalyDot: React.FC<{ cx?: number; cy?: number; payload?: any }> = ({ cx, cy, payload }) => {
  if (!payload?.anomaly || !cx || !cy) return null
  
  const severityColors = {
    low: '#fbbf24',
    medium: '#f97316', 
    high: '#ef4444',
    critical: '#dc2626'
  }
  
  return (
    <motion.circle
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      cx={cx}
      cy={cy}
      r={6}
      fill={severityColors[payload.anomalySeverity as keyof typeof severityColors]}
      stroke="#fff"
      strokeWidth={2}
      className="cursor-pointer"
    />
  )
}

export function PredictionChart({ 
  data, 
  config, 
  onDrillDown, 
  className = '',
  height = 400 
}: PredictionChartProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all')
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null)

  const chartData = useMemo(() => {
    // Combine actual and predicted data
    const combinedData = []
    const actualMap = new Map(data.actual.map(d => [d.timestamp.getTime(), d]))
    const predictedMap = new Map(data.predicted.map(d => [d.timestamp.getTime(), d]))
    
    // Get all unique timestamps
    const allTimestamps = new Set([
      ...data.actual.map(d => d.timestamp.getTime()),
      ...data.predicted.map(d => d.timestamp.getTime())
    ])
    
    Array.from(allTimestamps).sort().forEach(timestamp => {
      const actual = actualMap.get(timestamp)
      const predicted = predictedMap.get(timestamp)
      
      combinedData.push({
        timestamp: new Date(timestamp),
        actual: actual?.value,
        predicted: predicted?.value || predicted?.predicted,
        confidenceUpper: predicted?.confidenceUpper,
        confidenceLower: predicted?.confidenceLower,
        anomaly: actual?.anomaly,
        anomalySeverity: actual?.anomalySeverity
      })
    })
    
    return combinedData
  }, [data])

  const filteredData = useMemo(() => {
    if (selectedTimeRange === 'all') return chartData
    
    const now = new Date()
    const ranges = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    }
    
    const cutoff = new Date(now.getTime() - ranges[selectedTimeRange as keyof typeof ranges])
    return chartData.filter(d => d.timestamp >= cutoff)
  }, [chartData, selectedTimeRange])

  const handleChartClick = (data: any) => {
    if (onDrillDown && data?.activePayload?.[0]?.payload) {
      onDrillDown(data.activePayload[0].payload)
    }
  }

  const accuracyMetrics = data.accuracy

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Chart Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Time Range:</label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          
          {zoomDomain && (
            <button
              onClick={() => setZoomDomain(null)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
            >
              Reset Zoom
            </button>
          )}
        </div>
        
        {/* Accuracy Metrics */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">MAE:</span>
            <span className="font-medium">{accuracyMetrics.mae.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600">RMSE:</span>
            <span className="font-medium">{accuracyMetrics.rmse.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600">R²:</span>
            <span className="font-medium">{accuracyMetrics.r2Score.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={filteredData}
            onClick={handleChartClick}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="timestamp"
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              stroke="#666"
            />
            <YAxis stroke="#666" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Confidence Band */}
            {config.showConfidenceBands && (
              <Area
                dataKey="confidenceUpper"
                stroke="none"
                fill="#e0f2fe"
                fillOpacity={0.3}
                connectNulls={false}
              />
            )}
            
            {config.showConfidenceBands && (
              <Area
                dataKey="confidenceLower"
                stroke="none"
                fill="#ffffff"
                fillOpacity={1}
                connectNulls={false}
              />
            )}
            
            {/* Actual Values */}
            {config.showActuals && (
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                name="Actual"
                connectNulls={false}
              />
            )}
            
            {/* Predicted Values */}
            {config.showPredictions && (
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Predicted"
                connectNulls={false}
              />
            )}
            
            {/* Anomalies */}
            {config.showAnomalies && (
              <Scatter
                dataKey="actual"
                shape={<AnomalyDot />}
                fill="transparent"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        {config.showActuals && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-600"></div>
            <span>Actual Values</span>
          </div>
        )}
        {config.showPredictions && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-600 border-dashed border-t-2"></div>
            <span>Predictions</span>
          </div>
        )}
        {config.showConfidenceBands && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-sky-100 border border-sky-200"></div>
            <span>Confidence Band</span>
          </div>
        )}
        {config.showAnomalies && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Anomalies</span>
          </div>
        )}
      </div>
    </div>
  )
}