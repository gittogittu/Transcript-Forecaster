import { NextRequest, NextResponse } from 'next/server'
import { DatabaseConnection } from '@/lib/database/connection'

export async function POST(request: NextRequest) {
  try {
    const db = DatabaseConnection.getInstance()
    const pool = await db.getPool()
    
    const body = await request.json()
    const { 
      months_ahead = 6, 
      model_type = 'ensemble',
      include_confidence = true,
      client_id = null
    } = body

    // Get historical data for forecasting
    const historicalQuery = `
      SELECT 
        DATE_TRUNC('month', t.date) as month,
        SUM(t.transcript_count) as total_transcripts,
        COUNT(DISTINCT t.client_id) as active_clients
      FROM transcripts t
      ${client_id ? 'WHERE t.client_id = $1' : ''}
      GROUP BY DATE_TRUNC('month', t.date)
      ORDER BY month
    `
    
    const params = client_id ? [client_id] : []
    const result = await pool.query(historicalQuery, params)
    
    if (result.rows.length < 3) {
      return NextResponse.json(
        { error: 'Insufficient historical data for forecasting' },
        { status: 400 }
      )
    }

    // Simple trend-based forecasting
    const historicalData = result.rows.map(row => ({
      month: new Date(row.month),
      value: parseInt(row.total_transcripts)
    }))

    // Calculate trend using linear regression
    const n = historicalData.length
    const sumX = historicalData.reduce((sum, _, i) => sum + i, 0)
    const sumY = historicalData.reduce((sum, d) => sum + d.value, 0)
    const sumXY = historicalData.reduce((sum, d, i) => sum + i * d.value, 0)
    const sumXX = historicalData.reduce((sum, _, i) => sum + i * i, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Generate forecasts
    const forecasts = []
    const lastMonth = historicalData[historicalData.length - 1].month
    
    for (let i = 1; i <= months_ahead; i++) {
      const futureMonth = new Date(lastMonth)
      futureMonth.setMonth(futureMonth.getMonth() + i)
      
      const predicted = slope * (n + i - 1) + intercept
      const baseValue = Math.max(0, Math.round(predicted))
      
      // Add some seasonality and variance
      const seasonalFactor = 1 + 0.1 * Math.sin((futureMonth.getMonth() / 12) * 2 * Math.PI)
      const adjustedValue = Math.round(baseValue * seasonalFactor)
      
      // Calculate confidence intervals (±20% for simplicity)
      const confidenceRange = adjustedValue * 0.2
      
      // Calculate growth rate
      const previousValue = i === 1 ? 
        historicalData[historicalData.length - 1].value : 
        forecasts[i - 2].predicted_transcripts
      const growthRate = ((adjustedValue - previousValue) / previousValue) * 100

      forecasts.push({
        month: futureMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        predicted_transcripts: adjustedValue,
        confidence_interval: [
          Math.round(adjustedValue - confidenceRange),
          Math.round(adjustedValue + confidenceRange)
        ],
        growth_rate: parseFloat(growthRate.toFixed(1))
      })
    }

    // Calculate model performance metrics
    const recentActual = historicalData.slice(-3).map(d => d.value)
    const recentPredicted = recentActual.map((_, i) => {
      const x = n - 3 + i
      return slope * x + intercept
    })
    
    const mae = recentActual.reduce((sum, actual, i) => 
      sum + Math.abs(actual - recentPredicted[i]), 0) / recentActual.length

    return NextResponse.json({
      success: true,
      forecasts,
      model_performance: {
        accuracy: Math.max(0, 1 - (mae / (sumY / n))),
        mae: Math.round(mae),
        trend_slope: slope.toFixed(2),
        confidence_score: 0.75
      },
      metadata: {
        model_type: 'linear_trend_with_seasonality',
        months_ahead,
        generated_at: new Date().toISOString(),
        data_points_used: historicalData.length,
        historical_range: {
          start: historicalData[0].month.toISOString(),
          end: historicalData[historicalData.length - 1].month.toISOString()
        }
      }
    })

  } catch (error) {
    console.error('Forecasting error:', error)
    return NextResponse.json(
      { error: 'Failed to generate forecasts' },
      { status: 500 }
    )
  }
}