import { NextResponse } from 'next/server'
import { AHTAnalyticsService } from '@/lib/services/aht-analytics'

export async function GET() {
  try {
    const analyticsService = new AHTAnalyticsService()
    const summary = analyticsService.getSummary()
    
    return NextResponse.json({
      success: true,
      data: summary
    })
  } catch (error) {
    console.error('Error fetching AHT summary:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AHT summary' },
      { status: 500 }
    )
  }
}