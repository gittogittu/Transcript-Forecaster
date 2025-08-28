import { render, screen } from '@testing-library/react'
import { 
  DashboardGrid,
  ChartUpdateAnimation,
  FilterTransition,
  MetricChangeIndicator
} from '../chart-animations'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}))

describe('DashboardGrid', () => {
  it('renders all children correctly', () => {
    const children = [
      <div key="1">Card 1</div>,
      <div key="2">Card 2</div>,
      <div key="3">Card 3</div>
    ]

    render(<DashboardGrid>{children}</DashboardGrid>)

    expect(screen.getByText('Card 1')).toBeInTheDocument()
    expect(screen.getByText('Card 2')).toBeInTheDocument()
    expect(screen.getByText('Card 3')).toBeInTheDocument()
  })

  it('applies correct grid classes for 2 columns by default', () => {
    const { container } = render(
      <DashboardGrid>
        <div>Card 1</div>
      </DashboardGrid>
    )

    expect(container.firstChild).toHaveClass('grid', 'gap-6', 'grid-cols-1', 'md:grid-cols-2')
  })

  it('applies correct grid classes for 1 column', () => {
    const { container } = render(
      <DashboardGrid columns={1}>
        <div>Card 1</div>
      </DashboardGrid>
    )

    expect(container.firstChild).toHaveClass('grid-cols-1')
    expect(container.firstChild).not.toHaveClass('md:grid-cols-2')
  })

  it('applies correct grid classes for 3 columns', () => {
    const { container } = render(
      <DashboardGrid columns={3}>
        <div>Card 1</div>
      </DashboardGrid>
    )

    expect(container.firstChild).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
  })

  it('applies correct grid classes for 4 columns', () => {
    const { container } = render(
      <DashboardGrid columns={4}>
        <div>Card 1</div>
      </DashboardGrid>
    )

    expect(container.firstChild).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4')
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <DashboardGrid className="custom-grid">
        <div>Card 1</div>
      </DashboardGrid>
    )

    expect(container.firstChild).toHaveClass('custom-grid')
  })

  it('wraps each child in a motion div', () => {
    const children = [
      <div key="1">Card 1</div>,
      <div key="2">Card 2</div>
    ]

    const { container } = render(<DashboardGrid>{children}</DashboardGrid>)
    
    // Should have grid > div > div structure for each child
    const grid = container.firstChild
    const childDivs = grid?.querySelectorAll('div')
    // Grid div + 2 wrapper divs + 2 content divs = 5 total
    expect(childDivs?.length).toBeGreaterThanOrEqual(4)
  })
})

describe('ChartUpdateAnimation', () => {
  it('renders children correctly', () => {
    render(
      <ChartUpdateAnimation isUpdating={false}>
        <div>Chart Content</div>
      </ChartUpdateAnimation>
    )

    expect(screen.getByText('Chart Content')).toBeInTheDocument()
  })

  it('shows updating overlay when isUpdating is true', () => {
    render(
      <ChartUpdateAnimation isUpdating={true}>
        <div>Chart Content</div>
      </ChartUpdateAnimation>
    )

    expect(screen.getByText('Updating chart...')).toBeInTheDocument()
  })

  it('does not show updating overlay when isUpdating is false', () => {
    render(
      <ChartUpdateAnimation isUpdating={false}>
        <div>Chart Content</div>
      </ChartUpdateAnimation>
    )

    expect(screen.queryByText('Updating chart...')).not.toBeInTheDocument()
  })

  it('applies relative positioning', () => {
    const { container } = render(
      <ChartUpdateAnimation isUpdating={false}>
        <div>Chart Content</div>
      </ChartUpdateAnimation>
    )

    expect(container.firstChild).toHaveClass('relative')
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <ChartUpdateAnimation isUpdating={false} className="custom-chart">
        <div>Chart Content</div>
      </ChartUpdateAnimation>
    )

    expect(container.firstChild).toHaveClass('custom-chart')
  })
})

describe('FilterTransition', () => {
  it('renders children correctly', () => {
    render(
      <FilterTransition filterKey="test-filter">
        <div>Filter Content</div>
      </FilterTransition>
    )

    expect(screen.getByText('Filter Content')).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <FilterTransition filterKey="test-filter" className="custom-filter">
        <div>Filter Content</div>
      </FilterTransition>
    )

    expect(container.querySelector('.custom-filter')).toBeInTheDocument()
  })

  it('changes content when filterKey changes', () => {
    const { rerender } = render(
      <FilterTransition filterKey="filter1">
        <div>Content 1</div>
      </FilterTransition>
    )

    expect(screen.getByText('Content 1')).toBeInTheDocument()

    rerender(
      <FilterTransition filterKey="filter2">
        <div>Content 2</div>
      </FilterTransition>
    )

    expect(screen.getByText('Content 2')).toBeInTheDocument()
  })
})

describe('MetricChangeIndicator', () => {
  it('renders value correctly', () => {
    render(<MetricChangeIndicator value={100} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('shows increase indicator when value increases', () => {
    render(<MetricChangeIndicator value={120} previousValue={100} />)
    
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('↗')).toBeInTheDocument()
  })

  it('shows decrease indicator when value decreases', () => {
    render(<MetricChangeIndicator value={80} previousValue={100} />)
    
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('↘')).toBeInTheDocument()
  })

  it('does not show indicator when value is unchanged', () => {
    render(<MetricChangeIndicator value={100} previousValue={100} />)
    
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.queryByText('↗')).not.toBeInTheDocument()
    expect(screen.queryByText('↘')).not.toBeInTheDocument()
  })

  it('does not show indicator when no previous value', () => {
    render(<MetricChangeIndicator value={100} />)
    
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.queryByText('↗')).not.toBeInTheDocument()
    expect(screen.queryByText('↘')).not.toBeInTheDocument()
  })

  it('applies correct styling for increase', () => {
    const { container } = render(
      <MetricChangeIndicator value={120} previousValue={100} />
    )
    
    const indicator = container.querySelector('.text-green-600')
    expect(indicator).toBeInTheDocument()
  })

  it('applies correct styling for decrease', () => {
    const { container } = render(
      <MetricChangeIndicator value={80} previousValue={100} />
    )
    
    const indicator = container.querySelector('.text-red-600')
    expect(indicator).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <MetricChangeIndicator value={100} className="custom-metric" />
    )

    expect(container.firstChild).toHaveClass('custom-metric')
  })

  it('handles zero values correctly', () => {
    render(<MetricChangeIndicator value={0} previousValue={10} />)
    
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('↘')).toBeInTheDocument()
  })

  it('handles negative values correctly', () => {
    render(<MetricChangeIndicator value={-5} previousValue={-10} />)
    
    expect(screen.getByText('-5')).toBeInTheDocument()
    expect(screen.getByText('↗')).toBeInTheDocument() // -5 > -10
  })
})