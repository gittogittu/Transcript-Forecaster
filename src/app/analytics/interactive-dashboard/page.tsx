'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  AlertTriangle, 
  Download, 
  RefreshCw,
  Calendar,
  Users,
  FileText,
  Clock,
  Target,
  Zap
} from 'lucide-react'
import { ForecastChart } from '@/components/analytics/ForecastChart'
import { AnomalyMonitoringDashboard } from '@/components/analytics/AnomalyMonitoringDashboard'

interface ForecastData {
  month: string
  predicted_transcripts: number
  confidence_interval: [number, number]
  growth_rate: number
}

interface AnomalyData {
  client_name: string
  anomaly_score: number
  expected_range: [number, number]
  actual_value: number
  severity: 'low' | 'medium' | 'high'
}

interface DashboardStats {
  total_clients: number
  total_transcripts: number
  avg_aht: number
  active_clients_this_month: number
}

export default function InteractiveDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load initial dashboard stats
  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard/stats')
      if (!response.ok) throw new Error('Failed to load stats')
      const data = await response.json()
      setStats(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError('Failed to load dashboard statistics')
    }
  }

  const generateForecasts = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/forecasting/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          months_ahead: 6,
          include_confidence: true,
          model_type: 'ensemble'
        })
      })
      
      if (!response.ok) throw new Error('Failed to generate forecasts')
      const data = await response.json()
      setForecasts(data.forecasts)
      setActiveTab('forecasts')
    } catch (err) {
      setError('Failed to generate forecasts. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const detectAnomalies = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/anomaly-detection/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detection_method: 'isolation_forest',
          sensitivity: 0.1,
          include_explanations: true
        })
      })
      
      if (!response.ok) throw new Error('Failed to detect anomalies')
      const data = await response.json()
      setAnomalies(data.anomalies)
      setActiveTab('anomalies')
    } catch (err) {
      setError('Failed to detect anomalies. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const exportToSheets = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/analytics/export/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          include_forecasts: forecasts.length > 0,
          include_anomalies: anomalies.length > 0,
          format: 'comprehensive'
        })
      })
      
      if (!response.ok) throw new Error('Failed to export to Google Sheets')
      const data = await response.json()
      
      // Open the Google Sheets URL
      if (data.sheet_url) {
        window.open(data.sheet_url, '_blank')
      }
      
      setError(null)
    } catch (err) {
      setError('Failed to export to Google Sheets. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setLoading(true)
    await loadDashboardStats()
    setLoading(false)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num))
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Interactive Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time insights and predictive analytics for transcript data
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshData} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {lastUpdated && (
            <Badge variant="secondary">
              Updated: {lastUpdated.toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button 
          onClick={generateForecasts} 
          disabled={loading}
          className="h-20 flex flex-col items-center justify-center space-y-2"
        >
          <TrendingUp className="h-6 w-6" />
          <span>Generate Forecasts</span>
        </Button>
        
        <Button 
          onClick={detectAnomalies} 
          disabled={loading}
          variant="outline"
          className="h-20 flex flex-col items-center justify-center space-y-2"
        >
          <AlertTriangle className="h-6 w-6" />
          <span>Detect Anomalies</span>
        </Button>
        
        <Button 
          onClick={exportToSheets} 
          disabled={loading}
          variant="outline"
          className="h-20 flex flex-col items-center justify-center space-y-2"
        >
          <Download className="h-6 w-6" />
          <span>Export to Sheets</span>
        </Button>
        
        <Button 
          onClick={() => setActiveTab('monitoring')} 
          variant="outline"
          className="h-20 flex flex-col items-center justify-center space-y-2"
        >
          <AlertTriangle className="h-6 w-6" />
          <span>Anomaly Monitor</span>
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium">Processing your request...</p>
                <Progress value={33} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_clients}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transcripts</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(stats.total_transcripts)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average AHT</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.avg_aht.toFixed(1)}m</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active This Month</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.active_clients_this_month}</div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Use the buttons above to generate insights and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Predictive Forecasting</p>
                    <p className="text-sm text-muted-foreground">
                      Generate 6-month forecasts using ensemble ML models
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">Anomaly Detection</p>
                    <p className="text-sm text-muted-foreground">
                      Identify unusual patterns and outliers in your data
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Download className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Export to Google Sheets</p>
                    <p className="text-sm text-muted-foreground">
                      Share insights with stakeholders in familiar format
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasts" className="space-y-6">
          {forecasts.length > 0 ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    6-Month Forecast
                  </CardTitle>
                  <CardDescription>
                    Predicted transcript volumes with confidence intervals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {forecasts.map((forecast, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{forecast.month}</p>
                            <p className="text-sm text-muted-foreground">
                              Range: {formatNumber(forecast.confidence_interval[0])} - {formatNumber(forecast.confidence_interval[1])}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{formatNumber(forecast.predicted_transcripts)}</p>
                          <div className="flex items-center space-x-1">
                            {forecast.growth_rate > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`text-sm ${forecast.growth_rate > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {forecast.growth_rate > 0 ? '+' : ''}{forecast.growth_rate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No Forecasts Generated</p>
                <p className="text-muted-foreground mb-4">
                  Click "Generate Forecasts" to create predictive analytics
                </p>
                <Button onClick={generateForecasts} disabled={loading}>
                  Generate Forecasts Now
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-6">
          {anomalies.length > 0 ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Detected Anomalies
                  </CardTitle>
                  <CardDescription>
                    Unusual patterns and outliers in transcript data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {anomalies.map((anomaly, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${getSeverityColor(anomaly.severity)}`} />
                          <div>
                            <p className="font-medium">{anomaly.client_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Expected: {formatNumber(anomaly.expected_range[0])} - {formatNumber(anomaly.expected_range[1])}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatNumber(anomaly.actual_value)}</p>
                          <Badge variant={anomaly.severity === 'high' ? 'destructive' : 'secondary'}>
                            {anomaly.severity} severity
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No Anomalies Detected</p>
                <p className="text-muted-foreground mb-4">
                  Click "Detect Anomalies" to analyze your data for unusual patterns
                </p>
                <Button onClick={detectAnomalies} disabled={loading}>
                  Detect Anomalies Now
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <AnomalyMonitoringDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}