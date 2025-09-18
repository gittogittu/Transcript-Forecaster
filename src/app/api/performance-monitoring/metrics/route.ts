import { NextRequest, NextResponse } from 'next/server'
import { createPerformanceMonitor, performanceMonitoringService } from '@/lib/services/performance-monitoring'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!modelId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Model ID is required' 
        },
        { status: 400 }
      )
    }

    // Default to last 24 hours if no date range provided
    const timeRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date()
    }

    const performanceHistory = await performanceMonitoringService.getModelPerformanceHistory(
      modelId,
      timeRange
    )
    
    return NextResponse.json({
      success: true,
      data: performanceHistory
    })
  } catch (error) {
    console.error('Failed to get performance metrics:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve performance metrics' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { modelId, metrics } = await request.json()
    
    if (!modelId || !metrics) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Model ID and metrics are required' 
        },
        { status: 400 }
      )
    }

    // Record custom metrics via monitor
    const monitor = createPerformanceMonitor()
    await monitor.recordMetrics({
      id: `custom_${modelId}_${Date.now()}`,
      timestamp: new Date(),
      modelId,
      ...metrics
    })

    return NextResponse.json({
      success: true,
      message: 'Metrics recorded successfully'
    })
  } catch (error) {
    console.error('Failed to record metrics:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to record metrics' 
      },
      { status: 500 }
    )
  }
}