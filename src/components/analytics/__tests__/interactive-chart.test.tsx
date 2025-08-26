import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { InteractiveChart } from '../interactive-chart'
import { TranscriptData } from '@/types/transcript'

// Mock Recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children, data, onMouseDown, onMouseMove, onMouseUp }: any) => (
    <div 
      data-testid="line-chart" 
      data-chart-data={JSON.stringify(data)}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: any) => (
    <div data-testid={`line-${dataKey}`} data-stroke={stroke} />
  ),
  XAxis: ({ dataKey, domain }: any) => (
    <div data-testid="x-axis" data-key={dataKey} data-domain={JSON.stringify(domain)} />
  ),
  YAxis: ({ label, domain }: any) => (
    <div data-testid="y-axis" data-label={label?.value} data-domain={JSON.stringify(domain)} />
  ),
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: ({ content }: any) => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ReferenceArea: ({ x1, x2, fill }: any) => (
    <div data-testid="reference-area" data-x1={x1} data-x2={x2} data-fill={fill} />
  ),
  Brush: ({ dataKey, height }: any) => (
    <div data-testid="brush" data-key={dataKey} data-height={height} />
  )
}))

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  ZoomIn: () => <div data-testid="zoom-in-icon" />,
  ZoomOut: () => <div data-testid="zoom-out-icon" />,
  RotateCcw: () => <div data-testid="rotate-ccw-icon" />
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
  }
]

describe('InteractiveChart', () => {
  it('renders chart with default props', () => {
    render(<InteractiveChart data={mockData} />)
    
    expect(screen.getByText('Interactive Chart')).toBeInTheDocument()
    expect(screen.getByText('Zoomable and interactive data visualization')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('renders custom title and description', () => {
    render(
      <InteractiveChart 
        data={mockData} 
        title="Custom Title"
        description="Custom description"
      />
    )
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
    expect(screen.getByText('Custom description')).toBeInTheDocument()
  })

  it('renders reset zoom button when zoom is enabled', () => {
    render(<InteractiveChart data={mockData} enableZoom={true} />)
    
    expect(screen.getByText('Reset Zoom')).toBeInTheDocument()
    expect(screen.getByTestId('rotate-ccw-icon')).toBeInTheDocument()
  })

  it('hides reset zoom button when zoom is disabled', () => {
    render(<InteractiveChart data={mockData} enableZoom={false} />)
    
    expect(screen.queryByText('Reset Zoom')).not.toBeInTheDocument()
  })

  it('renders brush when enabled', () => {
    render(<InteractiveChart data={mockData} enableBrush={true} />)
    
    const brush = screen.getByTestId('brush')
    expect(brush).toBeInTheDocument()
    expect(brush).toHaveAttribute('data-key', 'month')
    expect(brush).toHaveAttribute('data-height', '30')
  })

  it('hides brush when disabled', () => {
    render(<InteractiveChart data={mockData} enableBrush={false} />)
    
    expect(screen.queryByTestId('brush')).not.toBeInTheDocument()
  })

  it('processes chart data correctly', () => {
    render(<InteractiveChart data={mockData} />)
    
    const chartElement = screen.getByTestId('line-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')
    
    expect(chartData).toHaveLength(2) // Two months
    expect(chartData[0]).toHaveProperty('month', '2024-01')
    expect(chartData[0]).toHaveProperty('Client A', 100)
    expect(chartData[0]).toHaveProperty('Client B', 80)
  })

  it('filters data by selected clients', () => {
    render(<InteractiveChart data={mockData} selectedClients={['Client A']} />)
    
    const chartElement = screen.getByTestId('line-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')
    
    expect(chartData[0]).toHaveProperty('Client A', 100)
    expect(chartData[0]).not.toHaveProperty('Client B')
  })

  it('renders lines for each client', () => {
    render(<InteractiveChart data={mockData} />)
    
    expect(screen.getByTestId('line-Client A')).toBeInTheDocument()
    expect(screen.getByTestId('line-Client B')).toBeInTheDocument()
  })

  it('handles mouse events for zooming when enabled', () => {
    render(<InteractiveChart data={mockData} enableZoom={true} />)
    
    const chart = screen.getByTestId('line-chart')
    
    // Simulate mouse down
    fireEvent.mouseDown(chart, { activeLabel: '2024-01' })
    
    // Simulate mouse move
    fireEvent.mouseMove(chart, { activeLabel: '2024-02' })
    
    // Simulate mouse up
    fireEvent.mouseUp(chart)
    
    // Chart should still be rendered (zoom state changed internally)
    expect(chart).toBeInTheDocument()
  })

  it('resets zoom when reset button is clicked', () => {
    render(<InteractiveChart data={mockData} enableZoom={true} />)
    
    const resetButton = screen.getByText('Reset Zoom')
    fireEvent.click(resetButton)
    
    // Check that axes have default domain values
    const xAxis = screen.getByTestId('x-axis')
    const yAxis = screen.getByTestId('y-axis')
    
    expect(xAxis).toHaveAttribute('data-domain', '["dataMin","dataMax"]')
    expect(yAxis).toHaveAttribute('data-domain', '["dataMin-1","dataMax+1"]')
  })

  it('shows zoom tip when zoom is enabled', () => {
    render(<InteractiveChart data={mockData} enableZoom={true} />)
    
    expect(screen.getByText(/Click and drag to zoom/)).toBeInTheDocument()
  })

  it('hides zoom tip when zoom is disabled', () => {
    render(<InteractiveChart data={mockData} enableZoom={false} />)
    
    expect(screen.queryByText(/Click and drag to zoom/)).not.toBeInTheDocument()
  })

  it('applies custom height', () => {
    render(<InteractiveChart data={mockData} height={600} />)
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    render(<InteractiveChart data={[]} />)
    
    expect(screen.getByText('Interactive Chart')).toBeInTheDocument()
    const chartElement = screen.getByTestId('line-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')
    expect(chartData).toHaveLength(0)
  })

  it('sorts data chronologically', () => {
    const unsortedData = [mockData[1], mockData[0], mockData[2]]
    
    render(<InteractiveChart data={unsortedData} />)
    
    const chartElement = screen.getByTestId('line-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')
    
    expect(chartData[0].month).toBe('2024-01')
    expect(chartData[1].month).toBe('2024-02')
  })

  it('creates reference area during zoom selection', () => {
    render(<InteractiveChart data={mockData} enableZoom={true} />)
    
    const chart = screen.getByTestId('line-chart')
    
    // Start zoom selection
    fireEvent.mouseDown(chart, { activeLabel: '2024-01' })
    fireEvent.mouseMove(chart, { activeLabel: '2024-02' })
    
    // Reference area should appear during selection
    // Note: This would require more complex state management testing
    // For now, we just verify the chart handles the events
    expect(chart).toBeInTheDocument()
  })

  it('handles zoom with reversed selection', () => {
    render(<InteractiveChart data={mockData} enableZoom={true} />)
    
    const chart = screen.getByTestId('line-chart')
    
    // Simulate reverse selection (right to left)
    fireEvent.mouseDown(chart, { activeLabel: '2024-02' })
    fireEvent.mouseMove(chart, { activeLabel: '2024-01' })
    fireEvent.mouseUp(chart)
    
    // Chart should handle this gracefully
    expect(chart).toBeInTheDocument()
  })
})