import { describe, it, expect } from '@jest/globals'
import { DataTransformer, transformRawDataToTranscripts } from '../data-transformers'
import { TranscriptCreate } from '@/lib/validations/schemas'
import type { RawData } from '@/types/transcript'

describe('DataTransformer', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000'

  describe('transformCSVRow', () => {
    it('should transform valid CSV row data', () => {
      const csvRow = {
        client_name: 'Acme Corp',
        date: '2024-01-15',
        transcript_count: '25',
        transcript_type: 'Medical',
        notes: 'Regular batch'
      }

      const result = DataTransformer.transformCSVRow(csvRow, 1, mockUserId)

      expect(result.errors).toHaveLength(0)
      expect(result.data).toEqual({
        clientId: '',
        clientName: 'Acme Corp',
        date: new Date('2024-01-15'),
        transcriptCount: 25,
        transcriptType: 'Medical',
        notes: 'Regular batch',
        createdBy: mockUserId
      })
    })

    it('should handle optional fields', () => {
      const csvRow = {
        client_name: 'Acme Corp',
        date: '2024-01-15',
        transcript_count: '25'
      }

      const result = DataTransformer.transformCSVRow(csvRow, 1, mockUserId)

      expect(result.errors).toHaveLength(0)
      expect(result.data?.transcriptType).toBeUndefined()
      expect(result.data?.notes).toBeUndefined()
    })

    it('should handle different date formats', () => {
      const testCases = [
        { input: '2024-01-15', expected: new Date('2024-01-15') },
        { input: '01/15/2024', expected: new Date('2024-01-15') },
        { input: '01-15-2024', expected: new Date('2024-01-15') },
        { input: '2024/01/15', expected: new Date('2024-01-15') }
      ]

      testCases.forEach(({ input, expected }) => {
        const csvRow = {
          client_name: 'Acme Corp',
          date: input,
          transcript_count: '25'
        }

        const result = DataTransformer.transformCSVRow(csvRow, 1, mockUserId)

        expect(result.errors).toHaveLength(0)
        expect(result.data?.date).toEqual(expected)
      })
    })

    it('should handle invalid date format', () => {
      const csvRow = {
        client_name: 'Acme Corp',
        date: 'invalid-date',
        transcript_count: '25'
      }

      const result = DataTransformer.transformCSVRow(csvRow, 1, mockUserId)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('date')
      expect(result.errors[0].message).toContain('Invalid date format')
      expect(result.data).toBeNull()
    })

    it('should handle invalid transcript count', () => {
      const csvRow = {
        client_name: 'Acme Corp',
        date: '2024-01-15',
        transcript_count: 'invalid-number'
      }

      const result = DataTransformer.transformCSVRow(csvRow, 1, mockUserId)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('transcript_count')
      expect(result.errors[0].message).toContain('Unable to parse number')
      expect(result.data).toBeNull()
    })

    it('should handle negative transcript count', () => {
      const csvRow = {
        client_name: 'Acme Corp',
        date: '2024-01-15',
        transcript_count: '-5'
      }

      const result = DataTransformer.transformCSVRow(csvRow, 1, mockUserId)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('transcript_count')
      expect(result.errors[0].message).toContain('Transcript count must be non-negative')
      expect(result.data).toBeNull()
    })

    it('should handle missing required fields', () => {
      const csvRow = {
        client_name: '',
        date: '2024-01-15',
        transcript_count: '25'
      }

      const result = DataTransformer.transformCSVRow(csvRow, 1, mockUserId)

      expect(result.errors).toHaveLength(1)
      expect(result.data).toBeNull()
    })

    it('should trim whitespace from text fields', () => {
      const csvRow = {
        client_name: '  Acme Corp  ',
        date: '2024-01-15',
        transcript_count: '25',
        transcript_type: '  Medical  ',
        notes: '  Regular batch  '
      }

      const result = DataTransformer.transformCSVRow(csvRow, 1, mockUserId)

      expect(result.errors).toHaveLength(0)
      expect(result.data?.clientName).toBe('Acme Corp')
      expect(result.data?.transcriptType).toBe('Medical')
      expect(result.data?.notes).toBe('Regular batch')
    })
  })

  describe('transformExcelRow', () => {
    it('should transform Excel row with various column names', () => {
      const excelRow = {
        'Client': 'Acme Corp',
        'Date': new Date('2024-01-15'),
        'Transcript Count': 25,
        'Type': 'Medical',
        'Notes': 'Regular batch'
      }

      const result = DataTransformer.transformExcelRow(excelRow, 1, mockUserId)

      expect(result.errors).toHaveLength(0)
      expect(result.data?.clientName).toBe('Acme Corp')
      expect(result.data?.transcriptCount).toBe(25)
    })

    it('should handle Excel date objects', () => {
      const excelRow = {
        'client_name': 'Acme Corp',
        'date': new Date('2024-01-15'),
        'transcript_count': 25
      }

      const result = DataTransformer.transformExcelRow(excelRow, 1, mockUserId)

      expect(result.errors).toHaveLength(0)
      expect(result.data?.date).toEqual(new Date('2024-01-15'))
    })

    it('should map alternative column names', () => {
      const testCases = [
        {
          name: 'client mapping',
          row: {
            'client': 'Test Client',
            'date': new Date('2024-01-15'),
            'transcript count': 25
          }
        },
        {
          name: 'customer mapping',
          row: {
            'customer': 'Test Client',
            'date': new Date('2024-01-15'),
            'count': 25
          }
        },
        {
          name: 'comments mapping',
          row: {
            'client': 'Test Client',
            'date': new Date('2024-01-15'),
            'count': 25,
            'comments': 'Test notes'
          }
        }
      ]

      testCases.forEach(({ name, row }) => {
        const result = DataTransformer.transformExcelRow(row, 1, mockUserId)
        if (result.errors.length > 0) {
          console.log(`Test case "${name}" failed with errors:`, result.errors)
        }
        expect(result.errors).toHaveLength(0)
      })
    })
  })

  describe('validateAndTransformBulkData', () => {
    it('should process multiple valid records', () => {
      const rawData = [
        {
          client_name: 'Acme Corp',
          date: '2024-01-15',
          transcript_count: '25'
        },
        {
          client_name: 'Beta Inc',
          date: '2024-01-16',
          transcript_count: '15'
        }
      ]

      const result = DataTransformer.validateAndTransformBulkData(rawData, mockUserId, 'csv')

      expect(result.validData).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
      expect(result.summary.totalRows).toBe(2)
      expect(result.summary.validRows).toBe(2)
      expect(result.summary.errorRows).toBe(0)
    })

    it('should handle mixed valid and invalid records', () => {
      const rawData = [
        {
          client_name: 'Acme Corp',
          date: '2024-01-15',
          transcript_count: '25'
        },
        {
          client_name: 'Beta Inc',
          date: 'invalid-date',
          transcript_count: '15'
        },
        {
          client_name: 'Gamma LLC',
          date: '2024-01-17',
          transcript_count: 'invalid-count'
        }
      ]

      const result = DataTransformer.validateAndTransformBulkData(rawData, mockUserId, 'csv')

      expect(result.validData).toHaveLength(1)
      expect(result.errors).toHaveLength(2)
      expect(result.summary.totalRows).toBe(3)
      expect(result.summary.validRows).toBe(1)
      expect(result.summary.errorRows).toBe(2)
    })
  })

  describe('generateColumnMappingSuggestions', () => {
    it('should suggest mappings for common column names', () => {
      const headers = ['Client', 'Date', 'Count', 'Type', 'Comments']

      const suggestions = DataTransformer.generateColumnMappingSuggestions(headers)

      expect(suggestions['Client']).toBe('client_name')
      expect(suggestions['Date']).toBe('date')
      expect(suggestions['Count']).toBe('transcript_count')
      expect(suggestions['Type']).toBe('transcript_type')
      expect(suggestions['Comments']).toBe('notes')
    })

    it('should handle case-insensitive matching', () => {
      const headers = ['CLIENT NAME', 'transcript count', 'Notes']

      const suggestions = DataTransformer.generateColumnMappingSuggestions(headers)

      expect(suggestions['CLIENT NAME']).toBe('client_name')
      expect(suggestions['transcript count']).toBe('transcript_count')
      expect(suggestions['Notes']).toBe('notes')
    })

    it('should not suggest mappings for unrecognized headers', () => {
      const headers = ['Unknown Column', 'Random Field']

      const suggestions = DataTransformer.generateColumnMappingSuggestions(headers)

      expect(suggestions['Unknown Column']).toBeUndefined()
      expect(suggestions['Random Field']).toBeUndefined()
    })
  })

  describe('validateFileStructure', () => {
    it('should validate file with all required headers', () => {
      const headers = ['client_name', 'date', 'transcript_count', 'notes']

      const result = DataTransformer.validateFileStructure(headers)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing required fields', () => {
      const headers = ['client_name', 'notes'] // missing date and transcript_count

      const result = DataTransformer.validateFileStructure(headers)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0]).toContain('date')
      expect(result.errors[1]).toContain('transcript_count')
    })

    it('should accept mapped field names', () => {
      const headers = ['Client', 'Date', 'Count'] // These should map to required fields

      const result = DataTransformer.validateFileStructure(headers)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle empty headers', () => {
      const headers: string[] = []

      const result = DataTransformer.validateFileStructure(headers)

      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('empty')
    })
  })

  describe('cleanTextData', () => {
    it('should clean and normalize text', () => {
      const dirtyText = '  Multiple   spaces\n\nand\tlines  '

      const result = DataTransformer.cleanTextData(dirtyText)

      expect(result).toBe('Multiple spaces and lines')
    })

    it('should handle empty or null input', () => {
      expect(DataTransformer.cleanTextData('')).toBe('')
      expect(DataTransformer.cleanTextData(null as any)).toBe('')
      expect(DataTransformer.cleanTextData(undefined as any)).toBe('')
    })

    it('should limit text length', () => {
      const longText = 'a'.repeat(1500)

      const result = DataTransformer.cleanTextData(longText)

      expect(result.length).toBe(1000)
    })
  })

  describe('detectDateFormat', () => {
    it('should detect YYYY-MM-DD format', () => {
      const dates = ['2024-01-15', '2024-02-20', '2024-03-25']

      const format = DataTransformer.detectDateFormat(dates)

      expect(format).toBe('YYYY-MM-DD')
    })

    it('should detect MM/DD/YYYY format', () => {
      const dates = ['01/15/2024', '02/20/2024', '03/25/2024']

      const format = DataTransformer.detectDateFormat(dates)

      expect(format).toBe('MM/DD/YYYY')
    })

    it('should return default format for mixed or unrecognized formats', () => {
      const dates = ['2024-01-15', '02/20/2024', 'invalid-date']

      const format = DataTransformer.detectDateFormat(dates)

      expect(format).toBe('YYYY-MM-DD')
    })

    it('should handle empty date array', () => {
      const dates: string[] = []

      const format = DataTransformer.detectDateFormat(dates)

      expect(format).toBe('YYYY-MM-DD')
    })
  })

  describe('transformRawDataToTranscripts', () => {
    it('should transform raw data using column mapping', async () => {
      const rawData: RawData[] = [
        {
          'Client Name': 'Acme Corp',
          'Date': '2024-01-15',
          'Count': '25',
          'Type': 'Medical',
          'Notes': 'Regular batch'
        },
        {
          'Client Name': 'Beta Inc',
          'Date': '2024-01-16',
          'Count': '15',
          'Type': 'Legal',
          'Notes': 'Urgent processing'
        }
      ]

      const columnMapping = {
        clientName: 'Client Name',
        date: 'Date',
        transcriptCount: 'Count',
        transcriptType: 'Type',
        notes: 'Notes'
      }

      const result = await transformRawDataToTranscripts(rawData, columnMapping)

      expect(result.validData).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
      
      expect(result.validData[0].clientName).toBe('Acme Corp')
      expect(result.validData[0].transcriptCount).toBe(25)
      expect(result.validData[0].transcriptType).toBe('Medical')
      
      expect(result.validData[1].clientName).toBe('Beta Inc')
      expect(result.validData[1].transcriptCount).toBe(15)
    })

    it('should handle missing required fields', async () => {
      const rawData: RawData[] = [
        {
          'Client Name': 'Acme Corp',
          'Date': '2024-01-15'
          // Missing transcript count
        }
      ]

      const columnMapping = {
        clientName: 'Client Name',
        date: 'Date',
        transcriptCount: 'Count' // This column doesn't exist in data
      }

      const result = await transformRawDataToTranscripts(rawData, columnMapping)

      expect(result.validData).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('transcriptCount')
      expect(result.errors[0].message).toBe('Transcript count is required')
    })

    it('should handle invalid date formats', async () => {
      const rawData: RawData[] = [
        {
          'Client Name': 'Acme Corp',
          'Date': 'invalid-date',
          'Count': '25'
        }
      ]

      const columnMapping = {
        clientName: 'Client Name',
        date: 'Date',
        transcriptCount: 'Count'
      }

      const result = await transformRawDataToTranscripts(rawData, columnMapping)

      expect(result.validData).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('date')
      expect(result.errors[0].message).toContain('Invalid date format')
    })

    it('should handle invalid transcript counts', async () => {
      const rawData: RawData[] = [
        {
          'Client Name': 'Acme Corp',
          'Date': '2024-01-15',
          'Count': 'not-a-number'
        }
      ]

      const columnMapping = {
        clientName: 'Client Name',
        date: 'Date',
        transcriptCount: 'Count'
      }

      const result = await transformRawDataToTranscripts(rawData, columnMapping)

      expect(result.validData).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('transcriptCount')
      expect(result.errors[0].message).toContain('Invalid transcript count')
    })

    it('should handle negative transcript counts', async () => {
      const rawData: RawData[] = [
        {
          'Client Name': 'Acme Corp',
          'Date': '2024-01-15',
          'Count': '-5'
        }
      ]

      const columnMapping = {
        clientName: 'Client Name',
        date: 'Date',
        transcriptCount: 'Count'
      }

      const result = await transformRawDataToTranscripts(rawData, columnMapping)

      expect(result.validData).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('transcriptCount')
      expect(result.errors[0].message).toContain('Transcript count must be non-negative')
    })

    it('should handle optional fields correctly', async () => {
      const rawData: RawData[] = [
        {
          'Client Name': 'Acme Corp',
          'Date': '2024-01-15',
          'Count': '25'
          // No optional fields
        }
      ]

      const columnMapping = {
        clientName: 'Client Name',
        date: 'Date',
        transcriptCount: 'Count'
        // No optional field mappings
      }

      const result = await transformRawDataToTranscripts(rawData, columnMapping)

      expect(result.validData).toHaveLength(1)
      expect(result.errors).toHaveLength(0)
      expect(result.validData[0].transcriptType).toBeUndefined()
      expect(result.validData[0].notes).toBeUndefined()
    })

    it('should trim whitespace from text fields', async () => {
      const rawData: RawData[] = [
        {
          'Client Name': '  Acme Corp  ',
          'Date': '2024-01-15',
          'Count': '25',
          'Type': '  Medical  ',
          'Notes': '  Regular batch  '
        }
      ]

      const columnMapping = {
        clientName: 'Client Name',
        date: 'Date',
        transcriptCount: 'Count',
        transcriptType: 'Type',
        notes: 'Notes'
      }

      const result = await transformRawDataToTranscripts(rawData, columnMapping)

      expect(result.validData).toHaveLength(1)
      expect(result.validData[0].clientName).toBe('Acme Corp')
      expect(result.validData[0].transcriptType).toBe('Medical')
      expect(result.validData[0].notes).toBe('Regular batch')
    })

    it('should handle mixed valid and invalid records', async () => {
      const rawData: RawData[] = [
        {
          'Client Name': 'Acme Corp',
          'Date': '2024-01-15',
          'Count': '25'
        },
        {
          'Client Name': 'Beta Inc',
          'Date': 'invalid-date',
          'Count': '15'
        },
        {
          'Client Name': 'Gamma LLC',
          'Date': '2024-01-17',
          'Count': '30'
        }
      ]

      const columnMapping = {
        clientName: 'Client Name',
        date: 'Date',
        transcriptCount: 'Count'
      }

      const result = await transformRawDataToTranscripts(rawData, columnMapping)

      expect(result.validData).toHaveLength(2)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].row).toBe(2) // Second row (1-based indexing)
      expect(result.validData[0].clientName).toBe('Acme Corp')
      expect(result.validData[1].clientName).toBe('Gamma LLC')
    })

    it('should handle empty raw data', async () => {
      const rawData: RawData[] = []
      const columnMapping = {
        clientName: 'Client Name',
        date: 'Date',
        transcriptCount: 'Count'
      }

      const result = await transformRawDataToTranscripts(rawData, columnMapping)

      expect(result.validData).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })
  })
})