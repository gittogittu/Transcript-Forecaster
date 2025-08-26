import { render, screen } from '@testing-library/react'
import { Skeleton, TableSkeleton, CardSkeleton, ChartSkeleton } from '../skeleton'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
}))

describe('Skeleton', () => {
  it('renders with default props', () => {
    render(<Skeleton />)
    const skeleton = screen.getByTestId('motion-div')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('bg-muted', 'rounded-md')
  })

  it('applies custom className', () => {
    render(<Skeleton className="custom-skeleton" />)
    const skeleton = screen.getByTestId('motion-div')
    expect(skeleton).toHaveClass('custom-skeleton')
  })

  it('renders as regular div when animate is false', () => {
    const { container } = render(<Skeleton animate={false} />)
    const skeleton = container.firstChild
    expect(skeleton).toHaveClass('bg-muted', 'rounded-md')
  })
})

describe('TableSkeleton', () => {
  it('renders with default number of rows', () => {
    render(<TableSkeleton />)
    const rows = screen.getAllByTestId('motion-div')
    // 1 header + 5 default rows = 6 total
    expect(rows.length).toBeGreaterThanOrEqual(6)
  })

  it('renders custom number of rows', () => {
    render(<TableSkeleton rows={3} />)
    const rows = screen.getAllByTestId('motion-div')
    // 1 header + 3 custom rows = 4 minimum
    expect(rows.length).toBeGreaterThanOrEqual(4)
  })
})

describe('CardSkeleton', () => {
  it('renders card skeleton structure', () => {
    render(<CardSkeleton />)
    const container = screen.getByTestId('motion-div')
    expect(container).toHaveClass('p-6', 'border', 'rounded-lg', 'space-y-4')
  })
})

describe('ChartSkeleton', () => {
  it('renders chart skeleton structure', () => {
    render(<ChartSkeleton />)
    const container = screen.getByTestId('motion-div')
    expect(container).toHaveClass('space-y-4')
  })

  it('renders chart bars', () => {
    render(<ChartSkeleton />)
    const bars = screen.getAllByTestId('motion-div')
    // Should have multiple motion divs for different parts of the chart
    expect(bars.length).toBeGreaterThan(1)
  })
})