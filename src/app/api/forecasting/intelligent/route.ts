import { NextRequest, NextResponse } from 'next/server'
import { intelligentForecastingEngine } from '@/lib/services/forecasting/intelligent-forecasting-engine'
import type { ForecastingRequest, TimeSeriesData } from '@/lib/services/forecasting/intelligent-forecasting-engine'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, forecastRequest }: { data: TimeSeriesData; forecastRequest: ForecastingRequest } = body

    // Validate input
    if (!data || !forecastRequest) {
      return NextResponse.json(
        { error: 'Missing required data or forecast request' },
        { status: 400 }
      )
    }

    // Generate forecast using intelligent engine
    const result = await intelligentForecastingEngine.generateForecast(data, forecastRequest)

    return NextResponse.json({
      success: true,
      forecast: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in intelligent forecasting API:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate intelligent forecast',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    
    // Return available forecasting algorithms and their capabilities
    const capabilities = {
      algorithms: [
        {
          type: 'automl_forecasting',
          description: 'Google Vertex AI AutoML time-series forecasting',
          bestFor: 'Large datasets with complex patterns',
          accuracy: 'High',
          trainingTime: 'Long'
        },
        {
          type: 'arima',
          description: 'AutoRegressive Integrated Moving Average',
          bestFor: 'Stationary time series with clear trends',
          accuracy: 'Medium-High',
          trainingTime: 'Fast'
        },
        {
          type: 'prophet',
          description: 'Facebook Prophet for seasonal forecasting',
          bestFor: 'Data with strong seasonal patterns and holidays',
          accuracy: 'High',
          trainingTime: 'Medium'
        },
        {
          type: 'lstm',
          description: 'Long Short-Term Memory neural networks',
          bestFor: 'Complex non-linear patterns and long sequences',
          accuracy: 'High',
          trainingTime: 'Long'
        },
        {
          type: 'linear_regression',
          description: 'Simple linear regression on time series',
          bestFor: 'Simple trends and small datasets',
          accuracy: 'Medium',
          trainingTime: 'Very Fast'
        }
      ],
      ensembleMethods: [
        {
          type: 'simple_average',
          description: 'Equal weight average of all models'
        },
        {
          type: 'weighted_average',
          description: 'Accuracy-weighted average of models'
        },
        {
          type: 'stacking',
          description: 'Meta-model learns optimal combination'
        },
        {
          type: 'voting',
          description: 'Use best performing model only'
        }
      ],
      timeHorizons: ['daily', 'weekly', 'monthly', 'quarterly'],
      maxPeriodsAhead: 365,
      supportedFeatures: [
        'Automatic algorithm selection',
        'Ensemble methods',
        'Seasonality detection',
        'Anomaly detection',
        'Confidence intervals',
        'Model explanations',
        'Automatic retraining'
      ]
    }

    return NextResponse.json({
      success: true,
      capabilities,
      clientId: clientId || null
    })
  } catch (error) {
    console.error('Error getting forecasting capabilities:', error)
    
    return NextResponse.json(
      { error: 'Failed to get forecasting capabilities' },
      { status: 500 }
    )
  }
}