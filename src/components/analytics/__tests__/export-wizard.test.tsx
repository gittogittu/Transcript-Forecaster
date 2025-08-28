import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportWizard } from '../export-wizard'
import { ExportOptions } from '@/lib/services/export-service'

// Mock date-fns functions
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'PPP') return 'January 15th, 2024'
    if (formatStr === 'MMM d, yyyy') return 'Jan 15, 2024'
    return '2024-01-15'
  }),
  subDays: jest.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
  subMonths: jest.fn((date, months) => {
    const newDate = new Date(date)
    newDate.setMonth(newDate.getMonth() - months)
    return newDate
  })
}))

describe('ExportWizard', () => {
  const mockAvailableClients = ['Client A', 'Client B', 'Client C']
  const mockOnExport = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderExportWizard = (props = {}) => {
    return render(
      <ExportWizard
        availableClients={mockAvailableClients}
        onExport={mockOnExport}
        isExporting={false}
        {...props}
      />
    )
  }

  describe('Step 1: Format Selection', () => {
    it('should render format selection step', () => {
      renderExportWizard()
      
      expect(screen.getByText('Choose Export Format')).toBeInTheDocument()
      expect(screen.getByText('CSV Format')).toBeInTheDocument()
      expect(screen.getByText('PDF Report')).toBeInTheDocument()
    })

    it('should allow format selection', async () => {
      const user = userEvent.setup()
      renderExportWizard()
      
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      expect(csvOption).toBeChecked()
    })

    it('should enable next button when format is selected', async () => {
      const user = userEvent.setup()
      renderExportWizard()
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
      
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      expect(nextButton).toBeEnabled()
    })

    it('should proceed to step 2 when next is clicked', async () => {
      const user = userEvent.setup()
      renderExportWizard()
      
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      expect(screen.getByText('Select Date Range')).toBeInTheDocument()
    })
  })

  describe('Step 2: Date Range Selection', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      renderExportWizard()
      
      // Navigate to step 2
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
    })

    it('should render date range selection', () => {
      expect(screen.getByText('Select Date Range')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Last 30 days')).toBeInTheDocument()
    })

    it('should allow date preset selection', async () => {
      const user = userEvent.setup()
      
      const selectTrigger = screen.getByRole('combobox')
      await user.click(selectTrigger)
      
      const lastWeekOption = screen.getByText('Last 7 days')
      await user.click(lastWeekOption)
      
      expect(screen.getByDisplayValue('Last 7 days')).toBeInTheDocument()
    })

    it('should show custom date inputs when custom range is selected', async () => {
      const user = userEvent.setup()
      
      const selectTrigger = screen.getByRole('combobox')
      await user.click(selectTrigger)
      
      const customOption = screen.getByText('Custom range')
      await user.click(customOption)
      
      expect(screen.getByText('Start Date')).toBeInTheDocument()
      expect(screen.getByText('End Date')).toBeInTheDocument()
    })

    it('should proceed to step 3', async () => {
      const user = userEvent.setup()
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      expect(screen.getByText('Select Clients')).toBeInTheDocument()
    })
  })

  describe('Step 3: Client Selection', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      renderExportWizard()
      
      // Navigate to step 3
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
    })

    it('should render client selection', () => {
      expect(screen.getByText('Select Clients')).toBeInTheDocument()
      expect(screen.getByText('Client A')).toBeInTheDocument()
      expect(screen.getByText('Client B')).toBeInTheDocument()
      expect(screen.getByText('Client C')).toBeInTheDocument()
    })

    it('should allow individual client selection', async () => {
      const user = userEvent.setup()
      
      const clientACheckbox = screen.getByLabelText('Client A')
      await user.click(clientACheckbox)
      
      expect(clientACheckbox).toBeChecked()
    })

    it('should allow select all clients', async () => {
      const user = userEvent.setup()
      
      const selectAllButton = screen.getByRole('button', { name: /select all/i })
      await user.click(selectAllButton)
      
      expect(screen.getByLabelText('Client A')).toBeChecked()
      expect(screen.getByLabelText('Client B')).toBeChecked()
      expect(screen.getByLabelText('Client C')).toBeChecked()
    })

    it('should show selected clients as badges', async () => {
      const user = userEvent.setup()
      
      const clientACheckbox = screen.getByLabelText('Client A')
      await user.click(clientACheckbox)
      
      expect(screen.getByText('Client A')).toBeInTheDocument()
    })
  })

  describe('Step 4: Export Options', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      renderExportWizard()
      
      // Navigate to step 4
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
    })

    it('should render export options', () => {
      expect(screen.getByText('Export Options')).toBeInTheDocument()
      expect(screen.getByText('Include summary statistics and analytics')).toBeInTheDocument()
      expect(screen.getByText('Include prediction data and forecasts')).toBeInTheDocument()
    })

    it('should show charts option for PDF format', async () => {
      const user = userEvent.setup()
      
      // Go back and select PDF format
      const previousButton = screen.getByRole('button', { name: /previous/i })
      await user.click(previousButton) // Step 3
      await user.click(previousButton) // Step 2
      await user.click(previousButton) // Step 1
      
      const pdfOption = screen.getByLabelText(/PDF Report/)
      await user.click(pdfOption)
      
      // Navigate back to step 4
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)
      
      expect(screen.getByText('Include charts and visualizations (PDF only)')).toBeInTheDocument()
    })

    it('should show export summary', () => {
      expect(screen.getByText('Export Summary')).toBeInTheDocument()
      expect(screen.getByText(/Format:/)).toBeInTheDocument()
      expect(screen.getByText(/Date Range:/)).toBeInTheDocument()
      expect(screen.getByText(/Clients:/)).toBeInTheDocument()
    })

    it('should call onExport when export button is clicked', async () => {
      const user = userEvent.setup()
      
      const exportButton = screen.getByRole('button', { name: /export data/i })
      await user.click(exportButton)
      
      expect(mockOnExport).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'csv',
          includeAnalytics: true,
          includePredictions: false
        })
      )
    })
  })

  describe('Navigation', () => {
    it('should disable previous button on first step', () => {
      renderExportWizard()
      
      const previousButton = screen.getByRole('button', { name: /previous/i })
      expect(previousButton).toBeDisabled()
    })

    it('should allow navigation back to previous steps', async () => {
      const user = userEvent.setup()
      renderExportWizard()
      
      // Navigate to step 2
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      expect(screen.getByText('Select Date Range')).toBeInTheDocument()
      
      // Go back to step 1
      const previousButton = screen.getByRole('button', { name: /previous/i })
      await user.click(previousButton)
      
      expect(screen.getByText('Choose Export Format')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading state when exporting', async () => {
      const user = userEvent.setup()
      renderExportWizard({ isExporting: true })
      
      // Navigate to final step
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)
      
      const exportButton = screen.getByRole('button', { name: /exporting/i })
      expect(exportButton).toBeDisabled()
      expect(screen.getByText('Exporting...')).toBeInTheDocument()
    })
  })

  describe('Progress Indicator', () => {
    it('should show progress indicator', () => {
      renderExportWizard()
      
      const progressSteps = screen.getAllByText(/[1-4]/)
      expect(progressSteps).toHaveLength(4)
    })

    it('should highlight current step', async () => {
      const user = userEvent.setup()
      renderExportWizard()
      
      // Step 1 should be highlighted
      const step1 = screen.getByText('1')
      expect(step1).toHaveClass('bg-primary')
      
      // Navigate to step 2
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      // Step 2 should now be highlighted
      const step2 = screen.getByText('2')
      expect(step2).toHaveClass('bg-primary')
    })
  })

  describe('Form Validation', () => {
    it('should require format selection to proceed', () => {
      renderExportWizard()
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('should allow export with minimal configuration', async () => {
      const user = userEvent.setup()
      renderExportWizard()
      
      // Navigate through all steps with minimal configuration
      const csvOption = screen.getByLabelText(/CSV Format/)
      await user.click(csvOption)
      
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton) // Step 2
      await user.click(nextButton) // Step 3
      await user.click(nextButton) // Step 4
      
      const exportButton = screen.getByRole('button', { name: /export data/i })
      expect(exportButton).toBeEnabled()
    })
  })
})