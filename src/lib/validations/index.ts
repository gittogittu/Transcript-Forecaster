import { z } from 'zod'

// Validation schemas for the transcript analytics platform

// Core transcript data validation
export const TranscriptSchema = z.object({
  clientName: z
    .string()
    .min(1, 'Client name is required')
    .max(100, 'Client name must be less than 100 characters')
    .trim(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')
    .refine((month) => {
      const [year, monthNum] = month.split('-').map(Number)
      return year >= 2020 && year <= 2030 && monthNum >= 1 && monthNum <= 12
    }, 'Month must be a valid date between 2020-01 and 2030-12'),
  transcriptCount: z
    .number()
    .int('Transcript count must be an integer')
    .min(0, 'Count must be non-negative')
    .max(10000, 'Count seems unusually high, please verify'),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
    .transform((val) => val?.trim() || ''),
})

// Schema for creating new transcript data (without computed fields)
export const CreateTranscriptSchema = TranscriptSchema.extend({
  year: z.number().int().min(2020).max(2030).optional(),
})

// Schema for updating transcript data (all fields optional)
export const UpdateTranscriptSchema = TranscriptSchema.partial()

// Schema for transcript filters
export const TranscriptFiltersSchema = z.object({
  clientName: z.string().optional(),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  endMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  minCount: z.number().int().min(0).optional(),
  maxCount: z.number().int().min(0).optional(),
}).refine((data) => {
  if (data.startMonth && data.endMonth) {
    return data.startMonth <= data.endMonth
  }
  return true
}, 'Start month must be before or equal to end month')
.refine((data) => {
  if (data.minCount !== undefined && data.maxCount !== undefined) {
    return data.minCount <= data.maxCount
  }
  return true
}, 'Minimum count must be less than or equal to maximum count')

// Prediction request validation
export const PredictionRequestSchema = z.object({
  clientName: z.string().optional(),
  monthsAhead: z
    .number()
    .int('Months ahead must be an integer')
    .min(1, 'Must predict at least 1 month ahead')
    .max(12, 'Cannot predict more than 12 months ahead')
    .default(6),
  modelType: z
    .enum(['linear', 'polynomial', 'arima'])
    .default('linear'),
})

// API response validation schemas
export const TranscriptDataSchema = TranscriptSchema.extend({
  id: z.string().optional(),
  year: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const MonthlyPredictionSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  year: z.number().int(),
  predictedCount: z.number().min(0),
  confidenceInterval: z.object({
    lower: z.number().min(0),
    upper: z.number().min(0),
  }),
})

export const PredictionResultSchema = z.object({
  clientName: z.string(),
  predictions: z.array(MonthlyPredictionSchema),
  confidence: z.number().min(0).max(1),
  accuracy: z.number().min(0).max(1),
  model: z.enum(['linear', 'polynomial', 'arima']),
  generatedAt: z.date(),
})

// Google Sheets specific validation
export const SheetsRowSchema = z.object({
  clientName: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  transcriptCount: z.number().int().min(0),
  createdDate: z.string(),
  updatedDate: z.string(),
  notes: z.string().optional(),
})

// Bulk operations validation
export const BulkTranscriptSchema = z.object({
  transcripts: z.array(TranscriptSchema).min(1, 'At least one transcript is required'),
})

// Error validation schemas
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  value: z.any(),
  code: z.string(),
})

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationErrorSchema),
})

// Type exports
export type TranscriptFormData = z.infer<typeof TranscriptSchema>
export type CreateTranscriptData = z.infer<typeof CreateTranscriptSchema>
export type UpdateTranscriptData = z.infer<typeof UpdateTranscriptSchema>
export type TranscriptFilters = z.infer<typeof TranscriptFiltersSchema>
export type PredictionRequest = z.infer<typeof PredictionRequestSchema>
export type TranscriptDataType = z.infer<typeof TranscriptDataSchema>
export type MonthlyPrediction = z.infer<typeof MonthlyPredictionSchema>
export type PredictionResult = z.infer<typeof PredictionResultSchema>
export type SheetsRow = z.infer<typeof SheetsRowSchema>
export type BulkTranscriptData = z.infer<typeof BulkTranscriptSchema>
export type ValidationError = z.infer<typeof ValidationErrorSchema>
export type ValidationResult = z.infer<typeof ValidationResultSchema>
