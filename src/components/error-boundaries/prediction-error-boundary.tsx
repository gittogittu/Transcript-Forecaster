'use client'

import React, { Component, ReactNode } from 'react'
import { ErrorInfo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, RefreshCw, AlertTriangle, Info } from 'lucide-react'
import { errorLogger } from '@/lib/errors/error-logger'
import { PredictionError } from '@/lib/errors/error-types'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onRetry?: () => void
  onFallbackModel?: () => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  retryCount: number
}

/**
 * Error boundary specifically for prediction and analytics operations
 */
export class PredictionErrorBoundary extends Component<Props, State> {
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
    // Log prediction errors with specific context
    errorLogger.logError(
      error instanceof PredictionError ? error : new PredictionError(error.message, 'unknown', 0),
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'PredictionErrorBoundary'
      },
      {
        predictionContext: 'analytics_operations',
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

  handleFallbackModel = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined
    })

    // Call parent fallback model handler if provided
    if (this.props.onFallbackModel) {
      this.props.onFallbackModel()
    }
  }

  getErrorDetails = (): { 
    title: string
    description: string
    suggestion: string
    canUseFallback: boolean
    dataSize?: number
    modelType?: string
  } => {
    const error = this.state.error

    if (error instanceof PredictionError) {
      const isInsufficientData = error.dataSize < 3
      const isModelSpecific = error.modelType !== 'unknown'

      return {
        title: 'Prediction Error',
        description: isInsufficientData 
          ? 'Not enough historical data to generate reliable predictions.'
          : `Failed to generate predictions using ${error.modelType} model.`,
        suggestion: isInsufficientData
          ? 'Please add more historical data (at least 3 months) to improve prediction accuracy.'
          : 'Try using a different prediction model or check your data quality.',
        canUseFallback: isModelSpecific && !isInsufficientData,
        dataSize: error.dataSize,
        modelType: error.modelType
      }
    }

    return {
      title: 'Analytics Error',
      description: 'There was a problem generating your analytics.',
      suggestion: 'Please try again or contact support if the problem persists.',
      canUseFallback: false
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { title, description, suggestion, canUseFallback, dataSize, modelType } = this.getErrorDetails()
      const maxRetries = 2
      const canRetry = this.state.retryCount < maxRetries

      return (
        <div className="flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
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
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <p className="text-sm font-medium text-purple-800 mb-1">Error Details:</p>
                  <p className="text-xs text-purple-700 font-mono break-all">
                    {this.state.error.message}
                  </p>
                  {modelType && (
                    <p className="text-xs text-purple-600 mt-1">
                      Model: {modelType}
                    </p>
                  )}
                  {dataSize !== undefined && (
                    <p className="text-xs text-purple-600 mt-1">
                      Data points: {dataSize}
                    </p>
                  )}
                </div>
              )}

              {dataSize !== undefined && dataSize < 3 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Insufficient Data
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      You have {dataSize} data points. At least 3 months of historical data 
                      are recommended for reliable predictions.
                    </p>
                  </div>
                </div>
              )}

              {this.state.retryCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Retry attempt {this.state.retryCount} of {maxRetries}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                {canUseFallback && (
                  <Button 
                    onClick={this.handleFallbackModel}
                    className="w-full"
                    variant="default"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Try Simple Model
                  </Button>
                )}
                
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    className="w-full"
                    variant={canUseFallback ? "outline" : "default"}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}
                
                {!canRetry && !canUseFallback && (
                  <div className="text-center p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800 font-medium">
                      Unable to generate predictions
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Please check your data quality or contact support.
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