"use client"

import React from 'react'
import { ResponsiveDataTable } from '@/components/data/responsive-data-table'
import { TranscriptFilters } from '@/types/transcript'

export function DataTableExample() {
  const [filters, setFilters] = React.useState<TranscriptFilters>({})

  const handleRefresh = () => {
    console.log('Refreshing data...')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Historical Transcript Data</h1>
        <p className="text-gray-600 mt-2">
          View and analyze historical transcript data with advanced filtering and sorting capabilities.
        </p>
      </div>

      <ResponsiveDataTable 
        filters={filters}
        onRefresh={handleRefresh}
      />
    </div>
  )
}