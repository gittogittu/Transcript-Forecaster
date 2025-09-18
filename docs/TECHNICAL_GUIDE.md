# Technical Implementation Guide

## Development Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+ with pgvector extension
- Google Cloud Account (for Vertex AI)
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd transcript-analytics-platform

# Install dependencies
npm install

# Environment setup
cp .env.example .env.local
# Edit .env.local with your configuration

# Database setup
npm run db:migrate

# Start development server
npm run dev
```

### Database Configuration

#### PostgreSQL Setup
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT vector_dims('[1,2,3]'::vector) as test_vector_dims;
```

#### Environment Variables
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/transcript_analytics
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
```

## API Architecture

### REST API Design

#### Client Management API
```typescript
// GET /api/clients
interface ClientListParams {
  includeInactive?: boolean;
  environment?: 'prod' | 'uat';
  q?: string; // search query
}

interface ClientResponse {
  success: boolean;
  clients: ClientItem[];
}

// POST /api/clients
interface CreateClientRequest {
  client_code: string;
  name?: string;
  environment?: 'prod' | 'uat';
  email?: string;
}

// PATCH /api/clients/[id]
interface UpdateClientRequest {
  name?: string;
  client_code?: string;
  environment?: 'prod' | 'uat';
  email?: string;
  is_active?: boolean;
}
```

#### Analytics API
```typescript
// GET /api/analytics/insights
interface InsightsParams {
  client_id?: string;
  type?: 'trend' | 'anomaly' | 'forecast';
  time_range?: string;
}

// POST /api/predictions/forecast
interface ForecastRequest {
  client_id: string;
  horizon: number;
  model_type?: 'arima' | 'prophet' | 'ml';
}
```

### Error Handling

#### Standard Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

// HTTP Status Codes
// 400 - Bad Request (validation errors)
// 401 - Unauthorized 
// 403 - Forbidden
// 404 - Not Found
// 409 - Conflict (unique constraint violations)
// 500 - Internal Server Error
```

#### Error Handling Patterns
```typescript
// API Route Error Handling
export async function POST(request: NextRequest) {
  try {
    // ... implementation
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API Error:', error);
    
    // Handle specific error types
    if (error?.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Duplicate entry' }, 
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

## Database Implementation

### Schema Design

#### Core Tables
```sql
-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  client_code VARCHAR(50) UNIQUE NOT NULL,
  environment VARCHAR(20) DEFAULT 'prod',
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  overall_aht DECIMAL(8,2),
  review_aht DECIMAL(8,2),
  validation_aht DECIMAL(8,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly transcript data
CREATE TABLE monthly_transcript_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_code VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  month_key VARCHAR(10) NOT NULL,
  transcript_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, year, month)
);
```

#### Vector Storage
```sql
-- Embeddings table
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  embedding vector(384),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector index for fast similarity search
CREATE INDEX idx_embeddings_vector 
ON embeddings USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

### Query Patterns

#### Efficient Client Queries
```sql
-- Client list with filters
SELECT id, name, client_code, environment, is_active
FROM clients
WHERE ($1::boolean IS NULL OR is_active = $1)
  AND ($2::text IS NULL OR environment = $2)
  AND ($3::text IS NULL OR (name ILIKE $3 OR client_code ILIKE $3))
ORDER BY name ASC
LIMIT $4;
```

#### Analytics Queries
```sql
-- Client analytics summary
SELECT 
  c.id,
  c.name,
  c.client_code,
  COUNT(mtd.id) as months_active,
  SUM(mtd.transcript_count) as total_transcripts,
  AVG(mtd.transcript_count) as avg_monthly_transcripts,
  MAX(mtd.transcript_count) as peak_monthly_count
FROM clients c
LEFT JOIN monthly_transcript_data mtd ON c.id = mtd.client_id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.client_code
ORDER BY total_transcripts DESC;
```

### Migration System

#### Migration Structure
```typescript
// Migration file naming: YYYYMMDDHHMMSS_description.sql
// Example: 20250103120000_setup_pgvector_and_enhanced_schema.sql

interface Migration {
  version: string;
  description: string;
  up: string;    // SQL for applying migration
  down?: string; // SQL for rolling back (optional)
}
```

#### Migration Runner
```typescript
// src/lib/migration/migration-runner.ts
export class MigrationRunner {
  async runMigrations(): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = await this.getPendingMigrations(appliedMigrations);
    
    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
    }
  }
}
```

## Frontend Implementation

### Component Architecture

#### Component Hierarchy
```
Pages (src/app/)
├── layout.tsx                 // Root layout
├── page.tsx                   // Home page
├── data/import/page.tsx       // Data import & client management
└── analytics/
    ├── dashboard/page.tsx     // Analytics dashboard
    └── interactive-dashboard/page.tsx

Components (src/components/)
├── ui/                        // Base UI components
│   ├── button.tsx
│   ├── input.tsx
│   └── card.tsx
├── analytics/                 // Analytics-specific components
│   ├── charts/
│   ├── widgets/
│   └── dashboard/
└── Navigation.tsx             // Global navigation
```

#### State Management Patterns
```typescript
// Local state with useState
const [clients, setClients] = useState<ClientItem[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Data fetching pattern
const fetchClients = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await fetch('/api/clients');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setClients(data.clients);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchClients();
}, []);
```

### Custom Hooks

#### Data Fetching Hook
```typescript
// src/lib/hooks/use-clients.ts
export function useClients(filters?: ClientFilters) {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.includeInactive) params.set('includeInactive', 'true');
      if (filters?.search) params.set('q', filters.search);
      
      const response = await fetch(`/api/clients?${params}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      setClients(data.clients);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return { clients, loading, error, refetch: fetchClients };
}
```

### TypeScript Integration

#### Type Definitions
```typescript
// src/types/client.ts
export interface ClientItem {
  id: string;
  name: string;
  client_code: string;
  environment: 'prod' | 'uat';
  email?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClientFilters {
  includeInactive?: boolean;
  environment?: 'prod' | 'uat';
  search?: string;
}

// src/types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
```

## Testing Strategy

### Unit Testing with Jest

#### Component Testing
```typescript
// src/components/__tests__/ClientList.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClientList } from '../ClientList';

const mockClients = [
  { id: '1', name: 'Test Client', client_code: 'test-prod', environment: 'prod', is_active: true }
];

describe('ClientList', () => {
  it('renders client list correctly', () => {
    render(<ClientList clients={mockClients} />);
    expect(screen.getByText('Test Client')).toBeInTheDocument();
  });

  it('handles search input', async () => {
    const onSearch = jest.fn();
    render(<ClientList clients={mockClients} onSearch={onSearch} />);
    
    const searchInput = screen.getByPlaceholderText('Search clients...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('test');
    });
  });
});
```

#### API Testing
```typescript
// src/app/api/clients/__tests__/route.test.ts
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

describe('/api/clients', () => {
  it('returns clients list', async () => {
    const request = new NextRequest('http://localhost/api/clients');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.clients)).toBe(true);
  });

  it('creates new client', async () => {
    const clientData = {
      client_code: 'test-client',
      name: 'Test Client',
      environment: 'prod'
    };
    
    const request = new NextRequest('http://localhost/api/clients', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.client.client_code).toBe('test-client');
  });
});
```

### End-to-End Testing with Playwright

#### E2E Test Example
```typescript
// tests/client-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Client Management', () => {
  test('can create and manage clients', async ({ page }) => {
    await page.goto('/data/import');
    
    // Fill client form
    await page.fill('[placeholder="e.g. acme-prod or acme-uat"]', 'test-client-prod');
    await page.fill('[placeholder="Client display name"]', 'Test Client');
    await page.selectOption('select', 'prod');
    
    // Submit form
    await page.click('button:has-text("Add Client")');
    
    // Verify client appears in list
    await expect(page.locator('text=Test Client')).toBeVisible();
    await expect(page.locator('text=test-client-prod')).toBeVisible();
  });

  test('can search and filter clients', async ({ page }) => {
    await page.goto('/data/import');
    
    // Search for client
    await page.fill('[placeholder="Search clients..."]', 'test');
    
    // Verify search results
    await expect(page.locator('[data-testid="client-list"]')).toBeVisible();
    
    // Toggle inactive clients
    await page.check('text=Include inactive');
    
    // Verify filter applied
    await expect(page.locator('text=inactive')).toBeVisible();
  });
});
```