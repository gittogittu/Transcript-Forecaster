import { NextRequest, NextResponse } from 'next/server'
import { RecommendationEngine } from '@/lib/services/insight-generation'
import { BusinessInsight, TrendAnalysis, PatternRecognition } from '@/lib/services/insight-generation/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request
    if (!body.insights || !body.trendAnalysis || !body.patternRecognition) {
      return NextResponse.json(
        { success: false, error: 'Insights, trend analysis, and pattern recognition data are required' },
        { status: 400 }
      )
    }

    // Parse the input data
    const insights: BusinessInsight[] = body.insights.map((insight: any) => ({
      ...insight,
      timeframe: {
        startDate: new Date(insight.timeframe.startDate),
        endDate: new Date(insight.timeframe.endDate)
      },
      createdAt: new Date(insight.createdAt)
    }))

    const trendAnalysis: TrendAnalysis = {
      ...body.trendAnalysis,
      seasonality: body.trendAnalysis.seasonality || [],
      changePoints: body.trendAnalysis.changePoints?.map((cp: any) => ({
        ...cp,
        timestamp: new Date(cp.timestamp)
      })) || []
    }

    const patternRecognition: PatternRecognition = {
      ...body.patternRecognition,
      patterns: body.patternRecognition.patterns?.map((pattern: any) => ({
        ...pattern,
        timeRange: {
          startDate: new Date(pattern.timeRange.startDate),
          endDate: new Date(pattern.timeRange.endDate)
        },
        examples: pattern.examples?.map((example: any) => ({
          ...example,
          timestamp: new Date(example.timestamp)
        })) || []
      })) || [],
      anomalies: body.patternRecognition.anomalies?.map((anomaly: any) => ({
        ...anomaly,
        timestamp: new Date(anomaly.timestamp)
      })) || []
    }

    // Generate recommendations
    const recommendationEngine = new RecommendationEngine()
    const recommendations = await recommendationEngine.generateRecommendations(
      insights,
      trendAnalysis,
      patternRecognition
    )

    return NextResponse.json({
      success: true,
      data: recommendations
    })
  } catch (error) {
    console.error('Error generating recommendations:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate recommendations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}