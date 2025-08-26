import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGoogleSheetsService } from '@/lib/services/google-sheets'
import { addTranscriptData, fetchAllTranscripts } from '@/lib/data/transcript-data'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { z } from 'zod'

// Validation schema for transcript data
const TranscriptSchema = z.object({
  clientName: z.string().min(1, 'Client name is required').max(100),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  transcriptCount: z.number().int().min(0, 'Count must be non-negative'),
  notes: z.string().optional(),
})

/**
 * GET /api/transcripts - Fetch all transcript data
 */
export const GET = withRateLimit(rateLimitConfigs.read, async (request: NextRequest) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await fetchAllTranscripts()
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: result.data,
      success: true,
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/transcripts - Add new transcript data
 */
export const POST = withRateLimit(rateLimitConfigs.data, async (request: NextRequest) => {
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
    const validationResult = TranscriptSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const { clientName, month, transcriptCount, notes } = validationResult.data
    
    // Extract year from month
    const year = parseInt(month.split('-')[0])
    
    const result = await addTranscriptData({
      clientName,
      month,
      year,
      transcriptCount,
      notes,
    })
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Transcript data added successfully',
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})