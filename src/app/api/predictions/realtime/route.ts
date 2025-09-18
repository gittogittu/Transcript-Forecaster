import { NextRequest, NextResponse } from 'next/server'
import type { ForecastingRequest, TimeSeriesData } from '@/lib/services/forecasting/intelligent-forecasting-engine'
import { intelligentForecastingEngine } from '@/lib/services/forecasting/intelligent-forecasting-engine'
import { getPredictionCache } from '@/lib/cache/prediction-cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, forecastRequest }: { data: TimeSeriesData; forecastRequest: ForecastingRequest } = body

    if (!data || !forecastRequest) {
      return NextResponse.json(
        { error: 'Missing required data or forecast request' },
        { status: 400 }
      )
    }

    const cache = getPredictionCache()
    const cacheKey = {
      clientId: forecastRequest.clientId,
      timeHorizon: forecastRequest.timeHorizon,
      periodsAhead: forecastRequest.periodsAhead,
      confidenceLevel: forecastRequest.confidenceLevel
    } as const

    const cacheProbe = cache.getSimilar<any>(cacheKey, data.values)
    if (cacheProbe.hit) {
      const res = NextResponse.json({
        success: true,
        forecast: cacheProbe.value,
        cache: { hit: true, similarity: cacheProbe.similarity ?? 1 },
        timestamp: new Date().toISOString()
      })
      res.headers.set('X-Cache', 'HIT')
      return res
    }

    const result = await intelligentForecastingEngine.generateForecast(data, forecastRequest)
    cache.set(cacheKey, data.values, result)

    const res = NextResponse.json({
      success: true,
      forecast: result,
      cache: { hit: false },
      timestamp: new Date().toISOString()
    })
    res.headers.set('X-Cache', 'MISS')
    return res
  } catch (error) {
    console.error('Error in realtime predictions API:', error)
    return NextResponse.json({ error: 'Failed to generate realtime prediction' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: '/api/predictions/realtime',
      description: 'Low-latency predictions with cache-first strategy'
    }
  })
}


