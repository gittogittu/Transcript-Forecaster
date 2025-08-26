import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { DashboardNavigation } from '../dashboard-navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  },
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

describe('DashboardNavigation', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders all navigation items', () => {
    render(<DashboardNavigation />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Predictions')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
  })

  it('highlights active navigation item', () => {
    mockUsePathname.mockReturnValue('/dashboard/analytics')
    render(<DashboardNavigation />)

    const analyticsLink = screen.getByText('Analytics').closest('a')
    expect(analyticsLink).toHaveClass('bg-accent', 'text-accent-foreground')
  })

  it('renders navigation items with correct hrefs', () => {
    render(<DashboardNavigation />)

    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard')
    expect(screen.getByText('Data').closest('a')).toHaveAttribute('href', '/dashboard/data')
    expect(screen.getByText('Analytics').closest('a')).toHaveAttribute('href', '/dashboard/analytics')
    expect(screen.getByText('Predictions').closest('a')).toHaveAttribute('href', '/dashboard/predictions')
    expect(screen.getByText('Reports').closest('a')).toHaveAttribute('href', '/dashboard/reports')
  })

  it('renders icons for each navigation item', () => {
    const { container } = render(<DashboardNavigation />)

    // Check that icons are rendered (lucide-react icons have specific classes)
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('shows navigation menu trigger for more options', () => {
    render(<DashboardNavigation />)

    const moreButton = screen.getByText('More')
    expect(moreButton).toBeInTheDocument()
    
    // Check that it's a NavigationMenuTrigger
    expect(moreButton.closest('button')).toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    const { container } = render(<DashboardNavigation />)

    const navigationMenu = container.firstChild
    expect(navigationMenu).toHaveClass('hidden', 'md:flex')
  })

  it('handles different active paths correctly', () => {
    // Test dashboard path
    mockUsePathname.mockReturnValue('/dashboard')
    const { rerender } = render(<DashboardNavigation />)
    
    let dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink).toHaveClass('bg-accent', 'text-accent-foreground')

    // Test data path
    mockUsePathname.mockReturnValue('/dashboard/data')
    rerender(<DashboardNavigation />)
    
    let dataLink = screen.getByText('Data').closest('a')
    expect(dataLink).toHaveClass('bg-accent', 'text-accent-foreground')
    
    // Dashboard should no longer be active
    dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink).not.toHaveClass('bg-accent', 'text-accent-foreground')
  })
})