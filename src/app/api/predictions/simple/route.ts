import { NextRequest, NextResponse } from 'next/server'
import { generateSimpleForecast } from '@/lib/services/forecasting/simple-forecaster'

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

    const response = generateSimpleForecast(client_id, prediction_horizon, include_confidence)

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