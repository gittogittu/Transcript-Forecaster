import { NextRequest } from 'next/server'
import { POST as transcriptsPOST } from '../transcripts/route'
import { POST as usersPOST } from '../users/route'
import { POST as uploadPOST } from '../upload/route'
import { getToken } from 'next-auth/jwt'

// Mock NextAuth JWT
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}))

// Mock database functions
jest.mock('@/lib/database/transcripts', () => ({
  createTranscript: jest.fn(),
  bulkCreateTranscripts: jest.fn()
}))

jest.mock('@/lib/database/users', () => ({
  createUser: jest.fn(),
  hasRole: jest.fn()
}))

// Mock file processor
jest.mock('@/lib/utils/file-processors', () => ({
  FileProcessor: {
    validateFile: jest.fn(),
    getFileType: jest.fn(),
    processCSV: jest.fn(),
    processExcel: jest.fn(),
    generatePreview: jest.fn(),
    detectColumnTypes: jest.fn()
  }
}))

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>

describe('API Validation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authenticated analyst user
    mockGetToken.mockResolvedValue({
      role: 'analyst',
      userId: '123e4567-e89b-12d3-a456-426614174001'
    } as any)
  })

  describe('Transcript validation', () => {
    it('should validate required fields for transcript creation', async () => {
      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
        })
      })
      
      const response = await transcriptsPOST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
    })

    it('should validate transcript count is non-negative', async () => {
      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify({
          clientId: '123e4567-e89b-12d3-a456-426614174000',
          clientName: 'Test Client',
          date: new Date().toISOString(),
          transcriptCount: -5 // Invalid negative count
        })
      })
      
      const response = await transcriptsPOST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Validation failed')
      expect(data.details.some((detail: any) => 
        detail.message.includes('non-negative')
      )).toBe(true)
    })

    it('should validate UUID format for clientId', async () => {
      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'invalid-uuid',
          clientName: 'Test Client',
          date: new Date().toISOString(),
          transcriptCount: 10
        })
      })
      
      const response = await transcriptsPOST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Validation failed')
    })

    it('should validate date format', async () => {
      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify({
          clientId: '123e4567-e89b-12d3-a456-426614174000',
          clientName: 'Test Client',
          date: 'invalid-date',
          transcriptCount: 10
        })
      })
      
      const response = await transcriptsPOST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Validation failed')
    })

    it('should validate bulk transcript creation', async () => {
      const { bulkCreateTranscripts } = require('@/lib/database/transcripts')
      bulkCreateTranscripts.mockResolvedValue([])

      const validTranscripts = [
        {
          clientId: '123e4567-e89b-12d3-a456-426614174000',
          clientName: 'Client 1',
          date: new Date().toISOString(),
          transcriptCount: 10
        },
        {
          clientId: '123e4567-e89b-12d3-a456-426614174001',
          clientName: 'Client 2',
          date: new Date().toISOString(),
          transcriptCount: 15
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify(validTranscripts)
      })
      
      const response = await transcriptsPOST(request)
      
      expect(response.status).toBe(200)
      expect(bulkCreateTranscripts).toHaveBeenCalled()
    })

    it('should reject empty bulk transcript array', async () => {
      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify([]) // Empty array
      })
      
      const response = await transcriptsPOST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Validation failed')
    })
  })

  describe('User validation', () => {
    beforeEach(() => {
      // Mock admin user for user management
      mockGetToken.mockResolvedValue({
        role: 'admin',
        userId: '123e4567-e89b-12d3-a456-426614174001'
      } as any)

      const { hasRole } = require('@/lib/database/users')
      hasRole.mockReturnValue(true)
    })

    it('should validate email format for user creation', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          name: 'Test User',
          role: 'viewer'
        })
      })
      
      const response = await usersPOST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Validation error')
    })

    it('should validate required name field', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          // Missing name
          role: 'viewer'
        })
      })
      
      const response = await usersPOST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Validation error')
    })

    it('should validate role enum values', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          role: 'invalid-role'
        })
      })
      
      const response = await usersPOST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Validation error')
    })

    it('should accept valid user data', async () => {
      const { createUser } = require('@/lib/database/users')
      createUser.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174002',
        email: 'test@example.com',
        name: 'Test User',
        role: 'viewer'
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          role: 'viewer'
        })
      })
      
      const response = await usersPOST(request)
      
      expect(response.status).toBe(201)
      expect(createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        role: 'viewer'
      })
    })
  })

  describe('File upload validation', () => {
    beforeEach(() => {
      const { FileProcessor } = require('@/lib/utils/file-processors')
      
      FileProcessor.validateFile.mockReturnValue({
        isValid: true,
        errors: []
      })
      
      FileProcessor.getFileType.mockReturnValue('csv')
      FileProcessor.processCSV.mockResolvedValue({
        headers: ['client', 'date', 'count'],
        data: [{ client: 'Test', date: '2024-01-01', count: '10' }],
        errors: []
      })
      
      FileProcessor.generatePreview.mockReturnValue([])
      FileProcessor.detectColumnTypes.mockReturnValue({})
    })

    it('should reject requests without file', async () => {
      const formData = new FormData()
      // No file added
      
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const response = await uploadPOST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('No file provided')
    })

    it('should validate file type', async () => {
      const { FileProcessor } = require('@/lib/utils/file-processors')
      
      FileProcessor.validateFile.mockReturnValue({
        isValid: false,
        errors: ['Invalid file type']
      })

      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.txt', { type: 'text/plain' }))
      
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const response = await uploadPOST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('File validation failed')
    })

    it('should process valid CSV file', async () => {
      const formData = new FormData()
      formData.append('file', new File(['client,date,count\nTest,2024-01-01,10'], 'test.csv', { type: 'text/csv' }))
      formData.append('hasHeaders', 'true')
      
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const response = await uploadPOST(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.fileType).toBe('csv')
    })

    it('should handle file processing errors', async () => {
      const { FileProcessor } = require('@/lib/utils/file-processors')
      
      FileProcessor.processCSV.mockResolvedValue({
        headers: [],
        data: [],
        errors: ['Failed to parse CSV']
      })

      const formData = new FormData()
      formData.append('file', new File(['invalid,csv,data'], 'test.csv', { type: 'text/csv' }))
      
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const response = await uploadPOST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('File processing failed')
    })
  })

  describe('JSON parsing validation', () => {
    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: 'invalid json'
      })
      
      const response = await transcriptsPOST(request)
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: ''
      })
      
      const response = await transcriptsPOST(request)
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })
})