/**
 * Unit tests for validation helper functions
 */

import {
  validateData,
  validateTranscriptForm,
  validateCreateTranscript,
  validateUpdateTranscript,
  validateTranscriptFilters,
  validatePredictionRequest,
  validateTranscriptArray,
  findDuplicateTranscripts,
  validateBusinessRules,
  validateDataForPrediction,
  ValidationErrorClass,
  AuthenticationErrorClass,
  APIErrorClass,
  PredictionErrorClass,
  handleValidationError,
  handleAPIError,
  handlePredictionError,
  safeParseWithDetails,
  formatValidationErrors,
} from '../validation-helpers'
import { TranscriptSchema, PredictionRequestSchema } from '@/lib/validations'
import { TranscriptData } from '@/types/transcript'
import { ZodError } from 'zod'

describe('validateData', () => {
  it('should return valid result for correct data', () => {
    const validData = {
      clientName: 'Test Client',
      month: '2024-01',
      transcriptCount: 100,
    }

    const result = validateData(TranscriptSchema, validData)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('should return errors for invalid data', () => {
    const invalidData = {
      clientName: '',
      month: 'invalid',
      transcriptCount: -1,
    }

    const result = validateData(TranscriptSchema, invalidData)

    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some(e => e.field === 'clientName')).toBe(true)
    expect(result.errors.some(e => e.field === 'month')).toBe(true)
    expect(result.errors.some(e => e.field === 'transcriptCount')).toBe(true)
  })

  it('should handle field prefix', () => {
    const invalidData = { clientName: '' }
    const result = validateData(TranscriptSchema, invalidData, 'form')

    expect(result.errors[0].field).toContain('form.')
  })

  it('should handle non-Zod errors', () => {
    const mockSchema = {
      parse: () => {
        throw new Error('Custom error')
      }
    } as any

    const result = validateData(mockSchema, {})

    expect(result.isValid).toBe(false)
    expect(result.errors[0].message).toBe('Custom error')
    expect(result.errors[0].code).toBe('UNKNOWN_ERROR')
  })
})

describe('validateTranscriptForm', () => {
  it('should validate correct form data', () => {
    const validData = {
      clientName: 'Test Client',
      month: '2024-01',
      transcriptCount: 100,
      notes: 'Test notes',
    }

    const result = validateTranscriptForm(validData)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should add warning for high transcript count', () => {
    const dataWithHighCount = {
      clientName: 'Test Client',
      month: '2024-01',
      transcriptCount: 1500,
    }

    const result = validateTranscriptForm(dataWithHighCount)

    expect(result.isValid).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0].code).toBe('HIGH_COUNT_WARNING')
  })

  it('should add warning for future date', () => {
    const futureMonth = new Date()
    futureMonth.setMonth(futureMonth.getMonth() + 2)
    const futureMonthStr = futureMonth.toISOString().slice(0, 7)

    const dataWithFutureDate = {
      clientName: 'Test Client',
      month: futureMonthStr,
      transcriptCount: 100,
    }

    const result = validateTranscriptForm(dataWithFutureDate)

    expect(result.isValid).toBe(true)
    expect(result.warnings.some(w => w.code === 'FUTURE_DATE_WARNING')).toBe(true)
  })
})

describe('validateCreateTranscript', () => {
  it('should validate create data with optional year', () => {
    const validData = {
      clientName: 'Test Client',
      month: '2024-01',
      transcriptCount: 100,
      year: 2024,
    }

    const result = validateCreateTranscript(validData)

    expect(result.isValid).toBe(true)
  })
})

describe('validateUpdateTranscript', () => {
  it('should validate partial update data', () => {
    const partialData = { transcriptCount: 150 }

    const result = validateUpdateTranscript(partialData)

    expect(result.isValid).toBe(true)
  })

  it('should validate provided fields', () => {
    const invalidData = { transcriptCount: -1 }

    const result = validateUpdateTranscript(invalidData)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'transcriptCount')).toBe(true)
  })
})

describe('validateTranscriptFilters', () => {
  it('should validate correct filters', () => {
    const validFilters = {
      clientName: 'Test Client',
      startMonth: '2024-01',
      endMonth: '2024-12',
      minCount: 0,
      maxCount: 1000,
    }

    const result = validateTranscriptFilters(validFilters)

    expect(result.isValid).toBe(true)
  })

  it('should validate empty filters', () => {
    const result = validateTranscriptFilters({})

    expect(result.isValid).toBe(true)
  })
})

describe('validatePredictionRequest', () => {
  it('should validate prediction request', () => {
    const validRequest = {
      clientName: 'Test Client',
      monthsAhead: 6,
      modelType: 'linear' as const,
    }

    const result = validatePredictionRequest(validRequest)

    expect(result.isValid).toBe(true)
  })
})

describe('validateTranscriptArray', () => {
  it('should separate valid and invalid items', () => {
    const data = [
      { clientName: 'Client 1', month: '2024-01', transcriptCount: 100 },
      { clientName: '', month: 'invalid', transcriptCount: -1 },
      { clientName: 'Client 2', month: '2024-02', transcriptCount: 150 },
    ]

    const result = validateTranscriptArray(data)

    expect(result.validItems).toHaveLength(2)
    expect(result.invalidItems).toHaveLength(1)
    expect(result.invalidItems[0].index).toBe(1)
  })
})

describe('findDuplicateTranscripts', () => {
  it('should find duplicate transcripts', () => {
    const transcripts: TranscriptData[] = [
      {
        clientName: 'Client A',
        month: '2024-01',
        year: 2024,
        transcriptCount: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        clientName: 'Client A',
        month: '2024-01',
        year: 2024,
        transcriptCount: 150,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        clientName: 'Client B',
        month: '2024-01',
        year: 2024,
        transcriptCount: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const duplicates = findDuplicateTranscripts(transcripts)

    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].duplicateGroup).toHaveLength(2)
    expect(duplicates[0].key).toBe('client a-2024-01')
  })

  it('should return empty array when no duplicates', () => {
    const transcripts: TranscriptData[] = [
      {
        clientName: 'Client A',
        month: '2024-01',
        year: 2024,
        transcriptCount: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        clientName: 'Client B',
        month: '2024-02',
        year: 2024,
        transcriptCount: 150,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const duplicates = findDuplicateTranscripts(transcripts)

    expect(duplicates).toHaveLength(0)
  })
})

describe('validateBusinessRules', () => {
  const validTranscript: TranscriptData = {
    clientName: 'Test Client',
    month: '2024-01',
    year: 2024,
    transcriptCount: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('should pass valid transcript', () => {
    const result = validateBusinessRules(validTranscript)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should error on negative transcript count', () => {
    const invalidTranscript = { ...validTranscript, transcriptCount: -1 }

    const result = validateBusinessRules(invalidTranscript)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'NEGATIVE_COUNT')).toBe(true)
  })

  it('should warn about unusual date range', () => {
    const oldTranscript = { ...validTranscript, month: '2019-01' }

    const result = validateBusinessRules(oldTranscript)

    expect(result.warnings.some(w => w.code === 'UNUSUAL_DATE_RANGE')).toBe(true)
  })

  it('should warn about generic client names', () => {
    const genericTranscript = { ...validTranscript, clientName: 'Test Client' }

    const result = validateBusinessRules(genericTranscript)

    expect(result.warnings.some(w => w.code === 'GENERIC_CLIENT_NAME')).toBe(true)
  })
})

describe('validateDataForPrediction', () => {
  const sampleTranscripts: TranscriptData[] = [
    {
      clientName: 'Client A',
      month: '2024-01',
      year: 2024,
      transcriptCount: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      clientName: 'Client A',
      month: '2024-02',
      year: 2024,
      transcriptCount: 110,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      clientName: 'Client A',
      month: '2024-03',
      year: 2024,
      transcriptCount: 120,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  it('should validate sufficient data', () => {
    const result = validateDataForPrediction(sampleTranscripts)

    expect(result.isValid).toBe(true)
  })

  it('should error on insufficient data', () => {
    const insufficientData = sampleTranscripts.slice(0, 2)

    const result = validateDataForPrediction(insufficientData)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'INSUFFICIENT_DATA')).toBe(true)
  })

  it('should warn about multiple clients', () => {
    const multiClientData = [
      ...sampleTranscripts,
      {
        clientName: 'Client B',
        month: '2024-01',
        year: 2024,
        transcriptCount: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const result = validateDataForPrediction(multiClientData)

    expect(result.warnings.some(w => w.code === 'MULTIPLE_CLIENTS')).toBe(true)
  })

  it('should warn about non-chronological data', () => {
    const nonChronologicalData = [
      sampleTranscripts[2], // March
      sampleTranscripts[0], // January
      sampleTranscripts[1], // February
    ]

    const result = validateDataForPrediction(nonChronologicalData)

    expect(result.warnings.some(w => w.code === 'NON_CHRONOLOGICAL')).toBe(true)
  })
})

describe('Error Classes', () => {
  it('should create ValidationError correctly', () => {
    const error = new ValidationErrorClass('Test message', 'testField', 'testValue')

    expect(error.name).toBe('ValidationError')
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.field).toBe('testField')
    expect(error.value).toBe('testValue')
    expect(error.timestamp).toBeInstanceOf(Date)
  })

  it('should create AuthenticationError correctly', () => {
    const error = new AuthenticationErrorClass('Auth failed')

    expect(error.name).toBe('AuthenticationError')
    expect(error.code).toBe('AUTH_ERROR')
    expect(error.message).toBe('Auth failed')
  })

  it('should create APIError correctly', () => {
    const error = new APIErrorClass('API failed', 500, '/api/test')

    expect(error.name).toBe('APIError')
    expect(error.code).toBe('API_ERROR')
    expect(error.status).toBe(500)
    expect(error.endpoint).toBe('/api/test')
  })

  it('should create PredictionError correctly', () => {
    const error = new PredictionErrorClass('Prediction failed', 'linear', 10)

    expect(error.name).toBe('PredictionError')
    expect(error.code).toBe('PREDICTION_ERROR')
    expect(error.modelType).toBe('linear')
    expect(error.dataSize).toBe(10)
  })
})

describe('Error Handlers', () => {
  it('should handle ZodError correctly', () => {
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['clientName'],
        message: 'Expected string, received number',
      },
    ])

    const result = handleValidationError(zodError)

    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].field).toBe('clientName')
  })

  it('should handle API errors', () => {
    const error = new Error('Network error')
    const apiError = handleAPIError(error, '/api/test')

    expect(apiError).toBeInstanceOf(APIErrorClass)
    expect(apiError.message).toBe('Network error')
    expect(apiError.endpoint).toBe('/api/test')
  })

  it('should handle prediction errors', () => {
    const error = new Error('Model error')
    const predictionError = handlePredictionError(error, 'linear', 5)

    expect(predictionError).toBeInstanceOf(PredictionErrorClass)
    expect(predictionError.modelType).toBe('linear')
    expect(predictionError.dataSize).toBe(5)
  })
})

describe('safeParseWithDetails', () => {
  it('should return success for valid data', () => {
    const validData = {
      clientName: 'Test Client',
      month: '2024-01',
      transcriptCount: 100,
    }

    const result = safeParseWithDetails(TranscriptSchema, validData)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.errors).toBeUndefined()
  })

  it('should return errors for invalid data', () => {
    const invalidData = { clientName: '' }

    const result = safeParseWithDetails(TranscriptSchema, invalidData)

    expect(result.success).toBe(false)
    expect(result.data).toBeUndefined()
    expect(result.errors).toBeDefined()
    expect(result.errors!.length).toBeGreaterThan(0)
  })
})

describe('formatValidationErrors', () => {
  it('should format errors for display', () => {
    const errors = [
      {
        field: 'clientName',
        message: 'Client name is required',
        value: '',
        code: 'required',
        name: 'ValidationError',
        timestamp: new Date(),
      },
      {
        field: 'form.transcriptCount',
        message: 'Must be positive',
        value: -1,
        code: 'min',
        name: 'ValidationError',
        timestamp: new Date(),
      },
    ]

    const formatted = formatValidationErrors(errors)

    expect(formatted).toHaveLength(2)
    expect(formatted[0]).toBe('ClientName: Client name is required')
    expect(formatted[1]).toBe('TranscriptCount: Must be positive')
  })
})