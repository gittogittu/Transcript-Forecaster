import { 
  TimeSeriesData, 
  DetectedAnomaly, 
  StatisticalAnomalyConfig, 
  SeasonalDecomposition,
  StatisticalMetrics,
  AnomalyType,
  AnomalySeverity,
  DetectionMethod
} from './types'

/**
 * Statistical Anomaly Detector
 * Implements z-score, IQR, and seasonal decomposition methods
 */
export class StatisticalAnomalyDetector {
  private config: StatisticalAnomalyConfig

  constructor(config: Partial<StatisticalAnomalyConfig> = {}) {
    this.config = {
      zScoreThreshold: 3.0,
      iqrMultiplier: 1.5,
      seasonalPeriods: [7, 30, 365], // daily, monthly, yearly patterns
      windowSize: 50,
      minDataPoints: 30,
      ...config
    }
  }

  /**
   * Detect anomalies using multiple statistical methods
   */
  async detectAnomalies(data: TimeSeriesData): Promise<DetectedAnomaly[]> {
    if (data.values.length < this.config.minDataPoints) {
      throw new Error(`Insufficient data points. Need at least ${this.config.minDataPoints}`)
    }

    const anomalies: DetectedAnomaly[] = []

    // Z-Score based detection
    const zScoreAnomalies = await this.detectZScoreAnomalies(data)
    anomalies.push(...zScoreAnomalies)

    // IQR based detection
    const iqrAnomalies = await this.detectIQRAnomalies(data)
    anomalies.push(...iqrAnomalies)

    // Seasonal decomposition based detection
    const seasonalAnomalies = await this.detectSeasonalAnomalies(data)
    anomalies.push(...seasonalAnomalies)

    // Remove duplicates and merge overlapping detections
    return this.mergeDuplicateAnomalies(anomalies)
  }

  /**
   * Z-Score based anomaly detection
   */
  async detectZScoreAnomalies(data: TimeSeriesData): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = []
    const { values, timestamps } = data
    
    // Use rolling window for dynamic threshold calculation
    for (let i = this.config.windowSize; i < values.length; i++) {
      const window = values.slice(i - this.config.windowSize, i)
      const stats = this.calculateStatistics(window)
      
      const currentValue = values[i]
      const zScore = Math.abs((currentValue - stats.mean) / stats.std)
      
      if (zScore > this.config.zScoreThreshold) {
        const anomaly: DetectedAnomaly = {
          id: `zscore_${i}_${Date.now()}`,
          clientId: data.clientId || 'unknown',
          timestamp: timestamps[i],
          actualValue: currentValue,
          expectedValue: stats.mean,
          deviationScore: zScore,
          type: 'point' as AnomalyType,
          severity: this.calculateSeverity(zScore, this.config.zScoreThreshold),
          detectionMethod: 'z_score' as DetectionMethod,
          explanation: `Value ${currentValue.toFixed(2)} deviates ${zScore.toFixed(2)} standard deviations from the rolling mean of ${stats.mean.toFixed(2)}`,
          confidence: Math.min(0.95, zScore / this.config.zScoreThreshold * 0.8),
          isResolved: false,
          metadata: {
            zScore,
            rollingMean: stats.mean,
            rollingStd: stats.std,
            windowSize: this.config.windowSize
          }
        }
        anomalies.push(anomaly)
      }
    }

    return anomalies
  }

  /**
   * IQR (Interquartile Range) based anomaly detection
   */
  async detectIQRAnomalies(data: TimeSeriesData): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = []
    const { values, timestamps } = data
    
    // Use rolling window for dynamic IQR calculation
    for (let i = this.config.windowSize; i < values.length; i++) {
      const window = values.slice(i - this.config.windowSize, i)
      const stats = this.calculateStatistics(window)
      
      const lowerBound = stats.q1 - this.config.iqrMultiplier * stats.iqr
      const upperBound = stats.q3 + this.config.iqrMultiplier * stats.iqr
      const currentValue = values[i]
      
      if (currentValue < lowerBound || currentValue > upperBound) {
        const deviation = currentValue < lowerBound 
          ? (lowerBound - currentValue) / stats.iqr
          : (currentValue - upperBound) / stats.iqr
          
        const anomaly: DetectedAnomaly = {
          id: `iqr_${i}_${Date.now()}`,
          clientId: data.clientId || 'unknown',
          timestamp: timestamps[i],
          actualValue: currentValue,
          expectedValue: stats.median,
          deviationScore: deviation,
          type: 'point' as AnomalyType,
          severity: this.calculateSeverity(deviation, 1.0),
          detectionMethod: 'iqr' as DetectionMethod,
          explanation: `Value ${currentValue.toFixed(2)} is outside IQR bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
          confidence: Math.min(0.9, deviation * 0.6),
          isResolved: false,
          metadata: {
            iqrMultiplier: this.config.iqrMultiplier,
            lowerBound,
            upperBound,
            q1: stats.q1,
            q3: stats.q3,
            iqr: stats.iqr
          }
        }
        anomalies.push(anomaly)
      }
    }

    return anomalies
  }

  /**
   * Seasonal decomposition based anomaly detection
   */
  async detectSeasonalAnomalies(data: TimeSeriesData): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = []
    
    for (const period of this.config.seasonalPeriods) {
      if (data.values.length < period * 2) continue
      
      const decomposition = this.performSeasonalDecomposition(data.values, period)
      const residualAnomalies = await this.detectResidualAnomalies(
        data, 
        decomposition, 
        period
      )
      anomalies.push(...residualAnomalies)
    }

    return anomalies
  }

  /**
   * Perform seasonal decomposition using additive model
   */
  private performSeasonalDecomposition(values: number[], period: number): SeasonalDecomposition {
    const n = values.length
    const trend: number[] = new Array(n).fill(0)
    const seasonal: number[] = new Array(n).fill(0)
    const residual: number[] = new Array(n).fill(0)

    // Calculate trend using moving average
    const halfPeriod = Math.floor(period / 2)
    for (let i = halfPeriod; i < n - halfPeriod; i++) {
      let sum = 0
      for (let j = i - halfPeriod; j <= i + halfPeriod; j++) {
        sum += values[j]
      }
      trend[i] = sum / (2 * halfPeriod + 1)
    }

    // Calculate seasonal component
    const seasonalSums: number[] = new Array(period).fill(0)
    const seasonalCounts: number[] = new Array(period).fill(0)
    
    for (let i = halfPeriod; i < n - halfPeriod; i++) {
      const seasonalIndex = i % period
      const detrended = values[i] - trend[i]
      seasonalSums[seasonalIndex] += detrended
      seasonalCounts[seasonalIndex]++
    }

    const seasonalPattern = seasonalSums.map((sum, i) => 
      seasonalCounts[i] > 0 ? sum / seasonalCounts[i] : 0
    )

    // Apply seasonal pattern to all data points
    for (let i = 0; i < n; i++) {
      seasonal[i] = seasonalPattern[i % period]
      residual[i] = values[i] - trend[i] - seasonal[i]
    }

    return {
      trend,
      seasonal,
      residual,
      timestamps: [] // Will be filled by caller if needed
    }
  }

  /**
   * Detect anomalies in residual component
   */
  private async detectResidualAnomalies(
    data: TimeSeriesData, 
    decomposition: SeasonalDecomposition, 
    period: number
  ): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = []
    const { residual } = decomposition
    const stats = this.calculateStatistics(residual.filter(r => !isNaN(r) && isFinite(r)))
    
    const threshold = 2.5 * stats.std // More conservative threshold for residuals
    
    for (let i = 0; i < residual.length; i++) {
      if (Math.abs(residual[i]) > threshold) {
        const expectedValue = data.values[i] - residual[i]
        const deviationScore = Math.abs(residual[i]) / stats.std
        
        const anomaly: DetectedAnomaly = {
          id: `seasonal_${period}_${i}_${Date.now()}`,
          clientId: data.clientId || 'unknown',
          timestamp: data.timestamps[i],
          actualValue: data.values[i],
          expectedValue,
          deviationScore,
          type: 'contextual' as AnomalyType,
          severity: this.calculateSeverity(deviationScore, 2.5),
          detectionMethod: 'seasonal_decomposition' as DetectionMethod,
          explanation: `Seasonal residual ${residual[i].toFixed(2)} exceeds threshold for ${period}-period seasonality`,
          confidence: Math.min(0.85, deviationScore / 2.5 * 0.7),
          isResolved: false,
          metadata: {
            period,
            residual: residual[i],
            trend: decomposition.trend[i],
            seasonal: decomposition.seasonal[i],
            residualThreshold: threshold
          }
        }
        anomalies.push(anomaly)
      }
    }

    return anomalies
  }

  /**
   * Calculate statistical metrics for a dataset
   */
  private calculateStatistics(values: number[]): StatisticalMetrics {
    const sorted = [...values].sort((a, b) => a - b)
    const n = sorted.length
    
    const mean = values.reduce((sum, val) => sum + val, 0) / n
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
    const std = Math.sqrt(variance)
    
    const q1Index = Math.floor(n * 0.25)
    const q3Index = Math.floor(n * 0.75)
    const medianIndex = Math.floor(n * 0.5)
    
    const q1 = sorted[q1Index]
    const q3 = sorted[q3Index]
    const median = n % 2 === 0 
      ? (sorted[medianIndex - 1] + sorted[medianIndex]) / 2 
      : sorted[medianIndex]
    
    return {
      mean,
      std,
      median,
      q1,
      q3,
      iqr: q3 - q1,
      min: sorted[0],
      max: sorted[n - 1]
    }
  }

  /**
   * Calculate severity based on deviation score
   */
  private calculateSeverity(deviationScore: number, threshold: number): AnomalySeverity {
    const ratio = deviationScore / threshold
    
    if (ratio >= 3.0) return 'critical'
    if (ratio >= 2.0) return 'high'
    if (ratio >= 1.5) return 'medium'
    return 'low'
  }

  /**
   * Merge duplicate anomalies detected by different methods
   */
  private mergeDuplicateAnomalies(anomalies: DetectedAnomaly[]): DetectedAnomaly[] {
    const merged: DetectedAnomaly[] = []
    const timeWindow = 5 * 60 * 1000 // 5 minutes in milliseconds
    
    anomalies.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    
    for (const anomaly of anomalies) {
      const existing = merged.find(m => 
        Math.abs(m.timestamp.getTime() - anomaly.timestamp.getTime()) < timeWindow &&
        m.clientId === anomaly.clientId
      )
      
      if (existing) {
        // Merge with existing anomaly - keep the one with higher confidence
        if (anomaly.confidence > existing.confidence) {
          const index = merged.indexOf(existing)
          merged[index] = {
            ...anomaly,
            detectionMethod: 'ensemble' as DetectionMethod,
            explanation: `${existing.explanation}; ${anomaly.explanation}`,
            metadata: {
              ...existing.metadata,
              ...anomaly.metadata,
              mergedMethods: [existing.detectionMethod, anomaly.detectionMethod]
            }
          }
        }
      } else {
        merged.push(anomaly)
      }
    }
    
    return merged
  }
}