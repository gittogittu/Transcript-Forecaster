import { describe, it, expect } from '@jest/globals'
import {
  UserSchema,
  UserUpdateSchema,
  ClientSchema,
  TranscriptSchema,
  TranscriptCreateSchema,
  TranscriptUpdateSchema,
  BulkTranscriptSchema,
  TimePredictionSchema,
  PredictionResultSchema,
  PredictionRequestSchema,
  PerformanceMetricsSchema,
  FileUploadSchema,
  ExportRequestSchema,
  ImportResultSchema,
  CSVTranscriptRowSchema,
  TranscriptQuerySchema,
  ApiResponseSchema,
  PaginatedResponseSchema
} from '../schemas'

describe('User Validation Schemas', () => {
  describe('UserSchema', () => {
    it('should validate a complete user object', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'John Doe',
        image: 'https://example.com/avatar.jpg',
        role: 'admin' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = UserSchema.parse(validUser)
      expect(result).toEqual(validUser)
    })

    it('should apply default role when not provided', () => {
      const userWithoutRole = {
        email: 'test@example.com',
        name: 'John Doe'
      }

      const result = UserSchema.parse(userWithoutRole)
      expect(result.role).toBe('viewer')
    })

    it('should reject invalid email', () => {
      const invalidUser = {
        email: 'invalid-email',
        name: 'John Doe'
      }

      expect(() => UserSchema.parse(invalidUser)).toThrow('Invalid email format')
    })

    it('should reject empty name', () => {
      const invalidUser = {
        email: 'test@example.com',
        name: ''
      }

      expect(() => UserSchema.parse(invalidUser)).toThrow('Name is required')
    })

    it('should reject invalid role', () => {
      const invalidUser = {
        email: 'test@example.com',
        name: 'John Doe',
        role: 'invalid-role'
      }

      expect(() => UserSchema.parse(invalidUser)).toThrow()
    })
  })

  describe('UserUpdateSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        name: 'Updated Name'
      }

      const result = UserUpdateSchema.parse(partialUpdate)
      expect(result.name).toBe('Updated Name')
      expect(result.id).toBeUndefined()
    })
  })
})

describe('Client Validation Schemas', () => {
  describe('ClientSchema', () => {
    it('should validate a complete client object', () => {
      const validClient = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Acme Corp',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = ClientSchema.parse(validClient)
      expect(result).toEqual(validClient)
    })

    it('should reject empty client name', () => {
      const invalidClient = {
        name: ''
      }

      expect(() => ClientSchema.parse(invalidClient)).toThrow('Client name is required')
    })
  })
})

describe('Transcript Validation Schemas', () => {
  describe('TranscriptSchema', () => {
    it('should validate a complete transcript object', () => {
      const validTranscript = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        clientId: '123e4567-e89b-12d3-a456-426614174001',
        clientName: 'Acme Corp',
        date: new Date('2024-01-15'),
        transcriptCount: 25,
        transcriptType: 'Medical',
        notes: 'Regular transcription batch',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: '123e4567-e89b-12d3-a456-426614174002'
      }

      const result = TranscriptSchema.parse(validTranscript)
      expect(result).toEqual(validTranscript)
    })

    it('should reject negative transcript count', () => {
      const invalidTranscript = {
        clientId: '123e4567-e89b-12d3-a456-426614174001',
        clientName: 'Acme Corp',
        date: new Date(),
        transcriptCount: -5,
        createdBy: '123e4567-e89b-12d3-a456-426614174002'
      }

      expect(() => TranscriptSchema.parse(invalidTranscript)).toThrow('Transcript count must be non-negative')
    })

    it('should reject invalid UUID for clientId', () => {
      const invalidTranscript = {
        clientId: 'invalid-uuid',
        clientName: 'Acme Corp',
        date: new Date(),
        transcriptCount: 25,
        createdBy: '123e4567-e89b-12d3-a456-426614174002'
      }

      expect(() => TranscriptSchema.parse(invalidTranscript)).toThrow('Invalid client ID')
    })
  })

  describe('BulkTranscriptSchema', () => {
    it('should validate array of transcripts', () => {
      const validBulkData = [
        {
          clientId: '123e4567-e89b-12d3-a456-426614174001',
          clientName: 'Acme Corp',
          date: new Date(),
          transcriptCount: 25,
          createdBy: '123e4567-e89b-12d3-a456-426614174002'
        },
        {
          clientId: '123e4567-e89b-12d3-a456-426614174003',
          clientName: 'Beta Inc',
          date: new Date(),
          transcriptCount: 15,
          createdBy: '123e4567-e89b-12d3-a456-426614174002'
        }
      ]

      const result = BulkTranscriptSchema.parse(validBulkData)
      expect(result).toHaveLength(2)
    })

    it('should reject empty array', () => {
      expect(() => BulkTranscriptSchema.parse([])).toThrow('At least one record required')
    })
  })
})

describe('Prediction Validation Schemas', () => {
  describe('TimePredictionSchema', () => {
    it('should validate time prediction with confidence interval', () => {
      const validPrediction = {
        date: new Date('2024-02-01'),
        predictedCount: 30,
        confidenceInterval: {
          lower: 25,
          upper: 35
        }
      }

      const result = TimePredictionSchema.parse(validPrediction)
      expect(result).toEqual(validPrediction)
    })

    it('should reject when upper bound is less than lower bound', () => {
      const invalidPrediction = {
        date: new Date(),
        predictedCount: 30,
        confidenceInterval: {
          lower: 35,
          upper: 25
        }
      }

      expect(() => TimePredictionSchema.parse(invalidPrediction)).toThrow('Upper bound must be greater than or equal to lower bound')
    })
  })

  describe('PredictionRequestSchema', () => {
    it('should apply default values', () => {
      const minimalRequest = {}

      const result = PredictionRequestSchema.parse(minimalRequest)
      expect(result.predictionType).toBe('monthly')
      expect(result.periodsAhead).toBe(30)
      expect(result.modelType).toBe('linear')
    })

    it('should reject periods ahead outside valid range', () => {
      const invalidRequest = {
        periodsAhead: 500
      }

      expect(() => PredictionRequestSchema.parse(invalidRequest)).toThrow('Periods ahead must be between 1 and 365')
    })
  })
})

describe('Performance Metrics Validation Schemas', () => {
  describe('PerformanceMetricsSchema', () => {
    it('should validate performance metrics', () => {
      const validMetrics = {
        queriesPerSecond: 150.5,
        modelRuntime: 2.3,
        dataSyncLatency: 0.8,
        errorCount: 2,
        activeUsers: 45,
        memoryUsage: 512.7,
        cpuUsage: 65.2
      }

      const result = PerformanceMetricsSchema.parse(validMetrics)
      expect(result).toEqual(validMetrics)
    })

    it('should reject CPU usage over 100%', () => {
      const invalidMetrics = {
        queriesPerSecond: 150,
        modelRuntime: 2.3,
        dataSyncLatency: 0.8,
        errorCount: 2,
        activeUsers: 45,
        memoryUsage: 512,
        cpuUsage: 150
      }

      expect(() => PerformanceMetricsSchema.parse(invalidMetrics)).toThrow('CPU usage must be between 0 and 100')
    })
  })
})

describe('File Upload Validation Schemas', () => {
  describe('FileUploadSchema', () => {
    it('should validate CSV file upload', () => {
      const csvFile = new File(['test,data'], 'test.csv', { type: 'text/csv' })
      const validUpload = {
        file: csvFile,
        fileType: 'csv' as const,
        hasHeaders: true,
        dateFormat: 'YYYY-MM-DD'
      }

      const result = FileUploadSchema.parse(validUpload)
      expect(result.fileType).toBe('csv')
    })

    it('should apply default values', () => {
      const csvFile = new File(['test,data'], 'test.csv', { type: 'text/csv' })
      const minimalUpload = {
        file: csvFile,
        fileType: 'csv' as const
      }

      const result = FileUploadSchema.parse(minimalUpload)
      expect(result.hasHeaders).toBe(true)
      expect(result.dateFormat).toBe('YYYY-MM-DD')
    })

    it('should reject file extension mismatch', () => {
      const csvFile = new File(['test,data'], 'test.xlsx', { type: 'text/csv' })
      const invalidUpload = {
        file: csvFile,
        fileType: 'csv' as const
      }

      expect(() => FileUploadSchema.parse(invalidUpload)).toThrow('File extension does not match file type')
    })
  })
})

describe('Export Validation Schemas', () => {
  describe('ExportRequestSchema', () => {
    it('should validate export request with date range', () => {
      const validExport = {
        format: 'csv' as const,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        clients: ['123e4567-e89b-12d3-a456-426614174000'],
        includeAnalytics: true
      }

      const result = ExportRequestSchema.parse(validExport)
      expect(result).toEqual(validExport)
    })

    it('should reject invalid date range', () => {
      const invalidExport = {
        format: 'csv' as const,
        dateRange: {
          start: new Date('2024-01-31'),
          end: new Date('2024-01-01')
        }
      }

      expect(() => ExportRequestSchema.parse(invalidExport)).toThrow('End date must be after or equal to start date')
    })
  })
})

describe('CSV Row Validation Schemas', () => {
  describe('CSVTranscriptRowSchema', () => {
    it('should validate CSV row data', () => {
      const validRow = {
        client_name: 'Acme Corp',
        date: '2024-01-15',
        transcript_count: '25',
        transcript_type: 'Medical',
        notes: 'Regular batch'
      }

      const result = CSVTranscriptRowSchema.parse(validRow)
      expect(result).toEqual(validRow)
    })

    it('should allow optional fields to be undefined', () => {
      const minimalRow = {
        client_name: 'Acme Corp',
        date: '2024-01-15',
        transcript_count: '25'
      }

      const result = CSVTranscriptRowSchema.parse(minimalRow)
      expect(result.transcript_type).toBeUndefined()
      expect(result.notes).toBeUndefined()
    })
  })
})

describe('Query Parameter Validation Schemas', () => {
  describe('TranscriptQuerySchema', () => {
    it('should parse and validate query parameters', () => {
      const queryParams = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        page: '2',
        limit: '25'
      }

      const result = TranscriptQuerySchema.parse(queryParams)
      expect(result.page).toBe(2)
      expect(result.limit).toBe(25)
    })

    it('should apply default values for pagination', () => {
      const minimalQuery = {}

      const result = TranscriptQuerySchema.parse(minimalQuery)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(50)
    })

    it('should reject invalid page numbers', () => {
      const invalidQuery = {
        page: '0'
      }

      expect(() => TranscriptQuerySchema.parse(invalidQuery)).toThrow()
    })
  })
})

describe('API Response Validation Schemas', () => {
  describe('ApiResponseSchema', () => {
    it('should validate successful API response', () => {
      const successResponse = {
        success: true,
        data: { id: 1, name: 'Test' },
        message: 'Operation completed successfully'
      }

      const result = ApiResponseSchema.parse(successResponse)
      expect(result).toEqual(successResponse)
    })

    it('should validate error API response', () => {
      const errorResponse = {
        success: false,
        error: 'Validation failed'
      }

      const result = ApiResponseSchema.parse(errorResponse)
      expect(result).toEqual(errorResponse)
    })
  })

  describe('PaginatedResponseSchema', () => {
    it('should validate paginated response', () => {
      const paginatedResponse = {
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        pagination: {
          page: 1,
          limit: 50,
          total: 100,
          totalPages: 2
        }
      }

      const result = PaginatedResponseSchema.parse(paginatedResponse)
      expect(result).toEqual(paginatedResponse)
    })
  })
})

describe('Import Result Validation Schemas', () => {
  describe('ImportResultSchema', () => {
    it('should validate import result', () => {
      const validResult = {
        totalRows: 100,
        successCount: 95,
        errorCount: 3,
        duplicateCount: 2,
        errors: [
          {
            row: 5,
            field: 'date',
            value: 'invalid-date',
            message: 'Invalid date format'
          }
        ]
      }

      const result = ImportResultSchema.parse(validResult)
      expect(result).toEqual(validResult)
    })

    it('should reject when counts do not sum to total', () => {
      const invalidResult = {
        totalRows: 100,
        successCount: 50,
        errorCount: 20,
        duplicateCount: 20, // 50 + 20 + 20 = 90, not 100
        errors: []
      }

      expect(() => ImportResultSchema.parse(invalidResult)).toThrow('Success, error, and duplicate counts must sum to total rows')
    })
  })
})