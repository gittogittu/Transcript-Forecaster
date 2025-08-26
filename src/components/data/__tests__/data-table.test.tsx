import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from '../data-table'
import { TranscriptData } from '@/types/transcript'

// Mock data
const mockData: TranscriptData[] = [
  {
    id: '1',
    clientName: 'Client A',
    month: '2024-01',
    year: 2024,
    transcriptCount: 150,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    notes: 'Test note A'
  },
  {
    id: '2',
    clientName: 'Client B',
    month: '2024-02',
    year: 2024,
    transcriptCount: 200,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-20'),
    notes: 'Test note B'
  },
  {
    id: '3',
    clientName: 'Client C',
    month: '2024-03',
    year: 2024,
    transcriptCount: 100,
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-03-20')
  }
]

describe('DataTable', () => {
  const user = userEvent.setup()

  it('renders table with data correctly', () => {
    render(<DataTable data={mockData} />)
    
    expect(screen.getByText('Historical Transcript Data')).toBeInTheDocument()
    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.getByText('Client B')).toBeInTheDocument()
    expect(screen.getByText('Client C')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('displays loading skeletons when loading', () => {
    render(<DataTable data={[]} loading={true} />)
    
    // Should show skeleton rows - check for skeleton class instead of testid
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('displays error message when error occurs', () => {
    const errorMessage = 'Failed to load data'
    const mockRefresh = jest.fn()
    render(<DataTable data={[]} error={errorMessage} onRefresh={mockRefresh} />)
    
    expect(screen.getByText(`Error loading data: ${errorMessage}`)).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('calls onRefresh when refresh button is clicked', async () => {
    const mockRefresh = jest.fn()
    render(<DataTable data={mockData} onRefresh={mockRefresh} />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)
    
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('filters data based on search term', async () => {
    render(<DataTable data={mockData} />)
    
    const searchInput = screen.getByPlaceholderText('Search clients, months, or notes...')
    await user.type(searchInput, 'Client A')
    
    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.queryByText('Client B')).not.toBeInTheDocument()
    expect(screen.queryByText('Client C')).not.toBeInTheDocument()
  })

  it('sorts data when column headers are clicked', async () => {
    render(<DataTable data={mockData} />)
    
    const clientNameHeader = screen.getByText('Client Name')
    await user.click(clientNameHeader)
    
    // Check if data is sorted (Client A should be first)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Client A') // First data row (index 1, header is 0)
  })

  it('shows pagination controls when there is enough data', () => {
    // Create more data to show pagination controls
    const moreData = Array.from({ length: 30 }, (_, i) => ({
      id: `${i + 1}`,
      clientName: `Client ${i + 1}`,
      month: '2024-01',
      year: 2024,
      transcriptCount: 100 + i,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20')
    }))
    
    render(<DataTable data={moreData} />)
    
    // Should show pagination controls
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Rows per page:')).toBeInTheDocument()
  })

  it('navigates between pages correctly', async () => {
    // Create more data to test pagination
    const moreData = Array.from({ length: 30 }, (_, i) => ({
      id: `${i + 1}`,
      clientName: `Client ${i + 1}`,
      month: '2024-01',
      year: 2024,
      transcriptCount: 100 + i,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20')
    }))
    
    render(<DataTable data={moreData} />)
    
    // Should show pagination controls
    const nextButton = screen.getByText('Next')
    expect(nextButton).toBeInTheDocument()
    
    await user.click(nextButton)
    
    // Should be on page 2
    expect(screen.getByText('2')).toHaveClass('bg-primary') // Active page button
  })

  it('applies date range filters correctly', async () => {
    render(<DataTable data={mockData} />)
    
    const startMonthInput = screen.getByPlaceholderText('Start month')
    await user.type(startMonthInput, '2024-02')
    
    // Should only show data from February onwards
    expect(screen.queryByText('Client A')).not.toBeInTheDocument() // January data
    expect(screen.getByText('Client B')).toBeInTheDocument() // February data
    expect(screen.getByText('Client C')).toBeInTheDocument() // March data
  })

  it('applies count range filters correctly', async () => {
    render(<DataTable data={mockData} />)
    
    const minCountInput = screen.getByPlaceholderText('Min count')
    await user.type(minCountInput, '150')
    
    // Should only show data with count >= 150
    expect(screen.getByText('Client A')).toBeInTheDocument() // 150
    expect(screen.getByText('Client B')).toBeInTheDocument() // 200
    expect(screen.queryByText('Client C')).not.toBeInTheDocument() // 100
  })

  it('clears all filters when clear button is clicked', async () => {
    render(<DataTable data={mockData} />)
    
    // Apply some filters
    const searchInput = screen.getByPlaceholderText('Search clients, months, or notes...')
    await user.type(searchInput, 'Client A')
    
    const clientNameFilter = screen.getByPlaceholderText('Client name...')
    await user.type(clientNameFilter, 'Test')
    
    // Clear filters
    const clearButton = screen.getByText('Clear Filters')
    await user.click(clearButton)
    
    // All inputs should be cleared
    expect(searchInput).toHaveValue('')
    expect(clientNameFilter).toHaveValue('')
    
    // All data should be visible again
    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.getByText('Client B')).toBeInTheDocument()
    expect(screen.getByText('Client C')).toBeInTheDocument()
  })

  it('displays empty state when no data matches filters', async () => {
    render(<DataTable data={mockData} />)
    
    const searchInput = screen.getByPlaceholderText('Search clients, months, or notes...')
    await user.type(searchInput, 'NonexistentClient')
    
    expect(screen.getByText('No data matches your filters')).toBeInTheDocument()
  })

  it('displays empty state when no data is provided', () => {
    render(<DataTable data={[]} />)
    
    expect(screen.getByText('No transcript data available')).toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    render(<DataTable data={mockData} />)
    
    // Check if dates are formatted properly (should show month abbreviation)
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
    expect(screen.getByText('Jan 20, 2024')).toBeInTheDocument()
  })

  it('truncates long notes with title attribute', () => {
    const dataWithLongNote: TranscriptData[] = [{
      id: '1',
      clientName: 'Client A',
      month: '2024-01',
      year: 2024,
      transcriptCount: 150,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
      notes: 'This is a very long note that should be truncated in the table display but available in the title attribute for accessibility'
    }]
    
    render(<DataTable data={dataWithLongNote} />)
    
    const noteCell = screen.getByTitle(dataWithLongNote[0].notes!)
    expect(noteCell).toBeInTheDocument()
  })

  it('handles sorting by different data types correctly', async () => {
    render(<DataTable data={mockData} />)
    
    // Test sorting by transcript count (number)
    const countHeader = screen.getByText('Transcript Count')
    await user.click(countHeader)
    
    // Should sort numerically, not alphabetically
    const rows = screen.getAllByRole('row')
    // First data row should have the lowest count (100)
    expect(rows[1]).toHaveTextContent('100')
  })

  it('maintains sort direction when switching between columns', async () => {
    render(<DataTable data={mockData} />)
    
    // Sort by client name ascending
    const clientNameHeader = screen.getByText('Client Name')
    await user.click(clientNameHeader)
    
    // Sort by count - should default to ascending
    const countHeader = screen.getByText('Transcript Count')
    await user.click(countHeader)
    
    // Click count again - should be descending
    await user.click(countHeader)
    
    const rows = screen.getAllByRole('row')
    // First data row should have the highest count (200)
    expect(rows[1]).toHaveTextContent('200')
  })
})