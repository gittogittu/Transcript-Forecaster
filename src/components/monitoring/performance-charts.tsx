'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useMonitoring } from '@/lib/hooks/use-monitoring'
import { format, subHours, subDays } from 'date-fns'

type TimeRange = '1h' | '6h' | '24h' | '7d'

export function PerformanceCharts() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const { getHistoricalMetrics, isLoading } = useMonitoring()

  const timeRangeOptions = {
    '1h': { label: 'Last Hour', hours: 1 },
    '6h': { label: 'Last 6 Hours', hours: 6 },
    '24h': { label: 'Last 24 Hours', hours: 24 },
    '7d': { label: 'Last 7 Days', hours: 168 },
  }

  const chartData = useMemo(() => {
    const hours = timeRangeOptions[timeRange].hours
    const endTime = new Date()
    const startTime = subHours(endTime, hours)
    
    // Generate mock historical data - in real implementation, this would come from the database
    const data = []
    const points = Math.min(hours, 50) // Limit data points for performance
    const interval = hours * 60 / points // minutes between points
    
    for (let i = 0; i < points; i++) {
      const timestamp = new Date(startTime.getTime() + (i * interval * 60 * 1000))
      data.push({
        timestamp: timestamp.toISOString(),
        time: format(timestamp, hours <= 6 ? 'HH:mm' : hours <= 24 ? 'HH:mm' : 'MM/dd HH:mm'),
        queriesPerSecond: Math.random() * 5 + 2,
        responseTime: Math.random() * 200 + 100,
        errorCount: Math.floor(Math.random() * 10),
        activeUsers: Math.floor(Math.random() * 50 + 10),
        cpuUsage: Math.random() * 30 + 40,
        memoryUsage: Math.random() * 20 + 50,
        modelRuntime: Math.random() * 1000 + 500,
      })
    }
    
    return data
  }, [timeRange])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Performance Charts</h2>
        <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(timeRangeOptions).map(([key, option]) => (
              <SelectItem key={key} value={key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Response Time and Queries/Second */}
        <Card>
          <CardHeader>
            <CardTitle>API Performance</CardTitle>
            <CardDescription>
              Response times and query throughput over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Response Time (ms)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="queriesPerSecond"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Queries/Second"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* System Resources */}
        <Card>
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
            <CardDescription>
              CPU and memory usage over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cpuUsage"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="CPU Usage (%)"
                />
                <Area
                  type="monotone"
                  dataKey="memoryUsage"
                  stackId="1"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  name="Memory Usage (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Error Count */}
        <Card>
          <CardHeader>
            <CardTitle>Error Tracking</CardTitle>
            <CardDescription>
              Error occurrences over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="errorCount"
                  fill="#ff6b6b"
                  name="Error Count"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Active Users and ML Performance */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity & ML Performance</CardTitle>
            <CardDescription>
              Active users and ML model execution times
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#ff7300"
                  strokeWidth={2}
                  name="Active Users"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="modelRuntime"
                  stroke="#387908"
                  strokeWidth={2}
                  name="ML Runtime (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}