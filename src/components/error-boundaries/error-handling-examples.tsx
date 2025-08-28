'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  AuthErrorBoundary, 
  DataErrorBoundary, 
  PredictionErrorBoundary 
} from '@/components/error-boundaries'
import { useError, useAPIError, useValidationError, usePredictionError } from '@/components/providers/error-provider'
import { ErrorDisplay } from './error-display'

// Example components that demonstrate different error scenarios
function APIErrorExample() {
  const { handleAPIError, error, isRetrying, retry, clearError } = useAPIError()
  const [result, setResult] = useState<any>(null)

  const makeAPICall = async (shouldFail: boolean = false) => {
    try {
      const response = await handleAPIError(
        () => {
          if (shouldFail) {
            return Promise.resolve(new Response('Server Error', { status: 500 }))
          }
          return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
        },
        '/api/example'
      )
      setResult(response)
      clearError()
    } catch (err) {
      // Error is already handled by the hook
      console.log('API call failed:', err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Error Handling Example</CardTitle>
        <CardDescription>
          Demonstrates automatic retry logic and error recovery for API calls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={() => makeAPICall(false)} disabled={isRetrying}>
            Successful API Call
          </Button>
          <Button onClick={() => makeAPICall(true)} disabled={isRetrying} variant="destructive">
            Failing API Call
          </Button>
        </div>

        {result && (
          <Alert>
            <AlertDescription>
              API call successful: {JSON.stringify(result)}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <ErrorDisplay
            error={error}
            onRetry={() => retry(() => makeAPICall(false))}
            onDismiss={clearError}
            compact
          />
        )}
      </CardContent>
    </Card>
  )
}

function ValidationErrorExample() {
  const { handleValidation, error, clearError, validationErrors } = useValidationError()
  const [formData, setFormData] = useState({ email: '', age: '' })

  const validateForm = () => {
    try {
      // Simulate Zod validation error
      const zodError = {
        name: 'ZodError',
        errors: [
          { path: ['email'], message: 'Invalid email format', received: formData.email },
          { path: ['age'], message: 'Age must be a positive number', received: formData.age },
        ],
      }
      
      if (!formData.email.includes('@') || isNaN(Number(formData.age))) {
        handleValidation(zodError, 'form_validation')
      } else {
        clearError()
        alert('Form is valid!')
      }
    } catch (err) {
      console.log('Validation failed:', err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validation Error Handling Example</CardTitle>
        <CardDescription>
          Shows how validation errors are handled and displayed to users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="text"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full p-2 border rounded ${
                validationErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter email"
            />
            {validationErrors.email && (
              <p className="text-sm text-red-600">{validationErrors.email[0]}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Age</label>
            <input
              type="text"
              value={formData.age}
              onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
              className={`w-full p-2 border rounded ${
                validationErrors.age ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter age"
            />
            {validationErrors.age && (
              <p className="text-sm text-red-600">{validationErrors.age[0]}</p>
            )}
          </div>
        </div>

        <Button onClick={validateForm}>Validate Form</Button>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription>
              Form validation failed. Please correct the highlighted fields.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

function PredictionErrorExample() {
  const { handlePrediction, error, isRetrying, retry, clearError, suggestions, suggestedAction } = usePredictionError()
  const [predictionResult, setPredictionResult] = useState<any>(null)

  const runPrediction = async (modelType: 'linear' | 'complex', dataSize: number) => {
    try {
      // Simulate prediction error based on parameters
      let errorMessage = ''
      if (dataSize < 10) {
        errorMessage = 'insufficient data for accurate predictions'
      } else if (modelType === 'complex' && dataSize > 100) {
        errorMessage = 'memory allocation failed during model training'
      } else if (modelType === 'complex') {
        errorMessage = 'tensorflow model initialization failed'
      }

      if (errorMessage) {
        const predictionError = new Error(errorMessage)
        handlePrediction(predictionError, modelType, dataSize)
      } else {
        clearError()
        setPredictionResult({
          model: modelType,
          dataSize,
          predictions: [1, 2, 3, 4, 5],
          accuracy: 0.85,
        })
      }
    } catch (err) {
      console.log('Prediction failed:', err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prediction Error Handling Example</CardTitle>
        <CardDescription>
          Demonstrates ML model error handling with fallback suggestions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => runPrediction('linear', 50)} disabled={isRetrying}>
            Linear Model (Success)
          </Button>
          <Button onClick={() => runPrediction('linear', 5)} disabled={isRetrying} variant="outline">
            Insufficient Data
          </Button>
          <Button onClick={() => runPrediction('complex', 150)} disabled={isRetrying} variant="outline">
            Memory Error
          </Button>
          <Button onClick={() => runPrediction('complex', 50)} disabled={isRetrying} variant="outline">
            TensorFlow Error
          </Button>
        </div>

        {predictionResult && (
          <Alert>
            <AlertDescription>
              Prediction successful: {predictionResult.model} model with {predictionResult.dataSize} data points
              (Accuracy: {(predictionResult.accuracy * 100).toFixed(1)}%)
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <div className="space-y-2">
            <ErrorDisplay
              error={error}
              onRetry={() => retry(() => runPrediction('linear', 50))}
              onDismiss={clearError}
              compact
            />
            
            {suggestedAction && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription>
                  <strong>Suggestion:</strong> {suggestedAction}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Component that throws errors to test error boundaries
function ErrorBoundaryExample() {
  const [errorType, setErrorType] = useState<string | null>(null)

  const ThrowError = ({ type }: { type: string }) => {
    switch (type) {
      case 'auth':
        throw new Error('Authentication token expired')
      case 'data':
        throw new Error('Database connection failed')
      case 'prediction':
        throw new Error('TensorFlow model loading failed')
      default:
        throw new Error('Generic application error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Boundary Examples</CardTitle>
        <CardDescription>
          Test different error boundaries with specific error types
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setErrorType('auth')} variant="outline">
            Trigger Auth Error
          </Button>
          <Button onClick={() => setErrorType('data')} variant="outline">
            Trigger Data Error
          </Button>
          <Button onClick={() => setErrorType('prediction')} variant="outline">
            Trigger Prediction Error
          </Button>
          <Button onClick={() => setErrorType('generic')} variant="outline">
            Trigger Generic Error
          </Button>
        </div>

        <Button onClick={() => setErrorType(null)} variant="ghost" size="sm">
          Reset
        </Button>

        {errorType === 'auth' && (
          <AuthErrorBoundary onRetry={() => setErrorType(null)}>
            <ThrowError type="auth" />
          </AuthErrorBoundary>
        )}

        {errorType === 'data' && (
          <DataErrorBoundary onRetry={() => setErrorType(null)} showUploadOption>
            <ThrowError type="data" />
          </DataErrorBoundary>
        )}

        {errorType === 'prediction' && (
          <PredictionErrorBoundary 
            onRetry={() => setErrorType(null)}
            onFallbackModel={() => {
              setErrorType(null)
              alert('Switched to simple linear model')
            }}
          >
            <ThrowError type="prediction" />
          </PredictionErrorBoundary>
        )}

        {errorType === 'generic' && (
          <div className="p-4 border border-red-200 rounded">
            <ThrowError type="generic" />
          </div>
        )}

        {!errorType && (
          <Alert>
            <AlertDescription>
              Click any button above to test the corresponding error boundary
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export function ErrorHandlingExamples() {
  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Error Handling Examples</h1>
        <p className="text-gray-600">
          Comprehensive examples of error handling patterns in the application
        </p>
      </div>

      <div className="grid gap-6">
        <APIErrorExample />
        <ValidationErrorExample />
        <PredictionErrorExample />
        <ErrorBoundaryExample />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Error Handling Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Automatic Retry Logic</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Exponential backoff for network errors</li>
                <li>• Smart retry for server errors (5xx)</li>
                <li>• No retry for client errors (4xx)</li>
                <li>• Configurable retry limits</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Error Boundaries</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Global error boundary for unhandled errors</li>
                <li>• Specialized boundaries for different contexts</li>
                <li>• Recovery suggestions and actions</li>
                <li>• Error logging and performance tracking</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">User Experience</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• User-friendly error messages</li>
                <li>• Contextual recovery suggestions</li>
                <li>• Toast notifications for quick feedback</li>
                <li>• Loading states during retries</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Developer Experience</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Detailed error information in development</li>
                <li>• Error categorization and tracking</li>
                <li>• Performance impact monitoring</li>
                <li>• Comprehensive test coverage</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}