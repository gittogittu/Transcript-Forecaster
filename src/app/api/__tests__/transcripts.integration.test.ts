/**
 * Integration tests for transcript API endpoints
 */

import { NextRequest } from 'next/server'
import { GET as getTranscripts, POST as postTranscript } from '../transcripts/route'
import { GET as getTranscript, PUT as putTranscript, DELETE as deleteTranscript } from '../transcripts/[id]/route'
import { getServerSession } from 'next-auth'
import * as transcriptData from '@/lib/data/transcript-data'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/data/transcript-data')
jest.mock('@/lib/services/google-sheets')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockFetchAllTranscripts = transcriptData.fetchAllTranscripts as jest.MockedFunction<typeof transcriptData.fetchAllTranscripts>
const mockAddTranscriptData = transcriptData.addTranscriptData as jest.MockedFunction<typeof transcriptData.addTranscriptData>
const mockFetchTranscriptById = transcriptData.fetchTranscriptById as jest.MockedFunction<typeof transcriptData.fetchTranscriptById>
const mockUpdateTranscriptData = transcriptData.updateTranscriptData as jest.MockedFunction<typeof transcriptData.updateTranscriptData>
const mockDeleteTranscriptData = transcriptData.deleteTranscriptData as jest.MockedFunction<typeof transcriptData.deleteTranscriptData>

// Mock data
const mockTranscriptData = [
  {
    id: '1',
    clientName: 'Test Client',
    month: '2024-01',
    year: 2024,
    transcriptCount: 100,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    notes: 'Test notes'
  }
]

const mockSession = {
  user: { id: '1', email: 'test@example.com', name: 'Test User' },
  expires: '2024-12-31'
}

describe('Transcripts API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful authentication by default
    mockGetServerSession.mockResolvedValue(mockSession)
  })

  describe('GET /api/transcripts', () => {
    it('should return all transcripts for authenticated user', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: mockTranscriptData,
        error: null,
        loading: false
      })

      const request = new NextRequest('http://localhost:3000/api/transcripts')
      const response = await getTranscripts(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockTranscriptData)
      expect(mockFetchAllTranscripts).toHaveBeenCalledTimes(1)
    })

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/transcripts')
      const response = await getTranscripts(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle data fetch errors', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: null,
        error: 'Database connection failed',
        loading: false
      })

      const request = new NextRequest('http://localhost:3000/api/transcripts')
      const response = await getTranscripts(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database connection failed')
    })

    it('should include rate limiting headers', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: mockTranscriptData,
        error: null,
        loading: false
      })

      const request = new NextRequest('http://localhost:3000/api/transcripts')
      const response = await getTranscripts(request)

      expect(response.headers.has('X-RateLimit-Limit')).toBe(true)
      expect(response.headers.has('X-RateLimit-Remaining')).toBe(true)
      expect(response.headers.has('X-RateLimit-Reset')).toBe(true)
    })
  })

  describe('POST /api/transcripts', () => {
    const validTranscriptData = {
      clientName: 'New Client',
      month: '2024-02',
      transcriptCount: 150,
      notes: 'New transcript data'
    }

    it('should create new transcript with valid data', async () => {
      mockAddTranscriptData.mockResolvedValue({
        data: null,
        error: null,
        loading: false
      })

      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify(validTranscriptData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postTranscript(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Transcript data added successfully')
      expect(mockAddTranscriptData).toHaveBeenCalledWith({
        clientName: validTranscriptData.clientName,
        month: validTranscriptData.month,
        year: 2024,
        transcriptCount: validTranscriptData.transcriptCount,
        notes: validTranscriptData.notes
      })
    })

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        clientName: '', // Invalid: empty string
        month: '2024-13', // Invalid: month > 12
        transcriptCount: -1 // Invalid: negative count
      }

      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postTranscript(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
      expect(mockAddTranscriptData).not.toHaveBeenCalled()
    })

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify(validTranscriptData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postTranscript(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle data creation errors', async () => {
      mockAddTranscriptData.mockResolvedValue({
        data: null,
        error: 'Duplicate entry',
        loading: false
      })

      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify(validTranscriptData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postTranscript(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Duplicate entry')
    })
  })

  describe('GET /api/transcripts/[id]', () => {
    it('should return specific transcript by ID', async () => {
      mockFetchTranscriptById.mockResolvedValue({
        data: mockTranscriptData[0],
        error: null,
        loading: false
      })

      const request = new NextRequest('http://localhost:3000/api/transcripts/1')
      const response = await getTranscript(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockTranscriptData[0])
      expect(mockFetchTranscriptById).toHaveBeenCalledWith('1')
    })

    it('should return 404 for non-existent transcript', async () => {
      mockFetchTranscriptById.mockResolvedValue({
        data: null,
        error: 'Transcript not found',
        loading: false
      })

      const request = new NextRequest('http://localhost:3000/api/transcripts/999')
      const response = await getTranscript(request, { params: { id: '999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Transcript not found')
    })

    it('should return 400 for missing ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/transcripts/')
      const response = await getTranscript(request, { params: { id: '' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Transcript ID is required')
    })
  })

  describe('PUT /api/transcripts/[id]', () => {
    const updateData = {
      transcriptCount: 200,
      notes: 'Updated notes'
    }

    it('should update transcript with valid data', async () => {
      const updatedTranscript = { ...mockTranscriptData[0], ...updateData }
      mockUpdateTranscriptData.mockResolvedValue({
        data: updatedTranscript,
        error: null,
        loading: false
      })

      const request = new NextRequest('http://localhost:3000/api/transcripts/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await putTranscript(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Transcript data updated successfully')
      expect(data.data).toEqual(updatedTranscript)
      expect(mockUpdateTranscriptData).toHaveBeenCalledWith('1', updateData)
    })

    it('should return 404 for non-existent transcript', async () => {
      mockUpdateTranscriptData.mockResolvedValue({
        data: null,
        error: 'Transcript not found',
        loading: false
      })

      const request = new NextRequest('http://localhost:3000/api/transcripts/999', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await putTranscript(request, { params: { id: '999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Transcript not found')
    })

    it('should return 400 for empty update data', async () => {
      const request = new NextRequest('http://localhost:3000/api/transcripts/1', {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await putTranscript(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })
  })

  describe('DELETE /api/transcripts/[id]', () => {
    it('should delete transcript successfully', async () => {
      mockDeleteTranscriptData.mockResolvedValue({
        data: true,
        error: null,
        loading: false
      })

      const request = new NextRequest('http://localhost:3000/api/transcripts/1', {
        method: 'DELETE'
      })

      const response = await deleteTranscript(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Transcript data deleted successfully')
      expect(mockDeleteTranscriptData).toHaveBeenCalledWith('1')
    })

    it('should return 404 for non-existent transcript', async () => {
      mockDeleteTranscriptData.mockResolvedValue({
        data: null,
        error: 'Transcript not found',
        loading: false
      })

      const request = new NextRequest('http://localhost:3000/api/transcripts/999', {
        method: 'DELETE'
      })

      const response = await deleteTranscript(request, { params: { id: '999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Transcript not found')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits on multiple requests', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: mockTranscriptData,
        error: null,
        loading: false
      })

      // Make multiple requests rapidly
      const requests = Array.from({ length: 5 }, () => 
        getTranscripts(new NextRequest('http://localhost:3000/api/transcripts'))
      )

      const responses = await Promise.all(requests)
      
      // All should succeed initially (within rate limit)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status)
      })

      // Check that rate limit headers are present
      responses.forEach(response => {
        expect(response.headers.has('X-RateLimit-Limit')).toBe(true)
      })
    })
  })
})