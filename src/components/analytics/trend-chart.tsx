'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TranscriptData } from '@/types/transcript'
import { AnimatedChartContainer, ChartDataTransition } from '@/components/animations'

interface TrendChartProps {
  data: TranscriptData[]
  selectedClients?: string[]
  timeRange?: {
    start: Date
    end: Date
  }
  showGrid?: boolean
  showLegend?: boolean
  height?: number
}

interface ChartDataPoint {
  month: string
  [clientName: string]: string | number
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

export function TrendChart({
  data,
  selectedClients,
  timeRange,
  showGrid = true,
  showLegend = true,
  height = 400
}: TrendChartProps) {
  // Transform data for Recharts format
  const chartData = React.useMemo(() => {
    const groupedData: { [key: string]: ChartDataPoint } = {}
    
    // Filter data based on time range and selected clients
    const filteredData = data.filter(item => {
      const itemDate = new Date(item.date)
      const inTimeRange = !timeRange || 
        (itemDate >= timeRange.start && itemDate <= timeRange.end)
      const inSelectedClients = !selectedClients || 
        selectedClients.length === 0 || 
        selectedClients.includes(item.clientName)
      
      return inTimeRange && inSelectedClients
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
  }, [data, selectedClients, timeRange])

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

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{`Month: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${entry.value} transcripts`}
            </p>
          ))}
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
    <AnimatedChartContainer>
      <Card>
        <CardHeader>
          <CardTitle>Transcript Volume Trends</CardTitle>
          <CardDescription>
            Historical transcript counts over time
            {selectedClients && selectedClients.length > 0 && 
              ` for ${selectedClients.join(', ')}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartDataTransition dataKey={`${selectedClients?.join('-') || 'all'}-${timeRange?.start?.getTime() || 'all'}`}>
            <ResponsiveContainer width="100%" height={height}>
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis 
                  dataKey="month" 
                  tickFormatter={formatMonthLabel}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  label={{ value: 'Transcript Count', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                {showLegend && <Legend />}
                
                {clientNames.map((clientName, index) => (
                  <Line
                    key={clientName}
                    type="monotone"
                    dataKey={clientName}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartDataTransition>
        </CardContent>
      </Card>
    </AnimatedChartContainer>
  )
}