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
  Area,
  ComposedChart,
  ReferenceLine
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TranscriptData } from '@/types/transcript'

interface PredictionData {
  clientName: string
  date: Date
  predictedCount: number
  confidenceInterval: {
    lower: number
    upper: number
  }
  isHistorical?: boolean
  actualCount?: number
}

interface PredictionChartProps {
  historicalData: TranscriptData[]
  predictionData: PredictionData[]
  selectedClient?: string
  showConfidenceInterval?: boolean
  showHistorical?: boolean
  height?: number
}

interface ChartDataPoint {
  month: string
  historical?: number
  predicted?: number
  confidenceLower?: number
  confidenceUpper?: number
  isPrediction?: boolean
}

export function PredictionChart({
  historicalData,
  predictionData,
  selectedClient,
  showConfidenceInterval = true,
  showHistorical = true,
  height = 400
}: PredictionChartProps) {
  // Transform and combine historical and prediction data
  const chartData = React.useMemo(() => {
    const dataMap: { [key: string]: ChartDataPoint } = {}
    
    // Add historical data
    if (showHistorical) {
      const filteredHistorical = selectedClient 
        ? historicalData.filter(item => item.clientName === selectedClient)
        : historicalData
      
      filteredHistorical.forEach(item => {
        const itemDate = new Date(item.date)
        const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
        if (!dataMap[monthKey]) {
          dataMap[monthKey] = { month: monthKey, isPrediction: false }
        }
        dataMap[monthKey].historical = (dataMap[monthKey].historical || 0) + item.transcriptCount
      })
    }
    
    // Add prediction data
    const filteredPredictions = selectedClient 
      ? predictionData.filter(item => item.clientName === selectedClient)
      : predictionData
    
    filteredPredictions.forEach(item => {
      const itemDate = new Date(item.date)
      const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
      if (!dataMap[monthKey]) {
        dataMap[monthKey] = { month: monthKey, isPrediction: true }
      }
      
      dataMap[monthKey].predicted = (dataMap[monthKey].predicted || 0) + item.predictedCount
      
      if (showConfidenceInterval) {
        dataMap[monthKey].confidenceLower = (dataMap[monthKey].confidenceLower || 0) + item.confidenceInterval.lower
        dataMap[monthKey].confidenceUpper = (dataMap[monthKey].confidenceUpper || 0) + item.confidenceInterval.upper
      }
      
      dataMap[monthKey].isPrediction = true
    })

    // Convert to array and sort by month
    return Object.values(dataMap).sort((a, b) => 
      a.month.localeCompare(b.month)
    )
  }, [historicalData, predictionData, selectedClient, showHistorical, showConfidenceInterval])

  // Find the boundary between historical and prediction data
  const predictionStartIndex = React.useMemo(() => {
    return chartData.findIndex(item => item.isPrediction && item.predicted !== undefined)
  }, [chartData])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      const isPrediction = data?.isPrediction
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{`Month: ${label}`}</p>
          <p className="text-xs text-gray-500 mb-2">
            {isPrediction ? 'Prediction' : 'Historical Data'}
          </p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'historical' && entry.value !== undefined) {
              return (
                <p key={index} style={{ color: entry.color }} className="text-sm">
                  {`Historical: ${entry.value} transcripts`}
                </p>
              )
            }
            if (entry.dataKey === 'predicted' && entry.value !== undefined) {
              return (
                <p key={index} style={{ color: entry.color }} className="text-sm">
                  {`Predicted: ${entry.value} transcripts`}
                </p>
              )
            }
            return null
          })}
          {showConfidenceInterval && data?.confidenceLower !== undefined && data?.confidenceUpper !== undefined && (
            <p className="text-xs text-gray-600 mt-1">
              {`Confidence: ${Math.round(data.confidenceLower)} - ${Math.round(data.confidenceUpper)}`}
            </p>
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

  // Custom dot component to show different styles for historical vs predicted
  const CustomDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props
    if (dataKey === 'predicted') {
      return <circle cx={cx} cy={cy} r={4} fill="#ff7300" stroke="#ff7300" strokeWidth={2} />
    }
    if (dataKey === 'historical') {
      return <circle cx={cx} cy={cy} r={3} fill="#8884d8" stroke="#8884d8" strokeWidth={1} />
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prediction Analysis</CardTitle>
        <CardDescription>
          Historical data and future predictions
          {selectedClient && ` for ${selectedClient}`}
          {showConfidenceInterval && ' with confidence intervals'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
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
            <Legend />
            
            {/* Confidence interval area */}
            {showConfidenceInterval && (
              <Area
                type="monotone"
                dataKey="confidenceUpper"
                stackId="confidence"
                stroke="none"
                fill="#ff730020"
                fillOpacity={0.3}
              />
            )}
            
            {/* Historical data line */}
            {showHistorical && (
              <Line
                type="monotone"
                dataKey="historical"
                stroke="#8884d8"
                strokeWidth={2}
                dot={<CustomDot />}
                name="Historical Data"
                connectNulls={false}
              />
            )}
            
            {/* Prediction line */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#ff7300"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={<CustomDot />}
              name="Predictions"
              connectNulls={false}
            />
            
            {/* Reference line to separate historical from predictions */}
            {predictionStartIndex > 0 && (
              <ReferenceLine 
                x={chartData[predictionStartIndex - 1]?.month} 
                stroke="#666" 
                strokeDasharray="2 2"
                label={{ value: "Prediction Start", position: "topRight" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}