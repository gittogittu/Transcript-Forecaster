import { z } from 'zod'

// User validation schemas
export const UserSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  image: z.string().url().optional(),
  role: z.enum(['admin', 'analyst', 'viewer']).default('viewer'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

export const UserUpdateSchema = UserSchema.partial().omit({ id: true })

// Client validation schemas
export const ClientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Client name is required').max(255, 'Client name too long'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

// Transcript data validation schemas
export const TranscriptSchema = z.object({
  id: z.string().uuid().optional(),
  clientId: z.string().uuid('Invalid client ID'),
  clientName: z.string().min(1, 'Client name is required').max(255),
  date: z.date('Invalid date'),
  transcriptCount: z.number().int().min(0, 'Transcript count must be non-negative'),
  transcriptType: z.string().max(100, 'Transcript type too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  createdBy: z.string().uuid('Invalid user ID')
})

export const TranscriptCreateSchema = TranscriptSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
})

export const TranscriptUpdateSchema = TranscriptSchema.partial().omit({ 
  id: true, 
  createdAt: true, 
  createdBy: true 
})

export const BulkTranscriptSchema = z.array(TranscriptCreateSchema).min(1, 'At least one record required')

// Time prediction validation
export const TimePredictionSchema = z.object({
  date: z.date(),
  predictedCount: z.number().min(0, 'Predicted count must be non-negative'),
  confidenceInterval: z.object({
    lower: z.number().min(0, 'Lower bound must be non-negative'),
    upper: z.number().min(0, 'Upper bound must be non-negative')
  }).refine(data => data.upper >= data.lower, {
    message: 'Upper bound must be greater than or equal to lower bound'
  })
})

// Prediction result validation schemas
export const PredictionResultSchema = z.object({
  id: z.string().uuid().optional(),
  clientId: z.string().uuid('Invalid client ID'),
  clientName: z.string().min(1, 'Client name is required'),
  predictionType: z.enum(['daily', 'weekly', 'monthly']),
  predictions: z.array(TimePredictionSchema).min(1, 'At least one prediction required'),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
  accuracy: z.number().min(0).max(1, 'Accuracy must be between 0 and 1'),
  modelType: z.enum(['linear', 'polynomial', 'arima']),
  createdAt: z.date().optional(),
  createdBy: z.string().uuid('Invalid user ID')
})

export const PredictionRequestSchema = z.object({
  clientId: z.string().uuid('Invalid client ID').optional(),
  clientName: z.string().optional(),
  predictionType: z.enum(['daily', 'weekly', 'monthly']).default('monthly'),
  periodsAhead: z.number().int().min(1).max(365, 'Periods ahead must be between 1 and 365').default(30),
  modelType: z.enum(['linear', 'polynomial', 'arima']).default('linear')
})

// Performance metrics validation schemas
export const PerformanceMetricsSchema = z.object({
  id: z.string().uuid().optional(),
  timestamp: z.date().optional(),
  queriesPerSecond: z.number().min(0, 'Queries per second must be non-negative'),
  modelRuntime: z.number().min(0, 'Model runtime must be non-negative'),
  dataSyncLatency: z.number().min(0, 'Data sync latency must be non-negative'),
  errorCount: z.number().int().min(0, 'Error count must be non-negative'),
  activeUsers: z.number().int().min(0, 'Active users must be non-negative'),
  memoryUsage: z.number().min(0, 'Memory usage must be non-negative'),
  cpuUsage: z.number().min(0).max(100, 'CPU usage must be between 0 and 100')
})

// File upload validation schemas
export const FileUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Valid file is required' }),
  fileType: z.enum(['csv', 'excel'], { message: 'File type must be csv or excel' }),
  hasHeaders: z.boolean().default(true),
  dateFormat: z.string().default('YYYY-MM-DD')
}).refine(data => {
  const validExtensions = data.fileType === 'csv' ? ['.csv'] : ['.xlsx', '.xls']
  return validExtensions.some(ext => data.file.name.toLowerCase().endsWith(ext))
}, {
  message: 'File extension does not match file type'
})

// Export validation schemas
export const TimeRangeSchema = z.object({
  start: z.date(),
  end: z.date()
}).refine(data => data.end >= data.start, {
  message: 'End date must be after or equal to start date'
})

export const ExportRequestSchema = z.object({
  format: z.enum(['csv', 'pdf'], { message: 'Format must be csv or pdf' }),
  dateRange: TimeRangeSchema.optional(),
  clients: z.array(z.string().uuid()).optional(),
  includeAnalytics: z.boolean().default(false)
})

// Import result validation
export const ImportErrorSchema = z.object({
  row: z.number().int().min(1, 'Row number must be positive'),
  field: z.string().min(1, 'Field name is required'),
  value: z.any(),
  message: z.string().min(1, 'Error message is required')
})

export const ImportResultSchema = z.object({
  totalRows: z.number().int().min(0, 'Total rows must be non-negative'),
  successCount: z.number().int().min(0, 'Success count must be non-negative'),
  errorCount: z.number().int().min(0, 'Error count must be non-negative'),
  errors: z.array(ImportErrorSchema),
  duplicateCount: z.number().int().min(0, 'Duplicate count must be non-negative')
}).refine(data => data.successCount + data.errorCount + data.duplicateCount === data.totalRows, {
  message: 'Success, error, and duplicate counts must sum to total rows'
})

// Raw data validation for imports
export const RawDataSchema = z.record(z.string(), z.union([z.string(), z.number(), z.date()]))

// CSV row validation for transcript import
export const CSVTranscriptRowSchema = z.object({
  client_name: z.string().min(1, 'Client name is required'),
  date: z.string().min(1, 'Date is required'),
  transcript_count: z.string().min(1, 'Transcript count is required'),
  transcript_type: z.string().optional(),
  notes: z.string().optional()
})

// Query parameter validation
export const TranscriptQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  transcriptType: z.string().optional(),
  page: z.string().optional().default('1').transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)),
  limit: z.string().optional().default('50').transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(100))
})

// API response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional()
})

export const PaginatedResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  }),
  error: z.string().optional()
})

// Type exports for use in components
export type UserInput = z.infer<typeof UserSchema>
export type UserUpdate = z.infer<typeof UserUpdateSchema>
export type ClientInput = z.infer<typeof ClientSchema>
export type TranscriptInput = z.infer<typeof TranscriptSchema>
export type TranscriptCreate = z.infer<typeof TranscriptCreateSchema>
export type TranscriptUpdate = z.infer<typeof TranscriptUpdateSchema>
export type BulkTranscriptInput = z.infer<typeof BulkTranscriptSchema>
export type PredictionResultInput = z.infer<typeof PredictionResultSchema>
export type PredictionRequest = z.infer<typeof PredictionRequestSchema>
export type PerformanceMetricsInput = z.infer<typeof PerformanceMetricsSchema>
export type FileUploadInput = z.infer<typeof FileUploadSchema>
export type ExportRequest = z.infer<typeof ExportRequestSchema>
export type ImportResult = z.infer<typeof ImportResultSchema>
export type TranscriptQuery = z.infer<typeof TranscriptQuerySchema>
export type ApiResponse = z.infer<typeof ApiResponseSchema>
export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>