# Technology Stack & Build System

## Core Technologies

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

## Key Libraries

- **UI Components**: Radix UI primitives with custom styling
- **Validation**: Zod schemas throughout the application
- **HTTP Client**: Built-in fetch with TanStack Query
- **Icons**: Lucide React
- **Utilities**: clsx + tailwind-merge for className handling
- **Database**: pg (PostgreSQL client)
- **External APIs**: Google Sheets API integration

## Build & Development Commands

### Development
```bash
npm run dev              # Start dev server with Turbopack
npm run build           # Production build
npm run start           # Start production server
npm run analyze         # Bundle analysis (set ANALYZE=true)
```

### Code Quality
```bash
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues automatically
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting
npm run type-check      # TypeScript type checking
```

### Testing
```bash
npm run test            # Run Jest unit tests
npm run test:watch      # Jest in watch mode
npm run test:coverage   # Generate coverage report
npm run test:integration # Integration tests only
npm run test:accessibility # Accessibility tests
npm run test:performance # Performance tests
npm run test:e2e        # Playwright E2E tests
npm run test:e2e:ui     # E2E tests with UI
npm run test:all        # Run all test suites
```

### Database
```bash
npm run migrate         # Run database migrations
npm run db:migrate      # Alias for migrate
npm run db:status       # Check migration status
```

### Performance & Monitoring
```bash
npm run benchmark       # Performance benchmarks
npm run perf:monitor    # Performance monitoring tests
npm run perf:bundle     # Bundle optimization tests
npm run lighthouse      # Lighthouse CI
```

### Deployment
```bash
npm run deploy                    # Deploy to default environment
npm run deploy:staging           # Deploy to staging
npm run deploy:production        # Deploy to production
npm run deploy:dry-run          # Dry run deployment
npm run validate:deployment     # Post-deployment validation
npm run workflow:complete       # Full integration workflow
```

## Configuration Files

- **next.config.ts**: Next.js configuration with performance optimizations
- **tsconfig.json**: TypeScript strict mode configuration
- **eslint.config.mjs**: ESLint with Next.js and TypeScript rules
- **jest.config.js**: Jest configuration for unit/integration tests
- **playwright.config.ts**: E2E testing configuration
- **lighthouserc.js**: Performance monitoring configuration

## Performance Optimizations

- Bundle splitting with custom webpack configuration
- Tree shaking enabled
- Image optimization with AVIF/WebP support
- Service worker for offline functionality
- Dynamic imports for code splitting
- Optimized package imports for common libraries