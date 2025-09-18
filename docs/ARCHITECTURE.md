# Transcript Analytics Platform - Architecture Documentation

## Overview

The Transcript Analytics Platform is a Next.js-based application designed for advanced predictive analytics, machine learning, and data management for transcript processing workflows. The platform provides real-time analytics, forecasting capabilities, and comprehensive client management.

## System Architecture

### High-Level Architecture

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

### Technology Stack

#### Frontend
- **Framework**: Next.js 15.4.6 (App Router)
- **Runtime**: React 19.1.0
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x + CSS Modules
- **UI Components**: Radix UI primitives + custom components
- **State Management**: React hooks (useState, useEffect, useContext)
- **Data Fetching**: Native fetch API with React Server Components

#### Backend
- **API Framework**: Next.js API Routes (App Router)
- **Runtime**: Node.js
- **Database**: PostgreSQL with pgvector extension
- **Connection Pooling**: node-postgres (pg)
- **Authentication**: Auth0 Next.js SDK (optional)

#### Machine Learning & AI
- **Platform**: Google Cloud Vertex AI
- **Embeddings**: Text embeddings for similarity search
- **Vector Database**: pgvector for storing and querying embeddings
- **Forecasting**: Time series analysis and prediction models
- **Anomaly Detection**: Statistical and ML-based anomaly detection

#### Infrastructure & Deployment
- **Development**: Next.js development server with Turbopack
- **Build System**: Next.js with TypeScript compilation
- **Testing**: Jest + Playwright for E2E testing
- **Linting**: ESLint + Prettier
- **Security**: Content Security Policy, rate limiting

## Core Modules

### 1. Analytics Engine (`src/lib/services/`)

#### Forecasting Services
- **Intelligent Forecasting**: Advanced time series forecasting with multiple algorithms
- **Multi-dimensional Analysis**: Cross-client pattern analysis
- **Seasonal Detection**: Automatic seasonality pattern recognition
- **Confidence Intervals**: Prediction uncertainty quantification

#### Anomaly Detection
- **Real-time Monitoring**: Live anomaly detection on incoming data
- **Statistical Methods**: Z-score, isolation forest, and custom algorithms
- **Alert Management**: Configurable alerting system
- **Explanation Engine**: AI-powered anomaly explanation

#### Correlation Analysis
- **Feature Importance**: ML-based feature ranking
- **Attribution Analysis**: Causal analysis between variables
- **Trend Analysis**: Long-term trend identification
- **Cross-client Correlations**: Pattern matching across clients

### 2. Data Management (`src/lib/database/`)

#### Database Schema
```sql
-- Core entities
clients                    -- Client information and metadata
historical_data           -- Time series data storage
monthly_transcript_data   -- Aggregated monthly metrics
client_analytics_summary  -- Pre-computed analytics

-- ML & Analytics
vertex_ai_models          -- ML model metadata
vertex_ai_predictions     -- Prediction results
anomalies                 -- Detected anomalies
business_insights         -- Generated insights
recommendations          -- AI recommendations

-- Vector Storage
embeddings                -- Text embeddings
pattern_similarities      -- Pattern matching results
```

#### Migration System
- **Automated Migrations**: SQL-based schema versioning
- **Vector Support**: pgvector extension setup
- **Performance Optimization**: Optimized indexes and constraints

### 3. Client Management (`src/app/data/import/`)

#### Features
- **CRUD Operations**: Create, read, update, delete clients
- **Search & Filtering**: Real-time search with query parameters
- **State Management**: Active/inactive client status
- **Environment Support**: Production and UAT environment separation

#### API Endpoints
```typescript
GET    /api/clients              // List clients with filters
POST   /api/clients              // Create new client
PATCH  /api/clients/[id]         // Update client
DELETE /api/clients/[id]         // Soft delete (deactivate)
```

### 4. Vertex AI Integration (`src/lib/services/vertex-ai/`)

#### Components
- **Model Training**: AutoML model creation and training
- **Batch Prediction**: Large-scale prediction processing
- **Real-time Inference**: Live prediction endpoints
- **Model Evaluation**: Performance metrics and validation
- **Feature Store**: Centralized feature management

#### Workflow
1. **Data Preparation**: Clean and format data for ML
2. **Feature Engineering**: Extract relevant features
3. **Model Training**: Train models using Vertex AI AutoML
4. **Model Deployment**: Deploy to prediction endpoints
5. **Monitoring**: Track model performance and drift

### 5. Embeddings & Vector Search (`src/lib/services/embeddings/`)

#### Capabilities
- **Text Vectorization**: Convert text to high-dimensional vectors
- **Similarity Search**: Find similar patterns across data
- **Pattern Recognition**: Identify recurring patterns
- **Semantic Search**: Meaning-based content discovery

## Data Flow

### Analytics Pipeline

```
Data Ingestion → Feature Engineering → ML Processing → Analytics Generation → UI Presentation
     │                    │                 │                  │                    │
     ▼                    ▼                 ▼                  ▼                    ▼
File Upload         Statistical        Vertex AI         Insights           Dashboards
Database Import     Features          Predictions        Recommendations    Charts
API Integration     Time Features     Embeddings         Alerts             Tables
```

### Client Data Lifecycle

```
Client Creation → Data Import → Processing → Analytics → Insights → Actions
      │              │           │            │           │          │
      ▼              ▼           ▼            ▼           ▼          ▼
API/UI Form    CSV/JSON/Excel  Cleaning    Forecasting  Business   Recommendations
Validation     File Upload     Validation   Anomaly Det. Rules      Alerting
Database       Batch Process   Transform    Correlations Patterns   Reporting
```

## Security Architecture

### Authentication & Authorization
- **OAuth 2.0**: Auth0 integration for user management
- **Session Management**: Secure session handling
- **Role-Based Access**: Client-specific data access controls

### Data Protection
- **Encryption**: Data at rest and in transit
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries
- **CORS**: Controlled cross-origin resource sharing

### Infrastructure Security
- **Environment Variables**: Secure configuration management
- **Rate Limiting**: API endpoint protection
- **Content Security Policy**: XSS prevention
- **Audit Logging**: Comprehensive activity logging

## Performance Considerations

### Database Optimization
- **Connection Pooling**: Efficient database connections
- **Indexing Strategy**: Optimized query performance
- **Query Optimization**: Efficient SQL patterns
- **Vector Indexing**: Fast similarity search with ivfflat

### Caching Strategy
- **Prediction Caching**: Cache ML predictions for performance
- **Query Result Caching**: Database query optimization
- **Static Asset Caching**: CDN and browser caching

### Scalability
- **Horizontal Scaling**: Multi-instance deployment support
- **Database Sharding**: Client-based data partitioning
- **Microservices Ready**: Modular architecture for service extraction

## Monitoring & Observability

### Application Monitoring
- **Performance Metrics**: Response times, throughput
- **Error Tracking**: Exception monitoring and alerting
- **Health Checks**: System health endpoints
- **Custom Metrics**: Business-specific KPIs

### ML Model Monitoring
- **Model Drift Detection**: Performance degradation alerts
- **Prediction Accuracy**: Continuous accuracy monitoring
- **Feature Drift**: Input data distribution changes
- **A/B Testing**: Model comparison frameworks

## Development Workflow

### Code Organization
```
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable UI components
├── lib/                 # Core business logic
│   ├── services/        # Business services
│   ├── database/        # Data access layer
│   └── hooks/           # Custom React hooks
└── types/               # TypeScript type definitions
```

### Quality Assurance
- **TypeScript**: Static type checking
- **ESLint**: Code quality rules
- **Prettier**: Code formatting
- **Jest**: Unit testing
- **Playwright**: End-to-end testing

### Deployment Pipeline
1. **Development**: Local development with hot reload
2. **Testing**: Automated test suite execution
3. **Build**: Production build optimization
4. **Deployment**: Containerized deployment
5. **Monitoring**: Post-deployment health checks

## Configuration Management

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...
DB_POOL_MAX=20
DB_REQUIRE_VECTOR=false

# Vertex AI
GOOGLE_CLOUD_PROJECT=project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json

# Authentication
AUTH0_SECRET=...
AUTH0_BASE_URL=...
AUTH0_ISSUER_BASE_URL=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
```

### Feature Flags
- **Vector Search**: Enable/disable vector features
- **ML Features**: Toggle AI/ML capabilities
- **Authentication**: Enable/disable auth requirements

## Future Architecture Considerations

### Microservices Migration
- **Service Boundaries**: Clear domain separation
- **API Gateway**: Centralized API management
- **Event-Driven Architecture**: Async communication patterns

### Cloud-Native Features
- **Kubernetes**: Container orchestration
- **Service Mesh**: Inter-service communication
- **Observability Stack**: Prometheus, Grafana, Jaeger

### Advanced Analytics
- **Real-time Streaming**: Apache Kafka integration
- **Data Lake**: Large-scale data storage
- **Advanced ML**: Custom model development and deployment