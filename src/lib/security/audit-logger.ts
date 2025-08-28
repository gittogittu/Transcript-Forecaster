import { Pool } from 'pg'
import { NextRequest } from 'next/server'
import { SecurityContext } from '@/lib/database/security-context'

export interface AuditEvent {
  action: string
  resource: string
  resourceId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  metadata?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface AuditLogEntry {
  id: string
  tableName: string
  recordId?: string
  action: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  userId?: string
  userRole?: string
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  sessionId?: string
  severity: string
  metadata?: Record<string, any>
}

export class AuditLogger {
  private pool: Pool
  private static instance: AuditLogger

  constructor(pool: Pool) {
    this.pool = pool
  }

  static getInstance(pool: Pool): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger(pool)
    }
    return AuditLogger.instance
  }

  async logEvent(
    event: AuditEvent,
    context: SecurityContext,
    request?: NextRequest
  ): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query(`
        INSERT INTO audit_log (
          table_name, record_id, action, old_values, new_values,
          user_id, user_role, ip_address, user_agent, session_id,
          timestamp, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        event.resource,
        event.resourceId || null,
        event.action,
        event.oldValues ? JSON.stringify(event.oldValues) : null,
        event.newValues ? JSON.stringify(event.newValues) : null,
        context.userId,
        context.userRole,
        context.clientIP || this.getClientIP(request),
        context.userAgent || request?.headers.get('user-agent'),
        context.sessionId,
        new Date(),
        JSON.stringify({
          severity: event.severity,
          ...event.metadata
        })
      ])
    } catch (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw - audit logging should not break the main operation
    } finally {
      client.release()
    }
  }

  async logDataModification(
    tableName: string,
    recordId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    context?: SecurityContext,
    request?: NextRequest
  ): Promise<void> {
    await this.logEvent({
      action,
      resource: tableName,
      resourceId: recordId,
      oldValues,
      newValues,
      severity: this.getSeverityForAction(action, tableName)
    }, context!, request)
  }

  async logSecurityEvent(
    eventType: 'LOGIN' | 'LOGOUT' | 'ACCESS_DENIED' | 'PRIVILEGE_ESCALATION' | 'SUSPICIOUS_ACTIVITY',
    details: Record<string, any>,
    context: SecurityContext,
    request?: NextRequest
  ): Promise<void> {
    await this.logEvent({
      action: eventType,
      resource: 'security',
      metadata: details,
      severity: this.getSeverityForSecurityEvent(eventType)
    }, context, request)
  }

  async logAPIAccess(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    context?: SecurityContext,
    request?: NextRequest
  ): Promise<void> {
    if (!context) return // Skip if no user context

    await this.logEvent({
      action: 'API_ACCESS',
      resource: 'api',
      metadata: {
        endpoint,
        method,
        statusCode,
        responseTime,
        success: statusCode < 400
      },
      severity: statusCode >= 400 ? 'medium' : 'low'
    }, context, request)
  }

  async getAuditLogs(
    filters: {
      userId?: string
      tableName?: string
      action?: string
      startDate?: Date
      endDate?: Date
      severity?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<AuditLogEntry[]> {
    const client = await this.pool.connect()
    
    try {
      let query = `
        SELECT 
          id, table_name, record_id, action, old_values, new_values,
          user_id, user_role, ip_address, user_agent, timestamp,
          session_id, metadata
        FROM audit_log
        WHERE 1=1
      `
      const params: any[] = []
      let paramIndex = 1

      if (filters.userId) {
        query += ` AND user_id = $${paramIndex++}`
        params.push(filters.userId)
      }

      if (filters.tableName) {
        query += ` AND table_name = $${paramIndex++}`
        params.push(filters.tableName)
      }

      if (filters.action) {
        query += ` AND action = $${paramIndex++}`
        params.push(filters.action)
      }

      if (filters.startDate) {
        query += ` AND timestamp >= $${paramIndex++}`
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ` AND timestamp <= $${paramIndex++}`
        params.push(filters.endDate)
      }

      if (filters.severity) {
        query += ` AND metadata->>'severity' = $${paramIndex++}`
        params.push(filters.severity)
      }

      query += ` ORDER BY timestamp DESC`

      if (filters.limit) {
        query += ` LIMIT $${paramIndex++}`
        params.push(filters.limit)
      }

      if (filters.offset) {
        query += ` OFFSET $${paramIndex++}`
        params.push(filters.offset)
      }

      const result = await client.query(query, params)
      
      return result.rows.map(row => ({
        id: row.id,
        tableName: row.table_name,
        recordId: row.record_id,
        action: row.action,
        oldValues: row.old_values,
        newValues: row.new_values,
        userId: row.user_id,
        userRole: row.user_role,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
        sessionId: row.session_id,
        severity: row.metadata?.severity || 'low',
        metadata: row.metadata
      }))
    } finally {
      client.release()
    }
  }

  async getAuditSummary(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEvents: number
    eventsByAction: Record<string, number>
    eventsBySeverity: Record<string, number>
    topUsers: Array<{ userId: string; count: number }>
    suspiciousActivity: number
  }> {
    const client = await this.pool.connect()
    
    try {
      const [totalResult, actionResult, severityResult, userResult, suspiciousResult] = await Promise.all([
        client.query(`
          SELECT COUNT(*) as total
          FROM audit_log
          WHERE timestamp BETWEEN $1 AND $2
        `, [startDate, endDate]),
        
        client.query(`
          SELECT action, COUNT(*) as count
          FROM audit_log
          WHERE timestamp BETWEEN $1 AND $2
          GROUP BY action
          ORDER BY count DESC
        `, [startDate, endDate]),
        
        client.query(`
          SELECT metadata->>'severity' as severity, COUNT(*) as count
          FROM audit_log
          WHERE timestamp BETWEEN $1 AND $2
          AND metadata->>'severity' IS NOT NULL
          GROUP BY metadata->>'severity'
          ORDER BY count DESC
        `, [startDate, endDate]),
        
        client.query(`
          SELECT user_id, COUNT(*) as count
          FROM audit_log
          WHERE timestamp BETWEEN $1 AND $2
          AND user_id IS NOT NULL
          GROUP BY user_id
          ORDER BY count DESC
          LIMIT 10
        `, [startDate, endDate]),
        
        client.query(`
          SELECT COUNT(*) as count
          FROM audit_log
          WHERE timestamp BETWEEN $1 AND $2
          AND (
            action IN ('ACCESS_DENIED', 'PRIVILEGE_ESCALATION', 'SUSPICIOUS_ACTIVITY')
            OR metadata->>'severity' = 'critical'
          )
        `, [startDate, endDate])
      ])

      return {
        totalEvents: parseInt(totalResult.rows[0].total),
        eventsByAction: Object.fromEntries(
          actionResult.rows.map(row => [row.action, parseInt(row.count)])
        ),
        eventsBySeverity: Object.fromEntries(
          severityResult.rows.map(row => [row.severity, parseInt(row.count)])
        ),
        topUsers: userResult.rows.map(row => ({
          userId: row.user_id,
          count: parseInt(row.count)
        })),
        suspiciousActivity: parseInt(suspiciousResult.rows[0].count)
      }
    } finally {
      client.release()
    }
  }

  private getSeverityForAction(action: string, tableName: string): 'low' | 'medium' | 'high' | 'critical' {
    if (action === 'DELETE') {
      return tableName === 'users' ? 'critical' : 'high'
    }
    if (action === 'UPDATE' && tableName === 'users') {
      return 'medium'
    }
    return 'low'
  }

  private getSeverityForSecurityEvent(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (eventType) {
      case 'PRIVILEGE_ESCALATION':
      case 'SUSPICIOUS_ACTIVITY':
        return 'critical'
      case 'ACCESS_DENIED':
        return 'high'
      case 'LOGIN':
      case 'LOGOUT':
        return 'low'
      default:
        return 'medium'
    }
  }

  private getClientIP(request?: NextRequest): string | undefined {
    if (!request) return undefined
    
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    return cfConnectingIP || realIP || forwarded?.split(',')[0] || undefined
  }
}