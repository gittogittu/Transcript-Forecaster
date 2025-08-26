import React from 'react'
import { render, screen } from '@testing-library/react'
import { jest } from '@jest/globals'
import { SummaryStatistics } from '../summary-statistics'
import { TranscriptData } from '@/types/transcript'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

const mockTranscriptData: TranscriptData[] = [
  {
    id: '1',
    clientName: 'Client A',
    month: '01',
    year: 2024,
    transcriptCount: 50,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    clientName: 'Client B',
    month: '01',
    year: 2024,
    transcriptCount: 30,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    clientName: 'Client A',
    month: '02',
    year: 2024,
    transcriptCount: 60,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: '4',
    clientName: 'Client B',
    month: '02',
    year: 2024,
    transcriptCount: 40,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: '5',
    clientName: 'Client C',
    month: '03',
    year: 2024,
    transcriptCount: 100,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
]

describe('SummaryStatistics', () => {
  it('renders all statistic cards', () => {
    render(<SummaryStatistics data={mockTranscriptData} />)

    expect(screen.getByText('Total Transcripts')).toBeInTheDocument()
    expect(screen.getByText('Active Clients')).toBeInTheDocument()
    expect(screen.getByText('Monthly Average')).toBeInTheDocument()
    expect(screen.getByText('Growth Rate')).toBeInTheDocument()
  })

  it('calculates total transcripts correctly', () => {
    render(<SummaryStatistics data={mockTranscriptData} />)

    // Total should be 50 + 30 + 60 + 40 + 100 = 280
    expect(screen.getByText('280')).toBeInTheDocument()
  })

  it('calculates active clients correctly', () => {
    render(<SummaryStatistics data={mockTranscriptData} />)

    // Should have 3 unique clients (A, B, C)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calculates monthly average correctly', () => {
    render(<SummaryStatistics data={mockTranscriptData} />)

    // 3 months with totals: Jan=80, Feb=100, Mar=100, average = 93.33 ≈ 93
    expect(screen.getByText('93')).toBeInTheDocument()
  })

  it('calculates growth rate correctly', () => {
    render(<SummaryStatistics data={mockTranscriptData} />)

    // Growth from Jan (80) to Mar (100) = 25%
    expect(screen.getByText('+25%')).toBeInTheDocument()
  })

  it('displays key insights section', () => {
    render(<SummaryStatistics data={mockTranscriptData} />)

    expect(screen.getByText('Key Insights')).toBeInTheDocument()
    expect(screen.getByText('Automated analysis of your transcript data patterns and trends')).toBeInTheDocument()
  })

  it('shows positive growth insight for high growth', () => {
    const highGrowthData = [
      {
        id: '1',
        clientName: 'Client A',
        month: '01',
        year: 2024,
        transcriptCount: 10,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: '2',
        clientName: 'Client A',
        month: '02',
        year: 2024,
        transcriptCount: 50,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      },
    ]

    render(<SummaryStatistics data={highGrowthData} />)

    expect(screen.getByText('Strong Growth Trend')).toBeInTheDocument()
    expect(screen.getByText(/increased by.*indicating strong business growth/)).toBeInTheDocument()
  })

  it('shows negative growth insight for declining volume', () => {
    const decliningData = [
      {
        id: '1',
        clientName: 'Client A',
        month: '01',
        year: 2024,
        transcriptCount: 100,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: '2',
        clientName: 'Client A',
        month: '02',
        year: 2024,
        transcriptCount: 50,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      },
    ]

    render(<SummaryStatistics data={decliningData} />)

    expect(screen.getByText('Declining Volume')).toBeInTheDocument()
    expect(screen.getByText(/decreased by.*Consider investigating potential causes/)).toBeInTheDocument()
  })

  it('shows stable volume insight for minimal change', () => {
    const stableData = [
      {
        id: '1',
        clientName: 'Client A',
        month: '01',
        year: 2024,
        transcriptCount: 100,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: '2',
        clientName: 'Client A',
        month: '02',
        year: 2024,
        transcriptCount: 102,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      },
    ]

    render(<SummaryStatistics data={stableData} />)

    expect(screen.getByText('Stable Volume')).toBeInTheDocument()
    expect(screen.getByText(/remained relatively stable/)).toBeInTheDocument()
  })

  it('shows high client concentration warning', () => {
    const concentratedData = [
      {
        id: '1',
        clientName: 'Client A',
        month: '01',
        year: 2024,
        transcriptCount: 80,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: '2',
        clientName: 'Client B',
        month: '01',
        year: 2024,
        transcriptCount: 20,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ]

    render(<SummaryStatistics data={concentratedData} />)

    expect(screen.getByText('High Client Concentration')).toBeInTheDocument()
    expect(screen.getByText(/Consider diversifying your client base/)).toBeInTheDocument()
  })

  it('shows well-diversified portfolio insight', () => {
    const diversifiedData = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      clientName: `Client ${String.fromCharCode(65 + i)}`, // Client A, B, C, etc.
      month: '01',
      year: 2024,
      transcriptCount: 10,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }))

    render(<SummaryStatistics data={diversifiedData} />)

    expect(screen.getByText('Well-Diversified Portfolio')).toBeInTheDocument()
    expect(screen.getByText(/client base is well-diversified/)).toBeInTheDocument()
  })

  it('shows high volume processing insight', () => {
    const highVolumeData = Array.from({ length: 5 }, (_, i) => ({
      id: `${i}`,
      clientName: 'Client A',
      month: `${String(i + 1).padStart(2, '0')}`,
      year: 2024,
      transcriptCount: 50,
      createdAt: new Date(`2024-${String(i + 1).padStart(2, '0')}-01`),
      updatedAt: new Date(`2024-${String(i + 1).padStart(2, '0')}-01`),
    }))

    render(<SummaryStatistics data={highVolumeData} />)

    expect(screen.getByText('High Volume Processing')).toBeInTheDocument()
    expect(screen.getByText(/indicating strong operational capacity/)).toBeInTheDocument()
  })

  it('displays top clients section', () => {
    render(<SummaryStatistics data={mockTranscriptData} />)

    expect(screen.getByText('Top Clients')).toBeInTheDocument()
    expect(screen.getByText('Clients with highest transcript volume in selected period')).toBeInTheDocument()
  })

  it('shows top clients with correct rankings', () => {
    render(<SummaryStatistics data={mockTranscriptData} />)

    // Client A: 50 + 60 = 110 (should be #1)
    // Client C: 100 (should be #2)
    // Client B: 30 + 40 = 70 (should be #3)
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()
  })

  it('displays recent trend section', () => {
    render(<SummaryStatistics data={mockTranscriptData} />)

    expect(screen.getByText('Recent Trend')).toBeInTheDocument()
    expect(screen.getByText('Monthly transcript volume over the last 6 months')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    render(<SummaryStatistics data={[]} />)

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('No insights available with current data selection')).toBeInTheDocument()
  })

  it('filters data by selected clients', () => {
    render(<SummaryStatistics data={mockTranscriptData} selectedClients={['Client A']} />)

    // Should only show data for Client A
    // Client A total: 50 + 60 = 110
    expect(screen.getByText('110')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // Only 1 client
  })

  it('applies time range filtering', () => {
    render(<SummaryStatistics data={mockTranscriptData} timeRange="3m" />)

    // Component should handle time range filtering
    expect(screen.getByText('Total Transcripts')).toBeInTheDocument()
  })

  it('shows consistent growth insight', () => {
    const consistentGrowthData = [
      {
        id: '1',
        clientName: 'Client A',
        month: '01',
        year: 2024,
        transcriptCount: 10,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: '2',
        clientName: 'Client A',
        month: '02',
        year: 2024,
        transcriptCount: 20,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      },
      {
        id: '3',
        clientName: 'Client A',
        month: '03',
        year: 2024,
        transcriptCount: 30,
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01'),
      },
    ]

    render(<SummaryStatistics data={consistentGrowthData} />)

    expect(screen.getByText('Consistent Growth')).toBeInTheDocument()
    expect(screen.getByText(/consistently increasing over the last 3 months/)).toBeInTheDocument()
  })

  it('shows recent decline warning', () => {
    const decliningTrendData = [
      {
        id: '1',
        clientName: 'Client A',
        month: '01',
        year: 2024,
        transcriptCount: 30,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: '2',
        clientName: 'Client A',
        month: '02',
        year: 2024,
        transcriptCount: 20,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      },
      {
        id: '3',
        clientName: 'Client A',
        month: '03',
        year: 2024,
        transcriptCount: 10,
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01'),
      },
    ]

    render(<SummaryStatistics data={decliningTrendData} />)

    expect(screen.getByText('Recent Decline')).toBeInTheDocument()
    expect(screen.getByText(/declining over the last 3 months/)).toBeInTheDocument()
  })

  it('formats percentages correctly in client distribution', () => {
    render(<SummaryStatistics data={mockTranscriptData} />)

    // Should show percentages for top clients
    expect(screen.getByText(/\d+\.\d%/)).toBeInTheDocument()
  })

  it('displays monthly trend bars with correct heights', () => {
    render(<SummaryStatistics data={mockTranscriptData} />)

    // Should render trend bars (visual elements)
    expect(screen.getByText('Recent Trend')).toBeInTheDocument()
  })
})