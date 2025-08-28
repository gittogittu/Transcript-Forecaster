'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, RefreshCw, TrendingUp } from 'lucide-react'
import { errorLogger } from '@/lib/errors/error-logger'

interface Props {
  children: ReactNode
  onRetry?: () => void
  onFallbackModel?: () => void
}

interface State {
  hasError: boolean
  error?: Error
  errorId?: string
}

export class PredictionErrorBoundary extends Component<Props, State> {
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
      component: 'PredictionErrorBoundary',
      errorInfo,
      category: 'ml_predictions',
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

  handleFallbackModel = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined })
    this.props.onFallbackModel?.()
  }

  getErrorMessage = () => {
    const error = this.state.error
    if (!error) return 'An unexpected prediction error occurred.'

    if (error.message.includes('insufficient data') || error.message.includes('data size')) {
      return 'Insufficient data for accurate predictions. Please add more historical data.'
    }
    
    if (error.message.includes('model') || error.message.includes('tensorflow')) {
      return 'Machine learning model error. Trying alternative prediction method.'
    }
    
    if (error.message.includes('memory') || error.message.includes('performance')) {
      return 'Performance issue with prediction calculation. Please try a simpler model.'
    }

    return 'There was a problem generating predictions. Please try again with different parameters.'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Prediction Error</CardTitle>
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
                  Retry Prediction
                </Button>
                {this.props.onFallbackModel && (
                  <Button onClick={this.handleFallbackModel} className="w-full" variant="outline">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Use Simple Model
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