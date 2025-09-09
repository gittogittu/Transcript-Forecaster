'use client'

import React, { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, Area } from 'recharts'
import { format } from 'date-fns'

export type NodeSeriesPoint = { timestamp: Date; value: number }
export type ForecastNode = {
  id: string
  name: string
  series: NodeSeriesPoint[]
  children?: ForecastNode[]
}

export type MultiDimensionalForecastProps = {
  root: ForecastNode
  height?: number
  className?: string
}

export function MultiDimensionalForecast({ root, height = 280, className = '' }: MultiDimensionalForecastProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [root.id]: true })
  const [selectedNode, setSelectedNode] = useState<ForecastNode>(root)

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const flatten = (node: ForecastNode, depth = 0): Array<{ node: ForecastNode; depth: number }> => {
    const rows = [{ node, depth }]
    if (expanded[node.id]) {
      node.children?.forEach(child => {
        rows.push(...flatten(child, depth + 1))
      })
    }
    return rows
  }

  const rows = useMemo(() => flatten(root), [root, expanded])

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      <div className="md:col-span-1 border rounded-lg p-2 overflow-auto max-h-[420px]">
        {rows.map(({ node, depth }) => (
          <div key={node.id} className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-50 ${selectedNode.id === node.id ? 'bg-blue-50' : ''}`}
            onClick={() => setSelectedNode(node)}
          >
            <div style={{ width: depth * 12 }} />
            {node.children && node.children.length > 0 ? (
              <button className="mr-1 text-gray-600" onClick={(e) => { e.stopPropagation(); toggle(node.id) }}>
                {expanded[node.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <span className="mr-1 w-4" />
            )}
            <span className="text-sm text-gray-800">{node.name}</span>
          </div>
        ))}
      </div>

      <div className="md:col-span-2 border rounded-lg p-3">
        <div className="text-sm font-medium mb-2">{selectedNode.name}</div>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={selectedNode.series} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="timestamp" tickFormatter={(v) => format(new Date(v), 'MMM dd')} stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')} />
              <Legend />
              <Area type="monotone" dataKey="value" name="Value" stroke="#2563eb" fill="#93c5fd" fillOpacity={0.25} dot={false} />
              <Line type="monotone" dataKey="value" name="Value" stroke="#2563eb" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default MultiDimensionalForecast


