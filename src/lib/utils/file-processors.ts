import * as XLSX from 'xlsx'
import { RawData, ValidationResult } from '@/types/transcript'

export class FileProcessor {
  /**
   * Process CSV file and extract data
   */
  static async processCSV(file: File, hasHeaders: boolean = true): Promise<{
    headers: string[]
    data: RawData[]
    errors: string[]
  }> {
    const errors: string[] = []
    
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim().length > 0)
      
      if (lines.length === 0) {
        return {
          headers: [],
          data: [],
          errors: ['File is empty']
        }
      }
      
      // Parse CSV manually to handle various formats
      const rows = lines.map(line => this.parseCSVLine(line))
      
      let headers: string[]
      let dataRows: string[][]
      
      if (hasHeaders) {
        headers = rows[0] || []
        dataRows = rows.slice(1)
      } else {
        // Generate generic headers if none provided
        const maxColumns = Math.max(...rows.map(row => row.length))
        headers = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`)
        dataRows = rows
      }
      
      // Convert to object format
      const data: RawData[] = dataRows.map((row, index) => {
        const rowData: RawData = {}
        headers.forEach((header, colIndex) => {
          rowData[header] = row[colIndex] || ''
        })
        return rowData
      })
      
      return {
        headers,
        data,
        errors
      }
    } catch (error) {
      return {
        headers: [],
        data: [],
        errors: [`Failed to process CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }
  
  /**
   * Process Excel file and extract data
   */
  static async processExcel(file: File, hasHeaders: boolean = true): Promise<{
    headers: string[]
    data: RawData[]
    errors: string[]
    sheets: string[]
  }> {
    const errors: string[] = []
    
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      if (workbook.SheetNames.length === 0) {
        return {
          headers: [],
          data: [],
          errors: ['No sheets found in Excel file'],
          sheets: []
        }
      }
      
      // Use the first sheet by default
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      if (!worksheet) {
        return {
          headers: [],
          data: [],
          errors: [`Sheet '${sheetName}' not found`],
          sheets: workbook.SheetNames
        }
      }
      
      // Convert sheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, // Return array of arrays
        defval: '' // Default value for empty cells
      }) as any[][]
      
      if (jsonData.length === 0) {
        return {
          headers: [],
          data: [],
          errors: ['Sheet is empty'],
          sheets: workbook.SheetNames
        }
      }
      
      let headers: string[]
      let dataRows: any[][]
      
      if (hasHeaders) {
        headers = (jsonData[0] || []).map(h => String(h).trim())
        dataRows = jsonData.slice(1)
      } else {
        // Generate generic headers
        const maxColumns = Math.max(...jsonData.map(row => row.length))
        headers = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`)
        dataRows = jsonData
      }
      
      // Convert to object format
      const data: RawData[] = dataRows.map(row => {
        const rowData: RawData = {}
        headers.forEach((header, colIndex) => {
          const cellValue = row[colIndex]
          
          // Handle different Excel data types
          if (cellValue instanceof Date) {
            rowData[header] = cellValue
          } else if (typeof cellValue === 'number') {
            rowData[header] = cellValue
          } else {
            rowData[header] = String(cellValue || '').trim()
          }
        })
        return rowData
      })
      
      return {
        headers,
        data,
        errors,
        sheets: workbook.SheetNames
      }
    } catch (error) {
      return {
        headers: [],
        data: [],
        errors: [`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        sheets: []
      }
    }
  }
  
  /**
   * Process Excel file from specific sheet
   */
  static async processExcelSheet(
    file: File, 
    sheetName: string, 
    hasHeaders: boolean = true
  ): Promise<{
    headers: string[]
    data: RawData[]
    errors: string[]
  }> {
    const errors: string[] = []
    
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      if (!workbook.SheetNames.includes(sheetName)) {
        return {
          headers: [],
          data: [],
          errors: [`Sheet '${sheetName}' not found in workbook`]
        }
      }
      
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: ''
      }) as any[][]
      
      if (jsonData.length === 0) {
        return {
          headers: [],
          data: [],
          errors: [`Sheet '${sheetName}' is empty`]
        }
      }
      
      let headers: string[]
      let dataRows: any[][]
      
      if (hasHeaders) {
        headers = (jsonData[0] || []).map(h => String(h).trim())
        dataRows = jsonData.slice(1)
      } else {
        const maxColumns = Math.max(...jsonData.map(row => row.length))
        headers = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`)
        dataRows = jsonData
      }
      
      const data: RawData[] = dataRows.map(row => {
        const rowData: RawData = {}
        headers.forEach((header, colIndex) => {
          const cellValue = row[colIndex]
          
          if (cellValue instanceof Date) {
            rowData[header] = cellValue
          } else if (typeof cellValue === 'number') {
            rowData[header] = cellValue
          } else {
            rowData[header] = String(cellValue || '').trim()
          }
        })
        return rowData
      })
      
      return {
        headers,
        data,
        errors
      }
    } catch (error) {
      return {
        headers: [],
        data: [],
        errors: [`Failed to process sheet '${sheetName}': ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }
  
  /**
   * Validate file before processing
   */
  static validateFile(file: File): ValidationResult {
    const errors: string[] = []
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`)
    }
    
    // Check file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    
    const allowedExtensions = ['.csv', '.xls', '.xlsx']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      errors.push('File type not supported. Please upload CSV or Excel files only.')
    }
    
    // Check file name
    if (file.name.length > 255) {
      errors.push('File name is too long (maximum 255 characters)')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Parse a single CSV line, handling quoted fields and commas
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0
    
    while (i < line.length) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"'
          i += 2
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }
    
    // Add the last field
    result.push(current.trim())
    
    return result
  }
  
  /**
   * Get file type from file object
   */
  static getFileType(file: File): 'csv' | 'excel' | 'unknown' {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (extension === '.csv' || file.type === 'text/csv') {
      return 'csv'
    }
    
    if (extension === '.xlsx' || extension === '.xls' || 
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel') {
      return 'excel'
    }
    
    return 'unknown'
  }
  
  /**
   * Generate sample data preview for import wizard
   */
  static generatePreview(data: RawData[], maxRows: number = 5): RawData[] {
    return data.slice(0, maxRows)
  }
  
  /**
   * Detect data types in columns
   */
  static detectColumnTypes(data: RawData[], headers: string[]): Record<string, 'text' | 'number' | 'date'> {
    const types: Record<string, 'text' | 'number' | 'date'> = {}
    
    for (const header of headers) {
      const values = data.map(row => row[header]).filter(val => val !== '' && val != null)
      
      if (values.length === 0) {
        types[header] = 'text'
        continue
      }
      
      // Check if all values are numbers
      const numberValues = values.filter(val => !isNaN(Number(val)))
      if (numberValues.length === values.length) {
        types[header] = 'number'
        continue
      }
      
      // Check if all values are dates
      const dateValues = values.filter(val => {
        const date = new Date(String(val))
        return !isNaN(date.getTime())
      })
      if (dateValues.length === values.length) {
        types[header] = 'date'
        continue
      }
      
      // Default to text
      types[header] = 'text'
    }
    
    return types
  }
}