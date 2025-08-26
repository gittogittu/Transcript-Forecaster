import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { UserProfile } from '../user-profile'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

describe('UserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    })

    render(<UserProfile />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('returns null when no session', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    const { container } = render(<UserProfile />)
    
    expect(container.firstChild).toBeNull()
  })

  it('displays user information when authenticated', () => {
    const mockSession = {
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/avatar.jpg',
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

    render(<UserProfile />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('auth0')).toBeInTheDocument()
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('displays fallback avatar when no image', () => {
    const mockSession = {
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      },
      provider: 'google',
      accessToken: 'token',
      expires: '2024-01-01',
    }

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<UserProfile />)
    
    expect(screen.getByText('J')).toBeInTheDocument() // First letter of name
  })

  it('displays default role when none provided', () => {
    const mockSession = {
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      },
      provider: 'github',
      accessToken: 'token',
      expires: '2024-01-01',
    }

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<UserProfile />)
    
    expect(screen.getByText('user')).toBeInTheDocument()
  })
})