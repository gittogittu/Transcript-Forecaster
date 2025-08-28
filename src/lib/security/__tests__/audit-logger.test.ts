import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { AuditLogger } from '../audit-logger'
import { Pool } from 'pg'

// Mock pg Pool
const mockQuery = jest.fn()
const mockConnect = jest.fn()
const mockRelease = jest.fn()

const mockClient = {
  query: mockQuery,
  release: mockRelease
}

const mockPool = {
  connect: mockConnect
} as unknown as Pool

mockConnect.mockResolvedValue(mockClient)

describe('AuditLogger', () => {
  let auditLogger: AuditLogger

  beforeEach(() => {
    jest.clearAllMocks()
    auditLogger = new AuditLogger(mockPool)
  })

  describe('logEvent', () => {
    it('should log audit event successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const event = {
        action: 'CREATE',
        resource: 'transcripts',
        resourceId: '123',
        newValues: { name: 'test' },
        severity: 'low' as const
      }

      const context = {
        userId: 'user-123',
        userRole: 'analyst' as const,
        clientIP: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-123'
      }

      await auditLogger.logEvent(event, context)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_log'),
        expect.arrayContaining([
          'transcripts',
          '123',
          'CREATE',
          null,
          JSON.stringify({ name: 'test' }),
          'user-123',
          'analyst',
          '192.168.1.1',
          'Mozilla/5.0',
          'session-123',
          expect.any(Date),
          JSON.stringify({ severity: 'low' })
        ])
      )
    })

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'))

      const event = {
        action: 'CREATE',
        resource: 'transcripts',
        severity: 'low' as const
      }

      const context = {
        userId: 'user-123',
        userRole: 'analyst' as const
      }

      // Should not throw
      await expect(auditLogger.logEvent(event, context)).resolves.toBeUndefined()
    })

    it('should always release database connection', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'))

      const event = {
        action: 'CREATE',
        resource: 'transcripts',
        severity: 'low' as const
      }

      const context = {
        userId: 'user-123',
        userRole: 'analyst' as const
      }

      await auditLogger.logEvent(event, context)

      expect(mockRelease).toHaveBeenCalled()
    })
  })

  describe('logDataModification', () => {
    it('should log data modification with correct parameters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const oldValues = { name: 'old' }
      const newValues = { name: 'new' }
      const context = {
        userId: 'user-123',
        userRole: 'analyst' as const
      }

      await auditLogger.logDataModification(
        'transcripts',
        'record-123',
        'UPDATE',
        oldValues,
        newValues,
        context
      )

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_log'),
        expect.arrayContaining([
          'transcripts',
          'record-123',
          'UPDATE',
          JSON.stringify(oldValues),
          JSON.stringify(newValues),
          'user-123',
          'analyst'
        ])
      )
    })

    it('should determine correct severity for DELETE action', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const context = {
        userId: 'user-123',
        userRole: 'admin' as const
      }

      await auditLogger.logDataModification(
        'users',
        'user-456',
        'DELETE',
        { name: 'deleted user' },
        undefined,
        context
      )

      const lastCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      const metadata = JSON.parse(lastCall[1][11]) // metadata parameter
      expect(metadata.severity).toBe('critical')
    })
  })

  describe('logSecurityEvent', () => {
    it('should log security events with appropriate severity', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const context = {
        userId: 'user-123',
        userRole: 'analyst' as const
      }

      await auditLogger.logSecurityEvent(
        'PRIVILEGE_ESCALATION',
        { attemptedRole: 'admin' },
        context
      )

      const lastCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      const metadata = JSON.parse(lastCall[1][11])
      expect(metadata.severity).toBe('critical')
    })

    it('should include event details in metadata', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const context = {
        userId: 'user-123',
        userRole: 'viewer' as const
      }

      const details = { endpoint: '/api/admin', method: 'POST' }

      await auditLogger.logSecurityEvent('ACCESS_DENIED', details, context)

      const lastCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      const metadata = JSON.parse(lastCall[1][11])
      expect(metadata.endpoint).toBe('/api/admin')
      expect(metadata.method).toBe('POST')
    })
  })

  describe('logAPIAccess', () => {
    it('should log successful API access with low severity', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const context = {
        userId: 'user-123',
        userRole: 'analyst' as const
      }

      await auditLogger.logAPIAccess(
        '/api/transcripts',
        'GET',
        200,
        150,
        context
      )

      const lastCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      const metadata = JSON.parse(lastCall[1][11])
      expect(metadata.severity).toBe('low')
      expect(metadata.success).toBe(true)
      expect(metadata.responseTime).toBe(150)
    })

    it('should log failed API access with medium severity', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const context = {
        userId: 'user-123',
        userRole: 'viewer' as const
      }

      await auditLogger.logAPIAccess(
        '/api/admin',
        'POST',
        403,
        50,
        context
      )

      const lastCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      const metadata = JSON.parse(lastCall[1][11])
      expect(metadata.severity).toBe('medium')
      expect(metadata.success).toBe(false)
    })

    it('should skip logging when no context provided', async () => {
      await auditLogger.logAPIAccess('/api/test', 'GET', 200, 100)
      expect(mockQuery).not.toHaveBeenCalled()
    })
  })

  describe('getAuditLogs', () => {
    it('should fetch audit logs with filters', async () => {
      const mockRows = [
        {
          id: '1',
          table_name: 'transcripts',
          action: 'CREATE',
          user_id: 'user-123',
          timestamp: new Date()
        }
      ]
      mockQuery.mockResolvedValueOnce({ rows: mockRows })

      const filters = {
        userId: 'user-123',
        tableName: 'transcripts',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        limit: 10
      }

      const result = await auditLogger.getAuditLogs(filters)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1'),
        expect.arrayContaining(['user-123', 'transcripts'])
      )
      expect(result).toHaveLength(1)
      expect(result[0].tableName).toBe('transcripts')
    })

    it('should handle empty results', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const result = await auditLogger.getAuditLogs()

      expect(result).toEqual([])
    })
  })

  describe('getAuditSummary', () => {
    it('should return comprehensive audit summary', async () => {
      const mockResults = [
        { rows: [{ total: '100' }] }, // total events
        { rows: [{ action: 'CREATE', count: '50' }, { action: 'UPDATE', count: '30' }] }, // by action
        { rows: [{ severity: 'low', count: '80' }, { severity: 'high', count: '20' }] }, // by severity
        { rows: [{ user_id: 'user-1', count: '60' }, { user_id: 'user-2', count: '40' }] }, // top users
        { rows: [{ count: '5' }] } // suspicious activity
      ]

      mockQuery
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2])
        .mockResolvedValueOnce(mockResults[3])
        .mockResolvedValueOnce(mockResults[4])

      const startDate = new Date('2023-01-01')
      const endDate = new Date('2023-12-31')

      const summary = await auditLogger.getAuditSummary(startDate, endDate)

      expect(summary.totalEvents).toBe(100)
      expect(summary.eventsByAction.CREATE).toBe(50)
      expect(summary.eventsByAction.UPDATE).toBe(30)
      expect(summary.eventsBySeverity.low).toBe(80)
      expect(summary.eventsBySeverity.high).toBe(20)
      expect(summary.topUsers).toHaveLength(2)
      expect(summary.topUsers[0].userId).toBe('user-1')
      expect(summary.topUsers[0].count).toBe(60)
      expect(summary.suspiciousActivity).toBe(5)
    })
  })

  describe('severity calculation', () => {
    it('should assign critical severity to user deletion', () => {
      const severity = auditLogger['getSeverityForAction']('DELETE', 'users')
      expect(severity).toBe('critical')
    })

    it('should assign high severity to non-user deletion', () => {
      const severity = auditLogger['getSeverityForAction']('DELETE', 'transcripts')
      expect(severity).toBe('high')
    })

    it('should assign medium severity to user updates', () => {
      const severity = auditLogger['getSeverityForAction']('UPDATE', 'users')
      expect(severity).toBe('medium')
    })

    it('should assign low severity to other operations', () => {
      const severity = auditLogger['getSeverityForAction']('CREATE', 'transcripts')
      expect(severity).toBe('low')
    })
  })

  describe('security event severity', () => {
    it('should assign critical severity to privilege escalation', () => {
      const severity = auditLogger['getSeverityForSecurityEvent']('PRIVILEGE_ESCALATION')
      expect(severity).toBe('critical')
    })

    it('should assign high severity to access denied', () => {
      const severity = auditLogger['getSeverityForSecurityEvent']('ACCESS_DENIED')
      expect(severity).toBe('high')
    })

    it('should assign low severity to login/logout', () => {
      const severity = auditLogger['getSeverityForSecurityEvent']('LOGIN')
      expect(severity).toBe('low')
    })
  })
})