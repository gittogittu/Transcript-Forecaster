/**
 * Validation helper functions and error handling utilities
 */

import { ZodError, ZodSchema, ZodIssue } from 'zod'
import { 
  ValidationErrorData, 
  ValidationResult, 
  TranscriptData,
  AppError,
  AuthenticationError,
  APIError,
  PredictionError
} from '@/types/transcript'
import {
  TranscriptSchema,
  CreateTranscriptSchema,
  UpdateTranscriptSchema,
  TranscriptFiltersSchema,
  PredictionRequestSchema,
  ValidationResultSchema
} from '@/lib/validations'

/**
 * Generic validation function that returns a ValidationResult
 */
export function validateData<T>(
  schema: ZodSchema<T>,
  data: unknown,
  fieldPrefix = ''
): ValidationResult {
  try {
    schema.parse(data)
    return {
      isValid: true,
      errors: [],
      warnings: [],
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: ValidationErrorData[] = error.issues.map((err: ZodIssue) => ({
        field: fieldPrefix ? `${fieldPrefix}.${err.path.join('.')}` : err.path.join('.'),
        message: err.message,
        value: err.path.reduce((obj: any, key: any) => obj?.[key], data as any),
        code: err.code,
        name: 'ValidationError',
        timestamp: new Date(),
      }))

      return {
        isValid: false,
        errors,
        warnings: [],
      }
    }

    return {
      isValid: false,
      errors: [{
        field: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        value: data,
        code: 'UNKNOWN_ERROR',
        name: 'ValidationError',
        timestamp: new Date(),
      }],
      warnings: [],
    }
  }
}

/**
 * Validate transcript form data
 */
export function validateTranscriptForm(data: unknown): ValidationResult {
  const result = validateData(TranscriptSchema, data, 'transcript')
  
  // Add custom business logic warnings
  if (result.isValid && data && typeof data === 'object') {
    const transcriptData = data as any
    const warnings: ValidationErrorData[] = []

    // Warn about unusually high transcript counts
    if (transcriptData.transcriptCount > 1000) {
      warnings.push({
        field: 'transcriptCount',
        message: 'Transcript count is unusually high. Please verify this is correct.',
        value: transcriptData.transcriptCount,
        code: 'HIGH_COUNT_WARNING',
        name: 'ValidationWarning',
        timestamp: new Date(),
      })
    }

    // Warn about future dates
    const currentMonth = new Date().toISOString().slice(0, 7)
    if (transcriptData.month > currentMonth) {
      warnings.push({
        field: 'month',
        message: 'This appears to be a future date. Please verify this is correct.',
        value: transcriptData.month,
        code: 'FUTURE_DATE_WARNING',
        name: 'ValidationWarning',
        timestamp: new Date(),
      })
    }

    result.warnings = warnings
  }

  return result
}

/**
 * Validate transcript data for creation
 */
export function validateCreateTranscript(data: unknown): ValidationResult {
  return validateData(CreateTranscriptSchema, data, 'create')
}

/**
 * Validate transcript data for updates
 */
export function validateUpdateTranscript(data: unknown): ValidationResult {
  return validateData(UpdateTranscriptSchema, data, 'update')
}

/**
 * Validate transcript filters
 */
export function validateTranscriptFilters(data: unknown): ValidationResult {
  return validateData(TranscriptFiltersSchema, data, 'filters')
}

/**
 * Validate prediction request
 */
export function validatePredictionRequest(data: unknown): ValidationResult {
  return validateData(PredictionRequestSchema, data, 'prediction')
}

/**
 * Validate array of transcript data
 */
export function validateTranscriptArray(data: unknown[]): {
  validItems: TranscriptData[]
  invalidItems: Array<{ index: number; errors: ValidationErrorData[] }>
} {
  const validItems: TranscriptData[] = []
  const invalidItems: Array<{ index: number; errors: ValidationErrorData[] }> = []

  data.forEach((item, index) => {
    const result = validateTranscriptForm(item)
    if (result.isValid) {
      validItems.push(item as TranscriptData)
    } else {
      invalidItems.push({
        index,
        errors: result.errors,
      })
    }
  })

  return { validItems, invalidItems }
}

/**
 * Check for duplicate transcript entries
 */
export function findDuplicateTranscripts(transcripts: TranscriptData[]): Array<{
  duplicateGroup: TranscriptData[]
  key: string
}> {
  const groups = new Map<string, TranscriptData[]>()

  transcripts.forEach((transcript) => {
    const key = `${transcript.clientName.toLowerCase()}-${transcript.month}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(transcript)
  })

  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([key, duplicateGroup]) => ({ key, duplicateGroup }))
}

/**
 * Validate business rules for transcript data
 */
export function validateBusinessRules(transcript: TranscriptData): ValidationResult {
  const errors: ValidationErrorData[] = []
  const warnings: ValidationErrorData[] = []

  // Business rule: No negative transcript counts
  if (transcript.transcriptCount < 0) {
    errors.push({
      field: 'transcriptCount',
      message: 'Transcript count cannot be negative',
      value: transcript.transcriptCount,
      code: 'NEGATIVE_COUNT',
      name: 'ValidationError',
      timestamp: new Date(),
    })
  }

  // Business rule: Reasonable date range
  const currentYear = new Date().getFullYear()
  const transcriptYear = parseInt(transcript.month.split('-')[0])
  
  if (transcriptYear < 2020 || transcriptYear > currentYear + 1) {
    warnings.push({
      field: 'month',
      message: `Transcript year ${transcriptYear} is outside typical range (2020-${currentYear + 1})`,
      value: transcript.month,
      code: 'UNUSUAL_DATE_RANGE',
      name: 'ValidationWarning',
      timestamp: new Date(),
    })
  }

  // Business rule: Client name should not be too generic
  const genericNames = ['test', 'example', 'sample', 'demo', 'client']
  if (genericNames.some(name => transcript.clientName.toLowerCase().includes(name))) {
    warnings.push({
      field: 'clientName',
      message: 'Client name appears to be generic or placeholder text',
      value: transcript.clientName,
      code: 'GENERIC_CLIENT_NAME',
      name: 'ValidationWarning',
      timestamp: new Date(),
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Create custom error classes
 */
export class ValidationErrorClass extends Error implements AppError {
  name = 'ValidationError' as const
  code = 'VALIDATION_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message)
  }
}

export class AuthenticationErrorClass extends Error implements AppError {
  name = 'AuthenticationError' as const
  code = 'AUTH_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(message: string) {
    super(message)
  }
}

export class APIErrorClass extends Error implements AppError {
  name = 'APIError' as const
  code = 'API_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(
    message: string,
    public status: number,
    public endpoint: string
  ) {
    super(message)
  }
}

export class PredictionErrorClass extends Error implements AppError {
  name = 'PredictionError' as const
  code = 'PREDICTION_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(
    message: string,
    public modelType: string,
    public dataSize: number
  ) {
    super(message)
  }
}

// Export aliases for backward compatibility
export { ValidationErrorClass as ValidationError }
export { AuthenticationErrorClass as AuthenticationError }
export { APIErrorClass as APIError }
export { PredictionErrorClass as PredictionError }

/**
 * Error handler utility functions
 */
export function handleValidationError(error: ZodError): ValidationResult {
  const errors: ValidationErrorData[] = error.issues.map((err: ZodIssue) => ({
    field: err.path.join('.'),
    message: err.message,
    value: err.path.length > 0 ? 'Invalid value' : 'Unknown',
    code: err.code,
    name: 'ValidationError',
    timestamp: new Date(),
  }))

  return {
    isValid: false,
    errors,
    warnings: [],
  }
}

export function handleAPIError(error: unknown, endpoint: string): APIErrorClass {
  if (error instanceof APIErrorClass) {
    return error
  }

  if (error instanceof Error) {
    return new APIErrorClass(error.message, 500, endpoint)
  }

  return new APIErrorClass('Unknown API error', 500, endpoint)
}

export function handlePredictionError(error: unknown, modelType: string, dataSize: number): PredictionErrorClass {
  if (error instanceof PredictionErrorClass) {
    return error
  }

  if (error instanceof Error) {
    return new PredictionErrorClass(error.message, modelType, dataSize)
  }

  return new PredictionErrorClass('Unknown prediction error', modelType, dataSize)
}

/**
 * Safe parsing utility that returns both result and errors
 */
export function safeParseWithDetails<T>(
  schema: ZodSchema<T>,
  data: unknown
): {
  success: boolean
  data?: T
  errors?: ValidationErrorData[]
} {
  try {
    const result = schema.parse(data)
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: ValidationErrorData[] = error.issues.map((err: ZodIssue) => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.path.reduce((obj: any, key: any) => obj?.[key], data as any),
        code: err.code,
        name: 'ValidationError',
        timestamp: new Date(),
      }))

      return {
        success: false,
        errors,
      }
    }

    return {
      success: false,
      errors: [{
        field: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        value: data,
        code: 'UNKNOWN_ERROR',
        name: 'ValidationError',
        timestamp: new Date(),
      }],
    }
  }
}

/**
 * Utility to format validation errors for user display
 */
export function formatValidationErrors(errors: ValidationErrorData[]): string[] {
  return errors.map((error) => {
    const fieldName = error.field.split('.').pop() || 'field'
    const formattedFieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
    return `${formattedFieldName}: ${error.message}`
  })
}

/**
 * Utility to check if data meets minimum requirements for predictions
 */
export function validateDataForPrediction(transcripts: TranscriptData[]): ValidationResult {
  const errors: ValidationErrorData[] = []
  const warnings: ValidationErrorData[] = []

  // Need at least 3 data points for meaningful predictions
  if (transcripts.length < 3) {
    errors.push({
      field: 'data',
      message: 'At least 3 historical data points are required for predictions',
      value: transcripts.length,
      code: 'INSUFFICIENT_DATA',
      name: 'ValidationError',
      timestamp: new Date(),
    })
  }

  // Check for data consistency
  const clientNames = new Set(transcripts.map(t => t.clientName))
  if (clientNames.size > 1) {
    warnings.push({
      field: 'clientName',
      message: 'Multiple clients detected. Predictions work best with single client data.',
      value: Array.from(clientNames),
      code: 'MULTIPLE_CLIENTS',
      name: 'ValidationWarning',
      timestamp: new Date(),
    })
  }

  // Check for chronological order
  const sortedTranscripts = [...transcripts].sort((a, b) => a.month.localeCompare(b.month))
  const isChronological = transcripts.every((t, i) => t.month === sortedTranscripts[i].month)
  
  if (!isChronological) {
    warnings.push({
      field: 'data',
      message: 'Data is not in chronological order. This may affect prediction accuracy.',
      value: 'chronological_order',
      code: 'NON_CHRONOLOGICAL',
      name: 'ValidationWarning',
      timestamp: new Date(),
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}