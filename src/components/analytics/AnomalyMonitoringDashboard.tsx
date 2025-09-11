'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Clock,
  TrendingUp,
  Users,
  Activity,
  Shield
} from 'lucide-react'

interface Anomaly {
  id: string
  client_name: string
  detection_date: string
  anomaly_type: string
  severity: string
  actual_value: number
  expected_value: number
  deviation_score: number
  confidence_score: number
  description: string
  status: string
  created_at: string
}

interface MonitoringData {
  anomalies: Anomaly[]
  summary: {
    total_anomalies: number
    critical_count: number
    high_count: number
    medium_count: number
    low_count: number
    active_count: number
    resolved_count: number
    today_count: number
    week_count: number
  }
  top_clients: Array<{
    client_name: string
    anomaly_count: number
    max_severity: string
    last_anomaly: string
  }>
  monitoring_rules: Array<{
    rule_name: string
    rule_type: string
    threshold_value: number
    severity_level: string
    is_active: boolean
  }>
  last_updated: string
}

export function AnomalyMonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadMonitoringData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/anomaly-detection/monitor')
      if (!response.ok) throw new Error('Failed to load monitoring data')
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError('Failed to load monitoring data')
    } finally {
      setLoading(false)
    }
  }

  const resolveAnomaly = async (anomalyId: string) => {
    try {
      const response = await fetch('/api/anomaly-detection/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          anomaly_id: anomalyId,
          notes: 'Resolved from monitoring dashboard'
        })
      })
      
      if (response.ok) {
        await loadMonitoringData()
      }
    } catch (err) {
      setError('Failed to resolve anomaly')
    }
  }

  const markFalsePositive = async (anomalyId: string) => {
    try {
      const response = await fetch('/api/anomaly-detection/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_false_positive',
          anomaly_id: anomalyId
        })
      })
      
      if (response.ok) {
        await loadMonitoringData()
      }
    } catch (err) {
      setError('Failed to mark as false positive')
    }
  }

  const runDetection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/anomaly-detection/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_detection' })
      })
      
      if (response.ok) {
        await loadMonitoringData()
      }
    } catch (err) {
      setError('Failed to run detection')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMonitoringData()
    
    if (autoRefresh) {
      const interval = setInterval(loadMonitoringData, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'medium': return <Clock className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading monitoring data...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Anomaly Monitoring Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time anomaly detection and monitoring system
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button onClick={runDetection} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Run Detection
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Anomalies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.active_count}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.today_count} detected today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.summary.critical_count}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.week_count}</div>
            <p className="text-xs text-muted-foreground">
              Total anomalies detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.total_anomalies > 0 
                ? Math.round((data.summary.resolved_count / data.summary.total_anomalies) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.resolved_count} resolved
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Anomalies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Anomalies
            </CardTitle>
            <CardDescription>
              Latest detected anomalies requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {data.anomalies.slice(0, 10).map((anomaly) => (
                <div key={anomaly.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className={`w-3 h-3 rounded-full mt-1 ${getSeverityColor(anomaly.severity)}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{anomaly.client_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {anomaly.anomaly_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {anomaly.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{new Date(anomaly.detection_date).toLocaleDateString()}</span>
                        <span>Confidence: {(anomaly.confidence_score * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {anomaly.status === 'active' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveAnomaly(anomaly.id)}
                        className="text-xs"
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markFalsePositive(anomaly.id)}
                        className="text-xs"
                      >
                        False+
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Anomalous Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Anomalous Clients
            </CardTitle>
            <CardDescription>
              Clients with the most anomalies detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.top_clients.map((client, index) => (
                <div key={client.client_name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{client.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Last: {new Date(client.last_anomaly).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{client.anomaly_count}</span>
                      <div className={`w-2 h-2 rounded-full ${getSeverityColor(client.max_severity)}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">anomalies</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monitoring Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Monitoring Rules
          </CardTitle>
          <CardDescription>
            Active anomaly detection rules and thresholds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.monitoring_rules.map((rule) => (
              <div key={rule.rule_name} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{rule.rule_name}</h4>
                  <Badge variant={rule.is_active ? "default" : "secondary"}>
                    {rule.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Type: {rule.rule_type}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Threshold: {rule.threshold_value}</span>
                  <Badge variant="outline" className={getSeverityColor(rule.severity_level)}>
                    {rule.severity_level}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        Last updated: {new Date(data.last_updated).toLocaleString()}
      </div>
    </div>
  )
}