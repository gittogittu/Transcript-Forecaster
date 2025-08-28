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

const AuditQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  tableName: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0)
})

/**
 * GET /api/security/audit - Get audit logs (admin only)
 */
export const GET = withSecurityAndContext(async function(request: NextRequest, context) {
  try {
    // Only admins can access audit logs
    if (context.userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validatedQuery = AuditQuerySchema.parse(queryParams)
    
    const filters = {
      userId: validatedQuery.userId,
      tableName: validatedQuery.tableName,
      action: validatedQuery.action,
      startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
      endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined,
      severity: validatedQuery.severity,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset
    }

    const auditLogs = await auditLogger.getAuditLogs(filters)

    // Log the audit log access
    await auditLogger.logSecurityEvent(
      'LOGIN', // Using LOGIN as a placeholder for audit access
      { 
        action: 'audit_log_access',
        filters: filters,
        resultCount: auditLogs.length
      },
      context,
      request
    )

    return NextResponse.json({
      success: true,
      data: auditLogs,
      pagination: {
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        total: auditLogs.length
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}, { rateLimitType: 'api' })

/**
 * POST /api/security/audit - Create manual audit log entry (admin only)
 */
export const POST = withSecurityAndContext(async function(request: NextRequest, context) {
  try {
    // Only admins can create manual audit entries
    if (context.userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    const AuditEventSchema = z.object({
      action: z.string().min(1).max(100),
      resource: z.string().min(1).max(100),
      resourceId: z.string().optional(),
      oldValues: z.record(z.any()).optional(),
      newValues: z.record(z.any()).optional(),
      metadata: z.record(z.any()).optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
    })

    const validatedData = AuditEventSchema.parse(body)

    await auditLogger.logEvent(
      {
        action: validatedData.action,
        resource: validatedData.resource,
        resourceId: validatedData.resourceId,
        oldValues: validatedData.oldValues,
        newValues: validatedData.newValues,
        metadata: {
          ...validatedData.metadata,
          manualEntry: true,
          createdBy: context.userId
        },
        severity: validatedData.severity
      },
      context,
      request
    )

    return NextResponse.json({
      success: true,
      message: 'Audit log entry created successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating audit log entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}, { rateLimitType: 'api' })