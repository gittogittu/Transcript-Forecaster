import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SpreadsheetGrid } from '../spreadsheet-grid'
import { TranscriptData, Client } from '@/types/transcript'

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock the hooks with more realistic implementations
jest.mock('@/lib/hooks/use-optimistic-updates', () => ({
  useOptimisticMutations: () => ({
    updateTranscriptOptimistic: {
      mutate: jest.fn((variables) => {
        // Simulate optimistic update
        return Promise.resolve()
      }),
      isLoading: false,
      error: null
    },
    deleteTranscriptOptimistic: {
      mutate: jest.fn(() => Promise.resolve()),
      isLoading: false,
      error: null
    }
  })
}))

// Mock debounce to execute immediately for testing
jest.mock('@/lib/hooks/use-debounce', () => ({
  useDebounce: (callback: Function, delay: number) => {
    return (...args: any[]) => {
      // Execute immediately in tests
      setTimeout(() => callback(...args), 0)
    }
  }
}))

// Mock animation components
jest.mock('@/components/animations', () => ({
  FadeInView: ({ children }: { children: React.ReactNode }) => <div data-testid="fade-in-view">{children}</div>,
  AnimatedButton: ({ children, ...props }: any) => <button {...props}>{children}</button>
}))

// Test data
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Acme Corp',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Beta Inc',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '3',
    name: 'Gamma LLC',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]

const mockTranscripts: TranscriptData[] = [
  {
    id: '1',
    clientId: '1',
    clientName: 'Acme Corp',
    date: new Date('2024-01-15'),
    transcriptCount: 100,
    transcriptType: 'Medical',
    notes: 'Initial batch of medical transcripts',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'user1'
  },
  {
    id: '2',
    clientId: '2',
    clientName: 'Beta Inc',
    date: new Date('2024-01-16'),
    transcriptCount: 150,
    transcriptType: 'Legal',
    notes: 'Legal document transcription',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    createdBy: 'user1'
  },
  {
    id: '3',
    clientId: '1',
    clientName: 'Acme Corp',
    date: new Date('2024-01-17'),
    transcriptCount: 75,
    transcriptType: 'Medical',
    notes: 'Follow-up medical transcripts',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    createdBy: 'user1'
  }
]

// Test wrapper with React Query
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

describe('Spreadsheet Integration Tests', () => {
  let mockOnCellEdit: jest.Mock
  let mockOnRowAdd: jest.Mock
  let mockOnRowDelete: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnCellEdit = jest.fn().mockResolvedValue(undefined)
    mockOnRowAdd = jest.fn().mockResolvedValue(undefined)
    mockOnRowDelete = jest.fn().mockResolvedValue(undefined)
  })

  const renderSpreadsheet = (props = {}) => {
    const defaultProps = {
      data: mockTranscripts,
      clients: mockClients,
      onCellEdit: mockOnCellEdit,
      onRowAdd: mockOnRowAdd,
      onRowDelete: mockOnRowDelete,
      ...props
    }

    return render(
      <TestWrapper>
        <SpreadsheetGrid {...defaultProps} />
      </TestWrapper>
    )
  }

  describe('Complete User Workflows', () => {
    it('allows user to edit transcript count and auto-saves', async () => {
      const user = userEvent.setup()
      renderSpreadsheet()

      // Find and double-click the transcript count cell
      const countCell = screen.getByText('100')
      await user.dblClick(countCell)

      // Should show input field
      const input = screen.getByDisplayValue('100')
      expect(input).toBeInTheDocument()

      // Change the value
      await user.clear(input)
      await user.type(input, '125')

      // Wait for auto-save (debounced)
      await waitFor(() => {
        expect(mockOnCellEdit).toHaveBeenCalledWith('1', 'transcriptCount', 125)
      }, { timeout: 2000 })
    })

    it('allows user to change client name via dropdown', async () => {
      const user = userEvent.setup()
      renderSpreadsheet()

      // Find and double-click client name cell
      const clientCell = screen.getByText('Acme Corp')
      await user.dblClick(clientCell)

      // Should show select dropdown
      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()

      // Open dropdown and select different client
      await user.click(select)
      const betaOption = screen.getByText('Beta Inc')
      await user.click(betaOption)

      // Should trigger save
      await waitFor(() => {
        expect(mockOnCellEdit).toHaveBeenCalledWith('1', 'clientName', 'Beta Inc')
      })
    })

    it('allows user to edit date field', async () => {
      const user = userEvent.setup()
      renderSpreadsheet()

      // Find date cell (formatted date display)
      const dateCell = screen.getByText('1/15/2024') // Assuming this format
      await user.dblClick(dateCell)

      // Should show date input
      const dateInput = screen.getByDisplayValue('2024-01-15')
      expect(dateInput).toBeInTheDocument()

      // Change the date
      await user.clear(dateInput)
      await user.type(dateInput, '2024-02-01')

      // Blur to save
      await user.tab()

      await waitFor(() => {
        expect(mockOnCellEdit).toHaveBeenCalledWith('1', 'date', new Date('2024-02-01'))
      })
    })

    it('allows user to add new row with complete data', async () => {
      const user = userEvent.setup()
      renderSpreadsheet()

      // Click Add Row button
      const addButton = screen.getByText('Add Row')
      await user.click(addButton)

      // Should show new row inputs
      expect(screen.getByPlaceholderText('Enter client name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter date')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter transcript count')).toBeInTheDocument()

      // Fill in all required fields
      await user.type(screen.getByPlaceholderText('Enter client name'), 'New Client Corp')
      await user.type(screen.getByPlaceholderText('Enter date'), '2024-02-15')
      await user.type(screen.getByPlaceholderText('Enter transcript count'), '200')
      await user.type(screen.getByPlaceholderText('Enter type'), 'Business')
      await user.type(screen.getByPlaceholderText('Enter notes'), 'New business transcripts')

      // Click save (check mark)
      const saveButton = screen.getByRole('button', { name: /check/i })
      await user.click(saveButton)

      // Should call onRowAdd with correct data
      await waitFor(() => {
        expect(mockOnRowAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            clientName: 'New Client Corp',
            date: new Date('2024-02-15'),
            transcriptCount: 200,
            transcriptType: 'Business',
            notes: 'New business transcripts'
          })
        )
      })
    })

    it('allows user to delete a row', async () => {
      const user = userEvent.setup()
      renderSpreadsheet()

      // Find delete button for first row
      const deleteButtons = screen.getAllByRole('button', { name: /trash/i })
      expect(deleteButtons).toHaveLength(3) // One for each row

      // Click delete for first row
      await user.click(deleteButtons[0])

      // Should call onRowDelete
      await waitFor(() => {
        expect(mockOnRowDelete).toHaveBeenCalledWith('1')
      })
    })
  })

  describe('Keyboard Navigation Workflows', () => {
    it('supports full keyboard navigation workflow', async () => {
      const user = userEvent.setup()
      renderSpreadsheet()

      // Click on first cell to focus the grid
      const firstCell = screen.getByText('Acme Corp')
      await user.click(firstCell)

      // Navigate with Tab key
      await user.keyboard('{Tab}')
      // Should move to date column

      // Navigate with Arrow keys
      await user.keyboard('{ArrowDown}')
      // Should move to next row

      await user.keyboard('{ArrowRight}')
      // Should move to next column

      // Start editing with Enter
      await user.keyboard('{Enter}')
      // Should enter edit mode for current cell

      // Cancel with Escape
      await user.keyboard('{Escape}')
      // Should exit edit mode
    })

    it('handles keyboard shortcuts for save operations', async () => {
      const user = userEvent.setup()
      renderSpreadsheet()

      // Start editing a cell
      const countCell = screen.getByText('100')
      await user.dblClick(countCell)

      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, '150')

      // Use Ctrl+S to save
      await user.keyboard('{Control>}s{/Control}')

      await waitFor(() => {
        expect(mockOnCellEdit).toHaveBeenCalledWith('1', 'transcriptCount', 150)
      })
    })
  })

  describe('Data Validation Workflows', () => {
    it('handles validation errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock onCellEdit to reject with validation error
      mockOnCellEdit.mockRejectedValueOnce(new Error('Transcript count must be positive'))
      
      renderSpreadsheet()

      // Edit transcript count with invalid value
      const countCell = screen.getByText('100')
      await user.dblClick(countCell)

      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, '-50')
      await user.tab()

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('Transcript count must be positive')).toBeInTheDocument()
      })

      // Cell should have error styling
      const cellElement = countCell.closest('td')
      expect(cellElement).toHaveClass('bg-red-50')
    })

    it('prevents saving invalid data in new rows', async () => {
      const user = userEvent.setup()
      renderSpreadsheet()

      // Start adding new row
      await user.click(screen.getByText('Add Row'))

      // Try to save without required fields
      const saveButton = screen.getByRole('button', { name: /check/i })
      await user.click(saveButton)

      // Should not call onRowAdd due to validation
      expect(mockOnRowAdd).not.toHaveBeenCalled()
    })
  })

  describe('Sorting and Filtering Workflows', () => {
    it('sorts data when column headers are clicked', async () => {
      const user = userEvent.setup()
      renderSpreadsheet()

      // Click on Client Name header to sort
      const clientHeader = screen.getByText('Client Name')
      await user.click(clientHeader)

      // Should show sort indicator
      const sortIcon = clientHeader.querySelector('svg')
      expect(sortIcon).toBeInTheDocument()

      // Data should be reordered (Acme Corp should come before Beta Inc)
      const rows = screen.getAllByRole('row')
      const firstDataRow = rows[1] // Skip header
      expect(firstDataRow).toHaveTextContent('Acme Corp')

      // Click again to reverse sort
      await user.click(clientHeader)

      // Should reverse the order
      const rowsAfterReverse = screen.getAllByRole('row')
      const firstRowAfterReverse = rowsAfterReverse[1]
      expect(firstRowAfterReverse).toHaveTextContent('Beta Inc')
    })

    it('sorts numeric columns correctly', async () => {
      const user = userEvent.setup()
      renderSpreadsheet()

      // Click on Transcript Count header
      const countHeader = screen.getByText('Transcript Count')
      await user.click(countHeader)

      // Should sort numerically (75, 100, 150)
      const rows = screen.getAllByRole('row')
      const firstDataRow = rows[1]
      expect(firstDataRow).toHaveTextContent('75')
    })
  })

  describe('Auto-save and Sync Workflows', () => {
    it('shows dirty state indicators during editing', async () => {
      const user = userEvent.setup()
      
      // Mock onCellEdit to never resolve (simulate slow save)
      mockOnCellEdit.mockImplementation(() => new Promise(() => {}))
      
      renderSpreadsheet()

      // Start editing
      const countCell = screen.getByText('100')
      await user.dblClick(countCell)

      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, '125')

      // Should show dirty indicator
      await waitFor(() => {
        expect(screen.getByText('1 unsaved')).toBeInTheDocument()
      })

      // Cell should have dirty styling
      const cellElement = countCell.closest('td')
      expect(cellElement).toHaveClass('bg-yellow-50')
    })

    it('handles concurrent edits properly', async () => {
      const user = userEvent.setup()
      renderSpreadsheet()

      // Start editing multiple cells
      const countCell1 = screen.getByText('100')
      const countCell2 = screen.getByText('150')

      // Edit first cell
      await user.dblClick(countCell1)
      const input1 = screen.getByDisplayValue('100')
      await user.clear(input1)
      await user.type(input1, '110')
      await user.tab()

      // Edit second cell
      await user.dblClick(countCell2)
      const input2 = screen.getByDisplayValue('150')
      await user.clear(input2)
      await user.type(input2, '160')
      await user.tab()

      // Both should be saved
      await waitFor(() => {
        expect(mockOnCellEdit).toHaveBeenCalledWith('1', 'transcriptCount', 110)
        expect(mockOnCellEdit).toHaveBeenCalledWith('2', 'transcriptCount', 160)
      })
    })
  })

  describe('Error Recovery Workflows', () => {
    it('recovers from network errors', async () => {
      const user = userEvent.setup()
      
      // First call fails, second succeeds
      mockOnCellEdit
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined)
      
      renderSpreadsheet()

      // Edit cell
      const countCell = screen.getByText('100')
      await user.dblClick(countCell)

      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, '125')
      await user.tab()

      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Try editing again (retry)
      await user.dblClick(countCell)
      const retryInput = screen.getByDisplayValue('100') // Should still show original value
      await user.clear(retryInput)
      await user.type(retryInput, '125')
      await user.tab()

      // Should succeed this time
      await waitFor(() => {
        expect(mockOnCellEdit).toHaveBeenCalledTimes(2)
      })
    })

    it('handles optimistic update rollback', async () => {
      const user = userEvent.setup()
      
      // Mock optimistic update that fails
      mockOnCellEdit.mockRejectedValueOnce(new Error('Save failed'))
      
      renderSpreadsheet()

      const countCell = screen.getByText('100')
      await user.dblClick(countCell)

      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, '125')
      await user.tab()

      // Should show error and rollback to original value
      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument()
        expect(screen.getByText('100')).toBeInTheDocument() // Original value restored
      })
    })
  })

  describe('Accessibility Workflows', () => {
    it('supports screen reader navigation', () => {
      renderSpreadsheet()

      // Check ARIA labels and roles
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(6)
      expect(screen.getAllByRole('row')).toHaveLength(4) // Header + 3 data rows

      // Check that cells are properly labeled
      const cells = screen.getAllByRole('cell')
      expect(cells.length).toBeGreaterThan(0)
    })

    it('maintains focus management during editing', async () => {
      const user = userEvent.setup()
      renderSpreadsheet()

      // Focus should move properly during editing
      const countCell = screen.getByText('100')
      await user.dblClick(countCell)

      const input = screen.getByDisplayValue('100')
      expect(input).toHaveFocus()

      // After saving, focus should return to cell
      await user.keyboard('{Enter}')
      
      // Focus management would need more sophisticated testing in real implementation
    })
  })

  describe('Performance Workflows', () => {
    it('handles large datasets efficiently', () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        clientId: `${(i % 10) + 1}`,
        clientName: `Client ${(i % 10) + 1}`,
        date: new Date(2024, 0, (i % 30) + 1),
        transcriptCount: Math.floor(Math.random() * 1000),
        transcriptType: ['Medical', 'Legal', 'Business'][i % 3],
        notes: `Note ${i + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1'
      }))

      const startTime = performance.now()
      
      renderSpreadsheet({ data: largeDataset })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000) // 1 second

      // Should still show correct number of rows
      expect(screen.getByText('1000 rows')).toBeInTheDocument()
    })
  })
})