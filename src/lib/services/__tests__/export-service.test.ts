import { ExportService, ExportOptions, AnalyticsData } from '../export-service'
import { format, subDays } from 'date-fns'

// Mock jsPDF
jest.mock('jspdf', () => {
  const mockDoc = {
    setFontSize: jest.fn(),
    text: jest.fn(),
    addPage: jest.fn(),
    output: jest.fn().mockReturnValue('mock-pdf-output'),
    autoTable: jest.fn(),
    lastAutoTable: { finalY: 100 }
  }
  
  return jest.fn().mockImplementation(() => mockDoc)
})

jest.mock('jspdf-autotable', () => ({}))

describe('ExportService', () => {
  let exportService: ExportService
  let mockAnalyticsData: AnalyticsData

  beforeEach(() => {
    exportService = new ExportService()
    
    mockAnalyticsData = {
      transcripts: [
        {
          id: '1',
          clientName: 'Client A',
          date: new Date('2024-01-15'),
          transcriptCount: 25,
          transcriptType: 'Medical',
          notes: 'Regular transcription',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user1'
        },
        {
          id: '2',
          clientName: 'Client B',
          date: new Date('2024-01-16'),
          transcriptCount: 30,
          transcriptType: 'Legal',
          notes: 'Urgent case',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user1'
        }
      ],
      predictions: [
        {
          id: 'pred1',
          clientName: 'Client A',
          predictionType: 'daily',
          predictions: [
            {
              date: new Date('2024-01-20'),
              predictedCount: 28,
              confidenceInterval: { lower: 25, upper: 31 }
            }
          ],
          confidence: 0.85,
          accuracy: 0.92,
          modelType: 'linear',
          createdAt: new Date()
        }
      ],
      summary: {
        totalTranscripts: 55,
        averagePerDay: 27.5,
        peakDay: { date: '2024-01-16', count: 30 },
        clientBreakdown: [
          { client: 'Client B', count: 30, percentage: 54.5 },
          { client: 'Client A', count: 25, percentage: 45.5 }
        ],
        dateRange: { start: '2024-01-15', end: '2024-01-16' }
      }
    }
  })

  describe('CSV Export', () => {
    it('should generate CSV with transcript data only', async () => {
      const options: ExportOptions = {
        format: 'csv',
        includeAnalytics: false,
        includePredictions: false
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/\.csv$/)
      expect(result.data).toContain('# Transcript Data')
      expect(result.data).toContain('Date,Client,Count,Type,Notes')
      expect(result.data).toContain('2024-01-15,Client A,25,Medical,Regular transcription')
      expect(result.data).toContain('2024-01-16,Client B,30,Legal,Urgent case')
    })

    it('should generate CSV with analytics included', async () => {
      const options: ExportOptions = {
        format: 'csv',
        includeAnalytics: true,
        includePredictions: false
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.success).toBe(true)
      expect(result.data).toContain('# Summary Statistics')
      expect(result.data).toContain('Total Transcripts,55')
      expect(result.data).toContain('Average Per Day,27.50')
      expect(result.data).toContain('Peak Day,2024-01-16')
      expect(result.data).toContain('# Client Breakdown')
      expect(result.data).toContain('Client B,30,54.5%')
    })

    it('should generate CSV with predictions included', async () => {
      const options: ExportOptions = {
        format: 'csv',
        includeAnalytics: false,
        includePredictions: true
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.success).toBe(true)
      expect(result.data).toContain('# Predictions Data')
      expect(result.data).toContain('Date,Client,Predicted Count,Confidence Lower,Confidence Upper,Model Type,Accuracy')
      expect(result.data).toContain('2024-01-20,Client A,28,25,31,linear,0.92')
    })

    it('should escape CSV fields with commas and quotes', async () => {
      const dataWithSpecialChars: AnalyticsData = {
        ...mockAnalyticsData,
        transcripts: [
          {
            id: '1',
            clientName: 'Client, Inc.',
            date: new Date('2024-01-15'),
            transcriptCount: 25,
            transcriptType: 'Medical',
            notes: 'Notes with "quotes" and, commas',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'user1'
          }
        ]
      }

      const options: ExportOptions = { format: 'csv' }
      const result = await exportService.exportData(dataWithSpecialChars, options)

      expect(result.success).toBe(true)
      expect(result.data).toContain('"Client, Inc."')
      expect(result.data).toContain('"Notes with ""quotes"" and, commas"')
    })

    it('should generate filename with date range', async () => {
      const options: ExportOptions = {
        format: 'csv',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.success).toBe(true)
      expect(result.filename).toContain('2024-01-01_to_2024-01-31')
    })

    it('should generate filename with client filter', async () => {
      const options: ExportOptions = {
        format: 'csv',
        clients: ['Client A']
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.success).toBe(true)
      expect(result.filename).toContain('Client_A')
    })
  })

  describe('PDF Export', () => {
    it('should generate PDF with transcript data', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        includeAnalytics: false,
        includePredictions: false
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/\.pdf$/)
      expect(result.data).toBeInstanceOf(Blob)
    })

    it('should generate PDF with analytics and predictions', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        includeAnalytics: true,
        includePredictions: true,
        includeCharts: true
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.success).toBe(true)
      expect(result.data).toBeInstanceOf(Blob)
    })

    it('should handle empty data gracefully', async () => {
      const emptyData: AnalyticsData = {
        transcripts: [],
        summary: {
          totalTranscripts: 0,
          averagePerDay: 0,
          peakDay: { date: '2024-01-01', count: 0 },
          clientBreakdown: [],
          dateRange: { start: '2024-01-01', end: '2024-01-01' }
        }
      }

      const options: ExportOptions = { format: 'pdf' }
      const result = await exportService.exportData(emptyData, options)

      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle unsupported format', async () => {
      const options: ExportOptions = {
        format: 'xml' as any
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported export format')
    })

    it('should handle PDF generation errors', async () => {
      // Mock PDF generation to throw error
      const jsPDF = require('jspdf')
      jsPDF.mockImplementation(() => {
        throw new Error('PDF generation failed')
      })

      const options: ExportOptions = { format: 'pdf' }
      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.success).toBe(false)
      expect(result.error).toContain('PDF generation failed')
    })
  })

  describe('File Download', () => {
    let mockCreateObjectURL: jest.SpyInstance
    let mockRevokeObjectURL: jest.SpyInstance
    let mockAppendChild: jest.SpyInstance
    let mockRemoveChild: jest.SpyInstance
    let mockClick: jest.SpyInstance

    beforeEach(() => {
      // Mock URL methods
      Object.defineProperty(global.URL, 'createObjectURL', {
        value: jest.fn().mockReturnValue('mock-url'),
        writable: true
      })
      Object.defineProperty(global.URL, 'revokeObjectURL', {
        value: jest.fn(),
        writable: true
      })
      
      mockCreateObjectURL = global.URL.createObjectURL as jest.Mock
      mockRevokeObjectURL = global.URL.revokeObjectURL as jest.Mock

      // Mock DOM methods
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      }
      mockClick = mockLink.click as jest.Mock

      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
      mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation()
      mockRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should download CSV file', () => {
      const csvData = 'test,csv,data'
      const filename = 'test.csv'

      exportService.downloadFile(csvData, filename, 'text/csv')

      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob))
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url')
    })

    it('should download PDF file', () => {
      const pdfBlob = new Blob(['pdf-content'], { type: 'application/pdf' })
      const filename = 'test.pdf'

      exportService.downloadFile(pdfBlob, filename, 'application/pdf')

      expect(mockCreateObjectURL).toHaveBeenCalledWith(pdfBlob)
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url')
    })
  })

  describe('Filename Generation', () => {
    it('should generate basic filename with timestamp', async () => {
      const options: ExportOptions = { format: 'csv' }
      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.filename).toMatch(/transcript-analytics_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv/)
    })

    it('should include date range in filename', async () => {
      const options: ExportOptions = {
        format: 'csv',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.filename).toContain('2024-01-01_to_2024-01-31')
    })

    it('should include single client in filename', async () => {
      const options: ExportOptions = {
        format: 'csv',
        clients: ['Client A']
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.filename).toContain('Client_A')
    })

    it('should include multiple clients count in filename', async () => {
      const options: ExportOptions = {
        format: 'csv',
        clients: ['Client A', 'Client B', 'Client C']
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.filename).toContain('3_clients')
    })

    it('should sanitize client names in filename', async () => {
      const options: ExportOptions = {
        format: 'csv',
        clients: ['Client & Co.']
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.filename).toContain('Client___Co_')
    })
  })
})