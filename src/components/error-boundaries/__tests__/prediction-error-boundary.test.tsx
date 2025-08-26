import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PredictionErrorBoundary } from '../prediction-error-boundary'
import { PredictionError } from '@/lib/errors/error-types'
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

describe('PredictionErrorBoundary', () => {
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
      <PredictionErrorBoundary>
        <ThrowError />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders prediction error UI for insufficient data', () => {
    const predictionError = new PredictionError('Not enough data', 'linear', 2)

    render(
      <PredictionErrorBoundary>
        <ThrowError error={predictionError} />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText('Prediction Error')).toBeInTheDocument()
    expect(screen.getByText('Not enough historical data to generate reliable predictions.')).toBeInTheDocument()
    expect(screen.getByText('Insufficient Data')).toBeInTheDocument()
    expect(screen.getByText(/You have 2 data points/)).toBeInTheDocument()
  })

  it('renders prediction error UI for model-specific errors', () => {
    const predictionError = new PredictionError('Model failed', 'polynomial', 10)

    render(
      <PredictionErrorBoundary>
        <ThrowError error={predictionError} />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText('Prediction Error')).toBeInTheDocument()
    expect(screen.getByText('Failed to generate predictions using polynomial model.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try simple model/i })).toBeInTheDocument()
  })

  it('renders generic analytics error UI for unknown errors', () => {
    const genericError = new Error('Unknown analytics error')

    render(
      <PredictionErrorBoundary>
        <ThrowError error={genericError} />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText('Analytics Error')).toBeInTheDocument()
    expect(screen.getByText('There was a problem generating your analytics.')).toBeInTheDocument()
  })

  it('logs prediction error with proper context', () => {
    const predictionError = new PredictionError('Test prediction error', 'arima', 5)

    render(
      <PredictionErrorBoundary>
        <ThrowError error={predictionError} />
      </PredictionErrorBoundary>
    )

    expect(errorLogger.logError).toHaveBeenCalledWith(
      predictionError,
      expect.objectContaining({
        componentStack: expect.any(String),
        errorBoundary: 'PredictionErrorBoundary'
      }),
      expect.objectContaining({
        predictionContext: 'analytics_operations',
        retryCount: 0,
        timestamp: expect.any(String)
      })
    )
  })

  it('logs generic error as PredictionError', () => {
    const genericError = new Error('Generic error')

    render(
      <PredictionErrorBoundary>
        <ThrowError error={genericError} />
      </PredictionErrorBoundary>
    )

    expect(errorLogger.logError).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'PredictionError',
        message: 'Generic error',
        modelType: 'unknown',
        dataSize: 0
      }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const predictionError = new PredictionError('Model training failed', 'neural', 15)

    render(
      <PredictionErrorBoundary>
        <ThrowError error={predictionError} />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText('Error Details:')).toBeInTheDocument()
    expect(screen.getByText('Model training failed')).toBeInTheDocument()
    expect(screen.getByText('Model: neural')).toBeInTheDocument()
    expect(screen.getByText('Data points: 15')).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('handles fallback model button click', () => {
    const onFallbackModelMock = jest.fn()
    const predictionError = new PredictionError('Complex model failed', 'polynomial', 8)

    render(
      <PredictionErrorBoundary onFallbackModel={onFallbackModelMock}>
        <ThrowError error={predictionError} />
      </PredictionErrorBoundary>
    )

    const fallbackButton = screen.getByRole('button', { name: /try simple model/i })
    fireEvent.click(fallbackButton)

    expect(onFallbackModelMock).toHaveBeenCalledTimes(1)
  })

  it('handles retry button click', () => {
    const onRetryMock = jest.fn()
    const predictionError = new PredictionError('Temporary error', 'linear', 6)

    const { rerender } = render(
      <PredictionErrorBoundary onRetry={onRetryMock}>
        <ThrowError error={predictionError} />
      </PredictionErrorBoundary>
    )

    const retryButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(retryButton)

    expect(onRetryMock).toHaveBeenCalledTimes(1)

    // Re-render with no error to simulate retry
    rerender(
      <PredictionErrorBoundary onRetry={onRetryMock}>
        <ThrowError />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('shows retry count indicator', () => {
    const predictionError = new PredictionError('Retry test', 'linear', 5)

    const { rerender } = render(
      <PredictionErrorBoundary>
        <ThrowError error={predictionError} />
      </PredictionErrorBoundary>
    )

    // First retry
    const retryButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(retryButton)

    // Simulate error again to test retry count
    rerender(
      <PredictionErrorBoundary>
        <ThrowError error={predictionError} />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText('Retry attempt 1 of 2')).toBeInTheDocument()
  })

  it('disables retry after maximum attempts', () => {
    const predictionError = new PredictionError('Persistent error', 'linear', 5)

    const TestComponent = () => {
      const [retryCount, setRetryCount] = React.useState(0)
      
      return (
        <PredictionErrorBoundary key={retryCount}>
          <button onClick={() => setRetryCount(c => c + 1)}>Trigger Error</button>
          {retryCount > 0 && <ThrowError error={predictionError} />}
        </PredictionErrorBoundary>
      )
    }

    render(<TestComponent />)

    // Trigger error multiple times to exceed retry limit
    for (let i = 0; i < 3; i++) {
      const triggerButton = screen.queryByText('Trigger Error')
      if (triggerButton) {
        fireEvent.click(triggerButton)
      }
      
      const retryButton = screen.queryByRole('button', { name: /try again/i })
      if (retryButton) {
        fireEvent.click(retryButton)
      }
    }

    expect(screen.getByText('Unable to generate predictions')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom prediction error</div>
    const predictionError = new PredictionError('Custom error', 'custom', 3)

    render(
      <PredictionErrorBoundary fallback={customFallback}>
        <ThrowError error={predictionError} />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText('Custom prediction error')).toBeInTheDocument()
    expect(screen.queryByText('Prediction Error')).not.toBeInTheDocument()
  })

  it('shows appropriate suggestions for different error scenarios', () => {
    // Test insufficient data scenario
    const insufficientDataError = new PredictionError('Not enough data', 'linear', 1)

    const { rerender } = render(
      <PredictionErrorBoundary>
        <ThrowError error={insufficientDataError} />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText(/Please add more historical data/)).toBeInTheDocument()

    // Test model-specific error scenario
    const modelError = new PredictionError('Model failed', 'complex', 10)

    rerender(
      <PredictionErrorBoundary>
        <ThrowError error={modelError} />
      </PredictionErrorBoundary>
    )

    expect(screen.getByText(/Try using a different prediction model/)).toBeInTheDocument()
  })
})