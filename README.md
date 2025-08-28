# Transcript Analytics Platform

A Next.js 15 web application that provides predictive analytics for client transcript data with Google Sheets integration and machine learning capabilities.

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript (strict mode enabled)
- **Runtime**: React 19.1.0
- **Styling**: Tailwind CSS 4 + Shadcn UI components
- **Database**: PostgreSQL with custom migration system
- **Authentication**: NextAuth.js with multiple providers (Auth0, Google, GitHub)
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form + Zod validation
- **Animation**: Framer Motion
- **Charts**: Recharts
- **Machine Learning**: TensorFlow.js
- **Testing**: Jest + Playwright + Testing Library
- **Error Handling**: Comprehensive error tracking with structured error types

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API routes
│   │   ├── analytics/     # Analytics endpoints
│   │   ├── auth/          # Authentication endpoints
│   │   ├── monitoring/    # Performance monitoring
│   │   ├── sheets/        # Google Sheets integration
│   │   └── transcripts/   # Transcript data endpoints
│   ├── admin/             # Admin-only pages
│   ├── analytics/         # Analytics dashboard pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── unauthorized/      # Access denied page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── analytics/         # Analytics and charts components
│   ├── animations/        # Animation components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   ├── data/              # Data table and form components
│   ├── error-boundaries/  # Error handling components
│   ├── monitoring/        # Performance monitoring UI
│   └── ui/                # Shadcn UI components
├── lib/                   # Utilities and configurations
│   ├── auth.ts            # NextAuth configuration
│   ├── config/            # Configuration files
│   ├── database/          # Database connection and migrations
│   ├── errors/            # Error handling utilities
│   ├── hooks/             # Custom React hooks
│   ├── middleware/        # API middleware (rate limiting, validation)
│   ├── migration/         # Database migration utilities
│   ├── monitoring/        # Performance monitoring
│   ├── services/          # External service integrations
│   ├── testing/           # Testing utilities and mocks
│   ├── utils/             # General utility functions
│   ├── validations/       # Zod validation schemas
│   └── utils.ts           # Core utility functions
├── types/                 # TypeScript type definitions
│   ├── transcript.ts      # Transcript data models and interfaces
│   ├── aht.ts            # Average Handle Time (AHT) data types
│   ├── auth.d.ts         # Authentication types
│   └── next-auth.d.ts    # NextAuth type extensions
├── middleware.ts          # Next.js middleware for auth/routing
└── global.d.ts            # Global type declarations
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

### Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run analyze` - Bundle analysis (set ANALYZE=true)

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - TypeScript type checking

### Testing
- `npm run test` - Run Jest unit tests
- `npm run test:watch` - Jest in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run test:integration` - Integration tests only
- `npm run test:accessibility` - Accessibility tests
- `npm run test:performance` - Performance tests
- `npm run test:e2e` - Playwright E2E tests
- `npm run test:e2e:ui` - E2E tests with UI
- `npm run test:all` - Run all test suites

### Database
- `npm run migrate` - Run database migrations
- `npm run db:migrate` - Alias for migrate
- `npm run db:status` - Check migration status

### Performance & Monitoring
- `npm run benchmark` - Performance benchmarks
- `npm run perf:monitor` - Performance monitoring tests
- `npm run perf:bundle` - Bundle optimization tests
- `npm run lighthouse` - Lighthouse CI

### Deployment
- `npm run deploy` - Deploy to default environment
- `npm run deploy:staging` - Deploy to staging
- `npm run deploy:production` - Deploy to production
- `npm run deploy:dry-run` - Dry run deployment
- `npm run validate:deployment` - Post-deployment validation
- `npm run workflow:complete` - Full integration workflow

## Development Guidelines

- TypeScript strict mode is enabled
- ESLint and Prettier are configured for code quality
- Use Shadcn UI components for consistent design
- Follow the established folder structure
- Write type-safe code with proper validation
- Performance monitoring is optional and can be enabled manually when needed

### Dynamic Import Pattern for SSR Compatibility

When using libraries that are not compatible with server-side rendering (like TensorFlow.js), use the dynamic import pattern:

```typescript
// State for dynamically imported service
const [predictionService, setPredictionService] = useState<any>(null)

// Dynamic import in async function
const handleGeneratePredictions = async () => {
  let serviceToUse = predictionService
  if (!serviceToUse) {
    const { PredictionService } = await import('@/lib/services/prediction-service')
    serviceToUse = new PredictionService()
    setPredictionService(serviceToUse)
  }
  // Use serviceToUse for operations
}
```

This pattern ensures:
- No SSR conflicts with browser-only libraries
- Lazy loading for better initial page performance
- Proper error handling for import failures
- State management for service instances



## Key Features

### Data Management
- Import and manage client transcript data from Google Sheets
- Real-time data synchronization with conflict resolution
- Comprehensive data validation with business rule enforcement
- Batch operations and data consistency checks
- **Average Handle Time (AHT) Analytics**: Track and analyze client performance metrics including overall AHT, review AHT, and validation AHT with monthly trend analysis

### Predictive Analytics
- Machine learning-powered predictions using TensorFlow.js (dynamically loaded for SSR compatibility)
- Multiple prediction models (linear, polynomial, ARIMA)
- Confidence intervals and accuracy metrics
- Model performance monitoring and optimization
- Client-side ML processing with WebGL acceleration and CPU fallback
- Dynamic import pattern ensures compatibility with Next.js App Router and server-side rendering

### Interactive Dashboards
- **Current Status**: Simplified analytics dashboard with basic metrics display
- **In Development**: Full-featured analytics with interactive charts and visualizations
- **AHT Analytics**: Comprehensive Average Handling Time dashboard with client performance insights
- **Planned Features**: Customizable filters, date range selection, and export capabilities
- Summary statistics and trend analysis (basic implementation available)
- Multi-dimensional data analysis with risk assessment and predictive modeling

### Authentication & Security
- Multi-provider authentication (Auth0, Google, GitHub)
- Role-based access control (admin/user roles)
- Session management and secure routing
- Rate limiting and API protection
- Compact dropdown-based user profile interface
- Integrated user settings and sign-out functionality

### Performance & Monitoring
- Built-in performance tracking and optimization
- Real-time error monitoring with structured error types
- Comprehensive logging and debugging tools
- Performance benchmarks and health checks
- Production monitoring dashboard for admin users
- Core Web Vitals tracking (LCP, FID, CLS)
- Resource performance monitoring
- User analytics and interaction tracking
- Automated error alerting and critical issue detection

## Error Handling

The application implements a comprehensive error handling system with structured error types:

- **AppError**: Base error interface with name, message, code, timestamp, and optional context
- **ValidationErrorData**: Enhanced validation errors with field-specific information
- **ValidationResult**: Structured validation results with errors and warnings
- **Specialized Error Types**: AuthenticationError, APIError, PredictionError for specific domains

### Error Types

```typescript
// Base error structure
interface AppError {
  name: string
  message: string
  code: string
  timestamp: Date
  context?: Record<string, unknown>
}

// Validation-specific errors
interface ValidationErrorData extends AppError {
  field: string
  value: any
}

// API response structure
interface DataFetchResult<T> {
  data: T | null
  error: string | null
  loading: boolean
}
```

### Error Classes

The application provides concrete error classes for different error types:

```typescript
// Validation errors with field context
class ValidationErrorClass extends Error implements AppError {
  name = 'ValidationError'
  code = 'VALIDATION_ERROR'
  timestamp = new Date()
  
  constructor(message: string, public field: string, public value: any) {
    super(message)
  }
}

// API errors with status and endpoint context
class APIErrorClass extends Error implements AppError {
  name = 'APIError'
  code = 'API_ERROR'
  timestamp = new Date()
  
  constructor(message: string, public status: number, public endpoint: string) {
    super(message)
  }
}

// Prediction errors with model context
class PredictionErrorClass extends Error implements AppError {
  name = 'PredictionError'
  code = 'PREDICTION_ERROR'
  timestamp = new Date()
  
  constructor(message: string, public modelType: string, public dataSize: number) {
    super(message)
  }
}
```

All API endpoints and data operations return consistent error structures for better debugging and user experience.

For detailed information about error handling patterns, monitoring, and best practices, see [ERROR_HANDLING.md](./ERROR_HANDLING.md).

## Average Handle Time (AHT) Analytics

The platform includes comprehensive Average Handle Time analytics capabilities for tracking client performance metrics and operational efficiency.

### AHT Data Types

The application defines several TypeScript interfaces for AHT data management:

```typescript
// Core AHT data structure
interface AHTData {
  client: string
  overallAHT: number
  reviewAHT: number
  validationAHT: number
  monthlyData: {
    [key: string]: number // e.g., "2024_Jun": 0, "2024_Jul": 252
  }
  grandTotal: number
}

// Summary statistics for AHT analysis
interface AHTSummary {
  totalClients: number
  averageAHT: number
  medianAHT: number
  highestAHT: { client: string; value: number }
  lowestAHT: { client: string; value: number }
  totalVolume: number
}

// Monthly trend analysis
interface MonthlyTrend {
  month: string
  totalVolume: number
  averageAHT: number
  clientCount: number
}

// Client performance metrics
interface ClientPerformance {
  client: string
  overallAHT: number
  trend: 'increasing' | 'decreasing' | 'stable'
  trendPercentage: number
  riskLevel: 'low' | 'medium' | 'high'
  monthlyVolumes: Array<{ month: string; volume: number }>
}
```

### AHT Features

- **Multi-dimensional AHT Tracking**: Track overall AHT, review AHT, and validation AHT separately for comprehensive performance analysis
- **Monthly Trend Analysis**: Monitor AHT performance over time with monthly data points and trend calculations
- **Client Performance Scoring**: Automatic risk level assessment based on AHT trends and performance metrics
- **Summary Statistics**: Calculate averages, medians, and identify top/bottom performing clients
- **Volume Correlation**: Track the relationship between transaction volume and AHT performance

### Integration with Existing Analytics

AHT data integrates seamlessly with the existing transcript analytics platform:

- **Unified Dashboard**: AHT metrics can be displayed alongside transcript volume data
- **Predictive Analytics**: AHT trends can be used to predict future performance and identify potential issues
- **Client Insights**: Combined transcript and AHT data provides comprehensive client performance profiles
- **Performance Monitoring**: AHT metrics contribute to overall system health and performance tracking

## Production Monitoring

The application includes a comprehensive production monitoring system that tracks application health, performance metrics, and user interactions.

### Monitoring Features

#### Error Tracking
- **Global Error Handling**: Automatic capture of JavaScript errors and unhandled promise rejections
- **React Error Boundaries**: Integration with React error boundaries for component-level error tracking
- **Critical Error Alerts**: Immediate notifications for critical errors (authentication, payment, security issues)
- **Error Context**: Detailed error information including stack traces, user context, and session data

#### Performance Monitoring
- **Core Web Vitals**: Automatic tracking of LCP (Largest Contentful Paint), FID (First Input Delay), and CLS (Cumulative Layout Shift)
- **Navigation Timing**: Comprehensive timing metrics for DNS lookup, TCP connection, request/response cycles
- **Resource Performance**: Monitoring of slow-loading resources and assets
- **Custom Performance Marks**: Track custom application performance metrics

#### User Analytics
- **Page Views**: Automatic tracking of page navigation and user journeys
- **Interaction Tracking**: Click events, form submissions, and feature usage
- **Session Management**: User session tracking with unique session identifiers
- **Feature Usage**: Custom event tracking for specific application features

### Admin Monitoring Dashboard

Admin users have access to a dedicated monitoring dashboard at `/admin/monitoring` that provides:

- Real-time application health status
- Error logs and performance metrics
- User activity analytics
- System performance indicators
- Critical issue alerts

### API Endpoints

#### POST /api/monitoring/events
Receives monitoring data from the client including errors, performance metrics, and user events.

**Rate Limited**: 100 requests per minute per client

**Payload Structure**:
```typescript
{
  errors: ErrorEvent[],
  performance: PerformanceMetric[],
  userEvents: UserEvent[],
  metadata: {
    sessionId: string,
    userId?: string,
    timestamp: string,
    environment: string,
    userAgent: string,
    url: string
  }
}
```

#### GET /api/monitoring/events
Health check endpoint that returns monitoring system status and recent log counts.

### Configuration

The monitoring system can be configured through environment variables:

```env
# External logging service integration
LOGGING_ENDPOINT=https://your-logging-service.com/api/logs
LOGGING_API_KEY=your-api-key

# Alert notifications
ALERT_WEBHOOK_URL=https://hooks.slack.com/your-webhook-url

# Sentry integration (optional)
SENTRY_DSN=https://your-sentry-dsn
```

### Integration

The monitoring system automatically initializes in production environments. For custom tracking:

```typescript
// Track custom errors
window.__PRODUCTION_MONITOR__.trackError(error, errorInfo)

// Track performance metrics
window.__PERFORMANCE_TRACKER__.markStart('custom-operation')
window.__PERFORMANCE_TRACKER__.markEnd('custom-operation')

// Track feature usage
window.__ANALYTICS_TRACKER__.trackFeature('feature-name', { property: 'value' })
```

### Privacy & Data Handling

- All monitoring data is anonymized and aggregated
- Personal information is never logged in error contexts
- User consent is respected for analytics tracking
- Data retention policies are enforced automatically

## Testing

The application includes comprehensive test coverage across multiple testing strategies:

### Unit Tests
- **Component Tests**: React component behavior and rendering
- **Utility Tests**: Helper functions and data transformations
- **Service Tests**: API integrations and business logic
- **Hook Tests**: Custom React hooks functionality

### Integration Tests
- **API Integration**: End-to-end API workflow testing
- **Data Flow**: Complete data processing pipelines
- **Authentication**: OAuth flow and session management
- **Database**: Migration and data consistency

### End-to-End Tests
- **User Workflows**: Complete user journeys from login to analytics
- **Cross-browser**: Testing across different browsers and devices
- **Performance**: Page load times and interaction responsiveness
- **Accessibility**: WCAG compliance and screen reader compatibility

### Performance Tests
- **Bundle Analysis**: Code splitting and optimization validation
- **Prediction Performance**: Machine learning model efficiency
- **Memory Usage**: Resource consumption monitoring
- **Load Testing**: Concurrent user simulation

### Test Utilities
- **Mock Services**: Comprehensive mocking for external APIs
- **Test Helpers**: Reusable testing utilities and fixtures
- **Performance Helpers**: Benchmarking and profiling tools
- **Accessibility Helpers**: Automated accessibility testing

Run the complete test suite with:
```bash
npm run test:all
```

## Documentation

- [Authentication Setup](./AUTH_SETUP.md) - OAuth configuration and user management
- [Google Sheets Setup](./GOOGLE_SHEETS_SETUP.md) - API integration and data synchronization
- [Database Setup](./DATABASE_SETUP.md) - PostgreSQL configuration and migrations
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment and CI/CD
- [Error Handling](./ERROR_HANDLING.md) - Comprehensive error management system
- [AHT Analytics](./AHT_ANALYTICS.md) - Average Handle Time analytics and data types

## Analytics Page Status

The analytics dashboard is currently using a simplified fallback implementation while the full-featured version is being developed.

### Current Implementation
- **Active Page**: `src/app/analytics/page-simple.tsx` - Basic analytics dashboard with static metrics
- **Disabled Page**: `src/app/analytics/page.tsx` - Full-featured analytics (temporarily disabled)

### Missing Dependencies for Full Analytics
1. **API Endpoints**:
   - `/api/transcripts/summary` - Summary statistics endpoint
   - Enhanced `/api/transcripts` response format
   
2. **TanStack Query Setup**:
   - Query client provider configuration
   - Error boundary integration
   
3. **Chart Components**:
   - All chart components exist but may need data format adjustments
   - Interactive chart features require API data structure alignment

### Restoring Full Analytics
To enable the full analytics page:

1. **Implement Missing API Endpoints**:
   ```bash
   # Create the summary endpoint
   touch src/app/api/transcripts/summary/route.ts
   ```

2. **Add TanStack Query Provider**:
   ```typescript
   // In src/app/layout.tsx
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
   ```

3. **Enable the Full Page**:
   ```typescript
   // In src/app/analytics/page.tsx
   // Uncomment: export default AnalyticsPage
   ```

## Recent Updates

### AHT Analytics Integration
- **Comprehensive AHT Dashboard**: New analytics system for Average Handling Time data with client performance insights
- **Multi-dimensional Analysis**: Summary statistics, monthly trends, client performance rankings, and risk assessment
- **Predictive Analytics**: Simple linear regression for AHT trend forecasting with confidence intervals
- **Interactive Visualizations**: Charts for volume trends, client comparisons, and risk distribution analysis
- **API Endpoints**: RESTful endpoints for AHT summary, trends, client data, and predictions (`/api/aht/*`)
- **Real-time Data Processing**: Client-side analytics service with statistical calculations and trend analysis
- **CSV Data Support**: Infrastructure for importing and processing AHT data from CSV files
- **Navigation Integration**: AHT analytics accessible through main navigation with dedicated page at `/analytics/aht`

### User Interface Improvements
- **UserProfile Component Redesign**: Transformed from a card-based layout to a compact dropdown menu interface
- **Navigation Integration**: UserProfile now optimized for navigation bars with minimal footprint
- **Enhanced User Experience**: Dropdown menu provides quick access to user information, settings, and sign-out functionality
- **Responsive Design**: Avatar-based trigger with fallback to user initials for better mobile experience
- **Accessibility**: Improved keyboard navigation and screen reader support with proper ARIA labels

### Analytics Page Fallback System
- **Simplified Analytics Page**: A simplified analytics page (`page-simple.tsx`) is currently active as a fallback while the full-featured analytics page has build issues
- **Missing API Endpoints**: The full analytics page requires additional API endpoints like `/api/transcripts/summary` that need to be implemented
- **TanStack Query Integration**: The analytics page uses TanStack Query hooks (`useTranscripts`, `useTranscriptSummary`) for data fetching
- **Gradual Feature Restoration**: Features will be gradually restored as missing dependencies and API endpoints are implemented

### Performance Provider Optimization
- **Optional Performance Monitoring**: The PerformanceProvider is now commented out in the root layout to reduce initial bundle size and improve startup performance
- **Manual Performance Monitoring**: Performance monitoring can still be initialized manually using `initializePerformanceMonitoring()` from `@/lib/monitoring/performance-monitor`
- **Selective Monitoring**: Applications can now choose when and where to enable performance monitoring based on specific needs
- **Reduced Bundle Size**: Removing the automatic performance provider reduces the initial JavaScript bundle size by avoiding automatic initialization of monitoring, bundle optimization, and service worker features
- **On-Demand Monitoring**: Performance monitoring, bundle optimization, and service worker initialization can be triggered on-demand when needed

### TensorFlow.js Dynamic Loading Enhancement
- **SSR Compatibility**: TensorFlow.js is now dynamically imported to avoid server-side rendering issues
- **Performance Optimization**: Lazy loading of ML models reduces initial bundle size and improves page load times
- **Backend Selection**: Automatic backend selection with WebGL acceleration and CPU fallback for maximum compatibility
- **Memory Management**: Improved tensor disposal and memory cleanup to prevent memory leaks
- **Error Handling**: Enhanced error handling for ML model initialization and prediction failures
- **Analytics Page Update**: PredictionService is now dynamically imported in the analytics page to prevent SSR conflicts
- **Client-Side ML Processing**: Machine learning operations are now exclusively client-side to ensure compatibility with Next.js App Router
- **State Management**: Proper state management for dynamically imported services with error handling

### Error Handling System Enhancement
- **Structured Error Classes**: Implemented concrete error classes (`ValidationErrorClass`, `APIErrorClass`, `PredictionErrorClass`, `AuthenticationErrorClass`) that extend the base `Error` class and implement the `AppError` interface
- **Consistent Error Structure**: All errors now include `name`, `code`, `timestamp`, and optional `context` fields for better debugging and monitoring
- **Field-Specific Validation**: Validation errors include field names and values for precise error reporting
- **Comprehensive Test Coverage**: Updated test suites to use the new error classes with proper type checking
- **Backward Compatibility**: Maintained compatibility with existing error handling patterns through export aliases

### Testing Infrastructure
- **Multi-Level Testing**: Unit, integration, E2E, performance, and accessibility tests
- **Mock Services**: Comprehensive mocking for external APIs and services
- **Performance Monitoring**: Built-in performance benchmarks and monitoring tools
- **Accessibility Compliance**: Automated WCAG compliance testing

### Performance Monitoring

The application includes comprehensive performance monitoring capabilities that can be initialized on-demand:

#### Manual Initialization

```typescript
import { initializePerformanceMonitoring } from '@/lib/monitoring/performance-monitor'

// Initialize performance monitoring when needed
initializePerformanceMonitoring()
```

#### Using the Performance Hook

```typescript
import { usePerformanceMonitor } from '@/lib/monitoring/performance-monitor'

function MyComponent() {
  const { 
    startMonitoring, 
    recordMetric, 
    measureComponentRender,
    getAggregatedMetrics 
  } = usePerformanceMonitor()

  // Start monitoring
  useEffect(() => {
    startMonitoring()
  }, [])

  // Measure component render time
  const renderExpensiveComponent = () => {
    return measureComponentRender('ExpensiveComponent', () => {
      // Component rendering logic
      return <ExpensiveComponent />
    })
  }
}
```

#### Performance Features

- **Core Web Vitals**: Automatic tracking of LCP, FID, CLS, FCP, and TTFB
- **Custom Metrics**: Component render times, API response times, prediction calculation times
- **Memory Monitoring**: JavaScript heap usage tracking
- **Resource Performance**: Monitoring of API calls and resource loading
- **Aggregated Analytics**: Averages, medians, and 95th percentile calculations

### Development Experience
- **TypeScript Strict Mode**: Enhanced type safety throughout the application
- **Comprehensive Validation**: Zod schemas with business rule validation
- **Real-time Error Tracking**: Structured error logging with detailed context
- **Performance Optimization**: Bundle analysis, code splitting, and caching strategies
- **Modern UI Components**: Shadcn UI with Radix primitives for consistent, accessible interfaces
- **Component Architecture**: Modular design with dropdown menus, animations, and responsive layouts