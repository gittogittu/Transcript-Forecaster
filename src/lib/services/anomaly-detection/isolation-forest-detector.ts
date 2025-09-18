import { 
  TimeSeriesData, 
  DetectedAnomaly, 
  IsolationForestConfig,
  AnomalyType,
  AnomalySeverity,
  DetectionMethod,
  ContextualFeatures
} from './types'

/**
 * Isolation Forest Anomaly Detector
 * Uses ensemble of isolation trees for anomaly detection
 */
export class IsolationForestDetector {
  private config: IsolationForestConfig
  private trees: IsolationTree[] = []
  private isTrained = false
  private featureExtractor: FeatureExtractor

  constructor(config: Partial<IsolationForestConfig> = {}) {
    this.config = {
      nEstimators: 100,
      maxSamples: 'auto',
      contamination: 0.1,
      maxFeatures: 1.0,
      randomState: 42,
      ...config
    }
    this.featureExtractor = new FeatureExtractor()
  }

  /**
   * Train the isolation forest model
   */
  async train(data: TimeSeriesData): Promise<void> {
    const features = await this.featureExtractor.extractFeatures(data)
    
    if (features.length === 0) {
      throw new Error('No features extracted from training data')
    }

    this.trees = []
    const maxSamples = this.getMaxSamples(features.length)
    
    for (let i = 0; i < this.config.nEstimators; i++) {
      const tree = new IsolationTree(this.config.maxFeatures)
      const sampleIndices = this.sampleIndices(features.length, maxSamples, i)
      const sampledFeatures = sampleIndices.map(idx => features[idx])
      
      await tree.fit(sampledFeatures)
      this.trees.push(tree)
    }
    
    this.isTrained = true
  }

  /**
   * Detect anomalies using trained isolation forest
   */
  async detectAnomalies(data: TimeSeriesData): Promise<DetectedAnomaly[]> {
    if (!this.isTrained) {
      throw new Error('Model must be trained before detecting anomalies')
    }

    const features = await this.featureExtractor.extractFeatures(data)
    const anomalies: DetectedAnomaly[] = []
    
    for (let i = 0; i < features.length; i++) {
      const anomalyScore = await this.calculateAnomalyScore(features[i])
      const threshold = this.calculateThreshold()
      
      if (anomalyScore > threshold) {
        const anomaly: DetectedAnomaly = {
          id: `isolation_forest_${i}_${Date.now()}`,
          clientId: data.clientId || 'unknown',
          timestamp: data.timestamps[i],
          actualValue: data.values[i],
          expectedValue: await this.estimateExpectedValue(features[i], i, data),
          deviationScore: anomalyScore,
          type: this.classifyAnomalyType(features[i], i, data),
          severity: this.calculateSeverity(anomalyScore, threshold),
          detectionMethod: 'isolation_forest' as DetectionMethod,
          explanation: this.generateExplanation(features[i], anomalyScore),
          confidence: Math.min(0.95, anomalyScore * 0.8),
          isResolved: false,
          metadata: {
            anomalyScore,
            threshold,
            features: features[i],
            treeDepths: await this.getTreeDepths(features[i])
          }
        }
        anomalies.push(anomaly)
      }
    }

    return anomalies
  }

  /**
   * Update model with new data (incremental learning)
   */
  async updateModel(newData: TimeSeriesData): Promise<void> {
    // For simplicity, retrain the entire model
    // In production, implement incremental learning
    await this.train(newData)
  }

  /**
   * Calculate anomaly score for a feature vector
   */
  private async calculateAnomalyScore(features: number[]): Promise<number> {
    const pathLengths = await Promise.all(
      this.trees.map(tree => tree.pathLength(features))
    )
    
    const avgPathLength = pathLengths.reduce((sum, length) => sum + length, 0) / pathLengths.length
    const expectedLength = this.expectedPathLength(this.getMaxSamples(features.length))
    
    // Anomaly score: 2^(-avgPathLength / expectedLength)
    return Math.pow(2, -avgPathLength / expectedLength)
  }

  /**
   * Calculate dynamic threshold based on contamination rate
   */
  private calculateThreshold(): number {
    // Threshold corresponds to contamination percentile
    return 0.5 + this.config.contamination / 2
  }

  /**
   * Get maximum samples for tree training
   */
  private getMaxSamples(dataSize: number): number {
    if (this.config.maxSamples === 'auto') {
      return Math.min(256, dataSize)
    }
    return typeof this.config.maxSamples === 'number' 
      ? this.config.maxSamples 
      : Math.floor(dataSize * parseFloat(this.config.maxSamples))
  }

  /**
   * Sample indices for tree training
   */
  private sampleIndices(dataSize: number, maxSamples: number, seed: number): number[] {
    const rng = new SeededRandom(seed + (this.config.randomState || 0))
    const indices: number[] = []
    
    for (let i = 0; i < Math.min(maxSamples, dataSize); i++) {
      let idx: number
      do {
        idx = Math.floor(rng.random() * dataSize)
      } while (indices.includes(idx))
      indices.push(idx)
    }
    
    return indices
  }

  /**
   * Calculate expected path length for isolation tree
   */
  private expectedPathLength(n: number): number {
    if (n <= 1) return 0
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n)
  }

  /**
   * Classify anomaly type based on contextual features
   */
  private classifyAnomalyType(features: number[], index: number, data: TimeSeriesData): AnomalyType {
    // Simple heuristic - can be enhanced with more sophisticated logic
    const windowSize = 5
    const start = Math.max(0, index - windowSize)
    const end = Math.min(data.values.length, index + windowSize + 1)
    const window = data.values.slice(start, end)
    
    const currentValue = data.values[index]
    const windowMean = window.reduce((sum, val) => sum + val, 0) / window.length
    const windowStd = Math.sqrt(
      window.reduce((sum, val) => sum + Math.pow(val - windowMean, 2), 0) / window.length
    )
    
    // If multiple consecutive points are anomalous, it's collective
    let consecutiveAnomalies = 0
    for (let i = Math.max(0, index - 2); i <= Math.min(data.values.length - 1, index + 2); i++) {
      if (Math.abs(data.values[i] - windowMean) > 2 * windowStd) {
        consecutiveAnomalies++
      }
    }
    
    if (consecutiveAnomalies >= 3) return 'collective'
    
    // Check if it's contextual (depends on time-based features)
    const timeFeatures = features.slice(-6) // Last 6 features are time-based
    const hasTimeContext = timeFeatures.some(f => f > 0.5)
    
    return hasTimeContext ? 'contextual' : 'point'
  }

  /**
   * Calculate severity based on anomaly score
   */
  private calculateSeverity(score: number, threshold: number): AnomalySeverity {
    const ratio = score / threshold
    
    if (ratio >= 2.0) return 'critical'
    if (ratio >= 1.5) return 'high'
    if (ratio >= 1.2) return 'medium'
    return 'low'
  }

  /**
   * Estimate expected value for anomalous point
   */
  private async estimateExpectedValue(features: number[], index: number, data: TimeSeriesData): Promise<number> {
    // Use local regression or moving average as baseline
    const windowSize = 10
    const start = Math.max(0, index - windowSize)
    const end = Math.min(data.values.length, index)
    
    if (end <= start) return data.values[index]
    
    const window = data.values.slice(start, end)
    return window.reduce((sum, val) => sum + val, 0) / window.length
  }

  /**
   * Generate explanation for anomaly
   */
  private generateExplanation(features: number[], score: number): string {
    const featureNames = [
      'value', 'lag1', 'lag2', 'rolling_mean', 'rolling_std', 
      'trend', 'day_of_week', 'hour_of_day', 'is_weekend', 
      'is_holiday', 'seasonal_index', 'volatility'
    ]
    
    // Find most contributing features (simplified)
    const contributions = features.map((f, i) => ({ 
      name: featureNames[i] || `feature_${i}`, 
      value: f,
      contribution: Math.abs(f - 0.5) // Normalized features should be around 0.5
    }))
    
    contributions.sort((a, b) => b.contribution - a.contribution)
    const topFeatures = contributions.slice(0, 3)
    
    return `Isolation forest detected anomaly (score: ${score.toFixed(3)}) primarily due to unusual patterns in: ${
      topFeatures.map(f => `${f.name} (${f.value.toFixed(2)})`).join(', ')
    }`
  }

  /**
   * Get tree depths for feature vector (for debugging)
   */
  private async getTreeDepths(features: number[]): Promise<number[]> {
    return Promise.all(this.trees.map(tree => tree.pathLength(features)))
  }
}

/**
 * Individual Isolation Tree
 */
class IsolationTree {
  private root: IsolationNode | null = null
  private maxFeatures: number

  constructor(maxFeatures: number) {
    this.maxFeatures = maxFeatures
  }

  async fit(data: number[][]): Promise<void> {
    const featureIndices = this.selectFeatures(data[0].length)
    this.root = await this.buildTree(data, featureIndices, 0)
  }

  async pathLength(features: number[]): Promise<number> {
    if (!this.root) return 0
    return this.root.pathLength(features, 0)
  }

  private selectFeatures(totalFeatures: number): number[] {
    const numFeatures = Math.floor(totalFeatures * this.maxFeatures)
    const indices: number[] = []
    
    for (let i = 0; i < numFeatures; i++) {
      let idx: number
      do {
        idx = Math.floor(Math.random() * totalFeatures)
      } while (indices.includes(idx))
      indices.push(idx)
    }
    
    return indices
  }

  private async buildTree(
    data: number[][], 
    featureIndices: number[], 
    depth: number
  ): Promise<IsolationNode> {
    if (data.length <= 1 || depth > 20) {
      return new IsolationNode(null, null, true, data.length)
    }

    const featureIdx = featureIndices[Math.floor(Math.random() * featureIndices.length)]
    const values = data.map(row => row[featureIdx])
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    
    if (minVal === maxVal) {
      return new IsolationNode(null, null, true, data.length)
    }

    const splitValue = minVal + Math.random() * (maxVal - minVal)
    const leftData = data.filter(row => row[featureIdx] < splitValue)
    const rightData = data.filter(row => row[featureIdx] >= splitValue)

    const leftChild = await this.buildTree(leftData, featureIndices, depth + 1)
    const rightChild = await this.buildTree(rightData, featureIndices, depth + 1)

    return new IsolationNode(leftChild, rightChild, false, data.length, featureIdx, splitValue)
  }
}

/**
 * Isolation Tree Node
 */
class IsolationNode {
  constructor(
    public left: IsolationNode | null,
    public right: IsolationNode | null,
    public isLeaf: boolean,
    public size: number,
    public featureIdx?: number,
    public splitValue?: number
  ) {}

  pathLength(features: number[], currentDepth: number): number {
    if (this.isLeaf) {
      return currentDepth + this.expectedPathLength(this.size)
    }

    if (this.featureIdx !== undefined && this.splitValue !== undefined) {
      if (features[this.featureIdx] < this.splitValue) {
        return this.left?.pathLength(features, currentDepth + 1) || currentDepth
      } else {
        return this.right?.pathLength(features, currentDepth + 1) || currentDepth
      }
    }

    return currentDepth
  }

  private expectedPathLength(n: number): number {
    if (n <= 1) return 0
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n)
  }
}

/**
 * Feature Extractor for time series data
 */
class FeatureExtractor {
  async extractFeatures(data: TimeSeriesData): Promise<number[][]> {
    const features: number[][] = []
    
    for (let i = 0; i < data.values.length; i++) {
      const featureVector = await this.extractPointFeatures(data, i)
      features.push(featureVector)
    }
    
    return features
  }

  private async extractPointFeatures(data: TimeSeriesData, index: number): Promise<number[]> {
    const features: number[] = []
    const { values, timestamps } = data
    
    // Current value (normalized)
    const allValues = values.filter(v => !isNaN(v) && isFinite(v))
    const minVal = Math.min(...allValues)
    const maxVal = Math.max(...allValues)
    const normalizedValue = maxVal > minVal ? (values[index] - minVal) / (maxVal - minVal) : 0.5
    features.push(normalizedValue)
    
    // Lag features
    features.push(index >= 1 ? (values[index - 1] - minVal) / (maxVal - minVal || 1) : 0)
    features.push(index >= 2 ? (values[index - 2] - minVal) / (maxVal - minVal || 1) : 0)
    
    // Rolling statistics
    const windowSize = Math.min(10, index + 1)
    const window = values.slice(Math.max(0, index - windowSize + 1), index + 1)
    const mean = window.reduce((sum, val) => sum + val, 0) / window.length
    const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length
    const std = Math.sqrt(variance)
    
    features.push((mean - minVal) / (maxVal - minVal || 1))
    features.push(std / (maxVal - minVal || 1))
    
    // Trend feature (simple linear regression slope)
    const trend = this.calculateTrend(window)
    features.push(Math.tanh(trend)) // Normalize trend
    
    // Time-based features
    const contextualFeatures = this.extractContextualFeatures(timestamps[index])
    features.push(...Object.values(contextualFeatures).map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v))
    
    return features
  }

  private calculateTrend(window: number[]): number {
    if (window.length < 2) return 0
    
    const n = window.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = window
    
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    return isNaN(slope) ? 0 : slope
  }

  private extractContextualFeatures(timestamp: Date): ContextualFeatures {
    const dayOfWeek = timestamp.getDay() / 6 // Normalize to [0, 1]
    const hourOfDay = timestamp.getHours() / 23 // Normalize to [0, 1]
    const isWeekend = timestamp.getDay() === 0 || timestamp.getDay() === 6
    const isHoliday = this.isHoliday(timestamp)
    
    // Simple seasonal index based on day of year
    const dayOfYear = this.getDayOfYear(timestamp)
    const seasonalIndex = Math.sin(2 * Math.PI * dayOfYear / 365) * 0.5 + 0.5
    
    // Trend value (simplified - could be enhanced)
    const trendValue = 0.5 // Placeholder
    
    return {
      dayOfWeek,
      hourOfDay,
      isHoliday,
      isWeekend,
      seasonalIndex,
      trendValue
    }
  }

  private isHoliday(date: Date): boolean {
    // Simplified holiday detection - can be enhanced with actual holiday calendar
    const month = date.getMonth()
    const day = date.getDate()
    
    // Major US holidays (simplified)
    const holidays = [
      { month: 0, day: 1 },   // New Year's Day
      { month: 6, day: 4 },   // Independence Day
      { month: 11, day: 25 }  // Christmas Day
    ]
    
    return holidays.some(h => h.month === month && h.day === day)
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0)
    const diff = date.getTime() - start.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }
}

/**
 * Seeded Random Number Generator
 */
class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }
}