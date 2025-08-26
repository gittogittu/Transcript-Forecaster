import { rest } from 'msw'
import { TranscriptData } from '@/types/transcript'

// Mock data
const mockTranscripts: TranscriptData[] = [
  {
    id: '1',
    clientName: 'Client A',
    month: '2024-01',
    transcriptCount: 150,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    clientName: 'Client B',
    month: '2024-01',
    transcriptCount: 200,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
]

export const handlers = [
  // Transcripts API
  rest.get('/api/transcripts', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: mockTranscripts,
      })
    )
  }),

  rest.post('/api/transcripts', async (req, res, ctx) => {
    const newTranscript = await req.json() as Omit<TranscriptData, 'id' | 'createdAt' | 'updatedAt'>
    const transcript: TranscriptData = {
      ...newTranscript,
      id: String(mockTranscripts.length + 1),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockTranscripts.push(transcript)
    return res(
      ctx.json({
        success: true,
        data: transcript,
      })
    )
  }),

  rest.put('/api/transcripts/:id', async (req, res, ctx) => {
    const { id } = req.params
    const updates = await req.json() as Partial<TranscriptData>
    const index = mockTranscripts.findIndex(t => t.id === id)
    
    if (index === -1) {
      return res(
        ctx.status(404),
        ctx.json({ success: false, error: 'Transcript not found' })
      )
    }

    mockTranscripts[index] = {
      ...mockTranscripts[index],
      ...updates,
      updatedAt: new Date(),
    }

    return res(
      ctx.json({
        success: true,
        data: mockTranscripts[index],
      })
    )
  }),

  rest.delete('/api/transcripts/:id', (req, res, ctx) => {
    const { id } = req.params
    const index = mockTranscripts.findIndex(t => t.id === id)
    
    if (index === -1) {
      return res(
        ctx.status(404),
        ctx.json({ success: false, error: 'Transcript not found' })
      )
    }

    mockTranscripts.splice(index, 1)
    return res(
      ctx.json({
        success: true,
        message: 'Transcript deleted successfully',
      })
    )
  }),

  // Analytics API
  rest.get('/api/analytics/trends', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          trends: mockTranscripts.map(t => ({
            month: t.month,
            clientName: t.clientName,
            count: t.transcriptCount,
          })),
          summary: {
            totalTranscripts: mockTranscripts.reduce((sum, t) => sum + t.transcriptCount, 0),
            totalClients: new Set(mockTranscripts.map(t => t.clientName)).size,
            averagePerMonth: mockTranscripts.reduce((sum, t) => sum + t.transcriptCount, 0) / mockTranscripts.length,
          },
        },
      })
    )
  }),

  rest.get('/api/analytics/predictions', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          predictions: [
            {
              clientName: 'Client A',
              month: '2024-02',
              predictedCount: 160,
              confidenceInterval: { lower: 140, upper: 180 },
            },
            {
              clientName: 'Client B',
              month: '2024-02',
              predictedCount: 210,
              confidenceInterval: { lower: 190, upper: 230 },
            },
          ],
          accuracy: 0.85,
          model: 'linear',
        },
      })
    )
  }),

  rest.post('/api/analytics/predict', async (req, res, ctx) => {
    const body = await req.json() as { clientName?: string; monthsAhead?: number }
    return res(
      ctx.json({
        success: true,
        data: {
          predictions: [
            {
              clientName: body.clientName || 'All Clients',
              month: '2024-02',
              predictedCount: 180,
              confidenceInterval: { lower: 160, upper: 200 },
            },
          ],
          accuracy: 0.82,
          model: 'linear',
        },
      })
    )
  }),

  // Google Sheets API
  rest.get('/api/sheets/sync', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          synced: mockTranscripts.length,
          lastSync: new Date().toISOString(),
        },
      })
    )
  }),

  rest.post('/api/sheets/import', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          imported: 5,
          skipped: 0,
          errors: 0,
        },
      })
    )
  }),

  // Auth API (NextAuth)
  rest.get('/api/auth/session', (req, res, ctx) => {
    return res(
      ctx.json({
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          image: null,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
    )
  }),
]