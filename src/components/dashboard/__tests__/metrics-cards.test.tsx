import { render, screen } from '@testing-library/react'
import { MetricsCards } from '../metrics-cards'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  },
}))

describe('MetricsCards', () => {
  const mockMetrics = [
    {
      title: 'Test Metric 1',
      value: '100',
      change: {
        value: 10,
        type: 'increase' as const,
        period: 'vs last month'
      },
      icon: () => <div data-testid="test-icon-1">Icon1</div>,
      description: 'Test description 1',
      color: 'blue' as const
    },
    {
      title: 'Test Metric 2',
      value: '200',
      change: {
        value: 5,
        type: 'decrease' as const,
        period: 'vs last month'
      },
      icon: () => <div data-testid="test-icon-2">Icon2</div>,
      description: 'Test description 2',
      color: 'green' as const
    }
  ]

  it('renders default metrics when no props provided', () => {
    render(<MetricsCards />)

    expect(screen.getByText('Total Transcripts')).toBeInTheDocument()
    expect(screen.getByText('Active Clients')).toBeInTheDocument()
    expect(screen.getByText('This Month')).toBeInTheDocument()
    expect(screen.getByText('Avg per Client')).toBeInTheDocument()
  })

  it('renders custom metrics when provided', () => {
    render(<MetricsCards metrics={mockMetrics} />)

    expect(screen.getByText('Test Metric 1')).toBeInTheDocument()
    expect(screen.getByText('Test Metric 2')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('displays metric values and descriptions', () => {
    render(<MetricsCards metrics={mockMetrics} />)

    expect(screen.getByText('Test description 1')).toBeInTheDocument()
    expect(screen.getByText('Test description 2')).toBeInTheDocument()
  })

  it('shows change indicators with correct styling', () => {
    render(<MetricsCards metrics={mockMetrics} />)

    // Check for increase indicator
    const increaseElement = screen.getByText('10%')
    expect(increaseElement).toBeInTheDocument()
    expect(increaseElement.closest('.bg-green-100')).toBeInTheDocument()

    // Check for decrease indicator
    const decreaseElement = screen.getByText('5%')
    expect(decreaseElement).toBeInTheDocument()
    expect(decreaseElement.closest('.bg-red-100')).toBeInTheDocument()
  })

  it('displays change periods', () => {
    render(<MetricsCards metrics={mockMetrics} />)

    const changePeriods = screen.getAllByText('vs last month')
    expect(changePeriods).toHaveLength(2)
  })

  it('renders icons for each metric', () => {
    render(<MetricsCards metrics={mockMetrics} />)

    expect(screen.getByTestId('test-icon-1')).toBeInTheDocument()
    expect(screen.getByTestId('test-icon-2')).toBeInTheDocument()
  })

  it('shows loading skeletons when loading prop is true', () => {
    render(<MetricsCards loading={true} />)

    // Check for skeleton elements (animate-pulse class)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders correct number of skeleton cards when loading', () => {
    const { container } = render(<MetricsCards loading={true} />)

    // Should render 4 skeleton cards by default
    const cards = container.querySelectorAll('[class*="border"]')
    expect(cards.length).toBe(4)
  })

  it('applies correct grid layout classes', () => {
    const { container } = render(<MetricsCards />)

    const gridContainer = container.firstChild
    expect(gridContainer).toHaveClass('grid', 'gap-4', 'md:grid-cols-2', 'lg:grid-cols-4')
  })

  it('handles metrics without change data', () => {
    const metricsWithoutChange = [
      {
        title: 'Simple Metric',
        value: '42',
        icon: () => <div data-testid="simple-icon">Icon</div>,
        description: 'Simple description'
      }
    ]

    render(<MetricsCards metrics={metricsWithoutChange} />)

    expect(screen.getByText('Simple Metric')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Simple description')).toBeInTheDocument()
    
    // Should not show change indicators
    expect(screen.queryByText('%')).not.toBeInTheDocument()
  })

  it('handles metrics without descriptions', () => {
    const metricsWithoutDescription = [
      {
        title: 'No Description Metric',
        value: '99',
        icon: () => <div data-testid="no-desc-icon">Icon</div>
      }
    ]

    render(<MetricsCards metrics={metricsWithoutDescription} />)

    expect(screen.getByText('No Description Metric')).toBeInTheDocument()
    expect(screen.getByText('99')).toBeInTheDocument()
  })
})