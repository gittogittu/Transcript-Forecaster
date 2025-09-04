import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitoringService, createAlertManager } from '@/lib/services/performance-monitoring'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    const type = searchParams.get('type') as any
    const severity = searchParams.get('severity') as any
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const alertManager = createAlertManager()
    
    const filters: any = {}
    if (modelId) filters.modelId = modelId
    if (type) filters.type = type
    if (severity) filters.severity = severity
    if (startDate && endDate) {
      filters.timeRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    }

    const alerts = await alertManager.getAlertHistory(filters)
    
    return NextResponse.json({
      success: true,
      data: alerts
    })
  } catch (error) {
    console.error('Failed to get alerts:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve alerts' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { alertId, action } = await request.json()
    
    if (!alertId || !action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Alert ID and action are required' 
        },
        { status: 400 }
      )
    }

    const alertManager = createAlertManager()

    if (action === 'resolve') {
      await alertManager.resolveAlert(alertId)
      return NextResponse.json({
        success: true,
        message: 'Alert resolved successfully'
      })
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid action' 
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to process alert action:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process alert action' 
      },
      { status: 500 }
    )
  }
}