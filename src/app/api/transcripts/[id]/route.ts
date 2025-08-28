import { NextRequest, NextResponse } from 'next/server'
import { authenticated, analystOrAdmin, getCurrentUser } from '@/lib/middleware/auth'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { performanceMiddleware } from '@/lib/middleware/performance-middleware'
import { transcriptService } from '@/lib/database/transcripts'
import { AuditLogger } from '@/lib/security/audit-logger'
import { TranscriptUpdateSchema } from '@/lib/validations/schemas'
import { Pool } from 'pg'
import { z } from 'zod'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const auditLogger = AuditLogger.getInstance(pool)

const ParamsSchema = z.object({
  id: z.string().uuid('Invalid transcript ID')
})

/**
 * GET /api/transcripts/[id] - Get specific transcript
 */
async function handleGET(request: NextRequest, { params }: { params: { id: string } }) {
  return performanceMiddleware(request, async () => {
    try {
      const validatedParams = ParamsSchema.parse(params)
      const transcript = await transcriptService.getTranscriptById(validatedParams.id)
      
      if (!transcript) {
        return NextResponse.json(
          { error: 'Transcript not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: transcript
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid transcript ID', details: error.issues },
          { status: 400 }
        )
      }

      console.error('Error fetching transcript:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

/**
 * PUT /api/transcripts/[id] - Update transcript (analyst or admin only)
 */
async function handlePUT(request: NextRequest, { params }: { params: { id: string } }) {
  return performanceMiddleware(request, async () => {
    try {
      const validatedParams = ParamsSchema.parse(params)
      const body = await request.json()
      const validatedData = TranscriptUpdateSchema.parse(body)
      
      const user = await getCurrentUser(request)
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Get original transcript for audit log
      const originalTranscript = await transcriptService.getTranscriptById(validatedParams.id)
      
      const updatedTranscript = await transcriptService.updateTranscript(validatedParams.id, {
        ...validatedData,
        updatedAt: new Date()
      })
      
      // Log audit event for update
      if (updatedTranscript && originalTranscript) {
        await auditLogger.logDataModification(
          'transcripts',
          validatedParams.id,
          'UPDATE',
          originalTranscript,
          updatedTranscript,
          { userId: user.userId, userRole: user.role as any, clientIP: undefined, userAgent: undefined, sessionId: user.userId },
          request
        )
      }

      if (!updatedTranscript) {
        return NextResponse.json(
          { error: 'Transcript not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: updatedTranscript,
        message: 'Transcript updated successfully'
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        )
      }

      console.error('Error updating transcript:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

/**
 * DELETE /api/transcripts/[id] - Delete transcript (analyst or admin only)
 */
async function handleDELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return performanceMiddleware(request, async () => {
    try {
      const validatedParams = ParamsSchema.parse(params)
      
      const user = await getCurrentUser(request)
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Get transcript before deletion for audit log
      const transcriptToDelete = await transcriptService.getTranscriptById(validatedParams.id)
      
      const deleted = await transcriptService.deleteTranscript(validatedParams.id)
      
      // Log audit event for deletion
      if (deleted && transcriptToDelete) {
        await auditLogger.logDataModification(
          'transcripts',
          validatedParams.id,
          'DELETE',
          transcriptToDelete,
          undefined,
          { userId: user.userId, userRole: user.role as any, clientIP: undefined, userAgent: undefined, sessionId: user.userId },
          request
        )
      }

      if (!deleted) {
        return NextResponse.json(
          { error: 'Transcript not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Transcript deleted successfully'
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid transcript ID', details: error.issues },
          { status: 400 }
        )
      }

      console.error('Error deleting transcript:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

// Apply middleware and export handlers
export const GET = withRateLimit(rateLimitConfigs.read, authenticated(handleGET))
export const PUT = withRateLimit(rateLimitConfigs.data, analystOrAdmin(handlePUT))
export const DELETE = withRateLimit(rateLimitConfigs.data, analystOrAdmin(handleDELETE))