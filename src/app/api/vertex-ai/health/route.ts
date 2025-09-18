// Vertex AI Health Check API Route

import { NextRequest, NextResponse } from 'next/server'
import { getVertexAIService } from '@/lib/services/vertex-ai'

export async function GET(request: NextRequest) {
  try {
    const vertexAIService = getVertexAIService()
    
    // Perform health check
    const healthCheck = await vertexAIService.healthCheck()
    const stats = await vertexAIService.getServiceStats()

    return NextResponse.json({
      success: true,
      data: {
        health: healthCheck,
        stats,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Vertex AI health check failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'VERTEX_AI_HEALTH_CHECK_FAILED',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    const vertexAIService = getVertexAIService()

    switch (action) {
      case 'test-connection':
        const isConnected = await vertexAIService.testConnection()
        return NextResponse.json({
          success: true,
          data: { connected: isConnected },
        })

      case 'clear-error-stats':
        vertexAIService.clearErrorStats()
        return NextResponse.json({
          success: true,
          data: { message: 'Error statistics cleared' },
        })

      case 'get-stats':
        const stats = await vertexAIService.getServiceStats()
        return NextResponse.json({
          success: true,
          data: stats,
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              message: `Unknown action: ${action}`,
              type: 'INVALID_ACTION',
            },
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Vertex AI health check action failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'VERTEX_AI_ACTION_FAILED',
        },
      },
      { status: 500 }
    )
  }
}