import { useCallback, useMemo, useState } from 'react'

type SearchFilters = {
  clientId?: string
  dateRange?: { startDate: string; endDate: string }
}

export type SimilarityResult = {
  id: string
  score: number
  transcriptId?: string
  metadata?: Record<string, any>
}

export function usePatternSimilarity() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SimilarityResult[]>([])

  const searchByQuery = useCallback(async (query: string, filters?: SearchFilters) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/embeddings/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, filters, limit: 10, threshold: 0.6 })
      })
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      const json = await res.json()
      setResults(json?.data?.results || [])
      return json?.data?.results || []
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const findSimilarToTranscript = useCallback(async (transcriptId: string, limit = 10) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/embeddings/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptId, limit })
      })
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      const json = await res.json()
      setResults(json?.data?.results || [])
      return json?.data?.results || []
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return useMemo(() => ({ loading, error, results, searchByQuery, findSimilarToTranscript }), [loading, error, results, searchByQuery, findSimilarToTranscript])
}

export default usePatternSimilarity


