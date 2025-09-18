import React from 'react'
import type { HeatMapConfig } from '@/types/multi-dimensional-forecasting'

interface HeatMapProps {
  data: Array<{ x: string | number; y: string | number; value: number }>
  config: HeatMapConfig
}

function colorFor(value: number, domain: [number, number], colors: string[]) {
  const [min, max] = domain
  const t = Math.min(1, Math.max(0, (value - min) / (max - min || 1)))
  const idx = Math.min(colors.length - 1, Math.floor(t * (colors.length - 1)))
  return colors[idx]
}

export const HeatMap: React.FC<HeatMapProps> = ({ data, config }) => {
  const xs = Array.from(new Set(data.map((d) => d.x)))
  const ys = Array.from(new Set(data.map((d) => d.y)))
  const values = data.map((d) => d.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const domain = config.colorScale.domain || [min, max]
  const colors = config.colorScale.colors

  const cellVal = (x: any, y: any) => {
    const found = data.find((d) => d.x === x && d.y === y)
    return found ? found.value : 0
  }

  return (
    <div className="overflow-auto border rounded-md">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left">{config.xAxis} \\ {config.yAxis}</th>
            {xs.map((x) => (
              <th key={String(x)} className="px-3 py-2 text-left">{String(x)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ys.map((y) => (
            <tr key={String(y)}>
              <td className="px-3 py-2 font-medium">{String(y)}</td>
              {xs.map((x) => {
                const v = cellVal(x, y)
                const bg = colorFor(v, domain as [number, number], colors)
                return (
                  <td key={String(x)} className="px-3 py-2" style={{ backgroundColor: bg }} title={String(v)}>
                    &nbsp;
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


