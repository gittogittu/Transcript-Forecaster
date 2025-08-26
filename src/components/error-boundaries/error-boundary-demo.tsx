'use client'

import React from 'react'
import { GlobalErrorBoundary, AuthErrorBoundary, DataErrorBoundary, PredictionErrorBoundary } from './index'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { APIError, AuthenticationError, GoogleSheetsError, PredictionError } from '@/lib/errors/error-types'

/**
 * Demo component showing how to use different error boundaries
 * This is for demonstration purposes only
 */
export function ErrorBoundaryDemo() {
  const [errorType, setErrorType] = React.useState<string | null>(null)

  const ThrowError = ({ type }: { type: string }) => {
    React.useEffect(() => {
      if (type === 'api') {
        throw new APIError('Demo API error', 500, '/api/demo')
      } else if (type === 'auth') {
        throw new AuthenticationError('Demo auth error', 'DEMO_ERROR')
      } else if (type === 'sheets') {
        throw new GoogleSheetsError('Demo sheets error', 'read')
      } else if (type === 'prediction') {
        throw new PredictionError('Demo prediction error', 'linear', 2)
      } else if (type === 'generic') {
        throw new Error('Demo generic error')
      }
    }, [type])

    return <div>Component that will throw error</div>
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Error Boundary Demo</CardTitle>
          <CardDescription>
            Click the buttons below to test different error boundaries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button 
              onClick={() => setErrorType('api')}
              variant="outline"
              size="sm"
            >
              API Error
            </Button>
            <Button 
              onClick={() => setErrorType('auth')}
              variant="outline"
              size="sm"
            >
              Auth Error
            </Button>
            <Button 
              onClick={() => setErrorType('sheets')}
              variant="outline"
              size="sm"
            >
              Sheets Error
            </Button>
            <Button 
              onClick={() => setErrorType('prediction')}
              variant="outline"
              size="sm"
            >
              Prediction Error
            </Button>
            <Button 
              onClick={() => setErrorType('generic')}
              variant="outline"
              size="sm"
            >
              Generic Error
            </Button>
            <Button 
              onClick={() => setErrorType(null)}
              variant="default"
              size="sm"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Global Error Boundary wraps everything */}
      <GlobalErrorBoundary>
        <Card>
          <CardHeader>
            <CardTitle>Global Error Boundary</CardTitle>
            <CardDescription>Catches all unhandled errors</CardDescription>
          </CardHeader>
          <CardContent>
            {errorType === 'generic' && <ThrowError type="generic" />}
            {!errorType && <p>No error - global boundary active</p>}
          </CardContent>
        </Card>

        {/* Auth Error Boundary for authentication-related components */}
        <AuthErrorBoundary>
          <Card>
            <CardHeader>
              <CardTitle>Auth Error Boundary</CardTitle>
              <CardDescription>Handles authentication errors</CardDescription>
            </CardHeader>
            <CardContent>
              {errorType === 'auth' && <ThrowError type="auth" />}
              {!errorType && <p>No error - auth boundary active</p>}
            </CardContent>
          </Card>
        </AuthErrorBoundary>

        {/* Data Error Boundary for API and data operations */}
        <DataErrorBoundary>
          <Card>
            <CardHeader>
              <CardTitle>Data Error Boundary</CardTitle>
              <CardDescription>Handles API and Google Sheets errors</CardDescription>
            </CardHeader>
            <CardContent>
              {errorType === 'api' && <ThrowError type="api" />}
              {errorType === 'sheets' && <ThrowError type="sheets" />}
              {!errorType && <p>No error - data boundary active</p>}
            </CardContent>
          </Card>
        </DataErrorBoundary>

        {/* Prediction Error Boundary for analytics operations */}
        <PredictionErrorBoundary>
          <Card>
            <CardHeader>
              <CardTitle>Prediction Error Boundary</CardTitle>
              <CardDescription>Handles prediction and analytics errors</CardDescription>
            </CardHeader>
            <CardContent>
              {errorType === 'prediction' && <ThrowError type="prediction" />}
              {!errorType && <p>No error - prediction boundary active</p>}
            </CardContent>
          </Card>
        </PredictionErrorBoundary>
      </GlobalErrorBoundary>
    </div>
  )
}