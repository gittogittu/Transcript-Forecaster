import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { DashboardLayout } from '../dashboard-layout'
import { useSession } from 'next-auth/react'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock next-auth
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
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

describe('DashboardLayout', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard')
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: 'Test User',
          email: 'test@example.com',
          image: null,
        },
      },
      status: 'authenticated',
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the dashboard layout with header and navigation', () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    // Check for header elements
    expect(screen.getByText('Transcript Analytics')).toBeInTheDocument()
    expect(screen.getByText('TA')).toBeInTheDocument()
    
    // Check for mobile navigation trigger
    expect(screen.getByRole('button', { name: /toggle navigation menu/i })).toBeInTheDocument()
    
    // Check for content
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders responsive title text', () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    // Check for full title (hidden on small screens)
    const fullTitle = screen.getByText('Transcript Analytics')
    expect(fullTitle).toHaveClass('hidden', 'sm:block')
    
    // Check for short title (visible on small screens)
    const shortTitle = screen.getByText('TA Platform')
    expect(shortTitle).toHaveClass('sm:hidden')
  })

  it('applies custom className to main content', () => {
    const { container } = render(
      <DashboardLayout className="custom-class">
        <div>Test Content</div>
      </DashboardLayout>
    )

    const mainElement = container.querySelector('main')
    expect(mainElement).toHaveClass('custom-class')
  })

  it('renders with proper structure and styling', () => {
    const { container } = render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    // Check for main layout structure
    const header = container.querySelector('header')
    const main = container.querySelector('main')
    
    expect(header).toBeInTheDocument()
    expect(main).toBeInTheDocument()
    
    // Check for sticky header
    expect(header).toHaveClass('sticky', 'top-0')
    
    // Check for backdrop blur
    expect(header).toHaveClass('backdrop-blur')
  })

  it('renders logo with correct styling', () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    const logo = screen.getByText('TA')
    const logoContainer = logo.closest('div')
    
    expect(logoContainer).toHaveClass('h-8', 'w-8', 'rounded-lg')
    expect(logoContainer).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-purple-600')
  })
})