import { GoogleSheetsService } from '../google-sheets'
import { google } from 'googleapis'
import { TranscriptData } from '@/types/transcript'

// Mock googleapis
jest.mock('googleapis')
const mockGoogle = google as jest.Mocked<typeof google>

// Mock environment variables
const mockEnv = {
  GOOGLE_SHEETS_SPREADSHEET_ID: 'test-spreadsheet-id',
  GOOGLE_SHEETS_RANGE: 'Sheet1!A:F',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@test.iam.gserviceaccount.com',
  GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----\n',
  GOOGLE_PROJECT_ID: 'test-project',
  GOOGLE_PRIVATE_KEY_ID: 'test-key-id',
  GOOGLE_CLIENT_ID: 'test-client-id',
}

describe('GoogleSheetsService', () => {
  let service: GoogleSheetsService
  let mockSheets: any
  let mockAuth: any

  beforeEach(() => {
    // Set up environment variables
    Object.assign(process.env, mockEnv)

    // Mock Google Auth
    mockAuth = {
      getClient: jest.fn(),
    }
    mockGoogle.auth.GoogleAuth = jest.fn().mockImplementation(() => mockAuth)

    // Mock Sheets API
    mockSheets = {
      spreadsheets: {
        values: {
          get: jest.fn(),
          append: jest.fn(),
          update: jest.fn(),
        },
        batchUpdate: jest.fn(),
        get: jest.fn(),
      },
    }
    mockGoogle.sheets = jest.fn().mockReturnValue(mockSheets)

    service = new GoogleSheetsService()
  })

  afterEach(() => {
    jest.clearAllMocks()
    // Clean up environment variables
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key]
    })
  })

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockGoogle.auth.GoogleAuth).toHaveBeenCalledWith({
        credentials: expect.objectContaining({
          type: 'service_account',
          project_id: 'test-project',
          private_key: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----\n',
          client_email: 'test@test.iam.gserviceaccount.com',
        }),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })
    })

    it('should throw error if spreadsheet ID is missing', () => {
      delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID
      expect(() => new GoogleSheetsService()).toThrow('GOOGLE_SHEETS_SPREADSHEET_ID environment variable is required')
    })
  })

  describe('fetchTranscripts', () => {
    it('should fetch and transform transcript data correctly', async () => {
      const mockResponse = {
        data: {
          values: [
            ['Client Name', 'Month', 'Count', 'Created', 'Updated', 'Notes'], // Header
            ['Client A', '2024-01', '10', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z', 'Test note'],
            ['Client B', '2024-02', '15', '2024-02-01T00:00:00Z', '2024-02-01T00:00:00Z', ''],
          ],
        },
      }
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockResponse)

      const result = await service.fetchTranscripts()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'row_0',
        clientName: 'Client A',
        month: '2024-01',
        year: 2024,
        transcriptCount: 10,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        notes: 'Test note',
      })
    })

    it('should handle empty response', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({ data: {} })

      const result = await service.fetchTranscripts()

      expect(result).toEqual([])
    })

    it('should handle API errors', async () => {
      const error = new Error('API Error')
      mockSheets.spreadsheets.values.get.mockRejectedValue(error)

      await expect(service.fetchTranscripts()).rejects.toThrow('Failed to fetch transcript data: API Error')
    })
  })

  describe('addTranscript', () => {
    it('should add transcript data correctly', async () => {
      const transcriptData = {
        clientName: 'New Client',
        month: '2024-03',
        year: 2024,
        transcriptCount: 20,
        notes: 'New note',
      }

      mockSheets.spreadsheets.values.append.mockResolvedValue({})

      await service.addTranscript(transcriptData)

      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'Sheet1!A:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              'New Client',
              '2024-03',
              '20',
              expect.any(String), // createdAt
              expect.any(String), // updatedAt
              'New note',
            ],
          ],
        },
      })
    })

    it('should handle API errors when adding', async () => {
      const error = new Error('Add Error')
      mockSheets.spreadsheets.values.append.mockRejectedValue(error)

      const transcriptData = {
        clientName: 'New Client',
        month: '2024-03',
        year: 2024,
        transcriptCount: 20,
      }

      await expect(service.addTranscript(transcriptData)).rejects.toThrow('Failed to add transcript data: Add Error')
    })
  })

  describe('updateTranscript', () => {
    it('should update transcript data correctly', async () => {
      // Mock the getTranscriptByIndex call
      const existingData: TranscriptData = {
        id: 'row_0',
        clientName: 'Existing Client',
        month: '2024-01',
        year: 2024,
        transcriptCount: 10,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      }

      // Mock fetchTranscripts for getTranscriptByIndex
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Client Name', 'Month', 'Count', 'Created', 'Updated', 'Notes'],
            ['Existing Client', '2024-01', '10', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z', ''],
          ],
        },
      })

      mockSheets.spreadsheets.values.update.mockResolvedValue({})

      const updateData = { transcriptCount: 25 }
      await service.updateTranscript(0, updateData)

      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'Sheet1!A2:F2',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              'Existing Client',
              '2024-01',
              '25',
              '2024-01-01T00:00:00.000Z',
              expect.any(String), // updatedAt
              '',
            ],
          ],
        },
      })
    })
  })

  describe('deleteTranscript', () => {
    it('should delete transcript data correctly', async () => {
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({})

      await service.deleteTranscript(0)

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 0,
                  dimension: 'ROWS',
                  startIndex: 1, // 0-based for API
                  endIndex: 2,
                },
              },
            },
          ],
        },
      })
    })
  })

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({})

      const result = await service.testConnection()

      expect(result).toBe(true)
      expect(mockSheets.spreadsheets.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
      })
    })

    it('should return false for failed connection', async () => {
      mockSheets.spreadsheets.get.mockRejectedValue(new Error('Connection failed'))

      const result = await service.testConnection()

      expect(result).toBe(false)
    })
  })

  describe('batchImport', () => {
    it('should import multiple records correctly', async () => {
      const data = [
        { clientName: 'Client 1', month: '2024-01', year: 2024, transcriptCount: 10 },
        { clientName: 'Client 2', month: '2024-02', year: 2024, transcriptCount: 15 },
      ]

      mockSheets.spreadsheets.values.append.mockResolvedValue({})

      await service.batchImport(data)

      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'Sheet1!A:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            ['Client 1', '2024-01', '10', expect.any(String), expect.any(String), ''],
            ['Client 2', '2024-02', '15', expect.any(String), expect.any(String), ''],
          ],
        },
      })
    })
  })
})