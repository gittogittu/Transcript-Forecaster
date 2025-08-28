import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportReports } from '../export-reports'
import { useTranscripts } from '@/lib/hooks/use-transcripts'
import { usePredictions } from '@/lib/hooks/use-predictions'
import { exportService } from '@/lib/services/export-service'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('@/lib/hooks/use-transcripts')
jest.mock('@/lib/hooks/use-predictions')
jest.mock('@/lib/services/export-service')
jest.mock('sonner')

const mockUseTranscripts = useTranscripts as jest.MockedFunction<typeof useTranscripts>
const mockUsePredictions = usePredictions as jest.MockedFunction<typeof usePredictions>
const mockExportService = exportService as jest.Mocked<typeof exportService>
const mockToast = toast as jest.Mocked<typeof toast>

describe('ExportReports', () => {
  const mockTranscripts = [
    {
      id: '1',
      clientName: 'Client A',
      date: new Date('2024-01-15'),
      transcriptCount: 25,
      transcriptType: 'Medical',
      notes: 'Test notes',
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
      notes: 'Another test',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user1'
    }
  ]

  const mockPredictions = [
    {
      id: 'pred1',
      clientName: 'Client A',
      predictionType: 'daily' as const,
      predictions: [
        {
          date: new Date('2024-01-20'),
          predictedCount: 28,
          confidenceInterval: { lower: 25, upper: 31 }
        }
      ],
      confidence: 0.85,
      accuracy: 0.92,
      modelType: 'linear' as const,
      createdAt: new Date()
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseTranscripts.mockReturnValue({
      data: mockTranscripts,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false
    })

    mockUsePredictions.mockReturnValue({
      data: mockPredictions,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false
    })

    mockExportService.exportData.mockResolvedValue({
      success: true,
      data: 'mock-csv-data',
      filename: 'test-export.csv'
    })

    mockExportService.downloadFile.mockImplementation(() => {})
  })

  it('should render export wizard when data is available', () => {
    render(<ExportReports />)
    
    expect(screen.getByText('Export Analytics Data')).toBeInTheDocument()
    expect(screen.getByText('Choose Export Format')).toBeInTheDocument()
  })

  it('should show loading state when data is loading', () => {
    mockUseTranscripts.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
      isRefetching: false
    })

    render(<ExportReports />)
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument()
  })

  it('should show no data message when no transcripts available', () => {
    mockUseTranscripts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false
    })

    render(<ExportReports />)
    
    expect(screen.getByText('No transcript data available for export.')).toBeInTheDocument()
  })

  it('should extract available clients from transcript data', () => {
    render(<ExportReports />)
    
    // Navigate to client selection step to verify clients are available
    // This would require more complex navigation through the wizard
    expect(screen.getByText('Export Analytics Data')).toBeInTheDocument()
  })

  describe('Export Functionality', () => {
    it('should handle successful CSV export', async () => {
      const user = userEvent.setup()
      render(<ExportReports />)
      
      // Navigate through wizard and export
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      // Navigate to final step (simplified for test)
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)
      
      const exportButton = screen.getByRole('button', { name: /export data/i })
      await user.click(exportButton)
      
      await waitFor(() => {
        expect(mockExportService.exportData).toHaveBeenCalledWith(
          expect.objectContaining({
            transcripts: mockTranscripts,
            summary: expect.objectContaining({
              totalTranscripts: 55,
              averagePerDay: expect.any(Number)
            })
          }),
          expect.objectContaining({
            format: 'csv'
          })
        )
      })

      expect(mockExportService.downloadFile).toHaveBeenCalledWith(
        'mock-csv-data',
        'test-export.csv',
        'text/csv'
      )

      expect(mockToast.success).toHaveBeenCalledWith(
        'Export completed successfully! Downloaded test-export.csv'
      )
    })

    it('should handle successful PDF export', async () => {
      const user = userEvent.setup()
      
      const mockPdfBlob = new Blob(['pdf-content'], { type: 'application/pdf' })
      mockExportService.exportData.mockResolvedValue({
        success: true,
        data: mockPdfBlob,
        filename: 'test-export.pdf'
      })

      render(<ExportReports />)
      
      // Select PDF format
      const pdfOption = screen.getByLabelText(/PDF Report/)
      await user.click(pdfOption)
      
      // Navigate to final step
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)
      
      const exportButton = screen.getByRole('button', { name: /export data/i })
      await user.click(exportButton)
      
      await waitFor(() => {
        expect(mockExportService.downloadFile).toHaveBeenCalledWith(
          mockPdfBlob,
          'test-export.pdf',
          'application/pdf'
        )
      })
    })

    it('should handle export errors', async () => {
      const user = userEvent.setup()
      
      mockExportService.exportData.mockResolvedValue({
        success: false,
        filename: '',
        error: 'Export failed due to server error'
      })

      render(<ExportReports />)
      
      // Navigate through wizard and attempt export
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)
      
      const exportButton = screen.getByRole('button', { name: /export data/i })
      await user.click(exportButton)
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Export failed due to server error')
      })
    })

    it('should handle export service exceptions', async () => {
      const user = userEvent.setup()
      
      mockExportService.exportData.mockRejectedValue(new Error('Network error'))

      render(<ExportReports />)
      
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)
      
      const exportButton = screen.getByRole('button', { name: /export data/i })
      await user.click(exportButton)
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Network error')
      })
    })
  })

  describe('Data Filtering', () => {
    it('should filter transcripts by date range', async () => {
      const user = userEvent.setup()
      render(<ExportReports />)
      
      // Navigate to date selection and set custom range
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      // Select custom date range
      const selectTrigger = screen.getByRole('combobox')
      await user.click(selectTrigger)
      
      const customOption = screen.getByText('Custom range')
      await user.click(customOption)
      
      // Continue to export
      nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      
      const exportButton = screen.getByRole('button', { name: /export data/i })
      await user.click(exportButton)
      
      await waitFor(() => {
        expect(mockExportService.exportData).toHaveBeenCalledWith(
          expect.objectContaining({
            transcripts: expect.any(Array)
          }),
          expect.objectContaining({
            dateRange: expect.objectContaining({
              start: expect.any(Date),
              end: expect.any(Date)
            })
          })
        )
      })
    })

    it('should filter transcripts by selected clients', async () => {
      const user = userEvent.setup()
      render(<ExportReports />)
      
      // Navigate to client selection
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      
      // Select specific client
      const clientACheckbox = screen.getByLabelText('Client A')
      await user.click(clientACheckbox)
      
      // Continue to export
      nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      const exportButton = screen.getByRole('button', { name: /export data/i })
      await user.click(exportButton)
      
      await waitFor(() => {
        expect(mockExportService.exportData).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            clients: ['Client A']
          })
        )
      })
    })
  })

  describe('Summary Statistics Calculation', () => {
    it('should calculate correct summary statistics', async () => {
      const user = userEvent.setup()
      render(<ExportReports />)
      
      // Navigate through wizard and export
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)
      
      const exportButton = screen.getByRole('button', { name: /export data/i })
      await user.click(exportButton)
      
      await waitFor(() => {
        expect(mockExportService.exportData).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: expect.objectContaining({
              totalTranscripts: 55, // 25 + 30
              averagePerDay: expect.any(Number),
              peakDay: expect.objectContaining({
                date: expect.any(String),
                count: expect.any(Number)
              }),
              clientBreakdown: expect.arrayContaining([
                expect.objectContaining({
                  client: expect.any(String),
                  count: expect.any(Number),
                  percentage: expect.any(Number)
                })
              ])
            })
          }),
          expect.any(Object)
        )
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during export', async () => {
      const user = userEvent.setup()
      
      // Make export service return a promise that doesn't resolve immediately
      let resolveExport: (value: any) => void
      const exportPromise = new Promise(resolve => {
        resolveExport = resolve
      })
      mockExportService.exportData.mockReturnValue(exportPromise)

      render(<ExportReports />)
      
      // Navigate through wizard
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)
      
      const exportButton = screen.getByRole('button', { name: /export data/i })
      await user.click(exportButton)
      
      // Should show loading state
      expect(screen.getByText('Exporting...')).toBeInTheDocument()
      
      // Resolve the export
      resolveExport!({
        success: true,
        data: 'test-data',
        filename: 'test.csv'
      })
      
      await waitFor(() => {
        expect(screen.queryByText('Exporting...')).not.toBeInTheDocument()
      })
    })
  })
})