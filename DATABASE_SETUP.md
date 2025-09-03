# Advanced Predictive Analytics Database Setup

This document describes the enhanced database setup for the Advanced Predictive Analytics system with pgvector support.

## Overview

The database has been enhanced with:
- **pgvector extension** for vector similarity search
- **Enhanced schema** with ML-focused tables
- **Vector indexes** for performance optimization
- **Migration system** for schema management
- **Health monitoring** for system reliability

## Database Schema

### Core Tables

#### Vector-Enhanced Tables

1. **transcript_embeddings**
   - Stores 768-dimensional embeddings for transcript data
   - Enables similarity search and pattern matching
   - Uses ivfflat index for fast cosine similarity queries

2. **vertex_ai_models**
   - Tracks Vertex AI model metadata and configurations
   - Stores training parameters and evaluation metrics
   - Links to model endpoints and deployment status

3. **vertex_ai_predictions**
   - Stores prediction results with confidence intervals
   - Includes prediction embeddings for pattern similarity
   - Links to specific models and clients

4. **feature_store**
   - Centralized feature storage for ML models
   - Supports both structured and vector features
   - Enables feature versioning and serving

#### Analytics Tables

5. **anomalies**
   - Real-time anomaly detection results
   - Classification by type and severity
   - Tracks resolution status and explanations

6. **business_insights**
   - Generated insights with confidence scores
   - Supporting data and visualizations
   - Impact assessment and time ranges

7. **recommendations**
   - Actionable recommendations from insights
   - Priority and effort estimation
   - Implementation tracking

8. **pattern_similarities**
   - Vector-based pattern matching results
   - Cross-client similarity analysis
   - Time-based pattern comparisons

9. **external_factors**
   - External data for correlation analysis
   - Holiday calendars and seasonal factors
   - Economic and weather data integration

10. **vertex_ai_model_performance**
    - Model performance tracking over time
    - Accuracy metrics and drift detection
    - Endpoint latency monitoring

## Vector Operations

### Supported Distance Functions

- **L2 Distance** (`<->`) - Euclidean distance
- **Inner Product** (`<#>`) - Dot product similarity  
- **Cosine Distance** (`<=>`) - Cosine similarity (recommended)

### Vector Indexes

All vector columns use `ivfflat` indexes with cosine distance:

```sql
CREATE INDEX idx_table_vector 
ON table_name USING ivfflat (vector_column vector_cosine_ops) 
WITH (lists = 100);
```

### Custom Functions

- `calculate_cosine_similarity(vec1, vec2)` - Calculate similarity score
- `find_similar_patterns(embedding, type, threshold, limit)` - Pattern matching

## Migration System

### Commands

```bash
# Check migration status
npm run db:status

# Run pending migrations  
npm run db:migrate

# Create new migration
tsx src/lib/migration/migration-cli.ts create migration_name
```

### Migration Files

Located in `src/lib/database/migrations/` with timestamp prefixes:
- `20250103120000_setup_pgvector_and_enhanced_schema.sql`

## Database Connection

### Configuration

Environment variables in `.env.local`:

```env
# Primary connection string (recommended)
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# Connection pool settings
DB_POOL_MAX=20
DB_CONNECTION_TIMEOUT=10000
DB_IDLE_TIMEOUT=30000
```

### Connection Features

- **Connection pooling** with configurable limits
- **SSL support** for production environments
- **Vector operations** with enhanced pool methods
- **Health monitoring** with automatic reconnection

## Vector Utilities

### VectorDatabaseUtils Class

```typescript
import { vectorUtils } from '@/lib/database/vector-utils'

// Similarity search
const results = await vectorUtils.vectorSearch({
  table: 'transcript_embeddings',
  vectorColumn: 'embedding', 
  embedding: [0.1, 0.2, ...], // 768-dimensional array
  limit: 10,
  threshold: 0.7
})

// Insert embedding
await vectorUtils.insertEmbedding(
  'transcript_embeddings',
  { transcript_id: 'uuid', embedding_model: 'text-embedding-004' },
  'embedding',
  embeddingArray
)

// Find similar patterns
const patterns = await vectorUtils.findSimilarPatterns(
  embeddingArray,
  'seasonal', // pattern type
  0.8,        // similarity threshold
  5           // limit
)
```

### Vector Operations

```typescript
// Convert between formats
const vectorString = VectorUtils.arrayToVector([1, 2, 3])
const vectorArray = VectorUtils.vectorToArray('[1,2,3]')

// Calculate similarity
const similarity = VectorUtils.cosineSimilarity(vec1, vec2)

// Normalize vectors
const normalized = VectorUtils.normalizeVector(vector)
```

## Health Monitoring

### Health Check Endpoint

```bash
# Quick health check
curl http://localhost:3000/api/health/database

# Detailed health check
curl http://localhost:3000/api/health/database?detailed=true
```

### Health Check Components

1. **Database Connection** - Basic connectivity test
2. **pgvector Extension** - Vector operations validation
3. **Migration Status** - Schema version verification
4. **Vector Indexes** - Index performance monitoring
5. **Performance Metrics** - Query timing and resource usage

### Health Status Levels

- **Healthy** - All systems operational
- **Degraded** - Minor issues detected (warnings)
- **Unhealthy** - Critical failures requiring attention

## Performance Optimization

### Vector Search Optimization

```sql
-- Update table statistics
ANALYZE table_name;

-- Optimize work memory for vector operations
SET work_mem = '256MB';

-- Set cache size for better performance
SET effective_cache_size = '4GB';
```

### Index Tuning

- **Lists parameter** - Controls index build time vs query speed
- **Probes parameter** - Runtime search accuracy vs speed tradeoff
- **Concurrent indexing** - Non-blocking index creation

### Batch Operations

Use `batchInsertEmbeddings()` for bulk vector insertions:

```typescript
await vectorUtils.batchInsertEmbeddings(
  'transcript_embeddings',
  records, // Array of {data, embedding} objects
  'embedding',
  100 // batch size
)
```

## Testing

### Database Setup Test

```bash
node test-db-setup.js
```

Tests all components:
- Database connectivity
- pgvector functionality  
- Schema validation
- Vector operations
- Index performance
- Sample data operations

### Migration Testing

```bash
# Test migration status
npm run db:status

# Test migration execution
npm run db:migrate
```

## Troubleshooting

### Common Issues

1. **pgvector not found**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Vector dimension mismatch**
   - Ensure all vectors have consistent dimensions (768 for embeddings)
   - Check embedding model output dimensions

3. **Slow vector queries**
   - Verify vector indexes exist
   - Update table statistics with `ANALYZE`
   - Adjust `lists` parameter for indexes

4. **Connection pool exhaustion**
   - Increase `DB_POOL_MAX` setting
   - Check for connection leaks
   - Monitor active connections

### Performance Monitoring

```sql
-- Check vector index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE indexname LIKE '%vector%';

-- Monitor query performance
SELECT query, mean_exec_time, calls
FROM pg_stat_statements 
WHERE query LIKE '%vector%'
ORDER BY mean_exec_time DESC;
```

## Security Considerations

- **SSL connections** required in production
- **Connection string security** - use environment variables
- **Access control** - limit database user permissions
- **Vector data privacy** - consider embedding encryption for sensitive data

## Next Steps

After database setup completion:

1. **Configure Vertex AI** - Set up Google Cloud credentials
2. **Implement ML Pipeline** - Build prediction and training workflows  
3. **Create Analytics UI** - Build dashboard components
4. **Set up Monitoring** - Configure alerts and logging
5. **Performance Testing** - Validate under load

## Support

For issues or questions:
- Check health endpoint: `/api/health/database?detailed=true`
- Review migration logs: `npm run db:status`
- Test setup: `node test-db-setup.js`
- Monitor performance: Database query statistics