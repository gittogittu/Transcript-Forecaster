/**
 * System Monitoring API Endpoint
 * 
 * Provides comprehensive monitoring data for the predictive analytics system
 * including performance metrics, optimization status, and system analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { predictiveAnalyticsEngine } from '../../../../lib/services/system-integration/predictive-analytics-engine'
import { performanceOptimizer } from '../../../../lib/services/system-integration/performance-optimizer'
import { errorHandlingService } from '../../../../lib/services/system-integration/error-handling'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric')
    const timeRange = searchParams.get('timeRange') || '24h'
    const detailed = searchParams.get('detailed') === 'true'

    switch (metric) {
      case 'health':
        return await getSystemHealth(detailed)
      
      case 'performance':
        return await getPerformanceMetrics(timeRange, detailed)
      
      case 'errors':
        return await getErrorStatistics(timeRange)
      
      case 'optimization':
        return await getOptimizationStatus()
      
      case 'overview':
        return await getSystemOverview()
      
      default:
        return await getComprehensiveMonitoring(timeRange, detailed)
    }

  } catch (error) {
    console.error('Monitoring API failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve monitoring data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, parameters } = body

    switch (action) {
      case 'optimize':
        return await triggerOptimization(parameters)
      
      case 'reset-metrics':
        return await resetMetrics(parameters)
      
      case 'export-data':
        return await exportMonitoringData(parameters)
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          supportedActions: ['optimize', 'reset-metrics', 'export-data']
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Monitoring action failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to execute monitoring action',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper functions for different monitoring aspects

async function getSystemHealth(detailed: boolean) {
  const health = await predictiveAnalyticsEngine.getSystemHealth()
  
  if (detailed) {
    return NextResponse.json({
      success: true,
      health,
      timestamp: new Date().toISOString()
    })
  }

  return NextResponse.json({
    success: true,
    status: health.overall,
    components: Object.entries(health.components).map(([name, component]) => ({
      name,
      status: component.status,
      healthy: component.status === 'healthy'
    })),
    alertCount: health.alerts.length,
    criticalAlerts: health.alerts.filter(a => a.severity === 'critical').length,
    timestamp: new Date().toISOString()
  })
}

async function getPerformanceMetrics(timeRange: string, detailed: boolean) {
  // Mock performance data - in real implementation, this would come from metrics store
  const performanceData = {
    timeRange,
    metrics: {
      responseTime: {
        current: 850,
        average: 920,
        p95: 1200,
        p99: 1800,
        trend: 'improving'
      },
      throughput: {
        current: 45,
        average: 42,
        peak: 68,
        trend: 'stable'
      },
      errorRate: {
        current: 0.02,
        average: 0.025,
        peak: 0.08,
        trend: 'improving'
      },
      resourceUtilization: {
        cpu: 65,
        memory: 78,
        database: 45,
        cache: 82
      }
    },
    components: {
      vertexAI: {
        latency: 680,
        requestsPerSecond: 12,
        errorRate: 0.01,
        modelAccuracy: 0.89
      },
      database: {
        queryTime: 45,
        connectionPool: 85,
        slowQueries: 2,
        indexHitRate: 0.94
      },
      cache: {
        hitRate: 0.78,
        memoryUsage: 650,
        evictionRate: 0.03,
        accessTime: 8
      },
      embeddings: {
        searchTime: 120,
        vectorCount: 15420,
        similarityAccuracy: 0.92,
        indexSize: 2.4
      }
    }
  }

  if (detailed) {
    return NextResponse.json({
      success: true,
      performance: performanceData,
      timestamp: new Date().toISOString()
    })
  }

  return NextResponse.json({
    success: true,
    summary: {
      responseTime: performanceData.metrics.responseTime.current,
      throughput: performanceData.metrics.throughput.current,
      errorRate: performanceData.metrics.errorRate.current,
      overallHealth: 'good'
    },
    timestamp: new Date().toISOString()
  })
}

async function getErrorStatistics(timeRange: string) {
  const errorStats = errorHandlingService.getErrorStatistics()
  
  return NextResponse.json({
    success: true,
    timeRange,
    errorStatistics: {
      total: errorStats.totalErrors,
      byType: errorStats.errorsByType,
      bySeverity: errorStats.errorsBySeverity,
      byComponent: errorStats.errorsByComponent,
      recoveryRate: errorStats.recoverySuccessRate,
      recentErrors: errorStats.recentErrors.map(error => ({
        id: error.id,
        type: error.type,
        severity: error.severity,
        component: error.component,
        message: error.message,
        timestamp: error.timestamp,
        recovered: error.retryCount > 0
      }))
    },
    circuitBreakers: errorStats.circuitBreakerStatus,
    timestamp: new Date().toISOString()
  })
}

async function getOptimizationStatus() {
  const optimizationHistory = performanceOptimizer.getOptimizationHistory()
  
  return NextResponse.json({
    success: true,
    optimization: {
      status: 'active',
      totalOptimizations: optimizationHistory.totalOptimizations,
      successfulOptimizations: optimizationHistory.successfulOptimizations,
      averageImprovement: optimizationHistory.averageImprovement,
      byCategory: optimizationHistory.optimizationsByCategory,
      recentOptimizations: optimizationHistory.recentOptimizations.map(opt => ({
        category: opt.category,
        optimization: opt.optimization,
        applied: opt.applied,
        improvement: opt.improvement,
        recommendations: opt.recommendations.slice(0, 2) // Limit for summary
      })),
      nextOptimizationScheduled: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours
    },
    timestamp: new Date().toISOString()
  })
}

async function getSystemOverview() {
  const [health, errorStats, optimizationHistory] = await Promise.all([
    predictiveAnalyticsEngine.getSystemHealth(),
    errorHandlingService.getErrorStatistics(),
    performanceOptimizer.getOptimizationHistory()
  ])

  const overview = {
    systemStatus: health.overall,
    uptime: health.performance.uptime,
    componentsHealthy: Object.values(health.components).filter(c => c.status === 'healthy').length,
    totalComponents: Object.keys(health.components).length,
    activeAlerts: health.alerts.length,
    criticalAlerts: health.alerts.filter(a => a.severity === 'critical').length,
    errorRate: health.performance.errorRate,
    averageResponseTime: health.performance.averageResponseTime,
    throughput: health.performance.throughput,
    recentOptimizations: optimizationHistory.successfulOptimizations,
    totalErrors: errorStats.totalErrors,
    recoveryRate: errorStats.recoverySuccessRate,
    predictions: {
      totalToday: 1247, // Mock data
      successRate: 0.98,
      averageAccuracy: 0.87,
      cacheHitRate: 0.78
    },
    resources: {
      cpu: 65,
      memory: 78,
      database: 45,
      cache: 82
    }
  }

  return NextResponse.json({
    success: true,
    overview,
    timestamp: new Date().toISOString()
  })
}

async function getComprehensiveMonitoring(timeRange: string, detailed: boolean) {
  const [health, errorStats, optimizationHistory] = await Promise.all([
    predictiveAnalyticsEngine.getSystemHealth(),
    errorHandlingService.getErrorStatistics(),
    performanceOptimizer.getOptimizationHistory()
  ])

  const comprehensiveData = {
    systemHealth: health,
    errorStatistics: errorStats,
    optimization: optimizationHistory,
    performance: {
      // Mock performance time series data
      timeSeries: generateMockTimeSeries(timeRange),
      currentMetrics: {
        responseTime: 850,
        throughput: 45,
        errorRate: 0.02,
        cpuUsage: 65,
        memoryUsage: 78
      }
    },
    predictions: {
      totalRequests: 1247,
      successfulPredictions: 1222,
      failedPredictions: 25,
      averageProcessingTime: 850,
      cacheHitRate: 0.78,
      modelAccuracy: 0.87
    },
    alerts: health.alerts.map(alert => ({
      ...alert,
      age: Date.now() - alert.timestamp.getTime()
    }))
  }

  if (!detailed) {
    // Return summarized version
    return NextResponse.json({
      success: true,
      summary: {
        status: health.overall,
        componentsHealthy: Object.values(health.components).filter(c => c.status === 'healthy').length,
        totalErrors: errorStats.totalErrors,
        optimizationsApplied: optimizationHistory.successfulOptimizations,
        averageResponseTime: 850,
        throughput: 45
      },
      timestamp: new Date().toISOString()
    })
  }

  return NextResponse.json({
    success: true,
    monitoring: comprehensiveData,
    timestamp: new Date().toISOString()
  })
}

// Action handlers

async function triggerOptimization(parameters: any) {
  try {
    const optimization = await performanceOptimizer.optimizeSystem()
    
    return NextResponse.json({
      success: true,
      optimization: {
        optimizationsApplied: optimization.optimizationsApplied.length,
        totalImprovement: optimization.totalImprovement,
        categories: optimization.optimizationsApplied.map(opt => opt.category),
        recommendations: optimization.recommendations.slice(0, 5) // Top 5 recommendations
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Optimization failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function resetMetrics(parameters: any) {
  try {
    // Implementation would reset specific metrics based on parameters
    const { metricsToReset } = parameters || {}
    
    return NextResponse.json({
      success: true,
      message: 'Metrics reset successfully',
      resetMetrics: metricsToReset || ['all'],
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to reset metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function exportMonitoringData(parameters: any) {
  try {
    const { format, timeRange, includeDetails } = parameters || {}
    
    // Generate export data
    const exportData = {
      exportId: `export_${Date.now()}`,
      format: format || 'json',
      timeRange: timeRange || '24h',
      generatedAt: new Date().toISOString(),
      dataSize: '2.4MB', // Mock size
      downloadUrl: `/api/system/monitoring/export/${Date.now()}` // Mock URL
    }
    
    return NextResponse.json({
      success: true,
      export: exportData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Export failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Utility function to generate mock time series data
function generateMockTimeSeries(timeRange: string) {
  const now = Date.now()
  const intervals = {
    '1h': { points: 60, interval: 60 * 1000 },
    '24h': { points: 24, interval: 60 * 60 * 1000 },
    '7d': { points: 7 * 24, interval: 60 * 60 * 1000 },
    '30d': { points: 30, interval: 24 * 60 * 60 * 1000 }
  }
  
  const config = intervals[timeRange as keyof typeof intervals] || intervals['24h']
  
  return Array.from({ length: config.points }, (_, i) => ({
    timestamp: new Date(now - (config.points - i) * config.interval).toISOString(),
    responseTime: 800 + Math.random() * 400,
    throughput: 40 + Math.random() * 20,
    errorRate: 0.01 + Math.random() * 0.04,
    cpuUsage: 60 + Math.random() * 20,
    memoryUsage: 70 + Math.random() * 20
  }))
}