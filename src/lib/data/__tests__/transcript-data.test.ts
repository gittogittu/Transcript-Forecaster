import {
  fetchAllTranscripts,
  fetchFilteredTranscripts,
  fetchClientTranscripts,
  fetchTranscriptsByDateRange,
  addTranscriptData,
  updateTranscriptData,
  deleteTranscriptData,
  syncTranscriptData,
  testSheetsConnection,
  getTranscriptSummary,
} from '../transcript-data'
import { getGoogleSheetsService } from '@/lib/services/google-sheets'
import { TranscriptData } from '@/types/transcript'

// Mock the Google Sheets service
jest.mock('@/lib/services/google-sheets')
const mockGetGoogleSheetsService = getGoogleSheetsService as jest.MockedFunction<typeof getGoogleSheetsService>

// Create a mock service instance
const mockGoogleSheetsService = {
  fetchTranscripts: jest.fn(),
  addTranscript: jest.fn(),
  updateTranscript: jest.fn(),
  deleteTranscript: jest.fn(),
  syncWithSheets: jest.fn(),
  testConnection: jest.fn(),
} as any

mockGetGoogleSheetsService.mockReturnValue(mockGoogleSheetsService)

describe('Transcript Data Functions', () => {
  const mockTranscriptData: TranscriptData[] = [
    {
      id: 'row_0',
      clientName: 'Client A',
      month: '2024-01',
      year: 2024,
      transcriptCount: 10,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'row_1',
      clientName: 'Client B',
      month: '2024-02',
      year: 2024,
      transcriptCount: 15,
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
    },
    {
      id: 'row_2',
      clientName: 'Client A',
      month: '2024-03',
      year: 2024,
      transcriptCount: 20,
      createdAt: new Date('2024-03-01'),
      updatedAt: new Date('2024-03-01'),
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchAllTranscripts', () => {
    it('should return transcript data successfully', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(mockTranscriptData)

      const result = await fetchAllTranscripts()

      expect(result).toEqual({
        data: mockTranscriptData,
        error: null,
        loading: false,
      })
      expect(mockGoogleSheetsService.fetchTranscripts).toHaveBeenCalledTimes(1)
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Fetch failed')
      mockGoogleSheetsService.fetchTranscripts.mockRejectedValue(error)

      const result = await fetchAllTranscripts()

      expect(result).toEqual({
        data: null,
        error: 'Fetch failed',
        loading: false,
      })
    })

    it('should handle non-Error objects', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockRejectedValue('String error')

      const result = await fetchAllTranscripts()

      expect(result).toEqual({
        data: null,
        error: 'Failed to fetch transcript data',
        loading: false,
      })
    })
  })

  describe('fetchFilteredTranscripts', () => {
    beforeEach(() => {
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(mockTranscriptData)
    })

    it('should filter by client name', async () => {
      const result = await fetchFilteredTranscripts({ clientName: 'Client A' })

      expect(result.data).toHaveLength(2)
      expect(result.data?.every(t => t.clientName === 'Client A')).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should filter by date range', async () => {
      const result = await fetchFilteredTranscripts({
        startMonth: '2024-02',
        endMonth: '2024-02',
      })

      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].month).toBe('2024-02')
    })

    it('should filter by transcript count range', async () => {
      const result = await fetchFilteredTranscripts({
        minCount: 15,
        maxCount: 20,
      })

      expect(result.data).toHaveLength(2)
      expect(result.data?.every(t => t.transcriptCount >= 15 && t.transcriptCount <= 20)).toBe(true)
    })

    it('should apply multiple filters', async () => {
      const result = await fetchFilteredTranscripts({
        clientName: 'Client A',
        minCount: 15,
      })

      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].clientName).toBe('Client A')
      expect(result.data?.[0].transcriptCount).toBe(20)
    })

    it('should handle case-insensitive client name filtering', async () => {
      const result = await fetchFilteredTranscripts({ clientName: 'client a' })

      expect(result.data).toHaveLength(2)
      expect(result.data?.every(t => t.clientName === 'Client A')).toBe(true)
    })
  })

  describe('fetchClientTranscripts', () => {
    it('should fetch transcripts for specific client', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(mockTranscriptData)

      const result = await fetchClientTranscripts('Client B')

      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].clientName).toBe('Client B')
    })
  })

  describe('fetchTranscriptsByDateRange', () => {
    it('should fetch transcripts within date range', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(mockTranscriptData)

      const result = await fetchTranscriptsByDateRange('2024-01', '2024-02')

      expect(result.data).toHaveLength(2)
      expect(result.data?.every(t => t.month >= '2024-01' && t.month <= '2024-02')).toBe(true)
    })
  })

  describe('addTranscriptData', () => {
    const validTranscriptData = {
      clientName: 'New Client',
      month: '2024-04',
      year: 2024,
      transcriptCount: 25,
    }

    it('should add transcript data successfully', async () => {
      mockGoogleSheetsService.addTranscript.mockResolvedValue()

      const result = await addTranscriptData(validTranscriptData)

      expect(result).toEqual({
        data: null,
        error: null,
        loading: false,
      })
      expect(mockGoogleSheetsService.addTranscript).toHaveBeenCalledWith(validTranscriptData)
    })

    it('should validate client name', async () => {
      const invalidData = { ...validTranscriptData, clientName: '   ' }

      const result = await addTranscriptData(invalidData)

      expect(result.error).toBe('Client name is required')
      expect(mockGoogleSheetsService.addTranscript).not.toHaveBeenCalled()
    })

    it('should validate month format', async () => {
      const invalidData = { ...validTranscriptData, month: '2024-1' }

      const result = await addTranscriptData(invalidData)

      expect(result.error).toBe('Month must be in YYYY-MM format')
      expect(mockGoogleSheetsService.addTranscript).not.toHaveBeenCalled()
    })

    it('should validate transcript count', async () => {
      const invalidData = { ...validTranscriptData, transcriptCount: -5 }

      const result = await addTranscriptData(invalidData)

      expect(result.error).toBe('Transcript count must be non-negative')
      expect(mockGoogleSheetsService.addTranscript).not.toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      const error = new Error('Service error')
      mockGoogleSheetsService.addTranscript.mockRejectedValue(error)

      const result = await addTranscriptData(validTranscriptData)

      expect(result.error).toBe('Service error')
    })
  })

  describe('updateTranscriptData', () => {
    it('should update transcript data successfully', async () => {
      mockGoogleSheetsService.updateTranscript.mockResolvedValue()

      const updateData = { transcriptCount: 30 }
      const result = await updateTranscriptData(0, updateData)

      expect(result).toEqual({
        data: null,
        error: null,
        loading: false,
      })
      expect(mockGoogleSheetsService.updateTranscript).toHaveBeenCalledWith(0, updateData)
    })

    it('should validate client name when updating', async () => {
      const updateData = { clientName: '   ' }
      const result = await updateTranscriptData(0, updateData)

      expect(result.error).toBe('Client name cannot be empty')
      expect(mockGoogleSheetsService.updateTranscript).not.toHaveBeenCalled()
    })

    it('should validate month format when updating', async () => {
      const updateData = { month: 'invalid-month' }
      const result = await updateTranscriptData(0, updateData)

      expect(result.error).toBe('Month must be in YYYY-MM format')
      expect(mockGoogleSheetsService.updateTranscript).not.toHaveBeenCalled()
    })

    it('should validate transcript count when updating', async () => {
      const updateData = { transcriptCount: -10 }
      const result = await updateTranscriptData(0, updateData)

      expect(result.error).toBe('Transcript count must be non-negative')
      expect(mockGoogleSheetsService.updateTranscript).not.toHaveBeenCalled()
    })
  })

  describe('deleteTranscriptData', () => {
    it('should delete transcript data successfully', async () => {
      mockGoogleSheetsService.deleteTranscript.mockResolvedValue()

      const result = await deleteTranscriptData(0)

      expect(result).toEqual({
        data: null,
        error: null,
        loading: false,
      })
      expect(mockGoogleSheetsService.deleteTranscript).toHaveBeenCalledWith(0)
    })

    it('should handle service errors', async () => {
      const error = new Error('Delete failed')
      mockGoogleSheetsService.deleteTranscript.mockRejectedValue(error)

      const result = await deleteTranscriptData(0)

      expect(result.error).toBe('Delete failed')
    })
  })

  describe('syncTranscriptData', () => {
    it('should sync data successfully', async () => {
      mockGoogleSheetsService.syncWithSheets.mockResolvedValue(mockTranscriptData)

      const result = await syncTranscriptData()

      expect(result).toEqual({
        data: mockTranscriptData,
        error: null,
        loading: false,
      })
    })
  })

  describe('testSheetsConnection', () => {
    it('should return true for successful connection', async () => {
      mockGoogleSheetsService.testConnection.mockResolvedValue(true)

      const result = await testSheetsConnection()

      expect(result).toEqual({
        data: true,
        error: null,
        loading: false,
      })
    })

    it('should return false for failed connection', async () => {
      mockGoogleSheetsService.testConnection.mockResolvedValue(false)

      const result = await testSheetsConnection()

      expect(result).toEqual({
        data: false,
        error: 'Connection test failed',
        loading: false,
      })
    })
  })

  describe('getTranscriptSummary', () => {
    it('should calculate summary statistics correctly', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(mockTranscriptData)

      const result = await getTranscriptSummary()

      expect(result.data).toEqual({
        totalClients: 2, // Client A and Client B
        totalTranscripts: 45, // 10 + 15 + 20
        averageTranscriptsPerClient: 23, // 45 / 2 rounded
        dateRange: {
          start: '2024-01',
          end: '2024-03',
        },
      })
    })

    it('should handle empty data', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue([])

      const result = await getTranscriptSummary()

      expect(result.data).toEqual({
        totalClients: 0,
        totalTranscripts: 0,
        averageTranscriptsPerClient: 0,
        dateRange: { start: '', end: '' },
      })
    })

    it('should handle service errors', async () => {
      const error = new Error('Summary failed')
      mockGoogleSheetsService.fetchTranscripts.mockRejectedValue(error)

      const result = await getTranscriptSummary()

      expect(result.error).toBe('Summary failed')
    })
  })
})