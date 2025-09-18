import { useCallback, useMemo, useState } from 'react'
import type {
  ForecastingRequest,
  ForecastingResult,
  TimeSeriesData
} from '@/lib/services/forecasting/intelligent-forecasting-engine'

type UseForecastOptions = {
  endpoint?: '/api/predictions/forecast' | '/api/predictions/realtime'
}

export function useForecast(options: UseForecastOptions = {}) {
  const endpoint = options.endpoint || '/api/predictions/forecast'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ForecastingResult | null>(null)
  const [cacheInfo, setCacheInfo] = useState<{ hit: boolean; similarity?: number } | null>(null)

  const runForecast = useCallback(async (data: TimeSeriesData, forecastRequest: ForecastingRequest) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, forecastRequest })
      })

      if (!res.ok) {
        const details = await res.json().catch(() => ({}))
        throw new Error(details?.error || `Request failed with ${res.status}`)
      }

      const json = await res.json()
      setResult(json.forecast as ForecastingResult)
      setCacheInfo(json.cache || null)
      return json.forecast as ForecastingResult
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  const state = useMemo(() => ({ loading, error, result, cacheInfo }), [loading, error, result, cacheInfo])

  return { ...state, runForecast }
}

export default useForecast


