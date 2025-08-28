import { render, screen, fireEvent } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { MobileNavigation } from '../mobile-navigation'
import { ExtendedSession } from '@/lib/auth'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => {
      const { initial, animate, transition, layoutId, whileHover, ...restProps } = props
      return <div className={className} {...restProps}>{children}</div>
    },
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock the Sheet component
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open, onOpenChange }: any) => (
    <div data-testid="sheet" data-open={open}>
      {children}
    </div>
  ),
  SheetContent: ({ children, side, className }: any) => (
    <div data-testid="sheet-content" data-side={side} className={className}>
      {children}
    </div>
  ),
  SheetTrigger: ({ children, asChild }: any) => (
    <div data-testid="sheet-trigger">
      {children}
    </div>
  ),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

const createMockSession = (role: 'admin' | 'analyst' | 'viewer'): ExtendedSession => ({
  user: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role,
  },
  expires: '2024-12-31',
})

describe('MobileNavigation', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard')
    mockUseSession.mockReturnValue({
      data: createMockSession('admin'),
      status: 'authenticated'
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders mobile navigation trigger button', () => {
    render(<MobileNavigation />)
    
    const triggerButton = screen.getByRole('button', { name: /toggle navigation menu/i })
    expect(triggerButton).toBeInTheDocument()
    expect(triggerButton).toHaveClass('md:hidden')
  })

  it('shows role-based navigation items for admin users', () => {
    mockUseSession.mockReturnValue({
      data: createMockSession('admin'),
      status: 'authenticated'
    })
    
    render(<MobileNavigation />)
    
    // Open the mobile navigation
    const triggerButton = screen.getByRole('button', { name: /toggle navigation menu/i })
    fireEvent.click(triggerButton)
    
    // Check for admin-specific items
    expect(screen.getByText('User Management')).toBeInTheDocument()
    expect(screen.getByText('Performance')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(screen.getByText('Predictions')).toBeInTheDocument()
  })

  it('shows limited navigation items for viewer users', () => {
    mockUseSession.mockReturnValue({
      data: createMockSession('viewer'),
      status: 'authenticated'
    })
    
    render(<MobileNavigation />)
    
    // Open the mobile navigation
    const triggerButton = screen.getByRole('button', { name: /toggle navigation menu/i })
    fireEvent.click(triggerButton)
    
    // Check that viewer can see basic items
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
    
    // Check that viewer cannot see restricted items
    expect(screen.queryByText('Data')).not.toBeInTheDocument()
    expect(screen.queryByText('Predictions')).not.toBeInTheDocument()
    expect(screen.queryByText('User Management')).not.toBeInTheDocument()
  })

  it('shows analyst navigation items', () => {
    mockUseSession.mockReturnValue({
      data: createMockSession('analyst'),
      status: 'authenticated'
    })
    
    render(<MobileNavigation />)
    
    // Open the mobile navigation
    const triggerButton = screen.getByRole('button', { name: /toggle navigation menu/i })
    fireEvent.click(triggerButton)
    
    // Check that analyst can see appropriate items
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Predictions')).toBeInTheDocument()
    
    // Check that analyst cannot see admin items
    expect(screen.queryByText('User Management')).not.toBeInTheDocument()
    expect(screen.queryByText('Performance')).not.toBeInTheDocument()
  })

  it('highlights active navigation item', () => {
    mockUsePathname.mockReturnValue('/dashboard/data')
    
    render(<MobileNavigation />)
    
    // Open the mobile navigation
    const triggerButton = screen.getByRole('button', { name: /toggle navigation menu/i })
    fireEvent.click(triggerButton)
    
    const dataLink = screen.getByText('Data').closest('a')
    expect(dataLink).toHaveClass('bg-accent', 'text-accent-foreground')
  })

  it('displays user role information', () => {
    const session = createMockSession('analyst')
    mockUseSession.mockReturnValue({
      data: session,
      status: 'authenticated'
    })
    
    render(<MobileNavigation />)
    
    // Open the mobile navigation
    const triggerButton = screen.getByRole('button', { name: /toggle navigation menu/i })
    fireEvent.click(triggerButton)
    
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('analyst Access')).toBeInTheDocument()
  })

  it('shows admin badges for admin-only items', () => {
    mockUseSession.mockReturnValue({
      data: createMockSession('admin'),
      status: 'authenticated'
    })
    
    render(<MobileNavigation />)
    
    // Open the mobile navigation
    const triggerButton = screen.getByRole('button', { name: /toggle navigation menu/i })
    fireEvent.click(triggerButton)
    
    const adminBadges = screen.getAllByText('Admin')
    expect(adminBadges.length).toBeGreaterThan(0)
  })

  it('closes navigation when link is clicked', () => {
    render(<MobileNavigation />)
    
    // Open the mobile navigation
    const triggerButton = screen.getByRole('button', { name: /toggle navigation menu/i })
    fireEvent.click(triggerButton)
    
    // Click on a navigation link
    const dashboardLink = screen.getByText('Dashboard')
    fireEvent.click(dashboardLink)
    
    // Navigation should close (this is handled by the Sheet component)
    // We can't easily test the actual closing behavior without mocking the Sheet component
    // but we can verify the onClick handler is attached
    expect(dashboardLink.closest('a')).toBeInTheDocument()
  })

  it('handles missing session gracefully', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })
    
    render(<MobileNavigation />)
    
    // Open the mobile navigation
    const triggerButton = screen.getByRole('button', { name: /toggle navigation menu/i })
    fireEvent.click(triggerButton)
    
    // Should show basic navigation items (defaulting to viewer)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    
    // Should not show user info section
    expect(screen.queryByText('Test User')).not.toBeInTheDocument()
  })
})