import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchAllTranscripts } from '@/lib/data/transcript-data'
import { mockPredictionService } from '@/lib/services/prediction-service-mock'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { z } from 'zod'

// Validation schema for prediction request
const PredictionRequestSchema = z.object({
  clientName: z.string().min(1, 'Client name is required').optional(),
  monthsAhead: z.number().int().min(1, 'Must predict at least 1 month ahead').max(24, 'Cannot predict more than 24 months ahead').default(6),
  modelType: z.enum(['linear', 'polynomial', 'arima']).default('linear'),
  includeConfidenceIntervals: z.boolean().default(true),
  includeModelMetrics: z.boolean().default(false),
})

// Use mock prediction service for now
function getPredictionService() {
  return mockPredictionService
}

/**
 * GET /api/analytics/predictions - Get predictions for all clients or specific client
 */
export const GET = withRateLimit(rateLimitConfigs.predictions, async (request: NextRequest) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      clientName: searchParams.get('clientName') || undefined,
      monthsAhead: parseInt(searchParams.get('monthsAhead') || '6'),
      modelType: searchParams.get('modelType') || 'linear',
      includeConfidenceIntervals: searchParams.get('includeConfidenceIntervals') !== 'false',
      includeModelMetrics: searchParams.get('includeModelMetrics') === 'true',
    }

    // Validate query parameters
    const validationResult = PredictionRequestSchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const params = validationResult.data

    // Fetch transcript data
    const transcriptResult = await fetchAllTranscripts()
    
    if (transcriptResult.error) {
      return NextResponse.json(
        { error: transcriptResult.error },
        { status: 500 }
      )
    }

    if (!transcriptResult.data || transcriptResult.data.length === 0) {
      return NextResponse.json(
        { error: 'No transcript data available for predictions' },
        { status: 400 }
      )
    }

    const service = getPredictionService()
    const predictions = []

    if (params.clientName) {
      // Generate predictions for specific client
      const clientData = transcriptResult.data.filter(d => d.clientName === params.clientName)
      
      if (clientData.length < 6) {
        return NextResponse.json(
          { error: `Insufficient data for client ${params.clientName}. Need at least 6 data points.` },
          { status: 400 }
        )
      }

      try {
        const prediction = await service.generatePredictions(
          params.clientName,
          transcriptResult.data,
          {
            monthsAhead: params.monthsAhead,
            modelType: params.modelType as 'linear' | 'polynomial' | 'arima'
          }
        )
        predictions.push(prediction)
      } catch (error) {
        console.error(`Prediction error for client ${params.clientName}:`, error)
        return NextResponse.json(
          { error: `Failed to generate predictions for client ${params.clientName}: ${error.message}` },
          { status: 500 }
        )
      }
    } else {
      // Generate predictions for all clients with sufficient data
      const clientNames = [...new Set(transcriptResult.data.map(d => d.clientName))]
      
      for (const clientName of clientNames) {
        const clientData = transcriptResult.data.filter(d => d.clientName === clientName)
        
        if (clientData.length >= 6) {
          try {
            const prediction = await service.generatePredictions(
              clientName,
              transcriptResult.data,
              {
                monthsAhead: params.monthsAhead,
                modelType: params.modelType as 'linear' | 'polynomial' | 'arima'
              }
            )
            predictions.push(prediction)
          } catch (error) {
            console.warn(`Skipping predictions for client ${clientName}:`, error.message)
            continue
          }
        }
      }
    }

    if (predictions.length === 0) {
      return NextResponse.json(
        { error: 'No predictions could be generated. Ensure clients have at least 6 data points.' },
        { status: 400 }
      )
    }

    // Filter response based on requested fields
    const responseData = predictions.map(prediction => ({
      clientName: prediction.clientName,
      predictions: prediction.predictions,
      confidence: prediction.confidence,
      model: prediction.model,
      generatedAt: prediction.generatedAt,
      ...(params.includeModelMetrics && { 
        accuracy: prediction.accuracy,
        modelMetrics: {
          confidence: prediction.confidence,
          accuracy: prediction.accuracy
        }
      })
    }))

    return NextResponse.json({
      data: responseData,
      success: true,
      metadata: {
        totalClients: predictions.length,
        modelType: params.modelType,
        monthsAhead: params.monthsAhead,
        generatedAt: new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('Predictions API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/analytics/predictions - Generate new predictions with custom parameters
 */
export const POST = withRateLimit(rateLimitConfigs.predictions, async (request: NextRequest) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = PredictionRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const params = validationResult.data

    // Fetch transcript data
    const transcriptResult = await fetchAllTranscripts()
    
    if (transcriptResult.error) {
      return NextResponse.json(
        { error: transcriptResult.error },
        { status: 500 }
      )
    }

    if (!transcriptResult.data || transcriptResult.data.length === 0) {
      return NextResponse.json(
        { error: 'No transcript data available for predictions' },
        { status: 400 }
      )
    }

    const service = getPredictionService()
    const predictions = []

    if (params.clientName) {
      // Generate predictions for specific client
      const clientData = transcriptResult.data.filter(d => d.clientName === params.clientName)
      
      if (clientData.length < 6) {
        return NextResponse.json(
          { error: `Insufficient data for client ${params.clientName}. Need at least 6 data points.` },
          { status: 400 }
        )
      }

      try {
        // Force retrain model for POST requests
        const prediction = await service.generatePredictions(
          params.clientName,
          transcriptResult.data,
          {
            monthsAhead: params.monthsAhead,
            modelType: params.modelType as 'linear' | 'polynomial' | 'arima'
          }
        )
        predictions.push(prediction)
      } catch (error) {
        console.error(`Prediction error for client ${params.clientName}:`, error)
        return NextResponse.json(
          { error: `Failed to generate predictions for client ${params.clientName}: ${error.message}` },
          { status: 500 }
        )
      }
    } else {
      // Generate predictions for all clients with sufficient data
      const clientNames = [...new Set(transcriptResult.data.map(d => d.clientName))]
      
      for (const clientName of clientNames) {
        const clientData = transcriptResult.data.filter(d => d.clientName === clientName)
        
        if (clientData.length >= 6) {
          try {
            const prediction = await service.generatePredictions(
              clientName,
              transcriptResult.data,
              {
                monthsAhead: params.monthsAhead,
                modelType: params.modelType as 'linear' | 'polynomial' | 'arima'
              }
            )
            predictions.push(prediction)
          } catch (error) {
            console.warn(`Skipping predictions for client ${clientName}:`, error.message)
            continue
          }
        }
      }
    }

    if (predictions.length === 0) {
      return NextResponse.json(
        { error: 'No predictions could be generated. Ensure clients have at least 6 data points.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: predictions,
      success: true,
      message: 'Predictions generated successfully',
      metadata: {
        totalClients: predictions.length,
        modelType: params.modelType,
        monthsAhead: params.monthsAhead,
        generatedAt: new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('Custom Predictions API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})