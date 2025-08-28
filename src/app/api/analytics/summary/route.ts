import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchAllTranscripts } from '@/lib/database/transcripts'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { z } from 'zod'

// Validation schema for summary request
const SummaryRequestSchema = z.object({
  clientName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  transcriptType: z.string().optional(),
})

interface SummaryStats {
  totalTranscripts: number
  averagePerDay: number
  peakDay: string
  peakCount: number
  clientBreakdown: Array<{
    client: string
    count: number
    percentage: number
  }>
  monthlyTrends: Array<{
    month: string
    count: number
    change?: number
    changePercent?: number
  }>
  growthMetrics: {
    monthlyGrowthRate: number
    quarterlyGrowthRate: number
  }
}

/**
 * GET /api/analytics/summary - Get summary statistics
 */
export const GET = withRateLimit(rateLimitConfigs.standard, async (request: NextRequest) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      clientName: searchParams.get('clientName') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      transcriptType: searchParams.get('transcriptType') || undefined,
    }

    // Validate query parameters
    const validationResult = SummaryRequestSchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const params = validationResult.data

    // Fetch transcript data
    const transcriptResult = await fetchAllTranscripts()
    
    if (transcriptResult.error) {
      return NextResponse.json(
        { error: transcriptResult.error },
        { status: 500 }
      )
    }

    if (!transcriptResult.data || transcriptResult.data.length === 0) {
      return NextResponse.json({
        data: {
          totalTranscripts: 0,
          averagePerDay: 0,
          peakDay: '',
          peakCount: 0,
          clientBreakdown: [],
          monthlyTrends: [],
          growthMetrics: {
            monthlyGrowthRate: 0,
            quarterlyGrowthRate: 0,
          }
        },
        success: true,
      })
    }

    let filteredData = transcriptResult.data

    // Apply filters
    if (params.clientName) {
      filteredData = filteredData.filter(item => item.clientName === params.clientName)
    }

    if (params.startDate) {
      const startDate = new Date(params.startDate)
      filteredData = filteredData.filter(item => new Date(item.date) >= startDate)
    }

    if (params.endDate) {
      const endDate = new Date(params.endDate)
      filteredData = filteredData.filter(item => new Date(item.date) <= endDate)
    }

    if (params.transcriptType) {
      filteredData = filteredData.filter(item => item.transcriptType === params.transcriptType)
    }

    // Calculate summary statistics
    const summary = calculateSummaryStats(filteredData)

    return NextResponse.json({
      data: summary,
      success: true,
    })
  } catch (error) {
    console.error('Summary API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

function calculateSummaryStats(data: any[]): SummaryStats {
  if (data.length === 0) {
    return {
      totalTranscripts: 0,
      averagePerDay: 0,
      peakDay: '',
      peakCount: 0,
      clientBreakdown: [],
      monthlyTrends: [],
      growthMetrics: {
        monthlyGrowthRate: 0,
        quarterlyGrowthRate: 0,
      }
    }
  }

  const totalTranscripts = data.reduce((sum, item) => sum + item.transcriptCount, 0)

  // Calculate daily aggregates
  const dailyData: Record<string, number> = {}
  data.forEach(item => {
    const dateKey = new Date(item.date).toISOString().split('T')[0]
    dailyData[dateKey] = (dailyData[dateKey] || 0) + item.transcriptCount
  })

  const uniqueDays = Object.keys(dailyData).length
  const averagePerDay = uniqueDays > 0 ? totalTranscripts / uniqueDays : 0

  // Find peak day
  let peakDay = ''
  let peakCount = 0
  Object.entries(dailyData).forEach(([day, count]) => {
    if (count > peakCount) {
      peakDay = day
      peakCount = count
    }
  })

  // Calculate client breakdown
  const clientTotals: Record<string, number> = {}
  data.forEach(item => {
    clientTotals[item.clientName] = (clientTotals[item.clientName] || 0) + item.transcriptCount
  })

  const clientBreakdown = Object.entries(clientTotals)
    .map(([client, count]) => ({
      client,
      count,
      percentage: (count / totalTranscripts) * 100
    }))
    .sort((a, b) => b.count - a.count)

  // Calculate monthly trends
  const monthlyData: Record<string, number> = {}
  data.forEach(item => {
    const date = new Date(item.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + item.transcriptCount
  })

  const sortedMonths = Object.keys(monthlyData).sort()
  const monthlyTrends = sortedMonths.map((month, index) => {
    const count = monthlyData[month]
    const previousMonth = index > 0 ? monthlyData[sortedMonths[index - 1]] : null
    
    let change = 0
    let changePercent = 0
    
    if (previousMonth !== null) {
      change = count - previousMonth
      changePercent = previousMonth > 0 ? (change / previousMonth) * 100 : 0
    }
    
    return {
      month,
      count,
      change,
      changePercent
    }
  })

  // Calculate growth metrics
  let monthlyGrowthRate = 0
  let quarterlyGrowthRate = 0

  if (sortedMonths.length >= 2) {
    const lastMonth = monthlyData[sortedMonths[sortedMonths.length - 1]]
    const previousMonth = monthlyData[sortedMonths[sortedMonths.length - 2]]
    monthlyGrowthRate = previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth) * 100 : 0
  }

  if (sortedMonths.length >= 6) {
    const lastQuarter = sortedMonths.slice(-3).reduce((sum, month) => sum + monthlyData[month], 0)
    const previousQuarter = sortedMonths.slice(-6, -3).reduce((sum, month) => sum + monthlyData[month], 0)
    quarterlyGrowthRate = previousQuarter > 0 ? ((lastQuarter - previousQuarter) / previousQuarter) * 100 : 0
  }

  return {
    totalTranscripts,
    averagePerDay: Math.round(averagePerDay * 100) / 100,
    peakDay,
    peakCount,
    clientBreakdown,
    monthlyTrends,
    growthMetrics: {
      monthlyGrowthRate: Math.round(monthlyGrowthRate * 100) / 100,
      quarterlyGrowthRate: Math.round(quarterlyGrowthRate * 100) / 100,
    }
  }
}