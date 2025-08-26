/**
 * Integration tests for authentication flow
 */
import { render, screen, waitFor } from '@/lib/testing/utils/test-utils'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { testAccessibility } from '@/lib/testing/utils/accessibility-helpers'

// Mock the hooks
const mockPush = jest.fn()
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

beforeEach(() => {
  mockUseRouter.mockReturnValue({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  } as any)
})

describe('Authentication Flow Integration', () => {
  const TestComponent = () => <div>Protected Content</div>

  describe('Authenticated User', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            image: null,
            role: 'user',
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          accessToken: 'mock-access-token',
          provider: 'credentials',
        },
        status: 'authenticated',
        update: jest.fn(),
      })
    })

    it('should render protected content for authenticated users', async () => {
      const renderResult = render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      await testAccessibility(renderResult.container)
    })

    it('should not redirect authenticated users', () => {
      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Unauthenticated User', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      })
    })

    it('should redirect unauthenticated users to signin', async () => {
      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })
    })

    it('should not render protected content for unauthenticated users', () => {
      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      })
    })

    it('should show loading state while session is loading', async () => {
      const renderResult = render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      await testAccessibility(renderResult.container)
    })

    it('should not redirect while loading', () => {
      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Custom Redirect Path', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      })
    })

    it('should redirect to custom path when provided', async () => {
      render(
        <ProtectedRoute redirectTo="/custom-signin">
          <TestComponent />
        </ProtectedRoute>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom-signin')
      })
    })
  })

  describe('Role-based Access', () => {
    it('should allow access for users with required role', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            name: 'Admin User',
            email: 'admin@example.com',
            image: null,
            role: 'admin',
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          accessToken: 'mock-access-token',
          provider: 'credentials',
        },
        status: 'authenticated',
        update: jest.fn(),
      })

      render(
        <ProtectedRoute requiredRole="admin">
          <TestComponent />
        </ProtectedRoute>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should redirect users without required role', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            name: 'Regular User',
            email: 'user@example.com',
            image: null,
            role: 'user',
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          accessToken: 'mock-access-token',
          provider: 'credentials',
        },
        status: 'authenticated',
        update: jest.fn(),
      })

      render(
        <ProtectedRoute requiredRole="admin">
          <TestComponent />
        </ProtectedRoute>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/unauthorized')
      })
    })
  })
})