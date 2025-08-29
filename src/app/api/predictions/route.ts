import { NextRequest, NextResponse } from 'next/server'
import { authenticated, analystOrAdmin, getCurrentUser } from '@/lib/middleware/auth'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { performanceMiddleware } from '@/lib/middleware/performance-middleware'
import { TranscriptService } from '@/lib/database/transcripts'
import { z } from 'zod'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const PredictionRequestSchema = z.object({
  type: z.enum(['volume-forecast', 'seasonal-analysis', 'scenario-analysis']),
  period: z.enum(['next-week', 'next-month', 'next-quarter', 'next-6-months']).optional(),
  model: z.enum(['linear-regression', 'arima', 'lstm', 'ensemble']).optional(),
  scenario: z.enum(['optimistic', 'pessimistic', 'seasonal', 'custom']).optional(),
  adjustment: z.number().min(-50).max(100).optional(),
})

interface PredictionResult {
  id: string
  type: string
  forecast: number
  confidence: number
  period: string
  generatedAt: string
  accuracy?: number
  metadata?: any
}

/**
 * GET /api/predictions - Get existing predictions
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
        // Get predictions from database (you might want to create a predictions table)
        const predictionsQuery = `
          SELECT 
            id,
            prediction_type as type,
            forecast_value as forecast,
            confidence_level as confidence,
            forecast_period as period,
            created_at as "generatedAt",
            accuracy_score as accuracy,
            metadata
          FROM predictions
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 20
        `
        
        const result = await client.query(predictionsQuery, [user.userId])
        
        const predictions: PredictionResult[] = result.rows.map(row => ({
          id: row.id,
          type: row.type,
          forecast: row.forecast,
          confidence: row.confidence,
          period: row.period,
          generatedAt: row.generatedAt,
          accuracy: row.accuracy,
          metadata: row.metadata
        }))

        return NextResponse.json({
          success: true,
          data: predictions
        })

      } finally {
        client.release()
      }

    } catch (error) {
      console.error('Error fetching predictions:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

/**
 * POST /api/predictions - Generate new prediction
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
      const validatedData = PredictionRequestSchema.parse(body)

      const transcriptService = new TranscriptService()
      const client = await pool.connect()

      try {
        // Get historical data for prediction
        const historicalData = await transcriptService.getTranscripts({
          startDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // Last 6 months
          limit: 10000
        })

        // Generate prediction based on type
        let prediction: PredictionResult

        switch (validatedData.type) {
          case 'volume-forecast':
            prediction = await generateVolumeForecast(historicalData.data, validatedData, user.userId)
            break
          case 'seasonal-analysis':
            prediction = await generateSeasonalAnalysis(historicalData.data, validatedData, user.userId)
            break
          case 'scenario-analysis':
            prediction = await generateScenarioAnalysis(historicalData.data, validatedData, user.userId)
            break
          default:
            throw new Error('Invalid prediction type')
        }

        // Save prediction to database
        const insertQuery = `
          INSERT INTO predictions (
            id, user_id, prediction_type, forecast_value, confidence_level,
            forecast_period, accuracy_score, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING *
        `

        await client.query(insertQuery, [
          prediction.id,
          user.userId,
          prediction.type,
          prediction.forecast,
          prediction.confidence,
          prediction.period,
          prediction.accuracy,
          JSON.stringify(prediction.metadata)
        ])

        return NextResponse.json({
          success: true,
          data: prediction,
          message: `${prediction.type} generated successfully`
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

      console.error('Error generating prediction:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

async function generateVolumeForecast(
  data: any[], 
  config: z.infer<typeof PredictionRequestSchema>, 
  userId: string
): Promise<PredictionResult> {
  // Simple linear regression for volume forecasting
  const monthlyData = aggregateByMonth(data)
  const forecast = calculateLinearTrend(monthlyData, config.period || 'next-month')
  
  return {
    id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'Volume Forecast',
    forecast: Math.round(forecast.value),
    confidence: forecast.confidence,
    period: config.period || 'next-month',
    generatedAt: new Date().toISOString(),
    metadata: {
      model: config.model || 'linear-regression',
      historicalDataPoints: monthlyData.length,
      trend: forecast.trend
    }
  }
}

async function generateSeasonalAnalysis(
  data: any[], 
  config: z.infer<typeof PredictionRequestSchema>, 
  userId: string
): Promise<PredictionResult> {
  // Analyze seasonal patterns
  const seasonalData = analyzeSeasonalPatterns(data)
  
  return {
    id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'Seasonal Analysis',
    forecast: Math.round(seasonalData.nextPeriodForecast),
    confidence: seasonalData.confidence,
    period: config.period || 'next-quarter',
    generatedAt: new Date().toISOString(),
    metadata: {
      seasonalityStrength: seasonalData.seasonalityStrength,
      peakMonth: seasonalData.peakMonth,
      lowMonth: seasonalData.lowMonth
    }
  }
}

async function generateScenarioAnalysis(
  data: any[], 
  config: z.infer<typeof PredictionRequestSchema>, 
  userId: string
): Promise<PredictionResult> {
  // Generate scenario-based prediction
  const baselineForecast = calculateLinearTrend(aggregateByMonth(data), 'next-month')
  let adjustedForecast = baselineForecast.value
  let confidence = baselineForecast.confidence

  // Apply scenario adjustments
  switch (config.scenario) {
    case 'optimistic':
      adjustedForecast *= 1.15 // 15% increase
      confidence = Math.max(60, confidence - 10)
      break
    case 'pessimistic':
      adjustedForecast *= 0.85 // 15% decrease
      confidence = Math.max(60, confidence - 10)
      break
    case 'custom':
      if (config.adjustment) {
        adjustedForecast *= (1 + config.adjustment / 100)
        confidence = Math.max(50, confidence - Math.abs(config.adjustment) / 2)
      }
      break
  }

  return {
    id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'Scenario Analysis',
    forecast: Math.round(adjustedForecast),
    confidence: Math.round(confidence),
    period: config.scenario || 'custom',
    generatedAt: new Date().toISOString(),
    metadata: {
      scenario: config.scenario,
      adjustment: config.adjustment,
      baselineForecast: Math.round(baselineForecast.value)
    }
  }
}

function aggregateByMonth(data: any[]): Array<{ month: string; count: number }> {
  const monthlyTotals: Record<string, number> = {}
  
  data.forEach(item => {
    const date = new Date(item.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + item.transcriptCount
  })

  return Object.entries(monthlyTotals)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

function calculateLinearTrend(monthlyData: Array<{ month: string; count: number }>, period: string) {
  if (monthlyData.length < 2) {
    return { value: monthlyData[0]?.count || 1000, confidence: 50, trend: 0 }
  }

  // Simple linear regression
  const n = monthlyData.length
  const sumX = (n * (n - 1)) / 2
  const sumY = monthlyData.reduce((sum, item) => sum + item.count, 0)
  const sumXY = monthlyData.reduce((sum, item, index) => sum + index * item.count, 0)
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Predict next period
  let periodsAhead = 1
  switch (period) {
    case 'next-week':
      periodsAhead = 0.25
      break
    case 'next-quarter':
      periodsAhead = 3
      break
    case 'next-6-months':
      periodsAhead = 6
      break
  }

  const forecast = intercept + slope * (n + periodsAhead - 1)
  
  // Calculate confidence based on data consistency
  const variance = monthlyData.reduce((sum, item, index) => {
    const predicted = intercept + slope * index
    return sum + Math.pow(item.count - predicted, 2)
  }, 0) / n

  const confidence = Math.max(60, Math.min(95, 90 - Math.sqrt(variance) / 100))

  return {
    value: Math.max(0, forecast),
    confidence: Math.round(confidence),
    trend: slope
  }
}

function analyzeSeasonalPatterns(data: any[]) {
  const monthlyAverages: Record<number, number[]> = {}
  
  // Group by month of year
  data.forEach(item => {
    const month = new Date(item.date).getMonth()
    if (!monthlyAverages[month]) monthlyAverages[month] = []
    monthlyAverages[month].push(item.transcriptCount)
  })

  // Calculate averages for each month
  const monthlyStats = Object.entries(monthlyAverages).map(([month, values]) => ({
    month: parseInt(month),
    average: values.reduce((sum, val) => sum + val, 0) / values.length,
    count: values.length
  }))

  // Find peak and low months
  const peakMonth = monthlyStats.reduce((max, curr) => curr.average > max.average ? curr : max)
  const lowMonth = monthlyStats.reduce((min, curr) => curr.average < min.average ? curr : min)

  // Calculate seasonality strength
  const overallAverage = monthlyStats.reduce((sum, stat) => sum + stat.average, 0) / monthlyStats.length
  const seasonalityStrength = (peakMonth.average - lowMonth.average) / overallAverage

  // Predict next period based on current month
  const currentMonth = new Date().getMonth()
  const nextMonth = (currentMonth + 1) % 12
  const nextMonthStat = monthlyStats.find(stat => stat.month === nextMonth)
  const nextPeriodForecast = nextMonthStat?.average || overallAverage

  return {
    nextPeriodForecast,
    confidence: Math.min(90, 70 + monthlyStats.length * 2),
    seasonalityStrength: Math.round(seasonalityStrength * 100) / 100,
    peakMonth: peakMonth.month,
    lowMonth: lowMonth.month
  }
}

// Export handlers with middleware
export const GET = withRateLimit(rateLimitConfigs.read, authenticated(handleGET))
export const POST = withRateLimit(rateLimitConfigs.data, analystOrAdmin(handlePOST))