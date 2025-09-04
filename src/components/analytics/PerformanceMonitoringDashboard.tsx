'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Database, 
  MemoryStick,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw
} from 'lucide-react'
import { 
  SystemHealthStatus, 
  PerformanceAlert, 
  PerformanceOptimizationRecommendation,
  ModelPerformanceHistory 
} from '@/lib/services/performance-monitoring/types'
import { SystemHealthCard } from './SystemHealthCard'
import { PerformanceMetricsChart } from './PerformanceMetricsChart'
import { AlertsPanel } from './AlertsPanel'
import { OptimizationRecommendations } from './OptimizationRecommendations'

interface PerformanceMonitoringDashboardProps {
  modelId?: string
  refreshInterval?: number
}

export function PerformanceMonitoringDashboard({ 
  modelId, 
  refreshInterval = 30000 
}: PerformanceMonitoringDashboardProps) {
  const [systemHealth, setSystemHealth] = useState<SystemHealthStatus | null>(null)
  const [performanceHistory, setPerformanceHistory] = useState<ModelPerformanceHistory | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [recommendations, setRecommendations] = useState<PerformanceOptimizationRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [modelId, refreshInterval])

  const fetchData = async () => {
    try {
      setError(null)
      
      // Fetch system health
      const healthResponse = await fetch('/api/performance-monitoring/health')
      const healthData = await healthResponse.json()
      
      if (healthData.success) {
        setSystemHealth(healthData.data)
      }

      // Fetch performance metrics if modelId is provided
      if (modelId) {
        const metricsResponse = await fetch(
          `/api/performance-monitoring/metrics?modelId=${modelId}&startDate=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&endDate=${new Date().toISOString()}`
        )
        const metricsData = await metricsResponse.json()
        
        if (metricsData.success) {
          setPerformanceHistory(metricsData.data)
        }

        // Fetch recommendations
        const recommendationsResponse = await fetch(
          `/api/performance-monitoring/recommendations?modelId=${modelId}`
        )
        const recommendationsData = await recommendationsResponse.json()
        
        if (recommendationsData.success) {
          setRecommendations(recommendationsData.data)
        }
      }

      // Fetch alerts
      const alertsResponse = await fetch('/api/performance-monitoring/alerts')
      const alertsData = await alertsResponse.json()
      
      if (alertsData.success) {
        setAlerts(alertsData.data)
      }

      setLastUpdated(new Date())
    } catch (err) {
      setError('Failed to fetch monitoring data')
      console.error('Error fetching monitoring data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setLoading(true)
    fetchData()
  }

  if (loading && !systemHealth) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading performance data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const activeAlerts = alerts.filter(alert => !alert.isResolved)
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor system health, model performance, and optimization opportunities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? 's' : ''} require immediate attention
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Overview */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <SystemHealthCard
            title="Overall Health"
            status={systemHealth.overall}
            icon={Activity}
          />
          <SystemHealthCard
            title="Vertex AI"
            status={systemHealth.components.vertexAI.status}
            latency={systemHealth.components.vertexAI.latency}
            icon={Cpu}
          />
          <SystemHealthCard
            title="Neon DB"
            status={systemHealth.components.neonDB.status}
            latency={systemHealth.components.neonDB.latency}
            icon={Database}
          />
          <SystemHealthCard
            title="Vector Search"
            status={systemHealth.components.vectorSearch.status}
            latency={systemHealth.components.vectorSearch.latency}
            icon={MemoryStick}
          />
          <SystemHealthCard
            title="Prediction Engine"
            status={systemHealth.components.predictionEngine.status}
            latency={systemHealth.components.predictionEngine.latency}
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {activeAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {activeAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            Recommendations
            {recommendations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {recommendations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Key metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceHistory ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Accuracy Trend</span>
                          <TrendIcon direction={performanceHistory.trends.accuracy.direction} />
                        </div>
                        <div className="text-2xl font-bold">
                          {(performanceHistory.metrics[performanceHistory.metrics.length - 1]?.accuracy.accuracyScore * 100 || 0).toFixed(1)}%
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Latency Trend</span>
                          <TrendIcon direction={performanceHistory.trends.latency.direction} />
                        </div>
                        <div className="text-2xl font-bold">
                          {performanceHistory.metrics[performanceHistory.metrics.length - 1]?.predictionLatency || 0}ms
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    {modelId ? 'No performance data available' : 'Select a model to view performance metrics'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>Latest system alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                {activeAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {activeAlerts.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                          alert.severity === 'critical' ? 'text-red-500' :
                          alert.severity === 'high' ? 'text-orange-500' :
                          alert.severity === 'medium' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {alert.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={
                          alert.severity === 'critical' ? 'destructive' :
                          alert.severity === 'high' ? 'destructive' :
                          alert.severity === 'medium' ? 'default' :
                          'secondary'
                        }>
                          {alert.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    No active alerts
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          {performanceHistory ? (
            <PerformanceMetricsChart performanceHistory={performanceHistory} />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  {modelId ? 'No performance metrics available' : 'Select a model to view performance metrics'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsPanel alerts={alerts} onRefresh={fetchData} />
        </TabsContent>

        <TabsContent value="recommendations">
          <OptimizationRecommendations 
            recommendations={recommendations} 
            modelId={modelId}
            onRefresh={fetchData}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TrendIcon({ direction }: { direction: 'improving' | 'stable' | 'degrading' }) {
  switch (direction) {
    case 'improving':
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case 'degrading':
      return <TrendingDown className="h-4 w-4 text-red-500" />
    default:
      return <Minus className="h-4 w-4 text-gray-500" />
  }
}