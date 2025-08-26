/**
 * Data transformation utilities for Google Sheets format
 */

import { TranscriptData, TranscriptRow } from '@/types/transcript'
import { TranscriptDataType, SheetsRowSchema } from '@/lib/validations'

/**
 * Transform Google Sheets row data to TranscriptData format
 */
export function transformSheetsRowToTranscriptData(row: string[], rowIndex: number): TranscriptData {
  const [clientName, month, transcriptCount, createdDate, updatedDate, notes] = row

  // Parse the month to extract year
  const [year] = month.split('-').map(Number)

  return {
    id: `sheet-${rowIndex}`,
    clientName: clientName?.trim() || '',
    month: month?.trim() || '',
    year: year || new Date().getFullYear(),
    transcriptCount: parseInt(transcriptCount) || 0,
    createdAt: createdDate ? new Date(createdDate) : new Date(),
    updatedAt: updatedDate ? new Date(updatedDate) : new Date(),
    notes: notes?.trim() || undefined,
  }
}

/**
 * Transform TranscriptData to Google Sheets row format
 */
export function transformTranscriptDataToSheetsRow(data: TranscriptData): string[] {
  return [
    data.clientName,
    data.month,
    data.transcriptCount.toString(),
    data.createdAt.toISOString(),
    data.updatedAt.toISOString(),
    data.notes || '',
  ]
}

/**
 * Transform array of Google Sheets rows to TranscriptData array
 */
export function transformSheetsDataToTranscripts(sheetsData: string[][]): TranscriptData[] {
  if (!sheetsData || sheetsData.length === 0) {
    return []
  }

  // Skip header row if it exists - check if first row contains header-like text
  // Look for exact header matches, not just containing the word "client"
  const firstRowText = sheetsData[0]?.[0]?.toLowerCase().trim()
  const hasHeader = firstRowText === 'client name' || 
                   firstRowText === 'client' ||
                   firstRowText === 'name' ||
                   firstRowText?.startsWith('client name')
  const dataRows = hasHeader ? sheetsData.slice(1) : sheetsData

  return dataRows
    .map((row, index) => {
      try {
        // Only transform rows that have valid data (non-empty client name)
        if (!row[0]?.trim()) {
          return null
        }
        return transformSheetsRowToTranscriptData(row, index + 1)
      } catch (error) {
        console.warn(`Failed to transform row ${index + 1}:`, error)
        return null
      }
    })
    .filter((item): item is TranscriptData => item !== null)
}

/**
 * Transform TranscriptData array to Google Sheets format
 */
export function transformTranscriptsToSheetsData(transcripts: TranscriptData[]): string[][] {
  const header = ['Client Name', 'Month', 'Transcript Count', 'Created Date', 'Updated Date', 'Notes']
  const rows = transcripts.map(transformTranscriptDataToSheetsRow)
  return [header, ...rows]
}

/**
 * Validate and transform Google Sheets row with error handling
 */
export function safeTransformSheetsRow(row: string[], rowIndex: number): {
  data: TranscriptData | null
  errors: string[]
} {
  const errors: string[] = []

  try {
    // Basic validation
    if (!row || row.length < 3) {
      errors.push('Row must have at least 3 columns (Client Name, Month, Transcript Count)')
      return { data: null, errors }
    }

    const [clientName, month, transcriptCount] = row

    // Validate client name
    if (!clientName?.trim()) {
      errors.push('Client name is required')
    }

    // Validate month format
    if (!month?.match(/^\d{4}-\d{2}$/)) {
      errors.push('Month must be in YYYY-MM format')
    }

    // Validate transcript count
    const count = parseInt(transcriptCount)
    if (isNaN(count) || count < 0) {
      errors.push('Transcript count must be a non-negative number')
    }

    if (errors.length > 0) {
      return { data: null, errors }
    }

    const transformedData = transformSheetsRowToTranscriptData(row, rowIndex)
    return { data: transformedData, errors: [] }

  } catch (error) {
    errors.push(`Transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { data: null, errors }
  }
}

/**
 * Batch transform with error collection
 */
export function batchTransformSheetsData(sheetsData: string[][]): {
  data: TranscriptData[]
  errors: Array<{ rowIndex: number; errors: string[] }>
} {
  const data: TranscriptData[] = []
  const errors: Array<{ rowIndex: number; errors: string[] }> = []

  if (!sheetsData || sheetsData.length === 0) {
    return { data, errors }
  }

  // Skip header row if it exists
  const startIndex = sheetsData[0]?.[0]?.toLowerCase().includes('client') ? 1 : 0
  const dataRows = sheetsData.slice(startIndex)

  dataRows.forEach((row, index) => {
    const actualRowIndex = startIndex + index + 1
    const result = safeTransformSheetsRow(row, actualRowIndex)

    if (result.data) {
      data.push(result.data)
    }

    if (result.errors.length > 0) {
      errors.push({
        rowIndex: actualRowIndex,
        errors: result.errors,
      })
    }
  })

  return { data, errors }
}

/**
 * Transform form data to TranscriptData
 */
export function transformFormDataToTranscriptData(
  formData: { clientName: string; month: string; transcriptCount: number; notes?: string }
): Omit<TranscriptData, 'id' | 'createdAt' | 'updatedAt'> {
  const [year] = formData.month.split('-').map(Number)

  return {
    clientName: formData.clientName.trim(),
    month: formData.month,
    year: year,
    transcriptCount: formData.transcriptCount,
    notes: formData.notes?.trim() || undefined,
  }
}

/**
 * Transform TranscriptData to form data
 */
export function transformTranscriptDataToFormData(data: TranscriptData): {
  clientName: string
  month: string
  transcriptCount: number
  notes?: string
} {
  return {
    clientName: data.clientName,
    month: data.month,
    transcriptCount: data.transcriptCount,
    notes: data.notes,
  }
}

/**
 * Normalize client names for consistency
 */
export function normalizeClientName(clientName: string): string {
  return clientName
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s-]/g, ' ') // Replace special characters with spaces (except hyphens)
    .replace(/\s+/g, ' ') // Clean up any double spaces created by replacement
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0) // Remove empty strings
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Validate month format and convert to standard format
 */
export function normalizeMonth(month: string): string {
  const trimmed = month.trim()
  
  // Handle different date formats
  if (trimmed.match(/^\d{4}-\d{2}$/)) {
    return trimmed
  }
  
  if (trimmed.match(/^\d{4}\/\d{2}$/)) {
    return trimmed.replace('/', '-')
  }
  
  if (trimmed.match(/^\d{2}\/\d{4}$/)) {
    const [month, year] = trimmed.split('/')
    return `${year}-${month.padStart(2, '0')}`
  }
  
  throw new Error(`Invalid month format: ${month}. Expected YYYY-MM format.`)
}

/**
 * Calculate derived fields for TranscriptData
 */
export function calculateDerivedFields(data: Partial<TranscriptData>): {
  year?: number
  createdAt?: Date
  updatedAt?: Date
} {
  const derived: { year?: number; createdAt?: Date; updatedAt?: Date } = {}

  if (data.month) {
    const [year] = data.month.split('-').map(Number)
    derived.year = year
  }

  if (!data.createdAt) {
    derived.createdAt = new Date()
  }

  derived.updatedAt = new Date()

  return derived
}

/**
 * Merge transcript data with updates
 */
export function mergeTranscriptData(
  existing: TranscriptData,
  updates: Partial<TranscriptData>
): TranscriptData {
  const merged = { ...existing, ...updates }
  
  // Recalculate derived fields if month changed
  if (updates.month && updates.month !== existing.month) {
    const derived = calculateDerivedFields(merged)
    Object.assign(merged, derived)
  }
  
  // Always update the updatedAt timestamp
  merged.updatedAt = new Date()
  
  return merged
}