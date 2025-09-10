/**
 * Integrated Prediction API Endpoint
 * 
 * Main API endpoint that uses the complete predictive analytics engine
 * for generating comprehensive predictions with all ML components integrated
 */

import { NextRequest, NextResponse } from 'next/server'
import { predictiveAnalyticsEngine, PredictionRequest } from '../../../../lib/services/system-integration/predictive-analytics-engine'
import { z } from 'zod'

// Request validation schema
const PredictionRequestSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientName: z.string().optional(),
  timeHorizon: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  periodsAhead: z.number().min(1).max(365),
  confidenceLevel: z.number().min(0.5).max(0.99).optional().default(0.95),
  includeAnomalyDetection: z.boolean().optional().default(true),
  includeSimilarityAnalysis: z.boolean().optional().default(true),
  includeInsights: z.boolean().optional().default(true),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional().default('normal')
})

export async function POST(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedRequest = PredictionRequestSchema.parse(body)

    console.log(`🔮 Processing prediction request for client: ${validatedRequest.clientId}`)

    // Generate prediction using integrated engine
    const prediction = await predictiveAnalyticsEngine.generatePrediction(validatedRequest as PredictionRequest)

    // Add API-specific metadata
    const response = {
      ...prediction,
      api: {
        version: '1.0.0',
        endpoint: '/api/predictions/integrated',
        processingTime: performance.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }

    // Set appropriate cache headers based on time horizon
    const cacheHeaders = getCacheHeaders(validatedRequest.timeHorizon)
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': cacheHeaders.cacheControl,
        'X-Cache': prediction.performance.cacheHit ? 'HIT' : 'MISS',
        'X-Processing-Time': `${response.api.processingTime.toFixed(2)}ms`,
        'X-Components-Used': prediction.performance.componentsUsed.join(','),
        'X-System-Health': prediction.metadata.systemHealth
      }
    })

  } catch (error) {
    console.error('Integrated prediction failed:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        })),
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // Handle system errors
    return NextResponse.json({
      success: false,
      error: 'Prediction generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      processingTime: performance.now() - startTime
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'status':
        // Return system status for predictions
        const health = await predictiveAnalyticsEngine.getSystemHealth()
        return NextResponse.json({
          success: true,
          status: health.overall,
          predictionsEnabled: health.overall !== 'critical',
          components: {
            forecasting: health.components.forecasting.status,
            anomalyDetection: health.components.anomalyDetection.status,
            embeddings: health.components.embeddings.status,
            vertexAI: health.components.vertexAI.status
          },
          performance: health.performance,
          timestamp: new Date().toISOString()
        })

      case 'capabilities':
        // Return system capabilities
        return NextResponse.json({
          success: true,
          capabilities: {
            timeHorizons: ['hourly', 'daily', 'weekly', 'monthly'],
            maxPeriodsAhead: {
              hourly: 168, // 1 week
              daily: 365, // 1 year
              weekly: 52, // 1 year
              monthly: 24 // 2 years
            },
            features: {
              anomalyDetection: true,
              similarityAnalysis: true,
              insightGeneration: true,
              confidenceIntervals: true,
              realTimeProcessing: true,
              batchProcessing: true
            },
            models: {
              forecasting: ['automl', 'arima', 'prophet', 'lstm'],
              anomalyDetection: ['statistical', 'isolation_forest', 'autoencoder'],
              embeddings: ['text-embedding-004', 'vertex-ai-embeddings']
            }
          },
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: status, capabilities'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Prediction API GET failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'API request failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper function to determine cache headers based on time horizon
function getCacheHeaders(timeHorizon: string): { cacheControl: string } {
  const cacheSettings = {
    hourly: 'public, max-age=300, s-maxage=300', // 5 minutes
    daily: 'public, max-age=1800, s-maxage=1800', // 30 minutes
    weekly: 'public, max-age=7200, s-maxage=7200', // 2 hours
    monthly: 'public, max-age=21600, s-maxage=21600' // 6 hours
  }

  return {
    cacheControl: cacheSettings[timeHorizon as keyof typeof cacheSettings] || cacheSettings.daily
  }
}