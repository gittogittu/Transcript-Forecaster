'use client'

import React, { Component, ReactNode } from 'react'
import { ErrorInfo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, RefreshCw, LogIn } from 'lucide-react'
import { errorLogger } from '@/lib/errors/error-logger'
import { AuthenticationError } from '@/lib/errors/error-types'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

/**
 * Error boundary specifically for authentication-related errors
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log authentication errors with specific context
    errorLogger.logError(
      error instanceof AuthenticationError ? error : new AuthenticationError(error.message, 'UNKNOWN'),
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'AuthErrorBoundary'
      },
      {
        authContext: 'authentication_flow',
        timestamp: new Date().toISOString()
      }
    )

    this.setState({
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleSignIn = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin'
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isAuthError = this.state.error instanceof AuthenticationError

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {isAuthError ? 'Authentication Error' : 'Authentication Problem'}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {isAuthError 
                  ? 'There was a problem with your authentication. Please sign in again.'
                  : 'We encountered an issue while processing your authentication.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <p className="text-sm font-medium text-orange-800 mb-1">Error Details:</p>
                  <p className="text-xs text-orange-700 font-mono break-all">
                    {this.state.error.message}
                  </p>
                  {isAuthError && (this.state.error as AuthenticationError).code && (
                    <p className="text-xs text-orange-600 mt-1">
                      Code: {(this.state.error as AuthenticationError).code}
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={this.handleSignIn}
                  className="flex-1"
                  variant="default"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <Button 
                  onClick={this.handleRetry}
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  If you continue to have authentication issues, please contact support.
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