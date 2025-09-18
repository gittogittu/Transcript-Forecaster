'use client'

/**
 * Adaptive Modeling Dashboard Component
 * Displays intelligent data modeling status, performance, and controls
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Database, 
  GitBranch, 
  Settings, 
  TrendingUp,
  Zap,
  Brain,
  Target,
  Gauge
} from 'lucide-react'

interface SystemStatus {
  isInitialized: boolean
  systemHealth: {
    overallHealth: 'healthy' | 'warning' | 'critical'
    activeModels: number
    averageAccuracy: number
    averageLatency: number
    errorRate: number
    resourceUtilization: number
    lastHealthCheck: string
  }
  activeModels: number
  activeOptimizations: number
  activeRetrainingJobs: number
  recentEvents: Array<{
    id: string
    type: string
    modelId: string
    timestamp: string
    severity: 'info' | 'warning' | 'error' | 'critical'
    message: string
    actionsTaken: string[]
  }>
}

interface PerformanceMetrics {
  modelId: string
  timestamp: string
  accuracy: number
  mae: number
  rmse: number
  mape: number
  predictionLatency: number
  memoryUsage: number
  cpuUsage: number
  throughput: number
  errorRate: number
}

interface DriftDetectionResult {
  isDriftDetected: boolean
  driftScore: number
  driftType: 'gradual' | 'sudden' | 'incremental' | 'recurring'
  affectedFeatures: string[]
  confidence: number
  detectionMethod: string
  timestamp: string
  recommendations: Array<{
    action: string
    priority: string
    description: string
    estimatedImpact: number
  }>
}

export default function AdaptiveModelingDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetrics[]>([])
  const [driftResults, setDriftResults] = useState<DriftDetectionResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('')

  useEffect(() => {
    fetchSystemStatus()
    const interval = setInterval(fetchSystemStatus, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/adaptive-modeling?action=status')
      const result = await response.json()
      
      if (result.success) {
        setSystemStatus(result.data)
        if (result.data.activeModels > 0) {
          // Fetch performance history for the first model (in a real app, this would be user-selected)
          fetchPerformanceHistory('model_1')
        }
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system status')
    } finally {
      setLoading(false)
    }
  }

  const fetchPerformanceHistory = async (modelId: string) => {
    try {
      const response = await fetch(`/api/adaptive-modeling?action=performance-history&modelId=${modelId}&limit=50`)
      const result = await response.json()
      
      if (result.success) {
        setPerformanceHistory(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch performance history:', err)
    }
  }

  const triggerDriftDetection = async () => {
    try {
      // Simulate drift detection with sample data
      const currentData = {
        feature1: Array.from({ length: 100 }, () => Math.random() * 10 + 5),
        feature2: Array.from({ length: 100 }, () => Math.random() * 20 + 10)
      }
      
      const referenceData = {
        feature1: Array.from({ length: 100 }, () => Math.random() * 10),
        feature2: Array.from({ length: 100 }, () => Math.random() * 20)
      }

      const response = await fetch('/api/adaptive-modeling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'detect-drift',
          modelId: selectedModel || 'model_1',
          currentData,
          referenceData
        })
      })

      const result = await response.json()
      if (result.success) {
        setDriftResults(prev => [result.data, ...prev.slice(0, 9)]) // Keep last 10 results
      }
    } catch (err) {
      console.error('Failed to trigger drift detection:', err)
    }
  }

  const triggerOptimization = async () => {
    try {
      // Simulate optimization with sample data
      const trainingData = Array.from({ length: 1000 }, (_, i) => ({
        feature1: Math.random() * 10,
        feature2: Math.random() * 20,
        target: Math.random() > 0.5 ? 1 : 0
      }))

      const validationData = Array.from({ length: 200 }, (_, i) => ({
        feature1: Math.random() * 10,
        feature2: Math.random() * 20,
        target: Math.random() > 0.5 ? 1 : 0
      }))

      const response = await fetch('/api/adaptive-modeling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize-hyperparameters',
          modelId: selectedModel || 'model_1',
          modelType: 'neural_network',
          trainingData,
          validationData
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('Hyperparameter optimization started successfully!')
      }
    } catch (err) {
      console.error('Failed to trigger optimization:', err)
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />
      default: return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!systemStatus) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No system status data available</AlertDescription>
      </Alert>
    )
  }

  const performanceChartData = performanceHistory.map(metric => ({
    timestamp: new Date(metric.timestamp).toLocaleTimeString(),
    accuracy: metric.accuracy * 100,
    latency: metric.predictionLatency,
    errorRate: metric.errorRate * 100
  }))

  const resourceUtilizationData = [
    { name: 'CPU', value: systemStatus.systemHealth?.resourceUtilization * 50 || 0, color: '#8884d8' },
    { name: 'Memory', value: systemStatus.systemHealth?.resourceUtilization * 70 || 0, color: '#82ca9d' },
    { name: 'Storage', value: systemStatus.systemHealth?.resourceUtilization * 30 || 0, color: '#ffc658' }
  ]

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {getHealthIcon(systemStatus.systemHealth?.overallHealth || 'healthy')}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(systemStatus.systemHealth?.overallHealth || 'healthy')}`}>
              {systemStatus.systemHealth?.overallHealth?.toUpperCase() || 'UNKNOWN'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last check: {systemStatus.systemHealth?.lastHealthCheck ? 
                new Date(systemStatus.systemHealth.lastHealthCheck).toLocaleTimeString() : 'Never'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus.activeModels}</div>
            <p className="text-xs text-muted-foreground">
              Avg Accuracy: {((systemStatus.systemHealth?.averageAccuracy || 0) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStatus.activeOptimizations + systemStatus.activeRetrainingJobs}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemStatus.activeOptimizations} optimizing, {systemStatus.activeRetrainingJobs} retraining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(systemStatus.systemHealth?.averageLatency || 0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Error Rate: {((systemStatus.systemHealth?.errorRate || 0) * 100).toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="drift">Drift Detection</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Model accuracy and latency over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="accuracy" stroke="#8884d8" name="Accuracy %" />
                    <Line type="monotone" dataKey="latency" stroke="#82ca9d" name="Latency (ms)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
                <CardDescription>Current system resource usage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={resourceUtilizationData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    >
                      {resourceUtilizationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="drift" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Concept Drift Detection</h3>
            <Button onClick={triggerDriftDetection}>
              <Target className="h-4 w-4 mr-2" />
              Run Drift Detection
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {driftResults.map((result, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">
                      Drift Detection Result
                    </CardTitle>
                    <Badge variant={result.isDriftDetected ? "destructive" : "default"}>
                      {result.isDriftDetected ? "Drift Detected" : "No Drift"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(result.timestamp).toLocaleString()} - {result.detectionMethod}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">Drift Score</p>
                      <Progress value={result.driftScore * 100} className="mt-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {(result.driftScore * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Confidence</p>
                      <Progress value={result.confidence * 100} className="mt-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {(result.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Drift Type</p>
                      <Badge variant="outline" className="mt-1">
                        {result.driftType}
                      </Badge>
                    </div>
                  </div>

                  {result.affectedFeatures.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Affected Features</p>
                      <div className="flex flex-wrap gap-1">
                        {result.affectedFeatures.map((feature, idx) => (
                          <Badge key={idx} variant="secondary">{feature}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.recommendations.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Recommendations</p>
                      <div className="space-y-2">
                        {result.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div>
                              <p className="text-sm font-medium">{rec.action.replace('_', ' ').toUpperCase()}</p>
                              <p className="text-xs text-muted-foreground">{rec.description}</p>
                            </div>
                            <Badge variant={rec.priority === 'critical' ? 'destructive' : 'default'}>
                              {rec.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {driftResults.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No drift detection results yet</p>
                  <p className="text-sm text-muted-foreground">Click "Run Drift Detection" to start</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Hyperparameter Optimization</h3>
            <Button onClick={triggerOptimization}>
              <Settings className="h-4 w-4 mr-2" />
              Start Optimization
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Optimization Status</CardTitle>
              <CardDescription>Current hyperparameter optimization jobs</CardDescription>
            </CardHeader>
            <CardContent>
              {systemStatus.activeOptimizations > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Active Optimizations</span>
                    <Badge>{systemStatus.activeOptimizations}</Badge>
                  </div>
                  <Progress value={65} />
                  <p className="text-sm text-muted-foreground">
                    Optimization in progress... Estimated completion in 15 minutes
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active optimizations</p>
                  <p className="text-sm text-muted-foreground">Start optimization to improve model performance</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>System events and adaptive actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemStatus.recentEvents.slice(0, 10).map((event) => (
                  <div key={event.id} className="flex items-start space-x-3 p-3 border rounded">
                    <div className={`mt-1 ${
                      event.severity === 'critical' ? 'text-red-600' :
                      event.severity === 'error' ? 'text-red-500' :
                      event.severity === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {event.severity === 'critical' || event.severity === 'error' ? 
                        <AlertTriangle className="h-4 w-4" /> :
                        <Activity className="h-4 w-4" />
                      }
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{event.message}</p>
                        <Badge variant="outline">
                          {event.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Model: {event.modelId} • {new Date(event.timestamp).toLocaleString()}
                      </p>
                      {event.actionsTaken.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium">Actions Taken:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {event.actionsTaken.map((action, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {action.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {systemStatus.recentEvents.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent events</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}