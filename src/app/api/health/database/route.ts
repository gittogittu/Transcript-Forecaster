/**
 * Database Health Check API Endpoint
 * 
 * Provides health status for the database and pgvector extension
 * Used for monitoring and deployment validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { healthChecker } from '@/lib/database/health-check'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'

    if (detailed) {
      // Run comprehensive health check
      const healthResult = await healthChecker.runHealthCheck()
      
      return NextResponse.json(healthResult, {
        status: healthResult.status === 'healthy' ? 200 : 
                healthResult.status === 'degraded' ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json'
        }
      })
    } else {
      // Quick health check for load balancers
      const quickResult = await healthChecker.quickHealthCheck()
      
      return NextResponse.json(quickResult, {
        status: quickResult.status === 'healthy' ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json'
        }
      })
    }
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

// Support HEAD requests for simple health checks
export async function HEAD(request: NextRequest) {
  try {
    const quickResult = await healthChecker.quickHealthCheck()
    
    return new NextResponse(null, {
      status: quickResult.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}