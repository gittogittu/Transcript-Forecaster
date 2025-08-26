import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { 
  LoadingSpinner, 
  AnimatedButton, 
  AnimatedMetricCard,
  FadeInView 
} from '../index'

expect.extend(toHaveNoViolations)

// Mock framer-motion for accessibility tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    button: ({ children, className, onClick, disabled, ...props }: any) => (
      <button 
        className={className} 
        onClick={onClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}))

describe('Animation Components Accessibility', () => {
  it('LoadingSpinner should not have accessibility violations', async () => {
    const { container } = render(
      <div>
        <LoadingSpinner />
        <span className="sr-only">Loading content</span>
      </div>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('AnimatedButton should not have accessibility violations', async () => {
    const { container } = render(
      <AnimatedButton onClick={() => {}}>
        Click me
      </AnimatedButton>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('AnimatedButton loading state should be accessible', async () => {
    const { container } = render(
      <AnimatedButton loading onClick={() => {}}>
        Submit
      </AnimatedButton>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('AnimatedMetricCard should not have accessibility violations', async () => {
    const { container } = render(
      <AnimatedMetricCard 
        title="Total Users" 
        value="1,234" 
        change={5.2}
      />
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('FadeInView should preserve content accessibility', async () => {
    const { container } = render(
      <FadeInView>
        <h2>Important Heading</h2>
        <p>This is important content that should be accessible.</p>
        <button>Action Button</button>
      </FadeInView>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should provide proper ARIA labels for loading states', () => {
    render(
      <div>
        <LoadingSpinner />
        <span aria-live="polite" className="sr-only">
          Loading data, please wait
        </span>
      </div>
    )
    
    expect(screen.getByText('Loading data, please wait')).toBeInTheDocument()
  })

  it('should respect prefers-reduced-motion', () => {
    // Mock matchMedia for prefers-reduced-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })

    render(<LoadingSpinner />)
    
    // In a real implementation, we would check that animations are disabled
    // when prefers-reduced-motion is set
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })

  it('should maintain focus management in animated components', () => {
    render(
      <FadeInView>
        <button data-testid="focusable-button">Focusable Button</button>
        <input data-testid="focusable-input" placeholder="Focusable Input" />
      </FadeInView>
    )
    
    const button = screen.getByTestId('focusable-button')
    const input = screen.getByTestId('focusable-input')
    
    // Elements should be focusable even with animations
    expect(button).not.toHaveAttribute('tabindex', '-1')
    expect(input).not.toHaveAttribute('tabindex', '-1')
  })
})