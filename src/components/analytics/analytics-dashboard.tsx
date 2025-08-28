'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Target,
  AlertCircle
} from 'lucide-react'
import { useRealtimeAnalytics } from '@/lib/hooks/use-analytics'
import { useTranscripts } from '@/lib/hooks/use-transcripts'
import { TrendChart } from './trend-chart'
import { PredictionChart } from './prediction-chart'
import { InteractiveChart } from './interactive-chart'
import { SummaryStatistics } from './summary-statistics'
import { AnimatedChartContainer } from '@/components/animations'

interface AnalyticsDashboardProps {
  className?: string
}

interface FilterState {
  clientName?: string
  startDate?: string
  endDate?: string
  transcriptType?: string
  timeRange: '7d' | '30d' | '90d' | '1y' | 'all'
}

const timeRangeOptions = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' },
]

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [filters, setFilters] = useState<FilterState>({
    timeRange: '30d'
  })
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Calculate date range based on time range filter
  const dateRange = useMemo(() => {
    const now = new Date()
    const ranges = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      '1y': new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      'all': null
    }
    
    const startDate = ranges[filters.timeRange]
    return startDate ? {
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    } : {}
  }, [filters.timeRange])

  // Combine filters with date range
  const apiFilters = useMemo(() => ({
    ...filters,
    ...dateRange,
    ...(selectedClients.length > 0 && { clientName: selectedClients[0] }) // API currently supports single client
  }), [filters, dateRange, selectedClients])

  // Fetch data with real-time updates
  const { data: transcripts, isLoading: transcriptsLoading } = useTranscripts(apiFilters)
  const {
    trends,
    predictions,
    summary,
    isLoading: analyticsLoading,
    refetchAll
  } = useRealtimeAnalytics(apiFilters)

  const isLoading = transcriptsLoading || analyticsLoading

  // Get unique clients for filter dropdown
  const availableClients = useMemo(() => {
    if (!transcripts?.data) return []
    const clients = [...new Set(transcripts.data.map(t => t.clientName))]
    return clients.sort()
  }, [transcripts?.data])

  // Get unique transcript types for filter dropdown
  const availableTypes = useMemo(() => {
    if (!transcripts?.data) return []
    const types = [...new Set(transcripts.data.map(t => t.transcriptType).filter(Boolean))]
    return types.sort()
  }, [transcripts?.data])

  // Transform data for charts (fix the year/month issue)
  const chartData = useMemo(() => {
    if (!transcripts?.data) return []
    
    return transcripts.data.map(item => ({
      ...item,
      year: new Date(item.date).getFullYear(),
      month: String(new Date(item.date).getMonth() + 1).padStart(2, '0')
    }))
  }, [transcripts?.data])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetchAll()
    setIsRefreshing(false)
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }))
  }

  const handleClientToggle = (client: string) => {
    setSelectedClients(prev => 
      prev.includes(client) 
        ? prev.filter(c => c !== client)
        : [...prev, client]
    )
  }

  const clearFilters = () => {
    setFilters({ timeRange: '30d' })
    setSelectedClients([])
  }

  const exportData = () => {
    // TODO: Implement data export functionality
    console.log('Export data:', { filters, selectedClients })
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time insights and predictions for transcript data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter data by date range, client, and transcript type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Time Range */}
            <div className="space-y-2">
              <Label>Time Range</Label>
              <Select
                value={filters.timeRange}
                onValueChange={(value) => handleFilterChange('timeRange', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client Filter */}
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={filters.clientName || ''}
                onValueChange={(value) => handleFilterChange('clientName', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {availableClients.map(client => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transcript Type Filter */}
            <div className="space-y-2">
              <Label>Transcript Type</Label>
              <Select
                value={filters.transcriptType || ''}
                onValueChange={(value) => handleFilterChange('transcriptType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {availableTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            <div className="space-y-2">
              <Label>Custom Date</Label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                placeholder="Start date"
              />
            </div>
          </div>

          {/* Selected Clients */}
          {selectedClients.length > 0 && (
            <div className="mt-4">
              <Label className="text-sm font-medium">Selected Clients:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedClients.map(client => (
                  <Badge
                    key={client}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleClientToggle(client)}
                  >
                    {client} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {(filters.clientName || filters.transcriptType || filters.startDate || selectedClients.length > 0) && (
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading analytics data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {(trends.isError || predictions.isError || summary.isError) && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>Error loading analytics data. Please try refreshing.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Content */}
      {!isLoading && chartData.length > 0 && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Summary Statistics */}
            <SummaryStatistics
              data={chartData}
              timeRange={filters.timeRange}
              selectedClients={selectedClients}
            />

            {/* Quick Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatedChartContainer>
                <TrendChart
                  data={chartData}
                  selectedClients={selectedClients}
                  height={300}
                />
              </AnimatedChartContainer>
              
              <AnimatedChartContainer>
                <InteractiveChart
                  data={chartData}
                  selectedClients={selectedClients}
                  title="Interactive Trend Analysis"
                  description="Click and drag to zoom, use brush to navigate"
                  height={300}
                  enableZoom={true}
                  enableBrush={true}
                />
              </AnimatedChartContainer>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <TrendChart
                data={chartData}
                selectedClients={selectedClients}
                showGrid={true}
                showLegend={true}
                height={500}
              />
              
              <InteractiveChart
                data={chartData}
                selectedClients={selectedClients}
                title="Detailed Trend Analysis"
                description="Interactive chart with zoom and brush controls"
                height={400}
                enableZoom={true}
                enableBrush={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            {predictions.data && (
              <PredictionChart
                historicalData={chartData}
                predictionData={predictions.data}
                selectedClient={filters.clientName}
                showConfidenceInterval={true}
                showHistorical={true}
                height={500}
              />
            )}
            
            {!predictions.data && (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No prediction data available. Generate predictions to see forecasts.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            {/* Client Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Client Analysis
                </CardTitle>
                <CardDescription>
                  Select clients to compare their transcript volumes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {availableClients.map(client => (
                    <Button
                      key={client}
                      variant={selectedClients.includes(client) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleClientToggle(client)}
                      className="justify-start"
                    >
                      {client}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Client Comparison Charts */}
            {selectedClients.length > 0 && (
              <div className="space-y-6">
                <TrendChart
                  data={chartData}
                  selectedClients={selectedClients}
                  showGrid={true}
                  showLegend={true}
                  height={400}
                />
                
                <InteractiveChart
                  data={chartData}
                  selectedClients={selectedClients}
                  title="Client Comparison"
                  description="Compare transcript volumes across selected clients"
                  height={400}
                  enableZoom={true}
                  enableBrush={true}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!isLoading && chartData.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground mb-4">
                No transcript data found for the selected filters.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}