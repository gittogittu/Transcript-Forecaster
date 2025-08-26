import { render, screen } from '@testing-library/react'
import { LoadingSpinner, PulsingDots, LoadingBar } from '../loading-spinner'

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

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />)
    const spinner = screen.getByTestId('motion-div')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('w-6', 'h-6', 'border-primary')
  })

  it('applies size classes correctly', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />)
    expect(screen.getByTestId('motion-div')).toHaveClass('w-4', 'h-4')

    rerender(<LoadingSpinner size="lg" />)
    expect(screen.getByTestId('motion-div')).toHaveClass('w-8', 'h-8')
  })

  it('applies color classes correctly', () => {
    const { rerender } = render(<LoadingSpinner color="secondary" />)
    expect(screen.getByTestId('motion-div')).toHaveClass('border-secondary')

    rerender(<LoadingSpinner color="muted" />)
    expect(screen.getByTestId('motion-div')).toHaveClass('border-muted-foreground')
  })

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />)
    expect(screen.getByTestId('motion-div')).toHaveClass('custom-class')
  })
})

describe('PulsingDots', () => {
  it('renders default number of dots', () => {
    render(<PulsingDots />)
    const dots = screen.getAllByTestId('motion-div')
    expect(dots).toHaveLength(3)
  })

  it('renders custom number of dots', () => {
    render(<PulsingDots dotCount={5} />)
    const dots = screen.getAllByTestId('motion-div')
    expect(dots).toHaveLength(5)
  })

  it('applies custom className to container', () => {
    const { container } = render(<PulsingDots className="custom-dots" />)
    expect(container.firstChild).toHaveClass('custom-dots')
  })
})

describe('LoadingBar', () => {
  it('renders with default props', () => {
    render(<LoadingBar />)
    const container = screen.getByTestId('motion-div').parentElement
    const bar = screen.getByTestId('motion-div')
    
    expect(container).toHaveClass('w-full', 'bg-muted', 'rounded-full', 'h-2')
    expect(bar).toHaveClass('bg-primary', 'h-2', 'rounded-full')
  })

  it('applies custom className', () => {
    const { container } = render(<LoadingBar className="custom-bar" />)
    expect(container.firstChild).toHaveClass('custom-bar')
  })

  it('handles progress prop', () => {
    render(<LoadingBar progress={50} />)
    const bar = screen.getByTestId('motion-div')
    expect(bar).toBeInTheDocument()
  })
})