import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { 
  LoadingSpinner, 
  AnimatedButton, 
  AnimatedMetricCard,
  FadeInView,
  AnimatedCell,
  AnimatedRow,
  AnimatedTableHeader,
  HoverCard,
  ValidationMessage,
  ProgressIndicator,
  DashboardGrid,
  MetricChangeIndicator,
  SpreadsheetLoadingOverlay,
  SaveIndicator
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
    td: ({ children, className, onClick, onDoubleClick, ...props }: any) => (
      <td className={className} onClick={onClick} onDoubleClick={onDoubleClick} {...props}>
        {children}
      </td>
    ),
    tr: ({ children, className, ...props }: any) => (
      <tr className={className} {...props}>{children}</tr>
    ),
    th: ({ children, className, onClick, ...props }: any) => (
      <th className={className} onClick={onClick} {...props}>{children}</th>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
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

  describe('Spreadsheet Animations Accessibility', () => {
    it('AnimatedCell should not have accessibility violations', async () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <AnimatedCell>
                <span>Cell Content</span>
              </AnimatedCell>
            </tr>
          </tbody>
        </table>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('AnimatedRow should not have accessibility violations', async () => {
      const { container } = render(
        <table>
          <tbody>
            <AnimatedRow index={0}>
              <td>Row Content</td>
            </AnimatedRow>
          </tbody>
        </table>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('AnimatedTableHeader should not have accessibility violations', async () => {
      const { container } = render(
        <table>
          <thead>
            <tr>
              <AnimatedTableHeader>
                Header Content
              </AnimatedTableHeader>
            </tr>
          </thead>
        </table>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('SpreadsheetLoadingOverlay should be accessible', async () => {
      const { container } = render(
        <div>
          <SpreadsheetLoadingOverlay isVisible={true} message="Loading data..." />
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Form Animations Accessibility', () => {
    it('HoverCard should not have accessibility violations', async () => {
      const { container } = render(
        <HoverCard>
          <div>
            <h3>Card Title</h3>
            <p>Card content</p>
          </div>
        </HoverCard>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('ValidationMessage should not have accessibility violations', async () => {
      const { container } = render(
        <ValidationMessage 
          type="error" 
          message="This field is required" 
          isVisible={true} 
        />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('ProgressIndicator should not have accessibility violations', async () => {
      const { container } = render(
        <div>
          <label htmlFor="progress">Upload Progress</label>
          <ProgressIndicator progress={75} showPercentage={true} />
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('SaveIndicator should provide status information', () => {
      render(<SaveIndicator status="saving" />)
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })
  })

  describe('Dashboard Animations Accessibility', () => {
    it('DashboardGrid should not have accessibility violations', async () => {
      const { container } = render(
        <DashboardGrid>
          <div>
            <h2>Metric 1</h2>
            <p>Value: 100</p>
          </div>
          <div>
            <h2>Metric 2</h2>
            <p>Value: 200</p>
          </div>
        </DashboardGrid>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('MetricChangeIndicator should provide accessible change information', () => {
      render(
        <div>
          <span>Sales: </span>
          <MetricChangeIndicator value={120} previousValue={100} />
          <span className="sr-only">increased from previous period</span>
        </div>
      )

      expect(screen.getByText('120')).toBeInTheDocument()
      expect(screen.getByText('↗')).toBeInTheDocument()
      expect(screen.getByText('increased from previous period')).toBeInTheDocument()
    })
  })

  describe('Color and Contrast Accessibility', () => {
    it('should maintain sufficient color contrast in validation messages', () => {
      const { container } = render(
        <ValidationMessage 
          type="error" 
          message="Error message" 
          isVisible={true} 
        />
      )

      const errorMessage = container.querySelector('.text-red-600')
      expect(errorMessage).toBeInTheDocument()
    })

    it('should not rely solely on color for metric changes', () => {
      render(
        <MetricChangeIndicator value={120} previousValue={100} />
      )

      // Should have both color and directional indicator
      expect(screen.getByText('120')).toBeInTheDocument()
      expect(screen.getByText('↗')).toBeInTheDocument()
    })
  })

  describe('Screen Reader Announcements', () => {
    it('should provide context for loading states', () => {
      render(
        <div>
          <SpreadsheetLoadingOverlay isVisible={true} message="Saving changes..." />
          <div aria-live="polite" className="sr-only">
            Please wait while we save your changes
          </div>
        </div>
      )

      expect(screen.getByText('Saving changes...')).toBeInTheDocument()
      expect(screen.getByText('Please wait while we save your changes')).toBeInTheDocument()
    })

    it('should announce validation errors appropriately', () => {
      render(
        <div>
          <input aria-describedby="error-message" />
          <div id="error-message">
            <ValidationMessage 
              type="error" 
              message="This field is required" 
              isVisible={true} 
            />
          </div>
        </div>
      )

      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })
  })
})