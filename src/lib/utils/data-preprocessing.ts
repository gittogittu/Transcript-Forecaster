/**
 * Data preprocessing utilities for time-series analysis
 * Handles data transformation, normalization, and preparation for ML models
 */

import { TranscriptData, MonthlyPrediction } from '@/types/transcript'

export interface TimeSeriesPoint {
  timestamp: number // Unix timestamp
  value: number
  month: string
  year: number
}

export interface PreprocessedData {
  timeSeries: TimeSeriesPoint[]
  features: number[][]
  targets: number[]
  scaleParams: {
    min: number
    max: number
    mean: number
    std: number
  }
}

export interface SeasonalComponents {
  trend: number[]
  seasonal: number[]
  residual: number[]
}

/**
 * Convert transcript data to time series format
 */
export function convertToTimeSeries(data: TranscriptData[]): TimeSeriesPoint[] {
  return data
    .map(item => ({
      timestamp: new Date(`${item.month}-01`).getTime(),
      value: item.transcriptCount,
      month: item.month,
      year: item.year
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Group data by client for individual time series analysis
 */
export function groupByClient(data: TranscriptData[]): Map<string, TimeSeriesPoint[]> {
  const clientData = new Map<string, TimeSeriesPoint[]>()
  
  data.forEach(item => {
    const clientName = item.clientName
    if (!clientData.has(clientName)) {
      clientData.set(clientName, [])
    }
    
    clientData.get(clientName)!.push({
      timestamp: new Date(`${item.month}-01`).getTime(),
      value: item.transcriptCount,
      month: item.month,
      year: item.year
    })
  })
  
  // Sort each client's data by timestamp
  clientData.forEach(series => {
    series.sort((a, b) => a.timestamp - b.timestamp)
  })
  
  return clientData
}

/**
 * Fill missing months with interpolated values
 */
export function fillMissingMonths(timeSeries: TimeSeriesPoint[]): TimeSeriesPoint[] {
  if (timeSeries.length < 2) return timeSeries
  
  const filled: TimeSeriesPoint[] = []
  const sortedSeries = [...timeSeries].sort((a, b) => a.timestamp - b.timestamp)
  
  for (let i = 0; i < sortedSeries.length - 1; i++) {
    filled.push(sortedSeries[i])
    
    const current = new Date(sortedSeries[i].timestamp)
    const next = new Date(sortedSeries[i + 1].timestamp)
    
    // Calculate month difference
    const monthDiff = (next.getFullYear() - current.getFullYear()) * 12 + 
                     (next.getMonth() - current.getMonth())
    
    // Only fill if there's more than 1 month gap
    if (monthDiff > 1) {
      for (let j = 1; j < monthDiff; j++) {
        const fillDate = new Date(current.getFullYear(), current.getMonth() + j, 1)
        const interpolatedValue = linearInterpolate(
          sortedSeries[i].value,
          sortedSeries[i + 1].value,
          j / monthDiff
        )
        
        filled.push({
          timestamp: fillDate.getTime(),
          value: Math.round(interpolatedValue),
          month: `${fillDate.getFullYear()}-${String(fillDate.getMonth() + 1).padStart(2, '0')}`,
          year: fillDate.getFullYear()
        })
      }
    }
  }
  
  filled.push(sortedSeries[sortedSeries.length - 1])
  return filled
}

/**
 * Linear interpolation between two values
 */
function linearInterpolate(y1: number, y2: number, t: number): number {
  return y1 + (y2 - y1) * t
}

/**
 * Normalize data using min-max scaling
 */
export function normalizeData(values: number[]): { normalized: number[], scaleParams: PreprocessedData['scaleParams'] } {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length)
  
  // Handle case where all values are the same
  const range = max - min
  const normalized = range === 0 ? values.map(() => 0) : values.map(val => (val - min) / range)
  
  return {
    normalized,
    scaleParams: { min, max, mean, std }
  }
}

/**
 * Denormalize data back to original scale
 */
export function denormalizeData(normalizedValues: number[], scaleParams: PreprocessedData['scaleParams']): number[] {
  return normalizedValues.map(val => val * (scaleParams.max - scaleParams.min) + scaleParams.min)
}

/**
 * Create feature matrix for time series prediction
 * Uses sliding window approach with lag features
 */
export function createFeatureMatrix(timeSeries: TimeSeriesPoint[], windowSize: number = 3): { features: number[][], targets: number[] } {
  const features: number[][] = []
  const targets: number[] = []
  
  for (let i = windowSize; i < timeSeries.length; i++) {
    const feature = []
    
    // Add lag features (previous values)
    for (let j = 0; j < windowSize; j++) {
      feature.push(timeSeries[i - windowSize + j].value)
    }
    
    // Add time-based features
    const currentDate = new Date(timeSeries[i].timestamp)
    feature.push(currentDate.getMonth() + 1) // Month (1-12)
    feature.push(currentDate.getFullYear()) // Year
    
    // Add trend feature (simple linear trend)
    const trendSlope = (timeSeries[i - 1].value - timeSeries[i - windowSize].value) / windowSize
    feature.push(trendSlope)
    
    features.push(feature)
    targets.push(timeSeries[i].value)
  }
  
  return { features, targets }
}

/**
 * Detect and remove outliers using IQR method
 */
export function removeOutliers(timeSeries: TimeSeriesPoint[]): TimeSeriesPoint[] {
  const values = timeSeries.map(point => point.value)
  const sortedValues = [...values].sort((a, b) => a - b)
  
  const q1Index = Math.floor(sortedValues.length * 0.25)
  const q3Index = Math.floor(sortedValues.length * 0.75)
  const q1 = sortedValues[q1Index]
  const q3 = sortedValues[q3Index]
  const iqr = q3 - q1
  
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  
  return timeSeries.filter(point => 
    point.value >= lowerBound && point.value <= upperBound
  )
}

/**
 * Calculate moving average for smoothing
 */
export function calculateMovingAverage(timeSeries: TimeSeriesPoint[], windowSize: number): TimeSeriesPoint[] {
  const smoothed: TimeSeriesPoint[] = []
  
  for (let i = 0; i < timeSeries.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2))
    const end = Math.min(timeSeries.length, i + Math.ceil(windowSize / 2))
    
    const windowValues = timeSeries.slice(start, end).map(point => point.value)
    const average = windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length
    
    smoothed.push({
      ...timeSeries[i],
      value: average
    })
  }
  
  return smoothed
}

/**
 * Simple seasonal decomposition
 */
export function decomposeSeasonality(timeSeries: TimeSeriesPoint[], seasonLength: number = 12): SeasonalComponents {
  const values = timeSeries.map(point => point.value)
  
  // Calculate trend using moving average
  const trend = calculateMovingAverage(timeSeries, seasonLength).map(point => point.value)
  
  // Calculate seasonal component
  const seasonal: number[] = new Array(values.length).fill(0)
  const seasonalAverages: number[] = new Array(seasonLength).fill(0)
  const seasonalCounts: number[] = new Array(seasonLength).fill(0)
  
  // Calculate average for each season
  for (let i = 0; i < values.length; i++) {
    const seasonIndex = i % seasonLength
    const detrended = values[i] - trend[i]
    seasonalAverages[seasonIndex] += detrended
    seasonalCounts[seasonIndex]++
  }
  
  // Average the seasonal components
  for (let i = 0; i < seasonLength; i++) {
    if (seasonalCounts[i] > 0) {
      seasonalAverages[i] /= seasonalCounts[i]
    }
  }
  
  // Apply seasonal pattern
  for (let i = 0; i < values.length; i++) {
    seasonal[i] = seasonalAverages[i % seasonLength]
  }
  
  // Calculate residual
  const residual = values.map((val, i) => val - trend[i] - seasonal[i])
  
  return { trend, seasonal, residual }
}

/**
 * Validate data quality for prediction
 */
export function validateDataQuality(timeSeries: TimeSeriesPoint[]): {
  isValid: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []
  
  // Check minimum data points
  if (timeSeries.length < 6) {
    issues.push('Insufficient data points (minimum 6 months required)')
    recommendations.push('Collect more historical data for better predictions')
  }
  
  // Check for gaps in data
  const sortedSeries = [...timeSeries].sort((a, b) => a.timestamp - b.timestamp)
  let hasGaps = false
  for (let i = 1; i < sortedSeries.length; i++) {
    const prevDate = new Date(sortedSeries[i - 1].timestamp)
    const currDate = new Date(sortedSeries[i].timestamp)
    const monthDiff = (currDate.getFullYear() - prevDate.getFullYear()) * 12 + 
                     (currDate.getMonth() - prevDate.getMonth())
    
    if (monthDiff > 1) {
      hasGaps = true
      break
    }
  }
  
  if (hasGaps) {
    issues.push('Data contains gaps in time series')
    recommendations.push('Fill missing months with interpolated values')
  }
  
  // Check for negative values
  const hasNegativeValues = timeSeries.some(point => point.value < 0)
  if (hasNegativeValues) {
    issues.push('Data contains negative values')
    recommendations.push('Review data for errors or handle negative values appropriately')
  }
  
  // Check for extreme outliers
  const values = timeSeries.map(point => point.value)
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length)
  const hasExtremeOutliers = values.some(val => Math.abs(val - mean) > 3 * std)
  
  if (hasExtremeOutliers) {
    issues.push('Data contains extreme outliers')
    recommendations.push('Consider outlier detection and removal')
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  }
}

/**
 * Prepare data for TensorFlow.js model training
 */
export function prepareForTraining(
  timeSeries: TimeSeriesPoint[], 
  windowSize: number = 3,
  testSplit: number = 0.2
): {
  trainFeatures: number[][]
  trainTargets: number[]
  testFeatures: number[][]
  testTargets: number[]
  scaleParams: PreprocessedData['scaleParams']
} {
  // Fill missing months and remove outliers
  const cleanedSeries = removeOutliers(fillMissingMonths(timeSeries))
  
  // Create feature matrix
  const { features, targets } = createFeatureMatrix(cleanedSeries, windowSize)
  
  // Normalize targets
  const { normalized: normalizedTargets, scaleParams } = normalizeData(targets)
  
  // Normalize features (each column separately)
  const normalizedFeatures = features.map(row => {
    return row.map((val, colIndex) => {
      const columnValues = features.map(r => r[colIndex])
      const min = Math.min(...columnValues)
      const max = Math.max(...columnValues)
      return max > min ? (val - min) / (max - min) : 0
    })
  })
  
  // Split into train/test sets
  const splitIndex = Math.floor(features.length * (1 - testSplit))
  
  return {
    trainFeatures: normalizedFeatures.slice(0, splitIndex),
    trainTargets: normalizedTargets.slice(0, splitIndex),
    testFeatures: normalizedFeatures.slice(splitIndex),
    testTargets: normalizedTargets.slice(splitIndex),
    scaleParams
  }
}