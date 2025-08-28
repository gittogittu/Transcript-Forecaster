import { NextRequest, NextResponse } from 'next/server'
import { withSecurityAndContext } from '@/lib/middleware/security-middleware'
import { AuditLogger } from '@/lib/security/audit-logger'
import { Pool } from 'pg'
import { z } from 'zod'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const auditLogger = AuditLogger.getInstance(pool)

const SummaryQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
})

/**
 * GET /api/security/audit/summary - Get audit summary statistics (admin only)
 */
export const GET = withSecurityAndContext(async function(request: NextRequest, context) {
  try {
    // Only admins can access audit summaries
    if (context.userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validatedQuery = SummaryQuerySchema.parse(queryParams)
    
    const startDate = new Date(validatedQuery.startDate)
    const endDate = new Date(validatedQuery.endDate)

    // Validate date range
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    // Limit to maximum 1 year range
    const maxRange = 365 * 24 * 60 * 60 * 1000 // 1 year in milliseconds
    if (endDate.getTime() - startDate.getTime() > maxRange) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 1 year' },
        { status: 400 }
      )
    }

    const summary = await auditLogger.getAuditSummary(startDate, endDate)

    // Log the summary access
    await auditLogger.logSecurityEvent(
      'LOGIN', // Using LOGIN as placeholder for summary access
      { 
        action: 'audit_summary_access',
        dateRange: { startDate, endDate },
        totalEvents: summary.totalEvents
      },
      context,
      request
    )

    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        dateRange: {
          startDate,
          endDate
        },
        generatedAt: new Date()
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error generating audit summary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}, { rateLimitType: 'api' })