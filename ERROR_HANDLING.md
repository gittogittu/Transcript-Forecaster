# Error Handling Guide

This document explains the comprehensive error handling system implemented in the Transcript Analytics Platform.

## Overview

The application uses a structured error handling approach with consistent error types, detailed context, and proper error propagation throughout the system.

## Core Error Types

### Base Error Interface

```typescript
interface AppError {
  name: string
  message: string
  code: string
  timestamp: Date
  context?: Record<string, unknown>
}
```

All errors in the application extend this base interface, providing:
- **name**: Error type identifier
- **message**: Human-readable error description
- **code**: Machine-readable error code for programmatic handling
- **timestamp**: When the error occurred
- **context**: Optional additional information about the error

### Validation Errors

```typescript
interface ValidationErrorData extends AppError {
  field: string
  value: any
  name: string
  timestamp: Date
}

interface ValidationWarning {
  field: string
  message: string
  value: any
  code: string
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationErrorData[]
  warnings: ValidationWarning[]
}
```

Used for form validation and data validation throughout the application.

### API Response Structure

```typescript
interface DataFetchResult<T> {
  data: T | null
  error: string | null
  loading: boolean
  lastUpdated?: Date
}
```

Consistent structure for all API responses and data operations.

## Specialized Error Types

### Authentication Errors

```typescript
class AuthenticationErrorClass extends Error implements AppError {
  name = 'AuthenticationError' as const
  code = 'AUTH_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(message: string) {
    super(message)
  }
}
```

Handles OAuth failures, session issues, and access control problems.

### API Errors

```typescript
class APIErrorClass extends Error implements AppError {
  name = 'APIError' as const
  code = 'API_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(
    message: string,
    public status: number,
    public endpoint: string
  ) {
    super(message)
  }
}
```

Handles HTTP errors, network issues, and external API failures.

### Prediction Errors

```typescript
class PredictionErrorClass extends Error implements AppError {
  name = 'PredictionError' as const
  code = 'PREDICTION_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(
    message: string,
    public modelType: string,
    public dataSize: number
  ) {
    super(message)
  }
}
```

Handles machine learning model errors and prediction failures.

### Validation Errors

```typescript
class ValidationErrorClass extends Error implements AppError {
  name = 'ValidationError' as const
  code = 'VALIDATION_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message)
  }
}
```

Handles form validation and data validation errors with field-specific context.

### Google Sheets Errors

```typescript
interface SheetsError {
  code: number
  message: string
  status: string
}
```

Handles Google Sheets API specific errors.

## Error Handling Patterns

### API Routes

All API routes follow this error handling pattern:

```typescript
export async function GET(request: NextRequest) {
  try {
    // API logic here
    return NextResponse.json({ data: result, success: true })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'API_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
```

### Service Functions

Service functions return consistent error structures:

```typescript
export async function fetchData(): Promise<DataFetchResult<DataType>> {
  try {
    const data = await externalService.getData()
    return {
      data,
      error: null,
      loading: false,
      lastUpdated: new Date()
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch data',
      loading: false
    }
  }
}
```

### Component Error Handling

Components use error boundaries and hooks for error handling:

```typescript
function MyComponent() {
  const { data, error, loading } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
    onError: (error) => {
      // Log structured error
      console.error('Component Error:', {
        name: 'ComponentError',
        message: error.message,
        code: 'COMPONENT_ERROR',
        timestamp: new Date(),
        context: { component: 'MyComponent' }
      })
    }
  })

  if (error) {
    return <ErrorDisplay error={error} />
  }

  // Component logic
}
```

## Error Logging and Monitoring

### Development

In development, errors are logged to the console with full context:

```typescript
console.error('Error Details:', {
  name: error.name,
  message: error.message,
  code: error.code,
  timestamp: error.timestamp,
  context: error.context,
  stack: error.stack
})
```

### Production

In production, errors are automatically captured by the production monitoring system and sent to external monitoring services:

```typescript
// Automatic error tracking via production monitor
window.__PRODUCTION_MONITOR__.trackError({
  message: error.message,
  stack: error.stack,
  url: window.location.href,
  timestamp: new Date(),
  sessionId: sessionId,
  userId: userId,
  userAgent: navigator.userAgent,
  additionalContext: {
    errorCode: error.code,
    errorType: error.name,
    context: error.context
  }
})

// Integration with external services (Sentry, DataDog, etc.)
if (process.env.SENTRY_DSN) {
  Sentry.captureException(error, {
    tags: {
      errorCode: error.code,
      errorType: error.name
    },
    extra: error.context
  })
}
```

The production monitoring system automatically:
- Captures all JavaScript errors and unhandled promise rejections
- Integrates with React Error Boundaries
- Sends critical error alerts via webhooks (Slack, email, etc.)
- Provides detailed error context including user session and application state
- Aggregates error metrics for the admin monitoring dashboard

## Error Recovery Strategies

### Retry Logic

For transient errors, implement retry logic:

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxRetries) throw error
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      )
    }
  }
  throw new Error('Max retries exceeded')
}
```

### Graceful Degradation

For non-critical features, implement graceful degradation:

```typescript
async function fetchOptionalData() {
  try {
    return await fetchData()
  } catch (error) {
    console.warn('Optional data fetch failed:', error)
    return null // Return fallback value
  }
}
```

### Circuit Breaker

For external services, implement circuit breaker pattern:

```typescript
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private readonly threshold = 5
  private readonly timeout = 60000 // 1 minute

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open')
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private isOpen(): boolean {
    return this.failures >= this.threshold && 
           Date.now() - this.lastFailureTime < this.timeout
  }

  private onSuccess(): void {
    this.failures = 0
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
  }
}
```

## Testing Error Scenarios

### Unit Tests

Test error conditions in unit tests:

```typescript
describe('Error Handling', () => {
  it('should handle API errors gracefully', async () => {
    const mockError = new Error('API Error')
    mockService.getData.mockRejectedValue(mockError)

    const result = await fetchData()

    expect(result).toEqual({
      data: null,
      error: 'API Error',
      loading: false
    })
  })
})
```

### Integration Tests

Test error propagation in integration tests:

```typescript
it('should return structured error for invalid data', async () => {
  const response = await request(app)
    .post('/api/transcripts')
    .send({ invalidData: true })

  expect(response.status).toBe(400)
  expect(response.body).toMatchObject({
    error: expect.any(String),
    code: 'VALIDATION_ERROR',
    timestamp: expect.any(String)
  })
})
```

## Best Practices

### 1. Always Use Structured Errors

```typescript
// Good
throw new ValidationErrorClass(
  'Invalid email format',
  'email',
  userInput.email
)

// Bad
throw new Error('Invalid email')
```

### 2. Provide Context

```typescript
// Good
const apiError = new APIErrorClass(
  'Failed to fetch user data',
  404,
  '/api/users'
)
apiError.context = {
  userId: user.id,
  requestId: request.id
}
throw apiError
```

### 3. Handle Errors at the Right Level

- **Component Level**: UI-specific errors (form validation, display issues)
- **Service Level**: Business logic errors (data validation, processing)
- **API Level**: Network and external service errors
- **Application Level**: Global errors (authentication, authorization)

### 4. Use Error Boundaries

```typescript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught error:', {
      name: 'ComponentError',
      message: error.message,
      code: 'COMPONENT_ERROR',
      timestamp: new Date(),
      context: { errorInfo }
    })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}
```

### 5. Validate Early and Often

```typescript
function processTranscriptData(data: unknown): ValidationResult {
  const errors: ValidationErrorData[] = []
  const warnings: ValidationWarning[] = []

  // Validate required fields
  if (!data.clientName) {
    const validationError = new ValidationErrorClass(
      'Client name is required',
      'clientName',
      data.clientName
    )
    errors.push({
      name: validationError.name,
      message: validationError.message,
      code: 'REQUIRED_FIELD',
      field: 'clientName',
      value: data.clientName,
      timestamp: validationError.timestamp
    })
  }

  // Check for potential issues
  if (data.transcriptCount > 1000) {
    warnings.push({
      field: 'transcriptCount',
      message: 'Unusually high transcript count',
      code: 'HIGH_VALUE',
      value: data.transcriptCount
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Error Rate**: Percentage of requests that result in errors
2. **Error Types**: Distribution of different error types
3. **Error Frequency**: How often specific errors occur
4. **Recovery Time**: How quickly the system recovers from errors
5. **User Impact**: How errors affect user experience

### Alerting Thresholds

- **Critical**: Authentication errors > 5% of requests
- **Warning**: API errors > 2% of requests
- **Info**: Validation errors > 10% of form submissions

### Dashboard Metrics

Create dashboards to track:
- Error trends over time
- Most common error types
- Error distribution by feature/component
- User-facing vs system errors
- Error resolution times

This comprehensive error handling system ensures robust, maintainable, and debuggable applications with excellent user experience even when things go wrong.