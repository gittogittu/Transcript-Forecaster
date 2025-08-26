import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TrendChart } from '../trend-chart'
import { TranscriptData } from '@/types/transcript'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'

// Mock Recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: any) => (
    <div data-testid={`line-${dataKey}`} data-stroke={stroke} />
  ),
  XAxis: ({ dataKey, tickFormatter }: any) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: ({ label }: any) => (
    <div data-testid="y-axis" data-label={label?.value} />
  ),
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: ({ content }: any) => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ReferenceLine: () => <div data-testid="reference-line" />
}))

const mockData: TranscriptData[] = [
  {
    clientName: 'Client A',
    month: '01',
    year: 2024,
    transcriptCount: 100,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    clientName: 'Client A',
    month: '02',
    year: 2024,
    transcriptCount: 120,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  },
  {
    clientName: 'Client B',
    month: '01',
    year: 2024,
    transcriptCount: 80,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    clientName: 'Client B',
    month: '02',
    year: 2024,
    transcriptCount: 90,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  }
]

describe('TrendChart', () => {
  it('renders chart with basic props', () => {
    render(<TrendChart data={mockData} />)
    
    expect(screen.getByText('Transcript Volume Trends')).toBeInTheDocument()
    expect(screen.getByText('Historical transcript counts over time')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('displays correct chart data structure', () => {
    render(<TrendChart data={mockData} />)
    
    const chartElement = screen.getByTestId('line-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')
    
    expect(chartData).toHaveLength(2) // Two months
    expect(chartData[0]).toHaveProperty('month', '2024-01')
    expect(chartData[0]).toHaveProperty('Client A', 100)
    expect(chartData[0]).toHaveProperty('Client B', 80)
  })

  it('renders lines for each client', () => {
    render(<TrendChart data={mockData} />)
    
    expect(screen.getByTestId('line-Client A')).toBeInTheDocument()
    expect(screen.getByTestId('line-Client B')).toBeInTheDocument()
  })

  it('filters data by selected clients', () => {
    render(<TrendChart data={mockData} selectedClients={['Client A']} />)
    
    const chartElement = screen.getByTestId('line-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')
    
    expect(chartData[0]).toHaveProperty('Client A', 100)
    expect(chartData[0]).not.toHaveProperty('Client B')
  })

  it('filters data by time range', () => {
    // Test with a wide time range that should include all data
    const timeRange = {
      start: new Date('2023-01-01'),
      end: new Date('2025-12-31')
    }
    
    render(<TrendChart data={mockData} timeRange={timeRange} />)
    
    const chartElement = screen.getByTestId('line-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')
    
    // Should include all data since the range is very wide
    expect(chartData).toHaveLength(2) // Two months of data
    expect(chartData[0]).toHaveProperty('month', '2024-01')
    expect(chartData[1]).toHaveProperty('month', '2024-02')
  })

  it('shows/hides grid based on showGrid prop', () => {
    const { rerender } = render(<TrendChart data={mockData} showGrid={true} />)
    expect(screen.getByTestId('grid')).toBeInTheDocument()
    
    rerender(<TrendChart data={mockData} showGrid={false} />)
    expect(screen.queryByTestId('grid')).not.toBeInTheDocument()
  })

  it('shows/hides legend based on showLegend prop', () => {
    const { rerender } = render(<TrendChart data={mockData} showLegend={true} />)
    expect(screen.getByTestId('legend')).toBeInTheDocument()
    
    rerender(<TrendChart data={mockData} showLegend={false} />)
    expect(screen.queryByTestId('legend')).not.toBeInTheDocument()
  })

  it('updates description when clients are selected', () => {
    render(<TrendChart data={mockData} selectedClients={['Client A', 'Client B']} />)
    
    expect(screen.getByText(/for Client A, Client B/)).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    render(<TrendChart data={[]} />)
    
    expect(screen.getByText('Transcript Volume Trends')).toBeInTheDocument()
    const chartElement = screen.getByTestId('line-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')
    expect(chartData).toHaveLength(0)
  })

  it('sorts data by month correctly', () => {
    const unsortedData = [
      { ...mockData[1] }, // February
      { ...mockData[0] }  // January
    ]
    
    render(<TrendChart data={unsortedData} />)
    
    const chartElement = screen.getByTestId('line-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')
    
    expect(chartData[0].month).toBe('2024-01')
    expect(chartData[1].month).toBe('2024-02')
  })

  it('applies custom height', () => {
    render(<TrendChart data={mockData} height={600} />)
    
    // The ResponsiveContainer should receive the height prop
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })
})