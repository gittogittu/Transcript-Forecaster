/**
 * Unit tests for data transformation utilities
 */

import {
  transformSheetsRowToTranscriptData,
  transformTranscriptDataToSheetsRow,
  transformSheetsDataToTranscripts,
  transformTranscriptsToSheetsData,
  safeTransformSheetsRow,
  batchTransformSheetsData,
  transformFormDataToTranscriptData,
  transformTranscriptDataToFormData,
  normalizeClientName,
  normalizeMonth,
  calculateDerivedFields,
  mergeTranscriptData,
} from '../data-transformers'
import { TranscriptData } from '@/types/transcript'

describe('transformSheetsRowToTranscriptData', () => {
  it('should transform valid sheets row to transcript data', () => {
    const row = [
      'Test Client',
      '2024-01',
      '100',
      '2024-01-01T00:00:00Z',
      '2024-01-02T00:00:00Z',
      'Test notes',
    ]
    
    const result = transformSheetsRowToTranscriptData(row, 1)
    
    expect(result).toEqual({
      id: 'sheet-1',
      clientName: 'Test Client',
      month: '2024-01',
      year: 2024,
      transcriptCount: 100,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      notes: 'Test notes',
    })
  })

  it('should handle missing optional fields', () => {
    const row = ['Test Client', '2024-01', '100', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z']
    
    const result = transformSheetsRowToTranscriptData(row, 1)
    
    expect(result.notes).toBeUndefined()
  })

  it('should handle invalid transcript count', () => {
    const row = ['Test Client', '2024-01', 'invalid', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z']
    
    const result = transformSheetsRowToTranscriptData(row, 1)
    
    expect(result.transcriptCount).toBe(0)
  })

  it('should trim whitespace from strings', () => {
    const row = [
      '  Test Client  ',
      '  2024-01  ',
      '100',
      '2024-01-01T00:00:00Z',
      '2024-01-02T00:00:00Z',
      '  Test notes  ',
    ]
    
    const result = transformSheetsRowToTranscriptData(row, 1)
    
    expect(result.clientName).toBe('Test Client')
    expect(result.month).toBe('2024-01')
    expect(result.notes).toBe('Test notes')
  })
})

describe('transformTranscriptDataToSheetsRow', () => {
  it('should transform transcript data to sheets row', () => {
    const transcriptData: TranscriptData = {
      id: 'test-id',
      clientName: 'Test Client',
      month: '2024-01',
      year: 2024,
      transcriptCount: 100,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      notes: 'Test notes',
    }
    
    const result = transformTranscriptDataToSheetsRow(transcriptData)
    
    expect(result).toEqual([
      'Test Client',
      '2024-01',
      '100',
      '2024-01-01T00:00:00.000Z',
      '2024-01-02T00:00:00.000Z',
      'Test notes',
    ])
  })

  it('should handle missing notes', () => {
    const transcriptData: TranscriptData = {
      clientName: 'Test Client',
      month: '2024-01',
      year: 2024,
      transcriptCount: 100,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    }
    
    const result = transformTranscriptDataToSheetsRow(transcriptData)
    
    expect(result[5]).toBe('')
  })
})

describe('transformSheetsDataToTranscripts', () => {
  it('should transform sheets data with header', () => {
    const sheetsData = [
      ['Client Name', 'Month', 'Transcript Count', 'Created Date', 'Updated Date', 'Notes'],
      ['Client 1', '2024-01', '100', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z', 'Notes 1'],
      ['Client 2', '2024-02', '150', '2024-02-01T00:00:00Z', '2024-02-02T00:00:00Z', 'Notes 2'],
    ]
    
    const result = transformSheetsDataToTranscripts(sheetsData)
    
    expect(result).toHaveLength(2)
    expect(result[0].clientName).toBe('Client 1')
    expect(result[1].clientName).toBe('Client 2')
  })

  it('should transform sheets data without header', () => {
    const sheetsData = [
      ['Client 1', '2024-01', '100', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z', 'Notes 1'],
      ['Client 2', '2024-02', '150', '2024-02-01T00:00:00Z', '2024-02-02T00:00:00Z', 'Notes 2'],
    ]
    
    const result = transformSheetsDataToTranscripts(sheetsData)
    
    expect(result).toHaveLength(2)
  })

  it('should handle empty data', () => {
    const result = transformSheetsDataToTranscripts([])
    expect(result).toEqual([])
  })

  it('should filter out invalid rows', () => {
    const sheetsData = [
      ['Client 1', '2024-01', '100', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z'],
      ['', '', '', '', ''], // Invalid row
      ['Client 2', '2024-02', '150', '2024-02-01T00:00:00Z', '2024-02-02T00:00:00Z'],
    ]
    
    const result = transformSheetsDataToTranscripts(sheetsData)
    
    expect(result).toHaveLength(2)
    expect(result.every(t => t.clientName !== '')).toBe(true)
  })
})

describe('transformTranscriptsToSheetsData', () => {
  it('should transform transcripts to sheets format with header', () => {
    const transcripts: TranscriptData[] = [
      {
        clientName: 'Client 1',
        month: '2024-01',
        year: 2024,
        transcriptCount: 100,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        notes: 'Notes 1',
      },
    ]
    
    const result = transformTranscriptsToSheetsData(transcripts)
    
    expect(result[0]).toEqual(['Client Name', 'Month', 'Transcript Count', 'Created Date', 'Updated Date', 'Notes'])
    expect(result[1]).toEqual([
      'Client 1',
      '2024-01',
      '100',
      '2024-01-01T00:00:00.000Z',
      '2024-01-02T00:00:00.000Z',
      'Notes 1',
    ])
  })
})

describe('safeTransformSheetsRow', () => {
  it('should return data for valid row', () => {
    const row = ['Test Client', '2024-01', '100', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z']
    
    const result = safeTransformSheetsRow(row, 1)
    
    expect(result.data).toBeTruthy()
    expect(result.errors).toHaveLength(0)
  })

  it('should return errors for invalid row', () => {
    const row = ['', 'invalid-month', '-1']
    
    const result = safeTransformSheetsRow(row, 1)
    
    expect(result.data).toBeNull()
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors).toContain('Client name is required')
    expect(result.errors).toContain('Month must be in YYYY-MM format')
    expect(result.errors).toContain('Transcript count must be a non-negative number')
  })

  it('should return error for insufficient columns', () => {
    const row = ['Client']
    
    const result = safeTransformSheetsRow(row, 1)
    
    expect(result.data).toBeNull()
    expect(result.errors).toContain('Row must have at least 3 columns (Client Name, Month, Transcript Count)')
  })
})

describe('batchTransformSheetsData', () => {
  it('should transform valid data and collect errors', () => {
    const sheetsData = [
      ['Client Name', 'Month', 'Count'], // Header
      ['Client 1', '2024-01', '100'], // Valid
      ['', 'invalid', '-1'], // Invalid
      ['Client 2', '2024-02', '150'], // Valid
    ]
    
    const result = batchTransformSheetsData(sheetsData)
    
    expect(result.data).toHaveLength(2)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].rowIndex).toBe(3)
  })

  it('should handle empty data', () => {
    const result = batchTransformSheetsData([])
    
    expect(result.data).toEqual([])
    expect(result.errors).toEqual([])
  })
})

describe('transformFormDataToTranscriptData', () => {
  it('should transform form data to transcript data', () => {
    const formData = {
      clientName: 'Test Client',
      month: '2024-01',
      transcriptCount: 100,
      notes: 'Test notes',
    }
    
    const result = transformFormDataToTranscriptData(formData)
    
    expect(result).toEqual({
      clientName: 'Test Client',
      month: '2024-01',
      year: 2024,
      transcriptCount: 100,
      notes: 'Test notes',
    })
  })

  it('should trim client name and notes', () => {
    const formData = {
      clientName: '  Test Client  ',
      month: '2024-01',
      transcriptCount: 100,
      notes: '  Test notes  ',
    }
    
    const result = transformFormDataToTranscriptData(formData)
    
    expect(result.clientName).toBe('Test Client')
    expect(result.notes).toBe('Test notes')
  })
})

describe('transformTranscriptDataToFormData', () => {
  it('should transform transcript data to form data', () => {
    const transcriptData: TranscriptData = {
      clientName: 'Test Client',
      month: '2024-01',
      year: 2024,
      transcriptCount: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: 'Test notes',
    }
    
    const result = transformTranscriptDataToFormData(transcriptData)
    
    expect(result).toEqual({
      clientName: 'Test Client',
      month: '2024-01',
      transcriptCount: 100,
      notes: 'Test notes',
    })
  })
})

describe('normalizeClientName', () => {
  it('should normalize client name', () => {
    expect(normalizeClientName('  test client  ')).toBe('Test Client')
    expect(normalizeClientName('TEST CLIENT')).toBe('Test Client')
    expect(normalizeClientName('test-client')).toBe('Test-client')
    expect(normalizeClientName('test  multiple   spaces')).toBe('Test Multiple Spaces')
  })

  it('should remove special characters', () => {
    expect(normalizeClientName('Test@Client!')).toBe('Test Client')
    expect(normalizeClientName('Test#$%Client')).toBe('Test Client')
  })

  it('should preserve hyphens', () => {
    expect(normalizeClientName('test-client')).toBe('Test-client')
  })
})

describe('normalizeMonth', () => {
  it('should handle YYYY-MM format', () => {
    expect(normalizeMonth('2024-01')).toBe('2024-01')
    expect(normalizeMonth('  2024-01  ')).toBe('2024-01')
  })

  it('should convert YYYY/MM format', () => {
    expect(normalizeMonth('2024/01')).toBe('2024-01')
  })

  it('should convert MM/YYYY format', () => {
    expect(normalizeMonth('01/2024')).toBe('2024-01')
  })

  it('should throw error for invalid format', () => {
    expect(() => normalizeMonth('invalid')).toThrow('Invalid month format')
    expect(() => normalizeMonth('2024-1')).toThrow('Invalid month format')
  })
})

describe('calculateDerivedFields', () => {
  it('should calculate year from month', () => {
    const result = calculateDerivedFields({ month: '2024-01' })
    
    expect(result.year).toBe(2024)
    expect(result.createdAt).toBeInstanceOf(Date)
    expect(result.updatedAt).toBeInstanceOf(Date)
  })

  it('should not override existing createdAt', () => {
    const existingDate = new Date('2023-01-01')
    const result = calculateDerivedFields({ 
      month: '2024-01',
      createdAt: existingDate,
    })
    
    expect(result.createdAt).toBeUndefined()
    expect(result.updatedAt).toBeInstanceOf(Date)
  })
})

describe('mergeTranscriptData', () => {
  it('should merge transcript data with updates', () => {
    const existing: TranscriptData = {
      id: 'test-id',
      clientName: 'Old Client',
      month: '2024-01',
      year: 2024,
      transcriptCount: 100,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }
    
    const updates = {
      clientName: 'New Client',
      transcriptCount: 150,
    }
    
    const result = mergeTranscriptData(existing, updates)
    
    expect(result.clientName).toBe('New Client')
    expect(result.transcriptCount).toBe(150)
    expect(result.month).toBe('2024-01') // Unchanged
    expect(result.updatedAt.getTime()).toBeGreaterThan(existing.updatedAt.getTime())
  })

  it('should recalculate derived fields when month changes', () => {
    const existing: TranscriptData = {
      clientName: 'Test Client',
      month: '2024-01',
      year: 2024,
      transcriptCount: 100,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }
    
    const updates = { month: '2025-06' }
    
    const result = mergeTranscriptData(existing, updates)
    
    expect(result.month).toBe('2025-06')
    expect(result.year).toBe(2025)
  })
})