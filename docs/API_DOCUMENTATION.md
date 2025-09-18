# API Documentation

## Overview

The Transcript Analytics Platform provides a comprehensive REST API for managing clients, analytics, predictions, and data import operations.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

The API uses Auth0 for authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Client Management API

### List Clients

**GET** `/api/clients`

Retrieve a list of clients with optional filtering.

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `includeInactive` | boolean | Include inactive clients | `false` |
| `environment` | string | Filter by environment (`prod`, `uat`) | - |
| `q` | string | Search by name or client_code | - |

#### Response

```typescript
{
  "success": true,
  "clients": [
    {
      "id": "uuid",
      "name": "Client Name",
      "client_code": "client-prod",
      "environment": "prod",
      "email": "contact@client.com",
      "is_active": true,
      "overall_aht": 45.5,
      "review_aht": 30.2,
      "validation_aht": 15.3,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Example

```bash
curl -X GET "https://your-domain.com/api/clients?includeInactive=true&q=acme" \
  -H "Authorization: Bearer <jwt_token>"
```

### Create Client

**POST** `/api/clients`

Create a new client or reactivate an existing one.

#### Request Body

```typescript
{
  "client_code": string,      // Required: Unique identifier
  "name"?: string,           // Optional: Display name
  "environment"?: "prod" | "uat", // Optional: Environment
  "email"?: string           // Optional: Contact email
}
```

#### Response

```typescript
{
  "success": true,
  "client": {
    "id": "uuid",
    "name": "Client Name",
    "client_code": "client-prod",
    "environment": "prod",
    "email": "contact@client.com",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Example

```bash
curl -X POST "https://your-domain.com/api/clients" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "client_code": "acme-corp-prod",
    "name": "Acme Corporation",
    "environment": "prod",
    "email": "contact@acme.com"
  }'
```

### Update Client

**PATCH** `/api/clients/{id}`

Update an existing client.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Client UUID |

#### Request Body

```typescript
{
  "name"?: string,
  "client_code"?: string,
  "environment"?: "prod" | "uat",
  "email"?: string,
  "is_active"?: boolean
}
```

#### Response

```typescript
{
  "success": true,
  "client": {
    // Updated client object
  }
}
```

### Remove Client

**DELETE** `/api/clients/{id}`

Soft delete a client (sets `is_active = false`).

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Client UUID |

#### Response

```typescript
{
  "success": true
}
```

## Analytics API

### Get Insights

**GET** `/api/analytics/insights`

Retrieve business insights and recommendations.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_id` | string | Filter by client ID |
| `type` | string | Insight type (`trend`, `anomaly`, `forecast`) |
| `time_range` | string | Time range for analysis |

#### Response

```typescript
{
  "success": true,
  "insights": [
    {
      "id": "uuid",
      "client_id": "uuid",
      "insight_type": "trend",
      "title": "Increasing Transcript Volume",
      "description": "Monthly transcript count has increased by 25% over the last quarter",
      "confidence": 0.85,
      "impact": "high",
      "time_range": {
        "start_date": "2024-01-01",
        "end_date": "2024-03-31"
      },
      "supporting_data": {
        "growth_rate": 0.25,
        "trend_direction": "increasing"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Comprehensive Data

**GET** `/api/analytics/comprehensive-data`

Retrieve comprehensive analytics data for dashboards.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_id` | string | Filter by client ID |
| `start_date` | string | Start date (ISO format) |
| `end_date` | string | End date (ISO format) |

#### Response

```typescript
{
  "success": true,
  "data": {
    "overview": {
      "total_clients": 150,
      "total_transcripts": 45000,
      "active_clients": 142,
      "avg_monthly_growth": 0.12
    },
    "client_metrics": [
      {
        "client_id": "uuid",
        "name": "Client Name",
        "total_transcripts": 1500,
        "monthly_average": 125,
        "growth_rate": 0.15,
        "last_activity": "2024-01-15T00:00:00Z"
      }
    ],
    "time_series": [
      {
        "date": "2024-01-01",
        "transcript_count": 1200,
        "client_count": 45
      }
    ]
  }
}
```

## Prediction API

### Forecast

**POST** `/api/predictions/forecast`

Generate forecasts for transcript volumes.

#### Request Body

```typescript
{
  "client_id": string,           // Required: Client to forecast for
  "horizon": number,             // Required: Forecast horizon in days
  "model_type"?: string,         // Optional: Model type
  "confidence_level"?: number    // Optional: Confidence level (0-1)
}
```

#### Response

```typescript
{
  "success": true,
  "prediction": {
    "id": "uuid",
    "client_id": "uuid",
    "forecast_horizon": 30,
    "predicted_values": [
      {
        "date": "2024-02-01",
        "value": 125,
        "confidence_lower": 115,
        "confidence_upper": 135
      }
    ],
    "model_confidence": 0.82,
    "seasonality_detected": {
      "weekly": true,
      "monthly": false
    },
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Batch Predictions

**POST** `/api/predictions/batch`

Generate predictions for multiple clients.

#### Request Body

```typescript
{
  "client_ids": string[],        // Required: Array of client IDs
  "horizon": number,             // Required: Forecast horizon
  "options": {
    "model_type"?: string,
    "confidence_level"?: number
  }
}
```

#### Response

```typescript
{
  "success": true,
  "batch_id": "uuid",
  "predictions": [
    {
      "client_id": "uuid",
      "status": "completed",
      "prediction": {
        // Prediction object
      }
    }
  ],
  "summary": {
    "total_clients": 10,
    "completed": 8,
    "failed": 2
  }
}
```

## Anomaly Detection API

### Detect Anomalies

**POST** `/api/anomaly-detection/detect`

Detect anomalies in client data.

#### Request Body

```typescript
{
  "client_id": string,           // Required: Client to analyze
  "time_range": {
    "start_date": string,        // ISO date
    "end_date": string           // ISO date
  },
  "sensitivity"?: number         // Optional: Detection sensitivity (0-1)
}
```

#### Response

```typescript
{
  "success": true,
  "anomalies": [
    {
      "id": "uuid",
      "client_id": "uuid",
      "anomaly_type": "spike",
      "detected_at": "2024-01-15T00:00:00Z",
      "severity": "high",
      "confidence": 0.92,
      "description": "Unusual spike in transcript volume",
      "affected_metrics": ["transcript_count"],
      "baseline_value": 120,
      "actual_value": 250,
      "explanation": {
        "primary_factors": ["time_of_day", "day_of_week"],
        "contributing_factors": ["external_event"]
      }
    }
  ]
}
```

## Data Import API

### Import Data

**POST** `/api/data/import`

Import historical data from files.

#### Request Body (multipart/form-data)

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | CSV, JSON, or Excel file |
| `cleanData` | boolean | Enable data cleaning |
| `generateEmbeddings` | boolean | Generate embeddings |
| `trainModels` | boolean | Train ML models |
| `detectAnomalies` | boolean | Run anomaly detection |

#### Response

```typescript
{
  "success": true,
  "importId": "import_1234567890_abc123",
  "recordsProcessed": 0,
  "message": "Data import started successfully",
  "processingOptions": {
    "cleanData": true,
    "generateEmbeddings": true,
    "trainModels": false,
    "detectAnomalies": false
  }
}
```

### Get Import Status

**GET** `/api/data/import`

Get import history or specific import status.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `importId` | string | Get specific import status |

#### Response

```typescript
{
  "success": true,
  "imports": [
    {
      "import_id": "import_1234567890_abc123",
      "file_name": "historical_data.csv",
      "file_type": "text/csv",
      "status": "completed",
      "total_records": 1000,
      "processed_records": 1000,
      "created_at": "2024-01-01T00:00:00Z",
      "completed_at": "2024-01-01T00:05:00Z"
    }
  ]
}
```

## System API

### Health Check

**GET** `/api/health`

Check system health status.

#### Response

```typescript
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "database": "healthy",
    "vertexAI": "healthy"
  }
}
```

### Database Health

**GET** `/api/health/database`

Check database connectivity and performance.

#### Response

```typescript
{
  "status": "healthy",
  "connection_count": 5,
  "response_time_ms": 25,
  "version": "PostgreSQL 15.0"
}
```

## Error Responses

### Standard Error Format

```typescript
{
  "success": false,
  "error": "Error message",
  "code"?: "ERROR_CODE",
  "details"?: {
    "field": "validation details"
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `CLIENT_NOT_FOUND` | Client does not exist |
| `DUPLICATE_CLIENT_CODE` | Client code already exists |
| `DATABASE_ERROR` | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | External service unavailable |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API**: 100 requests per 15 minutes per IP
- **Data Import**: 10 requests per hour per user
- **Predictions**: 50 requests per hour per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642780800
```

## Pagination

For endpoints that return lists, pagination is supported:

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | number | Page number (1-based) | 1 |
| `limit` | number | Items per page | 25 |

#### Response Headers

```
X-Total-Count: 1000
X-Page: 1
X-Per-Page: 25
X-Total-Pages: 40
```