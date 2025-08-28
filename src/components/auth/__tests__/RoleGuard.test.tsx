import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { RoleGuard, AdminOnly, AnalystOrAdmin, ViewerOrHigher } from '../RoleGuard'

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn()
}))

const mockUseSession = useSession as jest.Mock

describe('RoleGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render children when user has required role', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        }
      },
      status: 'authenticated'
    })

    render(
      <RoleGuard requiredRole="admin">
        <div>Admin Content</div>
      </RoleGuard>
    )

    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('should not render children when user lacks required role', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'viewer@example.com',
          name: 'Viewer',
          role: 'viewer'
        }
      },
      status: 'authenticated'
    })

    render(
      <RoleGuard requiredRole="admin">
        <div>Admin Content</div>
      </RoleGuard>
    )

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('should render fallback when user lacks required role and showFallback is true', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'viewer@example.com',
          name: 'Viewer',
          role: 'viewer'
        }
      },
      status: 'authenticated'
    })

    render(
      <RoleGuard 
        requiredRole="admin" 
        fallback={<div>Access Denied</div>}
        showFallback={true}
      >
        <div>Admin Content</div>
      </RoleGuard>
    )

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
  })

  it('should render children when user role is in allowed roles', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'analyst@example.com',
          name: 'Analyst',
          role: 'analyst'
        }
      },
      status: 'authenticated'
    })

    render(
      <RoleGuard allowedRoles={['analyst', 'admin']}>
        <div>Analyst Content</div>
      </RoleGuard>
    )

    expect(screen.getByText('Analyst Content')).toBeInTheDocument()
  })

  it('should not render children when user role is not in allowed roles', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'viewer@example.com',
          name: 'Viewer',
          role: 'viewer'
        }
      },
      status: 'authenticated'
    })

    render(
      <RoleGuard allowedRoles={['analyst', 'admin']}>
        <div>Analyst Content</div>
      </RoleGuard>
    )

    expect(screen.queryByText('Analyst Content')).not.toBeInTheDocument()
  })

  it('should not render children when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading'
    })

    render(
      <RoleGuard requiredRole="admin">
        <div>Admin Content</div>
      </RoleGuard>
    )

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('should not render children when no session', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })

    render(
      <RoleGuard requiredRole="admin">
        <div>Admin Content</div>
      </RoleGuard>
    )

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })
})

describe('AdminOnly', () => {
  it('should render children for admin user', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        }
      },
      status: 'authenticated'
    })

    render(
      <AdminOnly>
        <div>Admin Only Content</div>
      </AdminOnly>
    )

    expect(screen.getByText('Admin Only Content')).toBeInTheDocument()
  })

  it('should not render children for non-admin user', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'analyst@example.com',
          name: 'Analyst',
          role: 'analyst'
        }
      },
      status: 'authenticated'
    })

    render(
      <AdminOnly>
        <div>Admin Only Content</div>
      </AdminOnly>
    )

    expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument()
  })
})

describe('AnalystOrAdmin', () => {
  it('should render children for analyst user', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'analyst@example.com',
          name: 'Analyst',
          role: 'analyst'
        }
      },
      status: 'authenticated'
    })

    render(
      <AnalystOrAdmin>
        <div>Analyst Content</div>
      </AnalystOrAdmin>
    )

    expect(screen.getByText('Analyst Content')).toBeInTheDocument()
  })

  it('should render children for admin user', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin'
        }
      },
      status: 'authenticated'
    })

    render(
      <AnalystOrAdmin>
        <div>Analyst Content</div>
      </AnalystOrAdmin>
    )

    expect(screen.getByText('Analyst Content')).toBeInTheDocument()
  })

  it('should not render children for viewer user', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'viewer@example.com',
          name: 'Viewer',
          role: 'viewer'
        }
      },
      status: 'authenticated'
    })

    render(
      <AnalystOrAdmin>
        <div>Analyst Content</div>
      </AnalystOrAdmin>
    )

    expect(screen.queryByText('Analyst Content')).not.toBeInTheDocument()
  })
})

describe('ViewerOrHigher', () => {
  it('should render children for all user roles', () => {
    const roles = ['viewer', 'analyst', 'admin'] as const

    roles.forEach(role => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: '123',
            email: `${role}@example.com`,
            name: role,
            role: role
          }
        },
        status: 'authenticated'
      })

      const { unmount } = render(
        <ViewerOrHigher>
          <div>{role} Content</div>
        </ViewerOrHigher>
      )

      expect(screen.getByText(`${role} Content`)).toBeInTheDocument()
      unmount()
    })
  })
})