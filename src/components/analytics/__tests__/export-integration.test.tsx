import { exportService, ExportOptions, AnalyticsData } from '@/lib/services/export-service'
import { scheduledExportService } from '@/lib/services/scheduled-export-service'

// Mock jsPDF
jest.mock('jspdf', () => {
  const mockDoc = {
    setFontSize: jest.fn(),
    text: jest.fn(),
    addPage: jest.fn(),
    output: jest.fn().mockReturnValue(new ArrayBuffer(8)),
    autoTable: jest.fn(),
    lastAutoTable: { finalY: 100 }
  }
  
  return jest.fn().mockImplementation(() => mockDoc)
})

jest.mock('jspdf-autotable', () => ({}))

describe('Export Integration Tests', () => {
  const mockAnalyticsData: AnalyticsData = {
    transcripts: [
      {
        id: '1',
        clientName: 'Test Client',
        date: new Date('2024-01-15'),
        transcriptCount: 25,
        transcriptType: 'Medical',
        notes: 'Test notes',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1'
      }
    ],
    summary: {
      totalTranscripts: 25,
      averagePerDay: 25,
      peakDay: { date: '2024-01-15', count: 25 },
      clientBreakdown: [
        { client: 'Test Client', count: 25, percentage: 100 }
      ],
      dateRange: { start: '2024-01-15', end: '2024-01-15' }
    }
  }

  describe('CSV Export', () => {
    it('should export CSV with all data', async () => {
      const options: ExportOptions = {
        format: 'csv',
        includeAnalytics: true,
        includePredictions: false
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/\.csv$/)
      expect(result.data).toContain('Test Client')
      expect(result.data).toContain('25')
    })
  })

  describe('PDF Export', () => {
    it('should export PDF with analytics', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        includeAnalytics: true,
        includePredictions: false
      }

      const result = await exportService.exportData(mockAnalyticsData, options)

      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/\.pdf$/)
      expect(result.data).toBeInstanceOf(Blob)
    })
  })

  describe('Scheduled Export Service', () => {
    it('should create and execute scheduled export', async () => {
      const config = {
        name: 'Test Export',
        schedule: {
          frequency: 'daily' as const,
          time: '09:00',
          timezone: 'UTC'
        },
        exportOptions: {
          format: 'csv' as const,
          includeAnalytics: true
        },
        recipients: ['test@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      const id = await scheduledExportService.createScheduledExport(config)
      expect(id).toBeDefined()

      const scheduledExport = scheduledExportService.getScheduledExport(id)
      expect(scheduledExport).toBeDefined()
      expect(scheduledExport?.name).toBe('Test Export')

      // Clean up
      await scheduledExportService.deleteScheduledExport(id)
    })
  })

  describe('Export Options Validation', () => {
    it('should handle all export option combinations', async () => {
      const testCases: ExportOptions[] = [
        { format: 'csv' },
        { format: 'pdf' },
        { format: 'csv', includeAnalytics: true },
        { format: 'pdf', includeAnalytics: true, includeCharts: true },
        { format: 'csv', clients: ['Test Client'] },
        { 
          format: 'pdf', 
          dateRange: { 
            start: new Date('2024-01-01'), 
            end: new Date('2024-01-31') 
          } 
        }
      ]

      for (const options of testCases) {
        const result = await exportService.exportData(mockAnalyticsData, options)
        expect(result.success).toBe(true)
      }
    })
  })
})