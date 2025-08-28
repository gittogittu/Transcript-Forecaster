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
      const timeWindow = parseInt(searchParams.get('timeWindow') || '300000') // Default 5 minutes
      const limit = parseInt(searchParams.get('limit') || '100')
      
      // Get recent user activities
      const activities = metricsCollector.getRecentActivities(timeWindow)
      
      // Apply limit
      const limitedActivities = activities.slice(0, limit)
      
      // Calculate summary statistics
      const totalActivities = activities.length
      const successfulActivities = activities.filter(a => a.success).length
      const errorActivities = totalActivities - successfulActivities
      const uniqueUsers = new Set(activities.map(a => a.userId)).size
      
      const averageResponseTime = activities.length > 0
        ? activities.reduce((sum, a) => sum + (a.duration || 0), 0) / activities.length
        : 0

      // Group activities by action type
      const actionCounts = activities.reduce((acc, activity) => {
        acc[activity.action] = (acc[activity.action] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Group errors by message
      const errorGroups = activities
        .filter(a => !a.success && a.errorMessage)
        .reduce((acc, activity) => {
          const message = activity.errorMessage!
          acc[message] = (acc[message] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      const topErrors = Object.entries(errorGroups)
        .map(([message, count]) => ({ message, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      return NextResponse.json({
        activities: limitedActivities,
        summary: {
          totalActivities,
          successfulActivities,
          errorActivities,
          uniqueUsers,
          averageResponseTime,
          actionCounts,
          topErrors,
        },
        timeWindow,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error fetching user activity:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user activity' },
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
      const { action, endpoint, duration, success, errorMessage } = body

      // Record user activity
      metricsCollector.recordUserActivity({
        userId: session.user.id,
        action,
        endpoint,
        timestamp: new Date(),
        duration,
        success: success ?? true,
        errorMessage,
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error recording user activity:', error)
      return NextResponse.json(
        { error: 'Failed to record user activity' },
        { status: 500 }
      )
    }
  })
}