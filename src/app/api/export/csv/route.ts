import { NextRequest, NextResponse } from 'next/server'
import { authenticated, getCurrentUser } from '@/lib/middleware/auth'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { performanceMiddleware } from '@/lib/middleware/performance-middleware'
import { exportService, ExportOptions } from '@/lib/services/export-service'
import { getAllTranscripts } from '@/lib/database/transcripts'
import { z } from 'zod'

const ExportRequestSchema = z.object({
  dateRange: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str))
  }).optional(),
  clients: z.array(z.string()).optional(),
  includeAnalytics: z.boolean().default(true),
  includePredictions: z.boolean().default(false)
})

async function handlePOST(request: NextRequest) {
  return performanceMiddleware(request, async () => {
    try {
      const user = await getCurrentUser(request)
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      // Parse and validate request body
      const body = await request.json()
      const validatedData = ExportRequestSchema.parse(body)

      // Fetch transcript data
      const transcriptResult = await getAllTranscripts({
        startDate: validatedData.dateRange?.start,
        endDate: validatedData.dateRange?.end,
        page: 1,
        limit: 10000 // Get all for export
      })

      const transcripts = transcriptResult.data

      // Filter by clients if specified
      let filteredTranscripts = transcripts
      if (validatedData.clients && validatedData.clients.length > 0) {
        filteredTranscripts = transcripts.filter(t => 
          validatedData.clients!.includes(t.clientName)
        )
      }

      // Prepare analytics data
      const analyticsData = {
        transcripts: filteredTranscripts,
        predictions: validatedData.includePredictions ? [] : undefined, // TODO: Fetch predictions
        summary: calculateSummaryStatistics(filteredTranscripts, validatedData.dateRange)
      }

      // Export options
      const exportOptions: ExportOptions = {
        format: 'csv',
        dateRange: validatedData.dateRange,
        clients: validatedData.clients,
        includeAnalytics: validatedData.includeAnalytics,
        includePredictions: validatedData.includePredictions
      }

      // Generate CSV
      const result = await exportService.exportData(analyticsData, exportOptions)

      if (!result.success || !result.data) {
        return NextResponse.json(
          { error: result.error || 'Export failed' },
          { status: 500 }
        )
      }

      // Return CSV data
      return new NextResponse(result.data as string, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${result.filename}"`
        }
      })

    } catch (error) {
      console.error('CSV export error:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

interface TranscriptData {
  id: string
  clientName: string
  date: Date
  transcriptCount: number
  transcriptType?: string
}

function calculateSummaryStatistics(transcripts: TranscriptData[], dateRange?: { start: Date; end: Date }) {
  const totalTranscripts = transcripts.reduce((sum, t) => sum + t.transcriptCount, 0)
  
  // Calculate date range for average calculation
  const dates = transcripts.map(t => new Date(t.date))
  const minDate = dateRange?.start || (dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date())
  const maxDate = dateRange?.end || (dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date())
  const daysDiff = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)))
  
  const averagePerDay = totalTranscripts / daysDiff

  // Find peak day
  const dailyTotals = transcripts.reduce((acc, t) => {
    const dateKey = t.date.toISOString().split('T')[0]
    acc[dateKey] = (acc[dateKey] || 0) + t.transcriptCount
    return acc
  }, {} as Record<string, number>)

  const peakDay = Object.entries(dailyTotals).reduce(
    (peak, [date, count]) => (count as number) > peak.count ? { date, count: count as number } : peak,
    { date: minDate.toISOString().split('T')[0], count: 0 }
  )

  // Client breakdown
  const clientTotals = transcripts.reduce((acc, t) => {
    acc[t.clientName] = (acc[t.clientName] || 0) + t.transcriptCount
    return acc
  }, {} as Record<string, number>)

  const clientBreakdown = Object.entries(clientTotals)
    .map(([client, count]) => ({
      client,
      count: count as number,
      percentage: totalTranscripts > 0 ? ((count as number) / totalTranscripts) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)

  return {
    totalTranscripts,
    averagePerDay,
    peakDay,
    clientBreakdown,
    dateRange: {
      start: minDate.toISOString().split('T')[0],
      end: maxDate.toISOString().split('T')[0]
    }
  }
}

export const POST = withRateLimit(rateLimitConfigs.data, authenticated(handlePOST))