import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SpreadsheetGrid } from '../spreadsheet-grid'
import { TranscriptData, Client } from '@/types/transcript'

// Mock the hooks
jest.mock('@/lib/hooks/use-optimistic-updates', () => ({
  useOptimisticMutations: () => ({
    updateTranscriptOptimistic: {
      mutate: jest.fn(),
      isLoading: false,
      error: null
    },
    deleteTranscriptOptimistic: {
      mutate: jest.fn(),
      isLoading: false,
      error: null
    }
  })
}))

jest.mock('@/lib/hooks/use-debounce', () => ({
  useDebounce: (callback: Function, delay: number) => callback
}))

// Mock animation components
jest.mock('@/components/animations', () => ({
  FadeInView: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AnimatedButton: ({ children, ...props }: any) => <button {...props}>{children}</button>
}))

// Test data
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Client A',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Client B',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]

const mockTranscripts: TranscriptData[] = [
  {
    id: '1',
    clientId: '1',
    clientName: 'Client A',
    date: new Date('2024-01-15'),
    transcriptCount: 100,
    transcriptType: 'Medical',
    notes: 'Test note 1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'user1'
  },
  {
    id: '2',
    clientId: '2',
    clientName: 'Client B',
    date: new Date('2024-01-16'),
    transcriptCount: 150,
    transcriptType: 'Legal',
    notes: 'Test note 2',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    createdBy: 'user1'
  }
]

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('SpreadsheetGrid', () => {
  const defaultProps = {
    data: mockTranscripts,
    clients: mockClients,
    onCellEdit: jest.fn(),
    onRowAdd: jest.fn(),
    onRowDelete: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the spreadsheet with data', () => {
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByText('Transcript Data Spreadsheet')).toBeInTheDocument()
      expect(screen.getByText('Client A')).toBeInTheDocument()
      expect(screen.getByText('Client B')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
    })

    it('renders column headers correctly', () => {
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByText('Client Name')).toBeInTheDocument()
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Transcript Count')).toBeInTheDocument()
      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getByText('Notes')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })

    it('shows loading state', () => {
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} loading={true} />
        </TestWrapper>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('shows error state', () => {
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} error="Test error" />
        </TestWrapper>
      )

      expect(screen.getByText(/Error loading spreadsheet: Test error/)).toBeInTheDocument()
    })

    it('renders in read-only mode', () => {
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} readOnly={true} />
        </TestWrapper>
      )

      expect(screen.queryByText('Add Row')).not.toBeInTheDocument()
    })
  })

  describe('Cell Interaction', () => {
    it('selects cell on click', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} />
        </TestWrapper>
      )

      const clientCell = screen.getByText('Client A')
      await user.click(clientCell)

      // Cell should be visually selected (this would need CSS class checking in real implementation)
      expect(clientCell.closest('td')).toHaveClass('ring-2', 'ring-blue-500')
    })

    it('enters edit mode on double click', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} />
        </TestWrapper>
      )

      const clientCell = screen.getByText('Client A')
      await user.dblClick(clientCell)

      // Should show select dropdown for client name
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('calls onCellEdit when cell value changes', async () => {
      const user = userEvent.setup()
      const onCellEdit = jest.fn().mockResolvedValue(undefined)
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} onCellEdit={onCellEdit} />
        </TestWrapper>
      )

      // Double click to edit transcript count
      const countCell = screen.getByText('100')
      await user.dblClick(countCell)

      // Find the input and change value
      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, '200')
      
      // Blur to trigger save
      await user.tab()

      await waitFor(() => {
        expect(onCellEdit).toHaveBeenCalledWith('1', 'transcriptCount', 200)
      })
    })

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} />
        </TestWrapper>
      )

      const clientCell = screen.getByText('Client A')
      await user.click(clientCell)

      // Press Tab to move to next cell
      await user.keyboard('{Tab}')

      // Should move to date cell (this would need more sophisticated testing in real implementation)
    })

    it('saves on Enter key', async () => {
      const user = userEvent.setup()
      const onCellEdit = jest.fn().mockResolvedValue(undefined)
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} onCellEdit={onCellEdit} />
        </TestWrapper>
      )

      const countCell = screen.getByText('100')
      await user.dblClick(countCell)

      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, '200')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(onCellEdit).toHaveBeenCalledWith('1', 'transcriptCount', 200)
      })
    })

    it('cancels edit on Escape key', async () => {
      const user = userEvent.setup()
      const onCellEdit = jest.fn()
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} onCellEdit={onCellEdit} />
        </TestWrapper>
      )

      const countCell = screen.getByText('100')
      await user.dblClick(countCell)

      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, '200')
      await user.keyboard('{Escape}')

      // Should not call onCellEdit
      expect(onCellEdit).not.toHaveBeenCalled()
      // Should show original value
      expect(screen.getByText('100')).toBeInTheDocument()
    })
  })

  describe('Row Operations', () => {
    it('shows add row interface when Add Row is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} />
        </TestWrapper>
      )

      const addButton = screen.getByText('Add Row')
      await user.click(addButton)

      // Should show new row inputs
      expect(screen.getByPlaceholderText('Enter client name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter date')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter transcript count')).toBeInTheDocument()
    })

    it('calls onRowAdd when new row is saved', async () => {
      const user = userEvent.setup()
      const onRowAdd = jest.fn().mockResolvedValue(undefined)
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} onRowAdd={onRowAdd} />
        </TestWrapper>
      )

      const addButton = screen.getByText('Add Row')
      await user.click(addButton)

      // Fill in new row data
      await user.type(screen.getByPlaceholderText('Enter client name'), 'New Client')
      await user.type(screen.getByPlaceholderText('Enter date'), '2024-02-01')
      await user.type(screen.getByPlaceholderText('Enter transcript count'), '75')

      // Click save button (check mark)
      const saveButton = screen.getByRole('button', { name: /check/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(onRowAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            clientName: 'New Client',
            date: new Date('2024-02-01'),
            transcriptCount: 75
          })
        )
      })
    })

    it('calls onRowDelete when delete button is clicked', async () => {
      const user = userEvent.setup()
      const onRowDelete = jest.fn().mockResolvedValue(undefined)
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} onRowDelete={onRowDelete} />
        </TestWrapper>
      )

      // Find delete button for first row
      const deleteButtons = screen.getAllByRole('button', { name: /trash/i })
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(onRowDelete).toHaveBeenCalledWith('1')
      })
    })
  })

  describe('Sorting', () => {
    it('sorts data when column header is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} />
        </TestWrapper>
      )

      const clientNameHeader = screen.getByText('Client Name')
      await user.click(clientNameHeader)

      // Should show sort indicator
      expect(screen.getByTestId('sort-arrow-up')).toBeInTheDocument()

      // Click again to reverse sort
      await user.click(clientNameHeader)
      expect(screen.getByTestId('sort-arrow-down')).toBeInTheDocument()
    })

    it('sorts numeric columns correctly', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} />
        </TestWrapper>
      )

      const countHeader = screen.getByText('Transcript Count')
      await user.click(countHeader)

      // After sorting ascending, 100 should come before 150
      const rows = screen.getAllByRole('row')
      const firstDataRow = rows[1] // Skip header row
      expect(firstDataRow).toHaveTextContent('100')
    })
  })

  describe('Validation', () => {
    it('shows validation error for invalid data', async () => {
      const user = userEvent.setup()
      const onCellEdit = jest.fn().mockRejectedValue(new Error('Invalid value'))
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} onCellEdit={onCellEdit} />
        </TestWrapper>
      )

      const countCell = screen.getByText('100')
      await user.dblClick(countCell)

      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, '-50') // Invalid negative value
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText('Invalid value')).toBeInTheDocument()
      })
    })

    it('prevents editing in read-only mode', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} readOnly={true} />
        </TestWrapper>
      )

      const clientCell = screen.getByText('Client A')
      await user.dblClick(clientCell)

      // Should not enter edit mode
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })
  })

  describe('Auto-save', () => {
    it('auto-saves after debounce delay', async () => {
      const user = userEvent.setup()
      const onCellEdit = jest.fn().mockResolvedValue(undefined)
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} onCellEdit={onCellEdit} />
        </TestWrapper>
      )

      const countCell = screen.getByText('100')
      await user.dblClick(countCell)

      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, '200')

      // Wait for debounced save (mocked to be immediate)
      await waitFor(() => {
        expect(onCellEdit).toHaveBeenCalledWith('1', 'transcriptCount', 200)
      })
    })

    it('shows dirty state indicator', async () => {
      const user = userEvent.setup()
      const onCellEdit = jest.fn().mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} onCellEdit={onCellEdit} />
        </TestWrapper>
      )

      const countCell = screen.getByText('100')
      await user.dblClick(countCell)

      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, '200')

      // Should show dirty indicator
      expect(screen.getByText('1 unsaved')).toBeInTheDocument()
    })
  })

  describe('Status Indicators', () => {
    it('shows row count in status bar', () => {
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByText('2 rows')).toBeInTheDocument()
    })

    it('shows keyboard shortcuts help', () => {
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByText(/Double-click to edit • Tab to navigate • Enter to save • Esc to cancel/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(6)
      expect(screen.getAllByRole('row')).toHaveLength(3) // Header + 2 data rows
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SpreadsheetGrid {...defaultProps} />
        </TestWrapper>
      )

      const table = screen.getByRole('table')
      await user.click(table)

      // Should be able to navigate with arrow keys
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowRight}')
      await user.keyboard('{Enter}')

      // This would need more sophisticated testing in a real implementation
    })
  })
})