import { NextResponse } from 'next/server'
import { AHTAnalyticsService } from '@/lib/services/aht-analytics'

export async function GET() {
  try {
    const analyticsService = new AHTAnalyticsService()
    const trends = analyticsService.getMonthlyTrends()
    
    return NextResponse.json({
      success: true,
      data: trends
    })
  } catch (error) {
    console.error('Error fetching AHT trends:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AHT trends' },
      { status: 500 }
    )
  }
}