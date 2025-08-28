'use client'

import React, { useState, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
  ReferenceArea
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { TranscriptData } from '@/types/transcript'

interface InteractiveChartProps {
  data: TranscriptData[]
  selectedClients?: string[]
  title?: string
  description?: string
  height?: number
  enableZoom?: boolean
  enableBrush?: boolean
}

interface ChartDataPoint {
  month: string
  [clientName: string]: string | number
}

interface ZoomState {
  left?: string | number
  right?: string | number
  refAreaLeft?: string | number
  refAreaRight?: string | number
  top?: string | number
  bottom?: string | number
  animation?: boolean
}

const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00ff00',
  '#ff00ff',
  '#00ffff',
  '#ff0000'
]

export function InteractiveChart({
  data,
  selectedClients,
  title = "Interactive Chart",
  description = "Zoomable and interactive data visualization",
  height = 400,
  enableZoom = true,
  enableBrush = true
}: InteractiveChartProps) {
  const [zoomState, setZoomState] = useState<ZoomState>({
    left: 'dataMin',
    right: 'dataMax',
    refAreaLeft: '',
    refAreaRight: '',
    top: 'dataMax+1',
    bottom: 'dataMin-1',
    animation: true
  })

  // Transform data for Recharts format
  const chartData = React.useMemo(() => {
    const groupedData: { [key: string]: ChartDataPoint } = {}
    
    // Filter data based on selected clients
    const filteredData = data.filter(item => {
      return !selectedClients || 
        selectedClients.length === 0 || 
        selectedClients.includes(item.clientName)
    })

    // Group data by month
    filteredData.forEach(item => {
      const itemDate = new Date(item.date)
      const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
      
      if (!groupedData[monthKey]) {
        groupedData[monthKey] = { month: monthKey }
      }
      
      groupedData[monthKey][item.clientName] = (groupedData[monthKey][item.clientName] as number || 0) + item.transcriptCount
    })

    // Convert to array and sort by month
    return Object.values(groupedData).sort((a, b) => 
      a.month.localeCompare(b.month)
    )
  }, [data, selectedClients])

  // Get unique client names for lines
  const clientNames = React.useMemo(() => {
    const names = new Set<string>()
    data.forEach(item => {
      if (!selectedClients || selectedClients.length === 0 || selectedClients.includes(item.clientName)) {
        names.add(item.clientName)
      }
    })
    return Array.from(names)
  }, [data, selectedClients])

  // Zoom handlers
  const handleMouseDown = useCallback((e: any) => {
    if (!enableZoom) return
    setZoomState(prev => ({ ...prev, refAreaLeft: e.activeLabel }))
  }, [enableZoom])

  const handleMouseMove = useCallback((e: any) => {
    if (!enableZoom) return
    setZoomState(prev => {
      if (prev.refAreaLeft) {
        return { ...prev, refAreaRight: e.activeLabel }
      }
      return prev
    })
  }, [enableZoom])

  const handleMouseUp = useCallback(() => {
    if (!enableZoom) return
    
    setZoomState(prev => {
      const { refAreaLeft, refAreaRight } = prev
      
      if (refAreaLeft === refAreaRight || refAreaRight === '') {
        return {
          ...prev,
          refAreaLeft: '',
          refAreaRight: ''
        }
      }

      // Ensure left is less than right
      let left = refAreaLeft
      let right = refAreaRight
      
      if (left && right && left > right) {
        [left, right] = [right, left]
      }

      return {
        ...prev,
        refAreaLeft: '',
        refAreaRight: '',
        left,
        right,
        top: 'dataMax+1',
        bottom: 'dataMin-1'
      }
    })
  }, [enableZoom])

  const handleZoomOut = useCallback(() => {
    setZoomState({
      left: 'dataMin',
      right: 'dataMax',
      refAreaLeft: '',
      refAreaRight: '',
      top: 'dataMax+1',
      bottom: 'dataMin-1',
      animation: true
    })
  }, [])

  // Custom tooltip component with enhanced interactivity
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0)
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[200px]">
          <p className="font-semibold text-gray-900 mb-2">{`Month: ${label}`}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <span style={{ color: entry.color }} className="text-sm font-medium">
                  {entry.dataKey}:
                </span>
                <span className="text-sm font-semibold ml-2">
                  {entry.value} transcripts
                </span>
              </div>
            ))}
          </div>
          {payload.length > 1 && (
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total:</span>
                <span className="text-sm font-bold">{total} transcripts</span>
              </div>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  // Format month labels for display
  const formatMonthLabel = (tickItem: string) => {
    const [year, month] = tickItem.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {enableZoom && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Zoom
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: enableBrush ? 60 : 5,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tickFormatter={formatMonthLabel}
              angle={-45}
              textAnchor="end"
              height={60}
              domain={[zoomState.left || 'dataMin', zoomState.right || 'dataMax']}
            />
            <YAxis 
              label={{ value: 'Transcript Count', angle: -90, position: 'insideLeft' }}
              domain={[zoomState.bottom || 'dataMin-1', zoomState.top || 'dataMax+1']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {clientNames.map((clientName, index) => (
              <Line
                key={clientName}
                type="monotone"
                dataKey={clientName}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6, stroke: COLORS[index % COLORS.length], strokeWidth: 2 }}
                connectNulls={false}
              />
            ))}

            {/* Zoom selection area */}
            {enableZoom && zoomState.refAreaLeft && zoomState.refAreaRight && (
              <ReferenceArea
                x1={zoomState.refAreaLeft}
                x2={zoomState.refAreaRight}
                strokeOpacity={0.3}
                fill="#8884d8"
                fillOpacity={0.1}
              />
            )}

            {/* Brush for navigation */}
            {enableBrush && (
              <Brush
                dataKey="month"
                height={30}
                stroke="#8884d8"
                tickFormatter={formatMonthLabel}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        
        {enableZoom && (
          <div className="mt-4 text-sm text-gray-600">
            <p>💡 <strong>Tip:</strong> Click and drag to zoom into a specific time range. Use the brush below to navigate.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}