import {
  calculateTrends,
  aggregateByMonth,
  aggregateByClient,
  calculateStatisticalSummary,
  calculateGrowthMetrics,
  calculateMovingAverage,
  calculateCorrelation,
  calculateForecastAccuracy,
  calculateTrendAnalytics
} from '@/lib/utils/analytics-calculations'
import { TranscriptData } from '@/types/transcript'

// Mock data that matches the expected structure
const mockTranscriptData = [
  {
    id: '1',
    clientName: 'Client A',
    date: new Date('2024-01-15'),
    transcriptCount: 10,
    transcriptType: 'type1',
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user1',
    // Add the expected properties for analytics calculations
    year: 2024,
    month: '01'
  },
  {
    id: '2',
    clientName: 'Client A',
    date: new Date('2024-02-15'),
    transcriptCount: 15,
    transcriptType: 'type1',
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user1',
    year: 2024,
    month: '02'
  },
  {
    id: '3',
    clientName: 'Client B',
    date: new Date('2024-01-20'),
    transcriptCount: 20,
    transcriptType: 'type2',
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user1',
    year: 2024,
    month: '01'
  },
  {
    id: '4',
    clientName: 'Client B',
    date: new Date('2024-02-20'),
    transcriptCount: 25,
    transcriptType: 'type2',
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user1',
    year: 2024,
    month: '02'
  }
] as (TranscriptData & { year: number; month: string })[]

describe('Analytics Calculations', () => {
  describe('aggregateByMonth', () => {
    it('aggregates transcript counts by month correctly', () => {
      const result = aggregateByMonth(mockTranscriptData)
      
      expect(result).toEqual({
        '2024-01': 30, // Client A (10) + Client B (20)
        '2024-02': 40  // Client A (15) + Client B (25)
      })
    })

    it('handles empty data', () => {
      const result = aggregateByMonth([])
      expect(result).toEqual({})
    })

    it('handles single data point', () => {
      const singleData = [mockTranscriptData[0]]
      const result = aggregateByMonth(singleData)
      
      expect(result).toEqual({
        '2024-01': 10
      })
    })
  })

  describe('aggregateByClient', () => {
    it('aggregates transcript counts by client correctly', () => {
      const result = aggregateByClient(mockTranscriptData)
      
      expect(result).toEqual({
        'Client A': 25, // 10 + 15
        'Client B': 45  // 20 + 25
      })
    })

    it('handles empty data', () => {
      const result = aggregateByClient([])
      expect(result).toEqual({})
    })
  })

  describe('calculateTrends', () => {
    it('calculates trends with month-over-month changes', () => {
      const result = calculateTrends(mockTranscriptData)
      
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        month: '2024-01',
        count: 30,
        change: 0,
        changePercent: 0
      })
      expect(result[1]).toEqual({
        month: '2024-02',
        count: 40,
        change: 10,
        changePercent: 33.33333333333333
      })
    })

    it('handles single month data', () => {
      const singleMonthData = [mockTranscriptData[0]]
      const result = calculateTrends(singleMonthData)
      
      expect(result).toHaveLength(1)
      expect(result[0].change).toBe(0)
      expect(result[0].changePercent).toBe(0)
    })
  })

  describe('calculateStatisticalSummary', () => {
    it('calculates statistical summary correctly', () => {
      const result = calculateStatisticalSummary(mockTranscriptData)
      
      expect(result.total).toBe(70) // 10 + 15 + 20 + 25
      expect(result.mean).toBe(17.5) // 70 / 4
      expect(result.min).toBe(10)
      expect(result.max).toBe(25)
      expect(result.median).toBe(17.5) // (15 + 20) / 2
    })

    it('handles empty data', () => {
      const result = calculateStatisticalSummary([])
      
      expect(result).toEqual({
        mean: 0,
        median: 0,
        mode: 0,
        standardDeviation: 0,
        variance: 0,
        min: 0,
        max: 0,
        total: 0
      })
    })

    it('calculates mode correctly', () => {
      const dataWithMode = [
        ...mockTranscriptData,
        {
          ...mockTranscriptData[0],
          id: '5',
          transcriptCount: 15 // Make 15 appear twice
        }
      ]
      
      const result = calculateStatisticalSummary(dataWithMode)
      expect(result.mode).toBe(15)
    })
  })

  describe('calculateGrowthMetrics', () => {
    it('calculates growth metrics correctly', () => {
      const result = calculateGrowthMetrics(mockTranscriptData)
      
      expect(result.monthlyGrowthRate).toBe(33.33) // (40-30)/30 * 100, rounded
      expect(result.quarterlyGrowthRate).toBe(0) // Not enough data for quarterly
      expect(result.yearOverYearGrowth).toBe(0) // Not enough data for YoY
      expect(result.compoundAnnualGrowthRate).toBe(0) // Not enough data for CAGR
    })

    it('handles insufficient data', () => {
      const singleData = [mockTranscriptData[0]]
      const result = calculateGrowthMetrics(singleData)
      
      expect(result).toEqual({
        monthlyGrowthRate: 0,
        quarterlyGrowthRate: 0,
        yearOverYearGrowth: 0,
        compoundAnnualGrowthRate: 0
      })
    })
  })

  describe('calculateMovingAverage', () => {
    it('calculates moving average with default window size', () => {
      const result = calculateMovingAverage(mockTranscriptData)
      
      expect(result).toHaveLength(2)
      expect(result[0].count).toBe(30) // First month, window size 1
      expect(result[1].count).toBe(35) // Average of 30 and 40
    })

    it('calculates moving average with custom window size', () => {
      const result = calculateMovingAverage(mockTranscriptData, 1)
      
      expect(result[0].count).toBe(30)
      expect(result[1].count).toBe(40)
    })
  })

  describe('calculateCorrelation', () => {
    it('calculates correlation between two series', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [2, 4, 6, 8, 10] // Perfect positive correlation
      
      const result = calculateCorrelation(x, y)
      expect(result).toBeCloseTo(1, 5)
    })

    it('handles negative correlation', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [10, 8, 6, 4, 2] // Perfect negative correlation
      
      const result = calculateCorrelation(x, y)
      expect(result).toBeCloseTo(-1, 5)
    })

    it('handles no correlation', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [1, 1, 1, 1, 1] // No variation in y
      
      const result = calculateCorrelation(x, y)
      expect(result).toBe(0)
    })

    it('handles mismatched array lengths', () => {
      const x = [1, 2, 3]
      const y = [1, 2] // Different length
      
      const result = calculateCorrelation(x, y)
      expect(result).toBe(0)
    })
  })

  describe('calculateForecastAccuracy', () => {
    it('calculates forecast accuracy metrics', () => {
      const actual = [10, 20, 30, 40]
      const predicted = [12, 18, 32, 38]
      
      const result = calculateForecastAccuracy(actual, predicted)
      
      expect(result.mae).toBe(2.5) // Mean absolute error
      expect(result.mape).toBeCloseTo(12.5, 1) // Mean absolute percentage error
      expect(result.rmse).toBeCloseTo(2.58, 1) // Root mean square error
      expect(result.r2).toBeGreaterThan(0.9) // R-squared should be high for good predictions
    })

    it('handles perfect predictions', () => {
      const actual = [10, 20, 30, 40]
      const predicted = [10, 20, 30, 40]
      
      const result = calculateForecastAccuracy(actual, predicted)
      
      expect(result.mae).toBe(0)
      expect(result.mape).toBe(0)
      expect(result.rmse).toBe(0)
      expect(result.r2).toBe(1)
    })

    it('handles mismatched array lengths', () => {
      const actual = [10, 20, 30]
      const predicted = [10, 20] // Different length
      
      const result = calculateForecastAccuracy(actual, predicted)
      
      expect(result).toEqual({
        mae: 0,
        mape: 0,
        rmse: 0,
        r2: 0
      })
    })
  })

  describe('calculateTrendAnalytics', () => {
    it('combines all analytics calculations', () => {
      const result = calculateTrendAnalytics(mockTranscriptData)
      
      expect(result).toHaveProperty('trends')
      expect(result).toHaveProperty('statistics')
      expect(result).toHaveProperty('growthMetrics')
      expect(result).toHaveProperty('movingAverage')
      expect(result).toHaveProperty('clientBreakdown')
      expect(result).toHaveProperty('monthlyBreakdown')
      
      expect(result.trends).toHaveLength(2)
      expect(result.statistics.total).toBe(70)
      expect(result.clientBreakdown).toEqual({
        'Client A': 25,
        'Client B': 45
      })
      expect(result.monthlyBreakdown).toEqual({
        '2024-01': 30,
        '2024-02': 40
      })
    })

    it('handles empty data gracefully', () => {
      const result = calculateTrendAnalytics([])
      
      expect(result.trends).toHaveLength(0)
      expect(result.statistics.total).toBe(0)
      expect(result.clientBreakdown).toEqual({})
      expect(result.monthlyBreakdown).toEqual({})
    })
  })
})