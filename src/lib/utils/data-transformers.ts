import { TranscriptCreate, CSVTranscriptRowSchema } from '@/lib/validations/schemas'
import { RawData, ImportError, ValidationResult } from '@/types/transcript'

export class DataTransformer {
  /**
   * Transform CSV row data to TranscriptCreate format
   */
  static transformCSVRow(
    rowData: Record<string, string>, 
    rowIndex: number,
    createdBy: string
  ): { data: TranscriptCreate | null; errors: ImportError[] } {
    const errors: ImportError[] = []
    
    try {
      // Validate raw CSV data structure
      const validatedRow = CSVTranscriptRowSchema.parse(rowData)
      
      // Parse and validate date
      let parsedDate: Date
      try {
        parsedDate = this.parseDate(validatedRow.date)
      } catch (error) {
        errors.push({
          row: rowIndex,
          field: 'date',
          value: validatedRow.date,
          message: `Invalid date format: ${validatedRow.date}`
        })
        return { data: null, errors }
      }
      
      // Parse and validate transcript count
      let transcriptCount: number
      try {
        transcriptCount = this.parseNumber(validatedRow.transcript_count)
        if (transcriptCount < 0) {
          throw new Error('Transcript count must be non-negative')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `Invalid transcript count: ${validatedRow.transcript_count}`
        errors.push({
          row: rowIndex,
          field: 'transcript_count',
          value: validatedRow.transcript_count,
          message: errorMessage
        })
        return { data: null, errors }
      }
      
      // Create transcript data
      const transcriptData: TranscriptCreate = {
        clientId: '', // Will be resolved by the service layer
        clientName: validatedRow.client_name.trim(),
        date: parsedDate,
        transcriptCount,
        transcriptType: validatedRow.transcript_type?.trim() || undefined,
        notes: validatedRow.notes?.trim() || undefined,
        createdBy
      }
      
      return { data: transcriptData, errors }
    } catch (error) {
      errors.push({
        row: rowIndex,
        field: 'general',
        value: rowData,
        message: error instanceof Error ? error.message : 'Unknown validation error'
      })
      return { data: null, errors }
    }
  }
  
  /**
   * Transform Excel row data to TranscriptCreate format
   */
  static transformExcelRow(
    rowData: Record<string, any>, 
    rowIndex: number,
    createdBy: string
  ): { data: TranscriptCreate | null; errors: ImportError[] } {
    const errors: ImportError[] = []
    
    try {
      // Convert Excel data to string format for consistent processing
      const stringData: Record<string, string> = {}
      
      // Map common Excel column names to expected format
      const columnMapping: Record<string, string> = {
        'client': 'client_name',
        'client name': 'client_name',
        'clientname': 'client_name',
        'client_name': 'client_name',
        'customer': 'client_name',
        'company': 'client_name',
        'date': 'date',
        'transcript count': 'transcript_count',
        'transcriptcount': 'transcript_count',
        'transcript_count': 'transcript_count',
        'count': 'transcript_count',
        'transcripts': 'transcript_count',
        'number': 'transcript_count',
        'type': 'transcript_type',
        'transcript type': 'transcript_type',
        'transcripttype': 'transcript_type',
        'transcript_type': 'transcript_type',
        'category': 'transcript_type',
        'kind': 'transcript_type',
        'notes': 'notes',
        'comments': 'notes',
        'description': 'notes',
        'remarks': 'notes',
        'memo': 'notes'
      }
      
      // Normalize column names and map data
      for (const [key, value] of Object.entries(rowData)) {
        const normalizedKey = key.toLowerCase().trim()
        const mappedKey = columnMapping[normalizedKey] || normalizedKey
        
        if (value !== null && value !== undefined) {
          if (mappedKey === 'date' && value instanceof Date) {
            stringData[mappedKey] = value.toISOString().split('T')[0] // YYYY-MM-DD format
          } else {
            stringData[mappedKey] = String(value).trim()
          }
        }
      }
      
      // Use CSV transformer for consistent processing
      return this.transformCSVRow(stringData, rowIndex, createdBy)
    } catch (error) {
      errors.push({
        row: rowIndex,
        field: 'general',
        value: rowData,
        message: error instanceof Error ? error.message : 'Unknown Excel processing error'
      })
      return { data: null, errors }
    }
  }
  
  /**
   * Parse date from various string formats
   */
  private static parseDate(dateString: string): Date {
    const trimmed = dateString.trim()
    
    // Try common date formats
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    ]
    
    let parsedDate: Date
    
    if (formats[0].test(trimmed)) {
      // YYYY-MM-DD
      parsedDate = new Date(trimmed)
    } else if (formats[1].test(trimmed)) {
      // MM/DD/YYYY
      const [month, day, year] = trimmed.split('/')
      parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    } else if (formats[2].test(trimmed)) {
      // MM-DD-YYYY
      const [month, day, year] = trimmed.split('-')
      parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    } else if (formats[3].test(trimmed)) {
      // YYYY/MM/DD
      const [year, month, day] = trimmed.split('/')
      parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    } else {
      // Try native Date parsing as fallback
      parsedDate = new Date(trimmed)
    }
    
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Unable to parse date: ${dateString}`)
    }
    
    return parsedDate
  }
  
  /**
   * Parse number from string, handling various formats
   */
  private static parseNumber(numberString: string): number {
    const trimmed = numberString.trim()
    
    // Remove common formatting characters
    const cleaned = trimmed.replace(/[,$\s]/g, '')
    
    const parsed = parseFloat(cleaned)
    
    if (isNaN(parsed)) {
      throw new Error(`Unable to parse number: ${numberString}`)
    }
    
    // Ensure it's an integer for transcript counts
    return Math.floor(parsed)
  }
  
  /**
   * Validate and transform bulk data
   */
  static validateAndTransformBulkData(
    rawData: RawData[],
    createdBy: string,
    fileType: 'csv' | 'excel'
  ): {
    validData: TranscriptCreate[]
    errors: ImportError[]
    summary: {
      totalRows: number
      validRows: number
      errorRows: number
    }
  } {
    const validData: TranscriptCreate[] = []
    const allErrors: ImportError[] = []
    
    for (let i = 0; i < rawData.length; i++) {
      const rowIndex = i + 1 // 1-based indexing for user display
      const rowData = rawData[i]
      
      let result: { data: TranscriptCreate | null; errors: ImportError[] }
      
      if (fileType === 'csv') {
        result = this.transformCSVRow(rowData as Record<string, string>, rowIndex, createdBy)
      } else {
        result = this.transformExcelRow(rowData, rowIndex, createdBy)
      }
      
      if (result.data) {
        validData.push(result.data)
      }
      
      allErrors.push(...result.errors)
    }
    
    return {
      validData,
      errors: allErrors,
      summary: {
        totalRows: rawData.length,
        validRows: validData.length,
        errorRows: allErrors.length
      }
    }
  }
  
  /**
   * Generate column mapping suggestions for import wizard
   */
  static generateColumnMappingSuggestions(headers: string[]): Record<string, string> {
    const suggestions: Record<string, string> = {}
    
    const mappings: Record<string, string[]> = {
      'client_name': ['client', 'client name', 'clientname', 'client_name', 'customer', 'company'],
      'date': ['date', 'day', 'timestamp', 'created_date', 'record_date'],
      'transcript_count': ['count', 'transcript count', 'transcriptcount', 'transcript_count', 'transcripts', 'number'],
      'transcript_type': ['type', 'transcript type', 'transcripttype', 'transcript_type', 'category', 'kind'],
      'notes': ['notes', 'comments', 'description', 'remarks', 'memo']
    }
    
    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim()
      
      for (const [targetField, possibleNames] of Object.entries(mappings)) {
        if (possibleNames.includes(normalizedHeader)) {
          suggestions[header] = targetField
          break
        }
      }
    }
    
    return suggestions
  }
  
  /**
   * Validate file structure and headers
   */
  static validateFileStructure(
    headers: string[],
    requiredFields: string[] = ['client_name', 'date', 'transcript_count']
  ): ValidationResult {
    const errors: string[] = []
    
    if (headers.length === 0) {
      errors.push('File appears to be empty or has no headers')
      return { isValid: false, errors }
    }
    
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim())
    const suggestions = this.generateColumnMappingSuggestions(headers)
    
    for (const requiredField of requiredFields) {
      const hasDirectMatch = normalizedHeaders.includes(requiredField)
      const hasMappedMatch = Object.values(suggestions).includes(requiredField)
      
      if (!hasDirectMatch && !hasMappedMatch) {
        errors.push(`Required field '${requiredField}' not found in file headers`)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Clean and normalize text data
   */
  static cleanTextData(text: string): string {
    if (!text || typeof text !== 'string') {
      return ''
    }
    
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
      .substring(0, 1000) // Limit length to prevent database issues
  }
  
  /**
   * Detect and suggest date format from sample data
   */
  static detectDateFormat(dateStrings: string[]): string {
    const formats = [
      { pattern: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD' },
      { pattern: /^\d{2}\/\d{2}\/\d{4}$/, format: 'MM/DD/YYYY' },
      { pattern: /^\d{2}-\d{2}-\d{4}$/, format: 'MM-DD-YYYY' },
      { pattern: /^\d{4}\/\d{2}\/\d{2}$/, format: 'YYYY/MM/DD' },
    ]
    
    for (const { pattern, format } of formats) {
      const matches = dateStrings.filter(date => pattern.test(date.trim()))
      if (matches.length > dateStrings.length * 0.8) { // 80% match threshold
        return format
      }
    }
    
    return 'YYYY-MM-DD' // Default format
  }
}