import { render, screen } from '@testing-library/react'
import { 
  AnimatedChartContainer, 
  ChartDataTransition, 
  AnimatedMetricCard,
  StaggeredList,
  CountUpAnimation,
  FadeInView
} from '../chart-animations'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} data-testid="motion-span" {...props}>
        {children}
      </span>
    ),
  },
  AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}))

describe('AnimatedChartContainer', () => {
  it('renders children correctly', () => {
    render(
      <AnimatedChartContainer>
        <div data-testid="chart-content">Chart content</div>
      </AnimatedChartContainer>
    )
    
    expect(screen.getByTestId('chart-content')).toBeInTheDocument()
    expect(screen.getByTestId('motion-div')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <AnimatedChartContainer isLoading>
        <div data-testid="chart-content">Chart content</div>
      </AnimatedChartContainer>
    )
    
    // Should show loading spinner
    const motionDivs = screen.getAllByTestId('motion-div')
    expect(motionDivs.length).toBeGreaterThan(1)
  })

  it('applies custom className', () => {
    render(
      <AnimatedChartContainer className="custom-chart">
        <div data-testid="chart-content">Chart content</div>
      </AnimatedChartContainer>
    )
    
    expect(screen.getByTestId('motion-div')).toHaveClass('custom-chart')
  })
})

describe('ChartDataTransition', () => {
  it('renders children with transition wrapper', () => {
    render(
      <ChartDataTransition dataKey="test-key">
        <div data-testid="chart-data">Chart data</div>
      </ChartDataTransition>
    )
    
    expect(screen.getByTestId('chart-data')).toBeInTheDocument()
    expect(screen.getByTestId('animate-presence')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <ChartDataTransition dataKey="test-key" className="custom-transition">
        <div data-testid="chart-data">Chart data</div>
      </ChartDataTransition>
    )
    
    expect(screen.getByTestId('motion-div')).toHaveClass('custom-transition')
  })
})

describe('AnimatedMetricCard', () => {
  it('renders metric card with title and value', () => {
    render(<AnimatedMetricCard title="Test Metric" value="100" />)
    
    expect(screen.getByText('Test Metric')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('displays change indicator when provided', () => {
    render(<AnimatedMetricCard title="Test Metric" value="100" change={5.5} />)
    
    expect(screen.getByText('5.5%')).toBeInTheDocument()
    expect(screen.getByText('↗')).toBeInTheDocument()
  })

  it('shows negative change correctly', () => {
    render(<AnimatedMetricCard title="Test Metric" value="100" change={-3.2} />)
    
    expect(screen.getByText('3.2%')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<AnimatedMetricCard title="Test" value="100" className="custom-card" />)
    
    expect(screen.getByTestId('motion-div')).toHaveClass('custom-card')
  })
})

describe('StaggeredList', () => {
  it('renders all children', () => {
    const children = [
      <div key="1" data-testid="item-1">Item 1</div>,
      <div key="2" data-testid="item-2">Item 2</div>,
      <div key="3" data-testid="item-3">Item 3</div>
    ]
    
    render(<StaggeredList>{children}</StaggeredList>)
    
    expect(screen.getByTestId('item-1')).toBeInTheDocument()
    expect(screen.getByTestId('item-2')).toBeInTheDocument()
    expect(screen.getByTestId('item-3')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const children = [<div key="1">Item 1</div>]
    const { container } = render(<StaggeredList className="custom-list">{children}</StaggeredList>)
    
    expect(container.firstChild).toHaveClass('custom-list')
  })
})

describe('CountUpAnimation', () => {
  it('renders value with prefix and suffix', () => {
    render(<CountUpAnimation value={100} prefix="$" suffix="K" />)
    
    expect(screen.getByTestId('motion-span')).toHaveTextContent('$100K')
  })

  it('renders value without prefix and suffix', () => {
    render(<CountUpAnimation value={42} />)
    
    expect(screen.getByTestId('motion-span')).toHaveTextContent('42')
  })

  it('applies custom className', () => {
    render(<CountUpAnimation value={100} className="custom-count" />)
    
    expect(screen.getByTestId('motion-span')).toHaveClass('custom-count')
  })
})

describe('FadeInView', () => {
  it('renders children with fade-in wrapper', () => {
    render(
      <FadeInView>
        <div data-testid="fade-content">Fade content</div>
      </FadeInView>
    )
    
    expect(screen.getByTestId('fade-content')).toBeInTheDocument()
    expect(screen.getByTestId('motion-div')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <FadeInView className="custom-fade">
        <div data-testid="fade-content">Fade content</div>
      </FadeInView>
    )
    
    expect(screen.getByTestId('motion-div')).toHaveClass('custom-fade')
  })
})