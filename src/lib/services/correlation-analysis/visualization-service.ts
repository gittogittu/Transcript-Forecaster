/**
 * Visualization service for correlation analysis and key influencers
 */

import {
  CorrelationResult,
  InfluencingFactor,
  CorrelationMatrix,
  AttributionAnalysis,
  FeatureImportanceResult,
  VisualizationConfig
} from './types'

export class CorrelationVisualizationService {
  /**
   * Generate correlation heatmap configuration
   */
  generateCorrelationHeatmap(
    correlationMatrix: CorrelationMatrix,
    showSignificance: boolean = true
  ): VisualizationConfig {
    const data = {
      factors: correlationMatrix.factors,
      correlations: correlationMatrix.correlations,
      pValues: correlationMatrix.pValues,
      significance: correlationMatrix.significanceMatrix
    }

    return {
      type: 'correlation_heatmap',
      data,
      options: {
        showSignificance,
        colorScheme: 'RdBu',
        interactive: true,
        annotations: true
      }
    }
  }

  /**
   * Generate factor importance chart configuration
   */
  generateFactorImportanceChart(
    influencingFactors: InfluencingFactor[],
    maxFactors: number = 10
  ): VisualizationConfig {
    const topFactors = influencingFactors.slice(0, maxFactors)
    
    const data = {
      factors: topFactors.map(f => ({
        name: f.name,
        importance: f.importance,
        correlation: f.correlation,
        significance: f.significance,
        direction: f.direction,
        confidence: f.confidence
      }))
    }

    return {
      type: 'factor_importance',
      data,
      options: {
        showSignificance: true,
        colorScheme: 'viridis',
        interactive: true,
        annotations: true
      }
    }
  }

  /**
   * Generate attribution analysis chart configuration
   */
  generateAttributionChart(
    attributionAnalysis: AttributionAnalysis
  ): VisualizationConfig {
    const data = {
      volumeChange: attributionAnalysis.volumeChange,
      changeDate: attributionAnalysis.changeDate,
      contributions: attributionAnalysis.contributingFactors.map(factor => ({
        name: factor.factor,
        contribution: factor.contribution,
        percentage: factor.contributionPercentage,
        direction: factor.direction,
        confidence: factor.confidence
      })),
      explainedVariance: attributionAnalysis.totalExplainedVariance,
      unexplainedVariance: attributionAnalysis.unexplainedVariance
    }

    return {
      type: 'attribution_chart',
      data,
      options: {
        showSignificance: true,
        colorScheme: 'category10',
        interactive: true,
        annotations: true
      }
    }
  }

  /**
   * Generate time series correlation visualization
   */
  generateTimeSeriesCorrelation(
    correlations: CorrelationResult[],
    timeRange: { start: Date; end: Date }
  ): VisualizationConfig {
    // Group correlations by factor and time delay
    const factorGroups = new Map<string, CorrelationResult[]>()
    
    correlations.forEach(corr => {
      if (!factorGroups.has(corr.factor)) {
        factorGroups.set(corr.factor, [])
      }
      factorGroups.get(corr.factor)!.push(corr)
    })

    const data = {
      timeRange,
      factors: Array.from(factorGroups.entries()).map(([factorName, factorCorrelations]) => ({
        name: factorName,
        correlations: factorCorrelations.map(corr => ({
          timeDelay: corr.timeDelay,
          correlation: corr.correlation,
          significance: corr.significance,
          pValue: corr.pValue
        }))
      }))
    }

    return {
      type: 'time_series_correlation',
      data,
      options: {
        showSignificance: true,
        colorScheme: 'Set3',
        interactive: true,
        annotations: true
      }
    }
  }

  /**
   * Generate feature importance comparison chart
   */
  generateFeatureImportanceComparison(
    featureImportance: FeatureImportanceResult[],
    maxFeatures: number = 15
  ): VisualizationConfig {
    const topFeatures = featureImportance.slice(0, maxFeatures)
    
    const data = {
      features: topFeatures.map(feature => ({
        name: feature.feature,
        importance: feature.importance,
        rank: feature.rank,
        category: feature.category,
        explanation: feature.explanation
      })),
      categories: this.groupFeaturesByCategory(topFeatures)
    }

    return {
      type: 'factor_importance',
      data,
      options: {
        showSignificance: false,
        colorScheme: 'category20',
        interactive: true,
        annotations: true
      }
    }
  }

  /**
   * Group features by category for visualization
   */
  private groupFeaturesByCategory(
    features: FeatureImportanceResult[]
  ): { category: string; features: FeatureImportanceResult[]; totalImportance: number }[] {
    const categories = new Map<string, FeatureImportanceResult[]>()
    
    features.forEach(feature => {
      if (!categories.has(feature.category)) {
        categories.set(feature.category, [])
      }
      categories.get(feature.category)!.push(feature)
    })

    return Array.from(categories.entries()).map(([category, categoryFeatures]) => ({
      category,
      features: categoryFeatures,
      totalImportance: categoryFeatures.reduce((sum, f) => sum + f.importance, 0)
    })).sort((a, b) => b.totalImportance - a.totalImportance)
  }

  /**
   * Generate interactive dashboard configuration
   */
  generateInteractiveDashboard(
    correlations: CorrelationResult[],
    influencingFactors: InfluencingFactor[],
    correlationMatrix: CorrelationMatrix,
    attributionAnalysis?: AttributionAnalysis,
    featureImportance?: FeatureImportanceResult[]
  ): {
    widgets: VisualizationConfig[]
    layout: { id: string; title: string; size: { width: number; height: number } }[]
  } {
    const widgets: VisualizationConfig[] = []
    const layout: { id: string; title: string; size: { width: number; height: number } }[] = []

    // Correlation heatmap
    widgets.push(this.generateCorrelationHeatmap(correlationMatrix))
    layout.push({
      id: 'correlation_heatmap',
      title: 'Factor Correlation Matrix',
      size: { width: 6, height: 4 }
    })

    // Factor importance chart
    widgets.push(this.generateFactorImportanceChart(influencingFactors))
    layout.push({
      id: 'factor_importance',
      title: 'Key Influencing Factors',
      size: { width: 6, height: 4 }
    })

    // Time series correlation
    const timeRange = this.calculateTimeRange(correlations)
    widgets.push(this.generateTimeSeriesCorrelation(correlations, timeRange))
    layout.push({
      id: 'time_series_correlation',
      title: 'Correlation Over Time',
      size: { width: 12, height: 3 }
    })

    // Attribution analysis (if available)
    if (attributionAnalysis) {
      widgets.push(this.generateAttributionChart(attributionAnalysis))
      layout.push({
        id: 'attribution_chart',
        title: 'Volume Change Attribution',
        size: { width: 6, height: 4 }
      })
    }

    // Feature importance (if available)
    if (featureImportance && featureImportance.length > 0) {
      widgets.push(this.generateFeatureImportanceComparison(featureImportance))
      layout.push({
        id: 'feature_importance_comparison',
        title: 'ML Model Feature Importance',
        size: { width: 6, height: 4 }
      })
    }

    return { widgets, layout }
  }

  /**
   * Calculate time range from correlations
   */
  private calculateTimeRange(correlations: CorrelationResult[]): { start: Date; end: Date } {
    // Since correlations don't have explicit dates, we'll use a default range
    // In practice, this would be derived from the actual data timestamps
    const now = new Date()
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
    
    return { start, end: now }
  }

  /**
   * Generate statistical significance indicators
   */
  generateSignificanceIndicators(
    correlations: CorrelationResult[]
  ): {
    significanceLevels: { level: string; count: number; percentage: number }[]
    overallSignificance: number
  } {
    const total = correlations.length
    const significanceCounts = {
      high: correlations.filter(c => c.significance === 'high').length,
      medium: correlations.filter(c => c.significance === 'medium').length,
      low: correlations.filter(c => c.significance === 'low').length,
      none: correlations.filter(c => c.significance === 'none').length
    }

    const significanceLevels = [
      {
        level: 'High Significance',
        count: significanceCounts.high,
        percentage: total > 0 ? (significanceCounts.high / total) * 100 : 0
      },
      {
        level: 'Medium Significance',
        count: significanceCounts.medium,
        percentage: total > 0 ? (significanceCounts.medium / total) * 100 : 0
      },
      {
        level: 'Low Significance',
        count: significanceCounts.low,
        percentage: total > 0 ? (significanceCounts.low / total) * 100 : 0
      },
      {
        level: 'Not Significant',
        count: significanceCounts.none,
        percentage: total > 0 ? (significanceCounts.none / total) * 100 : 0
      }
    ]

    const overallSignificance = total > 0 ? 
      ((significanceCounts.high + significanceCounts.medium + significanceCounts.low) / total) * 100 : 0

    return {
      significanceLevels,
      overallSignificance
    }
  }

  /**
   * Generate correlation strength distribution
   */
  generateCorrelationDistribution(
    correlations: CorrelationResult[]
  ): {
    distribution: { range: string; count: number; percentage: number }[]
    averageCorrelation: number
    strongestCorrelation: CorrelationResult | null
  } {
    const total = correlations.length
    const ranges = [
      { min: 0.8, max: 1.0, label: 'Very Strong (0.8-1.0)' },
      { min: 0.6, max: 0.8, label: 'Strong (0.6-0.8)' },
      { min: 0.4, max: 0.6, label: 'Moderate (0.4-0.6)' },
      { min: 0.2, max: 0.4, label: 'Weak (0.2-0.4)' },
      { min: 0.0, max: 0.2, label: 'Very Weak (0.0-0.2)' }
    ]

    const distribution = ranges.map(range => {
      const count = correlations.filter(c => {
        const absCorr = Math.abs(c.correlation)
        return absCorr >= range.min && absCorr < range.max
      }).length

      return {
        range: range.label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }
    })

    const averageCorrelation = total > 0 ? 
      correlations.reduce((sum, c) => sum + Math.abs(c.correlation), 0) / total : 0

    const strongestCorrelation = correlations.length > 0 ? 
      correlations.reduce((max, curr) => 
        Math.abs(curr.correlation) > Math.abs(max.correlation) ? curr : max
      ) : null

    return {
      distribution,
      averageCorrelation,
      strongestCorrelation
    }
  }

  /**
   * Generate interactive filter options
   */
  generateFilterOptions(
    correlations: CorrelationResult[],
    influencingFactors: InfluencingFactor[]
  ): {
    factorTypes: string[]
    significanceLevels: string[]
    correlationRanges: { min: number; max: number; label: string }[]
    timeDelayRanges: number[]
  } {
    // Extract unique factor types
    const factorTypes = Array.from(new Set(
      correlations.map(c => this.inferFactorType(c.factor))
    )).sort()

    // Available significance levels
    const significanceLevels = ['high', 'medium', 'low', 'none']

    // Correlation strength ranges
    const correlationRanges = [
      { min: 0.8, max: 1.0, label: 'Very Strong' },
      { min: 0.6, max: 0.8, label: 'Strong' },
      { min: 0.4, max: 0.6, label: 'Moderate' },
      { min: 0.2, max: 0.4, label: 'Weak' },
      { min: 0.0, max: 0.2, label: 'Very Weak' }
    ]

    // Available time delays
    const timeDelayRanges = Array.from(new Set(
      correlations.map(c => c.timeDelay)
    )).sort((a, b) => a - b)

    return {
      factorTypes,
      significanceLevels,
      correlationRanges,
      timeDelayRanges
    }
  }

  /**
   * Infer factor type from factor name
   */
  private inferFactorType(factorName: string): string {
    const name = factorName.toLowerCase()
    
    if (name.includes('holiday') || name.includes('weekend')) return 'Calendar'
    if (name.includes('weather') || name.includes('temperature')) return 'Weather'
    if (name.includes('economic') || name.includes('market')) return 'Economic'
    if (name.includes('seasonal') || name.includes('month')) return 'Seasonal'
    if (name.includes('day_of_week') || name.includes('time')) return 'Temporal'
    
    return 'Other'
  }

  /**
   * Generate export configuration for visualizations
   */
  generateExportConfig(
    visualizations: VisualizationConfig[]
  ): {
    formats: string[]
    resolutions: { width: number; height: number; label: string }[]
    exportOptions: { includeData: boolean; includeMetadata: boolean }
  } {
    return {
      formats: ['PNG', 'SVG', 'PDF', 'JSON'],
      resolutions: [
        { width: 800, height: 600, label: 'Standard (800x600)' },
        { width: 1200, height: 900, label: 'High (1200x900)' },
        { width: 1920, height: 1080, label: 'Full HD (1920x1080)' },
        { width: 2560, height: 1440, label: '2K (2560x1440)' }
      ],
      exportOptions: {
        includeData: true,
        includeMetadata: true
      }
    }
  }

  /**
   * Generate accessibility configuration for visualizations
   */
  generateAccessibilityConfig(): {
    colorBlindFriendly: boolean
    highContrast: boolean
    alternativeText: boolean
    keyboardNavigation: boolean
  } {
    return {
      colorBlindFriendly: true,
      highContrast: false,
      alternativeText: true,
      keyboardNavigation: true
    }
  }
}