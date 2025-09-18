import { NextRequest, NextResponse } from 'next/server'
import { createAlertManager } from '@/lib/services/performance-monitoring'

export async function GET(request: NextRequest) {
  try {
    const alertManager = createAlertManager()
    const statistics = await alertManager.getAlertStatistics()
    
    return NextResponse.json({
      success: true,
      data: statistics
    })
  } catch (error) {
    console.error('Failed to get alert statistics:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve alert statistics' 
      },
      { status: 500 }
    )
  }
}