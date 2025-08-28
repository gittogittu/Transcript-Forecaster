import { describe, it, expect } from '@jest/globals'
import { FileProcessor } from '../file-processors'

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
})