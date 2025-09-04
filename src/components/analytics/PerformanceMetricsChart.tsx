'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { ModelPerformanceHistory } from '@/lib/services/performance-monitoring/types'

interface PerformanceMetricsChartProps {
  performanceHistory: ModelPerformanceHistory
}

export function PerformanceMetricsChart({ performanceHistory }: PerformanceMetricsChartProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')

  // Transform metrics data for charts
  const chartData = performanceHistory.metrics.map(metric => ({
    timestamp: metric.timestamp.toLocaleTimeString(),
    fullTimestamp: metric.timestamp,
    accuracy: (metric.accuracy.accuracyScore * 100).toFixed(1),
    mae: metric.accuracy.mae.toFixed(2),
    rmse: metric.accuracy.rmse.toFixed(2),
    mape: metric.accuracy.mape.toFixed(1),
    latency: metric.predictionLatency,
    memoryUsage: metric.memoryUsage,
    cpuUsage: metric.cpuUsage.toFixed(1),
    throughput: metric.throughput.toFixed(1),
    errorRate: metric.resourceUtilization.errorRate.toFixed(1),
    cacheHitRate: metric.resourceUtilization.cacheHitRate.toFixed(1)
  }))

  const formatTooltipValue = (value: any, name: string) => {
    switch (name) {
      case 'accuracy':
        return [`${value}%`, 'Accuracy']
      case 'latency':
        return [`${value}ms`, 'Latency']
      case 'memoryUsage':
        return [`${value}MB`, 'Memory Usage']
      case 'cpuUsage':
        return [`${value}%`, 'CPU Usage']
      case 'throughput':
        return [`${value}/sec`, 'Throughput']
      case 'errorRate':
        return [`${value}%`, 'Error Rate']
      case 'cacheHitRate':
        return [`${value}%`, 'Cache Hit Rate']
      case 'mae':
        return [value, 'MAE']
      case 'rmse':
        return [value, 'RMSE']
      case 'mape':
        return [`${value}%`, 'MAPE']
      default:
        return [value, name]
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="accuracy" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accuracy">Model Accuracy</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="errors">Errors & Cache</TabsTrigger>
        </TabsList>

        <TabsContent value="accuracy" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Accuracy Score */}
            <Card>
              <CardHeader>
                <CardTitle>Accuracy Score</CardTitle>
                <CardDescription>Model prediction accuracy over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={formatTooltipValue} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Error Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Error Metrics</CardTitle>
                <CardDescription>MAE, RMSE, and MAPE trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip formatter={formatTooltipValue} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="mae" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rmse" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="mape" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latency */}
            <Card>
              <CardHeader>
                <CardTitle>Prediction Latency</CardTitle>
                <CardDescription>Response time for predictions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip formatter={formatTooltipValue} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="latency" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Throughput */}
            <Card>
              <CardHeader>
                <CardTitle>Throughput</CardTitle>
                <CardDescription>Predictions processed per second</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip formatter={formatTooltipValue} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="throughput" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Memory Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
                <CardDescription>Memory consumption over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip formatter={formatTooltipValue} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="memoryUsage" 
                      stroke="#f59e0b" 
                      fill="#f59e0b" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* CPU Usage */}
            <Card>
              <CardHeader>
                <CardTitle>CPU Usage</CardTitle>
                <CardDescription>CPU utilization percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={formatTooltipValue} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="cpuUsage" 
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Error Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Error Rate</CardTitle>
                <CardDescription>Percentage of failed predictions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[0, 'dataMax']} />
                    <Tooltip formatter={formatTooltipValue} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="errorRate" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cache Hit Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Cache Hit Rate</CardTitle>
                <CardDescription>Percentage of requests served from cache</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={formatTooltipValue} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cacheHitRate" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}