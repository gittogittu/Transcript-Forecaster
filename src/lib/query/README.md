# TanStack Query Implementation

This directory contains the complete TanStack Query implementation for the Transcript Analytics Platform, including data fetching hooks, caching strategies, error handling, and real-time updates.

## Overview

The implementation provides:
- **Optimistic Updates**: Immediate UI feedback with automatic rollback on errors
- **Intelligent Caching**: Configurable cache strategies with automatic invalidation
- **Real-time Updates**: Background sync and WebSocket integration
- **Error Handling**: Comprehensive error boundaries and retry mechanisms
- **Loading States**: Enhanced loading indicators and skeleton screens
- **Performance Monitoring**: Built-in performance tracking and optimization

## Core Components

### 1. Query Client Setup (`query-client.ts`)

```typescript
import { queryClient, queryKeys } from '@/lib/query/query-client'

// Pre-configured query client with optimized defaults
// Centralized query key management for consistency
```

### 2. Custom Hooks

#### Transcript Operations (`use-transcripts.ts`)
```typescript
import {
  useTranscripts,
  useTranscript,
  useCreateTranscript,
  useUpdateTranscript,
  useDeleteTranscript,
  useBulkCreateTranscripts,
} from '@/lib/hooks/use-transcripts'

// Fetch transcripts with filters
const { data, isLoading, error } = useTranscripts({ clientName: 'Client A' })

// Create with optimistic updates
const createMutation = useCreateTranscript()
createMutation.mutate({
  clientName: 'New Client',
  date: new Date(),
  transcriptCount: 10,
  createdBy: 'user-id',
})
```

#### Analytics Operations (`use-analytics.ts`)
```typescript
import {
  useTrends,
  usePredictions,
  useGeneratePredictions,
  useSummaryStats,
  useRealtimeAnalytics,
} from '@/lib/hooks/use-analytics'

// Real-time analytics dashboard
const analytics = useRealtimeAnalytics()
// analytics.trends, analytics.predictions, analytics.summary
```

#### Performance Monitoring (`use-monitoring.ts`)
```typescript
import {
  usePerformanceMetrics,
  useSystemHealth,
  useRealtimeMonitoring,
} from '@/lib/hooks/use-monitoring'

// System health monitoring
const { data: health } = useSystemHealth()
```

### 3. Enhanced Query States (`use-query-states.ts`)

```typescript
import {
  useEnhancedQuery,
  useEnhancedMutation,
  QueryStateWrapper,
} from '@/lib/hooks/use-query-states'

// Enhanced query with better loading/error states
const transcriptsQuery = useTranscripts()
const enhanced = useEnhancedQuery(transcriptsQuery)

// Use with wrapper component
<QueryStateWrapper
  queryState={enhanced}
  loadingSkeleton={<CustomSkeleton />}
  errorFallback={<CustomError />}
>
  {(data) => <TranscriptList data={data} />}
</QueryStateWrapper>
```

### 4. Error Boundaries (`error-boundaries/`)

```typescript
import {
  QueryErrorBoundary,
  TranscriptErrorBoundary,
  AnalyticsErrorBoundary,
} from '@/components/error-boundaries/query-error-boundary'

// Wrap components with appropriate error boundaries
<TranscriptErrorBoundary>
  <TranscriptList />
</TranscriptErrorBoundary>
```

## Invalidation Strategies

### Automatic Cache Invalidation

The system automatically invalidates related caches when data changes:

```typescript
// When transcript is created:
// - Invalidates transcript lists
// - Invalidates analytics (affects predictions)
// - Invalidates summary stats

// When prediction is generated:
// - Invalidates prediction queries
// - Invalidates summary stats

// When user role changes:
// - Invalidates all queries (data access may change)
```

### Manual Invalidation

```typescript
import { invalidateQueries } from '@/lib/query/query-client'

// Invalidate specific data types
invalidateQueries.transcripts()
invalidateQueries.analytics()
invalidateQueries.all()
```

## Real-time Updates

### WebSocket Integration

```typescript
import { RealtimeUpdateStrategies } from '@/lib/query/invalidation-strategies'

const realtimeStrategies = new RealtimeUpdateStrategies(queryClient)

// Handle WebSocket messages
realtimeStrategies.handleWebSocketMessage({
  type: 'transcript_created',
  data: { id: 'new-id' }
})
```

### Background Sync

```typescript
import { BackgroundSyncStrategies } from '@/lib/query/invalidation-strategies'

const backgroundSync = new BackgroundSyncStrategies(queryClient)

// Prefetch related data
backgroundSync.prefetchRelatedData.onTranscriptView('transcript-id')

// Background refresh
backgroundSync.backgroundRefresh.refreshCriticalData()
```

## Performance Optimization

### Caching Strategy

- **Transcript Lists**: 2 minutes stale time (frequently updated)
- **Transcript Details**: 5 minutes stale time (less frequent updates)
- **Analytics Trends**: 3 minutes stale time with auto-refetch every 5 minutes
- **Predictions**: 10 minutes stale time (computationally expensive)
- **System Health**: 15 seconds stale time with auto-refetch every 30 seconds

### Optimistic Updates

All mutations use optimistic updates for immediate UI feedback:

1. **Optimistic Update**: UI updates immediately with expected result
2. **API Call**: Actual mutation is sent to server
3. **Success**: Cache is updated with server response
4. **Error**: UI is rolled back to previous state, error is shown

### Query Key Management

Centralized query key factory prevents cache misses:

```typescript
// Consistent key generation
queryKeys.transcripts.list({ clientName: 'Client A' })
queryKeys.analytics.trends()
queryKeys.monitoring.health()
```

## Error Handling

### Error Types

1. **Network Errors**: Automatic retry with exponential backoff
2. **Validation Errors**: Immediate feedback with field-level errors
3. **Authentication Errors**: Redirect to login
4. **Server Errors**: User-friendly messages with retry options

### Error Recovery

```typescript
// Automatic retry for transient errors
retry: 3,
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)

// Manual retry for user-initiated actions
const enhanced = useEnhancedQuery(queryResult)
if (enhanced.canRetry) {
  enhanced.retry()
}
```

## Testing

### Unit Tests

```bash
npm test -- --testPathPattern="use-transcripts|use-analytics|use-query-states"
```

### Test Coverage

- ✅ Hook functionality
- ✅ Cache behavior
- ✅ Optimistic updates
- ✅ Error handling
- ✅ Invalidation strategies
- ✅ Real-time updates

## Usage Examples

### Basic Data Fetching

```typescript
function TranscriptList() {
  const { data, isLoading, error } = useTranscripts()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {data?.map(transcript => (
        <li key={transcript.id}>{transcript.clientName}</li>
      ))}
    </ul>
  )
}
```

### Advanced Usage with Enhanced States

```typescript
function AdvancedTranscriptList() {
  const transcriptsQuery = useTranscripts()
  const enhanced = useEnhancedQuery(transcriptsQuery)
  const createMutation = useCreateTranscript()
  const enhancedCreate = useEnhancedMutation(createMutation)

  return (
    <QueryStateWrapper
      queryState={enhanced}
      loadingSkeleton={<TranscriptSkeleton />}
    >
      {(transcripts) => (
        <div>
          <TranscriptGrid data={transcripts} />
          <CreateButton
            onClick={() => createMutation.mutate(newTranscriptData)}
            loading={enhancedCreate.isPending}
            error={enhancedCreate.error}
          />
        </div>
      )}
    </QueryStateWrapper>
  )
}
```

### Real-time Dashboard

```typescript
function Dashboard() {
  const analytics = useRealtimeAnalytics()
  const monitoring = useRealtimeMonitoring()

  return (
    <div>
      <AnalyticsErrorBoundary>
        <AnalyticsCharts data={analytics} />
      </AnalyticsErrorBoundary>
      
      <MonitoringErrorBoundary>
        <SystemHealth data={monitoring} />
      </MonitoringErrorBoundary>
    </div>
  )
}
```

## Best Practices

1. **Use Error Boundaries**: Wrap components with appropriate error boundaries
2. **Leverage Optimistic Updates**: For better user experience
3. **Implement Loading States**: Use skeletons for better perceived performance
4. **Cache Strategically**: Balance freshness with performance
5. **Handle Errors Gracefully**: Provide retry mechanisms and clear messages
6. **Monitor Performance**: Use built-in monitoring hooks
7. **Test Thoroughly**: Include cache behavior and error scenarios in tests

## Integration with Next.js

### App Router Setup

```typescript
// app/layout.tsx
import { QueryProvider } from '@/components/providers/query-provider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
```

### API Route Integration

```typescript
// app/api/transcripts/route.ts
export async function GET(request: Request) {
  // API implementation
  // Automatically works with TanStack Query hooks
}
```

This implementation provides a robust, scalable foundation for data management in the Transcript Analytics Platform with excellent developer experience and user performance.