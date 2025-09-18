import React from 'react'
import type { PivotTableConfig } from '@/types/multi-dimensional-forecasting'

interface PivotTableProps {
  data: any[]
  config: PivotTableConfig
}

export const PivotTable: React.FC<PivotTableProps> = ({ data, config }) => {
  const rows = config.rows
  const cols = config.columns
  const valueKey = config.values[0]

  // Simple pivot: group by first row and column fields
  const rowKey = rows[0]
  const colKey = cols[0]
  const rowGroups = Array.from(new Set(data.map((d) => d[rowKey])))
  const colGroups = Array.from(new Set(data.map((d) => d[colKey])))

  const cellValue = (r: any, c: any) => {
    const items = data.filter((d) => d[rowKey] === r && d[colKey] === c)
    if (items.length === 0) return 0
    if (config.aggregationMethod === 'sum') {
      return items.reduce((acc, d) => acc + (d[valueKey] || 0), 0)
    }
    if (config.aggregationMethod === 'average' || config.aggregationMethod === 'weighted_average') {
      const sum = items.reduce((acc, d) => acc + (d[valueKey] || 0), 0)
      return sum / items.length
    }
    return items[0][valueKey] || 0
  }

  return (
    <div className="overflow-auto border rounded-md">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left">{rowKey} \\ {colKey}</th>
            {colGroups.map((c) => (
              <th key={String(c)} className="px-3 py-2 text-left">{String(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowGroups.map((r) => (
            <tr key={String(r)}>
              <td className="px-3 py-2 font-medium">{String(r)}</td>
              {colGroups.map((c) => (
                <td key={String(c)} className="px-3 py-2">{cellValue(r, c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


