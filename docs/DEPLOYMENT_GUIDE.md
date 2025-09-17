# Deployment Guide

## Overview

This guide covers deployment strategies, environment configuration, and production setup for the Transcript Analytics Platform.

## Environment Setup

### Production Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
DB_POOL_MAX=50
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
DB_REQUIRE_VECTOR=true

# Authentication (Auth0)
AUTH0_SECRET=your-auth0-secret
AUTH0_BASE_URL=https://your-domain.com
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Google Cloud / Vertex AI
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Application Settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Database Setup

#### PostgreSQL with pgvector
```sql
-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify installation
SELECT vector_dims('[1,2,3]'::vector) as test;
```

#### Migration Deployment
```bash
# Run migrations in production
npm run db:migrate

# Check migration status
npm run db:status
```

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/transcript_analytics
      - NODE_ENV=production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: pgvector/pgvector:pg15
    environment:
      - POSTGRES_DB=transcript_analytics
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

## Performance Optimization

### Next.js Configuration
```typescript
// next.config.ts
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['pg', '@google-cloud/aiplatform']
  },
  images: {
    domains: ['your-cdn-domain.com']
  },
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, max-age=0' }
      ]
    }
  ]
};
```

### Database Connection Pooling
```typescript
// Production database configuration
const productionConfig: DatabaseConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: parseInt(process.env.DB_POOL_MAX || '50'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000
};
```

## Security Hardening

### Content Security Policy
```typescript
// next.config.ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;
```

## Monitoring and Health Checks

### Health Check Endpoint
```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    const pool = await getDatabasePool();
    await pool.query('SELECT 1');
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 503 });
  }
}
```

## Backup and Recovery

### Database Backup Strategy
```bash
#!/bin/bash
# backup-database.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="transcript_analytics_${TIMESTAMP}.sql"

# Create backup
pg_dump $DATABASE_URL > "/backups/${BACKUP_FILE}"

# Compress backup
gzip "/backups/${BACKUP_FILE}"
```