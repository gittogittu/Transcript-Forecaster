/**
 * Time-based Feature Engineering
 * Generates lag features, rolling statistics, and seasonal indicators
 */

import { addDays, differenceInDays, format, isWeekend, getDay, getMonth, getQuarter } from 'date-fns'

export interface TimeSeriesData {
  timestamps: Date[]
  values: number[]
  clientId?: string
}

export interface TimeFeatures {
  lags: number[]
  rollingMeans: number[]
  rollingStds: number[]
  seasonalIndicators: number[]
  trendComponents: number[]
  cyclicalComponents: number[]
  dayOfWeek: number[]
  monthOfYear: number[]
  quarterOfYear: number[]
  isWeekend: boolean[]
  daysSinceStart: number[]
}

export class TimeFeatureExtractor {
  /**
   * Extract comprehensive time-based features from time series data
   */
  static extractTimeFeatures(
    data: TimeSeriesData,
    config: {
      lagPeriods?: number[]
      rollingWindows?: number[]
      seasonalPeriods?: number[]
    } = {}
  ): TimeFeatures {
    const {
      lagPeriods = [1, 7, 14, 30],
      rollingWindows = [7, 14, 30],
      seasonalPeriods = [7, 30, 365]
    } = config

    const { timestamps, values } = data
    const n = timestamps.length

    // Initialize feature arrays
    const features: TimeFeatures = {
      lags: [],
      rollingMeans: [],
      rollingStds: [],
      seasonalIndicators: [],
      trendComponents: [],
      cyclicalComponents: [],
      dayOfWeek: [],
      monthOfYear: [],
      quarterOfYear: [],
      isWeekend: [],
      daysSinceStart: []
    }

    // Extract basic time features
    const startDate = timestamps[0]
    for (let i = 0; i < n; i++) {
      const date = timestamps[i]
      
      features.dayOfWeek.push(getDay(date))
      features.monthOfYear.push(getMonth(date) + 1) // 1-based months
      features.quarterOfYear.push(getQuarter(date))
      features.isWeekend.push(isWeekend(date))
      features.daysSinceStart.push(differenceInDays(date, startDate))
    }

    // Generate lag features
    features.lags = this.generateLagFeatures(values, lagPeriods)

    // Generate rolling statistics
    const rollingStats = this.generateRollingStatistics(values, rollingWindows)
    features.rollingMeans = rollingStats.means
    features.rollingStds = rollingStats.stds

    // Generate seasonal indicators
    features.seasonalIndicators = this.generateSeasonalIndicators(
      timestamps,
      values,
      seasonalPeriods
    )

    // Decompose trend and cyclical components
    const decomposition = this.decomposeTimeSeries(values, seasonalPeriods[0])
    features.trendComponents = decomposition.trend
    features.cyclicalComponents = decomposition.cyclical

    return features
  }

  /**
   * Generate lag features for specified periods
   */
  private static generateLagFeatures(values: number[], lagPeriods: number[]): number[] {
    const lagFeatures: number[] = []
    
    for (let i = 0; i < values.length; i++) {
      const lagValues: number[] = []
      
      for (const lag of lagPeriods) {
        if (i >= lag) {
          lagValues.push(values[i - lag])
        } else {
          lagValues.push(0) // Pad with zeros for insufficient history
        }
      }
      
      // Combine lag features (could use different aggregation strategies)
      lagFeatures.push(lagValues.reduce((sum, val) => sum + val, 0) / lagValues.length)
    }
    
    return lagFeatures
  }

  /**
   * Generate rolling statistics (means and standard deviations)
   */
  private static generateRollingStatistics(
    values: number[],
    windows: number[]
  ): { means: number[]; stds: number[] } {
    const means: number[] = []
    const stds: number[] = []

    for (let i = 0; i < values.length; i++) {
      const windowMeans: number[] = []
      const windowStds: number[] = []

      for (const window of windows) {
        const start = Math.max(0, i - window + 1)
        const windowValues = values.slice(start, i + 1)
        
        const mean = windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length
        const variance = windowValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / windowValues.length
        const std = Math.sqrt(variance)

        windowMeans.push(mean)
        windowStds.push(std)
      }

      // Aggregate window statistics
      means.push(windowMeans.reduce((sum, val) => sum + val, 0) / windowMeans.length)
      stds.push(windowStds.reduce((sum, val) => sum + val, 0) / windowStds.length)
    }

    return { means, stds }
  }

  /**
   * Generate seasonal indicators using Fourier transforms
   */
  private static generateSeasonalIndicators(
    timestamps: Date[],
    values: number[],
    periods: number[]
  ): number[] {
    const indicators: number[] = []

    for (let i = 0; i < timestamps.length; i++) {
      const seasonalComponents: number[] = []

      for (const period of periods) {
        // Simple seasonal indicator based on position in cycle
        const dayOfYear = Math.floor(differenceInDays(timestamps[i], new Date(timestamps[i].getFullYear(), 0, 1)))
        const seasonalValue = Math.sin(2 * Math.PI * dayOfYear / period)
        seasonalComponents.push(seasonalValue)
      }

      indicators.push(seasonalComponents.reduce((sum, val) => sum + val, 0) / seasonalComponents.length)
    }

    return indicators
  }

  /**
   * Decompose time series into trend and cyclical components
   */
  private static decomposeTimeSeries(
    values: number[],
    seasonalPeriod: number
  ): { trend: number[]; cyclical: number[] } {
    const trend: number[] = []
    const cyclical: number[] = []

    // Simple moving average for trend
    const windowSize = Math.min(seasonalPeriod, Math.floor(values.length / 4))

    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2))
      const end = Math.min(values.length, i + Math.floor(windowSize / 2) + 1)
      const window = values.slice(start, end)
      
      const trendValue = window.reduce((sum, val) => sum + val, 0) / window.length
      trend.push(trendValue)
      
      // Cyclical component is the residual after removing trend
      cyclical.push(values[i] - trendValue)
    }

    return { trend, cyclical }
  }

  /**
   * Generate time-based features for a specific date
   */
  static generateDateFeatures(date: Date): {
    dayOfWeek: number
    monthOfYear: number
    quarterOfYear: number
    isWeekend: boolean
    dayOfMonth: number
    weekOfYear: number
  } {
    return {
      dayOfWeek: getDay(date),
      monthOfYear: getMonth(date) + 1,
      quarterOfYear: getQuarter(date),
      isWeekend: isWeekend(date),
      dayOfMonth: date.getDate(),
      weekOfYear: Math.ceil(date.getDate() / 7)
    }
  }

  /**
   * Create lag features for real-time prediction
   */
  static createRealTimeLagFeatures(
    historicalValues: number[],
    lagPeriods: number[]
  ): Record<string, number> {
    const features: Record<string, number> = {}
    
    for (const lag of lagPeriods) {
      const index = historicalValues.length - lag - 1
      if (index >= 0) {
        features[`lag_${lag}`] = historicalValues[index]
      } else {
        features[`lag_${lag}`] = 0
      }
    }
    
    return features
  }
}