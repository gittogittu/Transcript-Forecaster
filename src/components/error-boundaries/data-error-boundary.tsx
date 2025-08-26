'use client'

import React, { Component, ReactNode } from 'react'
import { ErrorInfo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, RefreshCw, AlertCircle } from 'lucide-react'
import { errorLogger } from '@/lib/errors/error-logger'
import { APIError, GoogleSheetsError, NetworkError } from '@/lib/errors/error-types'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  retryCount: number
}

/**
 * Error boundary specifically for data-related operations (API calls, Google Sheets, etc.)
 */
export class DataErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log data-related errors with specific context
    errorLogger.logError(
      error as APIError | GoogleSheetsError | NetworkError,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'DataErrorBoundary'
      },
      {
        dataContext: 'data_operations',
        retryCount: this.state.retryCount,
        timestamp: new Date().toISOString()
      }
    )

    this.setState({
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1
    
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: newRetryCount
    })

    // Call parent retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  getErrorMessage = (): { title: string; description: string; suggestion: string } => {
    const error = this.state.error

    if (error instanceof APIError) {
      return {
        title: 'API Error',
        description: `Failed to communicate with the server (${error.status}).`,
        suggestion: 'Please check your internet connection and try again.'
      }
    }

    if (error instanceof GoogleSheetsError) {
      return {
        title: 'Google Sheets Error',
        description: `Failed to access Google Sheets data (${error.operation}).`,
        suggestion: 'Please verify your Google Sheets permissions and try again.'
      }
    }

    if (error instanceof NetworkError) {
      return {
        title: 'Network Error',
        description: 'Unable to connect to the server.',
        suggestion: 'Please check your internet connection and try again.'
      }
    }

    return {
      title: 'Data Error',
      description: 'There was a problem loading or saving your data.',
      suggestion: 'Please try again in a moment.'
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { title, description, suggestion } = this.getErrorMessage()
      const maxRetries = 3
      const canRetry = this.state.retryCount < maxRetries

      return (
        <div className="flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {title}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-800 mb-1">Error Details:</p>
                  <p className="text-xs text-blue-700 font-mono break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error instanceof APIError && (
                    <p className="text-xs text-blue-600 mt-1">
                      Endpoint: {this.state.error.endpoint}
                    </p>
                  )}
                  {this.state.error instanceof GoogleSheetsError && (
                    <p className="text-xs text-blue-600 mt-1">
                      Operation: {this.state.error.operation}
                    </p>
                  )}
                </div>
              )}

              {this.state.retryCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Retry attempt {this.state.retryCount} of {maxRetries}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    className="w-full"
                    variant="default"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}
                
                {!canRetry && (
                  <div className="text-center p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800 font-medium">
                      Maximum retry attempts reached
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Please refresh the page or contact support if the problem persists.
                    </p>
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  {suggestion}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}