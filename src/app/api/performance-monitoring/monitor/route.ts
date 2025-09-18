import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitoringService } from '@/lib/services/performance-monitoring'

export async function POST(request: NextRequest) {
  try {
    const { modelId } = await request.json()
    if (!modelId) {
      return NextResponse.json(
        { success: false, error: 'Model ID is required' },
        { status: 400 }
      )
    }

    await performanceMonitoringService.monitorModel(modelId)
    return NextResponse.json({ success: true, message: 'Monitoring triggered' })
  } catch (error) {
    console.error('Failed to trigger monitoring:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to trigger monitoring' },
      { status: 500 }
    )
  }
}


