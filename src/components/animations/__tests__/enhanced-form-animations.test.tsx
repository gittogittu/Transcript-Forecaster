import { render, screen, fireEvent } from '@testing-library/react'
import { 
  AnimatedForm,
  HoverCard,
  FocusRing,
  ProgressIndicator,
  ValidationMessage
} from '../form-animations'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    form: ({ children, className, ...props }: any) => (
      <form className={className} {...props}>{children}</form>
    ),
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}))

describe('AnimatedForm', () => {
  it('renders all children correctly', () => {
    const children = [
      <div key="1">Field 1</div>,
      <div key="2">Field 2</div>,
      <div key="3">Field 3</div>
    ]

    render(<AnimatedForm>{children}</AnimatedForm>)

    expect(screen.getByText('Field 1')).toBeInTheDocument()
    expect(screen.getByText('Field 2')).toBeInTheDocument()
    expect(screen.getByText('Field 3')).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <AnimatedForm className="custom-form">
        <div>Field</div>
      </AnimatedForm>
    )

    expect(container.querySelector('form')).toHaveClass('custom-form')
  })

  it('wraps each child in a motion div', () => {
    const children = [
      <input key="1" placeholder="Input 1" />,
      <input key="2" placeholder="Input 2" />
    ]

    const { container } = render(<AnimatedForm>{children}</AnimatedForm>)
    
    // Should have form > div > input structure for each child
    const form = container.querySelector('form')
    const divs = form?.querySelectorAll('div')
    expect(divs).toHaveLength(2)
  })
})

describe('HoverCard', () => {
  it('renders children correctly', () => {
    render(
      <HoverCard>
        <div>Card Content</div>
      </HoverCard>
    )

    expect(screen.getByText('Card Content')).toBeInTheDocument()
  })

  it('applies cursor-pointer class by default', () => {
    const { container } = render(
      <HoverCard>
        <div>Hoverable Card</div>
      </HoverCard>
    )

    expect(container.firstChild).toHaveClass('cursor-pointer')
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <HoverCard className="custom-card">
        <div>Custom Card</div>
      </HoverCard>
    )

    expect(container.firstChild).toHaveClass('custom-card')
  })

  it('maintains transition-shadow class', () => {
    const { container } = render(
      <HoverCard>
        <div>Shadow Card</div>
      </HoverCard>
    )

    expect(container.firstChild).toHaveClass('transition-shadow')
  })
})

describe('FocusRing', () => {
  it('renders children correctly', () => {
    render(
      <FocusRing>
        <input placeholder="Focusable input" />
      </FocusRing>
    )

    expect(screen.getByPlaceholderText('Focusable input')).toBeInTheDocument()
  })

  it('applies relative positioning', () => {
    const { container } = render(
      <FocusRing>
        <div>Focus content</div>
      </FocusRing>
    )

    expect(container.firstChild).toHaveClass('relative')
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <FocusRing className="custom-focus">
        <div>Focus content</div>
      </FocusRing>
    )

    expect(container.firstChild).toHaveClass('custom-focus')
  })
})

describe('ProgressIndicator', () => {
  it('renders progress bar correctly', () => {
    const { container } = render(<ProgressIndicator progress={50} />)
    
    const progressContainer = container.querySelector('.bg-muted')
    const progressBar = container.querySelector('.bg-primary')
    
    expect(progressContainer).toBeInTheDocument()
    expect(progressBar).toBeInTheDocument()
  })

  it('shows percentage when showPercentage is true', () => {
    render(<ProgressIndicator progress={75} showPercentage={true} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('does not show percentage when showPercentage is false', () => {
    render(<ProgressIndicator progress={75} showPercentage={false} />)
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
  })

  it('clamps progress value between 0 and 100', () => {
    const { container: container1 } = render(<ProgressIndicator progress={-10} showPercentage={true} />)
    const { container: container2 } = render(<ProgressIndicator progress={150} showPercentage={true} />)
    
    expect(container1.querySelector('.text-xs')).toHaveTextContent('0%')
    expect(container2.querySelector('.text-xs')).toHaveTextContent('100%')
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <ProgressIndicator progress={50} className="custom-progress" />
    )

    expect(container.firstChild).toHaveClass('custom-progress')
  })
})

describe('ValidationMessage', () => {
  it('renders when isVisible is true', () => {
    render(
      <ValidationMessage 
        type="error" 
        message="This is an error" 
        isVisible={true} 
      />
    )

    expect(screen.getByText('This is an error')).toBeInTheDocument()
  })

  it('does not render when isVisible is false', () => {
    render(
      <ValidationMessage 
        type="error" 
        message="This is an error" 
        isVisible={false} 
      />
    )

    expect(screen.queryByText('This is an error')).not.toBeInTheDocument()
  })

  it('applies correct styling for error type', () => {
    const { container } = render(
      <ValidationMessage 
        type="error" 
        message="Error message" 
        isVisible={true} 
      />
    )

    const messageDiv = container.querySelector('div')
    expect(messageDiv).toHaveClass('text-red-600', 'bg-red-50')
  })

  it('applies correct styling for success type', () => {
    const { container } = render(
      <ValidationMessage 
        type="success" 
        message="Success message" 
        isVisible={true} 
      />
    )

    const messageDiv = container.querySelector('div')
    expect(messageDiv).toHaveClass('text-green-600', 'bg-green-50')
  })

  it('applies correct styling for warning type', () => {
    const { container } = render(
      <ValidationMessage 
        type="warning" 
        message="Warning message" 
        isVisible={true} 
      />
    )

    const messageDiv = container.querySelector('div')
    expect(messageDiv).toHaveClass('text-yellow-600', 'bg-yellow-50')
  })

  it('applies correct styling for info type', () => {
    const { container } = render(
      <ValidationMessage 
        type="info" 
        message="Info message" 
        isVisible={true} 
      />
    )

    const messageDiv = container.querySelector('div')
    expect(messageDiv).toHaveClass('text-blue-600', 'bg-blue-50')
  })

  it('displays correct icon for each type', () => {
    const { container: errorContainer } = render(
      <ValidationMessage type="error" message="Error" isVisible={true} />
    )
    const { container: successContainer } = render(
      <ValidationMessage type="success" message="Success" isVisible={true} />
    )

    expect(errorContainer.querySelector('span')).toHaveTextContent('⚠')
    expect(successContainer.querySelector('span')).toHaveTextContent('✓')
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <ValidationMessage 
        type="info" 
        message="Custom message" 
        isVisible={true}
        className="custom-validation"
      />
    )

    expect(container.querySelector('div')).toHaveClass('custom-validation')
  })
})