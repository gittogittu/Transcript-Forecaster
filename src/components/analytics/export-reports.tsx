'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ExportWizard } from './export-wizard'
import { ExportOptions, exportService, AnalyticsData } from '@/lib/services/export-service'
import { useTranscripts } from '@/lib/hooks/use-transcripts'
import { usePredictions } from '@/lib/hooks/use-predictions'
import { TranscriptData, PredictionResult } from '@/types/transcript'

interface ExportReportsProps {
  className?: string
}

export function ExportReports({ className }: ExportReportsProps) {
  const [isExporting, setIsExporting] = useState(false)
  
  // Fetch data using existing hooks
  const { data: transcripts = [], isLoading: transcriptsLoading } = useTranscripts()
  const { data: predictions = [], isLoading: predictionsLoading } = usePredictions()

  // Get unique clients from transcript data
  const availableClients = Array.from(
    new Set(transcripts.map(t => t.clientName))
  ).sort()

  const handleExport = async (options: ExportOptions) => {
    setIsExporting(true)
    
    try {
      // Filter data based on options
      const filteredData = await prepareExportData(transcripts, predictions, options)
      
      // Export the data
      const result = await exportService.exportData(filteredData, options)
      
      if (result.success && result.data) {
        // Download the file
        const mimeType = options.format === 'csv' 
          ? 'text/csv' 
          : 'application/pdf'
        
        exportService.downloadFile(result.data, result.filename, mimeType)
        
        toast.success(`Export completed successfully! Downloaded ${result.filename}`)
      } else {
        throw new Error(result.error || 'Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const prepareExportData = async (
    allTranscripts: TranscriptData[],
    allPredictions: PredictionResult[],
    options: ExportOptions
  ): Promise<AnalyticsData> => {
    // Filter transcripts by date range
    let filteredTranscripts = allTranscripts
    if (options.dateRange) {
      filteredTranscripts = allTranscripts.filter(t => {
        const transcriptDate = new Date(t.date)
        return transcriptDate >= options.dateRange!.start && transcriptDate <= options.dateRange!.end
      })
    }

    // Filter by selected clients
    if (options.clients && options.clients.length > 0) {
      filteredTranscripts = filteredTranscripts.filter(t => 
        options.clients!.includes(t.clientName)
      )
    }

    // Filter predictions similarly
    let filteredPredictions = allPredictions
    if (options.dateRange) {
      filteredPredictions = allPredictions.filter(p => {
        return p.predictions.some(pred => {
          const predDate = new Date(pred.date)
          return predDate >= options.dateRange!.start && predDate <= options.dateRange!.end
        })
      })
    }

    if (options.clients && options.clients.length > 0) {
      filteredPredictions = filteredPredictions.filter(p => 
        options.clients!.includes(p.clientName)
      )
    }

    // Calculate summary statistics
    const summary = calculateSummaryStatistics(filteredTranscripts, options.dateRange)

    return {
      transcripts: filteredTranscripts,
      predictions: options.includePredictions ? filteredPredictions : undefined,
      summary
    }
  }

  const calculateSummaryStatistics = (transcripts: TranscriptData[], dateRange?: { start: Date; end: Date }) => {
    const totalTranscripts = transcripts.reduce((sum, t) => sum + t.transcriptCount, 0)
    
    // Calculate date range for average calculation
    const dates = transcripts.map(t => new Date(t.date))
    const minDate = dateRange?.start || (dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date())
    const maxDate = dateRange?.end || (dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date())
    const daysDiff = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)))
    
    const averagePerDay = totalTranscripts / daysDiff

    // Find peak day
    const dailyTotals = transcripts.reduce((acc, t) => {
      const dateKey = t.date.toString().split('T')[0] // Get date part only
      acc[dateKey] = (acc[dateKey] || 0) + t.transcriptCount
      return acc
    }, {} as Record<string, number>)

    const peakDay = Object.entries(dailyTotals).reduce(
      (peak, [date, count]) => count > peak.count ? { date, count } : peak,
      { date: minDate.toISOString().split('T')[0], count: 0 }
    )

    // Client breakdown
    const clientTotals = transcripts.reduce((acc, t) => {
      acc[t.clientName] = (acc[t.clientName] || 0) + t.transcriptCount
      return acc
    }, {} as Record<string, number>)

    const clientBreakdown = Object.entries(clientTotals)
      .map(([client, count]) => ({
        client,
        count,
        percentage: totalTranscripts > 0 ? (count / totalTranscripts) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)

    return {
      totalTranscripts,
      averagePerDay,
      peakDay,
      clientBreakdown,
      dateRange: {
        start: minDate.toISOString().split('T')[0],
        end: maxDate.toISOString().split('T')[0]
      }
    }
  }

  if (transcriptsLoading || predictionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-2">Loading data...</span>
      </div>
    )
  }

  if (transcripts.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No transcript data available for export.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <ExportWizard
        availableClients={availableClients}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </div>
  )
}