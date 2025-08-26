import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { DataConsistencyService, getDataConsistencyService } from '../data-consistency'
import { getGoogleSheetsService } from '../google-sheets'
import { TranscriptData } from '@/types/transcript'

// Mock the Google Sheets service
vi.mock('../google-sheets', () => ({
  getGoogleSheetsService: vi.fn()
}))

const mockGoogleSheetsService = {
  testConnection: vi.fn(),
  fetchTranscripts: vi.fn(),
  updateTranscript: vi.fn(),
  deleteTranscript: vi.fn()
}

const validTranscriptData: TranscriptData[] = [
  {
    id: '1',
    clientName: 'Client A',
    month: '2024-01',
    year: 2024,
    transcriptCount: 100,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-02T10:00:00Z'),
    notes: 'Valid note'
  },
  {
    id: '2',
    clientName: 'Client B',
    month: '2024-02',
    year: 2024,
    transcriptCount: 150,
    createdAt: new Date('2024-02-01T10:00:00Z'),
    updatedAt: new Date('2024-02-01T10:00:00Z')
  }
]

const invalidTranscriptData: TranscriptData[] = [
  {
    id: '3',
    clientName: '', // Invalid: empty client name
    month: '2024-01',
    year: 2024,
    transcriptCount: 100,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z')
  },
  {
    id: '4',
    clientName: 'Client C',
    month: '2024-13', // Invalid: month format
    year: 2024,
    transcriptCount: -50, // Invalid: negative count
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z')
  },
  {
    id: '5',
    clientName: 'Client D',
    month: '2024-03',
    year: 2023, // Invalid: year mismatch
    transcriptCount: 15000, // Warning: unusually high
    createdAt: new Date('2024-03-01T10:00:00Z'),
    updatedAt: new Date('2024-02-01T10:00:00Z') // Invalid: updated before created
  }
]

const duplicateTranscriptData: TranscriptData[] = [
  {
    id: '6',
    clientName: 'Client A',
    month: '2024-01',
    year: 2024,
    transcriptCount: 100,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z')
  },
  {
    id: '7',
    clientName: 'Client A', // Duplicate client-month combination
    month: '2024-01',
    year: 2024,
    transcriptCount: 50,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z')
  }
]

describe('DataConsistencyService Integration Tests', () => {
  let consistencyService: DataConsistencyService

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getGoogleSheetsService as Mock).mockReturnValue(mockGoogleSheetsService)
    consistencyService = getDataConsistencyService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Consistency Check', () => {
    it('should pass consistency check for valid data', async () => {
      // Arrange
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(validTranscriptData)
      vi.spyOn(consistencyService as any, 'getClientData').mockResolvedValue(validTranscriptData)

      // Act
      const result = await consistencyService.performConsistencyCheck()

      // Assert
      expect(result.isConsistent).toBe(true)
      expect(result.totalRecords).toBe(2)
      expect(result.issues).toHaveLength(0)
      expect(result.summary.duplicates).toBe(0)
      expect(result.summary.mismatches).toBe(0)
      expect(result.summary.missing).toBe(0)
      expect(result.summary.invalid).toBe(0)
      expect(result.summary.orphaned).toBe(0)
    })

    it('should detect validation issues in server data', async () => {
      // Arrange
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(invalidTranscriptData)
      vi.spyOn(consistencyService as any, 'getClientData').mockResolvedValue([])

      // Act
      const result = await consistencyService.performConsistencyCheck()

      // Assert
      expect(result.isConsistent).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)

      // Check for specific validation issues
      const clientNameIssue = result.issues.find(issue => 
        issue.recordId === '3' && issue.field === 'clientName'
      )
      expect(clientNameIssue).toBeDefined()
      expect(clientNameIssue?.severity).toBe('critical')

      const monthFormatIssue = result.issues.find(issue => 
        issue.recordId === '4' && issue.field === 'month'
      )
      expect(monthFormatIssue).toBeDefined()

      const transcriptCountIssue = result.issues.find(issue => 
        issue.recordId === '4' && issue.field === 'transcriptCount'
      )
      expect(transcriptCountIssue).toBeDefined()

      const yearConsistencyIssue = result.issues.find(issue => 
        issue.recordId === '5' && issue.field === 'year'
      )
      expect(yearConsistencyIssue).toBeDefined()

      const unusualCountWarning = result.issues.find(issue => 
        issue.recordId === '5' && issue.field === 'transcriptCount' && issue.severity === 'low'
      )
      expect(unusualCountWarning).toBeDefined()
    })

    it('should detect duplicate records', async () => {
      // Arrange
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(duplicateTranscriptData)
      vi.spyOn(consistencyService as any, 'getClientData').mockResolvedValue([])

      // Act
      const result = await consistencyService.performConsistencyCheck()

      // Assert
      expect(result.isConsistent).toBe(false)
      expect(result.summary.duplicates).toBe(1)

      const duplicateIssue = result.issues.find(issue => 
        issue.type === 'duplicate' && issue.recordId === '7'
      )
      expect(duplicateIssue).toBeDefined()
      expect(duplicateIssue?.description).toContain('Client A')
      expect(duplicateIssue?.description).toContain('2024-01')
    })

    it('should detect data mismatches between server and client', async () => {
      // Arrange
      const serverData = [
        {
          id: '1',
          clientName: 'Client A',
          month: '2024-01',
          year: 2024,
          transcriptCount: 100,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T10:00:00Z'),
          notes: 'Server note'
        }
      ]

      const clientData = [
        {
          id: '1',
          clientName: 'Client A',
          month: '2024-01',
          year: 2024,
          transcriptCount: 150, // Mismatch
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T10:00:00Z'),
          notes: 'Client note' // Mismatch
        }
      ]

      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(serverData)
      vi.spyOn(consistencyService as any, 'getClientData').mockResolvedValue(clientData)

      // Act
      const result = await consistencyService.performConsistencyCheck()

      // Assert
      expect(result.isConsistent).toBe(false)
      expect(result.summary.mismatches).toBe(2) // transcriptCount and notes

      const countMismatch = result.issues.find(issue => 
        issue.type === 'mismatch' && issue.field === 'transcriptCount'
      )
      expect(countMismatch).toBeDefined()
      expect(countMismatch?.serverValue).toBe(100)
      expect(countMismatch?.clientValue).toBe(150)

      const notesMismatch = result.issues.find(issue => 
        issue.type === 'mismatch' && issue.field === 'notes'
      )
      expect(notesMismatch).toBeDefined()
      expect(notesMismatch?.serverValue).toBe('Server note')
      expect(notesMismatch?.clientValue).toBe('Client note')
    })

    it('should detect orphaned records', async () => {
      // Arrange
      const serverData = [
        { id: '1', clientName: 'Client A', month: '2024-01', year: 2024, transcriptCount: 100, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', clientName: 'Client B', month: '2024-02', year: 2024, transcriptCount: 150, createdAt: new Date(), updatedAt: new Date() }
      ]

      const clientData = [
        { id: '1', clientName: 'Client A', month: '2024-01', year: 2024, transcriptCount: 100, createdAt: new Date(), updatedAt: new Date() },
        { id: '3', clientName: 'Client C', month: '2024-03', year: 2024, transcriptCount: 200, createdAt: new Date(), updatedAt: new Date() }
      ]

      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(serverData)
      vi.spyOn(consistencyService as any, 'getClientData').mockResolvedValue(clientData)

      // Act
      const result = await consistencyService.performConsistencyCheck()

      // Assert
      expect(result.isConsistent).toBe(false)
      expect(result.summary.missing).toBe(1) // Record '2' missing from client
      expect(result.summary.orphaned).toBe(1) // Record '3' orphaned in client

      const missingIssue = result.issues.find(issue => 
        issue.type === 'missing' && issue.recordId === '2'
      )
      expect(missingIssue).toBeDefined()

      const orphanedIssue = result.issues.find(issue => 
        issue.type === 'orphaned' && issue.recordId === '3'
      )
      expect(orphanedIssue).toBeDefined()
    })

    it('should handle consistency check errors gracefully', async () => {
      // Arrange
      mockGoogleSheetsService.fetchTranscripts.mockRejectedValue(new Error('API Error'))

      // Act
      const result = await consistencyService.performConsistencyCheck()

      // Assert
      expect(result.isConsistent).toBe(false)
      expect(result.issues).toHaveLength(1)
      expect(result.issues[0].type).toBe('invalid')
      expect(result.issues[0].recordId).toBe('system')
      expect(result.issues[0].description).toContain('API Error')
    })
  })

  describe('Data Repair', () => {
    it('should repair duplicate records by removing duplicates', async () => {
      // Arrange
      const issues = [
        {
          type: 'duplicate' as const,
          severity: 'high' as const,
          recordId: '7',
          description: 'Duplicate record found',
          suggestedFix: 'Remove duplicate record'
        }
      ]

      vi.spyOn(consistencyService as any, 'getRowIndexForRecord').mockReturnValue(2)
      mockGoogleSheetsService.deleteTranscript.mockResolvedValue(undefined)

      // Act
      const result = await consistencyService.repairConsistencyIssues(issues, 'auto')

      // Assert
      expect(result.success).toBe(true)
      expect(result.repairedIssues).toBe(1)
      expect(result.failedRepairs).toBe(0)
      expect(mockGoogleSheetsService.deleteTranscript).toHaveBeenCalledWith(2)
    })

    it('should repair data mismatches using server values', async () => {
      // Arrange
      const issues = [
        {
          type: 'mismatch' as const,
          severity: 'high' as const,
          recordId: '1',
          field: 'transcriptCount',
          description: 'Data mismatch in field transcriptCount',
          serverValue: 100,
          clientValue: 150,
          suggestedFix: 'Choose server value'
        }
      ]

      vi.spyOn(consistencyService as any, 'getRowIndexForRecord').mockReturnValue(1)
      mockGoogleSheetsService.updateTranscript.mockResolvedValue(undefined)

      // Act
      const result = await consistencyService.repairConsistencyIssues(issues, 'auto')

      // Assert
      expect(result.success).toBe(true)
      expect(result.repairedIssues).toBe(1)
      expect(mockGoogleSheetsService.updateTranscript).toHaveBeenCalledWith(1, {
        transcriptCount: 100
      })
    })

    it('should handle repair failures gracefully', async () => {
      // Arrange
      const issues = [
        {
          type: 'duplicate' as const,
          severity: 'high' as const,
          recordId: '7',
          description: 'Duplicate record found'
        }
      ]

      vi.spyOn(consistencyService as any, 'getRowIndexForRecord').mockReturnValue(2)
      mockGoogleSheetsService.deleteTranscript.mockRejectedValue(new Error('Delete failed'))

      // Act
      const result = await consistencyService.repairConsistencyIssues(issues, 'auto')

      // Assert
      expect(result.success).toBe(false)
      expect(result.repairedIssues).toBe(0)
      expect(result.failedRepairs).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Delete failed')
    })

    it('should not auto-repair when strategy is manual', async () => {
      // Arrange
      const issues = [
        {
          type: 'duplicate' as const,
          severity: 'high' as const,
          recordId: '7',
          description: 'Duplicate record found'
        }
      ]

      // Act
      const result = await consistencyService.repairConsistencyIssues(issues, 'manual')

      // Assert
      expect(result.repairedIssues).toBe(0)
      expect(result.failedRepairs).toBe(1)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('Could not auto-repair')
      expect(mockGoogleSheetsService.deleteTranscript).not.toHaveBeenCalled()
    })

    it('should handle mixed repair results', async () => {
      // Arrange
      const issues = [
        {
          type: 'duplicate' as const,
          severity: 'high' as const,
          recordId: '7',
          description: 'Duplicate record found'
        },
        {
          type: 'mismatch' as const,
          severity: 'high' as const,
          recordId: '1',
          field: 'transcriptCount',
          description: 'Data mismatch',
          serverValue: 100,
          clientValue: 150
        },
        {
          type: 'invalid' as const,
          severity: 'critical' as const,
          recordId: '3',
          field: 'clientName',
          description: 'Invalid client name'
        }
      ]

      vi.spyOn(consistencyService as any, 'getRowIndexForRecord')
        .mockReturnValueOnce(2) // For duplicate
        .mockReturnValueOnce(1) // For mismatch

      mockGoogleSheetsService.deleteTranscript.mockResolvedValue(undefined)
      mockGoogleSheetsService.updateTranscript.mockResolvedValue(undefined)

      // Act
      const result = await consistencyService.repairConsistencyIssues(issues, 'auto')

      // Assert
      expect(result.success).toBe(true)
      expect(result.repairedIssues).toBe(2) // duplicate and mismatch
      expect(result.failedRepairs).toBe(1) // invalid (can't auto-repair)
      expect(result.warnings).toHaveLength(1)
      expect(mockGoogleSheetsService.deleteTranscript).toHaveBeenCalledWith(2)
      expect(mockGoogleSheetsService.updateTranscript).toHaveBeenCalledWith(1, {
        transcriptCount: 100
      })
    })
  })

  describe('Custom Validation Rules', () => {
    it('should allow adding custom validation rules', async () => {
      // Arrange
      const customRule = {
        name: 'customClientNameLength',
        field: 'clientName',
        validator: (value: any) => typeof value === 'string' && value.length >= 5,
        message: 'Client name must be at least 5 characters long',
        severity: 'medium' as const
      }

      consistencyService.addValidationRule(customRule)

      const testData = [
        {
          id: '1',
          clientName: 'ABC', // Too short for custom rule
          month: '2024-01',
          year: 2024,
          transcriptCount: 100,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(testData)
      vi.spyOn(consistencyService as any, 'getClientData').mockResolvedValue([])

      // Act
      const result = await consistencyService.performConsistencyCheck()

      // Assert
      expect(result.isConsistent).toBe(false)
      const customRuleIssue = result.issues.find(issue => 
        issue.description.includes('Client name must be at least 5 characters long')
      )
      expect(customRuleIssue).toBeDefined()
      expect(customRuleIssue?.severity).toBe('medium')
    })

    it('should allow removing validation rules', async () => {
      // Arrange
      const testData = [
        {
          id: '1',
          clientName: '', // This should trigger clientNameRequired rule
          month: '2024-01',
          year: 2024,
          transcriptCount: 100,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(testData)
      vi.spyOn(consistencyService as any, 'getClientData').mockResolvedValue([])

      // First check - should find the issue
      let result = await consistencyService.performConsistencyCheck()
      expect(result.issues.some(issue => issue.field === 'clientName')).toBe(true)

      // Remove the rule
      consistencyService.removeValidationRule('clientNameRequired')

      // Act - Second check after removing rule
      result = await consistencyService.performConsistencyCheck()

      // Assert - Should not find the client name issue anymore
      expect(result.issues.some(issue => issue.field === 'clientName')).toBe(false)
    })

    it('should handle validation rule execution errors', async () => {
      // Arrange
      const faultyRule = {
        name: 'faultyRule',
        field: 'clientName',
        validator: () => { throw new Error('Validation error') },
        message: 'This rule will fail',
        severity: 'low' as const
      }

      consistencyService.addValidationRule(faultyRule)

      const testData = [
        {
          id: '1',
          clientName: 'Test Client',
          month: '2024-01',
          year: 2024,
          transcriptCount: 100,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(testData)
      vi.spyOn(consistencyService as any, 'getClientData').mockResolvedValue([])

      // Act
      const result = await consistencyService.performConsistencyCheck()

      // Assert
      const errorIssue = result.issues.find(issue => 
        issue.description.includes('Validation rule \'faultyRule\' failed to execute')
      )
      expect(errorIssue).toBeDefined()
      expect(errorIssue?.severity).toBe('medium')
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', async () => {
      // Arrange
      const largeDataset: TranscriptData[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        clientName: `Client ${i + 1}`,
        month: '2024-01',
        year: 2024,
        transcriptCount: Math.floor(Math.random() * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      }))

      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(largeDataset)
      vi.spyOn(consistencyService as any, 'getClientData').mockResolvedValue(largeDataset)

      const startTime = Date.now()

      // Act
      const result = await consistencyService.performConsistencyCheck()

      const endTime = Date.now()
      const duration = endTime - startTime

      // Assert
      expect(result.totalRecords).toBe(1000)
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
    })

    it('should handle empty datasets', async () => {
      // Arrange
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue([])
      vi.spyOn(consistencyService as any, 'getClientData').mockResolvedValue([])

      // Act
      const result = await consistencyService.performConsistencyCheck()

      // Assert
      expect(result.isConsistent).toBe(true)
      expect(result.totalRecords).toBe(0)
      expect(result.issues).toHaveLength(0)
    })

    it('should handle null and undefined values gracefully', async () => {
      // Arrange
      const problematicData = [
        {
          id: '1',
          clientName: null as any,
          month: undefined as any,
          year: 2024,
          transcriptCount: 100,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(problematicData)
      vi.spyOn(consistencyService as any, 'getClientData').mockResolvedValue([])

      // Act
      const result = await consistencyService.performConsistencyCheck()

      // Assert
      expect(result.isConsistent).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
      // Should not throw errors despite null/undefined values
    })
  })
})