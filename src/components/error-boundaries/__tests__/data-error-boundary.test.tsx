import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DataErrorBoundary } from '../data-error-boundary'
import { APIError, GoogleSheetsError, NetworkError } from '@/lib/errors/error-types'
import { errorLogger } from '@/lib/errors/error-logger'

// Mock the error logger
jest.mock('@/lib/errors/error-logger', () => ({
  errorLogger: {
    logError: jest.fn()
  }
}))

// Component that throws different types of errors
const ThrowError = ({ error }: { error?: Error }) => {
  if (error) {
    throw error
  }
  return <div>No error</div>
}

describe('DataErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <DataErrorBoundary>
        <ThrowError />
      </DataErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders API error UI for APIError', () => {
    const apiError = new APIError('Server error', 500, '/api/transcripts')

    render(
      <DataErrorBoundary>
        <ThrowError error={apiError} />
      </DataErrorBoundary>
    )

    expect(screen.getByText('API Error')).toBeInTheDocument()
    expect(screen.getByText(/Failed to communicate with the server \(500\)/)).toBeInTheDocument()
    expect(screen.getByText(/Please check your internet connection/)).toBeInTheDocument()
  })

  it('renders Google Sheets error UI for GoogleSheetsError', () => {
    const sheetsError = new GoogleSheetsError('Permission denied', 'read', 'sheet123')

    render(
      <DataErrorBoundary>
        <ThrowError error={sheetsError} />
      </DataErrorBoundary>
    )

    expect(screen.getByText('Google Sheets Error')).toBeInTheDocument()
    expect(screen.getByText(/Failed to access Google Sheets data \(read\)/)).toBeInTheDocument()
    expect(screen.getByText(/Please verify your Google Sheets permissions/)).toBeInTheDocument()
  })

  it('renders Network error UI for NetworkError', () => {
    const networkError = new NetworkError('Connection failed', 'https://api.example.com')

    render(
      <DataErrorBoundary>
        <ThrowError error={networkError} />
      </DataErrorBoundary>
    )

    expect(screen.getByText('Network Error')).toBeInTheDocument()
    expect(screen.getByText('Unable to connect to the server.')).toBeInTheDocument()
    expect(screen.getByText(/Please check your internet connection/)).toBeInTheDocument()
  })

  it('renders generic data error UI for unknown errors', () => {
    const genericError = new Error('Unknown data error')

    render(
      <DataErrorBoundary>
        <ThrowError error={genericError} />
      </DataErrorBoundary>
    )

    expect(screen.getByText('Data Error')).toBeInTheDocument()
    expect(screen.getByText('There was a problem loading or saving your data.')).toBeInTheDocument()
  })

  it('logs error with proper context', () => {
    const apiError = new APIError('Test error', 404, '/api/test')

    render(
      <DataErrorBoundary>
        <ThrowError error={apiError} />
      </DataErrorBoundary>
    )

    expect(errorLogger.logError).toHaveBeenCalledWith(
      apiError,
      expect.objectContaining({
        componentStack: expect.any(String),
        errorBoundary: 'DataErrorBoundary'
      }),
      expect.objectContaining({
        dataContext: 'data_operations',
        retryCount: 0,
        timestamp: expect.any(String)
      })
    )
  })

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const apiError = new APIError('API failed', 500, '/api/data')

    render(
      <DataErrorBoundary>
        <ThrowError error={apiError} />
      </DataErrorBoundary>
    )

    expect(screen.getByText('Error Details:')).toBeInTheDocument()
    expect(screen.getByText('API failed')).toBeInTheDocument()
    expect(screen.getByText('Endpoint: /api/data')).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('handles retry functionality with retry count', () => {
    const apiError = new APIError('Temporary error', 503, '/api/temp')

    const { rerender } = render(
      <DataErrorBoundary>
        <ThrowError error={apiError} />
      </DataErrorBoundary>
    )

    // First retry
    const retryButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(retryButton)

    // Simulate error again to test retry count
    rerender(
      <DataErrorBoundary>
        <ThrowError error={apiError} />
      </DataErrorBoundary>
    )

    expect(screen.getByText('Retry attempt 1 of 3')).toBeInTheDocument()
  })

  it('disables retry after maximum attempts', () => {
    const apiError = new APIError('Persistent error', 500, '/api/persistent')

    const TestComponent = () => {
      const [retryCount, setRetryCount] = React.useState(0)
      
      return (
        <DataErrorBoundary key={retryCount}>
          <button onClick={() => setRetryCount(c => c + 1)}>Trigger Error</button>
          {retryCount > 0 && <ThrowError error={apiError} />}
        </DataErrorBoundary>
      )
    }

    render(<TestComponent />)

    // Trigger error multiple times to exceed retry limit
    for (let i = 0; i < 4; i++) {
      const triggerButton = screen.queryByText('Trigger Error')
      if (triggerButton) {
        fireEvent.click(triggerButton)
      }
      
      const retryButton = screen.queryByRole('button', { name: /try again/i })
      if (retryButton) {
        fireEvent.click(retryButton)
      }
    }

    expect(screen.getByText('Maximum retry attempts reached')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('calls onRetry callback when provided', () => {
    const onRetryMock = jest.fn()
    const apiError = new APIError('Retry test', 500, '/api/retry')

    render(
      <DataErrorBoundary onRetry={onRetryMock}>
        <ThrowError error={apiError} />
      </DataErrorBoundary>
    )

    const retryButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(retryButton)

    expect(onRetryMock).toHaveBeenCalledTimes(1)
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom data error</div>
    const apiError = new APIError('Custom error', 400, '/api/custom')

    render(
      <DataErrorBoundary fallback={customFallback}>
        <ThrowError error={apiError} />
      </DataErrorBoundary>
    )

    expect(screen.getByText('Custom data error')).toBeInTheDocument()
    expect(screen.queryByText('API Error')).not.toBeInTheDocument()
  })

  it('shows specific error details for different error types', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const sheetsError = new GoogleSheetsError('Access denied', 'write', 'sheet456')

    render(
      <DataErrorBoundary>
        <ThrowError error={sheetsError} />
      </DataErrorBoundary>
    )

    expect(screen.getByText('Operation: write')).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })
})