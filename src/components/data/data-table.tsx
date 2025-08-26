"use client"

import React, { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TranscriptData, TranscriptFilters } from '@/types/transcript'
import { ChevronUp, ChevronDown, Search, Filter, RotateCcw } from 'lucide-react'
import { TableSkeleton, StaggeredList, FadeInView, AnimatedButton } from '@/components/animations'

interface DataTableProps {
  data: TranscriptData[]
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
}

type SortField = keyof TranscriptData
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

export function DataTable({ data, loading = false, error = null, onRefresh }: DataTableProps) {
  // State for filtering, sorting, and pagination
  const [filters, setFilters] = useState<TranscriptFilters>({})
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'month', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let result = [...data]

    // Apply search filter
    if (searchTerm) {
      result = result.filter(item =>
        item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.month.includes(searchTerm) ||
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply filters
    if (filters.clientName) {
      result = result.filter(item =>
        item.clientName.toLowerCase().includes(filters.clientName!.toLowerCase())
      )
    }

    if (filters.startMonth) {
      result = result.filter(item => item.month >= filters.startMonth!)
    }

    if (filters.endMonth) {
      result = result.filter(item => item.month <= filters.endMonth!)
    }

    if (filters.minCount !== undefined) {
      result = result.filter(item => item.transcriptCount >= filters.minCount!)
    }

    if (filters.maxCount !== undefined) {
      result = result.filter(item => item.transcriptCount <= filters.maxCount!)
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortConfig.field]
      const bValue = b[sortConfig.field]

      if (aValue === bValue) return 0

      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })

    return result
  }, [data, filters, sortConfig, searchTerm])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage)

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [filters, searchTerm, sortConfig])

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleFilterChange = (key: keyof TranscriptFilters, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }))
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) return null
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="ml-1 h-4 w-4" /> : 
      <ChevronDown className="ml-1 h-4 w-4" />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error loading data: {error}</p>
            {onRefresh && (
              <AnimatedButton onClick={onRefresh} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </AnimatedButton>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <FadeInView>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Historical Transcript Data</span>
            {onRefresh && (
              <AnimatedButton onClick={onRefresh} variant="outline" size="sm">
                <RotateCcw className="mr-2 h-4 w-4" />
                Refresh
              </AnimatedButton>
            )}
          </CardTitle>
        </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search clients, months, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={clearFilters}
              variant="outline"
              className="whitespace-nowrap"
            >
              <Filter className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Client name..."
              value={filters.clientName || ''}
              onChange={(e) => handleFilterChange('clientName', e.target.value)}
            />
            <Input
              type="month"
              placeholder="Start month"
              value={filters.startMonth || ''}
              onChange={(e) => handleFilterChange('startMonth', e.target.value)}
            />
            <Input
              type="month"
              placeholder="End month"
              value={filters.endMonth || ''}
              onChange={(e) => handleFilterChange('endMonth', e.target.value)}
            />
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min count"
                value={filters.minCount || ''}
                onChange={(e) => handleFilterChange('minCount', e.target.value ? parseInt(e.target.value) : undefined)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Max count"
                value={filters.maxCount || ''}
                onChange={(e) => handleFilterChange('maxCount', e.target.value ? parseInt(e.target.value) : undefined)}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('clientName')}
                >
                  <div className="flex items-center">
                    Client Name
                    <SortIcon field="clientName" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('month')}
                >
                  <div className="flex items-center">
                    Month
                    <SortIcon field="month" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none text-right"
                  onClick={() => handleSort('transcriptCount')}
                >
                  <div className="flex items-center justify-end">
                    Transcript Count
                    <SortIcon field="transcriptCount" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center">
                    Created
                    <SortIcon field="createdAt" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('updatedAt')}
                >
                  <div className="flex items-center">
                    Updated
                    <SortIcon field="updatedAt" />
                  </div>
                </TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-4">
                    <TableSkeleton rows={itemsPerPage} />
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {filteredAndSortedData.length === 0 && data.length > 0 
                      ? "No data matches your filters" 
                      : "No transcript data available"}
                  </TableCell>
                </TableRow>
              ) : (
                <StaggeredList staggerDelay={0.05}>
                  {paginatedData.map((item, index) => (
                    <TableRow key={item.id || `${item.clientName}-${item.month}-${index}`}>
                      <TableCell className="font-medium">{item.clientName}</TableCell>
                      <TableCell>{item.month}</TableCell>
                      <TableCell className="text-right">{item.transcriptCount.toLocaleString()}</TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>{formatDate(item.updatedAt)}</TableCell>
                      <TableCell className="max-w-xs truncate" title={item.notes}>
                        {item.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </StaggeredList>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!loading && paginatedData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => setItemsPerPage(parseInt(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map(option => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} results
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </FadeInView>
  )
}