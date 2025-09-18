import { NextRequest, NextResponse } from 'next/server'
import type { ForecastingRequest, TimeSeriesData } from '@/lib/services/forecasting/intelligent-forecasting-engine'
import { intelligentForecastingEngine } from '@/lib/services/forecasting/intelligent-forecasting-engine'
import { createPerformanceMonitor } from '@/lib/services/performance-monitoring'

type BatchItem = {
  id: string
  data: TimeSeriesData
  forecastRequest: ForecastingRequest
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const items: BatchItem[] = Array.isArray(body?.items) ? body.items : []

    if (!items.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    const monitor = createPerformanceMonitor()
    const startedAt = Date.now()

    const results = await Promise.all(items.map(async (item) => {
      const start = Date.now()
      try {
        const forecast = await intelligentForecastingEngine.generateForecast(item.data, item.forecastRequest)
        const latency = Date.now() - start
        await monitor.recordMetrics({
          id: `batch_${item.id}_${Date.now()}`,
          timestamp: new Date(),
          modelId: item.forecastRequest.clientId || 'intelligent_engine',
          clientId: item.forecastRequest.clientId,
          predictionLatency: latency,
          memoryUsage: 0,
          cpuUsage: 0,
          throughput: latency > 0 ? Number((1000 / latency).toFixed(3)) : 0,
          accuracy: {
            mae: forecast.accuracy.mae,
            rmse: forecast.accuracy.rmse,
            mape: forecast.accuracy.mape,
            r2Score: forecast.accuracy.r2Score,
            accuracyScore: forecast.accuracy.r2Score,
            confidenceScore: item.forecastRequest.confidenceLevel
          },
          resourceUtilization: {
            vertexAIEndpointLatency: 0,
            neonDBQueryTime: 0,
            vectorSearchTime: 0,
            cacheHitRate: 0,
            errorRate: 0,
            concurrentRequests: items.length
          }
        })

        return { id: item.id, success: true, forecast }
      } catch (err) {
        return { id: item.id, success: false, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    }))

    const totalLatency = Date.now() - startedAt
    return NextResponse.json({
      success: true,
      results,
      stats: { totalLatencyMs: totalLatency, itemsProcessed: items.length }
    })
  } catch (error) {
    console.error('Error in batch predictions API:', error)
    return NextResponse.json({ error: 'Failed to process batch' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: '/api/predictions/batch',
      request: {
        items: [
          { id: 'string', data: { timestamps: [], values: [] }, forecastRequest: { timeHorizon: 'daily', periodsAhead: 30, confidenceLevel: 0.9 } }
        ]
      },
      limits: { maxItems: 50 }
    }
  })
}


