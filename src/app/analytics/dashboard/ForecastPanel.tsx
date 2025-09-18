'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { PredictionControls } from '@/components/analytics/PredictionControls'
import { PredictionChart } from '@/components/analytics/charts/PredictionChart'
import { VisualizationConfig, PredictionComparisonData } from '@/components/analytics/dashboard/types'
import useForecast from '@/lib/hooks/use-forecast'

type ForecastPanelProps = {
  className?: string
}

export default function ForecastPanel({ className = '' }: ForecastPanelProps) {
  const { loading, error, result, cacheInfo, runForecast } = useForecast()
  const [config, setConfig] = useState<VisualizationConfig>({
    showConfidenceBands: true,
    showAnomalies: true,
    showPredictions: true,
    showActuals: false,
    animations: true
  })

  const [clientRequest, setClientRequest] = useState<any | null>(null)

  const handleControlsChange = useCallback((req: any) => {
    setClientRequest(req)
  }, [])

  const handleRun = useCallback(async () => {
    if (!clientRequest) return
    // Simple demo data: generate a small time series
    const now = new Date()
    const timestamps = Array.from({ length: 30 }, (_, i) => new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000))
    const values = timestamps.map((_, i) => 100 + Math.sin(i / 3) * 10 + (i % 7 === 0 ? 5 : 0))
    await runForecast({ timestamps, values, clientId: clientRequest.clientId }, clientRequest)
  }, [clientRequest, runForecast])

  const chartData: PredictionComparisonData | null = useMemo(() => {
    if (!result) return null
    const predicted = (result.predictions || []).map((p) => ({
      timestamp: new Date(p.date as any),
      predicted: p.predictedValue,
      confidenceUpper: p.confidenceInterval?.upper,
      confidenceLower: p.confidenceInterval?.lower
    }))
    const accuracy = result.accuracy || { mae: 0, rmse: 0, mape: 0, r2Score: 0 }
    return { actual: [], predicted, accuracy }
  }, [result])

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Forecast Playground</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {cacheInfo && (
            <span>
              Cache: {cacheInfo.hit ? 'HIT' : 'MISS'}{cacheInfo.similarity !== undefined ? ` (${Math.round((cacheInfo.similarity || 0) * 100)}%)` : ''}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <PredictionControls onChange={handleControlsChange} />

        <div className="flex items-center gap-3">
          <button
            onClick={handleRun}
            disabled={loading || !clientRequest}
            className={`px-3 py-2 rounded-md text-sm font-medium ${loading || !clientRequest ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {loading ? 'Running…' : 'Run Forecast'}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>

        {chartData && (
          <PredictionChart data={chartData} config={config} height={360} />
        )}
      </div>
    </div>
  )
}


