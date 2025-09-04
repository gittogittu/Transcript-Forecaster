import { NextRequest, NextResponse } from 'next/server'
import { InsightGenerationService } from '@/lib/services/insight-generation'
import { InsightGenerationRequest } from '@/lib/services/insight-generation/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request
    const insightRequest: InsightGenerationRequest = {
      clientId: body.clientId,
      timeRange: {
        startDate: new Date(body.timeRange.startDate),
        endDate: new Date(body.timeRange.endDate)
      },
      dataTypes: body.dataTypes || ['transcripts'],
      analysisDepth: body.analysisDepth || 'detailed',
      includeRecommendations: body.includeRecommendations ?? true,
      customFilters: body.customFilters
    }

    // Generate insights
    const result = await InsightGenerationService.generateInsights(insightRequest)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error generating insights:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Generate insights for the last 30 days by default
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const insightRequest: InsightGenerationRequest = {
      clientId,
      timeRange: { startDate, endDate },
      dataTypes: ['transcripts'],
      analysisDepth: 'detailed',
      includeRecommendations: true
    }

    const result = await InsightGenerationService.generateInsights(insightRequest)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error generating insights:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}