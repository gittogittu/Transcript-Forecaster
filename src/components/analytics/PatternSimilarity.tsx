'use client'

import React from 'react'
import type { SimilarityResult } from '@/lib/hooks/use-pattern-similarity'

type PatternSimilarityProps = {
  results: SimilarityResult[]
  className?: string
  onSelect?: (item: SimilarityResult) => void
}

export function PatternSimilarity({ results, className = '', onSelect }: PatternSimilarityProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {results.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect?.(r)}
          className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                {r.metadata?.title || r.transcriptId || r.id}
              </div>
              {r.metadata?.summary && (
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">{r.metadata.summary}</div>
              )}
            </div>
            <div className="w-40">
              <div className="text-xs text-gray-500 mb-1">Similarity {Math.round((r.score || 0) * 100)}%</div>
              <div className="h-2 bg-gray-100 rounded">
                <div
                  className="h-2 bg-blue-500 rounded"
                  style={{ width: `${Math.min(100, Math.max(0, Math.round((r.score || 0) * 100)))}%` }}
                />
              </div>
            </div>
          </div>
        </button>
      ))}
      {results.length === 0 && (
        <div className="text-sm text-gray-500">No similar patterns found.</div>
      )}
    </div>
  )
}

export default PatternSimilarity


