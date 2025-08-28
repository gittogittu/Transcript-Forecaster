'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useMonitoring } from '@/lib/hooks/use-monitoring'
import { formatDistanceToNow } from 'date-fns'
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Database, 
  Cpu, 
  Activity, 
  Zap,
  Users,
  AlertCircle
} from 'lucide-react'

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case 'critical':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />
  }
}

const getComponentIcon = (component: string) => {
  switch (component.toLowerCase()) {
    case 'database':
    case 'db':
      return <Database className="h-5 w-5" />
    case 'api':
      return <Activity className="h-5 w-5" />
    case 'ml_models':
    case 'ml':
      return <Zap className="h-5 w-5" />
    case 'auth':
    case 'authentication':
      return <Users className="h-5 w-5" />
    default:
      return <Cpu className="h-5 w-5" />
  }
}

export function SystemHealthIndicators() {
  const { 
    systemHealth, 
    currentMetrics, 
    isLoading, 
    error, 
    refreshMetrics 
  } = useMonitoring()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center text-center">
            <div>
              <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Failed to load system health data
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshMetrics}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const overallHealth = systemHealth?.length 
    ? systemHealth.every(h => h.status === 'healthy') 
      ? 'healthy' 
      : systemHealth.some(h => h.status === 'critical') 
        ? 'critical' 
        : 'warning'
    : 'unknown'

  return (
    <div className="space-y-6">
      {/* Overall System Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(overallHealth)}
                System Status
              </CardTitle>
              <CardDescription>
                Overall system health and component status
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refreshMetrics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Overall Health</span>
            <Badge
              variant={
                overallHealth === 'healthy' ? 'default' :
                overallHealth === 'warning' ? 'secondary' : 'destructive'
              }
              className="capitalize"
            >
              {overallHealth}
            </Badge>
          </div>
          
          {systemHealth && systemHealth.length > 0 ? (
            <div className="space-y-3">
              {systemHealth.map((indicator) => (
                <div key={indicator.component} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getComponentIcon(indicator.component)}
                    <div>
                      <div className="font-medium capitalize">
                        {indicator.component.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {indicator.message}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last checked: {formatDistanceToNow(indicator.lastChecked, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {indicator.responseTime && (
                      <span className="text-xs text-muted-foreground">
                        {indicator.responseTime}ms
                      </span>
                    )}
                    <Badge
                      variant={
                        indicator.status === 'healthy' ? 'default' :
                        indicator.status === 'warning' ? 'secondary' : 'destructive'
                      }
                    >
                      {indicator.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No health indicators available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resource Usage */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Usage</span>
                <span>{currentMetrics?.cpuUsage.toFixed(1) || 0}%</span>
              </div>
              <Progress 
                value={currentMetrics?.cpuUsage || 0} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {currentMetrics?.cpuUsage && currentMetrics.cpuUsage > 80 
                  ? 'High CPU usage detected' 
                  : 'CPU usage is normal'
                }
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Usage</span>
                <span>{currentMetrics?.memoryUsage.toFixed(1) || 0}%</span>
              </div>
              <Progress 
                value={currentMetrics?.memoryUsage || 0} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {currentMetrics?.memoryUsage && currentMetrics.memoryUsage > 85 
                  ? 'High memory usage detected' 
                  : 'Memory usage is normal'
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>
            Current system performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">API Performance</span>
              </div>
              <div className="text-2xl font-bold">
                {currentMetrics?.queriesPerSecond.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-muted-foreground">
                queries per second
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">ML Performance</span>
              </div>
              <div className="text-2xl font-bold">
                {currentMetrics?.modelRuntime.toFixed(0) || '0'}ms
              </div>
              <div className="text-xs text-muted-foreground">
                average model runtime
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Data Sync</span>
              </div>
              <div className="text-2xl font-bold">
                {currentMetrics?.dataSyncLatency.toFixed(0) || '0'}ms
              </div>
              <div className="text-xs text-muted-foreground">
                sync latency
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}