import { NextResponse } from 'next/server'
import { AHTAnalyticsService } from '@/lib/services/aht-analytics'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'performance'
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const analyticsService = new AHTAnalyticsService()
    
    let data
    switch (type) {
      case 'performance':
        data = analyticsService.getClientPerformance()
        break
      case 'volume':
        data = analyticsService.getTopClientsByVolume(limit)
        break
      case 'aht':
        data = analyticsService.getHighestAHTClients(limit)
        break
      default:
        data = analyticsService.getClientPerformance()
    }
    
    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error fetching client data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client data' },
      { status: 500 }
    )
  }
}