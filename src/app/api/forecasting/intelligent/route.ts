import { NextRequest, NextResponse } from 'next/server'
import { intelligentForecastingEngine } from '@/lib/services/forecasting/intelligent-forecasting-engine'
import type { ForecastingRequest, TimeSeriesData } from '@/lib/services/forecasting/intelligent-forecasting-engine'
import { createPerformanceMonitor } from '@/lib/services/performance-monitoring'
import { getPredictionCache } from '@/lib/cache/prediction-cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, forecastRequest }: { data: TimeSeriesData; forecastRequest: ForecastingRequest } = body

    // Validate input
    if (!data || !forecastRequest) {
      return NextResponse.json(
        { error: 'Missing required data or forecast request' },
        { status: 400 }
      )
    }

    const monitor = createPerformanceMonitor()
    const startTime = Date.now()

    // Caching: try exact/similar reuse
    const cache = getPredictionCache()
    const cacheKey = {
      clientId: forecastRequest.clientId,
      timeHorizon: forecastRequest.timeHorizon,
      periodsAhead: forecastRequest.periodsAhead,
      confidenceLevel: forecastRequest.confidenceLevel
    } as const

    const cacheProbe = cache.getSimilar<any>(cacheKey, data.values)
    if (cacheProbe.hit) {
      const latencyMs = Date.now() - startTime
      const memoryUsageMb = Math.round((process.memoryUsage?.().rss || 0) / (1024 * 1024))
      const throughput = latencyMs > 0 ? Number((1000 / latencyMs).toFixed(3)) : 0

      const modelId = forecastRequest.clientId || 'intelligent_engine'

      await monitor.recordMetrics({
        id: `forecast_${modelId}_${Date.now()}`,
        timestamp: new Date(),
        modelId,
        clientId: forecastRequest.clientId,
        predictionLatency: latencyMs,
        memoryUsage: memoryUsageMb,
        cpuUsage: 0,
        throughput,
        accuracy: {
          mae: cacheProbe.value?.accuracy?.mae ?? 0,
          rmse: cacheProbe.value?.accuracy?.rmse ?? 0,
          mape: cacheProbe.value?.accuracy?.mape ?? 0,
          r2Score: cacheProbe.value?.accuracy?.r2Score ?? 0,
          accuracyScore: cacheProbe.value?.accuracy?.r2Score ?? 0,
          confidenceScore: forecastRequest.confidenceLevel
        },
        resourceUtilization: {
          vertexAIEndpointLatency: 0,
          neonDBQueryTime: 0,
          vectorSearchTime: 0,
          cacheHitRate: 100,
          errorRate: 0,
          concurrentRequests: 1
        }
      })

      const res = NextResponse.json({
        success: true,
        forecast: cacheProbe.value,
        cache: { hit: true, similarity: cacheProbe.similarity ?? 1 },
        timestamp: new Date().toISOString()
      })
      res.headers.set('X-Cache', 'HIT')
      return res
    }

    // Generate forecast using intelligent engine
    const result = await intelligentForecastingEngine.generateForecast(data, forecastRequest)

    // Store in cache (gzip compressed)
    cache.set(cacheKey, data.values, result)

    const latencyMs = Date.now() - startTime
    const memoryUsageMb = Math.round((process.memoryUsage?.().rss || 0) / (1024 * 1024))
    const cpuUsagePercent = 0 // Not reliably measurable per-request; placeholder
    const throughput = latencyMs > 0 ? Number((1000 / latencyMs).toFixed(3)) : 0

    const modelId = forecastRequest.clientId || 'intelligent_engine'

    await monitor.recordMetrics({
      id: `forecast_${modelId}_${Date.now()}`,
      timestamp: new Date(),
      modelId,
      clientId: forecastRequest.clientId,
      predictionLatency: latencyMs,
      memoryUsage: memoryUsageMb,
      cpuUsage: cpuUsagePercent,
      throughput,
      accuracy: {
        mae: result.accuracy.mae,
        rmse: result.accuracy.rmse,
        mape: result.accuracy.mape,
        r2Score: result.accuracy.r2Score,
        accuracyScore: result.accuracy.r2Score,
        confidenceScore: forecastRequest.confidenceLevel
      },
      resourceUtilization: {
        vertexAIEndpointLatency: 0,
        neonDBQueryTime: 0,
        vectorSearchTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        concurrentRequests: 1
      }
    })

    const res = NextResponse.json({
      success: true,
      forecast: result,
      cache: { hit: false },
      timestamp: new Date().toISOString()
    })
    res.headers.set('X-Cache', 'MISS')
    return res
  } catch (error) {
    console.error('Error in intelligent forecasting API:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate intelligent forecast',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    
    // Return available forecasting algorithms and their capabilities
    const capabilities = {
      algorithms: [
        {
          type: 'automl_forecasting',
          description: 'Google Vertex AI AutoML time-series forecasting',
          bestFor: 'Large datasets with complex patterns',
          accuracy: 'High',
          trainingTime: 'Long'
        },
        {
          type: 'arima',
          description: 'AutoRegressive Integrated Moving Average',
          bestFor: 'Stationary time series with clear trends',
          accuracy: 'Medium-High',
          trainingTime: 'Fast'
        },
        {
          type: 'prophet',
          description: 'Facebook Prophet for seasonal forecasting',
          bestFor: 'Data with strong seasonal patterns and holidays',
          accuracy: 'High',
          trainingTime: 'Medium'
        },
        {
          type: 'lstm',
          description: 'Long Short-Term Memory neural networks',
          bestFor: 'Complex non-linear patterns and long sequences',
          accuracy: 'High',
          trainingTime: 'Long'
        },
        {
          type: 'linear_regression',
          description: 'Simple linear regression on time series',
          bestFor: 'Simple trends and small datasets',
          accuracy: 'Medium',
          trainingTime: 'Very Fast'
        }
      ],
      ensembleMethods: [
        {
          type: 'simple_average',
          description: 'Equal weight average of all models'
        },
        {
          type: 'weighted_average',
          description: 'Accuracy-weighted average of models'
        },
        {
          type: 'stacking',
          description: 'Meta-model learns optimal combination'
        },
        {
          type: 'voting',
          description: 'Use best performing model only'
        }
      ],
      timeHorizons: ['daily', 'weekly', 'monthly', 'quarterly'],
      maxPeriodsAhead: 365,
      supportedFeatures: [
        'Automatic algorithm selection',
        'Ensemble methods',
        'Seasonality detection',
        'Anomaly detection',
        'Confidence intervals',
        'Model explanations',
        'Automatic retraining'
      ]
    }

    return NextResponse.json({
      success: true,
      capabilities,
      clientId: clientId || null
    })
  } catch (error) {
    console.error('Error getting forecasting capabilities:', error)
    
    return NextResponse.json(
      { error: 'Failed to get forecasting capabilities' },
      { status: 500 }
    )
  }
}