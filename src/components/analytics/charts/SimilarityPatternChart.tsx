'use client'

import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  Area
} from 'recharts'
import { format } from 'date-fns'

type SeriesPoint = {
  timestamp: Date
  value: number
}

export type BaseSeries = {
  id: string
  name?: string
  points: SeriesPoint[]
}

export type SimilarSeries = BaseSeries & {
  similarityScore?: number
  color?: string
}

export type SimilarityPatternChartProps = {
  base: BaseSeries
  similars: SimilarSeries[]
  alignOn?: 'start' | 'end' | 'none'
  showArea?: boolean
  height?: number
  className?: string
}

type ChartRow = {
  timestamp: Date
  base?: number
  [key: `similar_${string}`]: number | Date | undefined
}

const COLORS = [
  '#16a34a', '#ea580c', '#a855f7', '#0891b2', '#ef4444', '#f59e0b', '#0ea5e9'
]

export function SimilarityPatternChart({
  base,
  similars,
  alignOn = 'none',
  showArea = true,
  height = 320,
  className = ''
}: SimilarityPatternChartProps) {
  const chartData = useMemo<ChartRow[]>(() => {
    const maxLen = Math.max(base.points.length, ...similars.map(s => s.points.length))
    const toIndexAligned = (series: SeriesPoint[], len: number, align: 'start' | 'end' | 'none') => {
      if (align === 'start' || align === 'none') return series
      // end align: pad at start
      const pad = len - series.length
      const empty: SeriesPoint[] = Array.from({ length: Math.max(0, pad) }, (_, i) => ({
        timestamp: new Date(base.points[0]?.timestamp || new Date()),
        value: NaN
      }))
      return [...empty, ...series]
    }

    const alignedBase = toIndexAligned(base.points, maxLen, alignOn)
    const alignedSimilars = similars.map(s => ({ ...s, points: toIndexAligned(s.points, maxLen, alignOn) }))

    const rows: ChartRow[] = []
    for (let i = 0; i < maxLen; i++) {
      const row: ChartRow = {
        timestamp: alignedBase[i]?.timestamp || alignedSimilars[0]?.points[i]?.timestamp || new Date(),
        base: isFinite(alignedBase[i]?.value as number) ? alignedBase[i]?.value : undefined
      }
      alignedSimilars.forEach(s => {
        const key = `similar_${s.id}` as const
        row[key] = isFinite(s.points[i]?.value as number) ? s.points[i]?.value : undefined
      })
      rows.push(row)
    }
    return rows
  }, [base.points, similars, alignOn])

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(v) => format(new Date(v), 'MMM dd')}
            stroke="#666"
          />
          <YAxis stroke="#666" />
          <Tooltip
            formatter={(value: any, name: string) => [
              typeof value === 'number' ? (value as number).toFixed(2) : value,
              name
            ]}
            labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
          />
          <Legend />

          {showArea && (
            <Area type="monotone" dataKey="base" name={base.name || 'Base'} stroke="#2563eb" fill="#93c5fd" fillOpacity={0.25} dot={false} />
          )}
          {!showArea && (
            <Line type="monotone" dataKey="base" name={base.name || 'Base'} stroke="#2563eb" strokeWidth={2} dot={false} />
          )}

          {similars.map((s, idx) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={`similar_${s.id}`}
              name={`${s.name || 'Similar'}${s.similarityScore != null ? ` (${Math.round((s.similarityScore || 0) * 100)}%)` : ''}`}
              stroke={s.color || COLORS[idx % COLORS.length]}
              strokeDasharray="5 3"
              strokeWidth={2}
              dot={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default SimilarityPatternChart


