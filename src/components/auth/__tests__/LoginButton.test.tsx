import { render, screen, fireEvent } from '@testing-library/react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { LoginButton } from '../LoginButton'

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn()
}))

const mockSignIn = signIn as jest.Mock
const mockSignOut = signOut as jest.Mock
const mockUseSession = useSession as jest.Mock

describe('LoginButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show loading state when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading'
    })

    render(<LoginButton />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should show sign in button when not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })

    render(<LoginButton />)

    const signInButton = screen.getByRole('button', { name: /sign in/i })
    expect(signInButton).toBeInTheDocument()
    expect(signInButton).not.toBeDisabled()
  })

  it('should call signIn when sign in button is clicked', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })

    render(<LoginButton />)

    const signInButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(signInButton)

    expect(mockSignIn).toHaveBeenCalledTimes(1)
  })

  it('should show user dropdown when authenticated', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
          role: 'admin'
        }
      },
      status: 'authenticated'
    })

    render(<LoginButton />)

    // Should show avatar button
    const avatarButton = screen.getByRole('button')
    expect(avatarButton).toBeInTheDocument()
    
    // Click to open dropdown
    fireEvent.click(avatarButton)

    // Should show user info
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('should show correct role styling for different roles', () => {
    const roles = [
      { role: 'admin', expectedText: 'Admin' },
      { role: 'analyst', expectedText: 'Analyst' },
      { role: 'viewer', expectedText: 'Viewer' }
    ] as const

    roles.forEach(({ role, expectedText }) => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: '123',
            email: `${role}@example.com`,
            name: `${role} User`,
            role: role
          }
        },
        status: 'authenticated'
      })

      const { unmount } = render(<LoginButton />)

      const avatarButton = screen.getByRole('button')
      fireEvent.click(avatarButton)

      expect(screen.getByText(expectedText)).toBeInTheDocument()
      unmount()
    })
  })

  it('should call signOut when sign out is clicked', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'viewer'
        }
      },
      status: 'authenticated'
    })

    render(<LoginButton />)

    const avatarButton = screen.getByRole('button')
    fireEvent.click(avatarButton)

    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('should show user initials when no image provided', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          image: null,
          role: 'viewer'
        }
      },
      status: 'authenticated'
    })

    render(<LoginButton />)

    // Avatar fallback should show first letter of name
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('should handle user with no name gracefully', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'test@example.com',
          name: null,
          image: null,
          role: 'viewer'
        }
      },
      status: 'authenticated'
    })

    render(<LoginButton />)

    // Should show default fallback
    expect(screen.getByText('U')).toBeInTheDocument()
  })
})