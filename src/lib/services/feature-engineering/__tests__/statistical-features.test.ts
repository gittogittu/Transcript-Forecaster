/**
 * Statistical Features Tests
 * Tests for statistical feature extraction functionality
 */

import { StatisticalFeatureExtractor } from '../statistical-features'

describe('StatisticalFeatureExtractor', () => {
  const mockValues = [100, 110, 105, 120, 115, 130, 125, 140, 135, 150, 145, 160]
  const mockTimestamps = mockValues.map((_, i) => new Date(2024, 0, i + 1))

  describe('extractStatisticalFeatures', () => {
    it('should extract comprehensive statistical features', () => {
      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(mockValues, mockTimestamps)

      expect(features).toHaveProperty('autocorrelations')
      expect(features).toHaveProperty('partialAutocorrelations')
      expect(features).toHaveProperty('stationarityTests')
      expect(features).toHaveProperty('seasonalityTests')
      expect(features).toHaveProperty('changePoints')
      expect(features).toHaveProperty('variance')
      expect(features).toHaveProperty('skewness')
      expect(features).toHaveProperty('kurtosis')
      expect(features).toHaveProperty('entropy')

      // Check that arrays have reasonable lengths
      expect(features.autocorrelations.length).toBeGreaterThan(0)
      expect(features.partialAutocorrelations.length).toBeGreaterThan(0)
      expect(features.stationarityTests.length).toBeGreaterThan(0)
      expect(features.seasonalityTests.length).toBeGreaterThan(0)
    })

    it('should calculate autocorrelations correctly', () => {
      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(mockValues)

      // First autocorrelation should be 1 (correlation with itself)
      expect(features.autocorrelations[0]).toBeCloseTo(1, 2)
      
      // Autocorrelations should be between -1 and 1
      features.autocorrelations.forEach(corr => {
        expect(corr).toBeGreaterThanOrEqual(-1)
        expect(corr).toBeLessThanOrEqual(1)
      })
    })

    it('should calculate partial autocorrelations correctly', () => {
      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(mockValues)

      // First partial autocorrelation should be 1
      expect(features.partialAutocorrelations[0]).toBe(1)
      
      // Partial autocorrelations should be between -1 and 1
      features.partialAutocorrelations.forEach(pacf => {
        expect(pacf).toBeGreaterThanOrEqual(-1)
        expect(pacf).toBeLessThanOrEqual(1)
      })
    })

    it('should perform stationarity tests', () => {
      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(mockValues)

      expect(features.stationarityTests.length).toBeGreaterThan(0)
      
      features.stationarityTests.forEach(test => {
        expect(test).toHaveProperty('testName')
        expect(test).toHaveProperty('statistic')
        expect(test).toHaveProperty('pValue')
        expect(test).toHaveProperty('isStationary')
        expect(typeof test.isStationary).toBe('boolean')
      })
    })

    it('should perform seasonality tests', () => {
      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(mockValues)

      expect(features.seasonalityTests.length).toBeGreaterThan(0)
      
      features.seasonalityTests.forEach(test => {
        expect(test).toHaveProperty('period')
        expect(test).toHaveProperty('strength')
        expect(test).toHaveProperty('significance')
        expect(test).toHaveProperty('isSignificant')
        expect(typeof test.isSignificant).toBe('boolean')
        expect(test.strength).toBeGreaterThanOrEqual(0)
        expect(test.strength).toBeLessThanOrEqual(1)
      })
    })

    it('should calculate basic statistical measures', () => {
      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(mockValues)

      expect(features.variance).toBeGreaterThan(0)
      expect(typeof features.skewness).toBe('number')
      expect(typeof features.kurtosis).toBe('number')
      expect(features.entropy).toBeGreaterThanOrEqual(0)
    })

    it('should detect change points', () => {
      // Create data with an obvious change point
      const dataWithChangePoint = [
        ...Array(10).fill(100),  // Stable period
        ...Array(10).fill(200)   // Jump to higher level
      ]
      
      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(dataWithChangePoint)

      expect(Array.isArray(features.changePoints)).toBe(true)
      
      features.changePoints.forEach(cp => {
        expect(cp).toHaveProperty('index')
        expect(cp).toHaveProperty('confidence')
        expect(cp).toHaveProperty('changeType')
        expect(cp.confidence).toBeGreaterThanOrEqual(0)
        expect(cp.confidence).toBeLessThanOrEqual(1)
      })
    })

    it('should handle custom configuration', () => {
      const config = {
        maxLags: 5,
        seasonalPeriods: [3, 6],
        changePointSensitivity: 0.1
      }

      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(
        mockValues,
        mockTimestamps,
        config
      )

      expect(features.autocorrelations.length).toBeLessThanOrEqual(6) // maxLags + 1
      expect(features.seasonalityTests.length).toBe(2) // Two seasonal periods
    })
  })

  describe('edge cases', () => {
    it('should handle constant values', () => {
      const constantValues = Array(10).fill(100)
      
      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(constantValues)

      expect(features.variance).toBe(0)
      expect(features.skewness).toBe(0)
      expect(features.kurtosis).toBe(0)
    })

    it('should handle very small datasets', () => {
      const smallDataset = [100, 110]
      
      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(smallDataset)

      expect(features.autocorrelations.length).toBeGreaterThan(0)
      expect(features.variance).toBeGreaterThan(0)
    })

    it('should handle single value', () => {
      const singleValue = [100]
      
      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(singleValue)

      expect(features.variance).toBe(0)
      expect(features.autocorrelations.length).toBe(1)
      expect(features.autocorrelations[0]).toBe(1)
    })

    it('should handle empty array', () => {
      const emptyValues: number[] = []
      
      expect(() => {
        StatisticalFeatureExtractor.extractStatisticalFeatures(emptyValues)
      }).not.toThrow()
    })

    it('should handle NaN and infinite values gracefully', () => {
      const valuesWithNaN = [100, NaN, 110, Infinity, 105]
      
      expect(() => {
        StatisticalFeatureExtractor.extractStatisticalFeatures(valuesWithNaN)
      }).not.toThrow()
    })
  })

  describe('statistical accuracy', () => {
    it('should calculate variance correctly for known data', () => {
      const knownValues = [1, 2, 3, 4, 5]
      const expectedVariance = 2 // Known variance for this dataset
      
      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(knownValues)
      
      expect(features.variance).toBeCloseTo(expectedVariance, 1)
    })

    it('should identify trending data as non-stationary', () => {
      const trendingData = Array.from({ length: 20 }, (_, i) => i * 10) // Strong upward trend
      
      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(trendingData)
      
      // At least one test should indicate non-stationarity
      const hasNonStationaryTest = features.stationarityTests.some(test => !test.isStationary)
      expect(hasNonStationaryTest).toBe(true)
    })

    it('should detect seasonality in periodic data', () => {
      // Create data with clear 4-period seasonality
      const seasonalData = Array.from({ length: 20 }, (_, i) => 
        100 + 50 * Math.sin(2 * Math.PI * i / 4)
      )
      
      const features = StatisticalFeatureExtractor.extractStatisticalFeatures(
        seasonalData,
        undefined,
        { seasonalPeriods: [4] }
      )
      
      const seasonalTest = features.seasonalityTests.find(test => test.period === 4)
      expect(seasonalTest).toBeDefined()
      expect(seasonalTest!.strength).toBeGreaterThan(0.1) // Should detect some seasonality
    })
  })
})