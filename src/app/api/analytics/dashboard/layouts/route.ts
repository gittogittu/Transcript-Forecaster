import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Dashboard layout schema
const DashboardLayoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  widgets: z.array(z.object({
    id: z.string(),
    type: z.enum(['chart', 'metric', 'table', 'insight']),
    title: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number()
    }),
    size: z.object({
      width: z.number(),
      height: z.number()
    }),
    config: z.object({
      chartType: z.enum(['line', 'bar', 'area', 'scatter', 'heatmap']).optional(),
      dataSource: z.string(),
      filters: z.array(z.any()).optional(),
      aggregation: z.object({
        groupBy: z.array(z.string()).optional(),
        metrics: z.array(z.object({
          field: z.string(),
          function: z.enum(['sum', 'avg', 'count', 'min', 'max', 'median']),
          label: z.string()
        })),
        timeGrain: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']).optional()
      }).optional(),
      visualization: z.object({
        showConfidenceBands: z.boolean().optional(),
        showAnomalies: z.boolean().optional(),
        showPredictions: z.boolean().optional(),
        showActuals: z.boolean().optional(),
        colorScheme: z.array(z.string()).optional(),
        animations: z.boolean().optional(),
        drillDown: z.object({
          enabled: z.boolean(),
          levels: z.array(z.object({
            field: z.string(),
            label: z.string(),
            chartType: z.enum(['line', 'bar', 'area', 'scatter']).optional()
          }))
        }).optional()
      }).optional()
    }),
    data: z.any().optional(),
    refreshInterval: z.number().optional()
  })),
  filters: z.array(z.object({
    id: z.string(),
    field: z.string(),
    label: z.string(),
    type: z.enum(['select', 'date', 'range', 'text']),
    options: z.array(z.object({
      value: z.any(),
      label: z.string()
    })).optional(),
    value: z.any()
  })),
  refreshInterval: z.number(),
  isDefault: z.boolean()
})

// In-memory storage for demo purposes
// In production, this would be stored in a database
const layouts = new Map<string, any>()

// Initialize with some default layouts
layouts.set('default-analytics', {
  id: 'default-analytics',
  name: 'Analytics Dashboard',
  widgets: [
    {
      id: 'prediction-overview',
      type: 'chart',
      title: 'Prediction vs Actual',
      position: { x: 20, y: 20 },
      size: { width: 600, height: 400 },
      config: {
        chartType: 'line',
        dataSource: 'predictions',
        visualization: {
          showConfidenceBands: true,
          showAnomalies: true,
          showPredictions: true,
          showActuals: true,
          animations: true
        }
      },
      refreshInterval: 30000
    }
  ],
  filters: [],
  refreshInterval: 30000,
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

layouts.set('monitoring-dashboard', {
  id: 'monitoring-dashboard',
  name: 'Real-time Monitoring',
  widgets: [
    {
      id: 'real-time-stream',
      type: 'chart',
      title: 'Live Data Stream',
      position: { x: 20, y: 20 },
      size: { width: 800, height: 400 },
      config: {
        chartType: 'line',
        dataSource: 'real-time',
        visualization: {
          animations: true
        }
      },
      refreshInterval: 5000
    },
    {
      id: 'anomaly-alerts',
      type: 'insight',
      title: 'Anomaly Alerts',
      position: { x: 20, y: 440 },
      size: { width: 400, height: 200 },
      config: {
        dataSource: 'anomalies'
      },
      refreshInterval: 15000
    }
  ],
  filters: [],
  refreshInterval: 10000,
  isDefault: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const layoutId = searchParams.get('id')
    const userId = searchParams.get('userId') // In production, get from auth
    
    if (layoutId) {
      // Get specific layout
      const layout = layouts.get(layoutId)
      if (!layout) {
        return NextResponse.json(
          { error: 'Layout not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(layout)
    } else {
      // Get all layouts for user
      const userLayouts = Array.from(layouts.values())
      
      return NextResponse.json({
        layouts: userLayouts,
        total: userLayouts.length
      })
    }
    
  } catch (error) {
    console.error('Get layouts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const layout = DashboardLayoutSchema.parse(body)
    
    // Add metadata
    const layoutWithMetadata = {
      ...layout,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: 'demo-user' // In production, get from auth
    }
    
    // Store layout
    layouts.set(layout.id, layoutWithMetadata)
    
    return NextResponse.json(layoutWithMetadata, { status: 201 })
    
  } catch (error) {
    console.error('Create layout API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid layout data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const layout = DashboardLayoutSchema.parse(body)
    
    // Check if layout exists
    const existingLayout = layouts.get(layout.id)
    if (!existingLayout) {
      return NextResponse.json(
        { error: 'Layout not found' },
        { status: 404 }
      )
    }
    
    // Update layout
    const updatedLayout = {
      ...layout,
      createdAt: existingLayout.createdAt,
      updatedAt: new Date().toISOString(),
      userId: existingLayout.userId
    }
    
    layouts.set(layout.id, updatedLayout)
    
    return NextResponse.json(updatedLayout)
    
  } catch (error) {
    console.error('Update layout API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid layout data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const layoutId = searchParams.get('id')
    
    if (!layoutId) {
      return NextResponse.json(
        { error: 'Layout ID is required' },
        { status: 400 }
      )
    }
    
    // Check if layout exists
    const existingLayout = layouts.get(layoutId)
    if (!existingLayout) {
      return NextResponse.json(
        { error: 'Layout not found' },
        { status: 404 }
      )
    }
    
    // Don't allow deletion of default layouts
    if (existingLayout.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default layout' },
        { status: 400 }
      )
    }
    
    // Delete layout
    layouts.delete(layoutId)
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Delete layout API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}