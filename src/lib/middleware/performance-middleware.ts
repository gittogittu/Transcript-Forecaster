import { NextRequest, NextResponse } from 'next/server'
import { metricsCollector } from '@/lib/monitoring/metrics-collector'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function performanceMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now()
  const endpoint = request.nextUrl.pathname
  
  let response: NextResponse
  let success = true
  let error: Error | null = null

  try {
    response = await handler()
    success = response.status < 400
  } catch (err) {
    error = err instanceof Error ? err : new Error('Unknown error')
    success = false
    
    // Record the error
    const session = await getServerSession(authOptions)
    metricsCollector.recordError(error, endpoint, session?.user?.id)
    
    // Re-throw to maintain normal error handling
    throw err
  } finally {
    const duration = Date.now() - startTime
    
    // Record the query performance
    metricsCollector.recordQuery(duration, endpoint, success)
    
    // Record user activity if we have a session
    try {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        metricsCollector.recordUserActivity({
          userId: session.user.id,
          action: 'api_request',
          endpoint,
          timestamp: new Date(),
          duration,
          success,
          errorMessage: error?.message,
        })
      }
    } catch (sessionError) {
      // Don't let session errors break the monitoring
      console.warn('Failed to get session for monitoring:', sessionError)
    }
  }

  return response!
}

// Higher-order function to wrap API route handlers
export function withPerformanceMonitoring<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    let success = true
    let error: Error | null = null

    try {
      const result = await handler(...args)
      return result
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error')
      success = false
      
      // Record the error
      metricsCollector.recordError(error, 'api_handler')
      
      throw err
    } finally {
      const duration = Date.now() - startTime
      
      // Record performance metrics
      metricsCollector.recordQuery(duration, 'api_handler', success)
    }
  }
}

// Utility to measure ML model performance
export async function measureModelPerformance<T>(
  modelType: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  let success = true

  try {
    const result = await operation()
    return result
  } catch (error) {
    success = false
    throw error
  } finally {
    const duration = Date.now() - startTime
    metricsCollector.recordModelExecution(modelType, duration, success)
  }
}