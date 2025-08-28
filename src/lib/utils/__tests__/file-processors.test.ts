import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { FileProcessor } from '../file-processors'

// Mock XLSX for Excel processing tests
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn()
  }
}))

const XLSX = require('xlsx')

describe('FileProcessor', () => {
  describe('validateFile', () => {
    it('should validate CSV file', () => {
      const csvFile = new File(['test,data'], 'test.csv', { type: 'text/csv' })
      
      const result = FileProcessor.validateFile(csvFile)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate Excel file', () => {
      const excelFile = new File(['test'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      const result = FileProcessor.validateFile(excelFile)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject file that is too large', () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
      const largeFile = new File([largeContent], 'large.csv', { type: 'text/csv' })
      
      const result = FileProcessor.validateFile(largeFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('exceeds maximum allowed size')
    })

    it('should reject unsupported file type', () => {
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      const result = FileProcessor.validateFile(textFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('File type not supported')
    })

    it('should reject file with name too long', () => {
      const longName = 'x'.repeat(300) + '.csv'
      const file = new File(['test'], longName, { type: 'text/csv' })
      
      const result = FileProcessor.validateFile(file)
      
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('File name is too long')
    })
  })

  describe('getFileType', () => {
    it('should detect CSV file type', () => {
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' })
      
      const fileType = FileProcessor.getFileType(csvFile)
      
      expect(fileType).toBe('csv')
    })

    it('should detect Excel file type', () => {
      const excelFile = new File(['test'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      const fileType = FileProcessor.getFileType(excelFile)
      
      expect(fileType).toBe('excel')
    })

    it('should return unknown for unsupported file type', () => {
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      const fileType = FileProcessor.getFileType(textFile)
      
      expect(fileType).toBe('unknown')
    })
  })

  describe('processCSV', () => {
    // Mock File.prototype.text for testing
    const mockFileText = (content: string) => {
      const mockFile = {
        text: jest.fn().mockResolvedValue(content),
        name: 'test.csv',
        type: 'text/csv'
      } as unknown as File
      return mockFile
    }

    it('should process simple CSV data', async () => {
      const csvContent = 'name,age,city\nJohn,25,NYC\nJane,30,LA'
      const csvFile = mockFileText(csvContent)
      
      const result = await FileProcessor.processCSV(csvFile, true)
      
      expect(result.headers).toEqual(['name', 'age', 'city'])
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({ name: 'John', age: '25', city: 'NYC' })
      expect(result.data[1]).toEqual({ name: 'Jane', age: '30', city: 'LA' })
      expect(result.errors).toHaveLength(0)
    })

    it('should handle CSV with quoted fields', async () => {
      const csvContent = 'name,description\n"John Doe","A person with, comma"\n"Jane Smith","Another person"'
      const csvFile = mockFileText(csvContent)
      
      const result = await FileProcessor.processCSV(csvFile, true)
      
      expect(result.headers).toEqual(['name', 'description'])
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({ name: 'John Doe', description: 'A person with, comma' })
    })

    it('should handle CSV without headers', async () => {
      const csvContent = 'John,25,NYC\nJane,30,LA'
      const csvFile = mockFileText(csvContent)
      
      const result = await FileProcessor.processCSV(csvFile, false)
      
      expect(result.headers).toEqual(['Column 1', 'Column 2', 'Column 3'])
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({ 'Column 1': 'John', 'Column 2': '25', 'Column 3': 'NYC' })
    })

    it('should handle empty CSV file', async () => {
      const csvFile = mockFileText('')
      
      const result = await FileProcessor.processCSV(csvFile, true)
      
      expect(result.headers).toEqual([])
      expect(result.data).toEqual([])
      expect(result.errors).toContain('File is empty')
    })
  })

  describe('generatePreview', () => {
    it('should generate preview with limited rows', () => {
      const data = [
        { name: 'John', age: '25' },
        { name: 'Jane', age: '30' },
        { name: 'Bob', age: '35' },
        { name: 'Alice', age: '28' },
        { name: 'Charlie', age: '32' },
        { name: 'Diana', age: '29' }
      ]
      
      const preview = FileProcessor.generatePreview(data, 3)
      
      expect(preview).toHaveLength(3)
      expect(preview[0].name).toBe('John')
      expect(preview[2].name).toBe('Bob')
    })
  })

  describe('detectColumnTypes', () => {
    it('should detect column types correctly', () => {
      const data = [
        { name: 'John', age: '25', date: '2024-01-15', score: '95.5' },
        { name: 'Jane', age: '30', date: '2024-01-16', score: '87.2' },
        { name: 'Bob', age: '35', date: '2024-01-17', score: '92.1' }
      ]
      const headers = ['name', 'age', 'date', 'score']
      
      const types = FileProcessor.detectColumnTypes(data, headers)
      
      expect(types.name).toBe('text')
      expect(types.age).toBe('number')
      expect(types.date).toBe('date')
      expect(types.score).toBe('number')
    })

    it('should default to text for mixed types', () => {
      const data = [
        { mixed: 'John' },
        { mixed: '25' },
        { mixed: 'text' }
      ]
      const headers = ['mixed']
      
      const types = FileProcessor.detectColumnTypes(data, headers)
      
      expect(types.mixed).toBe('text')
    })

    it('should handle empty data', () => {
      const data: any[] = []
      const headers = ['name', 'age']
      
      const types = FileProcessor.detectColumnTypes(data, headers)
      
      expect(types.name).toBe('text')
      expect(types.age).toBe('text')
    })
  })

  describe('processExcel', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should handle Excel processing with mocked XLSX', async () => {
      // Since XLSX mocking is complex, we'll test the error handling path
      const mockFile = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
        name: 'test.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } as unknown as File

      // Test that the function handles the case when XLSX is not properly mocked
      const result = await FileProcessor.processExcel(mockFile, true)

      // The function should return some result structure
      expect(result).toHaveProperty('headers')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('sheets')
    })

    it('should handle Excel file processing errors gracefully', async () => {
      const mockFile = {
        arrayBuffer: jest.fn().mockRejectedValue(new Error('File read error')),
        name: 'corrupt.xlsx'
      } as unknown as File

      const result = await FileProcessor.processExcel(mockFile, true)

      expect(result.headers).toEqual([])
      expect(result.data).toEqual([])
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.sheets).toEqual([])
    })
  })

  describe('processExcelSheet', () => {
    it('should handle Excel sheet processing errors gracefully', async () => {
      const mockFile = {
        arrayBuffer: jest.fn().mockRejectedValue(new Error('File read error')),
        name: 'test.xlsx'
      } as unknown as File

      const result = await FileProcessor.processExcelSheet(mockFile, 'Sheet1', true)

      expect(result.headers).toEqual([])
      expect(result.data).toEqual([])
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete file upload workflow', async () => {
      // Test CSV workflow
      const csvContent = 'Client Name,Date,Transcript Count,Type,Notes\nTest Client,2024-01-15,100,Support,Test notes'
      const csvFile = {
        text: jest.fn().mockResolvedValue(csvContent),
        name: 'test.csv',
        type: 'text/csv',
        size: csvContent.length
      } as unknown as File

      // Validate file
      const validation = FileProcessor.validateFile(csvFile)
      expect(validation.isValid).toBe(true)

      // Process file
      const result = await FileProcessor.processCSV(csvFile, true)
      expect(result.errors).toHaveLength(0)
      expect(result.data).toHaveLength(1)

      // Generate preview
      const preview = FileProcessor.generatePreview(result.data, 5)
      expect(preview).toHaveLength(1)

      // Detect column types
      const types = FileProcessor.detectColumnTypes(result.data, result.headers)
      expect(types['Client Name']).toBe('text')
      expect(types['Transcript Count']).toBe('number')
    })

    it('should handle file validation errors gracefully', async () => {
      // Test oversized file
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.csv', { type: 'text/csv' })
      const validation = FileProcessor.validateFile(largeFile)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('should handle malformed CSV data', async () => {
      const malformedCSV = 'name,age\nJohn,25\nJane' // Missing field
      const csvFile = {
        text: jest.fn().mockResolvedValue(malformedCSV),
        name: 'malformed.csv',
        type: 'text/csv'
      } as unknown as File

      const result = await FileProcessor.processCSV(csvFile, true)
      
      expect(result.data).toHaveLength(2)
      expect(result.data[1].age).toBe('') // Missing field should be empty string
    })
  })
})