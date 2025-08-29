// Mock data service for development when database is not available
export class MockDataService {
  private static instance: MockDataService
  private data: any = {}

  private constructor() {
    // Initialize with some mock data
    this.data = {
      transcripts: [
        {
          id: 1,
          client_name: 'Acme Corp',
          date: new Date('2025-01-15'),
          transcript_count: 45,
          transcript_type: 'call',
          handling_time_minutes: 8.5,
          created_at: new Date('2025-01-15T10:30:00Z'),
          updated_at: new Date('2025-01-15T10:30:00Z')
        },
        {
          id: 2,
          client_name: 'TechStart Inc',
          date: new Date('2025-01-15'),
          transcript_count: 23,
          transcript_type: 'meeting',
          handling_time_minutes: 12.3,
          created_at: new Date('2025-01-15T09:15:00Z'),
          updated_at: new Date('2025-01-15T09:15:00Z')
        },
        {
          id: 3,
          client_name: 'Global Solutions',
          date: new Date('2025-01-14'),
          transcript_count: 67,
          transcript_type: 'call',
          handling_time_minutes: 7.8,
          created_at: new Date('2025-01-14T16:45:00Z'),
          updated_at: new Date('2025-01-14T16:45:00Z')
        },
        {
          id: 4,
          client_name: 'Innovation Labs',
          date: new Date('2025-01-14'),
          transcript_count: 12,
          transcript_type: 'interview',
          handling_time_minutes: 15.2,
          created_at: new Date('2025-01-14T14:20:00Z'),
          updated_at: new Date('2025-01-14T14:20:00Z')
        }
      ],
      predictions: [
        {
          id: 1,
          prediction_type: 'Volume Forecast',
          forecast_value: 1456,
          confidence_score: 87,
          period_type: 'next-month',
          created_at: new Date('2025-01-15T10:30:00Z'),
          accuracy_score: 89
        },
        {
          id: 2,
          prediction_type: 'Seasonal Analysis',
          forecast_value: 1234,
          confidence_score: 92,
          period_type: 'next-quarter',
          created_at: new Date('2025-01-10T14:15:00Z'),
          accuracy_score: 91
        }
      ]
    }
  }

  static getInstance(): MockDataService {
    if (!MockDataService.instance) {
      MockDataService.instance = new MockDataService()
    }
    return MockDataService.instance
  }

  async getDashboardData() {
    const transcripts = this.data.transcripts
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const totalTranscripts = transcripts.length
    const thisMonth = transcripts.filter((t: any) => new Date(t.date) >= thisMonthStart).length
    const lastMonth = transcripts.filter((t: any) => 
      new Date(t.date) >= lastMonthStart && new Date(t.date) <= lastMonthEnd
    ).length

    const monthlyGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0
    const activeClients = new Set(transcripts.map((t: any) => t.client_name)).size
    
    const avgHandlingTime = transcripts
      .filter((t: any) => t.handling_time_minutes)
      .reduce((sum: number, t: any) => sum + t.handling_time_minutes, 0) / 
      transcripts.filter((t: any) => t.handling_time_minutes).length || 8.5

    const recentActivity = transcripts.slice(0, 3).map((t: any, index: number) => ({
      id: (index + 1).toString(),
      type: 'import',
      description: `Added ${t.transcript_count} transcripts for ${t.client_name}`,
      timestamp: this.formatTimeAgo(new Date(t.created_at)),
      status: 'success'
    }))

    return {
      totalTranscripts,
      thisMonth,
      avgHandlingTime: Math.round(avgHandlingTime * 10) / 10,
      activeClients,
      lastSync: '2 minutes ago',
      syncStatus: 'success' as const,
      monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
      predictions: {
        nextMonth: 1456,
        confidence: 87
      },
      recentActivity
    }
  }

  async getDataSummary() {
    const transcripts = this.data.transcripts
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const totalRecords = transcripts.length
    const lastUpdated = this.formatTimeAgo(new Date(Math.max(...transcripts.map((t: any) => new Date(t.updated_at).getTime()))))
    const dataQuality = 94.2 // Mock quality score
    const activeClients = new Set(transcripts.map((t: any) => t.client_name)).size
    const thisMonthEntries = transcripts.filter((t: any) => new Date(t.created_at) >= thisMonthStart).length

    const recentEntries = transcripts.slice(0, 4).map((t: any) => ({
      id: t.id.toString(),
      clientName: t.client_name,
      date: t.date.toISOString().split('T')[0],
      count: t.transcript_count,
      type: t.transcript_type
    }))

    return {
      totalRecords,
      lastUpdated,
      dataQuality,
      activeClients,
      thisMonthEntries,
      recentEntries
    }
  }

  async getPredictionsData() {
    const predictions = this.data.predictions.map((p: any) => ({
      id: p.id.toString(),
      type: p.prediction_type,
      forecast: p.forecast_value,
      confidence: p.confidence_score,
      period: p.period_type,
      generatedAt: p.created_at.toISOString(),
      accuracy: p.accuracy_score
    }))

    const totalPredictions = predictions.length
    const avgConfidence = predictions.length > 0 
      ? Math.round(predictions.reduce((sum: number, p: any) => sum + p.confidence, 0) / predictions.length)
      : 0
    const avgAccuracy = predictions.filter((p: any) => p.accuracy).length > 0
      ? Math.round(predictions.filter((p: any) => p.accuracy).reduce((sum: number, p: any) => sum + p.accuracy, 0) / predictions.filter((p: any) => p.accuracy).length)
      : 0

    return {
      totalPredictions,
      avgConfidence,
      avgAccuracy,
      predictions,
      generatedPredictions: {
        nextMonth: { value: 1456, confidence: 87 },
        nextQuarter: { value: 4368, confidence: 82 }
      }
    }
  }

  async addPrediction(type: string, forecast: number, confidence: number, period: string) {
    const newPrediction = {
      id: this.data.predictions.length + 1,
      prediction_type: type,
      forecast_value: forecast,
      confidence_score: confidence,
      period_type: period,
      created_at: new Date(),
      accuracy_score: null
    }

    this.data.predictions.unshift(newPrediction)
    return newPrediction
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    
    return date.toLocaleDateString()
  }
}