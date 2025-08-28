'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  ExternalLink, 
  Copy, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { 
  APIError, 
  NetworkError, 
  ValidationError, 
  AuthenticationError, 
  PredictionError 
} from '@/lib/errors/error-handlers'
import { getRecoverySuggestions } from '@/lib/errors/error-handlers'
import { useState } from 'react'
import { toast } from 'sonner'

interface ErrorDisplayProps {
  error: Error
  errorId?: string
  onRetry?: () => void
  onGoHome?: () => void
  onDismiss?: () => void
  showDetails?: boolean
  compact?: boolean
  suggestions?: string[]
}

export function ErrorDisplay({
  error,
  errorId,
  onRetry,
  onGoHome,
  onDismiss,
  showDetails = false,
  compact = false,
  suggestions: customSuggestions,
}: ErrorDisplayProps) {
  const [showFullDetails, setShowFullDetails] = useState(false)
  const suggestions = customSuggestions || getRecoverySuggestions(error)

  const getErrorIcon = () => {
    if (error instanceof ValidationError) {
      return <AlertCircle className="w-6 h-6 text-yellow-600" />
    }
    if (error instanceof NetworkError) {
      return <XCircle className="w-6 h-6 text-red-600" />
    }
    if (error instanceof AuthenticationError) {
      return <AlertTriangle className="w-6 h-6 text-orange-600" />
    }
    if (error instanceof PredictionError) {
      return <Info className="w-6 h-6 text-blue-600" />
    }
    return <AlertTriangle className="w-6 h-6 text-red-600" />
  }

  const getErrorColor = () => {
    if (error instanceof ValidationError) return 'yellow'
    if (error instanceof NetworkError) return 'red'
    if (error instanceof AuthenticationError) return 'orange'
    if (error instanceof PredictionError) return 'blue'
    return 'red'
  }

  const getErrorTitle = () => {
    if (error instanceof APIError) return 'API Error'
    if (error instanceof NetworkError) return 'Connection Error'
    if (error instanceof ValidationError) return 'Validation Error'
    if (error instanceof AuthenticationError) return 'Authentication Error'
    if (error instanceof PredictionError) return 'Prediction Error'
    return 'Error'
  }

  const getErrorDescription = () => {
    if (error instanceof APIError) {
      if (error.status >= 500) {
        return 'Server error. Our team has been notified and is working on a fix.'
      }
      if (error.status === 404) {
        return 'The requested resource was not found.'
      }
      if (error.status === 403) {
        return 'You do not have permission to perform this action.'
      }
      if (error.status === 401) {
        return 'Please sign in to continue.'
      }
      return error.message
    }
    
    if (error instanceof NetworkError) {
      return 'Unable to connect to the server. Please check your internet connection.'
    }
    
    if (error instanceof ValidationError) {
      return 'Please check the highlighted fields and correct any errors.'
    }
    
    if (error instanceof AuthenticationError) {
      return 'There was a problem with authentication. Please sign in again.'
    }
    
    if (error instanceof PredictionError) {
      return error.suggestedAction || 'Unable to generate predictions with the current data.'
    }

    return error.message || 'An unexpected error occurred.'
  }

  const copyErrorId = async () => {
    if (errorId) {
      await navigator.clipboard.writeText(errorId)
      toast.success('Error ID copied to clipboard')
    }
  }

  if (compact) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{getErrorDescription()}</span>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          {getErrorIcon()}
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <CardTitle className="text-xl">{getErrorTitle()}</CardTitle>
          <Badge variant="outline" className={`text-${getErrorColor()}-600 border-${getErrorColor()}-200`}>
            {error.name}
          </Badge>
        </div>
        <CardDescription className="text-base">
          {getErrorDescription()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error ID */}
        {errorId && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-700">Error ID</div>
              <div className="text-xs text-gray-500 font-mono">{errorId}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={copyErrorId}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Recovery Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Try these solutions:</h4>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {onRetry && (
            <Button onClick={onRetry} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          {onGoHome && (
            <Button onClick={onGoHome} variant="outline" className="flex-1">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          )}
          {onDismiss && (
            <Button onClick={onDismiss} variant="ghost" className="flex-1">
              Dismiss
            </Button>
          )}
        </div>

        {/* Additional Actions */}
        <div className="flex flex-col sm:flex-row gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('/help', '_blank')}
            className="justify-start"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Get Help
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('/status', '_blank')}
            className="justify-start"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            System Status
          </Button>
        </div>

        {/* Error Details (Development) */}
        {(showDetails || process.env.NODE_ENV === 'development') && (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="w-full justify-between"
            >
              <span>Error Details</span>
              <span className="text-xs">
                {showFullDetails ? 'Hide' : 'Show'}
              </span>
            </Button>
            
            {showFullDetails && (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-1">Error Message</div>
                  <div className="text-xs text-gray-600 font-mono">{error.message}</div>
                </div>
                
                {error instanceof APIError && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-1">API Details</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Status: {error.status}</div>
                      <div>Endpoint: {error.endpoint}</div>
                      {error.response && (
                        <div>Response: {JSON.stringify(error.response, null, 2)}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {error instanceof ValidationError && error.errors && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-1">Validation Errors</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      {Object.entries(error.errors).map(([field, messages]) => (
                        <div key={field}>
                          <strong>{field}:</strong> {messages.join(', ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {error.stack && (
                  <details className="p-3 bg-gray-50 rounded-lg">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 overflow-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}