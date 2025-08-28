"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts'
import { TrendingUp, TrendingDown, Users, Clock, AlertTriangle } from 'lucide-react'
import type { AHTSummary, MonthlyTrend, ClientPerformance } from '@/types/aht'

interface AHTDashboardProps {
  className?: string
}

export function AHTDashboard({ className }: AHTDashboardProps) {
  const [summary, setSummary] = useState<AHTSummary | null>(null)
  const [trends, setTrends] = useState<MonthlyTrend[]>([])
  const [clientPerformance, setClientPerformance] = useState<ClientPerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, trendsRes, clientsRes] = await Promise.all([
          fetch('/api/aht/summary'),
          fetch('/api/aht/trends'),
          fetch('/api/aht/clients?type=performance')
        ])

        const [summaryData, trendsData, clientsData] = await Promise.all([
          summaryRes.json(),
          trendsRes.json(),
          clientsRes.json()
        ])

        if (summaryData.success) setSummary(summaryData.data)
        if (trendsData.success) setTrends(trendsData.data)
        if (clientsData.success) setClientPerformance(clientsData.data)
      } catch (error) {
        console.error('Error fetching AHT data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      default: return 'outline'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <div className="h-4 w-4" />
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalClients}</div>
              <p className="text-xs text-muted-foreground">Active clients</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average AHT</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.averageAHT}s</div>
              <p className="text-xs text-muted-foreground">Median: {summary.medianAHT}s</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Highest AHT</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.highestAHT.value}s</div>
              <p className="text-xs text-muted-foreground">{summary.highestAHT.client}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalVolume.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts and Analysis */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
          <TabsTrigger value="clients">Client Performance</TabsTrigger>
          <TabsTrigger value="analysis">Risk Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Volume Trends</CardTitle>
              <CardDescription>
                Volume and average AHT trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="totalVolume" fill="#8884d8" name="Volume" />
                  <Line yAxisId="right" type="monotone" dataKey="averageAHT" stroke="#82ca9d" name="Avg AHT" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Performance Overview</CardTitle>
              <CardDescription>
                AHT performance and trends by client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clientPerformance.slice(0, 10).map((client) => (
                  <div key={client.client} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{client.client}</div>
                      <div className="text-sm text-muted-foreground">
                        AHT: {client.overallAHT}s
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(client.trend)}
                      <Badge variant={getRiskColor(client.riskLevel)}>
                        {client.riskLevel} risk
                      </Badge>
                      {client.trendPercentage !== 0 && (
                        <span className="text-sm text-muted-foreground">
                          {client.trendPercentage > 0 ? '+' : ''}{client.trendPercentage}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>
                  Client risk levels based on AHT and volume
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['high', 'medium', 'low'].map((risk) => {
                    const count = clientPerformance.filter(c => c.riskLevel === risk).length
                    const percentage = Math.round((count / clientPerformance.length) * 100)
                    return (
                      <div key={risk} className="flex items-center justify-between">
                        <Badge variant={getRiskColor(risk)}>{risk} risk</Badge>
                        <span className="text-sm">{count} clients ({percentage}%)</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trend Analysis</CardTitle>
                <CardDescription>
                  Volume trend distribution across clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['increasing', 'stable', 'decreasing'].map((trend) => {
                    const count = clientPerformance.filter(c => c.trend === trend).length
                    const percentage = Math.round((count / clientPerformance.length) * 100)
                    return (
                      <div key={trend} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTrendIcon(trend)}
                          <span className="capitalize">{trend}</span>
                        </div>
                        <span className="text-sm">{count} clients ({percentage}%)</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}