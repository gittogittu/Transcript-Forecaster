import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Widget data schema
const WidgetDataRequestSchema = z.object({
  widgetId: z.string(),
  dataSource: z.string(),
  filters: z.record(z.any()).optional(),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  aggregation: z.object({
    groupBy: z.array(z.string()).optional(),
    metrics: z.array(z.object({
      field: z.string(),
      function: z.enum(['sum', 'avg', 'count', 'min', 'max', 'median']),
      label: z.string()
    })),
    timeGrain: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']).optional()
  }).optional()
})

// Mock data generators
function generatePredictionData() {
  const now = new Date()
  const data = []
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const baseValue = 100 + Math.sin(i / 5) * 20
    const noise = (Math.random() - 0.5) * 10
    const actual = Math.max(0, baseValue + noise)
    const predicted = Math.max(0, baseValue + (Math.random() - 0.5) * 5)
    
    data.push({
      timestamp: date.toISOString(),
      actual: Math.round(actual * 100) / 100,
      predicted: Math.round(predicted * 100) / 100,
      confidenceUpper: Math.round((predicted + 10) * 100) / 100,
      confidenceLower: Math.round((predicted - 10) * 100) / 100,
      anomaly: Math.random() < 0.1,
      anomalySeverity: Math.random() < 0.05 ? 'high' : Math.random() < 0.15 ? 'medium' : 'low'
    })
  }
  
  return {
    data,
    accuracy: {
      mae: 3.2 + Math.random() * 2,
      rmse: 4.1 + Math.random() * 2,
      mape: 3.8 + Math.random() * 2,
      r2Score: 0.85 + Math.random() * 0.1
    }
  }
}

function generateRealTimeData() {
  const now = new Date()
  const data = []
  
  for (let i = 50; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 1000) // Last 50 minutes
    const value = 100 + Math.sin(i / 10) * 15 + (Math.random() - 0.5) * 8
    
    data.push({
      timestamp: timestamp.toISOString(),
      value: Math.round(value * 100) / 100,
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable'
    })
  }
  
  return data
}

function generateMetricData(metrics: any[]) {
  const result: Record<string, number> = {}
  
  metrics.forEach(metric => {
    switch (metric.field) {
      case 'mae':
        result[metric.label] = 2.5 + Math.random() * 3
        break
      case 'rmse':
        result[metric.label] = 3.2 + Math.random() * 4
        break
      case 'mape':
        result[metric.label] = 2.8 + Math.random() * 3.5
        break
      case 'r2Score':
        result[metric.label] = 0.8 + Math.random() * 0.15
        break
      case 'volume':
        result[metric.label] = Math.floor(Math.random() * 1000) + 500
        break
      case 'count':
        result[metric.label] = Math.floor(Math.random() * 100) + 50
        break
      default:
        result[metric.label] = Math.random() * 100
    }
  })
  
  return result
}

function generateAnomalyInsights() {
  const insights = [
    {
      type: 'anomaly',
      severity: 'medium',
      title: 'Volume Spike Detected',
      description: 'Transcript volume increased by 35% compared to the same day last week. This may be due to a marketing campaign or seasonal effect.',
      timestamp: new Date().toISOString(),
      confidence: 0.87,
      recommendations: [
        'Monitor capacity to handle increased load',
        'Check for any ongoing campaigns or events',
        'Review staffing levels for the next few days'
      ]
    },
    {
      type: 'trend',
      severity: 'low',
      title: 'Gradual Decline in Evening Hours',
      description: 'Evening transcript volumes have been declining by 2-3% daily over the past week.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      confidence: 0.73,
      recommendations: [
        'Investigate potential causes for evening decline',
        'Consider adjusting evening service hours',
        'Review customer feedback for evening services'
      ]
    }
  ]
  
  return insights
}

function generateSeasonalData() {
  const data = []
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  
  months.forEach((month, monthIndex) => {
    daysOfWeek.forEach((day, dayIndex) => {
      const baseValue = 100
      const seasonalEffect = Math.sin((monthIndex / 12) * 2 * Math.PI) * 20
      const weekdayEffect = dayIndex < 5 ? 10 : -15 // Weekdays higher than weekends
      const value = baseValue + seasonalEffect + weekdayEffect + (Math.random() - 0.5) * 10
      
      data.push({
        month,
        dayOfWeek: day,
        value: Math.max(0, Math.round(value))
      })
    })
  })
  
  return data
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { widgetId, dataSource, filters, timeRange, aggregation } = WidgetDataRequestSchema.parse(body)
    
    let responseData: any
    
    switch (dataSource) {
      case 'predictions':
        responseData = generatePredictionData()
        break
        
      case 'real-time':
        responseData = generateRealTimeData()
        break
        
      case 'accuracy':
      case 'metrics':
        if (aggregation?.metrics) {
          responseData = generateMetricData(aggregation.metrics)
        } else {
          responseData = {
            mae: 3.2,
            rmse: 4.1,
            mape: 3.8,
            r2Score: 0.92
          }
        }
        break
        
      case 'anomalies':
      case 'insights':
        responseData = generateAnomalyInsights()
        break
        
      case 'seasonal':
        responseData = generateSeasonalData()
        break
        
      case 'volumes':
        responseData = Array.from({ length: 10 }, (_, i) => ({
          client: `Client ${String.fromCharCode(65 + i)}`,
          volume: Math.floor(Math.random() * 500) + 100,
          change: (Math.random() - 0.5) * 20
        }))
        break
        
      case 'clients':
        responseData = [
          { name: 'Client A', value: 35, color: '#3b82f6' },
          { name: 'Client B', value: 25, color: '#ef4444' },
          { name: 'Client C', value: 20, color: '#10b981' },
          { name: 'Client D', value: 12, color: '#f59e0b' },
          { name: 'Others', value: 8, color: '#6b7280' }
        ]
        break
        
      case 'trends':
        responseData = Array.from({ length: 30 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (29 - i))
          return {
            date: date.toISOString().split('T')[0],
            value: Math.floor(Math.random() * 200) + 100,
            trend: Math.random() > 0.5 ? 'up' : 'down'
          }
        })
        break
        
      default:
        return NextResponse.json(
          { error: 'Unknown data source' },
          { status: 400 }
        )
    }
    
    return NextResponse.json({
      widgetId,
      dataSource,
      data: responseData,
      timestamp: new Date().toISOString(),
      filters: filters || {},
      metadata: {
        refreshInterval: 30000,
        lastUpdate: new Date().toISOString(),
        dataPoints: Array.isArray(responseData) ? responseData.length : 1
      }
    })
    
  } catch (error) {
    console.error('Widget data API error:', error)
    
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dataSource = searchParams.get('dataSource')
  const widgetId = searchParams.get('widgetId')
  
  if (!dataSource || !widgetId) {
    return NextResponse.json(
      { error: 'Missing required parameters: dataSource and widgetId' },
      { status: 400 }
    )
  }
  
  // Handle GET request for simple data fetching
  try {
    let responseData: any
    
    switch (dataSource) {
      case 'real-time':
        // Return single data point for real-time updates
        responseData = {
          timestamp: new Date().toISOString(),
          value: 100 + Math.sin(Date.now() / 10000) * 20 + (Math.random() - 0.5) * 10,
          trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable'
        }
        break
        
      default:
        return NextResponse.json(
          { error: 'GET method not supported for this data source' },
          { status: 400 }
        )
    }
    
    return NextResponse.json({
      widgetId,
      dataSource,
      data: responseData,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Widget data GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}