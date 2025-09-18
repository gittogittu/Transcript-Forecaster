/**
 * Main correlation analysis service that orchestrates all components
 */

import { CorrelationEngine } from './correlation-engine'
import { AttributionAnalysisService } from './attribution-analysis'
import { FeatureImportanceAnalyzer } from './feature-importance'
import { CorrelationVisualizationService } from './visualization-service'
import {
  CorrelationAnalysisRequest,
  CorrelationAnalysisResult,
  TimeSeriesData,
  ExternalFactor,
  AttributionAnalysis,
  FeatureImportanceResult,
  VisualizationConfig
} from './types'

export class CorrelationAnalysisService {
  private correlationEngine: CorrelationEngine
  private attributionService: AttributionAnalysisService
  private featureImportanceAnalyzer: FeatureImportanceAnalyzer
  private visualizationService: CorrelationVisualizationService

  constructor() {
    this.correlationEngine = new CorrelationEngine()
    this.attributionService = new AttributionAnalysisService()
    this.featureImportanceAnalyzer = new FeatureImportanceAnalyzer()
    this.visualizationService = new CorrelationVisualizationService()
  }

  /**
   * Perform comprehensive correlation analysis
   */
  async performCorrelationAnalysis(
    transcriptData: TimeSeriesData,
    externalFactors: ExternalFactor[],
    request: CorrelationAnalysisRequest
  ): Promise<CorrelationAnalysisResult> {
    try {
      console.log('Starting correlation analysis...', {
        dataPoints: transcriptData.values.length,
        externalFactors: externalFactors.length,
        analysisType: request.analysisType
      })

      // Step 1: Core correlation analysis
      const correlationResult = await this.correlationEngine.analyzeCorrelations(
        transcriptData,
        externalFactors,
        request
      )

      // Step 2: Attribution analysis (if requested)
      let attributionAnalysis: AttributionAnalysis | undefined
      if (request.analysisType === 'attribution' || request.analysisType === 'all') {
        try {
          // Use the most recent date for attribution analysis
          const latestDate = new Date(Math.max(...transcriptData.timestamps.map(t => t.getTime())))
          attributionAnalysis = await this.attributionService.analyzeVolumeAttribution(
            transcriptData,
            externalFactors,
            correlationResult.influencingFactors,
            latestDate
          )
        } catch (error) {
          console.warn('Attribution analysis failed:', error)
        }
      }

      // Step 3: Feature importance analysis (if Vertex AI model is available)
      let featureImportance: FeatureImportanceResult[] = []
      try {
        // Try to get feature importance from the most recent model
        // This would typically use a model ID from the request or configuration
        const modelId = this.getLatestModelId(request.clientId)
        if (modelId) {
          featureImportance = await this.featureImportanceAnalyzer.analyzeFeatureImportance(
            modelId,
            transcriptData,
            externalFactors,
            request.clientId
          )
        }
      } catch (error) {
        console.warn('Feature importance analysis failed:', error)
      }

      // Combine results
      const result: CorrelationAnalysisResult = {
        ...correlationResult,
        attributionAnalysis,
        featureImportance
      }

      console.log('Correlation analysis completed', {
        correlationsFound: result.correlations.length,
        significantFactors: result.influencingFactors.length,
        hasAttribution: !!result.attributionAnalysis,
        featureImportanceCount: result.featureImportance.length
      })

      return result
    } catch (error) {
      console.error('Error in correlation analysis service:', error)
      throw new Error(`Correlation analysis failed: ${error.message}`)
    }
  }

  /**
   * Generate visualizations for correlation analysis results
   */
  async generateVisualizations(
    analysisResult: CorrelationAnalysisResult
  ): Promise<{
    dashboard: { widgets: VisualizationConfig[]; layout: any[] }
    individualCharts: { [key: string]: VisualizationConfig }
  }> {
    try {
      // Generate interactive dashboard
      const dashboard = this.visualizationService.generateInteractiveDashboard(
        analysisResult.correlations,
        analysisResult.influencingFactors,
        analysisResult.correlationMatrix,
        analysisResult.attributionAnalysis,
        analysisResult.featureImportance
      )

      // Generate individual charts
      const individualCharts: { [key: string]: VisualizationConfig } = {}

      // Correlation heatmap
      individualCharts.correlationHeatmap = this.visualizationService.generateCorrelationHeatmap(
        analysisResult.correlationMatrix
      )

      // Factor importance chart
      individualCharts.factorImportance = this.visualizationService.generateFactorImportanceChart(
        analysisResult.influencingFactors
      )

      // Time series correlation
      const timeRange = { 
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 
        end: new Date() 
      }
      individualCharts.timeSeriesCorrelation = this.visualizationService.generateTimeSeriesCorrelation(
        analysisResult.correlations,
        timeRange
      )

      // Attribution chart (if available)
      if (analysisResult.attributionAnalysis) {
        individualCharts.attribution = this.visualizationService.generateAttributionChart(
          analysisResult.attributionAnalysis
        )
      }

      // Feature importance comparison (if available)
      if (analysisResult.featureImportance.length > 0) {
        individualCharts.featureImportance = this.visualizationService.generateFeatureImportanceComparison(
          analysisResult.featureImportance
        )
      }

      return { dashboard, individualCharts }
    } catch (error) {
      console.error('Error generating visualizations:', error)
      throw new Error(`Visualization generation failed: ${error.message}`)
    }
  }

  /**
   * Analyze correlation trends over time
   */
  async analyzeCorrelationTrends(
    transcriptData: TimeSeriesData,
    externalFactors: ExternalFactor[],
    request: CorrelationAnalysisRequest,
    windowSizeDays: number = 30,
    stepSizeDays: number = 7
  ): Promise<{
    trends: {
      date: Date
      correlations: CorrelationAnalysisResult
    }[]
    trendSummary: {
      factor: string
      correlationTrend: 'increasing' | 'decreasing' | 'stable'
      trendStrength: number
    }[]
  }> {
    try {
      const trends: { date: Date; correlations: CorrelationAnalysisResult }[] = []
      const windowMs = windowSizeDays * 24 * 60 * 60 * 1000
      const stepMs = stepSizeDays * 24 * 60 * 60 * 1000

      let currentDate = new Date(request.startDate.getTime())
      const endDate = new Date(request.endDate.getTime() - windowMs)

      // Analyze correlations in sliding windows
      while (currentDate.getTime() <= endDate.getTime()) {
        const windowStart = new Date(currentDate)
        const windowEnd = new Date(currentDate.getTime() + windowMs)

        // Filter data for this window
        const windowTranscriptData = this.filterTimeSeriesData(transcriptData, windowStart, windowEnd)
        const windowExternalFactors = externalFactors.filter(
          factor => factor.date >= windowStart && factor.date <= windowEnd
        )

        if (windowTranscriptData.values.length > 10) { // Minimum data points
          const windowRequest = { ...request, startDate: windowStart, endDate: windowEnd }
          const windowResult = await this.correlationEngine.analyzeCorrelations(
            windowTranscriptData,
            windowExternalFactors,
            windowRequest
          )

          trends.push({
            date: new Date(currentDate),
            correlations: { ...windowResult, featureImportance: [] }
          })
        }

        currentDate.setTime(currentDate.getTime() + stepMs)
      }

      // Analyze trends in correlation strength
      const trendSummary = this.analyzeTrendSummary(trends)

      return { trends, trendSummary }
    } catch (error) {
      console.error('Error analyzing correlation trends:', error)
      throw new Error(`Correlation trend analysis failed: ${error.message}`)
    }
  }

  /**
   * Compare correlations across different client segments
   */
  async compareCorrelationsAcrossSegments(
    segmentData: { segment: string; data: TimeSeriesData }[],
    externalFactors: ExternalFactor[],
    request: Omit<CorrelationAnalysisRequest, 'clientId'>
  ): Promise<{
    segmentComparisons: {
      segment: string
      correlations: CorrelationAnalysisResult
    }[]
    crossSegmentInsights: {
      universalFactors: string[]
      segmentSpecificFactors: { segment: string; factors: string[] }[]
      correlationDifferences: {
        factor: string
        segments: { segment: string; correlation: number }[]
        variance: number
      }[]
    }
  }> {
    try {
      const segmentComparisons: { segment: string; correlations: CorrelationAnalysisResult }[] = []

      // Analyze each segment
      for (const segmentInfo of segmentData) {
        const segmentResult = await this.correlationEngine.analyzeCorrelations(
          segmentInfo.data,
          externalFactors,
          { ...request, clientId: segmentInfo.segment }
        )

        segmentComparisons.push({
          segment: segmentInfo.segment,
          correlations: { ...segmentResult, featureImportance: [] }
        })
      }

      // Generate cross-segment insights
      const crossSegmentInsights = this.generateCrossSegmentInsights(segmentComparisons)

      return { segmentComparisons, crossSegmentInsights }
    } catch (error) {
      console.error('Error comparing correlations across segments:', error)
      throw new Error(`Cross-segment correlation analysis failed: ${error.message}`)
    }
  }

  /**
   * Generate actionable recommendations based on correlation analysis
   */
  generateRecommendations(
    analysisResult: CorrelationAnalysisResult
  ): {
    operational: string[]
    strategic: string[]
    monitoring: string[]
    dataCollection: string[]
  } {
    const recommendations = {
      operational: [] as string[],
      strategic: [] as string[],
      monitoring: [] as string[],
      dataCollection: [] as string[]
    }

    // Operational recommendations based on strong correlations
    const strongFactors = analysisResult.influencingFactors.filter(f => Math.abs(f.correlation) > 0.6)
    strongFactors.forEach(factor => {
      if (factor.timeDelay === 0) {
        recommendations.operational.push(
          `Monitor ${factor.name} in real-time as it has immediate impact on transcript volumes`
        )
      } else {
        recommendations.operational.push(
          `Plan capacity adjustments ${factor.timeDelay} days after changes in ${factor.name}`
        )
      }
    })

    // Strategic recommendations based on explained variance
    if (analysisResult.summary.explainedVariance < 0.3) {
      recommendations.strategic.push(
        'Consider expanding data collection to include additional external factors that might explain volume variations'
      )
    }

    if (analysisResult.summary.explainedVariance > 0.7) {
      recommendations.strategic.push(
        'High predictability detected - consider implementing automated forecasting based on identified factors'
      )
    }

    // Monitoring recommendations
    const seasonalFactors = analysisResult.influencingFactors.filter(f => 
      f.name.includes('seasonal') || f.name.includes('month') || f.name.includes('quarter')
    )
    if (seasonalFactors.length > 0) {
      recommendations.monitoring.push(
        'Implement seasonal monitoring dashboards to track cyclical patterns'
      )
    }

    // Data collection recommendations
    if (analysisResult.correlations.length < 5) {
      recommendations.dataCollection.push(
        'Expand external factor data collection to improve correlation analysis'
      )
    }

    const lowSignificanceCount = analysisResult.correlations.filter(c => c.significance === 'none').length
    if (lowSignificanceCount > analysisResult.correlations.length * 0.5) {
      recommendations.dataCollection.push(
        'Review data quality and consider longer time periods for more reliable correlation analysis'
      )
    }

    return recommendations
  }

  /**
   * Filter time series data by date range
   */
  private filterTimeSeriesData(
    data: TimeSeriesData,
    startDate: Date,
    endDate: Date
  ): TimeSeriesData {
    const filteredIndices: number[] = []
    
    data.timestamps.forEach((timestamp, index) => {
      if (timestamp >= startDate && timestamp <= endDate) {
        filteredIndices.push(index)
      }
    })

    return {
      timestamps: filteredIndices.map(i => data.timestamps[i]),
      values: filteredIndices.map(i => data.values[i]),
      clientId: data.clientId,
      metadata: data.metadata
    }
  }

  /**
   * Analyze trend summary from time-windowed correlations
   */
  private analyzeTrendSummary(
    trends: { date: Date; correlations: CorrelationAnalysisResult }[]
  ): {
    factor: string
    correlationTrend: 'increasing' | 'decreasing' | 'stable'
    trendStrength: number
  }[] {
    const factorTrends = new Map<string, number[]>()

    // Collect correlation values over time for each factor
    trends.forEach(trend => {
      trend.correlations.influencingFactors.forEach(factor => {
        if (!factorTrends.has(factor.name)) {
          factorTrends.set(factor.name, [])
        }
        factorTrends.get(factor.name)!.push(factor.correlation)
      })
    })

    // Analyze trends
    const trendSummary: {
      factor: string
      correlationTrend: 'increasing' | 'decreasing' | 'stable'
      trendStrength: number
    }[] = []

    factorTrends.forEach((correlations, factorName) => {
      if (correlations.length < 3) return // Need minimum points for trend analysis

      // Simple linear trend analysis
      const n = correlations.length
      const xSum = (n * (n - 1)) / 2 // Sum of indices 0, 1, 2, ...
      const ySum = correlations.reduce((sum, val) => sum + val, 0)
      const xySum = correlations.reduce((sum, val, index) => sum + (index * val), 0)
      const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6 // Sum of squares of indices

      const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum)
      const trendStrength = Math.abs(slope)

      let correlationTrend: 'increasing' | 'decreasing' | 'stable'
      if (trendStrength < 0.01) {
        correlationTrend = 'stable'
      } else if (slope > 0) {
        correlationTrend = 'increasing'
      } else {
        correlationTrend = 'decreasing'
      }

      trendSummary.push({
        factor: factorName,
        correlationTrend,
        trendStrength
      })
    })

    return trendSummary.sort((a, b) => b.trendStrength - a.trendStrength)
  }

  /**
   * Generate cross-segment insights
   */
  private generateCrossSegmentInsights(
    segmentComparisons: { segment: string; correlations: CorrelationAnalysisResult }[]
  ): {
    universalFactors: string[]
    segmentSpecificFactors: { segment: string; factors: string[] }[]
    correlationDifferences: {
      factor: string
      segments: { segment: string; correlation: number }[]
      variance: number
    }[]
  } {
    // Find factors that appear in all segments
    const allFactors = new Set<string>()
    const factorsBySegment = new Map<string, Set<string>>()

    segmentComparisons.forEach(comparison => {
      const segmentFactors = new Set(comparison.correlations.influencingFactors.map(f => f.name))
      factorsBySegment.set(comparison.segment, segmentFactors)
      segmentFactors.forEach(factor => allFactors.add(factor))
    })

    // Universal factors (appear in all segments)
    const universalFactors = Array.from(allFactors).filter(factor =>
      segmentComparisons.every(comparison =>
        factorsBySegment.get(comparison.segment)!.has(factor)
      )
    )

    // Segment-specific factors
    const segmentSpecificFactors = segmentComparisons.map(comparison => ({
      segment: comparison.segment,
      factors: Array.from(factorsBySegment.get(comparison.segment)!).filter(
        factor => !universalFactors.includes(factor)
      )
    }))

    // Correlation differences across segments
    const correlationDifferences: {
      factor: string
      segments: { segment: string; correlation: number }[]
      variance: number
    }[] = []

    universalFactors.forEach(factor => {
      const segmentCorrelations = segmentComparisons.map(comparison => {
        const factorData = comparison.correlations.influencingFactors.find(f => f.name === factor)
        return {
          segment: comparison.segment,
          correlation: factorData ? factorData.correlation : 0
        }
      })

      // Calculate variance in correlations
      const correlations = segmentCorrelations.map(sc => sc.correlation)
      const mean = correlations.reduce((sum, val) => sum + val, 0) / correlations.length
      const variance = correlations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / correlations.length

      correlationDifferences.push({
        factor,
        segments: segmentCorrelations,
        variance
      })
    })

    // Sort by variance (most different first)
    correlationDifferences.sort((a, b) => b.variance - a.variance)

    return {
      universalFactors,
      segmentSpecificFactors,
      correlationDifferences
    }
  }

  /**
   * Get the latest model ID for a client (placeholder implementation)
   */
  private getLatestModelId(clientId?: string): string | null {
    // This would typically query the database for the most recent model
    // For now, return null to indicate no model available
    return null
  }
}