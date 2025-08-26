/**
 * Integration tests for analytics API endpoints
 */

import { NextRequest } from 'next/server'
import { GET as getTrends, POST as postTrends } from '../analytics/trends/route'
import { GET as getPredictions, POST as postPredictions } from '../analytics/predictions/route'
import { getServerSession } from 'next-auth'
import * as transcriptData from '@/lib/data/transcript-data'
import { PredictionService } from '@/lib/services/prediction-service'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/data/transcript-data')
jest.mock('@/lib/services/prediction-service')
jest.mock('@/lib/utils/analytics-calculations')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockFetchAllTranscripts = transcriptData.fetchAllTranscripts as jest.MockedFunction<typeof transcriptData.fetchAllTranscripts>

// Mock analytics calculations
const mockCalculateTrendAnalytics = jest.fn()
jest.mock('@/lib/utils/analytics-calculations', () => ({
  calculateTrendAnalytics: mockCalculateTrendAnalytics
}))

// Mock prediction service
const mockPredictionService = {
  generatePredictions: jest.fn()
}
;(PredictionService as jest.MockedClass<typeof PredictionService>).mockImplementation(() => mockPredictionService as any)

// Mock data
const mockTranscriptData = [
  {
    id: '1',
    clientName: 'Client A',
    month: '2024-01',
    year: 2024,
    transcriptCount: 100,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    clientName: 'Client B',
    month: '2024-01',
    year: 2024,
    transcriptCount: 150,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]

const mockTrendAnalytics = {
  trends: [
    {
      period: '2024-01',
      totalTranscripts: 250,
      clientCount: 2,
      averagePerClient: 125
    }
  ],
  summary: {
    totalTranscripts: 250,
    totalClients: 2,
    averageGrowthRate: 0.05,
    periodOverPeriodChange: 0.1
  },
  timeRange: '12m',
  groupBy: 'month'
}

const mockPredictionResult = {
  clientName: 'Client A',
  predictions: [
    {
      month: '2024-02',
      year: 2024,
      predictedCount: 110,
      confidenceInterval: { lower: 95, upper: 125 }
    }
  ],
  confidence: 0.85,
  accuracy: 0.78,
  model: 'linear' as const,
  generatedAt: new Date()
}

const mockSession = {
  user: { id: '1', email: 'test@example.com', name: 'Test User' },
  expires: '2024-12-31'
}

describe('Analytics API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession)
  })

  describe('GET /api/analytics/trends', () => {
    it('should return trend analysis with default parameters', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: mockTranscriptData,
        error: null,
        loading: false
      })
      mockCalculateTrendAnalytics.mockReturnValue(mockTrendAnalytics)

      const request = new NextRequest('http://localhost:3000/api/analytics/trends')
      const response = await getTrends(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockTrendAnalytics)
      expect(mockCalculateTrendAnalytics).toHaveBeenCalledWith(mockTranscriptData, {
        timeRange: '12m',
        groupBy: 'month',
        includeProjections: false
      })
    })

    it('should handle query parameters correctly', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: mockTranscriptData,
        error: null,
        loading: false
      })
      mockCalculateTrendAnalytics.mockReturnValue(mockTrendAnalytics)

      const url = 'http://localhost:3000/api/analytics/trends?clientName=Client A&timeRange=6m&groupBy=quarter'
      const request = new NextRequest(url)
      const response = await getTrends(request)

      expect(response.status).toBe(200)
      expect(mockCalculateTrendAnalytics).toHaveBeenCalledWith(mockTranscriptData, {
        clientName: 'Client A',
        timeRange: '6m',
        groupBy: 'quarter',
        includeProjections: false
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/analytics/trends')
      const response = await getTrends(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle invalid query parameters', async () => {
      const url = 'http://localhost:3000/api/analytics/trends?timeRange=invalid&groupBy=invalid'
      const request = new NextRequest(url)
      const response = await getTrends(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid query parameters')
      expect(data.details).toBeDefined()
    })

    it('should handle empty data gracefully', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: [],
        error: null,
        loading: false
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/trends')
      const response = await getTrends(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.trends).toEqual([])
      expect(data.data.summary.totalTranscripts).toBe(0)
    })
  })

  describe('POST /api/analytics/trends', () => {
    const customTrendRequest = {
      clientName: 'Client A',
      startMonth: '2024-01',
      endMonth: '2024-06',
      groupBy: 'quarter',
      includeProjections: true
    }

    it('should generate custom trend analysis', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: mockTranscriptData,
        error: null,
        loading: false
      })
      mockCalculateTrendAnalytics.mockReturnValue(mockTrendAnalytics)

      const request = new NextRequest('http://localhost:3000/api/analytics/trends', {
        method: 'POST',
        body: JSON.stringify(customTrendRequest),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postTrends(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Custom trend analysis generated successfully')
      expect(mockCalculateTrendAnalytics).toHaveBeenCalledWith(mockTranscriptData, customTrendRequest)
    })

    it('should validate date range', async () => {
      const invalidRequest = {
        startMonth: '2024-06',
        endMonth: '2024-01' // End before start
      }

      const request = new NextRequest('http://localhost:3000/api/analytics/trends', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postTrends(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Start month must be before end month')
    })
  })

  describe('GET /api/analytics/predictions', () => {
    it('should return predictions for all clients', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: mockTranscriptData,
        error: null,
        loading: false
      })
      mockPredictionService.generatePredictions.mockResolvedValue(mockPredictionResult)

      const request = new NextRequest('http://localhost:3000/api/analytics/predictions')
      const response = await getPredictions(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2) // Two clients
      expect(data.metadata.totalClients).toBe(2)
    })

    it('should return predictions for specific client', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: mockTranscriptData,
        error: null,
        loading: false
      })
      mockPredictionService.generatePredictions.mockResolvedValue(mockPredictionResult)

      const url = 'http://localhost:3000/api/analytics/predictions?clientName=Client A&monthsAhead=3'
      const request = new NextRequest(url)
      const response = await getPredictions(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(mockPredictionService.generatePredictions).toHaveBeenCalledWith(
        'Client A',
        mockTranscriptData,
        { monthsAhead: 3, modelType: 'linear' }
      )
    })

    it('should return 400 for insufficient data', async () => {
      const insufficientData = [mockTranscriptData[0]] // Only 1 data point
      mockFetchAllTranscripts.mockResolvedValue({
        data: insufficientData,
        error: null,
        loading: false
      })

      const url = 'http://localhost:3000/api/analytics/predictions?clientName=Client A'
      const request = new NextRequest(url)
      const response = await getPredictions(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Insufficient data')
    })

    it('should handle prediction service errors', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: mockTranscriptData,
        error: null,
        loading: false
      })
      mockPredictionService.generatePredictions.mockRejectedValue(new Error('Model training failed'))

      const url = 'http://localhost:3000/api/analytics/predictions?clientName=Client A'
      const request = new NextRequest(url)
      const response = await getPredictions(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to generate predictions')
    })

    it('should validate query parameters', async () => {
      const url = 'http://localhost:3000/api/analytics/predictions?monthsAhead=50&modelType=invalid'
      const request = new NextRequest(url)
      const response = await getPredictions(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid query parameters')
    })
  })

  describe('POST /api/analytics/predictions', () => {
    const customPredictionRequest = {
      clientName: 'Client A',
      monthsAhead: 12,
      modelType: 'polynomial',
      includeConfidenceIntervals: true,
      includeModelMetrics: true
    }

    it('should generate custom predictions', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: mockTranscriptData,
        error: null,
        loading: false
      })
      mockPredictionService.generatePredictions.mockResolvedValue(mockPredictionResult)

      const request = new NextRequest('http://localhost:3000/api/analytics/predictions', {
        method: 'POST',
        body: JSON.stringify(customPredictionRequest),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postPredictions(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Predictions generated successfully')
      expect(mockPredictionService.generatePredictions).toHaveBeenCalledWith(
        'Client A',
        mockTranscriptData,
        { monthsAhead: 12, modelType: 'polynomial' }
      )
    })

    it('should validate request body', async () => {
      const invalidRequest = {
        monthsAhead: -1, // Invalid
        modelType: 'invalid' // Invalid
      }

      const request = new NextRequest('http://localhost:3000/api/analytics/predictions', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postPredictions(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce strict rate limits on prediction endpoints', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: mockTranscriptData,
        error: null,
        loading: false
      })
      mockPredictionService.generatePredictions.mockResolvedValue(mockPredictionResult)

      // Make multiple prediction requests rapidly
      const requests = Array.from({ length: 10 }, () => 
        getPredictions(new NextRequest('http://localhost:3000/api/analytics/predictions'))
      )

      const responses = await Promise.all(requests)
      
      // Some should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)

      // Check rate limit headers
      responses.forEach(response => {
        expect(response.headers.has('X-RateLimit-Limit')).toBe(true)
      })
    })

    it('should have different rate limits for different endpoints', async () => {
      mockFetchAllTranscripts.mockResolvedValue({
        data: mockTranscriptData,
        error: null,
        loading: false
      })
      mockCalculateTrendAnalytics.mockReturnValue(mockTrendAnalytics)

      const trendRequest = new NextRequest('http://localhost:3000/api/analytics/trends')
      const predictionRequest = new NextRequest('http://localhost:3000/api/analytics/predictions')

      const trendResponse = await getTrends(trendRequest)
      const predictionResponse = await getPredictions(predictionRequest)

      // Both should have rate limit headers but potentially different limits
      expect(trendResponse.headers.get('X-RateLimit-Limit')).toBeDefined()
      expect(predictionResponse.headers.get('X-RateLimit-Limit')).toBeDefined()
      
      // Prediction endpoint should have stricter limits
      const trendLimit = parseInt(trendResponse.headers.get('X-RateLimit-Limit') || '0')
      const predictionLimit = parseInt(predictionResponse.headers.get('X-RateLimit-Limit') || '0')
      
      expect(predictionLimit).toBeLessThan(trendLimit)
    })
  })
})