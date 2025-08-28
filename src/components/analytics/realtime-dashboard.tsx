'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  RefreshCw,
  Pause,
  Play,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useRealtimeAnalytics } from '@/lib/hooks/use-analytics'

interface RealtimeDashboardProps {
  refreshInterval?: number // in milliseconds
  maxDataPoints?: number
  autoRefresh?: boolean
}

interface RealtimeMetric {
  timestamp: string
  totalTranscripts: number
  activeClients: number
  averagePerHour: number
  growthRate: number
}

interface LiveUpdate {
  id: string
  type: 'new_transcript' | 'client_update' | 'milestone'
  message: string
  timestamp: Date
  severity: 'info' | 'success' | 'warning'
}

export function RealtimeDashboard({ 
  refreshInterval = 30000, // 30 seconds
  maxDataPoints = 50,
  autoRefresh = true 
}: RealtimeDashboardProps) {
  const [isLive, setIsLive] = useState(autoRefresh)
  const [realtimeData, setRealtimeData] = useState<RealtimeMetric[]>([])
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected')

  // Fetch analytics data with real-time updates
  const { 
    trends, 
    summary, 
    isLoading, 
    refetchAll 
  } = useRealtimeAnalytics({})

  // Simulate real-time data updates
  useEffect(() => {
    if (!isLive) return

    const interval = setInterval(async () => {
      setConnectionStatus('connecting')
      
      try {
        // Refetch data
        await refetchAll()
        
        // Generate new metric point
        const now = new Date()
        const newMetric: RealtimeMetric = {
          timestamp: now.toISOString(),
          totalTranscripts: summary.data?.totalTranscripts || 0,
          activeClients: summary.data?.clientBreakdown?.length || 0,
          averagePerHour: Math.round((summary.data?.averagePerDay || 0) / 24 * 100) / 100,
          growthRate: summary.data?.growthMetrics?.monthlyGrowthRate || 0
        }

        setRealtimeData(prev => {
          const updated = [...prev, newMetric].slice(-maxDataPoints)
          return updated
        })

        // Simulate live updates
        if (Math.random() > 0.7) { // 30% chance of update
          const updateTypes = ['new_transcript', 'client_update', 'milestone'] as const
          const randomType = updateTypes[Math.floor(Math.random() * updateTypes.length)]
          
          const messages = {
            new_transcript: [
              'New transcript processed for Client A',
              'Batch upload completed: 15 transcripts',
              'Real-time sync: 3 new transcripts'
            ],
            client_update: [
              'Client B updated their data',
              'New client onboarded: Client X',
              'Client preferences updated'
            ],
            milestone: [
              '🎉 Reached 1000 transcripts this month!',
              '📈 New daily record: 150 transcripts',
              '🏆 Top client milestone achieved'
            ]
          }

          const newUpdate: LiveUpdate = {
            id: `update-${Date.now()}`,
            type: randomType,
            message: messages[randomType][Math.floor(Math.random() * messages[randomType].length)],
            timestamp: now,
            severity: randomType === 'milestone' ? 'success' : 'info'
          }

          setLiveUpdates(prev => [newUpdate, ...prev].slice(0, 10))
        }

        setLastUpdate(now)
        setConnectionStatus('connected')
      } catch (error) {
        console.error('Real-time update failed:', error)
        setConnectionStatus('disconnected')
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [isLive, refreshInterval, maxDataPoints, refetchAll, summary.data])

  // Calculate real-time metrics
  const currentMetrics = useMemo(() => {
    if (realtimeData.length === 0) return null

    const latest = realtimeData[realtimeData.length - 1]
    const previous = realtimeData.length > 1 ? realtimeData[realtimeData.length - 2] : null

    return {
      current: latest,
      changes: previous ? {
        totalTranscripts: latest.totalTranscripts - previous.totalTranscripts,
        activeClients: latest.activeClients - previous.activeClients,
        averagePerHour: latest.averagePerHour - previous.averagePerHour,
        growthRate: latest.growthRate - previous.growthRate
      } : null
    }
  }, [realtimeData])

  const toggleLiveUpdates = () => {
    setIsLive(!isLive)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    return `${hours}h ago`
  }

  return (
    <div className="space-y-6">
      {/* Header with Live Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Real-time Dashboard
          </h2>
          <p className="text-muted-foreground">
            Live analytics and system monitoring
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' && (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Connected</span>
              </>
            )}
            {connectionStatus === 'disconnected' && (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">Disconnected</span>
              </>
            )}
            {connectionStatus === 'connecting' && (
              <>
                <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
                <span className="text-sm text-yellow-600">Connecting...</span>
              </>
            )}
          </div>

          {/* Live Toggle */}
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            onClick={toggleLiveUpdates}
            className="flex items-center gap-2"
          >
            {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isLive ? 'Pause' : 'Resume'} Live
          </Button>
        </div>
      </div>

      {/* Last Update Info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        Last updated: {lastUpdate.toLocaleTimeString()}
        {isLive && (
          <Badge variant="secondary" className="ml-2">
            <Zap className="h-3 w-3 mr-1" />
            Live
          </Badge>
        )}
      </div>

      {/* Real-time Metrics Cards */}
      {currentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Transcripts</p>
                    <p className="text-2xl font-bold">{currentMetrics.current.totalTranscripts.toLocaleString()}</p>
                    {currentMetrics.changes && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{currentMetrics.changes.totalTranscripts} since last update
                      </p>
                    )}
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                    <p className="text-2xl font-bold">{currentMetrics.current.activeClients}</p>
                    {currentMetrics.changes && currentMetrics.changes.activeClients !== 0 && (
                      <p className="text-xs text-blue-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {currentMetrics.changes.activeClients > 0 ? '+' : ''}{currentMetrics.changes.activeClients}
                      </p>
                    )}
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg/Hour</p>
                    <p className="text-2xl font-bold">{currentMetrics.current.averagePerHour}</p>
                    {currentMetrics.changes && (
                      <p className={`text-xs flex items-center gap-1 ${
                        currentMetrics.changes.averagePerHour >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {currentMetrics.changes.averagePerHour >= 0 ? 
                          <TrendingUp className="h-3 w-3" /> : 
                          <TrendingDown className="h-3 w-3" />
                        }
                        {currentMetrics.changes.averagePerHour >= 0 ? '+' : ''}{currentMetrics.changes.averagePerHour.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Growth Rate</p>
                    <p className="text-2xl font-bold">{currentMetrics.current.growthRate.toFixed(1)}%</p>
                    {currentMetrics.changes && (
                      <p className={`text-xs flex items-center gap-1 ${
                        currentMetrics.changes.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {currentMetrics.changes.growthRate >= 0 ? 
                          <TrendingUp className="h-3 w-3" /> : 
                          <TrendingDown className="h-3 w-3" />
                        }
                        {currentMetrics.changes.growthRate >= 0 ? '+' : ''}{currentMetrics.changes.growthRate.toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <Activity className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Real-time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Metrics Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Metrics
            </CardTitle>
            <CardDescription>
              Real-time transcript volume and growth tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={realtimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTime}
                  interval="preserveStartEnd"
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `Time: ${formatTime(value)}`}
                  formatter={(value: any, name: string) => [
                    typeof value === 'number' ? value.toLocaleString() : value,
                    name === 'totalTranscripts' ? 'Total Transcripts' :
                    name === 'activeClients' ? 'Active Clients' :
                    name === 'averagePerHour' ? 'Avg/Hour' : name
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="totalTranscripts"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Growth Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Growth Tracking
            </CardTitle>
            <CardDescription>
              Real-time growth rate monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={realtimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTime}
                  interval="preserveStartEnd"
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `Time: ${formatTime(value)}`}
                  formatter={(value: any) => [`${value}%`, 'Growth Rate']}
                />
                <Line
                  type="monotone"
                  dataKey="growthRate"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Live Updates Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Live Updates
          </CardTitle>
          <CardDescription>
            Real-time system events and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            <AnimatePresence>
              {liveUpdates.map((update) => (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    update.severity === 'success' ? 'bg-green-50 border-green-200' :
                    update.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    update.severity === 'success' ? 'bg-green-500' :
                    update.severity === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{update.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(update.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {liveUpdates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent updates</p>
                <p className="text-xs">Live updates will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}