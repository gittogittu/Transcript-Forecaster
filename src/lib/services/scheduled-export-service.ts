import { ExportOptions, exportService, AnalyticsData } from './export-service'
import { subDays, subWeeks, subMonths, format } from 'date-fns'

export interface ScheduledExport {
  id: string
  name: string
  description?: string
  schedule: ScheduleConfig
  exportOptions: ExportOptions
  recipients: string[]
  isActive: boolean
  lastRun?: Date
  nextRun?: Date
  createdAt: Date
  createdBy: string
}

export interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string // HH:mm format
  dayOfWeek?: number // 0-6 for weekly (0 = Sunday)
  dayOfMonth?: number // 1-31 for monthly
  timezone: string
}

export interface ScheduledExportResult {
  exportId: string
  success: boolean
  filename?: string
  error?: string
  executedAt: Date
}

export class ScheduledExportService {
  private exports: Map<string, ScheduledExport> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Create a new scheduled export
   */
  async createScheduledExport(config: Omit<ScheduledExport, 'id' | 'createdAt' | 'nextRun'>): Promise<string> {
    const id = this.generateId()
    const scheduledExport: ScheduledExport = {
      ...config,
      id,
      createdAt: new Date(),
      nextRun: this.calculateNextRun(config.schedule)
    }

    this.exports.set(id, scheduledExport)
    
    if (scheduledExport.isActive) {
      this.scheduleExport(scheduledExport)
    }

    return id
  }

  /**
   * Update an existing scheduled export
   */
  async updateScheduledExport(id: string, updates: Partial<ScheduledExport>): Promise<boolean> {
    const existingExport = this.exports.get(id)
    if (!existingExport) {
      return false
    }

    const updatedExport = {
      ...existingExport,
      ...updates,
      nextRun: updates.schedule ? this.calculateNextRun(updates.schedule) : existingExport.nextRun
    }

    this.exports.set(id, updatedExport)

    // Reschedule if active
    this.clearSchedule(id)
    if (updatedExport.isActive) {
      this.scheduleExport(updatedExport)
    }

    return true
  }

  /**
   * Delete a scheduled export
   */
  async deleteScheduledExport(id: string): Promise<boolean> {
    const scheduledExport = this.exports.get(id)
    if (!scheduledExport) {
      return false
    }

    this.clearSchedule(id)
    this.exports.delete(id)
    return true
  }

  /**
   * Get all scheduled exports
   */
  getScheduledExports(): ScheduledExport[] {
    return Array.from(this.exports.values())
  }

  /**
   * Get a specific scheduled export
   */
  getScheduledExport(id: string): ScheduledExport | undefined {
    return this.exports.get(id)
  }

  /**
   * Execute a scheduled export immediately
   */
  async executeScheduledExport(id: string): Promise<ScheduledExportResult> {
    const scheduledExport = this.exports.get(id)
    if (!scheduledExport) {
      return {
        exportId: id,
        success: false,
        error: 'Scheduled export not found',
        executedAt: new Date()
      }
    }

    try {
      // Fetch data based on export options
      const analyticsData = await this.prepareAnalyticsData(scheduledExport.exportOptions)
      
      // Generate export
      const result = await exportService.exportData(analyticsData, scheduledExport.exportOptions)
      
      if (result.success && result.data) {
        // In a real implementation, you would send this via email or save to a file system
        // For now, we'll just log the success
        console.log(`Scheduled export ${id} completed: ${result.filename}`)
        
        // Update last run time
        scheduledExport.lastRun = new Date()
        scheduledExport.nextRun = this.calculateNextRun(scheduledExport.schedule)
        this.exports.set(id, scheduledExport)

        // Reschedule next run
        if (scheduledExport.isActive) {
          this.scheduleExport(scheduledExport)
        }

        return {
          exportId: id,
          success: true,
          filename: result.filename,
          executedAt: new Date()
        }
      } else {
        throw new Error(result.error || 'Export failed')
      }
    } catch (error) {
      console.error(`Scheduled export ${id} failed:`, error)
      return {
        exportId: id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date()
      }
    }
  }

  /**
   * Start all active scheduled exports
   */
  startScheduler(): void {
    for (const scheduledExport of this.exports.values()) {
      if (scheduledExport.isActive) {
        this.scheduleExport(scheduledExport)
      }
    }
  }

  /**
   * Stop all scheduled exports
   */
  stopScheduler(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
  }

  /**
   * Schedule a single export
   */
  private scheduleExport(scheduledExport: ScheduledExport): void {
    if (!scheduledExport.nextRun) {
      return
    }

    const now = new Date()
    const delay = scheduledExport.nextRun.getTime() - now.getTime()

    if (delay <= 0) {
      // Should run immediately
      this.executeScheduledExport(scheduledExport.id)
      return
    }

    const timer = setTimeout(() => {
      this.executeScheduledExport(scheduledExport.id)
    }, delay)

    this.timers.set(scheduledExport.id, timer)
  }

  /**
   * Clear schedule for a specific export
   */
  private clearSchedule(id: string): void {
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }
  }

  /**
   * Calculate next run time based on schedule
   */
  private calculateNextRun(schedule: ScheduleConfig): Date {
    const now = new Date()
    const [hours, minutes] = schedule.time.split(':').map(Number)

    let nextRun = new Date()
    nextRun.setHours(hours, minutes, 0, 0)

    switch (schedule.frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1)
        }
        break

      case 'weekly':
        const targetDayOfWeek = schedule.dayOfWeek || 0
        const currentDayOfWeek = nextRun.getDay()
        let daysUntilTarget = targetDayOfWeek - currentDayOfWeek

        if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextRun <= now)) {
          daysUntilTarget += 7
        }

        nextRun.setDate(nextRun.getDate() + daysUntilTarget)
        break

      case 'monthly':
        const targetDayOfMonth = schedule.dayOfMonth || 1
        nextRun.setDate(targetDayOfMonth)

        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1)
          nextRun.setDate(targetDayOfMonth)
        }
        break
    }

    return nextRun
  }

  /**
   * Prepare analytics data for export
   */
  private async prepareAnalyticsData(options: ExportOptions): Promise<AnalyticsData> {
    // Determine date range based on export options or use default
    let dateRange = options.dateRange
    if (!dateRange) {
      // Default to last 30 days
      dateRange = {
        start: subDays(new Date(), 30),
        end: new Date()
      }
    }

    // Fetch transcript data via API call
    const transcripts = await this.fetchTranscriptsViaAPI({
      dateRange,
      clients: options.clients
    })

    // Calculate summary statistics
    const summary = this.calculateSummaryStatistics(transcripts, dateRange)

    return {
      transcripts,
      predictions: options.includePredictions ? [] : undefined, // TODO: Fetch predictions
      summary
    }
  }

  /**
   * Fetch transcripts via API call (works on both client and server)
   */
  private async fetchTranscriptsViaAPI(params: {
    dateRange: { start: Date; end: Date }
    clients?: string[]
  }): Promise<any[]> {
    try {
      const searchParams = new URLSearchParams({
        start: params.dateRange.start.toISOString(),
        end: params.dateRange.end.toISOString()
      })

      if (params.clients && params.clients.length > 0) {
        searchParams.append('clients', params.clients.join(','))
      }

      const response = await fetch(`/api/transcripts?${searchParams}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch transcripts: ${response.statusText}`)
      }

      const data = await response.json()
      return data.transcripts || []
    } catch (error) {
      console.error('Error fetching transcripts for export:', error)
      return []
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummaryStatistics(transcripts: any[], dateRange: { start: Date; end: Date }) {
    const totalTranscripts = transcripts.reduce((sum, t) => sum + t.transcript_count, 0)
    
    const daysDiff = Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)))
    const averagePerDay = totalTranscripts / daysDiff

    // Find peak day
    const dailyTotals = transcripts.reduce((acc, t) => {
      const dateKey = t.date.toString().split('T')[0]
      acc[dateKey] = (acc[dateKey] || 0) + t.transcript_count
      return acc
    }, {} as Record<string, number>)

    const peakDay = Object.entries(dailyTotals).reduce(
      (peak, [date, count]) => count > peak.count ? { date, count } : peak,
      { date: dateRange.start.toISOString().split('T')[0], count: 0 }
    )

    // Client breakdown
    const clientTotals = transcripts.reduce((acc, t) => {
      acc[t.client_name] = (acc[t.client_name] || 0) + t.transcript_count
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
        start: dateRange.start.toISOString().split('T')[0],
        end: dateRange.end.toISOString().split('T')[0]
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export const scheduledExportService = new ScheduledExportService()