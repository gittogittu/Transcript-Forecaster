/**
 * Statistical Feature Engineering
 * Generates autocorrelations, stationarity tests, and statistical indicators
 */

export interface StatisticalFeatures {
  autocorrelations: number[]
  partialAutocorrelations: number[]
  stationarityTests: StationarityResult[]
  seasonalityTests: SeasonalityResult[]
  changePoints: ChangePoint[]
  variance: number
  skewness: number
  kurtosis: number
  entropy: number
}

export interface StationarityResult {
  testName: string
  statistic: number
  pValue: number
  isStationary: boolean
  criticalValues?: Record<string, number>
}

export interface SeasonalityResult {
  period: number
  strength: number
  significance: number
  isSignificant: boolean
}

export interface ChangePoint {
  index: number
  timestamp?: Date
  confidence: number
  changeType: 'mean' | 'variance' | 'trend'
}

export class StatisticalFeatureExtractor {
  /**
   * Extract comprehensive statistical features from time series data
   */
  static extractStatisticalFeatures(
    values: number[],
    timestamps?: Date[],
    config: {
      maxLags?: number
      seasonalPeriods?: number[]
      changePointSensitivity?: number
    } = {}
  ): StatisticalFeatures {
    const {
      maxLags = Math.min(20, Math.floor(values.length / 4)),
      seasonalPeriods = [7, 30, 365],
      changePointSensitivity = 0.05
    } = config

    return {
      autocorrelations: this.calculateAutocorrelations(values, maxLags),
      partialAutocorrelations: this.calculatePartialAutocorrelations(values, maxLags),
      stationarityTests: this.performStationarityTests(values),
      seasonalityTests: this.performSeasonalityTests(values, seasonalPeriods),
      changePoints: this.detectChangePoints(values, timestamps, changePointSensitivity),
      variance: this.calculateVariance(values),
      skewness: this.calculateSkewness(values),
      kurtosis: this.calculateKurtosis(values),
      entropy: this.calculateEntropy(values)
    }
  }

  /**
   * Calculate autocorrelation function
   */
  private static calculateAutocorrelations(values: number[], maxLags: number): number[] {
    const n = values.length
    
    if (n === 0) return []
    if (n === 1) return [1] // Single value has perfect autocorrelation with itself
    
    const mean = values.reduce((sum, val) => sum + val, 0) / n
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
    
    const autocorrelations: number[] = []
    
    for (let lag = 0; lag <= maxLags && lag < n; lag++) {
      let covariance = 0
      const count = n - lag
      
      for (let i = 0; i < count; i++) {
        covariance += (values[i] - mean) * (values[i + lag] - mean)
      }
      
      covariance /= count
      autocorrelations.push(variance > 0 ? covariance / variance : (lag === 0 ? 1 : 0))
    }
    
    return autocorrelations
  }

  /**
   * Calculate partial autocorrelation function using Yule-Walker equations
   */
  private static calculatePartialAutocorrelations(values: number[], maxLags: number): number[] {
    const autocorrs = this.calculateAutocorrelations(values, maxLags)
    const partialAutocorrs: number[] = [1] // PACF at lag 0 is always 1
    
    for (let k = 1; k <= maxLags; k++) {
      if (k === 1) {
        partialAutocorrs.push(autocorrs[1])
      } else {
        // Solve Yule-Walker equations for partial autocorrelation
        let numerator = autocorrs[k]
        let denominator = 1
        
        for (let j = 1; j < k; j++) {
          numerator -= partialAutocorrs[j] * autocorrs[k - j]
        }
        
        partialAutocorrs.push(numerator / denominator)
      }
    }
    
    return partialAutocorrs
  }

  /**
   * Perform stationarity tests (Augmented Dickey-Fuller approximation)
   */
  private static performStationarityTests(values: number[]): StationarityResult[] {
    const results: StationarityResult[] = []
    
    // Simple ADF test approximation
    const adfResult = this.augmentedDickeyFullerTest(values)
    results.push(adfResult)
    
    // KPSS test approximation
    const kpssResult = this.kpssTest(values)
    results.push(kpssResult)
    
    return results
  }

  /**
   * Simplified Augmented Dickey-Fuller test
   */
  private static augmentedDickeyFullerTest(values: number[]): StationarityResult {
    const n = values.length
    const diffs = values.slice(1).map((val, i) => val - values[i])
    const laggedValues = values.slice(0, -1)
    
    // Simple regression: diff[t] = alpha + beta * values[t-1] + error
    const meanDiff = diffs.reduce((sum, val) => sum + val, 0) / diffs.length
    const meanLagged = laggedValues.reduce((sum, val) => sum + val, 0) / laggedValues.length
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < diffs.length; i++) {
      numerator += (laggedValues[i] - meanLagged) * (diffs[i] - meanDiff)
      denominator += Math.pow(laggedValues[i] - meanLagged, 2)
    }
    
    const beta = denominator > 0 ? numerator / denominator : 0
    const tStatistic = beta * Math.sqrt(n) // Simplified t-statistic
    
    return {
      testName: 'Augmented Dickey-Fuller',
      statistic: tStatistic,
      pValue: this.approximatePValue(tStatistic),
      isStationary: tStatistic < -2.86, // Approximate critical value
      criticalValues: {
        '1%': -3.43,
        '5%': -2.86,
        '10%': -2.57
      }
    }
  }

  /**
   * Simplified KPSS test
   */
  private static kpssTest(values: number[]): StationarityResult {
    const n = values.length
    const mean = values.reduce((sum, val) => sum + val, 0) / n
    
    // Calculate cumulative sum of deviations
    let cumulativeSum = 0
    const cumulativeSums: number[] = []
    
    for (const value of values) {
      cumulativeSum += value - mean
      cumulativeSums.push(cumulativeSum)
    }
    
    // Calculate test statistic
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
    const sumSquares = cumulativeSums.reduce((sum, val) => sum + Math.pow(val, 2), 0)
    const kpssStatistic = sumSquares / (n * n * variance)
    
    return {
      testName: 'KPSS',
      statistic: kpssStatistic,
      pValue: this.approximatePValue(kpssStatistic),
      isStationary: kpssStatistic < 0.463, // 5% critical value
      criticalValues: {
        '1%': 0.739,
        '5%': 0.463,
        '10%': 0.347
      }
    }
  }

  /**
   * Perform seasonality tests
   */
  private static performSeasonalityTests(values: number[], periods: number[]): SeasonalityResult[] {
    return periods.map(period => {
      const strength = this.calculateSeasonalStrength(values, period)
      const significance = this.testSeasonalSignificance(values, period)
      
      return {
        period,
        strength,
        significance,
        isSignificant: significance > 0.1 // Threshold for significance
      }
    })
  }

  /**
   * Calculate seasonal strength using autocorrelation at seasonal lag
   */
  private static calculateSeasonalStrength(values: number[], period: number): number {
    if (period >= values.length) return 0
    
    const autocorrs = this.calculateAutocorrelations(values, period)
    return Math.abs(autocorrs[period] || 0)
  }

  /**
   * Test seasonal significance using spectral analysis approximation
   */
  private static testSeasonalSignificance(values: number[], period: number): number {
    if (period >= values.length) return 0
    
    // Simple periodogram-based test
    const n = values.length
    const frequency = 2 * Math.PI / period
    
    let cosSum = 0
    let sinSum = 0
    
    for (let i = 0; i < n; i++) {
      cosSum += values[i] * Math.cos(frequency * i)
      sinSum += values[i] * Math.sin(frequency * i)
    }
    
    const power = (cosSum * cosSum + sinSum * sinSum) / n
    const totalVariance = this.calculateVariance(values)
    
    return totalVariance > 0 ? power / totalVariance : 0
  }

  /**
   * Detect change points using CUSUM-like algorithm
   */
  private static detectChangePoints(
    values: number[],
    timestamps?: Date[],
    sensitivity: number = 0.05
  ): ChangePoint[] {
    const changePoints: ChangePoint[] = []
    const n = values.length
    
    if (n < 10) return changePoints // Need minimum data for change point detection
    
    const mean = values.reduce((sum, val) => sum + val, 0) / n
    const std = Math.sqrt(this.calculateVariance(values))
    
    let cumulativeSum = 0
    const threshold = sensitivity * std * Math.sqrt(n)
    
    for (let i = 1; i < n - 1; i++) {
      cumulativeSum += values[i] - mean
      
      if (Math.abs(cumulativeSum) > threshold) {
        changePoints.push({
          index: i,
          timestamp: timestamps?.[i],
          confidence: Math.min(1, Math.abs(cumulativeSum) / threshold),
          changeType: 'mean' // Simplified - could detect variance/trend changes too
        })
        
        cumulativeSum = 0 // Reset after detecting change point
      }
    }
    
    return changePoints
  }

  /**
   * Calculate variance
   */
  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  }

  /**
   * Calculate skewness
   */
  private static calculateSkewness(values: number[]): number {
    const n = values.length
    const mean = values.reduce((sum, val) => sum + val, 0) / n
    const variance = this.calculateVariance(values)
    const std = Math.sqrt(variance)
    
    if (std === 0) return 0
    
    const skewness = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / std, 3)
    }, 0) / n
    
    return skewness
  }

  /**
   * Calculate kurtosis
   */
  private static calculateKurtosis(values: number[]): number {
    const n = values.length
    const mean = values.reduce((sum, val) => sum + val, 0) / n
    const variance = this.calculateVariance(values)
    const std = Math.sqrt(variance)
    
    if (std === 0) return 0
    
    const kurtosis = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / std, 4)
    }, 0) / n
    
    return kurtosis - 3 // Excess kurtosis
  }

  /**
   * Calculate entropy (information content)
   */
  private static calculateEntropy(values: number[]): number {
    // Discretize values into bins for entropy calculation
    const bins = 10
    const min = Math.min(...values)
    const max = Math.max(...values)
    const binWidth = (max - min) / bins
    
    if (binWidth === 0) return 0
    
    const binCounts = new Array(bins).fill(0)
    
    for (const value of values) {
      const binIndex = Math.min(bins - 1, Math.floor((value - min) / binWidth))
      binCounts[binIndex]++
    }
    
    const n = values.length
    let entropy = 0
    
    for (const count of binCounts) {
      if (count > 0) {
        const probability = count / n
        entropy -= probability * Math.log2(probability)
      }
    }
    
    return entropy
  }

  /**
   * Approximate p-value for test statistics
   */
  private static approximatePValue(statistic: number): number {
    // Very simplified p-value approximation using standard normal
    const absStatistic = Math.abs(statistic)
    
    if (absStatistic > 3) return 0.001
    if (absStatistic > 2.5) return 0.01
    if (absStatistic > 2) return 0.05
    if (absStatistic > 1.5) return 0.1
    
    return 0.5 - 0.1 * absStatistic // Linear approximation
  }
}