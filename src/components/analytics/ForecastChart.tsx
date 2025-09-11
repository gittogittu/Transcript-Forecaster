'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface ForecastData {
  month: string
  predicted_transcripts: number
  confidence_interval: [number, number]
  growth_rate: number
}

interface ForecastChartProps {
  forecasts: ForecastData[]
  title?: string
}

export function ForecastChart({ forecasts, title = "Forecast Chart" }: ForecastChartProps) {
  if (!forecasts || forecasts.length === 0) {
    return null
  }

  const maxValue = Math.max(...forecasts.map(f => f.confidence_interval[1]))
  const minValue = Math.min(...forecasts.map(f => f.confidence_interval[0]))
  const range = maxValue - minValue

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Predicted transcript volumes with confidence intervals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Simple bar chart visualization */}
          <div className="grid gap-4">
            {forecasts.map((forecast, index) => {
              const barHeight = ((forecast.predicted_transcripts - minValue) / range) * 100
              const confidenceHeight = ((forecast.confidence_interval[1] - forecast.confidence_interval[0]) / range) * 100
              
              return (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-20 text-sm font-medium">
                    {forecast.month}
                  </div>
                  
                  <div className="flex-1 relative h-8 bg-gray-100 rounded">
                    {/* Confidence interval background */}
                    <div 
                      className="absolute bg-blue-100 rounded"
                      style={{
                        left: `${((forecast.confidence_interval[0] - minValue) / range) * 100}%`,
                        width: `${confidenceHeight}%`,
                        height: '100%'
                      }}
                    />
                    
                    {/* Predicted value bar */}
                    <div 
                      className="absolute bg-blue-500 rounded"
                      style={{
                        width: `${barHeight}%`,
                        height: '100%'
                      }}
                    />
                    
                    {/* Value label */}
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                      {forecast.predicted_transcripts.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="w-20 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {forecast.growth_rate > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`text-xs ${forecast.growth_rate > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {forecast.growth_rate > 0 ? '+' : ''}{forecast.growth_rate}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>Predicted Value</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-100 rounded" />
              <span>Confidence Interval</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}