'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface DashboardData {
  totalTranscripts: number
  thisMonth: number
  avgHandlingTime: number
  activeClients: number
  lastSync: string
  syncStatus: 'success' | 'warning' | 'error'
  monthlyGrowth: number
  predictions: {
    nextMonth: number
    confidence: number
  }
  recentActivity: Array<{
    id: string
    type: 'import' | 'export' | 'sync' | 'prediction'
    description: string
    timestamp: string
    status: 'success' | 'warning' | 'error'
  }>
}

export function useDashboardData() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const response = await fetch('/api/analytics/dashboard', {
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
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      
      // Fallback to mock data if API fails
      setData({
        totalTranscripts: 0,
        thisMonth: 0,
        avgHandlingTime: 0,
        activeClients: 0,
        lastSync: 'Never',
        syncStatus: 'error',
        monthlyGrowth: 0,
        predictions: {
          nextMonth: 0,
          confidence: 0
        },
        recentActivity: []
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [session])

  const refetch = () => {
    setLoading(true)
    fetchDashboardData()
  }

  return {
    data,
    loading,
    error,
    refetch
  }
}