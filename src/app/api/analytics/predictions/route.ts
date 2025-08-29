import { NextRequest, NextResponse } from 'next/server'
import { analystOrAdmin, getCurrentUser } from '@/lib/middleware/auth'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { performanceMiddleware, measureModelPerformance } from '@/lib/middleware/performance-middleware'
import { TranscriptService } from '@/lib/database/transcripts'
import { PredictionService } from '@/lib/services/prediction-service'
import { PredictionRequestSchema } from '@/lib/validations/schemas'
import { z } from 'zod'

/**
 * GET /api/analytics/predictions - Get existing predictions
 */
async function handleGET(request: NextRequest) {
  return performanceMiddleware(request, async () => {
    try {
      const user = await getCurrentUser(request)
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { searchParams } = new URL(request.url)
      const clientId = searchParams.get('clientId')
      const predictionType = searchParams.get('predictionType') as 'daily' | 'weekly' | 'monthly' | null

      // Get predictions from database (implement this in prediction service)
      const predictions = await PredictionService.getPredictions({
        clientId: clientId || undefined,
        predictionType: predictionType || undefined
      })

      return NextResponse.json({
        success: true,
        data: predictions
      })
    } catch (error) {
      console.error('Error fetching predictions:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

/**
 * POST /api/analytics/predictions - Generate new predictions
 */
async function handlePOST(request: NextRequest) {
  return performanceMiddleware(request, async () => {
    try {
      const user = await getCurrentUser(request)
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const body = await request.json()
      const validatedData = PredictionRequestSchema.parse(body)

      // Fetch historical data for predictions
      const transcriptService = new TranscriptService()
      const transcriptResult = await transcriptService.getTranscripts({
        clientId: validatedData.clientId,
        page: 1,
        limit: 10000 // Get all historical data
      })

      if (!transcriptResult.data || transcriptResult.data.length === 0) {
        return NextResponse.json(
          { error: 'Insufficient historical data for predictions' },
          { status: 400 }
        )
      }

      // Generate predictions with performance monitoring
      const predictions = await measureModelPerformance(
        validatedData.modelType,
        async () => {
          return await PredictionService.generatePredictions({
            data: transcriptResult.data,
            predictionType: validatedData.predictionType,
            periodsAhead: validatedData.periodsAhead,
            modelType: validatedData.modelType,
            clientId: validatedData.clientId,
            createdBy: user.userId
          })
        }
      )

      return NextResponse.json({
        success: true,
        data: predictions,
        message: 'Predictions generated successfully'
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        )
      }

      console.error('Error generating predictions:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

export const GET = withRateLimit(rateLimitConfigs.read, analystOrAdmin(handleGET))
export const POST = withRateLimit(rateLimitConfigs.predictions, analystOrAdmin(handlePOST))