import { render, screen } from '@testing-library/react'
import { PageTransition, AnimatedPage } from '../page-transition'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}))

describe('PageTransition', () => {
  it('renders children correctly', () => {
    render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <PageTransition className="custom-class">
        <div>Test Content</div>
      </PageTransition>
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders without className when not provided', () => {
    const { container } = render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    )

    // Should not have any specific className
    expect(container.firstChild).not.toHaveClass('custom-class')
  })
})

describe('AnimatedPage', () => {
  it('renders children correctly', () => {
    render(
      <AnimatedPage>
        <div>Animated Content</div>
      </AnimatedPage>
    )

    expect(screen.getByText('Animated Content')).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <AnimatedPage className="animated-class">
        <div>Animated Content</div>
      </AnimatedPage>
    )

    // Check if the className is applied to any div in the structure
    const divWithClass = container.querySelector('.animated-class')
    expect(divWithClass).toBeInTheDocument()
  })

  it('handles animationKey prop for animation transitions', () => {
    const { container } = render(
      <AnimatedPage animationKey="test-key">
        <div>Keyed Content</div>
      </AnimatedPage>
    )

    expect(screen.getByText('Keyed Content')).toBeInTheDocument()
  })

  it('renders with AnimatePresence wrapper', () => {
    const { container } = render(
      <AnimatedPage>
        <div>Wrapped Content</div>
      </AnimatedPage>
    )

    // Should have nested div structure due to AnimatePresence > motion.div
    expect(container.firstChild).toBeInTheDocument()
    expect(screen.getByText('Wrapped Content')).toBeInTheDocument()
  })
})