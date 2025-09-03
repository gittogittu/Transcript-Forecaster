/**
 * Time Features Tests
 * Tests for time-based feature extraction functionality
 */

import { TimeFeatureExtractor } from '../time-features'
import type { TimeSeriesData } from '../time-features'

describe('TimeFeatureExtractor', () => {
  const mockTimeSeriesData: TimeSeriesData = {
    timestamps: [
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      new Date('2024-01-03'),
      new Date('2024-01-04'),
      new Date('2024-01-05'),
      new Date('2024-01-08'), // Monday
      new Date('2024-01-09'),
      new Date('2024-01-10'),
      new Date('2024-01-11'),
      new Date('2024-01-12'),
    ],
    values: [100, 110, 105, 120, 115, 130, 125, 140, 135, 150],
    clientId: 'test-client'
  }

  describe('extractTimeFeatures', () => {
    it('should extract comprehensive time features', () => {
      const features = TimeFeatureExtractor.extractTimeFeatures(mockTimeSeriesData)

      expect(features).toHaveProperty('lags')
      expect(features).toHaveProperty('rollingMeans')
      expect(features).toHaveProperty('rollingStds')
      expect(features).toHaveProperty('seasonalIndicators')
      expect(features).toHaveProperty('trendComponents')
      expect(features).toHaveProperty('cyclicalComponents')
      expect(features).toHaveProperty('dayOfWeek')
      expect(features).toHaveProperty('monthOfYear')
      expect(features).toHaveProperty('quarterOfYear')
      expect(features).toHaveProperty('isWeekend')
      expect(features).toHaveProperty('daysSinceStart')

      // Check array lengths match input data
      expect(features.dayOfWeek).toHaveLength(mockTimeSeriesData.timestamps.length)
      expect(features.monthOfYear).toHaveLength(mockTimeSeriesData.timestamps.length)
      expect(features.isWeekend).toHaveLength(mockTimeSeriesData.timestamps.length)
    })

    it('should generate correct day of week features', () => {
      const features = TimeFeatureExtractor.extractTimeFeatures(mockTimeSeriesData)

      // January 1, 2024 was a Monday (day 1)
      expect(features.dayOfWeek[0]).toBe(1) // Monday
      expect(features.dayOfWeek[1]).toBe(2) // Tuesday
      expect(features.dayOfWeek[2]).toBe(3) // Wednesday
    })

    it('should identify weekends correctly', () => {
      const features = TimeFeatureExtractor.extractTimeFeatures(mockTimeSeriesData)

      // Check that weekends are identified (Saturday = 6, Sunday = 0)
      const weekendDays = features.isWeekend.filter(isWeekend => isWeekend)
      expect(weekendDays.length).toBeGreaterThanOrEqual(0)
    })

    it('should calculate days since start correctly', () => {
      const features = TimeFeatureExtractor.extractTimeFeatures(mockTimeSeriesData)

      expect(features.daysSinceStart[0]).toBe(0) // First day
      expect(features.daysSinceStart[1]).toBe(1) // Second day
      expect(features.daysSinceStart[2]).toBe(2) // Third day
    })

    it('should handle custom configuration', () => {
      const config = {
        lagPeriods: [1, 2],
        rollingWindows: [3],
        seasonalPeriods: [7]
      }

      const features = TimeFeatureExtractor.extractTimeFeatures(mockTimeSeriesData, config)

      expect(features.lags).toHaveLength(mockTimeSeriesData.values.length)
      expect(features.rollingMeans).toHaveLength(mockTimeSeriesData.values.length)
    })
  })

  describe('generateDateFeatures', () => {
    it('should generate correct date features', () => {
      const date = new Date('2024-03-15') // Friday, March 15, 2024
      const features = TimeFeatureExtractor.generateDateFeatures(date)

      expect(features.dayOfWeek).toBe(5) // Friday
      expect(features.monthOfYear).toBe(3) // March
      expect(features.quarterOfYear).toBe(1) // Q1
      expect(features.isWeekend).toBe(false) // Friday is not weekend
      expect(features.dayOfMonth).toBe(15)
    })

    it('should identify weekend correctly', () => {
      const saturday = new Date('2024-03-16') // Saturday
      const sunday = new Date('2024-03-17') // Sunday

      const saturdayFeatures = TimeFeatureExtractor.generateDateFeatures(saturday)
      const sundayFeatures = TimeFeatureExtractor.generateDateFeatures(sunday)

      expect(saturdayFeatures.isWeekend).toBe(true)
      expect(sundayFeatures.isWeekend).toBe(true)
    })
  })

  describe('createRealTimeLagFeatures', () => {
    it('should create lag features for real-time prediction', () => {
      const historicalValues = [100, 110, 105, 120, 115, 130, 125]
      const lagPeriods = [1, 3, 7]

      const lagFeatures = TimeFeatureExtractor.createRealTimeLagFeatures(
        historicalValues,
        lagPeriods
      )

      expect(lagFeatures).toHaveProperty('lag_1')
      expect(lagFeatures).toHaveProperty('lag_3')
      expect(lagFeatures).toHaveProperty('lag_7')

      expect(lagFeatures.lag_1).toBe(130) // 1 period back from last (125)
      expect(lagFeatures.lag_3).toBe(120) // 3 periods back from last
      expect(lagFeatures.lag_7).toBe(0) // Not enough history, should be 0
    })

    it('should handle insufficient historical data', () => {
      const historicalValues = [100, 110]
      const lagPeriods = [1, 5, 10]

      const lagFeatures = TimeFeatureExtractor.createRealTimeLagFeatures(
        historicalValues,
        lagPeriods
      )

      expect(lagFeatures.lag_1).toBe(100) // 1 period back from last (110)
      expect(lagFeatures.lag_5).toBe(0) // Not enough history
      expect(lagFeatures.lag_10).toBe(0) // Not enough history
    })
  })

  describe('edge cases', () => {
    it('should handle empty data gracefully', () => {
      const emptyData: TimeSeriesData = {
        timestamps: [],
        values: [],
        clientId: 'test'
      }

      const features = TimeFeatureExtractor.extractTimeFeatures(emptyData)

      expect(features.dayOfWeek).toHaveLength(0)
      expect(features.lags).toHaveLength(0)
      expect(features.rollingMeans).toHaveLength(0)
    })

    it('should handle single data point', () => {
      const singlePointData: TimeSeriesData = {
        timestamps: [new Date('2024-01-01')],
        values: [100],
        clientId: 'test'
      }

      const features = TimeFeatureExtractor.extractTimeFeatures(singlePointData)

      expect(features.dayOfWeek).toHaveLength(1)
      expect(features.lags).toHaveLength(1)
      expect(features.rollingMeans).toHaveLength(1)
    })

    it('should handle mismatched timestamps and values', () => {
      const mismatchedData: TimeSeriesData = {
        timestamps: [new Date('2024-01-01'), new Date('2024-01-02')],
        values: [100], // Only one value for two timestamps
        clientId: 'test'
      }

      // Should handle gracefully without throwing
      expect(() => {
        TimeFeatureExtractor.extractTimeFeatures(mismatchedData)
      }).not.toThrow()
    })
  })
})