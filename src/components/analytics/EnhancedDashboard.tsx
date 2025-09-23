'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Brain, 
  Clock, 
  Users, 
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react'

interface DashboardData {
  systemHealth: {
    status: string
    components: Record<string, string>
    performance: {
      responseTime: number
      errorRate: number
      uptime: number
    }
  }
  mlPredictions: {
    success: boolean
    client_id: string
    predictions: Array<{
      prediction_date: string
      predicted_transcript_count: number
      confidence_interval?: {
        lower_bound: number
        upper_bound: number
        confidence_level: number
      }
    }>
    model_metadata: {
      model_version: string
      accuracy_metrics: {
        mae: number
        rmse: number
        mape: number
        r2_score: number
      }
    }
  }
  analytics: any
  performance: any
}

export function EnhancedDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch data from our verified endpoints
      const [healthRes, mlRes, analyticsRes, perfRes] = await Promise.allSettled([
        fetch('/api/system/health'),
        fetch('/api/predictions/simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: 'dashboard-demo',
            prediction_horizon: 14,
            include_confidence: true
          })
        }),
        fetch('/api/analytics/dashboard/stats'),
        fetch('/api/performance-monitoring/health')
      ])

      const dashboardData: Partial<DashboardData> = {}

      // Process system health
      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        dashboardData.systemHealth = await healthRes.value.json()
      }

      // Process ML predictions
      if (mlRes.status === 'fulfilled' && mlRes.value.ok) {
        dashboardData.mlPredictions = await mlRes.value.json()
      }

      // Process analytics
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
        dashboardData.analytics = await analyticsRes.value.json()
      }

      // Process performance
      if (perfRes.status === 'fulfilled' && perfRes.value.ok) {
        dashboardData.performance = await perfRes.value.json()
      }

      setData(dashboardData as DashboardData)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto refresh every 30 seconds
  useEffect(() => {
    fetchDashboardData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 30000)
      return () => clearInterval(interval)
    }
  }, [fetchDashboardData, autoRefresh])

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'critical': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Enhanced Analytics Dashboard</h1>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Enhanced Analytics Dashboard</h1>
          <Button onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Dashboard Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time insights from your Transcript Analytics Platform
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Zap className={`h-4 w-4 mr-2 ${autoRefresh ? 'text-green-500' : 'text-gray-400'}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button onClick={fetchDashboardData} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {data?.systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              {getStatusIcon(data.systemHealth.status)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={getStatusColor(data.systemHealth.status)}>
                  {data.systemHealth.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Overall system health
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.systemHealth.performance?.responseTime || 'N/A'}
                <span className="text-sm font-normal text-muted-foreground">ms</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Average API response time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.systemHealth.performance?.uptime 
                  ? `${Math.floor(data.systemHealth.performance.uptime / 3600)}h`
                  : 'N/A'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                System uptime
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.systemHealth.performance?.errorRate 
                  ? `${(data.systemHealth.performance.errorRate * 100).toFixed(2)}%`
                  : '0%'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Request error rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ML Predictions Section */}
      {data?.mlPredictions && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-blue-500" />
                      <span>ML Predictions</span>
                    </CardTitle>
                    <CardDescription>
                      14-day transcript volume forecast for {data.mlPredictions.client_id}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {data.mlPredictions.model_metadata.model_version}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Prediction Chart */}
                  <div className="h-64 w-full">
                    <div className="grid gap-2" style={{gridTemplateColumns: `repeat(${Math.min(data.mlPredictions.predictions.length, 7)}, 1fr)`}}>
                      {data.mlPredictions.predictions.slice(0, 7).map((pred, index) => {
                        const maxVal = Math.max(...data.mlPredictions.predictions.map(p => p.predicted_transcript_count))
                        const height = (pred.predicted_transcript_count / maxVal) * 200
                        const date = new Date(pred.prediction_date)
                        
                        return (
                          <div key={index} className="flex flex-col items-center space-y-2">
                            <div className="text-xs font-medium text-center">
                              {date.getMonth() + 1}/{date.getDate()}
                            </div>
                            <div className="relative w-8 bg-gray-100 rounded-sm" style={{height: '200px'}}>
                              {pred.confidence_interval && (
                                <div 
                                  className="absolute bottom-0 w-full bg-blue-100 rounded-sm"
                                  style={{
                                    height: `${(pred.confidence_interval.upper_bound / maxVal) * 200}px`
                                  }}
                                />
                              )}
                              <div 
                                className="absolute bottom-0 w-full bg-blue-500 rounded-sm"
                                style={{height: `${height}px`}}
                              />
                            </div>
                            <div className="text-xs text-center text-muted-foreground">
                              {pred.predicted_transcript_count}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Accuracy Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {(data.mlPredictions.model_metadata.accuracy_metrics.r2_score * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">R² Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {data.mlPredictions.model_metadata.accuracy_metrics.mae.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">MAE</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {data.mlPredictions.model_metadata.accuracy_metrics.mape.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">MAPE</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {data.mlPredictions.model_metadata.accuracy_metrics.rmse.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">RMSE</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Prediction Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Daily Volume</span>
                  <span className="font-medium">
                    {Math.round(
                      data.mlPredictions.predictions.reduce((sum, p) => sum + p.predicted_transcript_count, 0) / 
                      data.mlPredictions.predictions.length
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Peak Day</span>
                  <span className="font-medium">
                    {Math.max(...data.mlPredictions.predictions.map(p => p.predicted_transcript_count)).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total 14 Days</span>
                  <span className="font-medium">
                    {data.mlPredictions.predictions.reduce((sum, p) => sum + p.predicted_transcript_count, 0).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* System Components */}
            {data.systemHealth?.components && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">System Components</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(data.systemHealth.components).map(([component, status]) => (
                    <div key={component} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{component.replace('_', ' ')}</span>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(typeof status === 'string' ? status : 'unknown')}
                        <span className={`text-xs ${getStatusColor(typeof status === 'string' ? status : 'unknown')}`}>
                          {typeof status === 'string' ? status.toUpperCase() : 'UNKNOWN'}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedDashboard