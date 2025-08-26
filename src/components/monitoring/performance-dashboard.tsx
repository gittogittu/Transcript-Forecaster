'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePerformanceMonitor, PerformanceMetrics } from '@/lib/monitoring/performance-monitor'
import { Badge } from '@/components/ui/badge'

interface PerformanceDashboardProps {
  className?: string
}

export function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const {
    getMetrics,
    getAggregatedMetrics,
    exportMetrics,
    clearMetrics,
    startMonitoring,
    stopMonitoring
  } = usePerformanceMonitor()

  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([])
  const [aggregated, setAggregated] = useState<any>({})
  const [isMonitoring, setIsMonitoring] = useState(true)

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(getMetrics())
      setAggregated(getAggregatedMetrics())
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [getMetrics, getAggregatedMetrics])

  const handleStartMonitoring = () => {
    startMonitoring()
    setIsMonitoring(true)
  }

  const handleStopMonitoring = () => {
    stopMonitoring()
    setIsMonitoring(false)
  }

  const handleExportMetrics = () => {
    const data = exportMetrics()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-metrics-${new Date().toISOString()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClearMetrics = () => {
    clearMetrics()
    setMetrics([])
    setAggregated({})
  }

  const formatTime = (time?: number) => {
    if (typeof time !== 'number') return 'N/A'
    return `${time.toFixed(2)}ms`
  }

  const formatBytes = (bytes?: number) => {
    if (typeof bytes !== 'number') return 'N/A'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)}MB`
  }

  const getScoreColor = (value?: number, thresholds: { good: number; poor: number }) => {
    if (typeof value !== 'number') return 'secondary'
    if (value <= thresholds.good) return 'default'
    if (value <= thresholds.poor) return 'secondary'
    return 'destructive'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isMonitoring ? 'default' : 'secondary'}>
            {isMonitoring ? 'Monitoring Active' : 'Monitoring Stopped'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {aggregated.count || 0} metrics collected
          </span>
        </div>
        
        <div className="flex gap-2">
          {isMonitoring ? (
            <Button variant="outline" onClick={handleStopMonitoring}>
              Stop Monitoring
            </Button>
          ) : (
            <Button onClick={handleStartMonitoring}>
              Start Monitoring
            </Button>
          )}
          <Button variant="outline" onClick={handleExportMetrics}>
            Export Data
          </Button>
          <Button variant="outline" onClick={handleClearMetrics}>
            Clear Data
          </Button>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">First Contentful Paint</CardTitle>
            <CardDescription>FCP</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(aggregated.averages?.fcp)}</div>
            <Badge variant={getScoreColor(aggregated.averages?.fcp, { good: 1800, poor: 3000 })}>
              {aggregated.averages?.fcp <= 1800 ? 'Good' : 
               aggregated.averages?.fcp <= 3000 ? 'Needs Improvement' : 'Poor'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Largest Contentful Paint</CardTitle>
            <CardDescription>LCP</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(aggregated.averages?.lcp)}</div>
            <Badge variant={getScoreColor(aggregated.averages?.lcp, { good: 2500, poor: 4000 })}>
              {aggregated.averages?.lcp <= 2500 ? 'Good' : 
               aggregated.averages?.lcp <= 4000 ? 'Needs Improvement' : 'Poor'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">First Input Delay</CardTitle>
            <CardDescription>FID</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(aggregated.averages?.fid)}</div>
            <Badge variant={getScoreColor(aggregated.averages?.fid, { good: 100, poor: 300 })}>
              {aggregated.averages?.fid <= 100 ? 'Good' : 
               aggregated.averages?.fid <= 300 ? 'Needs Improvement' : 'Poor'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cumulative Layout Shift</CardTitle>
            <CardDescription>CLS</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregated.averages?.cls ? aggregated.averages.cls.toFixed(3) : 'N/A'}
            </div>
            <Badge variant={getScoreColor(aggregated.averages?.cls, { good: 0.1, poor: 0.25 })}>
              {aggregated.averages?.cls <= 0.1 ? 'Good' : 
               aggregated.averages?.cls <= 0.25 ? 'Needs Improvement' : 'Poor'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Custom Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API Response Time</CardTitle>
            <CardDescription>Average response time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(aggregated.averages?.apiResponseTime)}</div>
            <div className="text-xs text-muted-foreground">
              P95: {formatTime(aggregated.p95?.apiResponseTime)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Component Render Time</CardTitle>
            <CardDescription>Average render time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(aggregated.averages?.componentRenderTime)}</div>
            <div className="text-xs text-muted-foreground">
              P95: {formatTime(aggregated.p95?.componentRenderTime)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prediction Calculation</CardTitle>
            <CardDescription>ML processing time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(aggregated.averages?.predictionCalculationTime)}</div>
            <div className="text-xs text-muted-foreground">
              P95: {formatTime(aggregated.p95?.predictionCalculationTime)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memory Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Memory Usage</CardTitle>
          <CardDescription>JavaScript heap memory consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Used</div>
              <div className="text-2xl font-bold">{formatBytes(aggregated.averages?.jsHeapSizeUsed)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Total</div>
              <div className="text-2xl font-bold">{formatBytes(aggregated.averages?.jsHeapSizeTotal)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Limit</div>
              <div className="text-2xl font-bold">{formatBytes(aggregated.averages?.jsHeapSizeLimit)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Metrics</CardTitle>
          <CardDescription>Last 10 performance measurements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.slice(-10).reverse().map((metric, index) => (
              <div key={index} className="flex items-center justify-between text-sm border-b pb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{new Date(metric.timestamp).toLocaleTimeString()}</Badge>
                  <span className="text-muted-foreground">{metric.url.split('/').pop() || '/'}</span>
                </div>
                <div className="flex gap-4 text-xs">
                  {metric.fcp && <span>FCP: {formatTime(metric.fcp)}</span>}
                  {metric.lcp && <span>LCP: {formatTime(metric.lcp)}</span>}
                  {metric.apiResponseTime && <span>API: {formatTime(metric.apiResponseTime)}</span>}
                  {metric.componentRenderTime && <span>Render: {formatTime(metric.componentRenderTime)}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

