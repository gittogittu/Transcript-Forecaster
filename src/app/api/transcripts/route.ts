import { NextRequest, NextResponse } from 'next/server'
import { authenticated, analystOrAdmin, getCurrentUser } from '@/lib/middleware/auth'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { performanceMiddleware } from '@/lib/middleware/performance-middleware'
import { TranscriptService } from '@/lib/database/transcripts'
import { AuditLogger } from '@/lib/security/audit-logger'
import { TranscriptCreateSchema, BulkTranscriptSchema, TranscriptQuerySchema } from '@/lib/validations/schemas'
import { Pool } from 'pg'
import { z } from 'zod'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const auditLogger = AuditLogger.getInstance(pool)
const transcriptService = new TranscriptService()

/**
 * GET /api/transcripts - Fetch all transcript data with filtering and pagination
 */
async function handleGET(request: NextRequest) {
  return performanceMiddleware(request, async () => {
    try {
      const { searchParams } = new URL(request.url)
      const queryParams = Object.fromEntries(searchParams.entries())
      
      // Validate query parameters
      const validatedQuery = TranscriptQuerySchema.parse(queryParams)
      
      const transcripts = await transcriptService.getTranscripts({
        clientId: validatedQuery.clientId,
        startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
        endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined,
        transcriptType: validatedQuery.transcriptType,
        page: validatedQuery.page,
        limit: validatedQuery.limit
      })

      return NextResponse.json({
        success: true,
        data: transcripts.data,
        pagination: transcripts.pagination
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: error.issues },
          { status: 400 }
        )
      }

      console.error('Error fetching transcripts:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

/**
 * POST /api/transcripts - Create new transcript data (analyst or admin only)
 */
async function handlePOST(request: NextRequest) {
  return performanceMiddleware(request, async () => {
    try {
      const body = await request.json()
      const user = await getCurrentUser(request)
      
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Check if it's a bulk operation or single transcript
      const isBulk = Array.isArray(body)
      
      if (isBulk) {
        // Validate bulk data
        const validatedData = BulkTranscriptSchema.parse(body)
        
        // Add createdBy to each transcript
        const transcriptsWithUser = validatedData.map(transcript => ({
          ...transcript,
          createdBy: user.userId
        }))
        
        const result = await transcriptService.bulkCreateTranscripts(transcriptsWithUser)
        
        // Log audit event for bulk creation
        await auditLogger.logDataModification(
          'transcripts',
          'bulk',
          'CREATE',
          undefined,
          { count: result.length, transcripts: transcriptsWithUser },
          { userId: user.userId, userRole: user.role as any, clientIP: undefined, userAgent: undefined, sessionId: user.userId },
          request
        )
        
        return NextResponse.json({
          success: true,
          data: result,
          message: `Successfully created ${result.length} transcripts`
        })
      } else {
        // Validate single transcript
        const validatedData = TranscriptCreateSchema.parse(body)
        
        const transcript = await transcriptService.createTranscript({
          ...validatedData,
          createdBy: user.userId
        })
        
        // Log audit event for single creation
        await auditLogger.logDataModification(
          'transcripts',
          transcript.id,
          'CREATE',
          undefined,
          transcript,
          { userId: user.userId, userRole: user.role as any, clientIP: undefined, userAgent: undefined, sessionId: user.userId },
          request
        )
        
        return NextResponse.json({
          success: true,
          data: transcript,
          message: 'Transcript created successfully'
        })
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        )
      }

      console.error('Error creating transcript:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

// Export handlers with middleware
export const GET = withRateLimit(rateLimitConfigs.read, authenticated(handleGET))
export const POST = withRateLimit(rateLimitConfigs.data, analystOrAdmin(handlePOST))