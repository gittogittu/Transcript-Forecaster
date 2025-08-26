import React from 'react'
import { render, screen } from '@testing-library/react'
import { MobileDataTable } from '../mobile-data-table'
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
    updatedAt: new Date('2024-02-20')
  }
]

describe('MobileDataTable', () => {
  it('renders mobile cards with data correctly', () => {
    render(<MobileDataTable data={mockData} />)
    
    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.getByText('Client B')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('January 2024')).toBeInTheDocument()
    expect(screen.getByText('February 2024')).toBeInTheDocument()
  })

  it('displays loading skeletons when loading', () => {
    render(<MobileDataTable data={[]} loading={true} />)
    
    // Should show skeleton cards - check for skeleton class instead of testid
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('displays empty state when no data is provided', () => {
    render(<MobileDataTable data={[]} />)
    
    expect(screen.getByText('No transcript data available')).toBeInTheDocument()
  })

  it('formats month correctly', () => {
    render(<MobileDataTable data={mockData} />)
    
    // Should format "2024-01" as "January 2024"
    expect(screen.getByText('January 2024')).toBeInTheDocument()
    expect(screen.getByText('February 2024')).toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    render(<MobileDataTable data={mockData} />)
    
    // Check if dates are formatted properly
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
    expect(screen.getByText('Jan 20, 2024')).toBeInTheDocument()
  })

  it('displays notes when available', () => {
    render(<MobileDataTable data={mockData} />)
    
    expect(screen.getByText('Test note A')).toBeInTheDocument()
  })

  it('handles missing notes gracefully', () => {
    render(<MobileDataTable data={mockData} />)
    
    // Client B has no notes, should not show notes section
    const clientBCard = screen.getByText('Client B').closest('[class*="card"]')
    expect(clientBCard).not.toHaveTextContent('Test note')
  })

  it('displays transcript count as badge', () => {
    render(<MobileDataTable data={mockData} />)
    
    // Counts should be displayed as badges - check for badge data attribute
    const badges = document.querySelectorAll('[data-slot="badge"]')
    expect(badges.length).toBe(2) // One for each client
    expect(badges[0]).toHaveTextContent('150')
    expect(badges[1]).toHaveTextContent('200')
  })

  it('shows created and updated dates in separate sections', () => {
    render(<MobileDataTable data={mockData} />)
    
    // Should show both "Created" and "Updated" labels
    expect(screen.getAllByText('Created')).toHaveLength(2) // One for each card
    expect(screen.getAllByText('Updated')).toHaveLength(2)
  })

  it('applies hover effects to cards', () => {
    render(<MobileDataTable data={mockData} />)
    
    // Check for cards with hover classes
    const cards = document.querySelectorAll('.hover\\:shadow-md')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('uses appropriate icons for different sections', () => {
    render(<MobileDataTable data={mockData} />)
    
    // Icons should be present - check for lucide icon classes
    const userIcons = document.querySelectorAll('.lucide-user')
    const calendarIcons = document.querySelectorAll('.lucide-calendar')
    const clockIcons = document.querySelectorAll('.lucide-clock')
    
    expect(userIcons.length).toBeGreaterThan(0)
    expect(calendarIcons.length).toBeGreaterThan(0)
    expect(clockIcons.length).toBeGreaterThan(0)
  })

  it('handles large transcript counts with proper formatting', () => {
    const dataWithLargeCount: TranscriptData[] = [{
      id: '1',
      clientName: 'Client A',
      month: '2024-01',
      year: 2024,
      transcriptCount: 1500000, // 1.5 million
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20')
    }]
    
    render(<MobileDataTable data={dataWithLargeCount} />)
    
    // Should format large numbers with commas
    expect(screen.getByText('1,500,000')).toBeInTheDocument()
  })

  it('maintains proper spacing and layout structure', () => {
    render(<MobileDataTable data={mockData} />)
    
    // Check that container has proper spacing
    const container = document.querySelector('.space-y-4')
    expect(container).toBeInTheDocument()
  })

  it('handles edge case with missing id gracefully', () => {
    const dataWithoutId: TranscriptData[] = [{
      clientName: 'Client A',
      month: '2024-01',
      year: 2024,
      transcriptCount: 150,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20')
    }]
    
    // Should not throw error and should render
    expect(() => render(<MobileDataTable data={dataWithoutId} />)).not.toThrow()
    expect(screen.getByText('Client A')).toBeInTheDocument()
  })
})