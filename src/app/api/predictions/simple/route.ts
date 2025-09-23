import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { client_id, prediction_horizon = 7, include_confidence = true } = body

    // Basic validation
    if (!client_id) {
      return NextResponse.json(
        { error: 'client_id is required' },
        { status: 400 }
      )
    }

    // Generate mock prediction data for testing purposes
    // In a real implementation, this would call your ML models
    const predictions = []
    const baseDate = new Date()
    
    for (let i = 1; i <= prediction_horizon; i++) {
      const predictionDate = new Date(baseDate)
      predictionDate.setDate(baseDate.getDate() + i)
      
      // Generate realistic mock data
      const baseVolume = 150 + Math.random() * 50
      const seasonalFactor = 1 + 0.2 * Math.sin((i / 7) * 2 * Math.PI) // Weekly pattern
      const randomFactor = 0.9 + Math.random() * 0.2
      const predictedCount = Math.round(baseVolume * seasonalFactor * randomFactor)
      
      predictions.push({
        prediction_date: predictionDate.toISOString().split('T')[0],
        predicted_transcript_count: predictedCount,
        confidence_interval: include_confidence ? {
          lower_bound: Math.round(predictedCount * 0.85),
          upper_bound: Math.round(predictedCount * 1.15),
          confidence_level: 0.95
        } : undefined,
        contributing_factors: {
          seasonal_impact: seasonalFactor,
          trend_component: 1.02,
          historical_average: 145,
          external_factors: []
        }
      })
    }

    const response = {
      success: true,
      client_id,
      prediction_horizon,
      predictions,
      model_metadata: {
        model_version: '1.0.0-simple',
        training_data_end_date: new Date().toISOString().split('T')[0],
        accuracy_metrics: {
          mae: 8.2,
          rmse: 12.1,
          mape: 5.4,
          r2_score: 0.87
        }
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Error in simple forecast API:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate prediction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    description: 'Simple ML Prediction Endpoint for Testing',
    usage: {
      method: 'POST',
      required_fields: ['client_id'],
      optional_fields: ['prediction_horizon', 'include_confidence'],
      example_request: {
        client_id: 'test-client-001',
        prediction_horizon: 7,
        include_confidence: true
      }
    }
  })
}