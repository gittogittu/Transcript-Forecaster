# Error Handling System

This document describes the comprehensive error handling system implemented for the Transcript Analytics Platform.

## Overview

The error handling system consists of:

1. **Error Types** - Custom error classes for different error scenarios
2. **Error Boundaries** - React components that catch and handle errors in different app sections
3. **Error Handlers** - Global error handling utilities for API calls and network requests
4. **Error Logger** - Centralized logging system for error tracking
5. **Error Hook** - React hook for consistent error handling across components

## Error Types

### Custom Error Classes

```typescript
// Authentication errors
new AuthenticationError(message: string, code: string)

// API errors
new APIError(message: string, status: number, endpoint: string)

// Google Sheets errors
new GoogleSheetsError(message: string, operation: string, sheetId?: string)

// Prediction/analytics errors
new PredictionError(message: string, modelType: string, dataSize: number)

// Network errors
new NetworkError(message: string, url: string, status?: number)

// Validation errors
new ValidationError(message: string, field: string, value: any)
```

## Error Boundaries

### 1. GlobalErrorBoundary

Catches all unhandled errors in the application.

```tsx
import { GlobalErrorBoundary } from '@/components/error-boundaries'

function App() {
  return (
    <GlobalErrorBoundary>
      <YourAppContent />
    </GlobalErrorBoundary>
  )
}
```

### 2. AuthErrorBoundary

Handles authentication-related errors.

```tsx
import { AuthErrorBoundary } from '@/components/error-boundaries'

function AuthSection() {
  return (
    <AuthErrorBoundary>
      <LoginForm />
      <UserProfile />
    </AuthErrorBoundary>
  )
}
```

### 3. DataErrorBoundary

Handles API calls and Google Sheets operations.

```tsx
import { DataErrorBoundary } from '@/components/error-boundaries'

function DataSection() {
  return (
    <DataErrorBoundary onRetry={() => refetchData()}>
      <TranscriptTable />
      <DataForm />
    </DataErrorBoundary>
  )
}
```

### 4. PredictionErrorBoundary

Handles prediction and analytics errors.

```tsx
import { PredictionErrorBoundary } from '@/components/error-boundaries'

function AnalyticsSection() {
  return (
    <PredictionErrorBoundary 
      onRetry={() => regeneratePredictions()}
      onFallbackModel={() => useSimpleModel()}
    >
      <PredictionChart />
      <AnalyticsDashboard />
    </PredictionErrorBoundary>
  )
}
```

## Error Handlers

### API Error Handling

```typescript
import { handleAPIResponse, handleNetworkRequest } from '@/lib/errors/error-handlers'

// Handle API responses
const data = await handleAPIResponse(response, '/api/transcripts')

// Handle network requests with retry
const result = await handleNetworkRequest(
  () => fetch('/api/data'),
  '/api/data',
  3 // retry attempts
)
```

### Global Error Handling

```typescript
import { handleError, handleAsyncError } from '@/lib/errors/error-handlers'

// Handle synchronous errors
try {
  // some operation
} catch (error) {
  handleError(error as AppError, { context: 'user_action' })
}

// Handle async errors
const promise = fetchData()
await handleAsyncError(promise, { context: 'data_fetch' })
```

## Error Hook

Use the `useErrorHandler` hook for consistent error handling in components:

```tsx
import { useErrorHandler } from '@/lib/hooks/use-error-handler'

function MyComponent() {
  const { handleError, handleAsyncError, getRecoverySuggestions } = useErrorHandler()

  const handleSubmit = async (data: FormData) => {
    try {
      await handleAsyncError(
        submitData(data),
        { component: 'MyComponent', action: 'submit' }
      )
    } catch (error) {
      // Error is already handled by the hook
      console.log('Submission failed')
    }
  }

  const handleClick = () => {
    try {
      // some operation
    } catch (error) {
      handleError(error as AppError, { component: 'MyComponent' })
      
      // Get recovery suggestions
      const suggestions = getRecoverySuggestions(error as AppError)
      console.log('Recovery suggestions:', suggestions)
    }
  }

  return (
    // component JSX
  )
}
```

## Error Logging

The error logger automatically logs all errors with context:

```typescript
import { errorLogger, logError, logAPIError, logNetworkError } from '@/lib/errors/error-logger'

// Manual logging
logError(new Error('Custom error'), { userId: '123', action: 'custom' })

// API error logging
logAPIError('Server error', 500, '/api/endpoint', { requestId: 'abc123' })

// Network error logging
logNetworkError('Connection failed', 'https://api.example.com', 0, { timeout: true })

// Get recent logs (for debugging)
const recentLogs = errorLogger.getRecentLogs(10)
```

## Integration Examples

### 1. Complete App Setup

```tsx
// app/layout.tsx
import { GlobalErrorBoundary } from '@/components/error-boundaries'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GlobalErrorBoundary>
          {children}
        </GlobalErrorBoundary>
      </body>
    </html>
  )
}
```

### 2. Dashboard with Multiple Boundaries

```tsx
// app/dashboard/page.tsx
import { 
  AuthErrorBoundary, 
  DataErrorBoundary, 
  PredictionErrorBoundary 
} from '@/components/error-boundaries'

export default function Dashboard() {
  return (
    <div className="dashboard">
      <AuthErrorBoundary>
        <UserNavigation />
      </AuthErrorBoundary>

      <DataErrorBoundary>
        <TranscriptData />
      </DataErrorBoundary>

      <PredictionErrorBoundary>
        <AnalyticsCharts />
      </PredictionErrorBoundary>
    </div>
  )
}
```

### 3. API Route with Error Handling

```typescript
// app/api/transcripts/route.ts
import { handleAPIResponse } from '@/lib/errors/error-handlers'
import { APIError } from '@/lib/errors/error-types'

export async function GET() {
  try {
    const data = await fetchTranscripts()
    return Response.json(data)
  } catch (error) {
    if (error instanceof APIError) {
      return Response.json(
        { error: error.message },
        { status: error.status }
      )
    }
    
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 4. Component with Error Handling

```tsx
// components/transcript-form.tsx
import { useErrorHandler } from '@/lib/hooks/use-error-handler'
import { DataErrorBoundary } from '@/components/error-boundaries'

function TranscriptForm() {
  const { handleAsyncError } = useErrorHandler()

  const handleSubmit = async (data: FormData) => {
    try {
      await handleAsyncError(
        submitTranscript(data),
        { component: 'TranscriptForm', action: 'submit' }
      )
      // Success handling
    } catch (error) {
      // Error is already handled and logged
    }
  }

  return (
    <DataErrorBoundary>
      <form onSubmit={handleSubmit}>
        {/* form content */}
      </form>
    </DataErrorBoundary>
  )
}
```

## Error Recovery Strategies

### 1. Automatic Retry

```typescript
// Automatic retry with exponential backoff
await handleNetworkRequest(
  () => fetch('/api/data'),
  '/api/data',
  3 // max retries
)
```

### 2. Fallback Models

```tsx
<PredictionErrorBoundary 
  onFallbackModel={() => {
    // Switch to simpler prediction model
    setPredictionModel('linear')
  }}
>
  <PredictionChart />
</PredictionErrorBoundary>
```

### 3. User-Guided Recovery

```typescript
const suggestions = getRecoverySuggestions(error)
// Display suggestions to user:
// - "Check your internet connection"
// - "Try refreshing the page"
// - "Contact support if problem persists"
```

## Monitoring and Debugging

### Development Mode

In development, errors are logged to the console with full details:

```
🚨 Error: APIError
Message: Server returned 500
Stack: [full stack trace]
Component Stack: [React component stack]
Additional Context: { endpoint: '/api/data', userId: '123' }
```

### Production Mode

In production, errors are:
- Stored in localStorage (last 50 errors)
- Sent to external logging service (configurable)
- Displayed to users with friendly messages

### Error Log Structure

```typescript
interface ErrorLogEntry {
  id: string
  timestamp: Date
  error: AppError
  errorInfo?: ErrorInfo
  userId?: string
  userAgent: string
  url: string
  additionalContext?: Record<string, any>
}
```

## Best Practices

1. **Use Specific Error Types**: Create specific error types for different scenarios
2. **Wrap Components**: Use appropriate error boundaries for different app sections
3. **Provide Context**: Always include relevant context when logging errors
4. **User-Friendly Messages**: Show helpful error messages to users
5. **Recovery Options**: Provide clear recovery actions (retry, refresh, contact support)
6. **Monitor Errors**: Set up proper error monitoring in production
7. **Test Error Scenarios**: Write tests for error handling paths

## Testing

Error boundaries and handlers include comprehensive tests:

```bash
# Run error handling tests
npm test -- --testPathPattern="error"

# Run specific error boundary tests
npm test -- src/components/error-boundaries/__tests__

# Run error handler tests
npm test -- src/lib/errors/__tests__
```

## Configuration

### Environment Variables

```env
# Error logging configuration
NEXT_PUBLIC_ERROR_LOGGING_ENABLED=true
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_LOG_LEVEL=error
```

### External Services

Configure external error monitoring services:

```typescript
// lib/errors/external-logging.ts
export function setupExternalLogging() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Initialize Sentry
  }
  
  if (process.env.NEXT_PUBLIC_DATADOG_KEY) {
    // Initialize Datadog
  }
}
```

This error handling system provides comprehensive coverage for all error scenarios in the Transcript Analytics Platform, ensuring a robust and user-friendly experience even when things go wrong.