'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, RefreshCw, LogIn } from 'lucide-react'
import { errorLogger } from '@/lib/errors/error-logger'

interface Props {
  children: ReactNode
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error?: Error
  errorId?: string
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = errorLogger.logError(error, {
      component: 'AuthErrorBoundary',
      errorInfo,
      category: 'authentication',
      timestamp: new Date().toISOString(),
    })

    this.setState({
      error,
      errorId,
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined })
    this.props.onRetry?.()
  }

  handleSignIn = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin'
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-xl">Authentication Error</CardTitle>
              <CardDescription>
                There was a problem with authentication. Please try signing in again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.errorId && (
                <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
                  Error ID: {this.state.errorId}
                </div>
              )}
              
              <div className="space-y-2">
                <Button onClick={this.handleRetry} className="w-full" variant="default">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleSignIn} className="w-full" variant="outline">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}