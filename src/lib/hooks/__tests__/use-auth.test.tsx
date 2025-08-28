import { renderHook, act } from '@testing-library/react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../use-auth'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockPush = jest.fn()

describe('useAuth', () => {
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

  it('returns loading state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeUndefined()
  })

  it('returns unauthenticated state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeUndefined()
  })

  it('returns authenticated state', () => {
    const mockSession = {
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
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

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isAdmin).toBe(true)
    expect(result.current.user).toEqual(mockSession.user)
    expect(result.current.session).toEqual(mockSession)
  })

  it('identifies non-admin users correctly', () => {
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

    const { result } = renderHook(() => useAuth())

    expect(result.current.isAdmin).toBe(false)
  })

  it('calls signIn with correct parameters', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('google', '/custom')
    })

    expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/custom' })
  })

  it('calls signOut with correct parameters', async () => {
    const mockSession = {
      user: { id: '1', name: 'John Doe', email: 'john@example.com', role: 'user' },
      provider: 'auth0',
      accessToken: 'token',
      expires: '2024-01-01',
    }

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.logout('/custom')
    })

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/custom' })
  })

  it('requireAuth redirects unauthenticated users', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.requireAuth()
    })

    expect(mockPush).toHaveBeenCalledWith('/auth/signin')
  })

  it('requireAuth redirects users without required role', () => {
    const mockSession = {
      user: { id: '1', name: 'John Doe', email: 'john@example.com', role: 'viewer' },
      provider: 'auth0',
      accessToken: 'token',
      expires: '2024-01-01',
    }

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.requireAuth('admin')
    })

    expect(mockPush).toHaveBeenCalledWith('/unauthorized')
  })

  it('requireAuth does not redirect when user has correct role', () => {
    const mockSession = {
      user: { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
      provider: 'auth0',
      accessToken: 'token',
      expires: '2024-01-01',
    }

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.requireAuth('admin')
    })

    expect(mockPush).not.toHaveBeenCalled()
  })
})