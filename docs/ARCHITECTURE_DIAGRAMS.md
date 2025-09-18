# Architecture Diagrams

This document contains comprehensive system architecture diagrams using Mermaid to visualize the Transcript Analytics Platform's structure and data flow.

## System Overview Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Next.js React Frontend]
        NAV[Navigation System]
        DASH[Analytics Dashboards]
        CLIENT[Client Management]
        IMPORT[Data Import Interface]
    end
    
    subgraph "API Layer"
        API[Next.js API Routes]
        AUTH[Authentication Middleware]
        VALID[Input Validation]
        RATE[Rate Limiting]
    end
    
    subgraph "Core Services"
        ML[ML/AI Services]
        ANALYTICS[Analytics Engine]
        PREDICT[Prediction Services]
        ANOMALY[Anomaly Detection]
        INSIGHT[Insight Generation]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL Database)]
        VECTOR[(pgvector Extension)]
        CACHE[Prediction Cache]
        FILES[File Storage]
    end
    
    subgraph "External Services"
        VERTEX[Google Vertex AI]
        STORAGE[Cloud Storage]
        AUTH0[Auth0 Authentication]
    end
    
    UI --> API
    NAV --> UI
    DASH --> UI
    CLIENT --> UI
    IMPORT --> UI
    
    API --> AUTH
    API --> VALID
    API --> RATE
    
    API --> ML
    API --> ANALYTICS
    API --> PREDICT
    API --> ANOMALY
    API --> INSIGHT
    
    ML --> DB
    ANALYTICS --> DB
    PREDICT --> CACHE
    ANOMALY --> DB
    INSIGHT --> DB
    
    DB --> VECTOR
    
    ML --> VERTEX
    FILES --> STORAGE
    AUTH --> AUTH0
    
    style UI fill:#e1f5fe
    style API fill:#f3e5f5
    style DB fill:#e8f5e8
    style ML fill:#fff3e0
```

## Machine Learning Architecture

```mermaid
graph TB
    subgraph "Data Pipeline"
        INGEST[Data Ingestion]
        CLEAN[Data Cleaning]
        VALIDATE[Data Validation]
        TRANSFORM[Data Transformation]
    end
    
    subgraph "Feature Engineering"
        TEMPORAL[Temporal Features]
        STATS[Statistical Features]
        DOMAIN[Domain Features]
        INTERACT[Interaction Features]
    end
    
    subgraph "Model Training"
        AUTO[AutoML Pipeline]
        CUSTOM[Custom Models]
        ENSEMBLE[Ensemble Methods]
        HYPER[Hyperparameter Tuning]
    end
    
    subgraph "Model Types"
        ARIMA[ARIMA/SARIMA]
        PROPHET[Prophet]
        XGBOOST[XGBoost]
        LSTM[LSTM Networks]
        TRANSFORMER[Transformers]
    end
    
    subgraph "Model Management"
        REGISTRY[Model Registry]
        VERSION[Version Control]
        AB[A/B Testing]
        DEPLOY[Deployment]
    end
    
    subgraph "Prediction Services"
        BATCH[Batch Predictions]
        REALTIME[Real-time Inference]
        CONFIDENCE[Confidence Scoring]
        EXPLAIN[Explainable AI]
    end
    
    subgraph "Monitoring"
        DRIFT[Concept Drift Detection]
        ACCURACY[Accuracy Tracking]
        PERFORMANCE[Performance Monitoring]
        ALERTS[Alert Management]
    end
    
    INGEST --> CLEAN
    CLEAN --> VALIDATE
    VALIDATE --> TRANSFORM
    
    TRANSFORM --> TEMPORAL
    TRANSFORM --> STATS
    TRANSFORM --> DOMAIN
    TRANSFORM --> INTERACT
    
    TEMPORAL --> AUTO
    STATS --> CUSTOM
    DOMAIN --> ENSEMBLE
    INTERACT --> HYPER
    
    AUTO --> ARIMA
    CUSTOM --> PROPHET
    ENSEMBLE --> XGBOOST
    HYPER --> LSTM
    AUTO --> TRANSFORMER
    
    ARIMA --> REGISTRY
    PROPHET --> VERSION
    XGBOOST --> AB
    LSTM --> DEPLOY
    TRANSFORMER --> DEPLOY
    
    DEPLOY --> BATCH
    DEPLOY --> REALTIME
    DEPLOY --> CONFIDENCE
    DEPLOY --> EXPLAIN
    
    REALTIME --> DRIFT
    BATCH --> ACCURACY
    CONFIDENCE --> PERFORMANCE
    EXPLAIN --> ALERTS
    
    style INGEST fill:#ffebee
    style AUTO fill:#e8f5e8
    style REGISTRY fill:#e1f5fe
    style BATCH fill:#fff3e0
    style DRIFT fill:#f3e5f5
```

## Database Schema Architecture

```mermaid
erDiagram
    CLIENTS {
        uuid id PK
        varchar name
        varchar client_code UK
        varchar environment
        varchar email
        boolean is_active
        decimal overall_aht
        decimal review_aht
        decimal validation_aht
        timestamp created_at
        timestamp updated_at
    }
    
    MONTHLY_TRANSCRIPT_DATA {
        uuid id PK
        uuid client_id FK
        varchar client_code
        integer year
        integer month
        varchar month_key
        integer transcript_count
        timestamp created_at
        timestamp updated_at
    }
    
    CLIENT_ANALYTICS_SUMMARY {
        uuid id PK
        uuid client_id FK
        varchar client_code
        integer total_transcripts
        integer months_active
        decimal avg_monthly_transcripts
        varchar growth_trend
        boolean has_seasonality
        timestamp created_at
        timestamp updated_at
    }
    
    VERTEX_AI_MODELS {
        uuid id PK
        varchar model_name
        varchar model_type
        varchar model_version
        json model_config
        varchar status
        timestamp created_at
        timestamp updated_at
    }
    
    VERTEX_AI_PREDICTIONS {
        uuid id PK
        uuid client_id FK
        uuid model_id FK
        date prediction_date
        integer predicted_value
        decimal confidence_lower
        decimal confidence_upper
        decimal confidence_score
        json metadata
        timestamp created_at
    }
    
    EMBEDDINGS {
        uuid id PK
        varchar entity_type
        uuid entity_id
        vector embedding
        json metadata
        timestamp created_at
    }
    
    ANOMALIES {
        uuid id PK
        uuid client_id FK
        varchar anomaly_type
        date detected_date
        varchar severity
        decimal confidence
        text description
        json explanation
        timestamp created_at
    }
    
    BUSINESS_INSIGHTS {
        uuid id PK
        uuid client_id FK
        varchar insight_type
        text title
        text description
        decimal confidence
        varchar impact
        json supporting_data
        timestamp created_at
    }
    
    CLIENTS ||--o{ MONTHLY_TRANSCRIPT_DATA : "has"
    CLIENTS ||--o{ CLIENT_ANALYTICS_SUMMARY : "has"
    CLIENTS ||--o{ VERTEX_AI_PREDICTIONS : "receives"
    CLIENTS ||--o{ ANOMALIES : "has"
    CLIENTS ||--o{ BUSINESS_INSIGHTS : "generates"
    VERTEX_AI_MODELS ||--o{ VERTEX_AI_PREDICTIONS : "creates"
```

## API Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Frontend]
        MOBILE[Mobile App]
        API_CLIENT[API Clients]
    end
    
    subgraph "Gateway Layer"
        GATEWAY[API Gateway]
        CORS[CORS Handler]
        LIMIT[Rate Limiter]
        LOG[Request Logger]
    end
    
    subgraph "Authentication"
        AUTH_MW[Auth Middleware]
        JWT[JWT Validation]
        RBAC[Role-Based Access]
    end
    
    subgraph "API Routes"
        CLIENT_API["/api/clients/*"]
        ANALYTICS_API["/api/analytics/*"]
        PREDICT_API["/api/predictions/*"]
        ANOMALY_API["/api/anomaly-detection/*"]
        IMPORT_API["/api/data/import"]
        HEALTH_API["/api/health/*"]
    end
    
    subgraph "Business Logic"
        CLIENT_SERVICE[Client Service]
        ANALYTICS_SERVICE[Analytics Service]
        ML_SERVICE[ML Service]
        ANOMALY_SERVICE[Anomaly Service]
        IMPORT_SERVICE[Import Service]
    end
    
    subgraph "Data Access"
        CLIENT_DAO[Client DAO]
        ANALYTICS_DAO[Analytics DAO]
        PREDICTION_DAO[Prediction DAO]
        CACHE_DAO[Cache DAO]
    end
    
    WEB --> GATEWAY
    MOBILE --> GATEWAY
    API_CLIENT --> GATEWAY
    
    GATEWAY --> CORS
    CORS --> LIMIT
    LIMIT --> LOG
    
    LOG --> AUTH_MW
    AUTH_MW --> JWT
    JWT --> RBAC
    
    RBAC --> CLIENT_API
    RBAC --> ANALYTICS_API
    RBAC --> PREDICT_API
    RBAC --> ANOMALY_API
    RBAC --> IMPORT_API
    RBAC --> HEALTH_API
    
    CLIENT_API --> CLIENT_SERVICE
    ANALYTICS_API --> ANALYTICS_SERVICE
    PREDICT_API --> ML_SERVICE
    ANOMALY_API --> ANOMALY_SERVICE
    IMPORT_API --> IMPORT_SERVICE
    
    CLIENT_SERVICE --> CLIENT_DAO
    ANALYTICS_SERVICE --> ANALYTICS_DAO
    ML_SERVICE --> PREDICTION_DAO
    ANOMALY_SERVICE --> ANALYTICS_DAO
    IMPORT_SERVICE --> CLIENT_DAO
    
    CLIENT_DAO --> DB[(Database)]
    ANALYTICS_DAO --> DB
    PREDICTION_DAO --> CACHE_DAO
    CACHE_DAO --> CACHE[(Cache)]
    
    style WEB fill:#e1f5fe
    style GATEWAY fill:#f3e5f5
    style AUTH_MW fill:#fff3e0
    style CLIENT_API fill:#e8f5e8
    style CLIENT_SERVICE fill:#ffebee
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Load Balancer]
        SSL[SSL Termination]
    end
    
    subgraph "Application Tier"
        APP1[Next.js App Instance 1]
        APP2[Next.js App Instance 2]
        APP3[Next.js App Instance 3]
    end
    
    subgraph "Service Mesh"
        MESH[Service Mesh Gateway]
        CIRCUIT[Circuit Breaker]
        RETRY[Retry Logic]
    end
    
    subgraph "Database Tier"
        PRIMARY[(PostgreSQL Primary)]
        REPLICA1[(PostgreSQL Replica 1)]
        REPLICA2[(PostgreSQL Replica 2)]
        PGPOOL[PgPool Connection Pool]
    end
    
    subgraph "Cache Tier"
        REDIS_PRIMARY[(Redis Primary)]
        REDIS_REPLICA[(Redis Replica)]
        REDIS_SENTINEL[Redis Sentinel]
    end
    
    subgraph "External Services"
        VERTEX[Google Vertex AI]
        STORAGE[Cloud Storage]
        AUTH0[Auth0]
        MONITORING[Monitoring Stack]
    end
    
    subgraph "Infrastructure"
        K8S[Kubernetes Cluster]
        INGRESS[Ingress Controller]
        HPA[Horizontal Pod Autoscaler]
        PVC[Persistent Volume Claims]
    end
    
    LB --> SSL
    SSL --> APP1
    SSL --> APP2
    SSL --> APP3
    
    APP1 --> MESH
    APP2 --> MESH
    APP3 --> MESH
    
    MESH --> CIRCUIT
    CIRCUIT --> RETRY
    
    RETRY --> PGPOOL
    PGPOOL --> PRIMARY
    PGPOOL --> REPLICA1
    PGPOOL --> REPLICA2
    
    APP1 --> REDIS_SENTINEL
    APP2 --> REDIS_SENTINEL
    APP3 --> REDIS_SENTINEL
    
    REDIS_SENTINEL --> REDIS_PRIMARY
    REDIS_SENTINEL --> REDIS_REPLICA
    
    APP1 --> VERTEX
    APP2 --> STORAGE
    APP3 --> AUTH0
    
    LB --> INGRESS
    INGRESS --> K8S
    K8S --> HPA
    K8S --> PVC
    
    APP1 --> MONITORING
    PRIMARY --> MONITORING
    REDIS_PRIMARY --> MONITORING
    
    style LB fill:#e1f5fe
    style APP1 fill:#e8f5e8
    style PRIMARY fill:#fff3e0
    style REDIS_PRIMARY fill:#f3e5f5
    style K8S fill:#ffebee
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant Client as Client Browser
    participant Frontend as Next.js Frontend
    participant API as API Routes
    participant ML as ML Services
    participant DB as PostgreSQL
    participant Cache as Redis Cache
    participant Vertex as Vertex AI
    
    Note over Client,Vertex: Daily ML Training Pipeline
    
    Client->>Frontend: Upload new transcript data
    Frontend->>API: POST /api/data/import
    API->>DB: Store raw data
    
    Note over ML,Vertex: Automated Daily Process (2 AM UTC)
    
    ML->>DB: Fetch new daily data
    ML->>ML: Feature engineering
    ML->>Vertex: Train/update models
    Vertex-->>ML: Updated model artifacts
    ML->>DB: Store model metadata
    ML->>Cache: Cache model predictions
    
    Note over Client,Cache: Real-time Prediction Request
    
    Client->>Frontend: Request predictions
    Frontend->>API: GET /api/predictions/forecast
    API->>Cache: Check prediction cache
    
    alt Cache Hit
        Cache-->>API: Return cached predictions
    else Cache Miss
        API->>ML: Generate new predictions
        ML->>Vertex: Call ML models
        Vertex-->>ML: Prediction results
        ML->>Cache: Store predictions
        ML-->>API: Return predictions
    end
    
    API-->>Frontend: Prediction response
    Frontend-->>Client: Display predictions
    
    Note over ML,DB: Continuous Monitoring
    
    ML->>DB: Monitor prediction accuracy
    ML->>ML: Detect concept drift
    
    alt Drift Detected
        ML->>Vertex: Trigger model retraining
        ML->>DB: Log retraining event
    end
```

## Security Architecture

```mermaid
graph TB
    subgraph "External Threats"
        DDOS[DDoS Attacks]
        INJECTION[SQL Injection]
        XSS[XSS Attacks]
        CSRF[CSRF Attacks]
    end
    
    subgraph "Edge Security"
        WAF[Web Application Firewall]
        CDN[CDN with DDoS Protection]
        RATE_LIMIT[Rate Limiting]
    end
    
    subgraph "Application Security"
        CSP[Content Security Policy]
        CORS_POLICY[CORS Policy]
        INPUT_VALID[Input Validation]
        SANITIZE[Data Sanitization]
    end
    
    subgraph "Authentication & Authorization"
        AUTH0_SERVICE[Auth0 Service]
        JWT_TOKENS[JWT Tokens]
        RBAC_SYSTEM[RBAC System]
        SESSION_MGT[Session Management]
    end
    
    subgraph "Data Security"
        ENCRYPTION_REST[Encryption at Rest]
        ENCRYPTION_TRANSIT[Encryption in Transit]
        DB_SECURITY[Database Security]
        PII_PROTECTION[PII Protection]
    end
    
    subgraph "Infrastructure Security"
        VPC[Virtual Private Cloud]
        FIREWALL[Network Firewall]
        SECRETS[Secrets Management]
        AUDIT_LOG[Audit Logging]
    end
    
    DDOS --> WAF
    INJECTION --> WAF
    XSS --> CDN
    CSRF --> RATE_LIMIT
    
    WAF --> CSP
    CDN --> CORS_POLICY
    RATE_LIMIT --> INPUT_VALID
    
    CSP --> AUTH0_SERVICE
    CORS_POLICY --> JWT_TOKENS
    INPUT_VALID --> RBAC_SYSTEM
    SANITIZE --> SESSION_MGT
    
    AUTH0_SERVICE --> ENCRYPTION_REST
    JWT_TOKENS --> ENCRYPTION_TRANSIT
    RBAC_SYSTEM --> DB_SECURITY
    SESSION_MGT --> PII_PROTECTION
    
    ENCRYPTION_REST --> VPC
    ENCRYPTION_TRANSIT --> FIREWALL
    DB_SECURITY --> SECRETS
    PII_PROTECTION --> AUDIT_LOG
    
    style DDOS fill:#ffebee
    style WAF fill:#e8f5e8
    style CSP fill:#e1f5fe
    style AUTH0_SERVICE fill:#f3e5f5
    style ENCRYPTION_REST fill:#fff3e0
    style VPC fill:#fce4ec
```