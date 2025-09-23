'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Calendar, 
  Target,
  Info,
  Download,
  Play,
  Pause
} from 'lucide-react'
import { PredictionControls } from './PredictionControls'
import type { ForecastingRequest } from '@/lib/services/forecasting/intelligent-forecasting-engine'

interface PredictionData {
  prediction_date: string
  predicted_transcript_count: number
  confidence_interval?: {
    lower_bound: number
    upper_bound: number
    confidence_level: number
  }
  contributing_factors?: {
    seasonal_impact: number
    trend_component: number
    historical_average: number
  }
}

interface EnhancedPredictionChartProps {
  clientId?: string
  autoRefresh?: boolean
  showControls?: boolean
}

export function EnhancedPredictionChart({ 
  clientId = 'demo-client', 
  autoRefresh = false,
  showControls = true 
}: EnhancedPredictionChartProps) {
  const [predictions, setPredictions] = useState<PredictionData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelMetadata, setModelMetadata] = useState<any>(null)
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(autoRefresh)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'chart' | 'table' | 'insights'>('chart')
  
  const [forecastRequest, setForecastRequest] = useState<ForecastingRequest>({
    clientId: clientId,
    timeHorizon: 'daily',
    periodsAhead: 14,
    confidenceLevel: 0.95,
    ensembleMethod: 'weighted_average'
  })

  const generatePrediction = async (request: ForecastingRequest) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/predictions/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: request.clientId || clientId,
          prediction_horizon: request.periodsAhead,
          include_confidence: true
        })
      })

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      setPredictions(data.predictions || [])
      setModelMetadata(data.model_metadata)
      setLastUpdate(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prediction')
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh functionality
  useEffect(() => {
    if (isAutoRefreshing) {
      const interval = setInterval(() => {
        generatePrediction(forecastRequest)
      }, 60000) // Refresh every minute
      
      return () => clearInterval(interval)
    }
  }, [isAutoRefreshing, forecastRequest])

  // Initial load
  useEffect(() => {
    generatePrediction(forecastRequest)
  }, [])

  const predictionStats = useMemo(() => {
    if (!predictions.length) return null

    const values = predictions.map(p => p.predicted_transcript_count)
    const total = values.reduce((sum, val) => sum + val, 0)
    const avg = total / values.length
    const max = Math.max(...values)
    const min = Math.min(...values)
    
    // Calculate trend
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
    const trendDirection = secondAvg > firstAvg ? 'up' : 'down'
    const trendPercentage = Math.abs(((secondAvg - firstAvg) / firstAvg) * 100)

    return {
      total: Math.round(total),
      average: Math.round(avg),
      max: Math.round(max),
      min: Math.round(min),
      trendDirection,
      trendPercentage: trendPercentage.toFixed(1)
    }
  }, [predictions])

  const ChartView = () => {
    if (!predictions.length) return null

    const maxValue = Math.max(...predictions.map(p => 
      p.confidence_interval?.upper_bound || p.predicted_transcript_count
    ))
    const minValue = Math.min(...predictions.map(p => 
      p.confidence_interval?.lower_bound || p.predicted_transcript_count
    ))

    return (
      <div className="space-y-4">
        {/* Main Chart */}
        <div className="h-80 w-full border rounded-lg p-4 bg-gradient-to-b from-blue-50 to-white">
          <div className="h-full flex items-end justify-between space-x-1">
            {predictions.map((pred, index) => {
              const date = new Date(pred.prediction_date)
              const barHeight = ((pred.predicted_transcript_count - minValue) / (maxValue - minValue)) * 100
              const confidenceHeight = pred.confidence_interval 
                ? ((pred.confidence_interval.upper_bound - pred.confidence_interval.lower_bound) / (maxValue - minValue)) * 100
                : 0

              return (
                <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                  {/* Value label */}
                  <div className="text-xs font-medium text-gray-700 min-h-[16px]">
                    {pred.predicted_transcript_count.toLocaleString()}
                  </div>
                  
                  {/* Chart bar */}
                  <div className="relative w-full max-w-8 flex-1 flex flex-col justify-end">
                    {/* Confidence interval background */}
                    {pred.confidence_interval && (
                      <div 
                        className="absolute bottom-0 w-full bg-blue-100 rounded-sm opacity-60"
                        style={{
                          height: `${confidenceHeight}%`,
                          bottom: `${((pred.confidence_interval.lower_bound - minValue) / (maxValue - minValue)) * 100}%`
                        }}
                      />
                    )}
                    
                    {/* Main prediction bar */}
                    <div 
                      className="relative w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-sm shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      style={{height: `${Math.max(barHeight, 5)}%`}}
                      title={`${pred.prediction_date}: ${pred.predicted_transcript_count.toLocaleString()} transcripts`}
                    />
                  </div>
                  
                  {/* Date label */}
                  <div className="text-xs text-gray-500 transform -rotate-45 origin-center whitespace-nowrap">
                    {date.getMonth() + 1}/{date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Chart Legend */}
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Predicted Volume</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-100 rounded"></div>
            <span>Confidence Interval</span>
          </div>
        </div>
      </div>
    )
  }

  const TableView = () => (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <div className="grid grid-cols-4 gap-4 p-4 border-b bg-gray-50 font-medium text-sm">
          <div>Date</div>
          <div>Predicted Volume</div>
          <div>Confidence Range</div>
          <div>Day of Week</div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {predictions.map((pred, index) => {
            const date = new Date(pred.prediction_date)
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
            
            return (
              <div key={index} className="grid grid-cols-4 gap-4 p-4 border-b hover:bg-gray-50">
                <div className="font-medium">
                  {date.toLocaleDateString()}
                </div>
                <div className="flex items-center space-x-2">
                  <span>{pred.predicted_transcript_count.toLocaleString()}</span>
                  {predictionStats && (
                    <Badge variant={pred.predicted_transcript_count > predictionStats.average ? 'default' : 'secondary'}>
                      {pred.predicted_transcript_count > predictionStats.average ? 'High' : 'Normal'}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {pred.confidence_interval ? 
                    `${pred.confidence_interval.lower_bound.toLocaleString()} - ${pred.confidence_interval.upper_bound.toLocaleString()}` :
                    'N/A'
                  }
                </div>
                <div className="text-sm text-gray-500">
                  {dayName}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const InsightsView = () => (
    <div className="space-y-6">
      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Volume Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {predictionStats && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Peak Day Volume:</span>
                  <span className="font-medium">{predictionStats.max.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Daily:</span>
                  <span className="font-medium">{predictionStats.average.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Period:</span>
                  <span className="font-medium">{predictionStats.total.toLocaleString()}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              {predictionStats?.trendDirection === 'up' ? 
                <TrendingUp className="h-4 w-4 text-green-500" /> : 
                <TrendingDown className="h-4 w-4 text-red-500" />
              }
              <span>Trend Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {predictionStats && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Direction:</span>
                  <Badge variant={predictionStats.trendDirection === 'up' ? 'default' : 'secondary'}>
                    {predictionStats.trendDirection === 'up' ? 'Increasing' : 'Decreasing'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Change Rate:</span>
                  <span className={`font-medium ${predictionStats.trendDirection === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {predictionStats.trendDirection === 'up' ? '+' : '-'}{predictionStats.trendPercentage}%
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Model Performance */}
      {modelMetadata && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>Model Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {(modelMetadata.accuracy_metrics.r2_score * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">R² Score</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  {modelMetadata.accuracy_metrics.mae.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">Mean Absolute Error</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  {modelMetadata.accuracy_metrics.mape.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">MAPE</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  {modelMetadata.accuracy_metrics.rmse.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">RMSE</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {predictionStats && (
            <>
              {predictionStats.trendDirection === 'up' && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-blue-700">Increasing Volume Expected</div>
                      <div className="text-blue-600">
                        Consider scaling resources by {predictionStats.trendPercentage}% to handle the projected increase.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Target className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-green-700">Resource Planning</div>
                    <div className="text-green-600">
                      Peak day requires capacity for {predictionStats.max.toLocaleString()} transcripts. 
                      Plan for {Math.ceil(predictionStats.max * 1.1).toLocaleString()} to include buffer.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Predictions</h2>
          <p className="text-muted-foreground">
            AI-powered transcript volume forecasting with confidence intervals
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
          >
            {isAutoRefreshing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isAutoRefreshing ? 'Pause' : 'Auto'}
          </Button>
          <Button 
            onClick={() => generatePrediction(forecastRequest)}
            disabled={loading}
            size="sm"
          >
            {loading ? 'Generating...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Prediction Parameters</CardTitle>
            <CardDescription>
              Adjust parameters to customize your forecast
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PredictionControls
              defaultClientId={clientId}
              onChange={(request) => {
                setForecastRequest(request)
                generatePrediction(request)
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>
                {forecastRequest.periodsAhead}-Day Forecast
                {forecastRequest.clientId && ` for ${forecastRequest.clientId}`}
              </CardTitle>
            </div>
            {modelMetadata && (
              <Badge variant="outline">
                {modelMetadata.model_version}
              </Badge>
            )}
          </div>
          <CardDescription>
            Confidence Level: {(forecastRequest.confidenceLevel * 100).toFixed(0)}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <div className="text-red-700">{error}</div>
            </div>
          )}

          {loading && !predictions.length && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <div className="text-sm text-gray-500">Generating predictions...</div>
              </div>
            </div>
          )}

          {predictions.length > 0 && (
            <Tabs value={viewMode} onValueChange={setViewMode}>
              <TabsList>
                <TabsTrigger value="chart">Chart View</TabsTrigger>
                <TabsTrigger value="table">Table View</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>
              
              <div className="mt-6">
                <TabsContent value="chart">
                  <ChartView />
                </TabsContent>
                
                <TabsContent value="table">
                  <TableView />
                </TabsContent>
                
                <TabsContent value="insights">
                  <InsightsView />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default EnhancedPredictionChart