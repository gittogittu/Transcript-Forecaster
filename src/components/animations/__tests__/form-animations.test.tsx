import { render, screen, fireEvent } from '@testing-library/react'
import { AnimatedInput, AnimatedButton, AnimatedSelect, FormFieldAnimation } from '../form-animations'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onFocus, onBlur, ...props }: any) => (
      <div 
        className={className} 
        data-testid="motion-div" 
        onFocus={onFocus}
        onBlur={onBlur}
        {...props}
      >
        {children}
      </div>
    ),
    label: ({ children, className, ...props }: any) => (
      <label className={className} data-testid="motion-label" {...props}>
        {children}
      </label>
    ),
    button: ({ children, className, onClick, disabled, ...props }: any) => (
      <button 
        className={className} 
        data-testid="motion-button" 
        onClick={onClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} data-testid="motion-span" {...props}>
        {children}
      </span>
    ),
  },
  AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}))

describe('AnimatedInput', () => {
  it('renders children correctly', () => {
    render(
      <AnimatedInput>
        <input data-testid="test-input" />
      </AnimatedInput>
    )
    
    expect(screen.getByTestId('test-input')).toBeInTheDocument()
    expect(screen.getByTestId('motion-div')).toBeInTheDocument()
  })

  it('displays label when provided', () => {
    render(
      <AnimatedInput label="Test Label">
        <input data-testid="test-input" />
      </AnimatedInput>
    )
    
    expect(screen.getByTestId('motion-label')).toHaveTextContent('Test Label')
  })

  it('displays error message when provided', () => {
    render(
      <AnimatedInput error="Test error">
        <input data-testid="test-input" />
      </AnimatedInput>
    )
    
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <AnimatedInput className="custom-input">
        <input data-testid="test-input" />
      </AnimatedInput>
    )
    
    const container = screen.getByTestId('motion-div').parentElement
    expect(container).toHaveClass('custom-input')
  })
})

describe('AnimatedButton', () => {
  it('renders children correctly', () => {
    render(<AnimatedButton>Click me</AnimatedButton>)
    
    expect(screen.getByTestId('motion-button')).toHaveTextContent('Click me')
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<AnimatedButton onClick={handleClick}>Click me</AnimatedButton>)
    
    fireEvent.click(screen.getByTestId('motion-button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<AnimatedButton loading>Submit</AnimatedButton>)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('disables button when disabled prop is true', () => {
    render(<AnimatedButton disabled>Click me</AnimatedButton>)
    
    expect(screen.getByTestId('motion-button')).toBeDisabled()
  })

  it('disables button when loading', () => {
    render(<AnimatedButton loading>Click me</AnimatedButton>)
    
    expect(screen.getByTestId('motion-button')).toBeDisabled()
  })
})

describe('AnimatedSelect', () => {
  it('renders children correctly', () => {
    render(
      <AnimatedSelect>
        <select data-testid="test-select">
          <option>Option 1</option>
        </select>
      </AnimatedSelect>
    )
    
    expect(screen.getByTestId('test-select')).toBeInTheDocument()
  })

  it('displays label when provided', () => {
    render(
      <AnimatedSelect label="Select Label">
        <select data-testid="test-select" />
      </AnimatedSelect>
    )
    
    expect(screen.getByText('Select Label')).toBeInTheDocument()
  })

  it('displays error message when provided', () => {
    render(
      <AnimatedSelect error="Select error">
        <select data-testid="test-select" />
      </AnimatedSelect>
    )
    
    expect(screen.getByText('Select error')).toBeInTheDocument()
  })
})

describe('FormFieldAnimation', () => {
  it('renders children with animation wrapper', () => {
    render(
      <FormFieldAnimation>
        <div data-testid="field-content">Form field</div>
      </FormFieldAnimation>
    )
    
    expect(screen.getByTestId('field-content')).toBeInTheDocument()
    expect(screen.getByTestId('motion-div')).toBeInTheDocument()
  })

  it('applies delay prop', () => {
    render(
      <FormFieldAnimation delay={0.5}>
        <div data-testid="field-content">Form field</div>
      </FormFieldAnimation>
    )
    
    expect(screen.getByTestId('field-content')).toBeInTheDocument()
  })
})