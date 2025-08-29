'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface DataSummary {
  totalRecords: number
  lastUpdated: string
  dataQuality: number
  activeClients: number
  thisMonthEntries: number
  recentEntries: Array<{
    id: string
    clientName: string
    date: string
    count: number
    type: string
  }>
}

export function useDataSummary() {
  const { data: session } = useSession()
  const [data, setData] = useState<DataSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDataSummary = async () => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const response = await fetch('/api/analytics/data-summary', {
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
        throw new Error(result.error || 'Failed to fetch data summary')
      }
    } catch (err) {
      console.error('Error fetching data summary:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      
      // Fallback to empty data if API fails
      setData({
        totalRecords: 0,
        lastUpdated: 'Never',
        dataQuality: 0,
        activeClients: 0,
        thisMonthEntries: 0,
        recentEntries: []
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDataSummary()
  }, [session])

  const refetch = () => {
    setLoading(true)
    fetchDataSummary()
  }

  return {
    data,
    loading,
    error,
    refetch
  }
}