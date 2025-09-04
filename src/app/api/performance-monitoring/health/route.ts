import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitoringService } from '@/lib/services/performance-monitoring'

export async function GET(request: NextRequest) {
  try {
    const systemHealth = await performanceMonitoringService.getSystemHealth()
    
    return NextResponse.json({
      success: true,
      data: systemHealth
    })
  } catch (error) {
    console.error('Failed to get system health:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve system health status' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { modelId } = await request.json()
    
    if (!modelId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Model ID is required' 
        },
        { status: 400 }
      )
    }

    // Trigger health check for specific model
    await performanceMonitoringService.monitorModel(modelId)
    
    return NextResponse.json({
      success: true,
      message: `Health check initiated for model ${modelId}`
    })
  } catch (error) {
    console.error('Failed to initiate health check:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initiate health check' 
      },
      { status: 500 }
    )
  }
}