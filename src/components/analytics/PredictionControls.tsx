'use client'

import React, { useMemo, useState } from 'react'
import type { ForecastingRequest } from '@/lib/services/forecasting/intelligent-forecasting-engine'

export type PredictionControlsProps = {
  defaultClientId?: string
  onChange?: (req: ForecastingRequest) => void
}

export function PredictionControls({ defaultClientId, onChange }: PredictionControlsProps) {
  const [clientId, setClientId] = useState<string>(defaultClientId || '')
  const [timeHorizon, setTimeHorizon] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('daily')
  const [periodsAhead, setPeriodsAhead] = useState<number>(30)
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.9)
  const [ensembleMethod, setEnsembleMethod] = useState<'simple_average' | 'weighted_average' | 'stacking' | 'voting'>('weighted_average')

  const request = useMemo<ForecastingRequest>(() => ({
    clientId: clientId || undefined,
    timeHorizon,
    periodsAhead,
    confidenceLevel,
    ensembleMethod
  }), [clientId, timeHorizon, periodsAhead, confidenceLevel, ensembleMethod])

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-600">Client ID</label>
        <input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          onBlur={() => onChange?.(request)}
          placeholder="optional"
          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-600">Time Horizon</label>
        <select
          value={timeHorizon}
          onChange={(e) => { setTimeHorizon(e.target.value as any); onChange?.({ ...request, timeHorizon: e.target.value as any }) }}
          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-600">Periods Ahead</label>
        <input
          type="number"
          value={periodsAhead}
          min={1}
          max={365}
          onChange={(e) => { const v = parseInt(e.target.value || '1', 10); setPeriodsAhead(v); onChange?.({ ...request, periodsAhead: v }) }}
          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-600">Confidence</label>
        <input
          type="number"
          step="0.01"
          min={0.5}
          max={0.99}
          value={confidenceLevel}
          onChange={(e) => { const v = parseFloat(e.target.value || '0.9'); setConfidenceLevel(v); onChange?.({ ...request, confidenceLevel: v }) }}
          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-600">Ensemble</label>
        <select
          value={ensembleMethod}
          onChange={(e) => { const v = e.target.value as any; setEnsembleMethod(v); onChange?.({ ...request, ensembleMethod: v }) }}
          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
        >
          <option value="simple_average">Simple average</option>
          <option value="weighted_average">Weighted average</option>
          <option value="stacking">Stacking</option>
          <option value="voting">Voting</option>
        </select>
      </div>
    </div>
  )
}

export default PredictionControls


