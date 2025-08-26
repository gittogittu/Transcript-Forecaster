/**
 * TypeScript interfaces for transcript data models
 */

export interface TranscriptData {
  id?: string
  clientName: string
  month: string // Format: YYYY-MM
  year: number
  transcriptCount: number
  createdAt: Date
  updatedAt: Date
  notes?: string
}

export interface TranscriptRow {
  clientName: string
  month: string
  transcriptCount: number
  createdDate: string
  updatedDate: string
  notes?: string
}

export interface TranscriptFormData {
  clientName: string
  month: string
  transcriptCount: number
  notes?: string
}

export interface TranscriptFilters {
  clientName?: string
  startMonth?: string
  endMonth?: string
  minCount?: number
  maxCount?: number
}

export interface TranscriptSummary {
  totalClients: number
  totalTranscripts: number
  averageTranscriptsPerClient: number
  dateRange: { start: string; end: string }
  clientBreakdown: ClientSummary[]
}

export interface ClientSummary {
  clientName: string
  totalTranscripts: number
  monthlyAverage: number
  firstMonth: string
  lastMonth: string
}

export interface MonthlyPrediction {
  month: string
  year: number
  predictedCount: number
  confidenceInterval: {
    lower: number
    upper: number
  }
}

export interface PredictionResult {
  clientName: string
  predictions: MonthlyPrediction[]
  confidence: number
  accuracy: number
  model: 'linear' | 'polynomial' | 'arima'
  generatedAt: Date
}

export interface PredictionRequest {
  clientName?: string
  monthsAhead: number
  modelType: 'linear' | 'polynomial' | 'arima'
}

export interface ModelMetrics {
  accuracy: number
  precision: number
  recall: number
  meanAbsoluteError: number
  rootMeanSquareError: number
  r2Score: number
}

// Error types for better error handling
export interface AppError {
  name: string
  message: string
  code: string
  timestamp: Date
  context?: Record<string, unknown>
}

export interface ValidationErrorData {
  field: string
  message: string
  value: any
  code: string
  name: string
  timestamp: Date
}

export interface ValidationWarning {
  field: string
  message: string
  value: any
  code: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationErrorData[]
  warnings: ValidationWarning[]
}

export interface DataFetchResult<T> {
  data: T | null
  error: string | null
  loading: boolean
  lastUpdated?: Date
}

export interface GoogleSheetsConfig {
  spreadsheetId: string
  range: string
  credentials: {
    type: string
    project_id: string
    private_key_id: string
    private_key: string
    client_email: string
    client_id: string
    auth_uri: string
    token_uri: string
    auth_provider_x509_cert_url: string
    client_x509_cert_url: string
  }
}

export interface SheetsApiResponse {
  values?: string[][]
  range?: string
  majorDimension?: string
}

export interface SheetsUpdateResponse {
  spreadsheetId: string
  updatedRows: number
  updatedColumns: number
  updatedCells: number
}

export interface SheetsError {
  code: number
  message: string
  status: string
}

export interface AuthenticationError extends AppError {
  name: 'AuthenticationError'
  code: 'AUTH_ERROR'
}

export interface ValidationError extends AppError {
  name: 'ValidationError'
  code: 'VALIDATION_ERROR'
  field: string
  value: any
}

export interface APIError extends AppError {
  name: 'APIError'
  code: 'API_ERROR'
  status: number
  endpoint: string
}

export interface PredictionError extends AppError {
  name: 'PredictionError'
  code: 'PREDICTION_ERROR'
  modelType: string
  dataSize: number
}