import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { Pool } from 'pg'
import { TranscriptService } from '../transcripts'
import { TranscriptCreate, TranscriptUpdate } from '@/lib/validations/schemas'

// Mock the database connection
jest.mock('../connection', () => ({
  getDatabasePool: jest.fn(() => mockPool)
}))

const mockPool = {
  query: jest.fn(),
  connect: jest.fn()
} as unknown as Pool

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
}

describe('TranscriptService', () => {
  let transcriptService: TranscriptService

  beforeEach(() => {
    transcriptService = new TranscriptService()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('createClient', () => {
    it('should create a new client', async () => {
      const mockClientData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Acme Corp',
        created_at: new Date(),
        updated_at: new Date()
      }

      ;(mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockClientData]
      })

      const result = await transcriptService.createClient('Acme Corp')

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO clients'),
        ['Acme Corp']
      )
      expect(result).toEqual({
        id: mockClientData.id,
        name: mockClientData.name,
        createdAt: mockClientData.created_at,
        updatedAt: mockClientData.updated_at
      })
    })
  })

  describe('getClients', () => {
    it('should return all clients', async () => {
      const mockClients = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Acme Corp',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Beta Inc',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]

      ;(mockPool.query as jest.Mock).mockResolvedValue({
        rows: mockClients
      })

      const result = await transcriptService.getClients()

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, created_at, updated_at FROM clients')
      )
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Acme Corp')
    })
  })

  describe('getClientById', () => {
    it('should return client by ID', async () => {
      const mockClient = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Acme Corp',
        created_at: new Date(),
        updated_at: new Date()
      }

      ;(mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockClient]
      })

      const result = await transcriptService.getClientById('123e4567-e89b-12d3-a456-426614174000')

      expect(result).toEqual({
        id: mockClient.id,
        name: mockClient.name,
        createdAt: mockClient.created_at,
        updatedAt: mockClient.updated_at
      })
    })

    it('should return null when client not found', async () => {
      ;(mockPool.query as jest.Mock).mockResolvedValue({
        rows: []
      })

      const result = await transcriptService.getClientById('nonexistent-id')

      expect(result).toBeNull()
    })
  })

  describe('createTranscript', () => {
    it('should create a new transcript with existing client', async () => {
      const transcriptData: TranscriptCreate = {
        clientId: '',
        clientName: 'Acme Corp',
        date: new Date('2024-01-15'),
        transcriptCount: 25,
        transcriptType: 'Medical',
        notes: 'Regular batch',
        createdBy: '123e4567-e89b-12d3-a456-426614174002'
      }

      const mockClient = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Acme Corp',
        created_at: new Date(),
        updated_at: new Date()
      }

      const mockTranscript = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        client_id: mockClient.id,
        date: transcriptData.date,
        transcript_count: transcriptData.transcriptCount,
        transcript_type: transcriptData.transcriptType,
        notes: transcriptData.notes,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: transcriptData.createdBy
      }

      ;(mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockClient] }) // getClientByName
        .mockResolvedValueOnce({ rows: [mockTranscript] }) // createTranscript

      const result = await transcriptService.createTranscript(transcriptData)

      expect(result).toEqual({
        id: mockTranscript.id,
        clientId: mockTranscript.client_id,
        clientName: mockClient.name,
        date: mockTranscript.date,
        transcriptCount: mockTranscript.transcript_count,
        transcriptType: mockTranscript.transcript_type,
        notes: mockTranscript.notes,
        createdAt: mockTranscript.created_at,
        updatedAt: mockTranscript.updated_at,
        createdBy: mockTranscript.created_by
      })
    })

    it('should create client if it does not exist', async () => {
      const transcriptData: TranscriptCreate = {
        clientId: '',
        clientName: 'New Corp',
        date: new Date('2024-01-15'),
        transcriptCount: 25,
        createdBy: '123e4567-e89b-12d3-a456-426614174002'
      }

      const mockClient = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'New Corp',
        created_at: new Date(),
        updated_at: new Date()
      }

      const mockTranscript = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        client_id: mockClient.id,
        date: transcriptData.date,
        transcript_count: transcriptData.transcriptCount,
        transcript_type: null,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: transcriptData.createdBy
      }

      ;(mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // getClientByName (not found)
        .mockResolvedValueOnce({ rows: [mockClient] }) // createClient
        .mockResolvedValueOnce({ rows: [mockTranscript] }) // createTranscript

      const result = await transcriptService.createTranscript(transcriptData)

      expect(result.clientName).toBe('New Corp')
      expect(result.transcriptCount).toBe(25)
    })
  })

  describe('getTranscripts', () => {
    it('should return paginated transcripts', async () => {
      const mockTranscripts = [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          client_id: '123e4567-e89b-12d3-a456-426614174000',
          client_name: 'Acme Corp',
          date: new Date('2024-01-15'),
          transcript_count: 25,
          transcript_type: 'Medical',
          notes: 'Regular batch',
          created_at: new Date(),
          updated_at: new Date(),
          created_by: '123e4567-e89b-12d3-a456-426614174002'
        }
      ]

      ;(mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // count query
        .mockResolvedValueOnce({ rows: mockTranscripts }) // data query

      const result = await transcriptService.getTranscripts({ page: 1, limit: 50 })

      expect(result.data).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(50)
      expect(result.pagination.totalPages).toBe(1)
    })

    it('should filter by client ID', async () => {
      const clientId = '123e4567-e89b-12d3-a456-426614174000'

      ;(mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] })

      await transcriptService.getTranscripts({ clientId, page: 1, limit: 50 })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.client_id = $1'),
        expect.arrayContaining([clientId])
      )
    })
  })

  describe('updateTranscript', () => {
    it('should update transcript fields', async () => {
      const transcriptId = '123e4567-e89b-12d3-a456-426614174003'
      const updateData: TranscriptUpdate = {
        transcriptCount: 30,
        notes: 'Updated notes'
      }

      const existingTranscript = {
        id: transcriptId,
        client_id: '123e4567-e89b-12d3-a456-426614174000',
        client_name: 'Acme Corp',
        date: new Date('2024-01-15'),
        transcript_count: 25,
        transcript_type: 'Medical',
        notes: 'Original notes',
        created_at: new Date(),
        updated_at: new Date(),
        created_by: '123e4567-e89b-12d3-a456-426614174002'
      }

      const updatedTranscript = {
        ...existingTranscript,
        transcript_count: 30,
        notes: 'Updated notes',
        updated_at: new Date()
      }

      const mockClient = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Acme Corp',
        created_at: new Date(),
        updated_at: new Date()
      }

      ;(mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [existingTranscript] }) // getTranscriptById
        .mockResolvedValueOnce({ rows: [updatedTranscript] }) // update query
        .mockResolvedValueOnce({ rows: [mockClient] }) // getClientById

      const result = await transcriptService.updateTranscript(transcriptId, updateData)

      expect(result?.transcriptCount).toBe(30)
      expect(result?.notes).toBe('Updated notes')
    })

    it('should return null when transcript not found', async () => {
      ;(mockPool.query as jest.Mock).mockResolvedValue({ rows: [] })

      const result = await transcriptService.updateTranscript('nonexistent-id', {})

      expect(result).toBeNull()
    })
  })

  describe('deleteTranscript', () => {
    it('should delete transcript and return true', async () => {
      ;(mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 })

      const result = await transcriptService.deleteTranscript('123e4567-e89b-12d3-a456-426614174003')

      expect(result).toBe(true)
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM transcripts WHERE id = $1',
        ['123e4567-e89b-12d3-a456-426614174003']
      )
    })

    it('should return false when transcript not found', async () => {
      ;(mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 })

      const result = await transcriptService.deleteTranscript('nonexistent-id')

      expect(result).toBe(false)
    })
  })

  describe('bulkCreateTranscripts', () => {
    it('should handle bulk insert with mixed results', async () => {
      const transcripts: TranscriptCreate[] = [
        {
          clientId: '',
          clientName: 'Acme Corp',
          date: new Date('2024-01-15'),
          transcriptCount: 25,
          createdBy: '123e4567-e89b-12d3-a456-426614174002'
        },
        {
          clientId: '',
          clientName: 'Beta Inc',
          date: new Date('2024-01-16'),
          transcriptCount: 15,
          createdBy: '123e4567-e89b-12d3-a456-426614174002'
        }
      ]

      const mockClient = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Acme Corp',
        created_at: new Date(),
        updated_at: new Date()
      }

      ;(mockPool.connect as jest.Mock).mockResolvedValue(mockClient)
      ;(mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockClient] }) // getClientByName for first transcript
        .mockResolvedValueOnce({ rows: [] }) // check existing (not found)
        .mockResolvedValueOnce(undefined) // insert first transcript
        .mockResolvedValueOnce({ rows: [mockClient] }) // getClientByName for second transcript
        .mockResolvedValueOnce({ rows: [] }) // check existing (not found)
        .mockResolvedValueOnce(undefined) // insert second transcript
        .mockResolvedValueOnce(undefined) // COMMIT

      // Mock the service methods
      const getClientByNameSpy = jest.spyOn(transcriptService, 'getClientByName')
        .mockResolvedValue(mockClient)
      const createClientSpy = jest.spyOn(transcriptService, 'createClient')
        .mockResolvedValue(mockClient)

      const result = await transcriptService.bulkCreateTranscripts(transcripts)

      expect(result.totalRows).toBe(2)
      expect(result.successCount).toBe(2)
      expect(result.errorCount).toBe(0)
      expect(result.duplicateCount).toBe(0)

      getClientByNameSpy.mockRestore()
      createClientSpy.mockRestore()
    })
  })

  describe('getTranscriptSummary', () => {
    it('should return summary statistics', async () => {
      const mockSummary = {
        total_transcripts: '150',
        total_clients: '5',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31'),
        avg_per_day: '4.84'
      }

      ;(mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockSummary]
      })

      const result = await transcriptService.getTranscriptSummary()

      expect(result.totalTranscripts).toBe(150)
      expect(result.totalClients).toBe(5)
      expect(result.averageTranscriptsPerDay).toBeCloseTo(4.84)
      expect(result.dateRange.start).toEqual(mockSummary.start_date)
      expect(result.dateRange.end).toEqual(mockSummary.end_date)
    })
  })
})