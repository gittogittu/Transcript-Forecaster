import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateTranscriptData, deleteTranscriptData, fetchTranscriptById } from '@/lib/data/transcript-data'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { z } from 'zod'

// Validation schema for transcript updates
const UpdateTranscriptSchema = z.object({
  clientName: z.string().min(1, 'Client name is required').max(100).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format').optional(),
  transcriptCount: z.number().int().min(0, 'Count must be non-negative').optional(),
  notes: z.string().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
})

/**
 * GET /api/transcripts/[id] - Fetch specific transcript data
 */
export const GET = withRateLimit(rateLimitConfigs.read, async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Transcript ID is required' },
        { status: 400 }
      )
    }

    const result = await fetchTranscriptById(id)
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Transcript not found' ? 404 : 500 }
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
 * PUT /api/transcripts/[id] - Update specific transcript data
 */
export const PUT = withRateLimit(rateLimitConfigs.data, async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Transcript ID is required' },
        { status: 400 }
      )
    }
    
    // Validate request body
    const validationResult = UpdateTranscriptSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const updateData = validationResult.data
    
    // Extract year from month if month is being updated
    if (updateData.month) {
      updateData.year = parseInt(updateData.month.split('-')[0])
    }
    
    const result = await updateTranscriptData(id, updateData)
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Transcript not found' ? 404 : 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Transcript data updated successfully',
      data: result.data,
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
 * DELETE /api/transcripts/[id] - Delete specific transcript data
 */
export const DELETE = withRateLimit(rateLimitConfigs.data, async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Transcript ID is required' },
        { status: 400 }
      )
    }
    
    const result = await deleteTranscriptData(id)
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Transcript not found' ? 404 : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Transcript data deleted successfully',
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})