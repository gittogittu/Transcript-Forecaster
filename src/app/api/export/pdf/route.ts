import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exportService, ExportOptions } from '@/lib/services/export-service'
import { getTranscripts } from '@/lib/database/transcripts'
import { z } from 'zod'

const ExportRequestSchema = z.object({
  dateRange: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str))
  }).optional(),
  clients: z.array(z.string()).optional(),
  includeAnalytics: z.boolean().default(true),
  includePredictions: z.boolean().default(false),
  includeCharts: z.boolean().default(false)
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = ExportRequestSchema.parse(body)

    // Fetch transcript data
    const transcripts = await getTranscripts({
      dateRange: validatedData.dateRange,
      clients: validatedData.clients
    })

    // Prepare analytics data
    const analyticsData = {
      transcripts,
      predictions: validatedData.includePredictions ? [] : undefined, // TODO: Fetch predictions
      summary: calculateSummaryStatistics(transcripts, validatedData.dateRange)
    }

    // Export options
    const exportOptions: ExportOptions = {
      format: 'pdf',
      dateRange: validatedData.dateRange,
      clients: validatedData.clients,
      includeAnalytics: validatedData.includeAnalytics,
      includePredictions: validatedData.includePredictions,
      includeCharts: validatedData.includeCharts
    }

    // Generate PDF
    const result = await exportService.exportData(analyticsData, exportOptions)

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Export failed' },
        { status: 500 }
      )
    }

    // Convert Blob to ArrayBuffer for NextResponse
    const pdfBuffer = await (result.data as Blob).arrayBuffer()

    // Return PDF data
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`
      }
    })

  } catch (error) {
    console.error('PDF export error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateSummaryStatistics(transcripts: any[], dateRange?: { start: Date; end: Date }) {
  const totalTranscripts = transcripts.reduce((sum, t) => sum + t.transcript_count, 0)
  
  // Calculate date range for average calculation
  const dates = transcripts.map(t => new Date(t.date))
  const minDate = dateRange?.start || (dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date())
  const maxDate = dateRange?.end || (dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date())
  const daysDiff = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)))
  
  const averagePerDay = totalTranscripts / daysDiff

  // Find peak day
  const dailyTotals = transcripts.reduce((acc, t) => {
    const dateKey = t.date.toString().split('T')[0]
    acc[dateKey] = (acc[dateKey] || 0) + t.transcript_count
    return acc
  }, {} as Record<string, number>)

  const peakDay = Object.entries(dailyTotals).reduce(
    (peak, [date, count]) => count > peak.count ? { date, count } : peak,
    { date: minDate.toISOString().split('T')[0], count: 0 }
  )

  // Client breakdown
  const clientTotals = transcripts.reduce((acc, t) => {
    acc[t.client_name] = (acc[t.client_name] || 0) + t.transcript_count
    return acc
  }, {} as Record<string, number>)

  const clientBreakdown = Object.entries(clientTotals)
    .map(([client, count]) => ({
      client,
      count,
      percentage: totalTranscripts > 0 ? (count / totalTranscripts) * 100 : 0
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