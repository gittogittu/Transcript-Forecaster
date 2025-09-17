# Client Management Feature Documentation

## Overview

The Client Management feature provides a comprehensive interface for managing client information within the Transcript Analytics Platform. This feature is integrated into the Data Import page and offers full CRUD operations with search, filtering, and state management capabilities.

## Features

### Core Functionality

#### 1. Client List Display
- **Real-time Loading**: Shows loading state while fetching data
- **Responsive Grid**: Auto-adjusting grid layout for different screen sizes
- **Status Indicators**: Clear visual indicators for active/inactive clients
- **Environment Labels**: Visual distinction between prod and uat environments

#### 2. Client Creation
```typescript
interface CreateClientRequest {
  client_code: string;        // Required: Unique identifier
  name?: string;             // Optional: Display name (auto-derived if not provided)
  environment?: 'prod' | 'uat'; // Optional: Defaults based on client_code suffix
  email?: string;            // Optional: Contact email
}
```

**Auto-derivation Logic**:
- **Name**: Converts `client-code` to `Client Code` format
- **Environment**: `*-uat` suffix → `uat`, otherwise → `prod`

#### 3. Client Editing
- **Inline Editing**: Edit directly in the client list
- **Field Validation**: Real-time validation of required fields
- **Optimistic Updates**: UI updates immediately, rolls back on error
- **Save/Cancel Actions**: Clear user controls

#### 4. Client State Management
- **Soft Delete**: Remove action sets `is_active = false`
- **Reactivation**: Inactive clients show "Reactivate" button
- **State Persistence**: Maintains historical data relationships

#### 5. Search & Filtering
```typescript
interface ClientFilters {
  includeInactive?: boolean;  // Show/hide inactive clients
  environment?: 'prod' | 'uat'; // Filter by environment
  q?: string;                // Search by name or client_code
}
```

**Search Behavior**:
- **Real-time**: Searches as you type (debounced)
- **Server-side**: Filtering happens at database level
- **Case-insensitive**: Uses ILIKE for PostgreSQL
- **Multi-field**: Searches both name and client_code

## User Interface

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ 👥 Client Management                                        │
├─────────────────────────────────────────────────────────────┤
│ Add Client Form                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ Client Code │ │ Name (opt.) │ │ Environment │ │ Email   │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
│ [Add Client]                                                │
├─────────────────────────────────────────────────────────────┤
│ Existing Clients                                            │
│ [Search...] [☑ Include inactive] [🔄 Refresh]              │
│                                                             │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Client Name     │ │ Client Name     │ │ Client Name     │ │
│ │ code · env      │ │ code · env      │ │ code · env      │ │
│ │ [Edit] [Remove] │ │ [Edit] [Remove] │ │ [Edit] [Reactivate]│
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```typescript
DataImportPage
├── ClientManagementSection
│   ├── CreateClientForm
│   │   ├── InputField (client_code)
│   │   ├── InputField (name)
│   │   ├── SelectField (environment)
│   │   ├── InputField (email)
│   │   └── SubmitButton
│   └── ClientList
│       ├── SearchAndFilters
│       │   ├── SearchInput
│       │   ├── IncludeInactiveToggle
│       │   └── RefreshButton
│       ├── ErrorDisplay
│       ├── LoadingState
│       └── ClientGrid
│           └── ClientCard[]
│               ├── ClientInfo
│               ├── EditForm (conditional)
│               └── ActionButtons
```

### State Management

```typescript
// Client list state
const [clients, setClients] = useState<ClientItem[]>([]);
const [clientsLoading, setClientsLoading] = useState(true);
const [clientsError, setClientsError] = useState<string | null>(null);

// Form state
const [newClientCode, setNewClientCode] = useState('');
const [newClientName, setNewClientName] = useState('');
const [newClientEnvironment, setNewClientEnvironment] = useState<'prod' | 'uat'>('prod');
const [newClientEmail, setNewClientEmail] = useState('');
const [creatingClient, setCreatingClient] = useState(false);

// Filter state
const [includeInactive, setIncludeInactive] = useState(true);
const [searchQuery, setSearchQuery] = useState('');

// Edit state
const [editingId, setEditingId] = useState<string | null>(null);
const [editName, setEditName] = useState('');
const [editCode, setEditCode] = useState('');
const [editEnvironment, setEditEnvironment] = useState<'prod' | 'uat'>('prod');
const [editEmail, setEditEmail] = useState('');
const [savingEdit, setSavingEdit] = useState(false);
```

## API Implementation

### Endpoints

#### GET /api/clients
**Purpose**: Retrieve list of clients with optional filtering

**Query Parameters**:
```typescript
interface ClientListParams {
  includeInactive?: 'true' | 'false';  // Default: false
  environment?: 'prod' | 'uat';        // Optional filter
  q?: string;                          // Search query
}
```

**Response**:
```typescript
interface ClientListResponse {
  success: boolean;
  clients: ClientItem[];
}
```

**SQL Query**:
```sql
SELECT id, name, client_code, environment, email, is_active, created_at, updated_at
FROM clients
WHERE ($1::boolean IS NULL OR is_active = $1)
  AND ($2::text IS NULL OR environment = $2)
  AND ($3::text IS NULL OR (name ILIKE $3 OR client_code ILIKE $3))
ORDER BY name ASC;
```

#### POST /api/clients
**Purpose**: Create new client or reactivate existing

**Request Body**:
```typescript
interface CreateClientRequest {
  client_code: string;
  name?: string;
  environment?: 'prod' | 'uat';
  email?: string;
}
```

**Response**:
```typescript
interface CreateClientResponse {
  success: boolean;
  client: ClientItem;
}
```

**Upsert Logic**:
```sql
INSERT INTO clients (name, client_code, environment, email, is_active)
VALUES ($1, $2, $3, $4, true)
ON CONFLICT (client_code)
DO UPDATE SET
  name = EXCLUDED.name,
  environment = EXCLUDED.environment,
  email = COALESCE(EXCLUDED.email, clients.email),
  is_active = true,
  updated_at = NOW()
RETURNING *;
```

#### PATCH /api/clients/[id]
**Purpose**: Update existing client

**Request Body**:
```typescript
interface UpdateClientRequest {
  name?: string;
  client_code?: string;
  environment?: 'prod' | 'uat';
  email?: string;
  is_active?: boolean;
}
```

**Dynamic SQL Building**:
```typescript
const fields: string[] = [];
const params: any[] = [];
let idx = 1;

if (body.name !== undefined) { 
  fields.push(`name = $${idx++}`); 
  params.push(body.name); 
}
// ... other fields

const sql = `UPDATE clients SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`;
```

#### DELETE /api/clients/[id]
**Purpose**: Soft delete client (set inactive)

**Implementation**:
```sql
UPDATE clients 
SET is_active = false, updated_at = NOW() 
WHERE id = $1 
RETURNING id;
```

### Error Handling

#### Client-Side Error Display
```typescript
// Enhanced error display with visual styling
{clientsError && (
  <div style={{ 
    backgroundColor: '#fef2f2', 
    border: '1px solid #fecaca', 
    borderRadius: '0.375rem', 
    padding: '0.75rem' 
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ color: '#dc2626' }}>⚠️</span>
      <div>
        <p style={{ color: '#dc2626', fontWeight: '500' }}>Error loading clients</p>
        <p style={{ color: '#7f1d1d', fontSize: '0.8rem' }}>{clientsError}</p>
      </div>
    </div>
  </div>
)}
```

#### Server-Side Error Responses
```typescript
// Standard error response format
try {
  // ... operation
} catch (error: any) {
  console.error('Client operation failed:', error);
  
  // Handle specific PostgreSQL errors
  if (error?.code === '23505') {
    return NextResponse.json(
      { success: false, error: 'Client code must be unique' }, 
      { status: 409 }
    );
  }
  
  return NextResponse.json(
    { success: false, error: 'Failed to process request' }, 
    { status: 500 }
  );
}
```

## Database Design

### Client Table Schema
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  client_code VARCHAR(50) UNIQUE NOT NULL,
  environment VARCHAR(20) DEFAULT 'prod' CHECK (environment IN ('prod', 'uat')),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  
  -- AHT metrics (from business requirements)
  overall_aht DECIMAL(8,2),
  review_aht DECIMAL(8,2),
  validation_aht DECIMAL(8,2),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_clients_environment ON clients(environment);
CREATE INDEX idx_clients_code ON clients(client_code);
CREATE INDEX idx_clients_active ON clients(is_active);
CREATE INDEX idx_clients_search ON clients USING gin(to_tsvector('english', name || ' ' || client_code));
```

### Related Tables
```sql
-- Monthly transcript data linked to clients
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

-- Client analytics summary
CREATE TABLE client_analytics_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_code VARCHAR(50) NOT NULL,
  total_transcripts INTEGER DEFAULT 0,
  months_active INTEGER DEFAULT 0,
  avg_monthly_transcripts DECIMAL(10,4),
  growth_trend VARCHAR(20),
  has_seasonality BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id)
);
```

## Testing Strategy

### Unit Tests

#### Component Testing
```typescript
// ClientList.test.tsx
describe('ClientList', () => {
  const mockClients = [
    { id: '1', name: 'Test Client', client_code: 'test-prod', environment: 'prod', is_active: true },
    { id: '2', name: 'Inactive Client', client_code: 'inactive-uat', environment: 'uat', is_active: false }
  ];

  it('renders active clients by default', () => {
    render(<ClientList clients={mockClients.filter(c => c.is_active)} />);
    expect(screen.getByText('Test Client')).toBeInTheDocument();
    expect(screen.queryByText('Inactive Client')).not.toBeInTheDocument();
  });

  it('shows reactivate button for inactive clients', () => {
    render(<ClientList clients={mockClients} includeInactive={true} />);
    const inactiveCard = screen.getByText('Inactive Client').closest('[data-testid="client-card"]');
    expect(within(inactiveCard).getByText('Reactivate')).toBeInTheDocument();
  });
});
```

#### API Testing
```typescript
// clients.api.test.ts
describe('/api/clients', () => {
  describe('GET', () => {
    it('returns filtered clients', async () => {
      const request = new NextRequest('http://localhost/api/clients?environment=prod&includeInactive=true');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.clients.every(c => c.environment === 'prod')).toBe(true);
    });

    it('searches clients by name and code', async () => {
      const request = new NextRequest('http://localhost/api/clients?q=test');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.clients.every(c => 
        c.name.toLowerCase().includes('test') || 
        c.client_code.toLowerCase().includes('test')
      )).toBe(true);
    });
  });

  describe('POST', () => {
    it('auto-derives name from client_code', async () => {
      const request = new NextRequest('http://localhost/api/clients', {
        method: 'POST',
        body: JSON.stringify({ client_code: 'acme-corp-prod' })
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(data.client.name).toBe('Acme Corp');
      expect(data.client.environment).toBe('prod');
    });
  });
});
```

### End-to-End Tests

#### User Workflows
```typescript
// client-management.e2e.ts
test.describe('Client Management Workflows', () => {
  test('complete client lifecycle', async ({ page }) => {
    await page.goto('/data/import');
    
    // Create client
    await page.fill('[data-testid="client-code-input"]', 'e2e-test-client');
    await page.fill('[data-testid="client-name-input"]', 'E2E Test Client');
    await page.click('[data-testid="add-client-button"]');
    
    // Verify creation
    await expect(page.locator('text=E2E Test Client')).toBeVisible();
    
    // Edit client
    await page.click('[data-testid="edit-client-button"]');
    await page.fill('[data-testid="edit-name-input"]', 'Updated Client Name');
    await page.click('[data-testid="save-edit-button"]');
    
    // Verify edit
    await expect(page.locator('text=Updated Client Name')).toBeVisible();
    
    // Remove client
    await page.click('[data-testid="remove-client-button"]');
    await page.click('button:has-text("OK")'); // Confirm dialog
    
    // Verify removal (should not be visible unless including inactive)
    await expect(page.locator('text=Updated Client Name')).not.toBeVisible();
    
    // Show inactive and reactivate
    await page.check('[data-testid="include-inactive-checkbox"]');
    await expect(page.locator('text=Updated Client Name')).toBeVisible();
    
    await page.click('[data-testid="reactivate-client-button"]');
    await page.uncheck('[data-testid="include-inactive-checkbox"]');
    await expect(page.locator('text=Updated Client Name')).toBeVisible();
  });
});
```

## Performance Considerations

### Database Optimization
- **Indexes**: Optimized for common query patterns
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Parameterized queries with proper indexing

### Frontend Performance
- **Debounced Search**: Prevents excessive API calls during typing
- **Optimistic Updates**: Immediate UI feedback with error rollback
- **Lazy Loading**: Large client lists can be paginated
- **Memoization**: Expensive calculations cached

### Caching Strategy
```typescript
// Future enhancement: Client list caching
const clientCache = new Map<string, ClientItem[]>();

const getCachedClients = (filters: ClientFilters): ClientItem[] | null => {
  const key = JSON.stringify(filters);
  return clientCache.get(key) || null;
};
```

## Security Considerations

### Input Validation
```typescript
// Server-side validation
const validateClientCode = (code: string): boolean => {
  return /^[a-zA-Z0-9\-_]+$/.test(code) && code.length <= 50;
};

const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

### SQL Injection Prevention
- **Parameterized Queries**: All SQL uses parameter binding
- **Input Sanitization**: Server-side validation of all inputs
- **Type Safety**: TypeScript ensures type correctness

### Access Control
```typescript
// Future enhancement: Role-based access
interface UserPermissions {
  canCreateClients: boolean;
  canEditClients: boolean;
  canDeleteClients: boolean;
  canViewInactiveClients: boolean;
}
```

## Future Enhancements

### Planned Features
1. **Bulk Operations**: Select multiple clients for batch actions
2. **Import/Export**: CSV import/export of client data
3. **Audit Logging**: Track all client modifications
4. **Advanced Search**: Filter by date ranges, AHT metrics
5. **Client Analytics**: Dashboard showing client-specific metrics
6. **API Rate Limiting**: Protect against abuse
7. **Real-time Updates**: WebSocket updates for multi-user scenarios

### Architecture Improvements
1. **Pagination**: Handle large client lists efficiently
2. **Caching Layer**: Redis for frequently accessed data
3. **Background Jobs**: Async processing for bulk operations
4. **Event Sourcing**: Complete audit trail of changes
5. **Microservice Extraction**: Separate client service