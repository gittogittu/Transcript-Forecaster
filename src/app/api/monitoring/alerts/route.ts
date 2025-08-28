import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { alertSystem } from '@/lib/monitoring/alert-system'
import { withPerformanceMonitoring } from '@/lib/middleware/performance-middleware'
import { AlertConfig } from '@/types/monitoring'

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
      const type = searchParams.get('type') || 'active'

      let alerts
      switch (type) {
        case 'active':
          alerts = alertSystem.getActiveAlerts()
          break
        case 'all':
          alerts = alertSystem.getAllAlerts()
          break
        case 'configs':
          alerts = alertSystem.getAlertConfigs()
          break
        default:
          alerts = alertSystem.getActiveAlerts()
      }

      return NextResponse.json({
        alerts,
        type,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error fetching alerts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
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

      // Check if user has admin role
      if (session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const body = await request.json()
      const { action, data } = body

      switch (action) {
        case 'create_config':
        case 'update_config':
          const config: AlertConfig = {
            id: data.id || crypto.randomUUID(),
            name: data.name,
            metric: data.metric,
            threshold: data.threshold,
            operator: data.operator,
            enabled: data.enabled ?? true,
            severity: data.severity,
          }
          alertSystem.setAlertConfig(config)
          return NextResponse.json({ success: true, config })

        case 'delete_config':
          alertSystem.removeAlertConfig(data.configId)
          return NextResponse.json({ success: true })

        case 'resolve_alert':
          alertSystem.resolveAlert(data.alertId)
          return NextResponse.json({ success: true })

        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          )
      }
    } catch (error) {
      console.error('Error managing alerts:', error)
      return NextResponse.json(
        { error: 'Failed to manage alerts' },
        { status: 500 }
      )
    }
  })
}