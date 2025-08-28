import { NextRequest, NextResponse } from 'next/server'
import { authenticated, getCurrentUser } from '@/lib/middleware/auth'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { performanceMiddleware } from '@/lib/middleware/performance-middleware'
import { getAllTranscripts } from '@/lib/database/transcripts'
import { z } from 'zod'

const TrendsQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  transcriptType: z.string().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('monthly')
})

interface TrendData {
  period: string
  count: number
  change?: number
  changePercent?: number
  clients?: Array<{
    name: string
    count: number
  }>
}

/**
 * GET /api/analytics/trends - Get trend analysis data
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

      // Parse and validate query parameters
      const { searchParams } = new URL(request.url)
      const queryParams = Object.fromEntries(searchParams.entries())
      const validatedQuery = TrendsQuerySchema.parse(queryParams)

      // Fetch transcript data with filters
      const transcriptResult = await getAllTranscripts({
        clientId: validatedQuery.clientId,
        startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
        endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined,
        transcriptType: validatedQuery.transcriptType,
        page: 1,
        limit: 10000 // Get all for trend analysis
      })

      if (!transcriptResult.data || transcriptResult.data.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            trends: [],
            summary: {
              totalPeriods: 0,
              averageGrowth: 0,
              highestGrowth: 0,
              lowestGrowth: 0
            }
          }
        })
      }

      // Calculate trends based on granularity
      const trends = calculateTrends(transcriptResult.data, validatedQuery.granularity)
      const summary = calculateTrendSummary(trends)

      return NextResponse.json({
        success: true,
        data: {
          trends,
          summary,
          granularity: validatedQuery.granularity,
          filters: validatedQuery
        }
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: error.issues },
          { status: 400 }
        )
      }

      console.error('Error calculating trends:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

function calculateTrends(data: any[], granularity: 'daily' | 'weekly' | 'monthly'): TrendData[] {
  // Group data by period
  const periodData: Record<string, { count: number; clients: Record<string, number> }> = {}

  data.forEach(item => {
    const date = new Date(item.date)
    let periodKey: string

    switch (granularity) {
      case 'daily':
        periodKey = date.toISOString().split('T')[0]
        break
      case 'weekly':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        periodKey = weekStart.toISOString().split('T')[0]
        break
      case 'monthly':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
    }

    if (!periodData[periodKey]) {
      periodData[periodKey] = { count: 0, clients: {} }
    }

    periodData[periodKey].count += item.transcriptCount
    periodData[periodKey].clients[item.clientName] = 
      (periodData[periodKey].clients[item.clientName] || 0) + item.transcriptCount
  })

  // Convert to trend data with change calculations
  const sortedPeriods = Object.keys(periodData).sort()
  
  return sortedPeriods.map((period, index) => {
    const current = periodData[period]
    const previous = index > 0 ? periodData[sortedPeriods[index - 1]] : null

    let change = 0
    let changePercent = 0

    if (previous) {
      change = current.count - previous.count
      changePercent = previous.count > 0 ? (change / previous.count) * 100 : 0
    }

    // Convert clients object to array
    const clients = Object.entries(current.clients)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    return {
      period,
      count: current.count,
      change: index > 0 ? change : undefined,
      changePercent: index > 0 ? Math.round(changePercent * 100) / 100 : undefined,
      clients
    }
  })
}

function calculateTrendSummary(trends: TrendData[]) {
  const growthRates = trends
    .filter(trend => trend.changePercent !== undefined)
    .map(trend => trend.changePercent!)

  return {
    totalPeriods: trends.length,
    averageGrowth: growthRates.length > 0 
      ? Math.round((growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length) * 100) / 100 
      : 0,
    highestGrowth: growthRates.length > 0 ? Math.max(...growthRates) : 0,
    lowestGrowth: growthRates.length > 0 ? Math.min(...growthRates) : 0
  }
}

export const GET = withRateLimit(rateLimitConfigs.read, authenticated(handleGET))