import { NextResponse } from 'next/server'
import { AHTAnalyticsService } from '@/lib/services/aht-analytics'

export async function GET() {
  try {
    const analyticsService = new AHTAnalyticsService()
    const predictions = analyticsService.predictNextMonthAHT()
    
    return NextResponse.json({
      success: true,
      data: predictions
    })
  } catch (error) {
    console.error('Error generating AHT predictions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate AHT predictions' },
      { status: 500 }
    )
  }
}