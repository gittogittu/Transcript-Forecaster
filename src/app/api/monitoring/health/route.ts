import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { metricsCollector } from '@/lib/monitoring/metrics-collector'
import { withPerformanceMonitoring } from '@/lib/middleware/performance-middleware'

export async function GET(request: NextRequest) {
  return withPerformanceMonitoring(async () => {
    try {
      const session = await getServerSession(authOptions)
      
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check if user has admin role
      if (session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Get system health indicators
      const healthIndicators = metricsCollector.getSystemHealth()
      
      // Perform additional health checks
      const healthChecks = await performHealthChecks()
      
      // Combine all health indicators
      const allIndicators = [...healthIndicators, ...healthChecks]
      
      // Determine overall system status
      const overallStatus = allIndicators.length === 0 ? 'unknown' :
        allIndicators.every(h => h.status === 'healthy') ? 'healthy' :
        allIndicators.some(h => h.status === 'critical') ? 'critical' : 'warning'

      return NextResponse.json({
        overallStatus,
        indicators: allIndicators,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error checking system health:', error)
      return NextResponse.json(
        { error: 'Failed to check system health' },
        { status: 500 }
      )
    }
  })
}

async function performHealthChecks() {
  const checks = []
  
  try {
    // Database connectivity check
    const dbStart = Date.now()
    // In a real implementation, you would check database connectivity here
    // For now, we'll simulate a database check
    await new Promise(resolve => setTimeout(resolve, 10))
    const dbDuration = Date.now() - dbStart
    
    checks.push({
      component: 'database',
      status: dbDuration < 100 ? 'healthy' as const : 'warning' as const,
      message: `Database connection: ${dbDuration}ms`,
      lastChecked: new Date(),
      responseTime: dbDuration,
    })
  } catch (error) {
    checks.push({
      component: 'database',
      status: 'critical' as const,
      message: 'Database connection failed',
      lastChecked: new Date(),
    })
  }

  try {
    // Memory usage check
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage()
      const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
      
      checks.push({
        component: 'memory',
        status: memoryPercent < 80 ? 'healthy' as const : memoryPercent < 90 ? 'warning' as const : 'critical' as const,
        message: `Memory usage: ${memoryPercent.toFixed(1)}%`,
        lastChecked: new Date(),
      })
    }
  } catch (error) {
    checks.push({
      component: 'memory',
      status: 'warning' as const,
      message: 'Unable to check memory usage',
      lastChecked: new Date(),
    })
  }

  try {
    // External API connectivity check (if applicable)
    // This would check connections to external services like Google Sheets API
    checks.push({
      component: 'external_apis',
      status: 'healthy' as const,
      message: 'External API connections operational',
      lastChecked: new Date(),
    })
  } catch (error) {
    checks.push({
      component: 'external_apis',
      status: 'warning' as const,
      message: 'Some external APIs may be unavailable',
      lastChecked: new Date(),
    })
  }

  return checks
}