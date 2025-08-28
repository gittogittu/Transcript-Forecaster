import { NextRequest } from 'next/server'
import { GET as transcriptsGET, POST as transcriptsPOST } from '../transcripts/route'
import { GET as usersGET, POST as usersPOST } from '../users/route'
import { GET as analyticsGET } from '../analytics/summary/route'
import { POST as uploadPOST } from '../upload/route'
import { getToken } from 'next-auth/jwt'

// Mock NextAuth JWT
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}))

// Mock database functions
jest.mock('@/lib/database/transcripts', () => ({
  getAllTranscripts: jest.fn(),
  createTranscript: jest.fn(),
  bulkCreateTranscripts: jest.fn()
}))

jest.mock('@/lib/database/users', () => ({
  getAllUsers: jest.fn(),
  createUser: jest.fn(),
  hasRole: jest.fn()
}))

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>

describe('API Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Unauthenticated requests', () => {
    beforeEach(() => {
      mockGetToken.mockResolvedValue(null)
    })

    it('should reject unauthenticated GET /api/transcripts', async () => {
      const request = new NextRequest('http://localhost:3000/api/transcripts')
      const response = await transcriptsGET(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should reject unauthenticated POST /api/transcripts', async () => {
      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify({
          clientId: '123e4567-e89b-12d3-a456-426614174000',
          clientName: 'Test Client',
          date: new Date(),
          transcriptCount: 10,
          createdBy: '123e4567-e89b-12d3-a456-426614174001'
        })
      })
      
      const response = await transcriptsPOST(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should reject unauthenticated GET /api/users', async () => {
      const request = new NextRequest('http://localhost:3000/api/users')
      const response = await usersGET(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should reject unauthenticated POST /api/upload', async () => {
      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.csv', { type: 'text/csv' }))
      
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const response = await uploadPOST(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('Role-based authorization', () => {
    it('should allow viewer to read transcripts', async () => {
      mockGetToken.mockResolvedValue({
        role: 'viewer',
        userId: '123e4567-e89b-12d3-a456-426614174001'
      } as any)

      const { getAllTranscripts } = require('@/lib/database/transcripts')
      getAllTranscripts.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
      })

      const request = new NextRequest('http://localhost:3000/api/transcripts')
      const response = await transcriptsGET(request)
      
      expect(response.status).toBe(200)
    })

    it('should reject viewer from creating transcripts', async () => {
      mockGetToken.mockResolvedValue({
        role: 'viewer',
        userId: '123e4567-e89b-12d3-a456-426614174001'
      } as any)

      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify({
          clientId: '123e4567-e89b-12d3-a456-426614174000',
          clientName: 'Test Client',
          date: new Date(),
          transcriptCount: 10,
          createdBy: '123e4567-e89b-12d3-a456-426614174001'
        })
      })
      
      const response = await transcriptsPOST(request)
      
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should allow analyst to create transcripts', async () => {
      mockGetToken.mockResolvedValue({
        role: 'analyst',
        userId: '123e4567-e89b-12d3-a456-426614174001'
      } as any)

      const { createTranscript } = require('@/lib/database/transcripts')
      createTranscript.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174002',
        clientName: 'Test Client',
        date: new Date(),
        transcriptCount: 10
      })

      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify({
          clientId: '123e4567-e89b-12d3-a456-426614174000',
          clientName: 'Test Client',
          date: new Date(),
          transcriptCount: 10
        })
      })
      
      const response = await transcriptsPOST(request)
      
      expect(response.status).toBe(200)
    })

    it('should reject analyst from accessing user management', async () => {
      mockGetToken.mockResolvedValue({
        role: 'analyst',
        userId: '123e4567-e89b-12d3-a456-426614174001'
      } as any)

      const request = new NextRequest('http://localhost:3000/api/users')
      const response = await usersGET(request)
      
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Insufficient permissions')
    })

    it('should allow admin to access user management', async () => {
      mockGetToken.mockResolvedValue({
        role: 'admin',
        userId: '123e4567-e89b-12d3-a456-426614174001'
      } as any)

      const { getAllUsers, hasRole } = require('@/lib/database/users')
      hasRole.mockReturnValue(true)
      getAllUsers.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/users')
      const response = await usersGET(request)
      
      expect(response.status).toBe(200)
    })

    it('should allow admin to create users', async () => {
      mockGetToken.mockResolvedValue({
        role: 'admin',
        userId: '123e4567-e89b-12d3-a456-426614174001'
      } as any)

      const { createUser, hasRole } = require('@/lib/database/users')
      hasRole.mockReturnValue(true)
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
    })
  })

  describe('Analytics access control', () => {
    it('should allow authenticated users to access analytics', async () => {
      mockGetToken.mockResolvedValue({
        role: 'viewer',
        userId: '123e4567-e89b-12d3-a456-426614174001'
      } as any)

      const { getAllTranscripts } = require('@/lib/database/transcripts')
      getAllTranscripts.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10000, total: 0, totalPages: 0 }
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/summary')
      const response = await analyticsGET(request)
      
      expect(response.status).toBe(200)
    })

    it('should reject unauthenticated analytics requests', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/analytics/summary')
      const response = await analyticsGET(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })
  })
})