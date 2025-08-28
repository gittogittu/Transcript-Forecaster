'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  LineChart, 
  PieChart, 
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Eye,
  EyeOff
} from 'lucide-react'

import { TrendChart, PredictionChart, InteractiveChart } from '@/components/analytics'
import { AHTDashboard } from '@/components/analytics/aht-dashboard'
import { useTranscripts, useTranscriptSummary } from '@/lib/hooks/use-transcripts'
import { PredictionResult } from '@/types/transcript'
import { clientPredictionService } from '@/lib/services/prediction-service-client'

// Time range options
const TIME_RANGES = [
  { value: '3m', label: '3 Months', months: 3 },
  { value: '6m', label: '6 Months', months: 6 },
  { value: '12m', label: '12 Months', months: 12 },
  { value: '24m', label: '24 Months', months: 24 },
  { value: 'all', label: 'All Time', months: null }
]

// Chart view types
const CHART_VIEWS = [
  { value: 'trend', label: 'Trend Analysis', icon: LineChart },
  { value: 'interactive', label: 'Interactive View', icon: BarChart3 },
  { value: 'prediction', label: 'Predictions', icon: TrendingUp }
]

interface AnalyticsFilters {
  timeRange: string
  selectedClients: string[]
  chartView: string
  showPredictions: boolean
}

interface SummaryStats {
  totalTranscripts: number
  totalClients: number
  averagePerMonth: number
  growthRate: number
  topClient: string
  topClientCount: number
}

// Import the simple version temporarily
export { default } from './page-simple'

function AnalyticsPage() {
  // State management
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: '12m',
    selectedClients: [],
    chartView: 'trend',
    showPredictions: false
  })
  
  const [predictions, setPredictions] = useState<PredictionResult[]>([])
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState(false)
  const [isPredictionServiceReady, setIsPredictionServiceReady] = useState(false)

  // Data fetching
  const { data: transcripts = [], isLoading, error, refetch } = useTranscripts()
  const { data: summary } = useTranscriptSummary()

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (!transcripts.length) return []
    
    let filtered = transcripts
    
    // Apply time range filter
    if (filters.timeRange !== 'all') {
      const range = TIME_RANGES.find(r => r.value === filters.timeRange)
      if (range?.months) {
        const cutoffDate = new Date()
        cutoffDate.setMonth(cutoffDate.getMonth() - range.months)
        
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.year, parseInt(item.month) - 1)
          return itemDate >= cutoffDate
        })
      }
    }
    
    // Apply client filter
    if (filters.selectedClients.length > 0) {
      filtered = filtered.filter(item => 
        filters.selectedClients.includes(item.clientName)
      )
    }
    
    return filtered
  }, [transcripts, filters.timeRange, filters.selectedClients])

  // Get unique client names for filtering
  const clientNames = useMemo(() => {
    const names = new Set(transcripts.map(item => item.clientName))
    return Array.from(names).sort()
  }, [transcripts])

  // Calculate summary statistics
  const summaryStats = useMemo((): SummaryStats => {
    if (!filteredData.length) {
      return {
        totalTranscripts: 0,
        totalClients: 0,
        averagePerMonth: 0,
        growthRate: 0,
        topClient: '',
        topClientCount: 0
      }
    }

    const totalTranscripts = filteredData.reduce((sum, item) => sum + item.transcriptCount, 0)
    const uniqueClients = new Set(filteredData.map(item => item.clientName))
    const totalClients = uniqueClients.size

    // Calculate monthly average
    const monthsSet = new Set(filteredData.map(item => `${item.year}-${item.month}`))
    const averagePerMonth = monthsSet.size > 0 ? totalTranscripts / monthsSet.size : 0

    // Calculate growth rate (comparing first and last month)
    const sortedData = [...filteredData].sort((a, b) => {
      const dateA = new Date(a.year, parseInt(a.month) - 1)
      const dateB = new Date(b.year, parseInt(b.month) - 1)
      return dateA.getTime() - dateB.getTime()
    })

    let growthRate = 0
    if (sortedData.length >= 2) {
      const firstMonthData = sortedData.filter(item => 
        item.year === sortedData[0].year && item.month === sortedData[0].month
      )
      const lastMonthData = sortedData.filter(item => 
        item.year === sortedData[sortedData.length - 1].year && 
        item.month === sortedData[sortedData.length - 1].month
      )
      
      const firstMonthTotal = firstMonthData.reduce((sum, item) => sum + item.transcriptCount, 0)
      const lastMonthTotal = lastMonthData.reduce((sum, item) => sum + item.transcriptCount, 0)
      
      if (firstMonthTotal > 0) {
        growthRate = ((lastMonthTotal - firstMonthTotal) / firstMonthTotal) * 100
      }
    }

    // Find top client
    const clientTotals = new Map<string, number>()
    filteredData.forEach(item => {
      const current = clientTotals.get(item.clientName) || 0
      clientTotals.set(item.clientName, current + item.transcriptCount)
    })

    let topClient = ''
    let topClientCount = 0
    for (const [client, count] of clientTotals) {
      if (count > topClientCount) {
        topClient = client
        topClientCount = count
      }
    }

    return {
      totalTranscripts,
      totalClients,
      averagePerMonth: Math.round(averagePerMonth),
      growthRate: Math.round(growthRate * 100) / 100,
      topClient,
      topClientCount
    }
  }, [filteredData])

  // Generate predictions
  const handleGeneratePredictions = async () => {
    if (!transcripts.length) return
    
    setIsGeneratingPredictions(true)
    try {
      // Initialize prediction service if not ready
      if (!isPredictionServiceReady) {
        await clientPredictionService.initialize()
        setIsPredictionServiceReady(true)
      }

      const clientsToPredict = filters.selectedClients.length > 0 
        ? filters.selectedClients 
        : clientNames.slice(0, 5) // Limit to top 5 clients for performance

      const predictionPromises = clientsToPredict.map(async (clientName) => {
        try {
          return await clientPredictionService.generatePredictions(clientName, transcripts, {
            monthsAhead: 6,
            modelType: 'linear'
          })
        } catch (error) {
          console.warn(`Failed to generate predictions for ${clientName}:`, error)
          return null
        }
      })

      const results = await Promise.all(predictionPromises)
      setPredictions(results.filter(Boolean) as PredictionResult[])
    } catch (error) {
      console.error('Failed to generate predictions:', error)
    } finally {
      setIsGeneratingPredictions(false)
    }
  }

  // Handle client selection
  const handleClientToggle = (clientName: string) => {
    setFilters(prev => ({
      ...prev,
      selectedClients: prev.selectedClients.includes(clientName)
        ? prev.selectedClients.filter(name => name !== clientName)
        : [...prev.selectedClients, clientName]
    }))
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">Failed to load analytics data</p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div 
      className="container mx-auto p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive analysis of transcript data and trends
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              {/* Time Range */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <Select
                  value={filters.timeRange}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, timeRange: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_RANGES.map(range => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chart View */}
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <Select
                  value={filters.chartView}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, chartView: value }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_VIEWS.map(view => {
                      const Icon = view.icon
                      return (
                        <SelectItem key={view.value} value={view.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {view.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Predictions Toggle */}
              <Button
                variant={filters.showPredictions ? "default" : "outline"}
                onClick={() => setFilters(prev => ({ ...prev, showPredictions: !prev.showPredictions }))}
                className="flex items-center gap-2"
              >
                {filters.showPredictions ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Predictions
              </Button>

              {/* Generate Predictions */}
              {filters.showPredictions && (
                <Button
                  onClick={handleGeneratePredictions}
                  disabled={isGeneratingPredictions}
                  variant="outline"
                >
                  {isGeneratingPredictions ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TrendingUp className="h-4 w-4 mr-2" />
                  )}
                  Generate
                </Button>
              )}
            </div>

            {/* Client Selection */}
            {clientNames.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Select Clients:</p>
                <div className="flex flex-wrap gap-2">
                  {clientNames.map(clientName => (
                    <Badge
                      key={clientName}
                      variant={filters.selectedClients.includes(clientName) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/80"
                      onClick={() => handleClientToggle(clientName)}
                    >
                      {clientName}
                      {filters.selectedClients.includes(clientName) && (
                        <span className="ml-1">✓</span>
                      )}
                    </Badge>
                  ))}
                  {filters.selectedClients.length > 0 && (
                    <Badge
                      variant="destructive"
                      className="cursor-pointer"
                      onClick={() => setFilters(prev => ({ ...prev, selectedClients: [] }))}
                    >
                      Clear All
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Statistics */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Transcripts</p>
                  <p className="text-2xl font-bold">{summaryStats.totalTranscripts.toLocaleString()}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                  <p className="text-2xl font-bold">{summaryStats.totalClients}</p>
                </div>
                <PieChart className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Average</p>
                  <p className="text-2xl font-bold">{summaryStats.averagePerMonth}</p>
                </div>
                <LineChart className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Growth Rate</p>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    {summaryStats.growthRate > 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    {Math.abs(summaryStats.growthRate)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Key Insights */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>
              Automated analysis of your transcript data trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summaryStats.topClient && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>
                    <strong>{summaryStats.topClient}</strong> is your top client with{' '}
                    <strong>{summaryStats.topClientCount}</strong> transcripts in the selected period.
                  </span>
                </div>
              )}
              
              {summaryStats.growthRate !== 0 && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  summaryStats.growthRate > 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {summaryStats.growthRate > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span>
                    Transcript volume has {summaryStats.growthRate > 0 ? 'increased' : 'decreased'} by{' '}
                    <strong>{Math.abs(summaryStats.growthRate)}%</strong> over the selected period.
                  </span>
                </div>
              )}

              {summaryStats.averagePerMonth > 0 && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <span>
                    You're processing an average of <strong>{summaryStats.averagePerMonth}</strong> transcripts per month.
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AHT Analytics Section */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Average Handling Time (AHT) Analytics</CardTitle>
            <CardDescription>
              Client performance insights based on historical AHT data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AHTDashboard />
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts */}
      <motion.div variants={itemVariants}>
        <AnimatePresence mode="wait">
          <motion.div
            key={filters.chartView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {filters.chartView === 'trend' && (
              <TrendChart
                data={filteredData}
                selectedClients={filters.selectedClients}
                timeRange={filters.timeRange !== 'all' ? {
                  start: new Date(Date.now() - (TIME_RANGES.find(r => r.value === filters.timeRange)?.months || 12) * 30 * 24 * 60 * 60 * 1000),
                  end: new Date()
                } : undefined}
                height={500}
              />
            )}

            {filters.chartView === 'interactive' && (
              <InteractiveChart
                data={filteredData}
                selectedClients={filters.selectedClients}
                title="Interactive Transcript Analysis"
                description="Zoom and explore your transcript data with interactive controls"
                height={500}
                enableZoom={true}
                enableBrush={true}
              />
            )}

            {filters.chartView === 'prediction' && (
              <div className="space-y-6">
                {predictions.length > 0 ? (
                  predictions.map((prediction, index) => (
                    <motion.div
                      key={prediction.clientName}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <PredictionChart
                        historicalData={filteredData.filter(d => d.clientName === prediction.clientName)}
                        predictionData={prediction.predictions.map(p => ({
                          clientName: prediction.clientName,
                          month: p.month,
                          year: p.year,
                          predictedCount: p.predictedCount,
                          confidenceInterval: p.confidenceInterval
                        }))}
                        selectedClient={prediction.clientName}
                        showConfidenceInterval={true}
                        showHistorical={true}
                        height={400}
                      />
                    </motion.div>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Predictions Generated</h3>
                      <p className="text-muted-foreground mb-4">
                        Click "Generate" to create predictions for your selected clients
                      </p>
                      <Button onClick={handleGeneratePredictions} disabled={isGeneratingPredictions}>
                        {isGeneratingPredictions ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <TrendingUp className="h-4 w-4 mr-2" />
                        )}
                        Generate Predictions
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span>Loading analytics data...</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

// Temporarily disabled due to build issues
// export default AnalyticsPage