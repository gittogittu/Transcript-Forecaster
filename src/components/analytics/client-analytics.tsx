'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar,
  Target,
  Award,
  BarChart3
} from 'lucide-react'
import { TranscriptData } from '@/types/transcript'

interface ClientAnalyticsProps {
  data: TranscriptData[]
  selectedClient?: string
  timeRange?: string
}

interface ClientMetrics {
  clientName: string
  totalTranscripts: number
  averagePerMonth: number
  growthRate: number
  marketShare: number
  rank: number
  monthlyData: Array<{
    month: string
    count: number
  }>
  peakMonth: {
    month: string
    count: number
  }
  consistency: number // Coefficient of variation (lower = more consistent)
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff', '#00ffff', '#ff0000']

export function ClientAnalytics({ data, selectedClient, timeRange }: ClientAnalyticsProps) {
  // Calculate client metrics
  const clientMetrics = useMemo((): ClientMetrics[] => {
    if (!data.length) return []

    const totalTranscripts = data.reduce((sum, item) => sum + item.transcriptCount, 0)
    const clientGroups = data.reduce((acc, item) => {
      if (!acc[item.clientName]) {
        acc[item.clientName] = []
      }
      acc[item.clientName].push(item)
      return acc
    }, {} as Record<string, TranscriptData[]>)

    const metrics = Object.entries(clientGroups).map(([clientName, clientData]) => {
      const clientTotal = clientData.reduce((sum, item) => sum + item.transcriptCount, 0)
      
      // Monthly aggregation
      const monthlyData: Record<string, number> = {}
      clientData.forEach(item => {
        const date = new Date(item.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + item.transcriptCount
      })

      const sortedMonths = Object.keys(monthlyData).sort()
      const monthlyArray = sortedMonths.map(month => ({
        month,
        count: monthlyData[month]
      }))

      // Calculate growth rate
      let growthRate = 0
      if (sortedMonths.length >= 2) {
        const firstMonth = monthlyData[sortedMonths[0]]
        const lastMonth = monthlyData[sortedMonths[sortedMonths.length - 1]]
        if (firstMonth > 0) {
          growthRate = ((lastMonth - firstMonth) / firstMonth) * 100
        }
      }

      // Find peak month
      let peakMonth = { month: '', count: 0 }
      Object.entries(monthlyData).forEach(([month, count]) => {
        if (count > peakMonth.count) {
          peakMonth = { month, count }
        }
      })

      // Calculate consistency (coefficient of variation)
      const counts = Object.values(monthlyData)
      const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length
      const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length
      const standardDeviation = Math.sqrt(variance)
      const consistency = mean > 0 ? (standardDeviation / mean) * 100 : 0

      return {
        clientName,
        totalTranscripts: clientTotal,
        averagePerMonth: Math.round(clientTotal / Math.max(sortedMonths.length, 1)),
        growthRate: Math.round(growthRate * 100) / 100,
        marketShare: (clientTotal / totalTranscripts) * 100,
        rank: 0, // Will be set after sorting
        monthlyData: monthlyArray,
        peakMonth,
        consistency: Math.round(consistency * 100) / 100
      }
    })

    // Sort by total transcripts and assign ranks
    metrics.sort((a, b) => b.totalTranscripts - a.totalTranscripts)
    metrics.forEach((metric, index) => {
      metric.rank = index + 1
    })

    return metrics
  }, [data])

  // Filter for selected client if specified
  const displayMetrics = selectedClient 
    ? clientMetrics.filter(m => m.clientName === selectedClient)
    : clientMetrics.slice(0, 10) // Top 10 clients

  // Prepare data for charts
  const marketShareData = clientMetrics.slice(0, 8).map((metric, index) => ({
    name: metric.clientName,
    value: metric.totalTranscripts,
    percentage: metric.marketShare,
    color: COLORS[index % COLORS.length]
  }))

  const comparisonData = useMemo(() => {
    if (selectedClient) {
      const selectedMetric = clientMetrics.find(m => m.clientName === selectedClient)
      if (!selectedMetric) return []
      
      return selectedMetric.monthlyData.map(item => ({
        month: item.month,
        [selectedClient]: item.count
      }))
    }

    // Multi-client comparison
    const allMonths = new Set<string>()
    displayMetrics.forEach(metric => {
      metric.monthlyData.forEach(item => allMonths.add(item.month))
    })

    return Array.from(allMonths).sort().map(month => {
      const dataPoint: any = { month }
      displayMetrics.forEach(metric => {
        const monthData = metric.monthlyData.find(m => m.month === month)
        dataPoint[metric.clientName] = monthData?.count || 0
      })
      return dataPoint
    })
  }, [displayMetrics, selectedClient])

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{`Month: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${entry.value} transcripts`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const formatMonthLabel = (tickItem: string) => {
    const [year, month] = tickItem.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  if (displayMetrics.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No client data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Client Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayMetrics.slice(0, 4).map((metric, index) => (
          <motion.div
            key={metric.clientName}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={metric.rank <= 3 ? "default" : "secondary"}>
                    #{metric.rank}
                  </Badge>
                  {metric.growthRate > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-1">{metric.clientName}</h3>
                <p className="text-2xl font-bold mb-1">{metric.totalTranscripts.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mb-2">
                  {metric.marketShare.toFixed(1)}% market share
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Growth Rate</span>
                    <span className={metric.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {metric.growthRate > 0 ? '+' : ''}{metric.growthRate}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(Math.abs(metric.growthRate), 100)} 
                    className="h-1"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Share Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Market Share Distribution
            </CardTitle>
            <CardDescription>
              Transcript volume distribution across top clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={marketShareData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {marketShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    `${value} transcripts (${marketShareData.find(d => d.name === name)?.percentage.toFixed(1)}%)`,
                    'Volume'
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client Performance Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Client Performance Ranking
            </CardTitle>
            <CardDescription>
              Total transcript volume by client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={displayMetrics.slice(0, 8)} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="clientName" 
                  type="category" 
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: any) => [`${value} transcripts`, 'Total Volume']}
                />
                <Bar 
                  dataKey="totalTranscripts" 
                  fill="#8884d8"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trend Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {selectedClient ? `${selectedClient} Monthly Trends` : 'Client Comparison Trends'}
          </CardTitle>
          <CardDescription>
            Monthly transcript volume trends over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tickFormatter={formatMonthLabel}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                label={{ value: 'Transcript Count', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {displayMetrics.map((metric, index) => (
                <Line
                  key={metric.clientName}
                  type="monotone"
                  dataKey={metric.clientName}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Client Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Detailed Client Metrics
          </CardTitle>
          <CardDescription>
            Comprehensive performance metrics for each client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Rank</th>
                  <th className="text-left p-2">Client</th>
                  <th className="text-right p-2">Total Volume</th>
                  <th className="text-right p-2">Market Share</th>
                  <th className="text-right p-2">Avg/Month</th>
                  <th className="text-right p-2">Growth Rate</th>
                  <th className="text-right p-2">Consistency</th>
                  <th className="text-left p-2">Peak Month</th>
                </tr>
              </thead>
              <tbody>
                {displayMetrics.map((metric) => (
                  <tr key={metric.clientName} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <Badge variant={metric.rank <= 3 ? "default" : "secondary"}>
                        #{metric.rank}
                      </Badge>
                    </td>
                    <td className="p-2 font-medium">{metric.clientName}</td>
                    <td className="p-2 text-right">{metric.totalTranscripts.toLocaleString()}</td>
                    <td className="p-2 text-right">{metric.marketShare.toFixed(1)}%</td>
                    <td className="p-2 text-right">{metric.averagePerMonth}</td>
                    <td className="p-2 text-right">
                      <span className={metric.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {metric.growthRate > 0 ? '+' : ''}{metric.growthRate}%
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <span className={metric.consistency < 50 ? 'text-green-600' : 'text-yellow-600'}>
                        {metric.consistency.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="text-sm">
                        <div>{formatMonthLabel(metric.peakMonth.month)}</div>
                        <div className="text-muted-foreground">{metric.peakMonth.count} transcripts</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}