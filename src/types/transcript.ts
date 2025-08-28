export interface User {
  id: string
  email: string
  name: string
  image?: string
  role: 'admin' | 'analyst' | 'viewer'
  createdAt: Date
  updatedAt: Date
}

export interface Client {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface TranscriptData {
  id: string
  clientId: string
  clientName: string
  date: Date
  transcriptCount: number
  transcriptType?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface TimePrediction {
  date: Date
  predictedCount: number
  confidenceInterval: {
    lower: number
    upper: number
  }
}

export interface PredictionResult {
  id: string
  clientId: string
  clientName: string
  predictionType: 'daily' | 'weekly' | 'monthly'
  predictions: TimePrediction[]
  confidence: number
  accuracy: number
  modelType: 'linear' | 'polynomial' | 'arima'
  createdAt: Date
  createdBy: string
}

export interface PerformanceMetrics {
  id: string
  timestamp: Date
  queriesPerSecond: number
  modelRuntime: number
  dataSyncLatency: number
  errorCount: number
  activeUsers: number
  memoryUsage: number
  cpuUsage: number
}

// Additional utility types
export interface ImportResult {
  totalRows: number
  successCount: number
  errorCount: number
  errors: ImportError[]
  duplicateCount: number
}

export interface ImportError {
  row: number
  field: string
  value: any
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface ModelMetrics {
  accuracy: number
  precision: number
  recall: number
  meanAbsoluteError: number
  rootMeanSquareError: number
}

export interface MetricsSummary {
  timeRange: {
    start: Date
    end: Date
  }
  averageQueriesPerSecond: number
  averageModelRuntime: number
  averageDataSyncLatency: number
  totalErrors: number
  peakActiveUsers: number
  averageMemoryUsage: number
  averageCpuUsage: number
}

export interface TimeRange {
  start: Date
  end: Date
}

// File upload types
export interface FileUploadData {
  file: File
  fileType: 'csv' | 'excel'
  hasHeaders: boolean
  dateFormat: string
}

// Export types
export interface ExportRequest {
  format: 'csv' | 'pdf'
  dateRange?: TimeRange
  clients?: string[]
  includeAnalytics: boolean
}

// Raw data from file imports
export interface RawData {
  [key: string]: string | number | Date
}