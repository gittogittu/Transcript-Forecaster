/**
 * System Health Check API Endpoint
 * 
 * Provides comprehensive health monitoring for the predictive analytics system
 * including all components, performance metrics, and system status
 */

import { NextRequest, NextResponse } from 'next/server'
import { predictiveAnalyticsEngine } from '../../../../lib/services/system-integration/predictive-analytics-engine'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'
    const component = searchParams.get('component')

    // Get system health
    const health = await predictiveAnalyticsEngine.getSystemHealth()

    // If specific component requested
    if (component && health.components[component as keyof typeof health.components]) {
      return NextResponse.json({
        success: true,
        component,
        status: health.components[component as keyof typeof health.components],
        timestamp: new Date().toISOString()
      })
    }

    // Return appropriate level of detail
    if (detailed) {
      return NextResponse.json({
        success: true,
        health,
        timestamp: new Date().toISOString()
      })
    }

    // Return summary health status
    return NextResponse.json({
      success: true,
      status: health.overall,
      components: Object.entries(health.components).reduce((acc, [key, value]) => {
        acc[key] = value.status
        return acc
      }, {} as Record<string, string>),
      performance: {
        responseTime: health.performance.averageResponseTime,
        errorRate: health.performance.errorRate,
        uptime: health.performance.uptime
      },
      alertCount: health.alerts.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      success: false,
      status: 'critical',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'initialize':
        await predictiveAnalyticsEngine.initialize()
        return NextResponse.json({
          success: true,
          message: 'System initialized successfully',
          timestamp: new Date().toISOString()
        })

      case 'optimize':
        const optimization = await predictiveAnalyticsEngine.optimizePerformance()
        return NextResponse.json({
          success: true,
          optimization,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: initialize, optimize'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Health check action failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}