# Transcript Analytics Platform

A comprehensive Next.js-based platform for advanced predictive analytics, machine learning, and data management for transcript processing workflows.

## 🚀 Features

### Core Capabilities
- **Client Management**: Full CRUD operations with search, filtering, and state management
- **Predictive Analytics**: Advanced forecasting with multiple ML algorithms
- **Anomaly Detection**: Real-time monitoring and statistical anomaly detection
- **Data Import**: Support for CSV, JSON, and Excel file processing
- **Vector Search**: Semantic search and pattern matching using pgvector
- **Vertex AI Integration**: Google Cloud ML platform integration

### Analytics & Insights
- **Real-time Dashboards**: Interactive analytics with drill-down capabilities
- **Business Insights**: AI-powered recommendations and trend analysis
- **Multi-dimensional Forecasting**: Cross-client pattern analysis
- **Correlation Analysis**: Feature importance and attribution analysis

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Development](#development)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Contributing](#contributing)

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Next.js 15.4.6, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL with pgvector extension
- **ML/AI**: Google Cloud Vertex AI, custom ML services
- **Authentication**: Auth0 (optional)

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Components │    │   ML Services   │    │   Vector Store  │
│   - Analytics   │    │   - Vertex AI   │    │   (pgvector)    │
│   - Dashboards  │    │   - Embeddings  │    └─────────────────┘
│   - Client Mgmt │    │   - Forecasting │
└─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- Google Cloud Account (for Vertex AI features)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd transcript-analytics-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Set up the database
npm run db:migrate

# Start development server
npm run dev
```

### Environment Configuration

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/transcript_analytics

# Google Cloud (optional)
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Auth0 (optional)
AUTH0_SECRET=your-auth0-secret
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
```

### Database Setup

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Run migrations
npm run db:migrate
```

## 📖 Documentation

### Comprehensive Guides

- **[Architecture Documentation](./docs/ARCHITECTURE.md)** - System design and technical architecture
- **[Technical Implementation Guide](./docs/TECHNICAL_GUIDE.md)** - Development setup and implementation details
- **[API Documentation](./docs/API_DOCUMENTATION.md)** - Complete API reference
- **[Client Management Feature](./docs/CLIENT_MANAGEMENT_FEATURE.md)** - Detailed feature documentation
- **[Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)** - Production deployment instructions

### Quick Reference

- **Client Management**: `/data/import` - Manage client information
- **Analytics Dashboard**: `/analytics/dashboard` - View analytics and insights
- **Interactive Dashboard**: `/analytics/interactive-dashboard` - Advanced analytics
- **API Health**: `/api/health` - System health check

## 💻 Development

### Project Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── analytics/       # Analytics dashboards
│   ├── data/           # Data management pages
│   └── api/            # API routes
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   └── analytics/      # Analytics-specific components
├── lib/                # Core business logic
│   ├── services/       # Business services
│   ├── database/       # Data access layer
│   └── hooks/          # Custom React hooks
└── types/              # TypeScript type definitions
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:migrate      # Run database migrations
npm run db:status       # Check migration status

# Testing
npm run test           # Run unit tests
npm run test:e2e       # Run end-to-end tests
npm run test:coverage  # Generate coverage report

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues
npm run format         # Format code with Prettier
npm run type-check     # Run TypeScript compiler
```

### Key Features Implementation

#### Client Management
- **Location**: `src/app/data/import/page.tsx`
- **API**: `src/app/api/clients/`
- **Features**: CRUD operations, search, filtering, state management

#### Analytics Engine
- **Location**: `src/lib/services/`
- **Features**: Forecasting, anomaly detection, correlation analysis

#### Vector Search
- **Location**: `src/lib/services/embeddings/`
- **Features**: Text embeddings, similarity search, pattern matching

## 🔧 API Reference

### Core Endpoints

#### Client Management
```bash
GET    /api/clients              # List clients
POST   /api/clients              # Create client
PATCH  /api/clients/[id]         # Update client
DELETE /api/clients/[id]         # Remove client
```

#### Analytics
```bash
GET    /api/analytics/insights           # Get business insights
GET    /api/analytics/comprehensive-data # Get dashboard data
POST   /api/predictions/forecast        # Generate forecasts
POST   /api/anomaly-detection/detect    # Detect anomalies
```

#### Data Management
```bash
POST   /api/data/import          # Import data files
GET    /api/data/import          # Get import status
```

### Authentication

Include JWT token in Authorization header:
```bash
Authorization: Bearer <jwt_token>
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t transcript-analytics .
docker run -p 3000:3000 transcript-analytics
```

### Environment Variables for Production

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
DB_POOL_MAX=50
DB_REQUIRE_VECTOR=true
```

### Health Checks

```bash
# Check application health
curl http://localhost:3000/api/health

# Check database connectivity
curl http://localhost:3000/api/health/database
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# Coverage report
npm run test:coverage

# Specific test suites
npm run test:ml          # ML model tests
npm run test:integration # Integration tests
```

### Test Structure

```
tests/
├── unit/               # Unit tests
├── integration/        # Integration tests
├── e2e/               # End-to-end tests
└── performance/       # Performance tests
```

## 🔒 Security

### Security Features

- **Input Validation**: Comprehensive server-side validation
- **SQL Injection Prevention**: Parameterized queries
- **Rate Limiting**: API endpoint protection
- **Content Security Policy**: XSS prevention
- **Authentication**: Auth0 integration

### Security Headers

```typescript
// Automatic security headers
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'
```

## 📊 Monitoring

### Health Monitoring

- **Application Health**: `/api/health`
- **Database Health**: `/api/health/database`
- **Custom Metrics**: Performance and business metrics

### Logging

```typescript
// Structured logging with Winston
import { logger } from '@/lib/logger';

logger.info('Operation completed', { 
  operation: 'client_creation',
  client_id: 'uuid',
  duration: 150 
});
```

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes and add tests**
4. **Run tests**: `npm run test`
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality rules enforced
- **Prettier**: Consistent code formatting
- **Jest**: Unit testing required
- **Playwright**: E2E testing for critical paths

### Pull Request Guidelines

- Include tests for new features
- Update documentation as needed
- Follow existing code patterns
- Add type definitions for new interfaces
- Include migration scripts for database changes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

- **Documentation**: Check the comprehensive docs in this repository
- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions

### Common Issues

#### Database Connection
```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Check pgvector extension
psql $DATABASE_URL -c "SELECT vector_dims('[1,2,3]'::vector);"
```

#### Migration Issues
```bash
# Reset and rerun migrations
npm run db:reset
npm run db:migrate
```

#### Build Issues
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## 🗺️ Roadmap

### Short Term (Next Release)
- [ ] Advanced search filters for clients
- [ ] Bulk client operations
- [ ] Export/import client data
- [ ] Enhanced error handling

### Medium Term (6 months)
- [ ] Real-time dashboard updates
- [ ] Advanced ML model comparisons
- [ ] Custom analytics widgets
- [ ] Mobile-responsive improvements

### Long Term (1 year)
- [ ] Microservices architecture
- [ ] Advanced access control
- [ ] Multi-tenant support
- [ ] Enhanced ML capabilities

---

**Built with ❤️ using Next.js, TypeScript, and PostgreSQL**