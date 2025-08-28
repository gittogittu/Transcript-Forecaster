'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PerformanceCharts } from './performance-charts'
import { SystemHealthIndicators } from './system-health-indicators'
import { AlertManagement } from './alert-management'
import { UserActivityLog } from './user-activity-log'
import { useMonitoring } from '@/lib/hooks/use-monitoring'
import { AlertTriangle, Activity, Users, Zap, Database, Cpu } from 'lucide-react'

export function AdminDashboard() {
  const {
    currentMetrics,
    systemHealth,
    activeAlerts,
    recentActivity,
    metricsSummary,
    isLoading,
    error,
    refreshMetrics,
  } = useMonitoring()

  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshMetrics()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, refreshMetrics])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" data-testid="loading-spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Dashboard</AlertTitle>
        <AlertDescription>
          Failed to load monitoring data: {error.message}
        </AlertDescription>
      </Alert>
    )
  }

  const criticalAlerts = activeAlerts?.filter(alert => alert.severity === 'critical') || []
  const highAlerts = activeAlerts?.filter(alert => alert.severity === 'high') || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor system performance and health indicators
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Auto-refresh On" : "Auto-refresh Off"}
          </Button>
          <Button variant="outline" size="sm" onClick={refreshMetrics}>
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {(criticalAlerts.length > 0 || highAlerts.length > 0) && (
        <Alert variant={criticalAlerts.length > 0 ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {criticalAlerts.length > 0 ? "Critical Alerts" : "Active Alerts"}
          </AlertTitle>
          <AlertDescription>
            {criticalAlerts.length > 0 && (
              <div className="mb-2">
                {criticalAlerts.length} critical alert{criticalAlerts.length !== 1 ? 's' : ''} require immediate attention
              </div>
            )}
            {highAlerts.length > 0 && (
              <div>
                {highAlerts.length} high priority alert{highAlerts.length !== 1 ? 's' : ''} detected
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queries/Second</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics?.queriesPerSecond.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average response time: {metricsSummary?.averageResponseTime.toFixed(0) || '0'}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics?.activeUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Peak: {metricsSummary?.peakActiveUsers || 0} users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Load</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics?.cpuUsage.toFixed(1) || '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Memory: {currentMetrics?.memoryUsage.toFixed(1) || '0.0'}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsSummary?.errorRate.toFixed(2) || '0.00'}%
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMetrics?.errorCount || 0} errors in last 5min
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="activity">User Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>
                  Key performance indicators for the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Total Requests</span>
                  <span className="font-medium">{metricsSummary?.totalRequests || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Average Response Time</span>
                  <span className="font-medium">{metricsSummary?.averageResponseTime.toFixed(0) || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Error Rate</span>
                  <span className="font-medium">{metricsSummary?.errorRate.toFixed(2) || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Peak Active Users</span>
                  <span className="font-medium">{metricsSummary?.peakActiveUsers || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>
                  Current health status of system components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {systemHealth?.map((indicator) => (
                    <div key={indicator.component} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{indicator.component.replace('_', ' ')}</span>
                      <Badge
                        variant={
                          indicator.status === 'healthy' ? 'default' :
                          indicator.status === 'warning' ? 'secondary' : 'destructive'
                        }
                      >
                        {indicator.status}
                      </Badge>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No health data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceCharts />
        </TabsContent>

        <TabsContent value="health">
          <SystemHealthIndicators />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertManagement />
        </TabsContent>

        <TabsContent value="activity">
          <UserActivityLog />
        </TabsContent>
      </Tabs>
    </div>
  )
}