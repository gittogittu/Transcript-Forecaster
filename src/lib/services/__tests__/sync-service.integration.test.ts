import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { SyncService, getSyncService } from '../sync-service'
import { getGoogleSheetsService } from '../google-sheets'
import { TranscriptData } from '@/types/transcript'

// Mock the Google Sheets service
vi.mock('../google-sheets', () => ({
  getGoogleSheetsService: vi.fn()
}))

const mockGoogleSheetsService = {
  testConnection: vi.fn(),
  fetchTranscripts: vi.fn(),
  addTranscript: vi.fn(),
  updateTranscript: vi.fn(),
  deleteTranscript: vi.fn()
}

const mockTranscriptData: TranscriptData[] = [
  {
    id: '1',
    clientName: 'Client A',
    month: '2024-01',
    year: 2024,
    transcriptCount: 100,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    notes: 'Test note'
  },
  {
    id: '2',
    clientName: 'Client B',
    month: '2024-01',
    year: 2024,
    transcriptCount: 150,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  }
]

describe('SyncService Integration Tests', () => {
  let syncService: SyncService

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getGoogleSheetsService as Mock).mockReturnValue(mockGoogleSheetsService)
    syncService = getSyncService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Background Sync', () => {
    it('should perform successful pull sync from server', async () => {
      // Arrange
      mockGoogleSheetsService.testConnection.mockResolvedValue(true)
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(mockTranscriptData)

      // Act
      const result = await syncService.backgroundSync({
        direction: 'pull',
        validateData: true
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.recordsProcessed).toBe(2)
      expect(result.errors).toHaveLength(0)
      expect(mockGoogleSheetsService.testConnection).toHaveBeenCalled()
      expect(mockGoogleSheetsService.fetchTranscripts).toHaveBeenCalled()
    })

    it('should handle connection failure gracefully', async () => {
      // Arrange
      mockGoogleSheetsService.testConnection.mockResolvedValue(false)

      // Act
      const result = await syncService.backgroundSync()

      // Assert
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Failed to connect to Google Sheets')
      expect(mockGoogleSheetsService.fetchTranscripts).not.toHaveBeenCalled()
    })

    it('should handle sync errors and return error details', async () => {
      // Arrange
      mockGoogleSheetsService.testConnection.mockResolvedValue(true)
      mockGoogleSheetsService.fetchTranscripts.mockRejectedValue(new Error('API Error'))

      // Act
      const result = await syncService.backgroundSync()

      // Assert
      expect(result.success).toBe(false)
      expect(result.errors).toContain('API Error')
    })

    it('should prevent concurrent sync operations', async () => {
      // Arrange
      mockGoogleSheetsService.testConnection.mockResolvedValue(true)
      mockGoogleSheetsService.fetchTranscripts.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockTranscriptData), 100))
      )

      // Act
      const sync1Promise = syncService.backgroundSync()
      const sync2Promise = syncService.backgroundSync()

      // Assert
      await expect(sync2Promise).rejects.toThrow('Sync already in progress')
      const result1 = await sync1Promise
      expect(result1.success).toBe(true)
    })
  })

  describe('Data Validation', () => {
    it('should validate data during sync when enabled', async () => {
      // Arrange
      const invalidData: TranscriptData[] = [
        {
          id: '1',
          clientName: '', // Invalid: empty client name
          month: '2024-01',
          year: 2024,
          transcriptCount: 100,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockGoogleSheetsService.testConnection.mockResolvedValue(true)
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(invalidData)

      // Act
      const result = await syncService.backgroundSync({
        direction: 'pull',
        validateData: true
      })

      // Assert
      expect(result.recordsSkipped).toBe(1)
      expect(result.warnings).toContain(expect.stringContaining('Validation failed'))
    })

    it('should skip validation when disabled', async () => {
      // Arrange
      const invalidData: TranscriptData[] = [
        {
          id: '1',
          clientName: '', // Invalid but should be processed
          month: '2024-01',
          year: 2024,
          transcriptCount: 100,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockGoogleSheetsService.testConnection.mockResolvedValue(true)
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(invalidData)

      // Act
      const result = await syncService.backgroundSync({
        direction: 'pull',
        validateData: false
      })

      // Assert
      expect(result.recordsSkipped).toBe(0)
      expect(result.recordsUpdated).toBe(1)
    })
  })

  describe('Conflict Resolution', () => {
    it('should detect and resolve conflicts with server strategy', async () => {
      // Arrange
      const serverData: TranscriptData[] = [
        {
          id: '1',
          clientName: 'Client A',
          month: '2024-01',
          year: 2024,
          transcriptCount: 100, // Server value
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02')
        }
      ]

      const clientData: TranscriptData[] = [
        {
          id: '1',
          clientName: 'Client A',
          month: '2024-01',
          year: 2024,
          transcriptCount: 150, // Client value (different)
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ]

      mockGoogleSheetsService.testConnection.mockResolvedValue(true)
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(serverData)
      
      // Mock the getClientData method to return client data
      vi.spyOn(syncService as any, 'getClientData').mockResolvedValue(clientData)
      vi.spyOn(syncService as any, 'getRowIndex').mockReturnValue(0)

      // Act
      const result = await syncService.backgroundSync({
        direction: 'bidirectional',
        conflictResolution: 'server'
      })

      // Assert
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].resolution).toBe('server')
      expect(result.conflicts[0].resolvedValue).toBe(100)
      expect(mockGoogleSheetsService.updateTranscript).toHaveBeenCalled()
    })

    it('should resolve conflicts with client strategy', async () => {
      // Arrange
      const serverData: TranscriptData[] = [
        {
          id: '1',
          clientName: 'Client A',
          month: '2024-01',
          year: 2024,
          transcriptCount: 100,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02')
        }
      ]

      const clientData: TranscriptData[] = [
        {
          id: '1',
          clientName: 'Client A',
          month: '2024-01',
          year: 2024,
          transcriptCount: 150,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ]

      mockGoogleSheetsService.testConnection.mockResolvedValue(true)
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(serverData)
      
      vi.spyOn(syncService as any, 'getClientData').mockResolvedValue(clientData)
      vi.spyOn(syncService as any, 'getRowIndex').mockReturnValue(0)

      // Act
      const result = await syncService.backgroundSync({
        direction: 'bidirectional',
        conflictResolution: 'client'
      })

      // Assert
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].resolution).toBe('client')
      expect(result.conflicts[0].resolvedValue).toBe(150)
    })

    it('should merge conflicts when using merge strategy', async () => {
      // Arrange
      const serverData: TranscriptData[] = [
        {
          id: '1',
          clientName: 'Client A',
          month: '2024-01',
          year: 2024,
          transcriptCount: 100,
          notes: 'Server note',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02')
        }
      ]

      const clientData: TranscriptData[] = [
        {
          id: '1',
          clientName: 'Client A',
          month: '2024-01',
          year: 2024,
          transcriptCount: 150,
          notes: 'Client note',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ]

      mockGoogleSheetsService.testConnection.mockResolvedValue(true)
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(serverData)
      
      vi.spyOn(syncService as any, 'getClientData').mockResolvedValue(clientData)
      vi.spyOn(syncService as any, 'getRowIndex').mockReturnValue(0)

      // Act
      const result = await syncService.backgroundSync({
        direction: 'bidirectional',
        conflictResolution: 'merge'
      })

      // Assert
      expect(result.conflicts).toHaveLength(2) // transcriptCount and notes
      expect(result.conflicts.find(c => c.field === 'transcriptCount')?.resolvedValue).toBe(150) // Max value
      expect(result.conflicts.find(c => c.field === 'notes')?.resolvedValue).toBe('Server note | Client note') // Merged
    })
  })

  describe('Data Consistency Validation', () => {
    it('should validate data consistency and identify issues', async () => {
      // Arrange
      const serverData: TranscriptData[] = [
        {
          id: '1',
          clientName: 'Client A',
          month: '2024-01',
          year: 2024,
          transcriptCount: 100,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: '2',
          clientName: 'Client A', // Duplicate client-month combination
          month: '2024-01',
          year: 2024,
          transcriptCount: 50,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ]

      const clientData: TranscriptData[] = [
        {
          id: '1',
          clientName: 'Client A',
          month: '2024-01',
          year: 2024,
          transcriptCount: 150, // Mismatch
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
        // Missing record id: '2'
      ]

      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(serverData)
      vi.spyOn(syncService as any, 'getClientData').mockResolvedValue(clientData)

      // Act
      const report = await syncService.validateDataConsistency()

      // Assert
      expect(report.isConsistent).toBe(false)
      expect(report.totalRecords).toBe(2)
      expect(report.inconsistentRecords).toHaveLength(1) // Mismatch for id '1'
      expect(report.orphanedRecords).toHaveLength(1) // Missing id '2' in client
      expect(report.duplicates).toHaveLength(1) // Duplicate Client A - 2024-01
    })

    it('should repair data inconsistencies', async () => {
      // Arrange
      const report = {
        isConsistent: false,
        totalRecords: 2,
        inconsistentRecords: [
          {
            id: '1',
            issues: ['Transcript count mismatch'],
            serverData: { transcriptCount: 100 },
            clientData: { transcriptCount: 150 }
          }
        ],
        duplicates: [
          {
            ids: ['2', '3'],
            duplicateField: 'clientName-month',
            value: { clientName: 'Client A', month: '2024-01' }
          }
        ],
        orphanedRecords: [],
        validationErrors: []
      }

      vi.spyOn(syncService as any, 'getRowIndexForRecord').mockReturnValue(1)
      mockGoogleSheetsService.deleteTranscript.mockResolvedValue(undefined)
      mockGoogleSheetsService.updateTranscript.mockResolvedValue(undefined)

      // Act
      const repairResult = await syncService.repairDataInconsistencies(report)

      // Assert
      expect(repairResult.success).toBe(true)
      expect(repairResult.repairedRecords).toBe(2) // 1 mismatch + 1 duplicate removal
      expect(mockGoogleSheetsService.deleteTranscript).toHaveBeenCalledWith(1) // Remove duplicate
    })
  })

  describe('Sync Queue Management', () => {
    it('should queue sync operations when sync is in progress', async () => {
      // Arrange
      mockGoogleSheetsService.testConnection.mockResolvedValue(true)
      mockGoogleSheetsService.fetchTranscripts.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockTranscriptData), 100))
      )

      let queuedOperationExecuted = false
      const queuedOperation = vi.fn().mockImplementation(async () => {
        queuedOperationExecuted = true
      })

      // Act
      const syncPromise = syncService.backgroundSync()
      syncService.queueSync(queuedOperation)

      await syncPromise

      // Wait for queued operation to execute
      await new Promise(resolve => setTimeout(resolve, 150))

      // Assert
      expect(queuedOperationExecuted).toBe(true)
      expect(queuedOperation).toHaveBeenCalled()
    })

    it('should provide sync status information', () => {
      // Act
      const status = syncService.getSyncStatus()

      // Assert
      expect(status).toHaveProperty('inProgress')
      expect(status).toHaveProperty('lastSyncTime')
      expect(status).toHaveProperty('queueLength')
      expect(typeof status.inProgress).toBe('boolean')
      expect(typeof status.queueLength).toBe('number')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange
      mockGoogleSheetsService.testConnection.mockRejectedValue(new Error('Network error'))

      // Act
      const result = await syncService.backgroundSync()

      // Assert
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Network error')
    })

    it('should handle partial sync failures', async () => {
      // Arrange
      mockGoogleSheetsService.testConnection.mockResolvedValue(true)
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(mockTranscriptData)
      
      // Mock updateClientRecord to fail for second record
      vi.spyOn(syncService as any, 'updateClientRecord')
        .mockResolvedValueOnce(undefined) // First record succeeds
        .mockRejectedValueOnce(new Error('Update failed')) // Second record fails

      // Act
      const result = await syncService.backgroundSync({
        direction: 'pull'
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.recordsUpdated).toBe(1)
      expect(result.recordsSkipped).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Update failed')
    })
  })

  describe('Performance', () => {
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

      mockGoogleSheetsService.testConnection.mockResolvedValue(true)
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(largeDataset)

      const startTime = Date.now()

      // Act
      const result = await syncService.backgroundSync({
        direction: 'pull'
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      // Assert
      expect(result.success).toBe(true)
      expect(result.recordsProcessed).toBe(1000)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})