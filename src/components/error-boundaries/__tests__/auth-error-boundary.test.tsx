import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AuthErrorBoundary } from '../auth-error-boundary'
import { AuthenticationError } from '@/lib/errors/error-types'
import { errorLogger } from '@/lib/errors/error-logger'

// Mock the error logger
jest.mock('@/lib/errors/error-logger', () => ({
  errorLogger: {
    logError: jest.fn()
  }
}))

// Mock window.location
const mockLocation = {
  href: ''
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

// Component that throws different types of errors
const ThrowError = ({ error }: { error?: Error }) => {
  if (error) {
    throw error
  }
  return <div>No error</div>
}

describe('AuthErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocation.href = ''
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <AuthErrorBoundary>
        <ThrowError />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders auth error UI for AuthenticationError', () => {
    const authError = new AuthenticationError('Invalid token', 'TOKEN_EXPIRED')

    render(
      <AuthErrorBoundary>
        <ThrowError error={authError} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Authentication Error')).toBeInTheDocument()
    expect(screen.getByText(/There was a problem with your authentication/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('renders generic auth error UI for generic Error', () => {
    const genericError = new Error('Generic auth error')

    render(
      <AuthErrorBoundary>
        <ThrowError error={genericError} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Authentication Problem')).toBeInTheDocument()
    expect(screen.getByText(/We encountered an issue while processing/)).toBeInTheDocument()
  })

  it('logs authentication error with proper context', () => {
    const authError = new AuthenticationError('Session expired', 'SESSION_EXPIRED')

    render(
      <AuthErrorBoundary>
        <ThrowError error={authError} />
      </AuthErrorBoundary>
    )

    expect(errorLogger.logError).toHaveBeenCalledWith(
      authError,
      expect.objectContaining({
        componentStack: expect.any(String),
        errorBoundary: 'AuthErrorBoundary'
      }),
      expect.objectContaining({
        authContext: 'authentication_flow',
        timestamp: expect.any(String)
      })
    )
  })

  it('logs generic error as AuthenticationError', () => {
    const genericError = new Error('Generic error')

    render(
      <AuthErrorBoundary>
        <ThrowError error={genericError} />
      </AuthErrorBoundary>
    )

    expect(errorLogger.logError).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'AuthenticationError',
        message: 'Generic error',
        code: 'UNKNOWN'
      }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const authError = new AuthenticationError('Token invalid', 'INVALID_TOKEN')

    render(
      <AuthErrorBoundary>
        <ThrowError error={authError} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Error Details:')).toBeInTheDocument()
    expect(screen.getByText('Token invalid')).toBeInTheDocument()
    expect(screen.getByText('Code: INVALID_TOKEN')).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('handles sign in button click', () => {
    const authError = new AuthenticationError('Please sign in', 'UNAUTHENTICATED')

    render(
      <AuthErrorBoundary>
        <ThrowError error={authError} />
      </AuthErrorBoundary>
    )

    const signInButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(signInButton)

    expect(mockLocation.href).toBe('/auth/signin')
  })

  it('handles retry button click', () => {
    const authError = new AuthenticationError('Temporary error', 'TEMP_ERROR')

    const { rerender } = render(
      <AuthErrorBoundary>
        <ThrowError error={authError} />
      </AuthErrorBoundary>
    )

    const retryButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(retryButton)

    // Re-render with no error to simulate retry
    rerender(
      <AuthErrorBoundary>
        <ThrowError />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom auth error</div>
    const authError = new AuthenticationError('Custom error', 'CUSTOM')

    render(
      <AuthErrorBoundary fallback={customFallback}>
        <ThrowError error={authError} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Custom auth error')).toBeInTheDocument()
    expect(screen.queryByText('Authentication Error')).not.toBeInTheDocument()
  })

  it('provides appropriate support message', () => {
    const authError = new AuthenticationError('Auth failed', 'AUTH_FAILED')

    render(
      <AuthErrorBoundary>
        <ThrowError error={authError} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText(/If you continue to have authentication issues/)).toBeInTheDocument()
  })
})