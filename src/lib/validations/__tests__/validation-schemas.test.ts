/**
 * Unit tests for validation schemas
 */

import {
  TranscriptSchema,
  CreateTranscriptSchema,
  UpdateTranscriptSchema,
  TranscriptFiltersSchema,
  PredictionRequestSchema,
  TranscriptDataSchema,
  MonthlyPredictionSchema,
  PredictionResultSchema,
  SheetsRowSchema,
  BulkTranscriptSchema,
  ValidationErrorSchema,
  ValidationResultSchema,
} from '../index'

describe('TranscriptSchema', () => {
  const validTranscriptData = {
    clientName: 'Test Client',
    month: '2024-01',
    transcriptCount: 100,
    notes: 'Test notes',
  }

  it('should validate correct transcript data', () => {
    expect(() => TranscriptSchema.parse(validTranscriptData)).not.toThrow()
  })

  it('should require client name', () => {
    const invalidData = { ...validTranscriptData, clientName: '' }
    expect(() => TranscriptSchema.parse(invalidData)).toThrow('Client name is required')
  })

  it('should validate client name length', () => {
    const invalidData = { ...validTranscriptData, clientName: 'a'.repeat(101) }
    expect(() => TranscriptSchema.parse(invalidData)).toThrow('Client name must be less than 100 characters')
  })

  it('should validate month format', () => {
    const invalidData = { ...validTranscriptData, month: '2024/01' }
    expect(() => TranscriptSchema.parse(invalidData)).toThrow('Month must be in YYYY-MM format')
  })

  it('should validate month range', () => {
    const invalidData = { ...validTranscriptData, month: '2019-01' }
    expect(() => TranscriptSchema.parse(invalidData)).toThrow('Month must be a valid date between 2020-01 and 2030-12')
  })

  it('should validate month number', () => {
    const invalidData = { ...validTranscriptData, month: '2024-13' }
    expect(() => TranscriptSchema.parse(invalidData)).toThrow('Month must be a valid date between 2020-01 and 2030-12')
  })

  it('should require non-negative transcript count', () => {
    const invalidData = { ...validTranscriptData, transcriptCount: -1 }
    expect(() => TranscriptSchema.parse(invalidData)).toThrow('Count must be non-negative')
  })

  it('should validate transcript count is integer', () => {
    const invalidData = { ...validTranscriptData, transcriptCount: 10.5 }
    expect(() => TranscriptSchema.parse(invalidData)).toThrow('Transcript count must be an integer')
  })

  it('should warn about unusually high transcript count', () => {
    const highCountData = { ...validTranscriptData, transcriptCount: 15000 }
    expect(() => TranscriptSchema.parse(highCountData)).toThrow('Count seems unusually high, please verify')
  })

  it('should validate notes length', () => {
    const invalidData = { ...validTranscriptData, notes: 'a'.repeat(501) }
    expect(() => TranscriptSchema.parse(invalidData)).toThrow('Notes must be less than 500 characters')
  })

  it('should trim client name and notes', () => {
    const dataWithSpaces = {
      ...validTranscriptData,
      clientName: '  Test Client  ',
      notes: '  Test notes  ',
    }
    const result = TranscriptSchema.parse(dataWithSpaces)
    expect(result.clientName).toBe('Test Client')
    expect(result.notes).toBe('Test notes')
  })

  it('should make notes optional', () => {
    const dataWithoutNotes = { ...validTranscriptData }
    delete (dataWithoutNotes as any).notes
    expect(() => TranscriptSchema.parse(dataWithoutNotes)).not.toThrow()
  })
})

describe('CreateTranscriptSchema', () => {
  it('should extend TranscriptSchema with optional year', () => {
    const validData = {
      clientName: 'Test Client',
      month: '2024-01',
      transcriptCount: 100,
      year: 2024,
    }
    expect(() => CreateTranscriptSchema.parse(validData)).not.toThrow()
  })

  it('should validate year range', () => {
    const invalidData = {
      clientName: 'Test Client',
      month: '2024-01',
      transcriptCount: 100,
      year: 2019,
    }
    expect(() => CreateTranscriptSchema.parse(invalidData)).toThrow()
  })
})

describe('UpdateTranscriptSchema', () => {
  it('should allow partial updates', () => {
    const partialData = { transcriptCount: 150 }
    expect(() => UpdateTranscriptSchema.parse(partialData)).not.toThrow()
  })

  it('should validate provided fields', () => {
    const invalidData = { transcriptCount: -1 }
    expect(() => UpdateTranscriptSchema.parse(invalidData)).toThrow('Count must be non-negative')
  })
})

describe('TranscriptFiltersSchema', () => {
  it('should validate optional filters', () => {
    const validFilters = {
      clientName: 'Test Client',
      startMonth: '2024-01',
      endMonth: '2024-12',
      minCount: 0,
      maxCount: 1000,
    }
    expect(() => TranscriptFiltersSchema.parse(validFilters)).not.toThrow()
  })

  it('should validate date range order', () => {
    const invalidFilters = {
      startMonth: '2024-12',
      endMonth: '2024-01',
    }
    expect(() => TranscriptFiltersSchema.parse(invalidFilters)).toThrow('Start month must be before or equal to end month')
  })

  it('should validate count range order', () => {
    const invalidFilters = {
      minCount: 100,
      maxCount: 50,
    }
    expect(() => TranscriptFiltersSchema.parse(invalidFilters)).toThrow('Minimum count must be less than or equal to maximum count')
  })

  it('should allow empty filters', () => {
    expect(() => TranscriptFiltersSchema.parse({})).not.toThrow()
  })
})

describe('PredictionRequestSchema', () => {
  it('should validate prediction request with defaults', () => {
    const validRequest = {}
    const result = PredictionRequestSchema.parse(validRequest)
    expect(result.monthsAhead).toBe(6)
    expect(result.modelType).toBe('linear')
  })

  it('should validate months ahead range', () => {
    const invalidRequest = { monthsAhead: 0 }
    expect(() => PredictionRequestSchema.parse(invalidRequest)).toThrow('Must predict at least 1 month ahead')
  })

  it('should validate months ahead maximum', () => {
    const invalidRequest = { monthsAhead: 13 }
    expect(() => PredictionRequestSchema.parse(invalidRequest)).toThrow('Cannot predict more than 12 months ahead')
  })

  it('should validate model type enum', () => {
    const invalidRequest = { modelType: 'invalid' }
    expect(() => PredictionRequestSchema.parse(invalidRequest)).toThrow()
  })
})

describe('TranscriptDataSchema', () => {
  it('should validate complete transcript data with dates', () => {
    const validData = {
      id: 'test-id',
      clientName: 'Test Client',
      month: '2024-01',
      year: 2024,
      transcriptCount: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: 'Test notes',
    }
    expect(() => TranscriptDataSchema.parse(validData)).not.toThrow()
  })
})

describe('MonthlyPredictionSchema', () => {
  it('should validate monthly prediction structure', () => {
    const validPrediction = {
      month: '2024-01',
      year: 2024,
      predictedCount: 100,
      confidenceInterval: {
        lower: 80,
        upper: 120,
      },
    }
    expect(() => MonthlyPredictionSchema.parse(validPrediction)).not.toThrow()
  })

  it('should require non-negative predicted count', () => {
    const invalidPrediction = {
      month: '2024-01',
      year: 2024,
      predictedCount: -10,
      confidenceInterval: { lower: 0, upper: 10 },
    }
    expect(() => MonthlyPredictionSchema.parse(invalidPrediction)).toThrow()
  })
})

describe('PredictionResultSchema', () => {
  it('should validate complete prediction result', () => {
    const validResult = {
      clientName: 'Test Client',
      predictions: [
        {
          month: '2024-01',
          year: 2024,
          predictedCount: 100,
          confidenceInterval: { lower: 80, upper: 120 },
        },
      ],
      confidence: 0.85,
      accuracy: 0.92,
      model: 'linear' as const,
      generatedAt: new Date(),
    }
    expect(() => PredictionResultSchema.parse(validResult)).not.toThrow()
  })

  it('should validate confidence range', () => {
    const invalidResult = {
      clientName: 'Test Client',
      predictions: [],
      confidence: 1.5,
      accuracy: 0.92,
      model: 'linear' as const,
      generatedAt: new Date(),
    }
    expect(() => PredictionResultSchema.parse(invalidResult)).toThrow()
  })
})

describe('SheetsRowSchema', () => {
  it('should validate Google Sheets row format', () => {
    const validRow = {
      clientName: 'Test Client',
      month: '2024-01',
      transcriptCount: 100,
      createdDate: '2024-01-01T00:00:00Z',
      updatedDate: '2024-01-01T00:00:00Z',
      notes: 'Test notes',
    }
    expect(() => SheetsRowSchema.parse(validRow)).not.toThrow()
  })
})

describe('BulkTranscriptSchema', () => {
  it('should validate array of transcripts', () => {
    const validBulk = {
      transcripts: [
        {
          clientName: 'Client 1',
          month: '2024-01',
          transcriptCount: 100,
        },
        {
          clientName: 'Client 2',
          month: '2024-01',
          transcriptCount: 150,
        },
      ],
    }
    expect(() => BulkTranscriptSchema.parse(validBulk)).not.toThrow()
  })

  it('should require at least one transcript', () => {
    const invalidBulk = { transcripts: [] }
    expect(() => BulkTranscriptSchema.parse(invalidBulk)).toThrow('At least one transcript is required')
  })
})

describe('ValidationErrorSchema', () => {
  it('should validate error structure', () => {
    const validError = {
      field: 'clientName',
      message: 'Client name is required',
      value: '',
      code: 'required',
    }
    expect(() => ValidationErrorSchema.parse(validError)).not.toThrow()
  })
})

describe('ValidationResultSchema', () => {
  it('should validate result structure', () => {
    const validResult = {
      isValid: false,
      errors: [
        {
          field: 'clientName',
          message: 'Client name is required',
          value: '',
          code: 'required',
        },
      ],
      warnings: [],
    }
    expect(() => ValidationResultSchema.parse(validResult)).not.toThrow()
  })
})