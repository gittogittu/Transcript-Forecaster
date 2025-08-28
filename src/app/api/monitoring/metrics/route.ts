import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { metricsCollector } from '@/lib/monitoring/metrics-collector'
import { withPerformanceMonitoring } from '@/lib/middleware/performance-middleware'

export async function GET(request: NextRequest) {
  return withPerformanceMonitoring(async () => {
    try {
      const session = await getServerSession(authOptions)
      
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check if user has admin role
      if (session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { searchParams } = new URL(request.url)
      const timeRange = searchParams.get('timeRange') || '24h'
      
      // Get current metrics
      const currentMetrics = metricsCollector.getCurrentMetrics()
      
      // Get metrics summary based on time range
      const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '7d' ? 168 : 24
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000))
      
      const metricsSummary = metricsCollector.getMetricsSummary(startTime, endTime)
      
      return NextResponse.json({
        currentMetrics,
        metricsSummary,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        }
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      )
    }
  })
}

export async function POST(request: NextRequest) {
  return withPerformanceMonitoring(async () => {
    try {
      const session = await getServerSession(authOptions)
      
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const body = await request.json()
      const { type, data } = body

      switch (type) {
        case 'record_query':
          metricsCollector.recordQuery(
            data.duration,
            data.endpoint,
            data.success
          )
          break
          
        case 'record_model_execution':
          metricsCollector.recordModelExecution(
            data.modelType,
            data.duration,
            data.success
          )
          break
          
        case 'record_user_activity':
          metricsCollector.recordUserActivity({
            ...data,
            userId: session.user.id,
          })
          break
          
        case 'record_error':
          metricsCollector.recordError(
            new Error(data.message),
            data.context,
            session.user.id
          )
          break
          
        default:
          return NextResponse.json(
            { error: 'Invalid metric type' },
            { status: 400 }
          )
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error recording metric:', error)
      return NextResponse.json(
        { error: 'Failed to record metric' },
        { status: 500 }
      )
    }
  })
}