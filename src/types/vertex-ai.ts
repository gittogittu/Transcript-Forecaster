// Vertex AI Types for Advanced Predictive Analytics

export interface VertexAIConfig {
  projectId: string
  location: string
  credentials?: string | object
  keyFilename?: string
}

export interface VertexAIModelConfig {
  displayName: string
  modelType: 'automl_forecasting' | 'custom_training'
  datasetId?: string
  targetColumn: string
  timeColumn: string
  featureColumns: string[]
  optimizationObjective: 'minimize_rmse' | 'minimize_mae' | 'minimize_mape'
  budgetMilliNodeHours?: number
  transformations?: ModelTransformation[]
}

export interface ModelTransformation {
  columnName: string
  transformationType: 'auto' | 'numeric' | 'categorical' | 'timestamp'
}

export interface ModelTrainingJob {
  name: string
  displayName: string
  state: 'JOB_STATE_QUEUED' | 'JOB_STATE_PENDING' | 'JOB_STATE_RUNNING' | 'JOB_STATE_SUCCEEDED' | 'JOB_STATE_FAILED' | 'JOB_STATE_CANCELLING' | 'JOB_STATE_CANCELLED'
  createTime: string
  startTime?: string
  endTime?: string
  error?: {
    code: number
    message: string
    details: any[]
  }
  modelId?: string
  trainingFraction?: number
  validationFraction?: number
  testFraction?: number
}

export interface ModelDeployment {
  endpointId: string
  deployedModelId: string
  displayName: string
  createTime: string
  modelVersionId: string
  dedicatedResources?: {
    machineSpec: {
      machineType: string
      acceleratorType?: string
      acceleratorCount?: number
    }
    minReplicaCount: number
    maxReplicaCount: number
  }
  automaticResources?: {
    minReplicaCount: number
    maxReplicaCount: number
  }
}

export interface ModelEndpoint {
  name: string
  displayName: string
  description?: string
  deployedModels: DeployedModel[]
  trafficSplit: Record<string, number>
  etag: string
  createTime: string
  updateTime: string
  labels?: Record<string, string>
  network?: string
  enablePrivateServiceConnect?: boolean
}

export interface DeployedModel {
  id: string
  model: string
  displayName: string
  createTime: string
  dedicatedResources?: {
    machineSpec: {
      machineType: string
      acceleratorType?: string
      acceleratorCount?: number
    }
    minReplicaCount: number
    maxReplicaCount: number
    autoscalingMetricSpecs?: AutoscalingMetricSpec[]
  }
  automaticResources?: {
    minReplicaCount: number
    maxReplicaCount: number
  }
  enableAccessLogging?: boolean
  privateEndpoints?: {
    predictHttpUri: string
    explainHttpUri: string
    healthHttpUri: string
    serviceAttachment: string
  }
}

export interface AutoscalingMetricSpec {
  metricName: string
  target: number
}

export interface PredictionInstance {
  [key: string]: any
}

export interface PredictionResponse {
  predictions: any[]
  deployedModelId: string
  model: string
  modelDisplayName: string
  modelVersionId: string
}

export interface BatchPredictionJob {
  name: string
  displayName: string
  model: string
  inputConfig: {
    instancesFormat: 'jsonl' | 'csv' | 'bigquery'
    gcsSource?: {
      uris: string[]
    }
    bigquerySource?: {
      inputUri: string
    }
  }
  outputConfig: {
    predictionsFormat: 'jsonl' | 'csv' | 'bigquery'
    gcsDestination?: {
      outputUriPrefix: string
    }
    bigqueryDestination?: {
      outputUri: string
    }
  }
  state: 'JOB_STATE_QUEUED' | 'JOB_STATE_PENDING' | 'JOB_STATE_RUNNING' | 'JOB_STATE_SUCCEEDED' | 'JOB_STATE_FAILED' | 'JOB_STATE_CANCELLING' | 'JOB_STATE_CANCELLED'
  createTime: string
  startTime?: string
  endTime?: string
  updateTime: string
  error?: {
    code: number
    message: string
    details: any[]
  }
  partialFailures?: any[]
  resourcesConsumed?: {
    replicaHours: number
  }
  completionStats?: {
    successfulCount: string
    failedCount: string
    incompleteCount: string
  }
}

export interface ModelEvaluation {
  name: string
  displayName?: string
  metricsSchemaUri: string
  metrics: any
  createTime: string
  sliceDimensions?: string[]
  modelExplanation?: {
    meanAttributions: Attribution[]
  }
}

export interface Attribution {
  baselineOutputValue: number
  instanceOutputValue: number
  featureAttributions: any
  outputIndex?: number[]
  outputDisplayName?: string
  approximationError?: number
  outputName?: string
}

export interface VertexAIError extends Error {
  code?: number
  status?: string
  details?: any[]
  metadata?: any
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number
  maxConcurrentRequests: number
  retryAttempts: number
  retryDelayMs: number
  backoffMultiplier: number
}

export interface VertexAIClientOptions {
  projectId: string
  location: string
  credentials?: any
  keyFilename?: string
  rateLimitConfig?: RateLimitConfig
  timeout?: number
  maxRetries?: number
}

// Feature Store Types
export interface FeatureStoreConfig {
  featureStoreId: string
  entityType: string
  onlineServingConfig?: {
    fixedNodeCount?: number
    scaling?: {
      minNodeCount: number
      maxNodeCount: number
      cpuUtilizationTarget?: number
    }
  }
}

export interface FeatureGroup {
  name: string
  entityType: string
  labels?: Record<string, string>
  description?: string
  createTime: string
  updateTime: string
  etag: string
}

export interface FeatureGroupConfig {
  featureGroupId: string
  description?: string
  labels?: Record<string, string>
  bigQuery?: {
    bigQuerySource: {
      inputUri: string
    }
    entityIdColumns: string[]
  }
}

export interface FeatureData {
  entityId: string
  featureTimestamp: string
  features: Record<string, any>
}

export interface FeatureQuery {
  entityType: string
  entityIds: string[]
  featureSelector: {
    idMatcher: {
      ids: string[]
    }
  }
  featureGroupId?: string
  featureNames?: string[]
}

export interface FeatureServingResult {
  entityId: string
  features: Record<string, number | string>
  timestamp: Date
}

export interface FeatureVector {
  entityId: string
  featureValues: FeatureValue[]
}

export interface FeatureValue {
  feature: string
  value: {
    stringValue?: string
    doubleValue?: number
    int64Value?: string
    boolValue?: boolean
    stringArrayValue?: {
      values: string[]
    }
    doubleArrayValue?: {
      values: number[]
    }
    int64ArrayValue?: {
      values: string[]
    }
    boolArrayValue?: {
      values: boolean[]
    }
  }
  metadata?: {
    generateTime: string
  }
}

export interface IngestionResult {
  featureGroupId: string
  ingestionRunId: string
  state: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  createTime: string
  startTime?: string
  endTime?: string
  error?: {
    code: number
    message: string
  }
}

export interface DriftAnalysis {
  featureGroup: string
  driftScore: number
  driftThreshold: number
  isDrifted: boolean
  analysisTime: string
  driftedFeatures: DriftedFeature[]
}

export interface DriftedFeature {
  featureName: string
  driftScore: number
  driftType: 'DISTRIBUTION_DRIFT' | 'SCHEMA_DRIFT' | 'DATA_QUALITY_DRIFT'
  description: string
}

// Model Monitoring Types
export interface ModelMonitoringConfig {
  alertConfig?: {
    emailAlertConfig?: {
      userEmails: string[]
    }
    notificationChannels?: string[]
  }
  objectiveConfig?: {
    trainingDataset?: {
      dataFormat: string
      targetField: string
      gcsSource?: {
        uris: string[]
      }
      bigquerySource?: {
        uri: string
      }
    }
    trainingPredictionSkewDetectionConfig?: {
      skewThresholds: Record<string, SkewThreshold>
    }
    predictionDriftDetectionConfig?: {
      driftThresholds: Record<string, DriftThreshold>
    }
  }
  analysisInstanceSchemaUri?: string
  enableLogging?: boolean
}

export interface SkewThreshold {
  value: number
}

export interface DriftThreshold {
  value: number
}

export interface ModelMonitoringJob {
  name: string
  displayName: string
  modelMonitoringSpec: ModelMonitoringConfig
  state: 'JOB_STATE_QUEUED' | 'JOB_STATE_PENDING' | 'JOB_STATE_RUNNING' | 'JOB_STATE_SUCCEEDED' | 'JOB_STATE_FAILED'
  createTime: string
  updateTime: string
  schedule?: string
  error?: {
    code: number
    message: string
  }
}