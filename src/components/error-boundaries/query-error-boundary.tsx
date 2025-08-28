'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  queryClient?: QueryClient
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class QueryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Call custom error handler
    this.props.onError?.(error, errorInfo)

    // Log error details
    console.error('QueryErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    // Clear error state
    this.setState({ hasError: false, error: null, errorInfo: null })
    
    // Invalidate all queries to retry failed requests
    if (this.props.queryClient) {
      this.props.queryClient.invalidateQueries()
    }
  }

  handleClearCache = () => {
    // Clear all cached data and retry
    if (this.props.queryClient) {
      this.props.queryClient.clear()
    }
    this.handleRetry()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onClearCache={this.handleClearCache}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  onRetry: () => void
  onClearCache: () => void
}

function ErrorFallback({ error, errorInfo, onRetry, onClearCache }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Something went wrong
            </h3>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            We encountered an unexpected error. This might be a temporary issue.
          </p>
          
          {isDevelopment && error && (
            <details className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <summary className="cursor-pointer font-medium">
                Error Details (Development)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-red-600">
                {error.message}
                {error.stack && `\n\nStack trace:\n${error.stack}`}
              </pre>
              {errorInfo && (
                <pre className="mt-2 whitespace-pre-wrap text-blue-600">
                  Component stack:{errorInfo.componentStack}
                </pre>
              )}
            </details>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onRetry}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
          <button
            onClick={onClearCache}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Clear Cache & Retry
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  )
}

// Specialized error boundaries for different sections
export function TranscriptErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorBoundary
      fallback={
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-medium">Transcript Data Error</h3>
          <p className="text-red-600 text-sm mt-1">
            Unable to load transcript data. Please try refreshing the page.
          </p>
        </div>
      }
    >
      {children}
    </QueryErrorBoundary>
  )
}

export function AnalyticsErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorBoundary
      fallback={
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-medium">Analytics Error</h3>
          <p className="text-red-600 text-sm mt-1">
            Unable to load analytics data. Some features may be unavailable.
          </p>
        </div>
      }
    >
      {children}
    </QueryErrorBoundary>
  )
}

export function MonitoringErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorBoundary
      fallback={
        <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
          <h3 className="text-yellow-800 font-medium">Monitoring Unavailable</h3>
          <p className="text-yellow-600 text-sm mt-1">
            Performance monitoring is temporarily unavailable.
          </p>
        </div>
      }
    >
      {children}
    </QueryErrorBoundary>
  )
}