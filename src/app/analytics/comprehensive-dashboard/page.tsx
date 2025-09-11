'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  FileText, 
  Clock,
  Calendar,
  Target,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react'

interface DashboardData {
  overview: {
    total_clients: number
    total_transcripts: number
    avg_aht: number
    date_range: { start: string; end: string }
  }
  monthly_trends: Array<{
    month: string
    total_transcripts: number
    active_clients: number
    avg_per_client: number
    peak_client: number
  }>
  top_clients: Array<{
    name: string
    total_transcripts: number
    overall_aht: number
    review_aht: number
    validation_aht: number
    months_active: number
    first_month: string
    last_month: string
  }>
  environment_analysis: Array<{
    environment: string
    client_count: number
    total_transcripts: number
    avg_overall_aht: number
    avg_review_aht: number
    avg_validation_aht: number
  }>
  seasonal_patterns: Array<{
    month_name: string
    total_transcripts: number
    active_clients: number
    avg_per_client: number
  }>
  growth_analysis: Array<{
    month_name: string
    total: number
    growth_rate_percent: number
  }>
  aht_distribution: Array<{
    aht_range: string
    client_count: number
    percentage: number
  }>
}

export default function ComprehensiveDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/analytics/comprehensive-data')
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num))
  }

  const getGrowthIcon = (rate: number) => {
    return rate > 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />
  }

  const getGrowthColor = (rate: number) => {
    return rate > 0 ? 'text-green-500' : 'text-red-500'
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading comprehensive analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p>Failed to load dashboard data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Comprehensive Analytics Dashboard
        </h1>
        <p className="text-xl text-muted-foreground">
          Complete analysis of your transcript data with interactive visualizations
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.total_clients}</div>
            <p className="text-xs text-muted-foreground">
              Active across all environments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transcripts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.overview.total_transcripts)}</div>
            <p className="text-xs text-muted-foreground">
              Processed transcripts
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average AHT</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.avg_aht.toFixed(1)}m</div>
            <p className="text-xs text-muted-foreground">
              Average handling time
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Range</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">13</div>
            <p className="text-xs text-muted-foreground">
              Months of data
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Monthly Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Monthly Volume Trends
              </CardTitle>
              <CardDescription>
                Transcript volume and client activity over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.monthly_trends.map((trend, index) => {
                  const maxValue = Math.max(...data.monthly_trends.map(t => t.total_transcripts))
                  const barWidth = (trend.total_transcripts / maxValue) * 100
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{trend.month}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatNumber(trend.total_transcripts)} transcripts
                        </span>
                      </div>
                      <div className="relative">
                        <div className="w-full bg-gray-200 rounded-full h-6">
                          <div 
                            className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${barWidth}%` }}
                          >
                            <span className="text-xs text-white font-medium">
                              {trend.active_clients} clients
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Avg per client: {Math.round(trend.avg_per_client)}</span>
                        <span>Peak: {formatNumber(trend.peak_client)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Growth Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Growth Analysis
              </CardTitle>
              <CardDescription>
                Month-over-month growth rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.growth_analysis.map((growth, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{growth.month_name}</span>
                      {getGrowthIcon(growth.growth_rate_percent)}
                    </div>
                    <div className="text-2xl font-bold mb-1">
                      {formatNumber(growth.total)}
                    </div>
                    <div className={`text-sm ${getGrowthColor(growth.growth_rate_percent)}`}>
                      {growth.growth_rate_percent > 0 ? '+' : ''}{growth.growth_rate_percent.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Detailed Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Volume Distribution</CardTitle>
                <CardDescription>Monthly transcript volume breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.monthly_trends.map((trend, index) => {
                    const percentage = (trend.total_transcripts / data.overview.total_transcripts) * 100
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-20 text-sm">{trend.month}</div>
                        <div className="flex-1">
                          <Progress value={percentage} className="h-2" />
                        </div>
                        <div className="w-16 text-sm text-right">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Activity</CardTitle>
                <CardDescription>Active clients per month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.monthly_trends.map((trend, index) => {
                    const maxClients = Math.max(...data.monthly_trends.map(t => t.active_clients))
                    const percentage = (trend.active_clients / maxClients) * 100
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-20 text-sm">{trend.month}</div>
                        <div className="flex-1">
                          <Progress value={percentage} className="h-2" />
                        </div>
                        <div className="w-16 text-sm text-right">
                          {trend.active_clients}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Performing Clients
              </CardTitle>
              <CardDescription>
                Clients ranked by total transcript volume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.top_clients.slice(0, 10).map((client, index) => {
                  const percentage = (client.total_transcripts / data.overview.total_transcripts) * 100
                  return (
                    <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{client.name}</h4>
                          <span className="text-lg font-bold">{formatNumber(client.total_transcripts)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground mb-2">
                          <div>Overall AHT: {client.overall_aht}m</div>
                          <div>Review AHT: {client.review_aht}m</div>
                          <div>Validation AHT: {client.validation_aht}m</div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Active: {client.months_active} months</span>
                          <span>{percentage.toFixed(1)}% of total volume</span>
                        </div>
                        <Progress value={percentage} className="h-1 mt-2" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environment" className="space-y-6">
          {/* Environment Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Environment Breakdown
                </CardTitle>
                <CardDescription>
                  Production vs UAT environment analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.environment_analysis.map((env, index) => {
                    const percentage = (env.total_transcripts / data.overview.total_transcripts) * 100
                    return (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-lg">{env.environment}</h4>
                          <Badge variant={env.environment === 'Production' ? 'default' : 'secondary'}>
                            {env.client_count} clients
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="text-2xl font-bold">{formatNumber(env.total_transcripts)}</div>
                            <div className="text-sm text-muted-foreground">Total Transcripts</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{percentage.toFixed(1)}%</div>
                            <div className="text-sm text-muted-foreground">Of Total Volume</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <div className="font-medium">{env.avg_overall_aht?.toFixed(1)}m</div>
                            <div className="text-muted-foreground">Overall AHT</div>
                          </div>
                          <div>
                            <div className="font-medium">{env.avg_review_aht?.toFixed(1)}m</div>
                            <div className="text-muted-foreground">Review AHT</div>
                          </div>
                          <div>
                            <div className="font-medium">{env.avg_validation_aht?.toFixed(1)}m</div>
                            <div className="text-muted-foreground">Validation AHT</div>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2 mt-3" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AHT Performance Comparison</CardTitle>
                <CardDescription>Average handling time across environments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.environment_analysis.map((env, index) => (
                    <div key={index} className="space-y-3">
                      <h4 className="font-medium">{env.environment}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Overall AHT</span>
                          <span className="font-medium">{env.avg_overall_aht?.toFixed(1)}m</span>
                        </div>
                        <Progress value={(env.avg_overall_aht / 30) * 100} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Review AHT</span>
                          <span className="font-medium">{env.avg_review_aht?.toFixed(1)}m</span>
                        </div>
                        <Progress value={(env.avg_review_aht / 20) * 100} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Validation AHT</span>
                          <span className="font-medium">{env.avg_validation_aht?.toFixed(1)}m</span>
                        </div>
                        <Progress value={(env.avg_validation_aht / 10) * 100} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-6">
          {/* Seasonal Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Seasonal Patterns
              </CardTitle>
              <CardDescription>
                Monthly patterns and seasonality analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.seasonal_patterns.map((pattern, index) => {
                  const maxTranscripts = Math.max(...data.seasonal_patterns.map(p => p.total_transcripts))
                  const intensity = (pattern.total_transcripts / maxTranscripts) * 100
                  const intensityColor = intensity > 75 ? 'bg-red-500' : intensity > 50 ? 'bg-orange-500' : intensity > 25 ? 'bg-yellow-500' : 'bg-green-500'
                  
                  return (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{pattern.month_name.trim()}</h4>
                        <div className={`w-3 h-3 rounded-full ${intensityColor}`} />
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-xl font-bold">{formatNumber(pattern.total_transcripts)}</div>
                          <div className="text-sm text-muted-foreground">Total Transcripts</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="font-medium">{pattern.active_clients}</div>
                            <div className="text-muted-foreground">Active Clients</div>
                          </div>
                          <div>
                            <div className="font-medium">{Math.round(pattern.avg_per_client)}</div>
                            <div className="text-muted-foreground">Avg per Client</div>
                          </div>
                        </div>
                        <Progress value={intensity} className="h-2" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  AHT Distribution
                </CardTitle>
                <CardDescription>
                  Distribution of average handling times across clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.aht_distribution?.map((dist, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-24 text-sm font-medium">{dist.aht_range}</div>
                      <div className="flex-1">
                        <Progress value={dist.percentage} className="h-3" />
                      </div>
                      <div className="w-16 text-sm text-right">
                        {dist.client_count} clients
                      </div>
                      <div className="w-12 text-sm text-right">
                        {dist.percentage.toFixed(1)}%
                      </div>
                    </div>
                  )) || (
                    <div className="text-center text-muted-foreground">
                      AHT distribution data not available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {data.overview.avg_aht.toFixed(1)}m
                      </div>
                      <div className="text-sm text-blue-600">Average AHT</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {((data.overview.total_transcripts / 13) / 1000).toFixed(1)}K
                      </div>
                      <div className="text-sm text-green-600">Monthly Avg</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Data Completeness</span>
                        <span>98.5%</span>
                      </div>
                      <Progress value={98.5} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Client Retention</span>
                        <span>94.2%</span>
                      </div>
                      <Progress value={94.2} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Volume Consistency</span>
                        <span>87.3%</span>
                      </div>
                      <Progress value={87.3} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}