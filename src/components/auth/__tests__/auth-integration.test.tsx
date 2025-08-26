import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SessionProvider } from '../session-provider'
import { LoginButton } from '../login-button'
import { LogoutButton } from '../logout-button'
import { ProtectedRoute } from '../protected-route'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockPush = jest.fn()

const TestApp = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
)

describe('Authentication Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as any)
  })

  it('handles complete authentication flow', async () => {
    // Start unauthenticated
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    const { rerender } = render(
      <TestApp>
        <ProtectedRoute>
          <div>Protected Content</div>
          <LogoutButton />
        </ProtectedRoute>
      </TestApp>
    )

    // Should redirect to signin
    expect(mockPush).toHaveBeenCalledWith('/auth/signin')

    // Simulate login page
    rerender(
      <TestApp>
        <LoginButton provider="auth0" />
      </TestApp>
    )

    const loginButton = screen.getByText('Sign in with Auth0')
    fireEvent.click(loginButton)

    expect(mockSignIn).toHaveBeenCalledWith('auth0', { callbackUrl: '/dashboard' })

    // Simulate successful authentication
    const mockSession = {
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      },
      provider: 'auth0',
      accessToken: 'token',
      expires: '2024-01-01',
    }

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    // Render protected content
    rerender(
      <TestApp>
        <ProtectedRoute>
          <div>Protected Content</div>
          <LogoutButton />
        </ProtectedRoute>
      </TestApp>
    )

    // Should show protected content
    expect(screen.getByText('Protected Content')).toBeInTheDocument()

    // Test logout
    const logoutButton = screen.getByText('Sign out')
    fireEvent.click(logoutButton)

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' })
  })

  it('handles role-based access control', () => {
    const mockSession = {
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      },
      provider: 'auth0',
      accessToken: 'token',
      expires: '2024-01-01',
    }

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    // User trying to access admin content
    render(
      <TestApp>
        <ProtectedRoute requiredRole="admin">
          <div>Admin Content</div>
        </ProtectedRoute>
      </TestApp>
    )

    // Should redirect to unauthorized
    expect(mockPush).toHaveBeenCalledWith('/unauthorized')
  })

  it('allows admin access to admin content', () => {
    const mockSession = {
      user: {
        id: '1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
      },
      provider: 'auth0',
      accessToken: 'token',
      expires: '2024-01-01',
    }

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(
      <TestApp>
        <ProtectedRoute requiredRole="admin">
          <div>Admin Content</div>
        </ProtectedRoute>
      </TestApp>
    )

    // Should show admin content
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })
})