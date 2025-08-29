'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface PredictionResult {
  id: string
  type: string
  forecast: number
  confidence: number
  period: string
  generatedAt: string
  accuracy?: number
}

interface PredictionsData {
  totalPredictions: number
  avgConfidence: number
  avgAccuracy: number
  predictions: PredictionResult[]
  generatedPredictions: {
    nextMonth: { value: number; confidence: number }
    nextQuarter: { value: number; confidence: number }
  }
}

export function usePredictionsData() {
  const { data: session } = useSession()
  const [data, setData] = useState<PredictionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPredictionsData = async () => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const response = await fetch('/api/analytics/predictions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch predictions data')
      }
    } catch (err) {
      console.error('Error fetching predictions data:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      
      // Fallback to empty data if API fails
      setData({
        totalPredictions: 0,
        avgConfidence: 0,
        avgAccuracy: 0,
        predictions: [],
        generatedPredictions: {
          nextMonth: { value: 0, confidence: 0 },
          nextQuarter: { value: 0, confidence: 0 }
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const generatePrediction = async (type: string, period: string, config: any) => {
    try {
      const response = await fetch('/api/analytics/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, period, config })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        // Refresh the data to include the new prediction
        await fetchPredictionsData()
        return result.data
      } else {
        throw new Error(result.error || 'Failed to generate prediction')
      }
    } catch (err) {
      console.error('Error generating prediction:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchPredictionsData()
  }, [session])

  const refetch = () => {
    setLoading(true)
    fetchPredictionsData()
  }

  return {
    data,
    loading,
    error,
    refetch,
    generatePrediction
  }
}