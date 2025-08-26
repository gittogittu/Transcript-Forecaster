import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchAllTranscripts } from '@/lib/data/transcript-data'
import { calculateTrendAnalytics } from '@/lib/utils/analytics-calculations'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { z } from 'zod'

// Validation schema for trend analysis request
const TrendAnalysisSchema = z.object({
  clientName: z.string().optional(),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Start month must be in YYYY-MM format').optional(),
  endMonth: z.string().regex(/^\d{4}-\d{2}$/, 'End month must be in YYYY-MM format').optional(),
  timeRange: z.enum(['3m', '6m', '12m', '24m', 'all']).optional().default('12m'),
  groupBy: z.enum(['month', 'quarter', 'year']).optional().default('month'),
  includeProjections: z.boolean().optional().default(false),
})

/**
 * GET /api/analytics/trends - Get trend analysis data
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
      startMonth: searchParams.get('startMonth') || undefined,
      endMonth: searchParams.get('endMonth') || undefined,
      timeRange: searchParams.get('timeRange') || '12m',
      groupBy: searchParams.get('groupBy') || 'month',
      includeProjections: searchParams.get('includeProjections') === 'true',
    }

    // Validate query parameters
    const validationResult = TrendAnalysisSchema.safeParse(queryParams)
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
          trends: [],
          summary: {
            totalTranscripts: 0,
            totalClients: 0,
            averageGrowthRate: 0,
            periodOverPeriodChange: 0,
          },
          timeRange: params.timeRange,
          groupBy: params.groupBy,
        },
        success: true,
      })
    }

    // Calculate trend analytics
    const trendAnalytics = calculateTrendAnalytics(transcriptResult.data, params)

    return NextResponse.json({
      data: trendAnalytics,
      success: true,
    })
  } catch (error) {
    console.error('Trends API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/analytics/trends - Generate custom trend analysis
 */
export const POST = withRateLimit(rateLimitConfigs.standard, async (request: NextRequest) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = TrendAnalysisSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const params = validationResult.data

    // Validate date range if both start and end are provided
    if (params.startMonth && params.endMonth) {
      const startDate = new Date(params.startMonth + '-01')
      const endDate = new Date(params.endMonth + '-01')
      
      if (startDate >= endDate) {
        return NextResponse.json(
          { error: 'Start month must be before end month' },
          { status: 400 }
        )
      }
    }

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
          trends: [],
          summary: {
            totalTranscripts: 0,
            totalClients: 0,
            averageGrowthRate: 0,
            periodOverPeriodChange: 0,
          },
          timeRange: params.timeRange,
          groupBy: params.groupBy,
        },
        success: true,
      })
    }

    // Calculate trend analytics with custom parameters
    const trendAnalytics = calculateTrendAnalytics(transcriptResult.data, params)

    return NextResponse.json({
      data: trendAnalytics,
      success: true,
      message: 'Custom trend analysis generated successfully',
    })
  } catch (error) {
    console.error('Custom Trends API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})