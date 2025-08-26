import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TranscriptForm } from '../transcript-form'

// Mock the animation components
jest.mock('@/components/animations', () => ({
  AnimatedInput: ({ children, label, error }: any) => (
    <div>
      {label && <label>{label}</label>}
      {children}
      {error && <div role="alert">{error}</div>}
    </div>
  ),
  AnimatedButton: ({ children, loading, onClick, type, disabled }: any) => (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled || loading}
      data-loading={loading}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
  FormFieldAnimation: ({ children }: any) => <div>{children}</div>,
  FadeInView: ({ children }: any) => <div>{children}</div>,
}))

describe('TranscriptForm', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders all form fields', () => {
    render(<TranscriptForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByLabelText('Client Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Month')).toBeInTheDocument()
    expect(screen.getByLabelText('Transcript Count')).toBeInTheDocument()
    expect(screen.getByLabelText('Notes (Optional)')).toBeInTheDocument()
  })

  it('renders submit and clear buttons', () => {
    render(<TranscriptForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByRole('button', { name: 'Add Transcript Data' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<TranscriptForm onSubmit={mockOnSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: 'Add Transcript Data' })
    await user.click(submitButton)
    
    expect(screen.getByRole('alert', { name: 'Client name is required' })).toBeInTheDocument()
    expect(screen.getByRole('alert', { name: 'Month is required' })).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates transcript count is non-negative', async () => {
    const user = userEvent.setup()
    render(<TranscriptForm onSubmit={mockOnSubmit} />)
    
    const countInput = screen.getByLabelText('Transcript Count')
    await user.type(countInput, '-5')
    
    const submitButton = screen.getByRole('button', { name: 'Add Transcript Data' })
    await user.click(submitButton)
    
    expect(screen.getByRole('alert', { name: 'Transcript count must be non-negative' })).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)
    
    render(<TranscriptForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText('Client Name'), 'Test Client')
    await user.type(screen.getByLabelText('Month'), '2024-01')
    await user.type(screen.getByLabelText('Transcript Count'), '25')
    await user.type(screen.getByLabelText('Notes (Optional)'), 'Test notes')
    
    const submitButton = screen.getByRole('button', { name: 'Add Transcript Data' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        clientName: 'Test Client',
        month: '2024-01',
        transcriptCount: 25,
        notes: 'Test notes'
      })
    })
  })

  it('clears form when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<TranscriptForm onSubmit={mockOnSubmit} />)
    
    // Fill form
    await user.type(screen.getByLabelText('Client Name'), 'Test Client')
    await user.type(screen.getByLabelText('Month'), '2024-01')
    await user.type(screen.getByLabelText('Transcript Count'), '25')
    
    // Clear form
    const clearButton = screen.getByRole('button', { name: 'Clear' })
    await user.click(clearButton)
    
    expect(screen.getByLabelText('Client Name')).toHaveValue('')
    expect(screen.getByLabelText('Month')).toHaveValue('')
    expect(screen.getByLabelText('Transcript Count')).toHaveValue(0)
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    render(<TranscriptForm onSubmit={mockOnSubmit} loading />)
    
    const submitButton = screen.getByRole('button', { name: 'Adding...' })
    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveAttribute('data-loading', 'true')
  })

  it('clears errors when user starts typing', async () => {
    const user = userEvent.setup()
    render(<TranscriptForm onSubmit={mockOnSubmit} />)
    
    // Trigger validation error
    const submitButton = screen.getByRole('button', { name: 'Add Transcript Data' })
    await user.click(submitButton)
    
    expect(screen.getByRole('alert', { name: 'Client name is required' })).toBeInTheDocument()
    
    // Start typing to clear error
    const clientNameInput = screen.getByLabelText('Client Name')
    await user.type(clientNameInput, 'T')
    
    expect(screen.queryByRole('alert', { name: 'Client name is required' })).not.toBeInTheDocument()
  })

  it('populates form with initial data', () => {
    const initialData = {
      clientName: 'Initial Client',
      month: '2024-02',
      transcriptCount: 15,
      notes: 'Initial notes'
    }
    
    render(<TranscriptForm onSubmit={mockOnSubmit} initialData={initialData} />)
    
    expect(screen.getByLabelText('Client Name')).toHaveValue('Initial Client')
    expect(screen.getByLabelText('Month')).toHaveValue('2024-02')
    expect(screen.getByLabelText('Transcript Count')).toHaveValue(15)
    expect(screen.getByLabelText('Notes (Optional)')).toHaveValue('Initial notes')
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)
    
    render(<TranscriptForm onSubmit={mockOnSubmit} />)
    
    // Fill and submit form
    await user.type(screen.getByLabelText('Client Name'), 'Test Client')
    await user.type(screen.getByLabelText('Month'), '2024-01')
    await user.type(screen.getByLabelText('Transcript Count'), '25')
    
    const submitButton = screen.getByRole('button', { name: 'Add Transcript Data' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Client Name')).toHaveValue('')
      expect(screen.getByLabelText('Month')).toHaveValue('')
      expect(screen.getByLabelText('Transcript Count')).toHaveValue(0)
    })
  })
})