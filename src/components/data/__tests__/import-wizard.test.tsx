import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportWizard } from '../import-wizard'
import type { RawData } from '@/types/transcript'

// Mock the data transformers
jest.mock('@/lib/utils/data-transformers', () => ({
  transformRawDataToTranscripts: jest.fn()
}))

// Mock the file processors
jest.mock('@/lib/utils/file-processors', () => ({
  FileProcessor: {
    generatePreview: jest.fn()
  }
}))

const mockTransformRawDataToTranscripts = require('@/lib/utils/data-transformers').transformRawDataToTranscripts
const mockFileProcessor = require('@/lib/utils/file-processors').FileProcessor

describe('ImportWizard', () => {
  const mockHeaders = ['Client Name', 'Date', 'Transcript Count', 'Type', 'Notes']
  const mockData: RawData[] = [
    {
      'Client Name': 'Acme Corp',
      'Date': '2024-01-15',
      'Transcript Count': '25',
      'Type': 'Medical',
      'Notes': 'Regular batch'
    },
    {
      'Client Name': 'Beta Inc',
      'Date': '2024-01-16',
      'Transcript Count': '15',
      'Type': 'Legal',
      'Notes': 'Urgent processing'
    }
  ]
  
  const mockOnImport = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockFileProcessor.generatePreview.mockReturnValue(mockData.slice(0, 5))
  })

  it('should render column mapping step initially', () => {
    render(
      <ImportWizard
        headers={mockHeaders}
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    expect(screen.getByText('Import Wizard - test.csv')).toBeInTheDocument()
    expect(screen.getByText('Map Columns')).toBeInTheDocument()
    expect(screen.getByText('Client Name')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Transcript Count')).toBeInTheDocument()
  })

  it('should auto-detect column mappings', () => {
    render(
      <ImportWizard
        headers={mockHeaders}
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    // Check that select elements have auto-detected values
    const clientNameSelect = screen.getByDisplayValue('Client Name')
    const dateSelect = screen.getByDisplayValue('Date')
    const countSelect = screen.getByDisplayValue('Transcript Count')
    
    expect(clientNameSelect).toBeInTheDocument()
    expect(dateSelect).toBeInTheDocument()
    expect(countSelect).toBeInTheDocument()
  })

  it('should allow changing column mappings', async () => {
    const user = userEvent.setup()
    
    render(
      <ImportWizard
        headers={mockHeaders}
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    // Find the select for Client Name mapping
    const selects = screen.getAllByRole('combobox')
    const clientNameSelect = selects[0] // First select should be for Client Name
    
    // Change the mapping
    await user.click(clientNameSelect)
    await user.click(screen.getByText('-- Not mapped --'))
    
    // Verify the change
    expect(screen.getByText('-- Not mapped --')).toBeInTheDocument()
  })

  it('should validate required field mappings', async () => {
    const user = userEvent.setup()
    
    render(
      <ImportWizard
        headers={['Notes', 'Type']} // Missing required fields
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    // Try to proceed to next step
    const nextButton = screen.getByText('Next')
    await user.click(nextButton)
    
    // Should show validation errors
    expect(screen.getByText(/Client Name is required/)).toBeInTheDocument()
    expect(screen.getByText(/Date is required/)).toBeInTheDocument()
    expect(screen.getByText(/Transcript Count is required/)).toBeInTheDocument()
  })

  it('should proceed to preview step when mappings are valid', async () => {
    const user = userEvent.setup()
    
    render(
      <ImportWizard
        headers={mockHeaders}
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    // Click Next to go to preview step
    const nextButton = screen.getByText('Next')
    await user.click(nextButton)
    
    await waitFor(() => {
      expect(screen.getByText('Data Preview')).toBeInTheDocument()
      expect(screen.getByText('Original Data')).toBeInTheDocument()
      expect(screen.getByText('Mapped Data')).toBeInTheDocument()
    })
  })

  it('should show data preview with original and mapped tabs', async () => {
    const user = userEvent.setup()
    
    render(
      <ImportWizard
        headers={mockHeaders}
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    // Go to preview step
    await user.click(screen.getByText('Next'))
    
    await waitFor(() => {
      expect(screen.getByText('Data Preview')).toBeInTheDocument()
    })
    
    // Check original data tab
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Beta Inc')).toBeInTheDocument()
    
    // Switch to mapped data tab
    await user.click(screen.getByText('Mapped Data'))
    
    // Should still show the data but in mapped format
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('should show total rows count in preview', async () => {
    const user = userEvent.setup()
    
    render(
      <ImportWizard
        headers={mockHeaders}
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    await user.click(screen.getByText('Next'))
    
    await waitFor(() => {
      expect(screen.getByText('Total rows to import: 2')).toBeInTheDocument()
    })
  })

  it('should process data and handle successful import', async () => {
    const user = userEvent.setup()
    
    mockTransformRawDataToTranscripts.mockResolvedValue({
      validData: [
        {
          id: 'temp-1',
          clientName: 'Acme Corp',
          date: new Date('2024-01-15'),
          transcriptCount: 25,
          transcriptType: 'Medical',
          notes: 'Regular batch'
        }
      ],
      errors: []
    })
    
    render(
      <ImportWizard
        headers={mockHeaders}
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    // Go to preview and then process
    await user.click(screen.getByText('Next'))
    
    await waitFor(() => {
      expect(screen.getByText('Data Preview')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('Next'))
    
    await waitFor(() => {
      expect(mockOnImport).toHaveBeenCalledWith({
        totalRows: 2,
        successCount: 1,
        errorCount: 0,
        errors: [],
        duplicateCount: 0
      })
    })
  })

  it('should handle validation errors and show conflicts step', async () => {
    const user = userEvent.setup()
    
    const mockErrors = [
      {
        row: 1,
        field: 'date',
        value: 'invalid-date',
        message: 'Invalid date format'
      }
    ]
    
    mockTransformRawDataToTranscripts.mockResolvedValue({
      validData: [
        {
          id: 'temp-1',
          clientName: 'Acme Corp',
          date: new Date('2024-01-15'),
          transcriptCount: 25
        }
      ],
      errors: mockErrors
    })
    
    render(
      <ImportWizard
        headers={mockHeaders}
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    // Go through the steps
    await user.click(screen.getByText('Next'))
    
    await waitFor(() => {
      expect(screen.getByText('Data Preview')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('Next'))
    
    await waitFor(() => {
      expect(screen.getByText('Import Results')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument() // Valid records
      expect(screen.getByText('1')).toBeInTheDocument() // Errors
      expect(screen.getByText('Invalid date format')).toBeInTheDocument()
    })
  })

  it('should allow importing valid records despite errors', async () => {
    const user = userEvent.setup()
    
    const mockErrors = [
      {
        row: 2,
        field: 'transcriptCount',
        value: 'invalid',
        message: 'Invalid transcript count'
      }
    ]
    
    mockTransformRawDataToTranscripts.mockResolvedValue({
      validData: [
        {
          id: 'temp-1',
          clientName: 'Acme Corp',
          date: new Date('2024-01-15'),
          transcriptCount: 25
        }
      ],
      errors: mockErrors
    })
    
    render(
      <ImportWizard
        headers={mockHeaders}
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    // Go through the steps to conflicts
    await user.click(screen.getByText('Next'))
    await waitFor(() => screen.getByText('Data Preview'))
    
    await user.click(screen.getByText('Next'))
    await waitFor(() => screen.getByText('Import Results'))
    
    // Click import valid records
    const importButton = screen.getByText('Import Valid Records (1)')
    await user.click(importButton)
    
    expect(mockOnImport).toHaveBeenCalledWith({
      totalRows: 2,
      successCount: 1,
      errorCount: 1,
      errors: mockErrors,
      duplicateCount: 0
    })
  })

  it('should allow going back to previous steps', async () => {
    const user = userEvent.setup()
    
    render(
      <ImportWizard
        headers={mockHeaders}
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    // Go to preview step
    await user.click(screen.getByText('Next'))
    
    await waitFor(() => {
      expect(screen.getByText('Data Preview')).toBeInTheDocument()
    })
    
    // Go back to mapping
    await user.click(screen.getByText('Back'))
    
    expect(screen.getByText('Map Columns')).toBeInTheDocument()
  })

  it('should handle cancel action', async () => {
    const user = userEvent.setup()
    
    render(
      <ImportWizard
        headers={mockHeaders}
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    await user.click(screen.getByText('Cancel'))
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should disable next button when processing', async () => {
    const user = userEvent.setup()
    
    // Mock slow processing
    mockTransformRawDataToTranscripts.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        validData: [],
        errors: []
      }), 100))
    )
    
    render(
      <ImportWizard
        headers={mockHeaders}
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    await user.click(screen.getByText('Next'))
    await waitFor(() => screen.getByText('Data Preview'))
    
    const nextButton = screen.getByText('Next')
    await user.click(nextButton)
    
    // Button should show processing state
    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })

  it('should show limited error list when there are many errors', async () => {
    const user = userEvent.setup()
    
    const manyErrors = Array.from({ length: 15 }, (_, i) => ({
      row: i + 1,
      field: 'date',
      value: 'invalid',
      message: `Error ${i + 1}`
    }))
    
    mockTransformRawDataToTranscripts.mockResolvedValue({
      validData: [],
      errors: manyErrors
    })
    
    render(
      <ImportWizard
        headers={mockHeaders}
        data={mockData}
        fileName="test.csv"
        onImport={mockOnImport}
        onCancel={mockOnCancel}
      />
    )
    
    await user.click(screen.getByText('Next'))
    await waitFor(() => screen.getByText('Data Preview'))
    
    await user.click(screen.getByText('Next'))
    await waitFor(() => screen.getByText('Import Results'))
    
    // Should show only first 10 errors plus "more" message
    expect(screen.getByText('Error 1')).toBeInTheDocument()
    expect(screen.getByText('Error 10')).toBeInTheDocument()
    expect(screen.getByText('... and 5 more errors')).toBeInTheDocument()
  })
})