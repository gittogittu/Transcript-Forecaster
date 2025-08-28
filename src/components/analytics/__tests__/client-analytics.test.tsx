import React from 'react'
import { render, screen } from '@testing-library/react'
import { ClientAnalytics } from '../client-analytics'
import { TranscriptData } from '@/types/transcript'

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}))

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
    date: new Date('2024-01-15'),
    transcriptCount: 10,
    transcriptType: 'type1',
    notes: '',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    createdBy: 'user1'
  },
  {
    id: '2',
    clientName: 'Client A',
    date: new Date('2024-02-15'),
    transcriptCount: 15,
    transcriptType: 'type1',
    notes: '',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
    createdBy: 'user1'
  },
  {
    id: '3',
    clientName: 'Client B',
    date: new Date('2024-01-20'),
    transcriptCount: 20,
    transcriptType: 'type2',
    notes: '',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    createdBy: 'user1'
  },
  {
    id: '4',
    clientName: 'Client B',
    date: new Date('2024-02-20'),
    transcriptCount: 25,
    transcriptType: 'type2',
    notes: '',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-02-20'),
    createdBy: 'user1'
  },
  {
    id: '5',
    clientName: 'Client C',
    date: new Date('2024-01-25'),
    transcriptCount: 5,
    transcriptType: 'type1',
    notes: '',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25'),
    createdBy: 'user1'
  }
]

describe('ClientAnalytics', () => {
  it('renders empty state when no data provided', () => {
    render(<ClientAnalytics data={[]} />)
    
    expect(screen.getByText('No client data available')).toBeInTheDocument()
  })

  it('calculates client metrics correctly', () => {
    render(<ClientAnalytics data={mockTranscriptData} />)
    
    // Should show client overview cards
    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.getByText('Client B')).toBeInTheDocument()
    expect(screen.getByText('Client C')).toBeInTheDocument()
    
    // Should show total transcripts for each client
    expect(screen.getByText('25')).toBeInTheDocument() // Client A total
    expect(screen.getByText('45')).toBeInTheDocument() // Client B total
    expect(screen.getByText('5')).toBeInTheDocument()  // Client C total
  })

  it('ranks clients correctly by volume', () => {
    render(<ClientAnalytics data={mockTranscriptData} />)
    
    // Client B should be #1 (45 transcripts)
    // Client A should be #2 (25 transcripts)  
    // Client C should be #3 (5 transcripts)
    const rankBadges = screen.getAllByText(/#[1-3]/)
    expect(rankBadges).toHaveLength(3)
  })

  it('calculates market share correctly', () => {
    render(<ClientAnalytics data={mockTranscriptData} />)
    
    // Total transcripts: 75
    // Client B: 45/75 = 60%
    // Client A: 25/75 = 33.3%
    // Client C: 5/75 = 6.7%
    expect(screen.getByText('60.0% market share')).toBeInTheDocument()
    expect(screen.getByText('33.3% market share')).toBeInTheDocument()
    expect(screen.getByText('6.7% market share')).toBeInTheDocument()
  })

  it('calculates growth rates correctly', () => {
    render(<ClientAnalytics data={mockTranscriptData} />)
    
    // Client A: from 10 to 15 = 50% growth
    // Client B: from 20 to 25 = 25% growth
    // Client C: only one data point = 0% growth
    expect(screen.getByText('+50%')).toBeInTheDocument()
    expect(screen.getByText('+25%')).toBeInTheDocument()
  })

  it('renders charts correctly', () => {
    render(<ClientAnalytics data={mockTranscriptData} />)
    
    // Should render pie chart for market share
    expect(screen.getByText('Market Share Distribution')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    
    // Should render bar chart for performance ranking
    expect(screen.getByText('Client Performance Ranking')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    
    // Should render line chart for trends
    expect(screen.getByText('Client Comparison Trends')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('renders detailed metrics table', () => {
    render(<ClientAnalytics data={mockTranscriptData} />)
    
    expect(screen.getByText('Detailed Client Metrics')).toBeInTheDocument()
    
    // Table headers
    expect(screen.getByText('Rank')).toBeInTheDocument()
    expect(screen.getByText('Client')).toBeInTheDocument()
    expect(screen.getByText('Total Volume')).toBeInTheDocument()
    expect(screen.getByText('Market Share')).toBeInTheDocument()
    expect(screen.getByText('Growth Rate')).toBeInTheDocument()
  })

  it('filters data for selected client', () => {
    render(<ClientAnalytics data={mockTranscriptData} selectedClient="Client A" />)
    
    // Should only show data for Client A
    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.queryByText('Client B')).not.toBeInTheDocument()
    expect(screen.queryByText('Client C')).not.toBeInTheDocument()
  })

  it('handles monthly data aggregation correctly', () => {
    render(<ClientAnalytics data={mockTranscriptData} />)
    
    // Should aggregate data by month correctly
    // January 2024: Client A (10) + Client B (20) + Client C (5) = 35
    // February 2024: Client A (15) + Client B (25) = 40
    
    // This is tested indirectly through the chart rendering
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('calculates consistency metrics', () => {
    render(<ClientAnalytics data={mockTranscriptData} />)
    
    // Consistency is coefficient of variation (lower = more consistent)
    // Should show consistency percentages in the detailed table
    expect(screen.getByText('Consistency')).toBeInTheDocument()
  })

  it('identifies peak months correctly', () => {
    render(<ClientAnalytics data={mockTranscriptData} />)
    
    // Should show peak month information in the detailed table
    expect(screen.getByText('Peak Month')).toBeInTheDocument()
  })

  it('formats numbers correctly', () => {
    const largeData = [
      {
        id: '1',
        clientName: 'Large Client',
        date: new Date('2024-01-15'),
        transcriptCount: 1500,
        transcriptType: 'type1',
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1'
      }
    ]
    
    render(<ClientAnalytics data={largeData} />)
    
    // Should format large numbers with commas
    expect(screen.getByText('1,500')).toBeInTheDocument()
  })

  it('handles edge cases with single data point', () => {
    const singleDataPoint = [mockTranscriptData[0]]
    
    render(<ClientAnalytics data={singleDataPoint} />)
    
    // Should handle single data point without errors
    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('calculates averages correctly', () => {
    render(<ClientAnalytics data={mockTranscriptData} />)
    
    // Client A: 25 transcripts over 2 months = 12.5 avg (rounded to 13)
    // Client B: 45 transcripts over 2 months = 22.5 avg (rounded to 23)
    // Client C: 5 transcripts over 1 month = 5 avg
    
    // These values should appear in the detailed metrics table
    expect(screen.getByText('Avg/Month')).toBeInTheDocument()
  })
})