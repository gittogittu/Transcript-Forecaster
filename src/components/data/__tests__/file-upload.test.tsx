import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUpload } from '../file-upload'

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn()
}))

// Mock file processors
jest.mock('@/lib/utils/file-processors', () => ({
  FileProcessor: {
    validateFile: jest.fn(),
    getFileType: jest.fn(),
    processCSV: jest.fn(),
    processExcel: jest.fn(),
    processExcelSheet: jest.fn()
  }
}))

const mockUseDropzone = require('react-dropzone').useDropzone
const mockFileProcessor = require('@/lib/utils/file-processors').FileProcessor

describe('FileUpload', () => {
  const mockOnFileProcessed = jest.fn()
  const mockOnUpload = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementation for useDropzone
    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({ 'data-testid': 'dropzone' }),
      getInputProps: () => ({ 'data-testid': 'file-input' }),
      isDragActive: false
    })
  })

  it('should render upload area', () => {
    render(<FileUpload onFileProcessed={mockOnFileProcessed} />)
    
    expect(screen.getByText('Upload Data Files')).toBeInTheDocument()
    expect(screen.getByText('Drag & drop files here, or click to select')).toBeInTheDocument()
    expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  })

  it('should show drag active state', () => {
    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({ 'data-testid': 'dropzone' }),
      getInputProps: () => ({ 'data-testid': 'file-input' }),
      isDragActive: true
    })

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />)
    
    expect(screen.getByText('Drop the files here...')).toBeInTheDocument()
  })

  it('should process CSV file successfully', async () => {
    const mockFile = new File(['test,data'], 'test.csv', { type: 'text/csv' })
    
    mockFileProcessor.validateFile.mockReturnValue({
      isValid: true,
      errors: []
    })
    
    mockFileProcessor.getFileType.mockReturnValue('csv')
    
    mockFileProcessor.processCSV.mockResolvedValue({
      headers: ['test', 'data'],
      data: [{ test: 'value1', data: 'value2' }],
      errors: []
    })

    // Mock the dropzone callback
    let onDropCallback: (files: File[]) => void
    mockUseDropzone.mockImplementation(({ onDrop }: { onDrop: (files: File[]) => void }) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false
      }
    })

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />)
    
    // Simulate file drop
    onDropCallback!([mockFile])

    await waitFor(() => {
      expect(mockOnFileProcessed).toHaveBeenCalledWith({
        headers: ['test', 'data'],
        data: [{ test: 'value1', data: 'value2' }],
        fileName: 'test.csv'
      })
    })
  })

  it('should handle file validation errors', async () => {
    const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
    
    mockFileProcessor.validateFile.mockReturnValue({
      isValid: false,
      errors: ['File type not supported']
    })

    let onDropCallback: (files: File[]) => void
    mockUseDropzone.mockImplementation(({ onDrop }: { onDrop: (files: File[]) => void }) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false
      }
    })

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />)
    
    onDropCallback!([mockFile])

    await waitFor(() => {
      expect(screen.getByText('File type not supported')).toBeInTheDocument()
    })
  })

  it('should process Excel file with multiple sheets', async () => {
    const mockFile = new File(['excel data'], 'test.xlsx', { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    mockFileProcessor.validateFile.mockReturnValue({
      isValid: true,
      errors: []
    })
    
    mockFileProcessor.getFileType.mockReturnValue('excel')
    
    mockFileProcessor.processExcel.mockResolvedValue({
      headers: ['col1', 'col2'],
      data: [{ col1: 'value1', col2: 'value2' }],
      errors: [],
      sheets: ['Sheet1', 'Sheet2', 'Sheet3']
    })

    let onDropCallback: (files: File[]) => void
    mockUseDropzone.mockImplementation(({ onDrop }: { onDrop: (files: File[]) => void }) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false
      }
    })

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />)
    
    onDropCallback!([mockFile])

    await waitFor(() => {
      expect(screen.getByText('Select a sheet to process:')).toBeInTheDocument()
      expect(screen.getByText('Sheet1')).toBeInTheDocument()
      expect(screen.getByText('Sheet2')).toBeInTheDocument()
      expect(screen.getByText('Sheet3')).toBeInTheDocument()
    })
  })

  it('should handle sheet selection for Excel files', async () => {
    const mockFile = new File(['excel data'], 'test.xlsx', { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    mockFileProcessor.validateFile.mockReturnValue({
      isValid: true,
      errors: []
    })
    
    mockFileProcessor.getFileType.mockReturnValue('excel')
    
    mockFileProcessor.processExcel.mockResolvedValue({
      headers: ['col1', 'col2'],
      data: [{ col1: 'value1', col2: 'value2' }],
      errors: [],
      sheets: ['Sheet1', 'Sheet2']
    })

    mockFileProcessor.processExcelSheet.mockResolvedValue({
      headers: ['sheet2_col1', 'sheet2_col2'],
      data: [{ sheet2_col1: 'sheet2_value1', sheet2_col2: 'sheet2_value2' }],
      errors: []
    })

    let onDropCallback: (files: File[]) => void
    mockUseDropzone.mockImplementation(({ onDrop }: { onDrop: (files: File[]) => void }) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false
      }
    })

    const user = userEvent.setup()
    render(<FileUpload onFileProcessed={mockOnFileProcessed} />)
    
    onDropCallback!([mockFile])

    await waitFor(() => {
      expect(screen.getByText('Sheet2')).toBeInTheDocument()
    })

    // Click on Sheet2
    await user.click(screen.getByText('Sheet2'))

    await waitFor(() => {
      expect(mockFileProcessor.processExcelSheet).toHaveBeenCalledWith(mockFile, 'Sheet2', true)
      expect(mockOnFileProcessed).toHaveBeenCalledWith({
        headers: ['sheet2_col1', 'sheet2_col2'],
        data: [{ sheet2_col1: 'sheet2_value1', sheet2_col2: 'sheet2_value2' }],
        fileName: 'test.xlsx (Sheet2)'
      })
    })
  })

  it('should display file information after successful processing', async () => {
    const mockFile = new File(['test,data'], 'test.csv', { type: 'text/csv' })
    
    mockFileProcessor.validateFile.mockReturnValue({
      isValid: true,
      errors: []
    })
    
    mockFileProcessor.getFileType.mockReturnValue('csv')
    
    mockFileProcessor.processCSV.mockResolvedValue({
      headers: ['col1', 'col2'],
      data: [
        { col1: 'value1', col2: 'value2' },
        { col1: 'value3', col2: 'value4' }
      ],
      errors: []
    })

    let onDropCallback: (files: File[]) => void
    mockUseDropzone.mockImplementation(({ onDrop }: { onDrop: (files: File[]) => void }) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false
      }
    })

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />)
    
    onDropCallback!([mockFile])

    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument()
      expect(screen.getByText('Ready')).toBeInTheDocument()
      expect(screen.getByText(/2 rows/)).toBeInTheDocument()
      expect(screen.getByText(/2 columns/)).toBeInTheDocument()
      expect(screen.getByText('col1')).toBeInTheDocument()
      expect(screen.getByText('col2')).toBeInTheDocument()
    })
  })

  it('should allow removing uploaded files', async () => {
    const mockFile = new File(['test,data'], 'test.csv', { type: 'text/csv' })
    
    mockFileProcessor.validateFile.mockReturnValue({
      isValid: true,
      errors: []
    })
    
    mockFileProcessor.getFileType.mockReturnValue('csv')
    
    mockFileProcessor.processCSV.mockResolvedValue({
      headers: ['col1', 'col2'],
      data: [{ col1: 'value1', col2: 'value2' }],
      errors: []
    })

    let onDropCallback: (files: File[]) => void
    mockUseDropzone.mockImplementation(({ onDrop }: { onDrop: (files: File[]) => void }) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false
      }
    })

    const user = userEvent.setup()
    render(<FileUpload onFileProcessed={mockOnFileProcessed} />)
    
    onDropCallback!([mockFile])

    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument()
    })

    // Find and click the remove button
    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)

    expect(screen.queryByText('test.csv')).not.toBeInTheDocument()
  })

  it('should handle processing errors gracefully', async () => {
    const mockFile = new File(['test,data'], 'test.csv', { type: 'text/csv' })
    
    mockFileProcessor.validateFile.mockReturnValue({
      isValid: true,
      errors: []
    })
    
    mockFileProcessor.getFileType.mockReturnValue('csv')
    
    mockFileProcessor.processCSV.mockRejectedValue(new Error('Processing failed'))

    let onDropCallback: (files: File[]) => void
    mockUseDropzone.mockImplementation(({ onDrop }: { onDrop: (files: File[]) => void }) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false
      }
    })

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />)
    
    onDropCallback!([mockFile])

    await waitFor(() => {
      expect(screen.getByText('Processing failed')).toBeInTheDocument()
      expect(screen.getByText('Error')).toBeInTheDocument()
    })
  })

  it('should disable upload area while processing', async () => {
    const mockFile = new File(['test,data'], 'test.csv', { type: 'text/csv' })
    
    mockFileProcessor.validateFile.mockReturnValue({
      isValid: true,
      errors: []
    })
    
    mockFileProcessor.getFileType.mockReturnValue('csv')
    
    // Mock a slow processing function
    mockFileProcessor.processCSV.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        headers: ['col1'],
        data: [{ col1: 'value1' }],
        errors: []
      }), 100))
    )

    let onDropCallback: (files: File[]) => void
    mockUseDropzone.mockImplementation(({ onDrop }: { onDrop: (files: File[]) => void }) => {
      onDropCallback = onDrop
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false
      }
    })

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />)
    
    onDropCallback!([mockFile])

    // Check that processing state is shown
    expect(screen.getByText('Processing...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeInTheDocument()
    })
  })
})