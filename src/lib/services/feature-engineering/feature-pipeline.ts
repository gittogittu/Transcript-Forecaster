/**
 * Feature Engineering Pipeline
 * Orchestrates time-based, statistical, and domain feature extraction
 * Integrates with Vertex AI Feature Store for feature management
 */

import { TimeFeatureExtractor, type TimeSeriesData, type TimeFeatures } from './time-features'
import { StatisticalFeatureExtractor, type StatisticalFeatures } from './statistical-features'
import { DomainFeatureExtractor, type DomainFeatures, type ClientTypeFeature } from './domain-features'
import { VertexAIFeatureStore } from '../vertex-ai/feature-store'
import type { FeatureData, FeatureQuery, FeatureServingResult } from '@/types/vertex-ai'

export interface FeaturePipelineConfig {
  timeFeatures: {
    lagPeriods: number[]
    rollingWindows: number[]
    seasonalPeriods: number[]
  }
  statisticalFeatures: {
    maxLags: number
    seasonalPeriods: number[]
    changePointSensitivity: number
  }
  domainFeatures: {
    includeHolidays: boolean
    includeBusinessDays: boolean
    includeSeasonalFactors: boolean
  }
  featureStore: {
    featureStoreId: string
    projectId: string
    location: string
  }
}

export interface EngineeredFeatures {
  timeFeatures: TimeFeatures
  statisticalFeatures: StatisticalFeatures
  domainFeatures: DomainFeatures
  combinedFeatures: Record<string, number>
  featureImportance: Record<string, number>
  metadata: {
    clientId?: string
    timestamp: Date
    featureCount: number
    processingTime: number
  }
}

export interface FeatureServingPipeline {
  generateRealTimeFeatures(
    clientId: string,
    historicalData: TimeSeriesData,
    targetDate: Date
  ): Promise<Record<string, number>>
  
  serveFeatures(query: FeatureQuery): Promise<FeatureServingResult>
  
  updateFeatures(
    clientId: string,
    newData: TimeSeriesData
  ): Promise<void>
}

export class FeatureEngineeringPipeline implements FeatureServingPipeline {
  private featureStore: VertexAIFeatureStore
  private config: FeaturePipelineConfig
  private clientData: Map<string, ClientTypeFeature> = new Map()

  constructor(config: FeaturePipelineConfig) {
    this.config = config
    this.featureStore = new VertexAIFeatureStore(config.featureStore)
  }

  /**
   * Process complete feature engineering pipeline
   */
  async processFeatures(
    data: TimeSeriesData,
    clientData: ClientTypeFeature[] = []
  ): Promise<EngineeredFeatures> {
    const startTime = Date.now()
    
    try {
      // Update client data cache
      for (const client of clientData) {
        this.clientData.set(client.clientId, client)
      }

      // Extract time-based features
      const timeFeatures = TimeFeatureExtractor.extractTimeFeatures(
        data,
        this.config.timeFeatures
      )

      // Extract statistical features
      const statisticalFeatures = StatisticalFeatureExtractor.extractStatisticalFeatures(
        data.values,
        data.timestamps,
        this.config.statisticalFeatures
      )

      // Extract domain-specific features
      const domainFeatures = DomainFeatureExtractor.extractDomainFeatures(
        data.timestamps,
        clientData,
        this.config.domainFeatures
      )

      // Combine all features into a single feature vector
      const combinedFeatures = this.combineFeatures(
        timeFeatures,
        statisticalFeatures,
        domainFeatures,
        data.clientId
      )

      // Calculate feature importance
      const featureImportance = this.calculateFeatureImportance(
        timeFeatures,
        statisticalFeatures,
        domainFeatures,
        data.values
      )

      // Ingest features into Vertex AI Feature Store
      await this.ingestFeaturesIntoStore(data.clientId || 'unknown', combinedFeatures)

      const processingTime = Date.now() - startTime

      return {
        timeFeatures,
        statisticalFeatures,
        domainFeatures,
        combinedFeatures,
        featureImportance,
        metadata: {
          clientId: data.clientId,
          timestamp: new Date(),
          featureCount: Object.keys(combinedFeatures).length,
          processingTime
        }
      }
    } catch (error) {
      throw new Error(`Feature engineering pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate real-time features for prediction
   */
  async generateRealTimeFeatures(
    clientId: string,
    historicalData: TimeSeriesData,
    targetDate: Date
  ): Promise<Record<string, number>> {
    try {
      // Generate time-based features for the target date
      const dateFeatures = TimeFeatureExtractor.generateDateFeatures(targetDate)
      
      // Generate lag features from historical data
      const lagFeatures = TimeFeatureExtractor.createRealTimeLagFeatures(
        historicalData.values,
        this.config.timeFeatures.lagPeriods
      )

      // Generate domain features for the target date
      const clientData = this.clientData.get(clientId)
      const domainFeatures = DomainFeatureExtractor.generateRealTimeDomainFeatures(
        targetDate,
        clientId,
        clientData ? [clientData] : []
      )

      // Combine all real-time features
      const features = {
        ...dateFeatures,
        ...lagFeatures,
        ...domainFeatures,
        timestamp: targetDate.getTime()
      }

      // Store features in Feature Store for serving
      await this.ingestFeaturesIntoStore(clientId, features, targetDate)

      return features
    } catch (error) {
      throw new Error(`Real-time feature generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Serve features from Vertex AI Feature Store
   */
  async serveFeatures(query: FeatureQuery): Promise<FeatureServingResult> {
    try {
      return await this.featureStore.serveFeatures(query)
    } catch (error) {
      throw new Error(`Feature serving failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update features with new data
   */
  async updateFeatures(
    clientId: string,
    newData: TimeSeriesData
  ): Promise<void> {
    try {
      // Process new features
      const clientData = this.clientData.get(clientId)
      const features = await this.processFeatures(
        { ...newData, clientId },
        clientData ? [clientData] : []
      )

      // Update Feature Store with new features
      await this.ingestFeaturesIntoStore(clientId, features.combinedFeatures)
    } catch (error) {
      throw new Error(`Feature update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Combine all feature types into a single feature vector
   */
  private combineFeatures(
    timeFeatures: TimeFeatures,
    statisticalFeatures: StatisticalFeatures,
    domainFeatures: DomainFeatures,
    clientId?: string
  ): Record<string, number> {
    const combined: Record<string, number> = {}

    // Add time features (use latest values or aggregates)
    if (timeFeatures.lags.length > 0) {
      combined.lag_feature = timeFeatures.lags[timeFeatures.lags.length - 1]
    }
    if (timeFeatures.rollingMeans.length > 0) {
      combined.rolling_mean = timeFeatures.rollingMeans[timeFeatures.rollingMeans.length - 1]
    }
    if (timeFeatures.rollingStds.length > 0) {
      combined.rolling_std = timeFeatures.rollingStds[timeFeatures.rollingStds.length - 1]
    }
    if (timeFeatures.seasonalIndicators.length > 0) {
      combined.seasonal_indicator = timeFeatures.seasonalIndicators[timeFeatures.seasonalIndicators.length - 1]
    }
    if (timeFeatures.trendComponents.length > 0) {
      combined.trend_component = timeFeatures.trendComponents[timeFeatures.trendComponents.length - 1]
    }

    // Add statistical features
    combined.variance = statisticalFeatures.variance
    combined.skewness = statisticalFeatures.skewness
    combined.kurtosis = statisticalFeatures.kurtosis
    combined.entropy = statisticalFeatures.entropy

    // Add autocorrelation features (first few lags)
    for (let i = 0; i < Math.min(5, statisticalFeatures.autocorrelations.length); i++) {
      combined[`autocorr_lag_${i}`] = statisticalFeatures.autocorrelations[i]
    }

    // Add stationarity indicators
    for (const test of statisticalFeatures.stationarityTests) {
      combined[`${test.testName.toLowerCase().replace(/\s+/g, '_')}_stationary`] = test.isStationary ? 1 : 0
    }

    // Add seasonality indicators
    for (const test of statisticalFeatures.seasonalityTests) {
      combined[`seasonal_${test.period}_strength`] = test.strength
    }

    // Add domain features
    if (domainFeatures.businessDayIndicators.length > 0) {
      combined.business_day_indicator = domainFeatures.businessDayIndicators[domainFeatures.businessDayIndicators.length - 1]
    }
    if (domainFeatures.holidayEffects.length > 0) {
      combined.holiday_effect = domainFeatures.holidayEffects[domainFeatures.holidayEffects.length - 1]
    }

    // Add client-specific features if available
    if (clientId && this.clientData.has(clientId)) {
      const clientFeatures = DomainFeatureExtractor.createClientSpecificFeatures(
        clientId,
        [this.clientData.get(clientId)!]
      )
      Object.assign(combined, clientFeatures)
    }

    return combined
  }

  /**
   * Calculate feature importance scores
   */
  private calculateFeatureImportance(
    timeFeatures: TimeFeatures,
    statisticalFeatures: StatisticalFeatures,
    domainFeatures: DomainFeatures,
    targetValues: number[]
  ): Record<string, number> {
    const importance: Record<string, number> = {}

    // Time feature importance (based on correlation with target)
    if (timeFeatures.lags.length === targetValues.length) {
      importance.lag_features = this.calculateCorrelation(timeFeatures.lags, targetValues)
    }
    if (timeFeatures.rollingMeans.length === targetValues.length) {
      importance.rolling_mean = this.calculateCorrelation(timeFeatures.rollingMeans, targetValues)
    }
    if (timeFeatures.seasonalIndicators.length === targetValues.length) {
      importance.seasonal_indicators = this.calculateCorrelation(timeFeatures.seasonalIndicators, targetValues)
    }

    // Statistical feature importance
    importance.variance = Math.min(1, statisticalFeatures.variance / 1000) // Normalize
    importance.autocorrelation_strength = Math.abs(statisticalFeatures.autocorrelations[1] || 0)
    importance.stationarity = statisticalFeatures.stationarityTests.some(t => t.isStationary) ? 0.8 : 0.2

    // Domain feature importance
    const domainImportance = DomainFeatureExtractor.calculateDomainFeatureImportance(
      domainFeatures,
      targetValues
    )
    Object.assign(importance, domainImportance)

    return importance
  }

  /**
   * Ingest features into Vertex AI Feature Store
   */
  private async ingestFeaturesIntoStore(
    clientId: string,
    features: Record<string, number>,
    timestamp?: Date
  ): Promise<void> {
    try {
      const featureData: FeatureData[] = Object.entries(features).map(([name, value]) => ({
        featureName: name,
        entityId: clientId,
        featureValue: value,
        timestamp: timestamp || new Date()
      }))

      await this.featureStore.ingestFeatures('transcript_features', featureData)
    } catch (error) {
      // Log error but don't fail the pipeline
      console.error('Failed to ingest features into Feature Store:', error)
    }
  }

  /**
   * Calculate correlation between two arrays
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0
    
    const n = x.length
    const meanX = x.reduce((sum, val) => sum + val, 0) / n
    const meanY = y.reduce((sum, val) => sum + val, 0) / n
    
    let numerator = 0
    let sumXSquared = 0
    let sumYSquared = 0
    
    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX
      const deltaY = y[i] - meanY
      
      numerator += deltaX * deltaY
      sumXSquared += deltaX * deltaX
      sumYSquared += deltaY * deltaY
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared)
    return denominator > 0 ? numerator / denominator : 0
  }

  /**
   * Set client data for feature engineering
   */
  setClientData(clientData: ClientTypeFeature[]): void {
    this.clientData.clear()
    for (const client of clientData) {
      this.clientData.set(client.clientId, client)
    }
  }

  /**
   * Get feature pipeline configuration
   */
  getConfig(): FeaturePipelineConfig {
    return { ...this.config }
  }

  /**
   * Update feature pipeline configuration
   */
  updateConfig(newConfig: Partial<FeaturePipelineConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}