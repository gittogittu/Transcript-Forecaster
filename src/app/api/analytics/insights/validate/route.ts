import { NextRequest, NextResponse } from 'next/server'
import { InsightValidator } from '@/lib/services/insight-generation'
import { BusinessInsight } from '@/lib/services/insight-generation/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request
    if (!body.insight) {
      return NextResponse.json(
        { success: false, error: 'Insight data is required' },
        { status: 400 }
      )
    }

    const insight: BusinessInsight = {
      ...body.insight,
      timeframe: {
        startDate: new Date(body.insight.timeframe.startDate),
        endDate: new Date(body.insight.timeframe.endDate)
      },
      createdAt: new Date(body.insight.createdAt)
    }

    const data = body.data || {}

    // Validate the insight
    const validator = new InsightValidator()
    const validation = await validator.validateInsight(insight, data)

    return NextResponse.json({
      success: true,
      data: validation
    })
  } catch (error) {
    console.error('Error validating insight:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate insight',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}