import { NextRequest, NextResponse } from 'next/server'
import { authenticated, getCurrentUser } from '@/lib/middleware/auth'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { performanceMiddleware } from '@/lib/middleware/performance-middleware'
import { TranscriptService } from '@/lib/database/transcripts'
import { z } from 'zod'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const ReportRequestSchema = z.object({
  type: z.enum(['analytics', 'aht', 'monthly', 'client', 'custom']),
  dateRange: z.enum(['last-week', 'last-month', 'last-3-months', 'last-quarter', 'last-6-months', 'last-year', 'all']).optional(),
  client: z.string().optional(),
  includeCharts: z.boolean().optional(),
  includeTrends: z.boolean().optional(),
  groupBy: z.enum(['client', 'type', 'day', 'week', 'month']).optional(),
  format: z.enum(['json', 'csv', 'pdf']).optional().default('json')
})

interface GeneratedReport {
  id: string
  name: string
  type: string
  generatedAt: string
  status: 'generating' | 'completed' | 'failed'
  downloadUrl?: string
  size?: string
  metadata?: any
}

/**
 * GET /api/reports - Get existing reports
 */
async function handleGET(request: NextRequest) {
  return performanceMiddleware(request, async () => {
    try {
      const user = await getCurrentUser(request)
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const client = await pool.connect()
      
      try {
        const reportsQuery = `
          SELECT 
            id,
            report_name as name,
            report_type as type,
            created_at as "generatedAt",
            status,
            download_url as "downloadUrl",
            file_size as size,
            metadata
          FROM reports
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 50
        `
        
        const result = await client.query(reportsQuery, [user.userId])
        
        const reports: GeneratedReport[] = result.rows.map(row => ({
          id: row.id,
          name: row.name,
          type: row.type,
          generatedAt: row.generatedAt,
          status: row.status,
          downloadUrl: row.downloadUrl,
          size: row.size,
          metadata: row.metadata
        }))

        return NextResponse.json({
          success: true,
          data: reports
        })

      } finally {
        client.release()
      }

    } catch (error) {
      console.error('Error fetching reports:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

/**
 * POST /api/reports - Generate new report
 */
async function handlePOST(request: NextRequest) {
  return performanceMiddleware(request, async () => {
    try {
      const user = await getCurrentUser(request)
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const body = await request.json()
      const validatedData = ReportRequestSchema.parse(body)

      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const reportName = `${validatedData.type.charAt(0).toUpperCase() + validatedData.type.slice(1)} Report - ${new Date().toLocaleDateString()}`

      const client = await pool.connect()

      try {
        // Insert report record with generating status
        const insertQuery = `
          INSERT INTO reports (
            id, user_id, report_name, report_type, status, 
            metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING *
        `

        await client.query(insertQuery, [
          reportId,
          user.userId,
          reportName,
          validatedData.type,
          'generating',
          JSON.stringify(validatedData)
        ])

        // Generate report data based on type
        const reportData = await generateReportData(validatedData, user.userId)
        
        // Calculate file size (approximate)
        const dataSize = JSON.stringify(reportData).length
        const fileSizeKB = Math.round(dataSize / 1024)
        const fileSize = fileSizeKB > 1024 ? `${Math.round(fileSizeKB / 1024 * 10) / 10} MB` : `${fileSizeKB} KB`

        // Update report with completed status
        const updateQuery = `
          UPDATE reports 
          SET status = $1, download_url = $2, file_size = $3, 
              report_data = $4, updated_at = NOW()
          WHERE id = $5
        `

        const downloadUrl = `/api/reports/${reportId}/download`
        
        await client.query(updateQuery, [
          'completed',
          downloadUrl,
          fileSize,
          JSON.stringify(reportData),
          reportId
        ])

        const report: GeneratedReport = {
          id: reportId,
          name: reportName,
          type: validatedData.type,
          generatedAt: new Date().toISOString(),
          status: 'completed',
          downloadUrl,
          size: fileSize,
          metadata: validatedData
        }

        return NextResponse.json({
          success: true,
          data: report,
          message: `${validatedData.type} report generated successfully`
        })

      } finally {
        client.release()
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        )
      }

      console.error('Error generating report:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

async function generateReportData(config: z.infer<typeof ReportRequestSchema>, userId: string) {
  const transcriptService = new TranscriptService()
  
  // Calculate date range
  let startDate: Date | undefined
  const endDate = new Date()
  
  switch (config.dateRange) {
    case 'last-week':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'last-month':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'last-3-months':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'last-quarter':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'last-6-months':
      startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
      break
    case 'last-year':
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      break
  }

  // Fetch data
  const transcriptData = await transcriptService.getTranscripts({
    startDate,
    endDate,
    clientId: config.client,
    limit: 10000
  })

  // Generate report based on type
  switch (config.type) {
    case 'analytics':
      return generateAnalyticsReport(transcriptData.data, config)
    case 'aht':
      return generateAHTReport(transcriptData.data, config)
    case 'monthly':
      return generateMonthlyReport(transcriptData.data, config)
    case 'client':
      return generateClientReport(transcriptData.data, config)
    case 'custom':
      return generateCustomReport(transcriptData.data, config)
    default:
      throw new Error('Invalid report type')
  }
}

function generateAnalyticsReport(data: any[], config: any) {
  const totalTranscripts = data.reduce((sum, item) => sum + item.transcriptCount, 0)
  const uniqueClients = new Set(data.map(item => item.clientName)).size
  
  // Group by time period
  const timeGroups = groupByTimePeriod(data, 'month')
  
  // Calculate trends
  const trends = calculateTrends(timeGroups)
  
  return {
    summary: {
      totalTranscripts,
      uniqueClients,
      dateRange: config.dateRange,
      generatedAt: new Date().toISOString()
    },
    trends,
    timeGroups,
    clientBreakdown: calculateClientBreakdown(data),
    charts: config.includeCharts ? generateChartData(data) : null
  }
}

function generateAHTReport(data: any[], config: any) {
  // Calculate average handling time metrics
  const ahtData = data.filter(item => item.handlingTimeMinutes)
  const avgAHT = ahtData.length > 0 
    ? ahtData.reduce((sum, item) => sum + item.handlingTimeMinutes, 0) / ahtData.length 
    : 0

  const groupedData = config.groupBy ? groupByField(ahtData, config.groupBy) : null

  return {
    summary: {
      averageAHT: Math.round(avgAHT * 100) / 100,
      totalRecords: ahtData.length,
      dateRange: config.dateRange
    },
    groupedData,
    trends: calculateAHTTrends(ahtData)
  }
}

function generateMonthlyReport(data: any[], config: any) {
  const monthlyData = groupByTimePeriod(data, 'month')
  
  return {
    summary: {
      totalMonths: monthlyData.length,
      totalTranscripts: data.reduce((sum, item) => sum + item.transcriptCount, 0),
      averagePerMonth: monthlyData.length > 0 
        ? Math.round(data.reduce((sum, item) => sum + item.transcriptCount, 0) / monthlyData.length)
        : 0
    },
    monthlyBreakdown: monthlyData,
    trends: calculateTrends(monthlyData)
  }
}

function generateClientReport(data: any[], config: any) {
  const clientData = config.client 
    ? data.filter(item => item.clientName === config.client)
    : data

  const clientBreakdown = calculateClientBreakdown(clientData)
  
  return {
    summary: {
      clientName: config.client || 'All Clients',
      totalTranscripts: clientData.reduce((sum, item) => sum + item.transcriptCount, 0),
      dateRange: config.dateRange
    },
    clientBreakdown,
    timeSeriesData: groupByTimePeriod(clientData, 'month')
  }
}

function generateCustomReport(data: any[], config: any) {
  return {
    summary: {
      totalRecords: data.length,
      customFilters: config,
      generatedAt: new Date().toISOString()
    },
    data: data.slice(0, 1000), // Limit for performance
    aggregations: {
      byClient: calculateClientBreakdown(data),
      byMonth: groupByTimePeriod(data, 'month')
    }
  }
}

// Helper functions
function groupByTimePeriod(data: any[], period: 'day' | 'week' | 'month') {
  const groups: Record<string, any[]> = {}
  
  data.forEach(item => {
    const date = new Date(item.date)
    let key: string
    
    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0]
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
    }
    
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })
  
  return Object.entries(groups).map(([period, items]) => ({
    period,
    count: items.reduce((sum, item) => sum + item.transcriptCount, 0),
    items: items.length
  })).sort((a, b) => a.period.localeCompare(b.period))
}

function calculateClientBreakdown(data: any[]) {
  const clientTotals: Record<string, number> = {}
  const totalTranscripts = data.reduce((sum, item) => sum + item.transcriptCount, 0)
  
  data.forEach(item => {
    clientTotals[item.clientName] = (clientTotals[item.clientName] || 0) + item.transcriptCount
  })
  
  return Object.entries(clientTotals)
    .map(([client, count]) => ({
      client,
      count,
      percentage: totalTranscripts > 0 ? Math.round((count / totalTranscripts) * 100 * 10) / 10 : 0
    }))
    .sort((a, b) => b.count - a.count)
}

function calculateTrends(timeGroups: any[]) {
  if (timeGroups.length < 2) return { trend: 'stable', change: 0 }
  
  const recent = timeGroups.slice(-2)
  const change = recent[1].count - recent[0].count
  const changePercent = recent[0].count > 0 ? (change / recent[0].count) * 100 : 0
  
  return {
    trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
    change: Math.round(changePercent * 10) / 10,
    recentPeriods: recent
  }
}

function calculateAHTTrends(data: any[]) {
  // Group by month and calculate average AHT
  const monthlyAHT = groupByTimePeriod(data, 'month').map(group => ({
    period: group.period,
    avgAHT: group.items > 0 
      ? data.filter(item => {
          const itemMonth = `${new Date(item.date).getFullYear()}-${String(new Date(item.date).getMonth() + 1).padStart(2, '0')}`
          return itemMonth === group.period
        }).reduce((sum, item) => sum + item.handlingTimeMinutes, 0) / group.items
      : 0
  }))
  
  return calculateTrends(monthlyAHT.map(item => ({ ...item, count: item.avgAHT })))
}

function groupByField(data: any[], field: string) {
  const groups: Record<string, any[]> = {}
  
  data.forEach(item => {
    const key = item[field] || 'Unknown'
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })
  
  return Object.entries(groups).map(([key, items]) => ({
    [field]: key,
    count: items.length,
    avgAHT: items.reduce((sum, item) => sum + (item.handlingTimeMinutes || 0), 0) / items.length
  }))
}

function generateChartData(data: any[]) {
  return {
    timeSeriesData: groupByTimePeriod(data, 'month'),
    clientDistribution: calculateClientBreakdown(data),
    typeDistribution: data.reduce((acc: Record<string, number>, item) => {
      const type = item.transcriptType || 'Unknown'
      acc[type] = (acc[type] || 0) + item.transcriptCount
      return acc
    }, {})
  }
}

// Export handlers with middleware
export const GET = withRateLimit(rateLimitConfigs.read, authenticated(handleGET))
export const POST = withRateLimit(rateLimitConfigs.data, authenticated(handlePOST))