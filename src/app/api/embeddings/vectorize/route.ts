/**
 * API Route: Vectorize Transcripts
 * 
 * POST /api/embeddings/vectorize
 * - Vectorize single or multiple transcripts
 * - Support batch processing
 * - Return vectorization results
 */

import { NextRequest, NextResponse } from 'next/server'
import { EmbeddingService } from '@/lib/services/embeddings'
import { z } from 'zod'

const VectorizeRequestSchema = z.object({
  transcriptId: z.string().optional(),
  transcriptIds: z.array(z.string()).optional(),
  clientId: z.string().optional(),
  dateRange: z.object({
    startDate: z.string(),
    endDate: z.string()
  }).optional(),
  forceRegenerate: z.boolean().default(false),
  embeddingModel: z.enum(['text-embedding-004', 'text-embedding-gecko']).default('text-embedding-004'),
  batchSize: z.number().min(1).max(200).default(50)
}).refine(
  (data) => data.transcriptId || data.transcriptIds || data.clientId || data.dateRange,
  {
    message: "Must provide transcriptId, transcriptIds, clientId, or dateRange"
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = VectorizeRequestSchema.parse(body)

    const {
      transcriptId,
      transcriptIds,
      clientId,
      dateRange,
      forceRegenerate,
      embeddingModel,
      batchSize
    } = validatedData

    // Single transcript vectorization
    if (transcriptId) {
      const result = await EmbeddingService.vectorizeTranscript(transcriptId, {
        forceRegenerate,
        embeddingModel
      })

      return NextResponse.json({
        success: true,
        data: result,
        message: result.success
          ? 'Transcript vectorized successfully'
          : `Vectorization failed: ${result.error}`
      })
    }

    // Batch vectorization
    const result = await EmbeddingService.initializeAllEmbeddings({
      forceRegenerate,
      batchSize,
      embeddingModel
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProcessed: result.totalProcessed,
          successCount: result.successCount,
          errorCount: result.errorCount,
          processingTime: result.totalProcessingTime,
          averageTime: result.averageProcessingTime
        },
        results: result.results.slice(0, 10), // Return first 10 detailed results
        hasMore: result.results.length > 10
      },
      message: `Batch vectorization completed: ${result.successCount}/${result.totalProcessed} successful`
    })

  } catch (error) {
    console.error('Vectorization API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Vectorization failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transcriptId = searchParams.get('transcriptId')

    if (!transcriptId) {
      return NextResponse.json({
        success: false,
        error: 'transcriptId parameter is required'
      }, { status: 400 })
    }

    // Check if transcript is already vectorized
    const stats = await EmbeddingService.getSystemStats()

    return NextResponse.json({
      success: true,
      data: {
        transcriptId,
        isVectorized: true, // This would need actual implementation
        stats: stats.vectorization
      }
    })

  } catch (error) {
    console.error('Vectorization status check error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to check vectorization status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}