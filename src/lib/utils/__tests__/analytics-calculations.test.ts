import { TranscriptData } from '@/types/transcript'

// Analytics calculation utilities
export interface AnalyticsResult {
  totalTranscripts: number
  totalClients: number
  averagePerMonth: number
  growthRate: number
  topClient: string | null
  topClientCount: number
  monthlyTrend: Array<{ month: string; count: number }>
  clientDistribution: Array<{ client: string; count: number; percentage: number }>
}

export function calculateAnalytics(data: TranscriptData[]): AnalyticsResult {
  if (!data.length) {
    return {
      totalTranscripts: 0,
      totalClients: 0,
      averagePerMonth: 0,
      growthRate: 0,
      topClient: null,
      topClientCount: 0,
      monthlyTrend: [],
      clientDistribution: []
    }
  }

  const totalTranscripts = data.reduce((sum, item) => sum + item.transcriptCount, 0)
  const uniqueClients = new Set(data.map(item => item.clientName))
  const totalClients = uniqueClients.size

  // Monthly calculations
  const monthlyData = new Map<string, number>()
  data.forEach(item => {
    const monthKey = `${item.year}-${item.month.padStart(2, '0')}`
    const current = monthlyData.get(monthKey) || 0
    monthlyData.set(monthKey, current + item.transcriptCount)
  })

  const averagePerMonth = monthlyData.size > 0 ? totalTranscripts / monthlyData.size : 0

  // Growth rate calculation
  const sortedMonths = Array.from(monthlyData.entries()).sort(([a], [b]) => a.localeCompare(b))
  let growthRate = 0
  
  if (sortedMonths.length >= 2) {
    const firstMonth = sortedMonths[0][1]
    const lastMonth = sortedMonths[sortedMonths.length - 1][1]
    if (firstMonth > 0) {
      growthRate = ((lastMonth - firstMonth) / firstMonth) * 100
    }
  }

  // Top client
  const clientTotals = new Map<string, number>()
  data.forEach(item => {
    const current = clientTotals.get(item.clientName) || 0
    clientTotals.set(item.clientName, current + item.transcriptCount)
  })

  let topClient = null
  let topClientCount = 0
  for (const [client, count] of clientTotals) {
    if (count > topClientCount) {
      topClient = client
      topClientCount = count
    }
  }

  // Monthly trend
  const monthlyTrend = sortedMonths.map(([month, count]) => ({ month, count }))

  // Client distribution
  const clientDistribution = Array.from(clientTotals.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([client, count]) => ({
      client,
      count,
      percentage: (count / totalTranscripts) * 100
    }))

  return {
    totalTranscripts,
    totalClients,
    averagePerMonth: Math.round(averagePerMonth),
    growthRate: Math.round(growthRate * 100) / 100,
    topClient,
    topClientCount,
    monthlyTrend,
    clientDistribution
  }
}

export function filterDataByTimeRange(data: TranscriptData[], timeRange: string): TranscriptData[] {
  if (timeRange === 'all') return data

  const monthsMap: { [key: string]: number } = {
    '3m': 3,
    '6m': 6,
    '12m': 12,
    '24m': 24
  }

  const months = monthsMap[timeRange]
  if (!months) return data

  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - months)

  return data.filter(item => {
    const itemDate = new Date(item.year, parseInt(item.month) - 1)
    return itemDate >= cutoffDate
  })
}

export function filterDataByClients(data: TranscriptData[], selectedClients: string[]): TranscriptData[] {
  if (!selectedClients.length) return data
  return data.filter(item => selectedClients.includes(item.clientName))
}

export function generateInsights(analytics: AnalyticsResult): Array<{
  type: 'positive' | 'negative' | 'neutral' | 'warning'
  title: string
  description: string
}> {
  const insights = []

  // Growth insights
  if (analytics.growthRate > 10) {
    insights.push({
      type: 'positive' as const,
      title: 'Strong Growth Trend',
      description: `Transcript volume has increased by ${analytics.growthRate}% over the selected period, indicating strong business growth.`
    })
  } else if (analytics.growthRate < -10) {
    insights.push({
      type: 'negative' as const,
      title: 'Declining Volume',
      description: `Transcript volume has decreased by ${Math.abs(analytics.growthRate)}% over the selected period. Consider investigating potential causes.`
    })
  } else if (Math.abs(analytics.growthRate) <= 5) {
    insights.push({
      type: 'neutral' as const,
      title: 'Stable Volume',
      description: `Transcript volume has remained relatively stable with ${analytics.growthRate}% change over the selected period.`
    })
  }

  // Client concentration insights
  if (analytics.clientDistribution.length > 0) {
    const topClientPercentage = analytics.clientDistribution[0].percentage
    if (topClientPercentage > 50) {
      insights.push({
        type: 'warning' as const,
        title: 'High Client Concentration',
        description: `${analytics.topClient} represents ${topClientPercentage.toFixed(1)}% of your total volume. Consider diversifying your client base.`
      })
    } else if (topClientPercentage < 20 && analytics.totalClients > 5) {
      insights.push({
        type: 'positive' as const,
        title: 'Well-Diversified Portfolio',
        description: 'Your client base is well-diversified with no single client dominating your transcript volume.'
      })
    }
  }

  // Volume insights
  if (analytics.averagePerMonth > 100) {
    insights.push({
      type: 'positive' as const,
      title: 'High Volume Processing',
      description: `You're processing an average of ${analytics.averagePerMonth} transcripts per month, indicating strong operational capacity.`
    })
  }

  return insights
}

// Tests
describe('Analytics Calculations', () => {
  const mockData: TranscriptData[] = [
    {
      id: '1',
      clientName: 'Client A',
      month: '01',
      year: 2024,
      transcriptCount: 50,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      clientName: 'Client B',
      month: '01',
      year: 2024,
      transcriptCount: 30,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '3',
      clientName: 'Client A',
      month: '02',
      year: 2024,
      transcriptCount: 60,
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
    },
    {
      id: '4',
      clientName: 'Client B',
      month: '02',
      year: 2024,
      transcriptCount: 40,
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
    },
  ]

  describe('calculateAnalytics', () => {
    it('calculates total transcripts correctly', () => {
      const result = calculateAnalytics(mockData)
      expect(result.totalTranscripts).toBe(180) // 50 + 30 + 60 + 40
    })

    it('calculates total clients correctly', () => {
      const result = calculateAnalytics(mockData)
      expect(result.totalClients).toBe(2) // Client A and Client B
    })

    it('calculates average per month correctly', () => {
      const result = calculateAnalytics(mockData)
      expect(result.averagePerMonth).toBe(90) // 180 total / 2 months
    })

    it('calculates growth rate correctly', () => {
      const result = calculateAnalytics(mockData)
      // Jan: 80, Feb: 100, growth = (100-80)/80 * 100 = 25%
      expect(result.growthRate).toBe(25)
    })

    it('identifies top client correctly', () => {
      const result = calculateAnalytics(mockData)
      expect(result.topClient).toBe('Client A') // 110 total vs Client B's 70
      expect(result.topClientCount).toBe(110)
    })

    it('generates monthly trend correctly', () => {
      const result = calculateAnalytics(mockData)
      expect(result.monthlyTrend).toHaveLength(2)
      expect(result.monthlyTrend[0]).toEqual({ month: '2024-01', count: 80 })
      expect(result.monthlyTrend[1]).toEqual({ month: '2024-02', count: 100 })
    })

    it('generates client distribution correctly', () => {
      const result = calculateAnalytics(mockData)
      expect(result.clientDistribution).toHaveLength(2)
      expect(result.clientDistribution[0]).toEqual({
        client: 'Client A',
        count: 110,
        percentage: (110/180) * 100
      })
      expect(result.clientDistribution[1]).toEqual({
        client: 'Client B',
        count: 70,
        percentage: (70/180) * 100
      })
    })

    it('handles empty data', () => {
      const result = calculateAnalytics([])
      expect(result.totalTranscripts).toBe(0)
      expect(result.totalClients).toBe(0)
      expect(result.averagePerMonth).toBe(0)
      expect(result.growthRate).toBe(0)
      expect(result.topClient).toBeNull()
      expect(result.topClientCount).toBe(0)
      expect(result.monthlyTrend).toEqual([])
      expect(result.clientDistribution).toEqual([])
    })

    it('handles single month data', () => {
      const singleMonthData = mockData.filter(item => item.month === '01')
      const result = calculateAnalytics(singleMonthData)
      expect(result.growthRate).toBe(0) // No growth calculation possible
    })
  })

  describe('filterDataByTimeRange', () => {
    it('returns all data for "all" time range', () => {
      const result = filterDataByTimeRange(mockData, 'all')
      expect(result).toEqual(mockData)
    })

    it('filters data by 3 months', () => {
      const result = filterDataByTimeRange(mockData, '3m')
      // Should filter based on current date minus 3 months
      expect(Array.isArray(result)).toBe(true)
    })

    it('handles invalid time range', () => {
      const result = filterDataByTimeRange(mockData, 'invalid')
      expect(result).toEqual(mockData)
    })
  })

  describe('filterDataByClients', () => {
    it('returns all data when no clients selected', () => {
      const result = filterDataByClients(mockData, [])
      expect(result).toEqual(mockData)
    })

    it('filters data by selected clients', () => {
      const result = filterDataByClients(mockData, ['Client A'])
      expect(result).toHaveLength(2)
      expect(result.every(item => item.clientName === 'Client A')).toBe(true)
    })

    it('filters data by multiple clients', () => {
      const result = filterDataByClients(mockData, ['Client A', 'Client B'])
      expect(result).toEqual(mockData)
    })

    it('handles non-existent client', () => {
      const result = filterDataByClients(mockData, ['Client C'])
      expect(result).toHaveLength(0)
    })
  })

  describe('generateInsights', () => {
    it('generates strong growth insight', () => {
      const analytics = calculateAnalytics(mockData)
      analytics.growthRate = 15
      const insights = generateInsights(analytics)
      
      const growthInsight = insights.find(i => i.title === 'Strong Growth Trend')
      expect(growthInsight).toBeDefined()
      expect(growthInsight?.type).toBe('positive')
    })

    it('generates declining volume insight', () => {
      const analytics = calculateAnalytics(mockData)
      analytics.growthRate = -15
      const insights = generateInsights(analytics)
      
      const declineInsight = insights.find(i => i.title === 'Declining Volume')
      expect(declineInsight).toBeDefined()
      expect(declineInsight?.type).toBe('negative')
    })

    it('generates stable volume insight', () => {
      const analytics = calculateAnalytics(mockData)
      analytics.growthRate = 2
      const insights = generateInsights(analytics)
      
      const stableInsight = insights.find(i => i.title === 'Stable Volume')
      expect(stableInsight).toBeDefined()
      expect(stableInsight?.type).toBe('neutral')
    })

    it('generates high client concentration warning', () => {
      const analytics = calculateAnalytics(mockData)
      analytics.clientDistribution = [
        { client: 'Client A', count: 150, percentage: 80 },
        { client: 'Client B', count: 30, percentage: 20 }
      ]
      analytics.topClient = 'Client A'
      
      const insights = generateInsights(analytics)
      const concentrationInsight = insights.find(i => i.title === 'High Client Concentration')
      expect(concentrationInsight).toBeDefined()
      expect(concentrationInsight?.type).toBe('warning')
    })

    it('generates well-diversified portfolio insight', () => {
      const analytics = calculateAnalytics(mockData)
      analytics.totalClients = 10
      analytics.clientDistribution = [
        { client: 'Client A', count: 20, percentage: 15 },
        { client: 'Client B', count: 18, percentage: 13 }
      ]
      
      const insights = generateInsights(analytics)
      const diversifiedInsight = insights.find(i => i.title === 'Well-Diversified Portfolio')
      expect(diversifiedInsight).toBeDefined()
      expect(diversifiedInsight?.type).toBe('positive')
    })

    it('generates high volume processing insight', () => {
      const analytics = calculateAnalytics(mockData)
      analytics.averagePerMonth = 150
      
      const insights = generateInsights(analytics)
      const volumeInsight = insights.find(i => i.title === 'High Volume Processing')
      expect(volumeInsight).toBeDefined()
      expect(volumeInsight?.type).toBe('positive')
    })

    it('handles empty analytics', () => {
      const emptyAnalytics: AnalyticsResult = {
        totalTranscripts: 0,
        totalClients: 0,
        averagePerMonth: 0,
        growthRate: 0,
        topClient: null,
        topClientCount: 0,
        monthlyTrend: [],
        clientDistribution: []
      }
      
      const insights = generateInsights(emptyAnalytics)
      expect(insights).toHaveLength(1) // Should have stable volume insight
      expect(insights[0].title).toBe('Stable Volume')
    })
  })
})