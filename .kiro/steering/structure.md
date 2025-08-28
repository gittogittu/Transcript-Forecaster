# Project Structure & Organization

## Root Directory Structure

```
transcript-analytics-platform/
├── .env.example              # Environment variables template
├── .env.local               # Local development environment
├── .env.production          # Production environment variables
├── .github/                 # GitHub workflows and templates
├── .next/                   # Next.js build output (auto-generated)
├── .swc/                    # SWC compiler cache
├── public/                  # Static assets (favicon, manifest, sw.js)
├── scripts/                 # Build and deployment scripts
├── src/                     # Source code (see detailed structure below)
├── tests/                   # Test files organized by type
├── node_modules/            # Dependencies
├── package.json             # Project dependencies and scripts
├── next.config.ts           # Next.js configuration
├── tsconfig.json            # TypeScript configuration
├── jest.config.js           # Jest testing configuration
├── playwright.config.ts     # E2E testing configuration
├── eslint.config.mjs        # ESLint configuration
├── components.json          # Shadcn UI configuration
└── README.md               # Project documentation
```

## Source Code Structure (`src/`)

```
src/
├── app/                     # Next.js App Router
│   ├── api/                # API routes
│   │   ├── analytics/      # Analytics endpoints
│   │   ├── auth/           # Authentication endpoints  
│   │   ├── monitoring/     # Performance monitoring
│   │   ├── sheets/         # Google Sheets integration
│   │   └── transcripts/    # Transcript CRUD operations
│   ├── admin/              # Admin-only pages
│   ├── analytics/          # Analytics dashboard pages
│   ├── auth/               # Authentication pages
│   ├── dashboard/          # Main dashboard
│   ├── performance/        # Performance monitoring pages
│   ├── offline/            # Offline fallback page
│   ├── unauthorized/       # Access denied page
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout component
│   └── page.tsx            # Home page
├── components/             # React components
│   ├── analytics/          # Chart and analytics components
│   ├── animations/         # Animation and loading components
│   ├── auth/               # Authentication components
│   ├── dashboard/          # Dashboard-specific components
│   ├── data/               # Data tables and forms
│   ├── error-boundaries/   # Error handling components
│   ├── lazy/               # Lazy-loaded components
│   ├── monitoring/         # Performance monitoring UI
│   ├── providers/          # Context providers
│   └── ui/                 # Shadcn UI base components
├── lib/                    # Utilities and configurations
│   ├── auth.ts             # NextAuth configuration
│   ├── config/             # Configuration files
│   ├── database/           # Database connection and migrations
│   ├── errors/             # Error handling utilities
│   ├── hooks/              # Custom React hooks
│   ├── middleware/         # API middleware (rate limiting, validation)
│   ├── migration/          # Database migration utilities
│   ├── monitoring/         # Performance monitoring
│   ├── security/           # Security utilities
│   ├── services/           # External service integrations
│   ├── testing/            # Testing utilities and mocks
│   ├── utils/              # General utility functions
│   ├── validations/        # Zod validation schemas
│   └── utils.ts            # Core utility functions (cn helper)
├── types/                  # TypeScript type definitions
├── middleware.ts           # Next.js middleware for auth/routing
└── global.d.ts             # Global type declarations
```

## Testing Structure (`tests/`)

```
tests/
├── accessibility/          # Accessibility tests
├── e2e/                   # End-to-end tests (Playwright)
├── integration/           # Integration tests
├── performance/           # Performance and benchmark tests
├── setup/                 # Test configuration and setup
├── README.md              # Testing documentation
└── comprehensive-test-suite.test.ts
```

## Naming Conventions

### Files & Directories
- **Components**: PascalCase for component files (`UserProfile.tsx`)
- **Pages**: kebab-case for page directories (`auth/signin/`)
- **Utilities**: camelCase for utility files (`dataTransformers.ts`)
- **Types**: camelCase with `.ts` extension (`transcript.ts`)
- **Tests**: Match source file name with `.test.tsx` or `.spec.ts`

### Code Conventions
- **Components**: PascalCase (`UserProfile`, `DataTable`)
- **Functions**: camelCase (`fetchTranscripts`, `validateInput`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `DEFAULT_TIMEOUT`)
- **Types/Interfaces**: PascalCase (`TranscriptData`, `ApiResponse`)
- **Enums**: PascalCase (`UserRole`, `DataSource`)

## Import Organization

1. **External libraries** (React, Next.js, third-party)
2. **Internal utilities** (`@/lib/utils`)
3. **Components** (`@/components/ui/button`)
4. **Types** (`@/types/transcript`)
5. **Relative imports** (`./local-file`)

## Component Organization

### UI Components (`components/ui/`)
- Base Shadcn UI components
- Consistent API with forwardRef pattern
- Variant-based styling with CVA (Class Variance Authority)

### Feature Components
- Organized by domain (`analytics/`, `auth/`, `dashboard/`)
- Co-located with tests (`__tests__/` subdirectories)
- Include TypeScript interfaces in same file when component-specific

### Page Components
- Located in `app/` directory following App Router conventions
- Server components by default, client components marked with 'use client'
- Loading and error states handled at page level

## Configuration Files Location

- **Environment**: Root level (`.env.*`)
- **Build tools**: Root level (`next.config.ts`, `tsconfig.json`)
- **Testing**: Root level (`jest.config.js`, `playwright.config.ts`)
- **Code quality**: Root level (`eslint.config.mjs`, `.prettierrc`)
- **Database**: `src/lib/database/` (schema, migrations)
- **API**: `src/app/api/` (route handlers)