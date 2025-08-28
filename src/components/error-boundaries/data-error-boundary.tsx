'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, RefreshCw, Upload } from 'lucide-react'
import { errorLogger } from '@/lib/errors/error-logger'

interface Props {
  children: ReactNode
  onRetry?: () => void
  showUploadOption?: boolean
}

interface State {
  hasError: boolean
  error?: Error
  errorId?: string
}

export class DataErrorBoundary extends Component<Props, State> {
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
      component: 'DataErrorBoundary',
      errorInfo,
      category: 'data_operations',
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

  handleUpload = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard?tab=upload'
    }
  }

  getErrorMessage = () => {
    const error = this.state.error
    if (!error) return 'An unexpected data error occurred.'

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.'
    }
    
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 'Data validation error. Please check your data format and try again.'
    }
    
    if (error.message.includes('database') || error.message.includes('query')) {
      return 'Database connection issue. Our team has been notified.'
    }

    return 'There was a problem processing your data. Please try again.'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Data Error</CardTitle>
              <CardDescription>
                {this.getErrorMessage()}
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
                  Retry Operation
                </Button>
                {this.props.showUploadOption && (
                  <Button onClick={this.handleUpload} className="w-full" variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Data
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}