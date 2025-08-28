import { TranscriptData, PredictionResult } from '@/types/transcript'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export interface ExportOptions {
  format: 'csv' | 'pdf'
  dateRange?: {
    start: Date
    end: Date
  }
  clients?: string[]
  includeAnalytics?: boolean
  includePredictions?: boolean
  includeCharts?: boolean
}

export interface ExportResult {
  success: boolean
  data?: Blob | string
  filename: string
  error?: string
}

export interface AnalyticsData {
  transcripts: TranscriptData[]
  predictions?: PredictionResult[]
  summary: {
    totalTranscripts: number
    averagePerDay: number
    peakDay: { date: string; count: number }
    clientBreakdown: { client: string; count: number; percentage: number }[]
    dateRange: { start: string; end: string }
  }
}

export class ExportService {
  /**
   * Export data in the specified format
   */
  async exportData(data: AnalyticsData, options: ExportOptions): Promise<ExportResult> {
    try {
      const filename = this.generateFilename(options)
      
      if (options.format === 'csv') {
        const csvData = this.generateCSV(data, options)
        return {
          success: true,
          data: csvData,
          filename: `${filename}.csv`
        }
      } else if (options.format === 'pdf') {
        const pdfBlob = await this.generatePDF(data, options)
        return {
          success: true,
          data: pdfBlob,
          filename: `${filename}.pdf`
        }
      }
      
      throw new Error(`Unsupported export format: ${options.format}`)
    } catch (error) {
      return {
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : 'Export failed'
      }
    }
  }

  /**
   * Generate CSV data
   */
  private generateCSV(data: AnalyticsData, options: ExportOptions): string {
    const lines: string[] = []
    
    // Add header with export info
    lines.push('# Transcript Analytics Export')
    lines.push(`# Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`)
    if (options.dateRange) {
      lines.push(`# Date Range: ${format(options.dateRange.start, 'yyyy-MM-dd')} to ${format(options.dateRange.end, 'yyyy-MM-dd')}`)
    }
    lines.push('')

    // Summary statistics
    if (options.includeAnalytics) {
      lines.push('# Summary Statistics')
      lines.push(`Total Transcripts,${data.summary.totalTranscripts}`)
      lines.push(`Average Per Day,${data.summary.averagePerDay.toFixed(2)}`)
      lines.push(`Peak Day,${data.summary.peakDay.date}`)
      lines.push(`Peak Day Count,${data.summary.peakDay.count}`)
      lines.push('')

      // Client breakdown
      lines.push('# Client Breakdown')
      lines.push('Client,Count,Percentage')
      data.summary.clientBreakdown.forEach(client => {
        lines.push(`${client.client},${client.count},${client.percentage.toFixed(1)}%`)
      })
      lines.push('')
    }

    // Transcript data
    lines.push('# Transcript Data')
    lines.push('Date,Client,Count,Type,Notes')
    data.transcripts.forEach(transcript => {
      const date = format(new Date(transcript.date), 'yyyy-MM-dd')
      const client = this.escapeCsvField(transcript.clientName)
      const type = this.escapeCsvField(transcript.transcriptType || '')
      const notes = this.escapeCsvField(transcript.notes || '')
      lines.push(`${date},${client},${transcript.transcriptCount},${type},${notes}`)
    })

    // Predictions data
    if (options.includePredictions && data.predictions) {
      lines.push('')
      lines.push('# Predictions Data')
      lines.push('Date,Client,Predicted Count,Confidence Lower,Confidence Upper,Model Type,Accuracy')
      data.predictions.forEach(prediction => {
        prediction.predictions.forEach(pred => {
          const date = format(new Date(pred.date), 'yyyy-MM-dd')
          const client = this.escapeCsvField(prediction.clientName)
          lines.push(`${date},${client},${pred.predictedCount},${pred.confidenceInterval.lower},${pred.confidenceInterval.upper},${prediction.modelType},${prediction.accuracy || 'N/A'}`)
        })
      })
    }

    return lines.join('\n')
  }

  /**
   * Generate PDF report
   */
  private async generatePDF(data: AnalyticsData, options: ExportOptions): Promise<Blob> {
    const doc = new jsPDF()
    let yPosition = 20

    // Title
    doc.setFontSize(20)
    doc.text('Transcript Analytics Report', 20, yPosition)
    yPosition += 15

    // Export info
    doc.setFontSize(10)
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 20, yPosition)
    yPosition += 8
    
    if (options.dateRange) {
      doc.text(`Date Range: ${format(options.dateRange.start, 'yyyy-MM-dd')} to ${format(options.dateRange.end, 'yyyy-MM-dd')}`, 20, yPosition)
      yPosition += 15
    } else {
      yPosition += 10
    }

    // Summary statistics
    if (options.includeAnalytics) {
      doc.setFontSize(14)
      doc.text('Summary Statistics', 20, yPosition)
      yPosition += 10

      doc.setFontSize(10)
      doc.text(`Total Transcripts: ${data.summary.totalTranscripts}`, 20, yPosition)
      yPosition += 6
      doc.text(`Average Per Day: ${data.summary.averagePerDay.toFixed(2)}`, 20, yPosition)
      yPosition += 6
      doc.text(`Peak Day: ${data.summary.peakDay.date} (${data.summary.peakDay.count} transcripts)`, 20, yPosition)
      yPosition += 15

      // Client breakdown table
      doc.setFontSize(12)
      doc.text('Client Breakdown', 20, yPosition)
      yPosition += 10

      const clientTableData = data.summary.clientBreakdown.map(client => [
        client.client,
        client.count.toString(),
        `${client.percentage.toFixed(1)}%`
      ])

      ;(doc as any).autoTable({
        head: [['Client', 'Count', 'Percentage']],
        body: clientTableData,
        startY: yPosition,
        theme: 'grid',
        styles: { fontSize: 9 }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 15
    }

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }

    // Transcript data table
    doc.setFontSize(12)
    doc.text('Transcript Data', 20, yPosition)
    yPosition += 10

    const transcriptTableData = data.transcripts.map(transcript => [
      format(new Date(transcript.date), 'yyyy-MM-dd'),
      transcript.clientName,
      transcript.transcriptCount.toString(),
      transcript.transcriptType || '',
      (transcript.notes || '').substring(0, 30) + (transcript.notes && transcript.notes.length > 30 ? '...' : '')
    ])

    ;(doc as any).autoTable({
      head: [['Date', 'Client', 'Count', 'Type', 'Notes']],
      body: transcriptTableData,
      startY: yPosition,
      theme: 'grid',
      styles: { fontSize: 8 },
      columnStyles: {
        4: { cellWidth: 40 } // Notes column
      }
    })

    // Predictions table
    if (options.includePredictions && data.predictions) {
      yPosition = (doc as any).lastAutoTable.finalY + 15
      
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.text('Predictions Data', 20, yPosition)
      yPosition += 10

      const predictionTableData: string[][] = []
      data.predictions.forEach(prediction => {
        prediction.predictions.forEach(pred => {
          predictionTableData.push([
            format(new Date(pred.date), 'yyyy-MM-dd'),
            prediction.clientName,
            pred.predictedCount.toString(),
            `${pred.confidenceInterval.lower}-${pred.confidenceInterval.upper}`,
            prediction.modelType,
            prediction.accuracy ? prediction.accuracy.toFixed(3) : 'N/A'
          ])
        })
      })

      ;(doc as any).autoTable({
        head: [['Date', 'Client', 'Predicted', 'Confidence', 'Model', 'Accuracy']],
        body: predictionTableData,
        startY: yPosition,
        theme: 'grid',
        styles: { fontSize: 8 }
      })
    }

    return new Blob([doc.output('blob')], { type: 'application/pdf' })
  }

  /**
   * Escape CSV field to handle commas and quotes
   */
  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`
    }
    return field
  }

  /**
   * Generate filename based on options
   */
  private generateFilename(options: ExportOptions): string {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    let filename = `transcript-analytics_${timestamp}`
    
    if (options.dateRange) {
      const start = format(options.dateRange.start, 'yyyy-MM-dd')
      const end = format(options.dateRange.end, 'yyyy-MM-dd')
      filename += `_${start}_to_${end}`
    }
    
    if (options.clients && options.clients.length > 0) {
      const clientSuffix = options.clients.length === 1 
        ? `_${options.clients[0].replace(/[^a-zA-Z0-9]/g, '_')}`
        : `_${options.clients.length}_clients`
      filename += clientSuffix
    }
    
    return filename
  }

  /**
   * Download file to user's device
   */
  downloadFile(data: Blob | string, filename: string, mimeType: string): void {
    const blob = typeof data === 'string' 
      ? new Blob([data], { type: mimeType })
      : data

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export const exportService = new ExportService()