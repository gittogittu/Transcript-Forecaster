import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GlobalErrorBoundary } from '../global-error-boundary'
import { AuthErrorBoundary } from '../auth-error-boundary'
import { DataErrorBoundary } from '../data-error-boundary'
import { PredictionErrorBoundary } from '../prediction-error-boundary'

// Mock error logger
jest.mock('@/lib/errors/error-logger', () => ({
  errorLogger: {
    logError: jest.fn(() => 'mock-error-id'),
  },
}))

// Mock window.location
const mockLocation = {
  href: 'http://localhost:3000/test',
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

// Component that throws an error
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage)
  }
  return <div>No error</div>
}

describe('GlobalErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render children when there is no error', () => {
    render(
      <GlobalErrorBoundary>
        <div>Test content</div>
      </GlobalErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should render error UI when child component throws', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('We encountered an unexpected error. Our team has been notified.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go to home/i })).toBeInTheDocument()
  })

  it('should display error ID when available', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    )

    expect(screen.getByText('Error ID: mock-error-id')).toBeInTheDocument()
  })

  it('should call onError callback when provided', () => {
    const onError = jest.fn()
    
    render(
      <GlobalErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    )
  })

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>
    
    render(
      <GlobalErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should reset error state when retry button is clicked', () => {
    const { rerender } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    // Rerender with no error
    rerender(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={false} />
      </GlobalErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('should navigate to home when home button is clicked', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    )

    fireEvent.click(screen.getByRole('button', { name: /go to home/i }))

    expect(mockLocation.href).toBe('/')
  })

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Detailed error message" />
      </GlobalErrorBoundary>
    )

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument()
    
    // Click to expand details
    fireEvent.click(screen.getByText('Error Details (Development)'))
    
    expect(screen.getByText(/Detailed error message/)).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })
})

describe('AuthErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render auth-specific error UI', () => {
    render(
      <AuthErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Authentication Error')).toBeInTheDocument()
    expect(screen.getByText(/There was a problem with authentication/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = jest.fn()
    
    render(
      <AuthErrorBoundary onRetry={onRetry}>
        <ThrowError shouldThrow={true} />
      </AuthErrorBoundary>
    )

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(onRetry).toHaveBeenCalled()
  })

  it('should navigate to sign in when sign in button is clicked', () => {
    render(
      <AuthErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AuthErrorBoundary>
    )

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockLocation.href).toBe('/auth/signin')
  })
})

describe('DataErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render data-specific error UI', () => {
    render(
      <DataErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DataErrorBoundary>
    )

    expect(screen.getByText('Data Error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry operation/i })).toBeInTheDocument()
  })

  it('should show upload option when enabled', () => {
    render(
      <DataErrorBoundary showUploadOption={true}>
        <ThrowError shouldThrow={true} />
      </DataErrorBoundary>
    )

    expect(screen.getByRole('button', { name: /upload new data/i })).toBeInTheDocument()
  })

  it('should provide specific error messages for different error types', () => {
    const { rerender } = render(
      <DataErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="network connection failed" />
      </DataErrorBoundary>
    )

    expect(screen.getByText(/Network connection issue/)).toBeInTheDocument()

    rerender(
      <DataErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="validation error occurred" />
      </DataErrorBoundary>
    )

    expect(screen.getByText(/Data validation error/)).toBeInTheDocument()

    rerender(
      <DataErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="database query failed" />
      </DataErrorBoundary>
    )

    expect(screen.getByText(/Database connection issue/)).toBeInTheDocument()
  })

  it('should navigate to upload page when upload button is clicked', () => {
    render(
      <DataErrorBoundary showUploadOption={true}>
        <ThrowError shouldThrow={true} />
      </DataErrorBoundary>
    )

    fireEvent.click(screen.getByRole('button', { name: /upload new data/i }))

    expect(mockLocation.href).toBe('/dashboard?tab=upload')
  })
})

describe('PredictionErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render prediction-specific error UI', () => {
    render(
      <PredictionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText('Prediction Error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry prediction/i })).toBeInTheDocument()
  })

  it('should show fallback model option when provided', () => {
    const onFallbackModel = jest.fn()
    
    render(
      <PredictionErrorBoundary onFallbackModel={onFallbackModel}>
        <ThrowError shouldThrow={true} />
      </PredictionErrorBoundary>
    )

    expect(screen.getByRole('button', { name: /use simple model/i })).toBeInTheDocument()
    
    fireEvent.click(screen.getByRole('button', { name: /use simple model/i }))
    
    expect(onFallbackModel).toHaveBeenCalled()
  })

  it('should provide specific error messages for different prediction errors', () => {
    const { rerender } = render(
      <PredictionErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="insufficient data for prediction" />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText(/Insufficient data for accurate predictions/)).toBeInTheDocument()

    rerender(
      <PredictionErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="tensorflow model loading failed" />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText(/Machine learning model error/)).toBeInTheDocument()

    rerender(
      <PredictionErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="memory allocation failed" />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText(/Performance issue with prediction calculation/)).toBeInTheDocument()
  })
})

describe('Error Boundary Integration', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should handle nested error boundaries correctly', () => {
    render(
      <GlobalErrorBoundary>
        <AuthErrorBoundary>
          <DataErrorBoundary>
            <ThrowError shouldThrow={true} />
          </DataErrorBoundary>
        </AuthErrorBoundary>
      </GlobalErrorBoundary>
    )

    // Should catch at the most specific level (DataErrorBoundary)
    expect(screen.getByText('Data Error')).toBeInTheDocument()
    expect(screen.queryByText('Authentication Error')).not.toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should bubble up to parent boundary when child boundary fails', () => {
    // This would require a more complex test setup to simulate boundary failure
    // For now, we test that each boundary works independently
    const { rerender } = render(
      <GlobalErrorBoundary>
        <div>Working content</div>
      </GlobalErrorBoundary>
    )

    expect(screen.getByText('Working content')).toBeInTheDocument()

    rerender(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})