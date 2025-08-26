/**
 * Unit tests for data preprocessing utilities
 */
import {
  convertToTimeSeries,
  groupByClient,
  fillMissingMonths,
  normalizeData,
  denormalizeData,
  createFeatureMatrix,
  removeOutliers,
  calculateMovingAverage,
  decomposeSeasonality,
  validateDataQuality,
  prepareForTraining
} from '../data-preprocessing'
import { TranscriptData } from '@/types/transcript'

// Mock data for testing
const mockTranscriptData: TranscriptData[] = [
  {
    id: '1',
    clientName: 'Client A',
    month: '2023-01',
    year: 2023,
    transcriptCount: 100,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  {
    id: '2',
    clientName: 'Client A',
    month: '2023-02',
    year: 2023,
    transcriptCount: 120,
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-01')
  },
  {
    id: '3',
    clientName: 'Client A',
    month: '2023-04', // Missing March
    year: 2023,
    transcriptCount: 110,
    createdAt: new Date('2023-04-01'),
    updatedAt: new Date('2023-04-01')
  },
  {
    id: '4',
    clientName: 'Client B',
    month: '2023-01',
    year: 2023,
    transcriptCount: 80,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  {
    id: '5',
    clientName: 'Client B',
    month: '2023-02',
    year: 2023,
    transcriptCount: 90,
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-01')
  }
]

describe('Data Preprocessing Utilities', () => {
  describe('convertToTimeSeries', () => {
    it('should convert transcript data to time series format', () => {
      const result = convertToTimeSeries(mockTranscriptData.slice(0, 2))
      
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        value: 100,
        month: '2023-01',
        year: 2023
      })
      expect(result[0].timestamp).toBe(new Date('2023-01-01').getTime())
    })

    it('should sort time series by timestamp', () => {
      const unsortedData = [mockTranscriptData[2], mockTranscriptData[0], mockTranscriptData[1]]
      const result = convertToTimeSeries(unsortedData)
      
      expect(result[0].month).toBe('2023-01')
      expect(result[1].month).toBe('2023-02')
      expect(result[2].month).toBe('2023-04')
    })
  })

  describe('groupByClient', () => {
    it('should group data by client name', () => {
      const result = groupByClient(mockTranscriptData)
      
      expect(result.size).toBe(2)
      expect(result.has('Client A')).toBe(true)
      expect(result.has('Client B')).toBe(true)
      expect(result.get('Client A')).toHaveLength(3)
      expect(result.get('Client B')).toHaveLength(2)
    })

    it('should sort each client data by timestamp', () => {
      const result = groupByClient(mockTranscriptData)
      const clientAData = result.get('Client A')!
      
      expect(clientAData[0].month).toBe('2023-01')
      expect(clientAData[1].month).toBe('2023-02')
      expect(clientAData[2].month).toBe('2023-04')
    })
  })

  describe('fillMissingMonths', () => {
    it('should fill missing months with interpolated values', () => {
      const timeSeries = convertToTimeSeries(mockTranscriptData.slice(0, 3))
      const result = fillMissingMonths(timeSeries)
      
      expect(result).toHaveLength(4) // Original 3 + 1 interpolated
      expect(result[2].month).toBe('2023-03')
      expect(result[2].value).toBe(115) // Interpolated between 120 and 110
    })

    it('should handle time series with no gaps', () => {
      const timeSeries = convertToTimeSeries(mockTranscriptData.slice(0, 2))
      const result = fillMissingMonths(timeSeries)
      
      expect(result).toHaveLength(2) // No change
    })

    it('should handle single data point', () => {
      const timeSeries = convertToTimeSeries(mockTranscriptData.slice(0, 1))
      const result = fillMissingMonths(timeSeries)
      
      expect(result).toHaveLength(1)
    })
  })

  describe('normalizeData', () => {
    it('should normalize data using min-max scaling', () => {
      const values = [10, 20, 30, 40, 50]
      const { normalized, scaleParams } = normalizeData(values)
      
      expect(normalized[0]).toBe(0) // Min value
      expect(normalized[4]).toBe(1) // Max value
      expect(normalized[2]).toBe(0.5) // Middle value
      expect(scaleParams.min).toBe(10)
      expect(scaleParams.max).toBe(50)
    })

    it('should handle single value', () => {
      const values = [42]
      const { normalized, scaleParams } = normalizeData(values)
      
      expect(normalized[0]).toBe(0) // Single value becomes 0
      expect(scaleParams.min).toBe(42)
      expect(scaleParams.max).toBe(42)
    })
  })

  describe('denormalizeData', () => {
    it('should denormalize data back to original scale', () => {
      const originalValues = [10, 20, 30, 40, 50]
      const { normalized, scaleParams } = normalizeData(originalValues)
      const denormalized = denormalizeData(normalized, scaleParams)
      
      expect(denormalized).toEqual(originalValues)
    })
  })

  describe('createFeatureMatrix', () => {
    it('should create feature matrix with sliding window', () => {
      const timeSeries = convertToTimeSeries(mockTranscriptData.slice(0, 5))
      const windowSize = 2
      const { features, targets } = createFeatureMatrix(timeSeries, windowSize)
      
      expect(features).toHaveLength(3) // 5 - 2 = 3
      expect(targets).toHaveLength(3)
      expect(features[0]).toHaveLength(5) // 2 lag + month + year + trend
    })

    it('should include time-based features', () => {
      const timeSeries = convertToTimeSeries(mockTranscriptData.slice(0, 4))
      const { features } = createFeatureMatrix(timeSeries, 2)
      
      // Check that month and year features are included
      // The first feature should be for the 3rd data point (index 2), which is April (month 4)
      expect(features[0][2]).toBe(2) // February = month 2 (first prediction point)
      expect(features[0][3]).toBe(2023) // Year 2023
    })
  })

  describe('removeOutliers', () => {
    it('should remove outliers using IQR method', () => {
      const timeSeriesWithOutlier = [
        { timestamp: 1, value: 10, month: '2023-01', year: 2023 },
        { timestamp: 2, value: 12, month: '2023-02', year: 2023 },
        { timestamp: 3, value: 11, month: '2023-03', year: 2023 },
        { timestamp: 4, value: 1000, month: '2023-04', year: 2023 }, // Outlier
        { timestamp: 5, value: 13, month: '2023-05', year: 2023 }
      ]
      
      const result = removeOutliers(timeSeriesWithOutlier)
      
      expect(result).toHaveLength(4) // Outlier removed
      expect(result.find(point => point.value === 1000)).toBeUndefined()
    })

    it('should handle data without outliers', () => {
      const timeSeries = convertToTimeSeries(mockTranscriptData.slice(0, 3))
      const result = removeOutliers(timeSeries)
      
      expect(result).toHaveLength(3) // No change
    })
  })

  describe('calculateMovingAverage', () => {
    it('should calculate moving average', () => {
      const timeSeries = [
        { timestamp: 1, value: 10, month: '2023-01', year: 2023 },
        { timestamp: 2, value: 20, month: '2023-02', year: 2023 },
        { timestamp: 3, value: 30, month: '2023-03', year: 2023 }
      ]
      
      const result = calculateMovingAverage(timeSeries, 3)
      
      expect(result).toHaveLength(3)
      expect(result[1].value).toBe(20) // Average of 10, 20, 30
    })
  })

  describe('decomposeSeasonality', () => {
    it('should decompose time series into trend, seasonal, and residual components', () => {
      const timeSeries = Array.from({ length: 24 }, (_, i) => ({
        timestamp: i,
        value: 100 + Math.sin(i * Math.PI / 6) * 10 + i * 2, // Trend + seasonal
        month: `2023-${String((i % 12) + 1).padStart(2, '0')}`,
        year: 2023 + Math.floor(i / 12)
      }))
      
      const result = decomposeSeasonality(timeSeries, 12)
      
      expect(result.trend).toHaveLength(24)
      expect(result.seasonal).toHaveLength(24)
      expect(result.residual).toHaveLength(24)
    })
  })

  describe('validateDataQuality', () => {
    it('should identify insufficient data', () => {
      const shortTimeSeries = convertToTimeSeries(mockTranscriptData.slice(0, 2))
      const result = validateDataQuality(shortTimeSeries)
      
      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Insufficient data points (minimum 6 months required)')
    })

    it('should identify data gaps', () => {
      const timeSeries = convertToTimeSeries(mockTranscriptData.slice(0, 3)) // Has gap in March
      const result = validateDataQuality(timeSeries)
      
      expect(result.issues).toContain('Data contains gaps in time series')
    })

    it('should identify negative values', () => {
      const dataWithNegative = [...mockTranscriptData.slice(0, 2)]
      dataWithNegative[0].transcriptCount = -10
      const timeSeries = convertToTimeSeries(dataWithNegative)
      const result = validateDataQuality(timeSeries)
      
      expect(result.issues).toContain('Data contains negative values')
    })

    it('should pass validation for good data', () => {
      const goodData: TranscriptData[] = Array.from({ length: 12 }, (_, i) => ({
        id: String(i + 1),
        clientName: 'Client A',
        month: `2023-${String(i + 1).padStart(2, '0')}`,
        year: 2023,
        transcriptCount: 100 + i * 5,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
      
      const timeSeries = convertToTimeSeries(goodData)
      const result = validateDataQuality(timeSeries)
      
      expect(result.isValid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })
  })

  describe('prepareForTraining', () => {
    it('should prepare data for model training', () => {
      const goodData: TranscriptData[] = Array.from({ length: 12 }, (_, i) => ({
        id: String(i + 1),
        clientName: 'Client A',
        month: `2023-${String(i + 1).padStart(2, '0')}`,
        year: 2023,
        transcriptCount: 100 + i * 5,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
      
      const timeSeries = convertToTimeSeries(goodData)
      const result = prepareForTraining(timeSeries, 3, 0.2)
      
      expect(result.trainFeatures.length).toBeGreaterThan(0)
      expect(result.trainTargets.length).toBe(result.trainFeatures.length)
      expect(result.testFeatures.length).toBeGreaterThan(0)
      expect(result.testTargets.length).toBe(result.testFeatures.length)
      expect(result.scaleParams).toBeDefined()
    })

    it('should handle different window sizes', () => {
      const goodData: TranscriptData[] = Array.from({ length: 10 }, (_, i) => ({
        id: String(i + 1),
        clientName: 'Client A',
        month: `2023-${String(i + 1).padStart(2, '0')}`,
        year: 2023,
        transcriptCount: 100 + i * 5,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
      
      const timeSeries = convertToTimeSeries(goodData)
      const result1 = prepareForTraining(timeSeries, 2, 0.2)
      const result2 = prepareForTraining(timeSeries, 4, 0.2)
      
      expect(result1.trainFeatures[0].length).toBeLessThan(result2.trainFeatures[0].length)
    })
  })
})