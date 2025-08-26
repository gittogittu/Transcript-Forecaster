/**
 * Integration tests for Google Sheets API endpoints
 */

import { NextRequest } from 'next/server'
import { GET as getSyncStatus, POST as postSync } from '../sheets/sync/route'
import { getServerSession } from 'next-auth'
import * as transcriptData from '@/lib/data/transcript-data'
import { getGoogleSheetsService } from '@/lib/services/google-sheets'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/data/transcript-data')
jest.mock('@/lib/services/google-sheets')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockSyncWithGoogleSheets = transcriptData.syncWithGoogleSheets as jest.MockedFunction<typeof transcriptData.syncWithGoogleSheets>
const mockGetGoogleSheetsService = getGoogleSheetsService as jest.MockedFunction<typeof getGoogleSheetsService>

// Mock Google Sheets service
const mockSheetsService = {
  testConnection: jest.fn(),
  fetchTranscripts: jest.fn(),
  addTranscript: jest.fn(),
  updateTranscript: jest.fn(),
  deleteTranscript: jest.fn()
}

const mockSession = {
  user: { id: '1', email: 'test@example.com', name: 'Test User' },
  expires: '2024-12-31'
}

describe('Google Sheets API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession)
    mockGetGoogleSheetsService.mockReturnValue(mockSheetsService as any)
  })

  describe('GET /api/sheets/sync', () => {
    it('should return connection status when connected', async () => {
      mockSheetsService.testConnection.mockResolvedValue({
        success: true,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sheets/sync')
      const response = await getSyncStatus(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.connectionStatus).toBe('connected')
      expect(data.data.sheetsInfo).toBeDefined()
      expect(data.data.sheetsInfo.spreadsheetId).toBeDefined()
      expect(mockSheetsService.testConnection).toHaveBeenCalledTimes(1)
    })

    it('should return disconnected status when connection fails', async () => {
      mockSheetsService.testConnection.mockResolvedValue({
        success: false,
        error: 'Authentication failed'
      })

      const request = new NextRequest('http://localhost:3000/api/sheets/sync')
      const response = await getSyncStatus(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.connectionStatus).toBe('disconnected')
      expect(data.data.error).toBe('Authentication failed')
      expect(data.data.sheetsInfo).toBeNull()
    })

    it('should handle connection errors gracefully', async () => {
      mockSheetsService.testConnection.mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/sheets/sync')
      const response = await getSyncStatus(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.connectionStatus).toBe('error')
      expect(data.data.error).toBe('Network error')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/sheets/sync')
      const response = await getSyncStatus(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should include rate limiting headers', async () => {
      mockSheetsService.testConnection.mockResolvedValue({
        success: true,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sheets/sync')
      const response = await getSyncStatus(request)

      expect(response.headers.has('X-RateLimit-Limit')).toBe(true)
      expect(response.headers.has('X-RateLimit-Remaining')).toBe(true)
      expect(response.headers.has('X-RateLimit-Reset')).toBe(true)
    })
  })

  describe('POST /api/sheets/sync', () => {
    const defaultSyncRequest = {
      forceSync: false,
      direction: 'pull',
      validateData: true
    }

    it('should perform successful synchronization', async () => {
      mockSheetsService.testConnection.mockResolvedValue({
        success: true,
        error: null
      })
      
      mockSyncWithGoogleSheets.mockResolvedValue({
        recordsProcessed: 100,
        recordsAdded: 10,
        recordsUpdated: 5,
        recordsSkipped: 2,
        errors: [],
        warnings: []
      })

      const request = new NextRequest('http://localhost:3000/api/sheets/sync', {
        method: 'POST',
        body: JSON.stringify(defaultSyncRequest),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postSync(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Synchronization completed successfully')
      expect(data.data.syncStatus).toBe('completed')
      expect(data.data.recordsProcessed).toBe(100)
      expect(data.data.recordsAdded).toBe(10)
      expect(data.data.recordsUpdated).toBe(5)
      expect(data.data.recordsSkipped).toBe(2)
      expect(data.data.direction).toBe('pull')
      expect(mockSyncWithGoogleSheets).toHaveBeenCalledWith(defaultSyncRequest)
    })

    it('should handle sync with custom parameters', async () => {
      const customSyncRequest = {
        forceSync: true,
        direction: 'bidirectional',
        validateData: false
      }

      mockSheetsService.testConnection.mockResolvedValue({
        success: true,
        error: null
      })
      
      mockSyncWithGoogleSheets.mockResolvedValue({
        recordsProcessed: 50,
        recordsAdded: 0,
        recordsUpdated: 25,
        recordsSkipped: 0,
        errors: [],
        warnings: ['Some data validation warnings']
      })

      const request = new NextRequest('http://localhost:3000/api/sheets/sync', {
        method: 'POST',
        body: JSON.stringify(customSyncRequest),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postSync(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.direction).toBe('bidirectional')
      expect(data.data.warnings).toHaveLength(1)
      expect(mockSyncWithGoogleSheets).toHaveBeenCalledWith(customSyncRequest)
    })

    it('should handle empty request body with defaults', async () => {
      mockSheetsService.testConnection.mockResolvedValue({
        success: true,
        error: null
      })
      
      mockSyncWithGoogleSheets.mockResolvedValue({
        recordsProcessed: 0,
        recordsAdded: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors: [],
        warnings: []
      })

      const request = new NextRequest('http://localhost:3000/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postSync(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.direction).toBe('pull') // Default value
      expect(mockSyncWithGoogleSheets).toHaveBeenCalledWith({
        forceSync: false,
        direction: 'pull',
        validateData: true
      })
    })

    it('should return 503 when Google Sheets connection fails', async () => {
      mockSheetsService.testConnection.mockResolvedValue({
        success: false,
        error: 'API quota exceeded'
      })

      const request = new NextRequest('http://localhost:3000/api/sheets/sync', {
        method: 'POST',
        body: JSON.stringify(defaultSyncRequest),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postSync(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('Google Sheets connection failed')
      expect(data.details).toBe('API quota exceeded')
      expect(mockSyncWithGoogleSheets).not.toHaveBeenCalled()
    })

    it('should handle synchronization errors', async () => {
      mockSheetsService.testConnection.mockResolvedValue({
        success: true,
        error: null
      })
      
      mockSyncWithGoogleSheets.mockResolvedValue({
        error: 'Sync operation failed due to data conflicts'
      })

      const request = new NextRequest('http://localhost:3000/api/sheets/sync', {
        method: 'POST',
        body: JSON.stringify(defaultSyncRequest),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postSync(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Synchronization failed')
      expect(data.details).toBe('Sync operation failed due to data conflicts')
    })

    it('should handle sync operation exceptions', async () => {
      mockSheetsService.testConnection.mockResolvedValue({
        success: true,
        error: null
      })
      
      mockSyncWithGoogleSheets.mockRejectedValue(new Error('Unexpected sync error'))

      const request = new NextRequest('http://localhost:3000/api/sheets/sync', {
        method: 'POST',
        body: JSON.stringify(defaultSyncRequest),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postSync(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Synchronization operation failed')
      expect(data.details).toBe('Unexpected sync error')
    })

    it('should validate request parameters', async () => {
      const invalidRequest = {
        forceSync: 'invalid', // Should be boolean
        direction: 'invalid', // Should be enum
        validateData: 'invalid' // Should be boolean
      }

      const request = new NextRequest('http://localhost:3000/api/sheets/sync', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postSync(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
      expect(Array.isArray(data.details)).toBe(true)
    })

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/sheets/sync', {
        method: 'POST',
        body: JSON.stringify(defaultSyncRequest),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postSync(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should enforce strict rate limiting', async () => {
      mockSheetsService.testConnection.mockResolvedValue({
        success: true,
        error: null
      })
      
      mockSyncWithGoogleSheets.mockResolvedValue({
        recordsProcessed: 0,
        recordsAdded: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors: [],
        warnings: []
      })

      // Make multiple sync requests rapidly
      const requests = Array.from({ length: 25 }, () => 
        postSync(new NextRequest('http://localhost:3000/api/sheets/sync', {
          method: 'POST',
          body: JSON.stringify(defaultSyncRequest),
          headers: { 'Content-Type': 'application/json' }
        }))
      )

      const responses = await Promise.all(requests)
      
      // Some should be rate limited due to strict limits
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)

      // Check rate limit headers
      responses.forEach(response => {
        expect(response.headers.has('X-RateLimit-Limit')).toBe(true)
        if (response.status === 429) {
          expect(response.headers.has('Retry-After')).toBe(true)
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/sheets/sync', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postSync(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should handle missing Content-Type header', async () => {
      const request = new NextRequest('http://localhost:3000/api/sheets/sync', {
        method: 'POST',
        body: JSON.stringify({ forceSync: true })
      })

      const response = await postSync(request)
      
      // Should still work as Next.js handles JSON parsing
      expect([200, 400, 503]).toContain(response.status)
    })

    it('should handle internal server errors gracefully', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Session service unavailable'))

      const request = new NextRequest('http://localhost:3000/api/sheets/sync')
      const response = await getSyncStatus(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})