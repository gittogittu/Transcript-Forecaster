"use client"

import React, { useState, useEffect } from 'react'
import { DataTable } from './data-table'
import { MobileDataTable } from './mobile-data-table'
import { TranscriptData, TranscriptFilters } from '@/types/transcript'
import { useTranscripts } from '@/lib/hooks/use-transcripts'

interface ResponsiveDataTableProps {
  filters?: TranscriptFilters
  onRefresh?: () => void
}

export function ResponsiveDataTable({ filters = {}, onRefresh }: ResponsiveDataTableProps) {
  const [isMobile, setIsMobile] = useState(false)
  const { data = [], isLoading, error, refetch } = useTranscripts(filters)

  // Check if screen is mobile size
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  const handleRefresh = () => {
    refetch()
    onRefresh?.()
  }

  // Apply additional client-side filtering if needed
  const filteredData = React.useMemo(() => {
    let result = data

    // The useTranscripts hook already applies most filters,
    // but we can add any additional filtering logic here if needed

    return result
  }, [data])

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile filters could be added here */}
        <MobileDataTable 
          data={filteredData} 
          loading={isLoading}
        />
      </div>
    )
  }

  return (
    <DataTable
      data={filteredData}
      loading={isLoading}
      error={error?.message || null}
      onRefresh={handleRefresh}
    />
  )
}

// Export individual components for direct use
export { DataTable } from './data-table'
export { MobileDataTable } from './mobile-data-table'