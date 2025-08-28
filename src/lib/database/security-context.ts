import { Pool } from 'pg'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest } from 'next/server'

export interface SecurityContext {
  userId: string
  userRole: 'admin' | 'analyst' | 'viewer'
  clientIP?: string
  userAgent?: string
  sessionId?: string
}

export class DatabaseSecurityManager {
  private pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  async setSecurityContext(context: SecurityContext): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query(
        'SELECT set_user_context($1, $2, $3, $4, $5)',
        [
          context.userId,
          context.userRole,
          context.clientIP || null,
          context.userAgent || null,
          context.sessionId || null
        ]
      )
    } finally {
      client.release()
    }
  }

  async executeWithContext<T>(
    context: SecurityContext,
    operation: (client: any) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect()
    
    try {
      // Set security context
      await client.query(
        'SELECT set_user_context($1, $2, $3, $4, $5)',
        [
          context.userId,
          context.userRole,
          context.clientIP || null,
          context.userAgent || null,
          context.sessionId || null
        ]
      )
      
      // Execute the operation
      return await operation(client)
    } finally {
      client.release()
    }
  }

  async getSecurityContextFromSession(request?: NextRequest): Promise<SecurityContext | null> {
    try {
      const session = await getServerSession(authOptions)
      
      if (!session?.user?.id) {
        return null
      }

      const clientIP = request ? this.getClientIP(request) : undefined
      const userAgent = request?.headers.get('user-agent') || undefined
      
      return {
        userId: session.user.id,
        userRole: session.user.role as 'admin' | 'analyst' | 'viewer',
        clientIP,
        userAgent,
        sessionId: session.user.id // Use user ID as session identifier
      }
    } catch (error) {
      console.error('Failed to get security context:', error)
      return null
    }
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    return cfConnectingIP || realIP || forwarded?.split(',')[0] || 'unknown'
  }

  async validateUserAccess(
    userId: string,
    requiredRole: 'admin' | 'analyst' | 'viewer',
    resourceType?: string,
    resourceId?: string
  ): Promise<boolean> {
    const client = await this.pool.connect()
    
    try {
      // Get user role
      const userResult = await client.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      )
      
      if (userResult.rows.length === 0) {
        return false
      }
      
      const userRole = userResult.rows[0].role
      
      // Role hierarchy: admin > analyst > viewer
      const roleHierarchy = { admin: 3, analyst: 2, viewer: 1 }
      const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
      const requiredLevel = roleHierarchy[requiredRole] || 0
      
      if (userLevel < requiredLevel) {
        return false
      }
      
      // Additional resource-specific checks can be added here
      if (resourceType && resourceId) {
        // Example: Check if user has access to specific client data
        if (resourceType === 'transcript' && userRole === 'analyst') {
          const transcriptResult = await client.query(
            'SELECT created_by FROM transcripts WHERE id = $1',
            [resourceId]
          )
          
          if (transcriptResult.rows.length > 0) {
            const createdBy = transcriptResult.rows[0].created_by
            // Analysts can only modify their own transcripts
            return createdBy === userId || createdBy === null
          }
        }
      }
      
      return true
    } finally {
      client.release()
    }
  }

  async logSecurityEvent(
    event: 'access_denied' | 'unauthorized_attempt' | 'privilege_escalation',
    context: SecurityContext,
    details?: Record<string, any>
  ): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query(`
        INSERT INTO audit_log (
          table_name, action, new_values, user_id, user_role,
          ip_address, user_agent, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'security_events',
        event.toUpperCase(),
        JSON.stringify(details || {}),
        context.userId,
        context.userRole,
        context.clientIP || null,
        context.userAgent || null,
        context.sessionId || null
      ])
    } catch (error) {
      console.error('Failed to log security event:', error)
    } finally {
      client.release()
    }
  }
}

// Middleware function to ensure security context is set
export async function withSecurityContext<T>(
  request: NextRequest,
  operation: (context: SecurityContext) => Promise<T>
): Promise<T> {
  const securityManager = new DatabaseSecurityManager(
    // This should be your database pool instance
    new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  )
  
  const context = await securityManager.getSecurityContextFromSession(request)
  
  if (!context) {
    throw new Error('Unauthorized: No valid security context')
  }
  
  return await securityManager.executeWithContext(context, async () => {
    return await operation(context)
  })
}