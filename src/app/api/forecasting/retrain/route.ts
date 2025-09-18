import { NextRequest, NextResponse } from 'next/server'
import { intelligentForecastingEngine } from '@/lib/services/forecasting/intelligent-forecasting-engine'
import type { TimeSeriesData, RetrainingConfig } from '@/lib/services/forecasting/intelligent-forecasting-engine'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      modelId, 
      newData, 
      config 
    }: { 
      modelId: string
      newData: TimeSeriesData
      config: RetrainingConfig 
    } = body

    // Validate input
    if (!modelId || !newData || !config) {
      return NextResponse.json(
        { error: 'Missing required modelId, newData, or config' },
        { status: 400 }
      )
    }

    // Check if retraining is needed and perform it
    const retrainTriggered = await intelligentForecastingEngine.checkAndRetrain(
      modelId,
      newData,
      config
    )

    return NextResponse.json({
      success: true,
      retrainTriggered,
      modelId,
      timestamp: new Date().toISOString(),
      message: retrainTriggered 
        ? 'Model retraining was triggered successfully'
        : 'Model retraining was not needed at this time'
    })
  } catch (error) {
    console.error('Error in model retraining API:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to check or trigger model retraining',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    
    if (!modelId) {
      return NextResponse.json(
        { error: 'modelId parameter is required' },
        { status: 400 }
      )
    }

    // Return retraining configuration options and status
    const retrainingInfo = {
      modelId,
      defaultConfig: {
        performanceThreshold: 0.8,
        dataFreshnessHours: 24,
        automaticRetraining: true,
        retrainingSchedule: 'weekly'
      },
      availableSchedules: ['daily', 'weekly', 'monthly'],
      performanceMetrics: [
        'accuracy',
        'mae',
        'rmse',
        'mape',
        'r2Score'
      ],
      retrainingTriggers: [
        'Performance degradation below threshold',
        'Data freshness exceeds limit',
        'Scheduled retraining time',
        'Manual trigger'
      ]
    }

    return NextResponse.json({
      success: true,
      retrainingInfo
    })
  } catch (error) {
    console.error('Error getting retraining info:', error)
    
    return NextResponse.json(
      { error: 'Failed to get retraining information' },
      { status: 500 }
    )
  }
}