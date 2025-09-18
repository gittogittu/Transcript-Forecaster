/**
 * Scenario Modeling Service
 * Handles what-if analysis and scenario modeling with adjustable variables
 */

import { Pool } from 'pg'
import {
  WhatIfAnalysis,
  WhatIfScenario,
  PredictionConfiguration,
  ScenarioVariables,
  ExternalEvent,
  CapacityConstraint,
  MarketCondition
} from '@/types/prediction-config'

export interface ScenarioResult {
  scenarioId: string
  scenarioName: string
  baselinePrediction: number[]
  adjustedPrediction: number[]
  impactAnalysis: ImpactAnalysis
  confidence: number
}

export interface ImpactAnalysis {
  totalImpact: number
  impactByFactor: Record<string, number>
  riskAssessment: RiskAssessment
  recommendations: string[]
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high'
  uncertaintyRange: { min: number; max: number }
  keyRisks: string[]
  mitigationStrategies: string[]
}

export interface ScenarioComparison {
  baselineScenario: ScenarioResult
  alternativeScenarios: ScenarioResult[]
  comparisonMetrics: ComparisonMetric[]
  recommendations: ScenarioRecommendation[]
}

export interface ComparisonMetric {
  name: string
  baseline: number
  scenarios: Record<string, number>
  interpretation: string
}

export interface ScenarioRecommendation {
  priority: 'high' | 'medium' | 'low'
  scenario: string
  action: string
  expectedBenefit: string
  implementationEffort: 'low' | 'medium' | 'high'
}

export class ScenarioModelingService {
  private db: Pool

  constructor(db: Pool) {
    this.db = db
  }

  /**
   * Create and run what-if analysis
   */
  async runWhatIfAnalysis(analysis: WhatIfAnalysis): Promise<ScenarioComparison> {
    // Get baseline prediction
    const baselinePrediction = await this.generateBaselinePrediction(analysis.baselineConfig)
    
    // Run scenarios
    const scenarioResults: ScenarioResult[] = []
    
    for (const scenario of analysis.scenarios) {
      const result = await this.runScenario(
        analysis.baselineConfig,
        scenario,
        baselinePrediction
      )
      scenarioResults.push(result)
    }

    // Generate comparison
    const comparison = await this.generateScenarioComparison(
      {
        scenarioId: 'baseline',
        scenarioName: 'Baseline',
        baselinePrediction,
        adjustedPrediction: baselinePrediction,
        impactAnalysis: {
          totalImpact: 0,
          impactByFactor: {},
          riskAssessment: {
            riskLevel: 'low',
            uncertaintyRange: { min: 0, max: 0 },
            keyRisks: [],
            mitigationStrategies: []
          },
          recommendations: []
        },
        confidence: 1.0
      },
      scenarioResults,
      analysis.comparisonMetrics
    )

    return comparison
  }

  /**
   * Run individual scenario
   */
  private async runScenario(
    baseConfig: PredictionConfiguration,
    scenario: WhatIfScenario,
    baselinePrediction: number[]
  ): Promise<ScenarioResult> {
    // Apply scenario variables to configuration
    const adjustedConfig = this.applyScenarioVariables(baseConfig, scenario.variableChanges)
    
    // Generate adjusted prediction
    const adjustedPrediction = await this.generateAdjustedPrediction(
      adjustedConfig,
      baselinePrediction,
      scenario.variableChanges
    )

    // Analyze impact
    const impactAnalysis = this.analyzeScenarioImpact(
      baselinePrediction,
      adjustedPrediction,
      scenario.variableChanges
    )

    // Calculate confidence based on scenario complexity and data quality
    const confidence = this.calculateScenarioConfidence(scenario.variableChanges, adjustedConfig)

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      baselinePrediction,
      adjustedPrediction,
      impactAnalysis,
      confidence
    }
  }

  /**
   * Apply scenario variables to configuration
   */
  private applyScenarioVariables(
    baseConfig: PredictionConfiguration,
    variableChanges: Record<string, any>
  ): PredictionConfiguration {
    const adjustedConfig = JSON.parse(JSON.stringify(baseConfig)) // Deep clone

    // Apply growth rate changes
    if (variableChanges.growthRate !== undefined) {
      adjustedConfig.scenarioVariables = adjustedConfig.scenarioVariables || {}
      adjustedConfig.scenarioVariables.growthRate = variableChanges.growthRate
    }

    // Apply seasonal factor changes
    if (variableChanges.seasonalFactors) {
      adjustedConfig.scenarioVariables = adjustedConfig.scenarioVariables || {}
      adjustedConfig.scenarioVariables.seasonalFactors = {
        ...adjustedConfig.scenarioVariables.seasonalFactors,
        ...variableChanges.seasonalFactors
      }
    }

    // Apply external events
    if (variableChanges.externalEvents) {
      adjustedConfig.scenarioVariables = adjustedConfig.scenarioVariables || {}
      adjustedConfig.scenarioVariables.externalEvents = [
        ...(adjustedConfig.scenarioVariables.externalEvents || []),
        ...variableChanges.externalEvents
      ]
    }

    // Apply capacity constraints
    if (variableChanges.capacityConstraints) {
      adjustedConfig.scenarioVariables = adjustedConfig.scenarioVariables || {}
      adjustedConfig.scenarioVariables.capacityConstraints = [
        ...(adjustedConfig.scenarioVariables.capacityConstraints || []),
        ...variableChanges.capacityConstraints
      ]
    }

    // Apply market conditions
    if (variableChanges.marketConditions) {
      adjustedConfig.scenarioVariables = adjustedConfig.scenarioVariables || {}
      adjustedConfig.scenarioVariables.marketConditions = [
        ...(adjustedConfig.scenarioVariables.marketConditions || []),
        ...variableChanges.marketConditions
      ]
    }

    return adjustedConfig
  }

  /**
   * Generate baseline prediction (mock implementation)
   */
  private async generateBaselinePrediction(config: PredictionConfiguration): Promise<number[]> {
    // This would integrate with the actual forecasting service
    // For now, return mock data
    const horizon = config.parameters.forecastHorizon
    const baseline: number[] = []
    
    for (let i = 0; i < horizon; i++) {
      // Generate mock baseline values with some trend and seasonality
      const trend = 100 + (i * 2)
      const seasonal = Math.sin((i / 7) * 2 * Math.PI) * 10
      const noise = (Math.random() - 0.5) * 5
      baseline.push(Math.max(0, trend + seasonal + noise))
    }

    return baseline
  }

  /**
   * Generate adjusted prediction based on scenario variables
   */
  private async generateAdjustedPrediction(
    config: PredictionConfiguration,
    baseline: number[],
    variableChanges: Record<string, any>
  ): Promise<number[]> {
    let adjusted = [...baseline]

    // Apply growth rate
    if (variableChanges.growthRate !== undefined) {
      const growthMultiplier = 1 + (variableChanges.growthRate / 100)
      adjusted = adjusted.map(value => value * growthMultiplier)
    }

    // Apply seasonal factors
    if (variableChanges.seasonalFactors) {
      adjusted = adjusted.map((value, index) => {
        const dayOfWeek = index % 7
        const seasonalFactor = variableChanges.seasonalFactors[dayOfWeek] || 1
        return value * seasonalFactor
      })
    }

    // Apply external events
    if (variableChanges.externalEvents) {
      for (const event of variableChanges.externalEvents) {
        const impactMultiplier = 1 + (event.impact / 100)
        // Apply event impact to relevant time periods
        adjusted = adjusted.map(value => value * impactMultiplier)
      }
    }

    // Apply capacity constraints
    if (variableChanges.capacityConstraints) {
      for (const constraint of variableChanges.capacityConstraints) {
        adjusted = adjusted.map(value => Math.min(value, constraint.maxValue))
      }
    }

    // Apply market conditions
    if (variableChanges.marketConditions) {
      for (const condition of variableChanges.marketConditions) {
        adjusted = adjusted.map(value => value * condition.factor)
      }
    }

    return adjusted
  }

  /**
   * Analyze scenario impact
   */
  private analyzeScenarioImpact(
    baseline: number[],
    adjusted: number[],
    variableChanges: Record<string, any>
  ): ImpactAnalysis {
    const totalBaseline = baseline.reduce((sum, val) => sum + val, 0)
    const totalAdjusted = adjusted.reduce((sum, val) => sum + val, 0)
    const totalImpact = ((totalAdjusted - totalBaseline) / totalBaseline) * 100

    const impactByFactor: Record<string, number> = {}
    
    // Calculate impact by factor
    if (variableChanges.growthRate !== undefined) {
      impactByFactor['Growth Rate'] = variableChanges.growthRate
    }
    
    if (variableChanges.externalEvents) {
      const eventImpact = variableChanges.externalEvents.reduce(
        (sum: number, event: ExternalEvent) => sum + event.impact, 0
      )
      impactByFactor['External Events'] = eventImpact
    }

    // Risk assessment
    const riskAssessment = this.assessRisk(totalImpact, variableChanges)

    // Generate recommendations
    const recommendations = this.generateRecommendations(totalImpact, variableChanges)

    return {
      totalImpact,
      impactByFactor,
      riskAssessment,
      recommendations
    }
  }

  /**
   * Assess risk level
   */
  private assessRisk(totalImpact: number, variableChanges: Record<string, any>): RiskAssessment {
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    const keyRisks: string[] = []
    const mitigationStrategies: string[] = []

    if (Math.abs(totalImpact) > 50) {
      riskLevel = 'high'
      keyRisks.push('Extreme impact on predictions')
      mitigationStrategies.push('Consider gradual implementation of changes')
    } else if (Math.abs(totalImpact) > 20) {
      riskLevel = 'medium'
      keyRisks.push('Significant impact on business operations')
      mitigationStrategies.push('Monitor closely and prepare contingency plans')
    }

    if (variableChanges.capacityConstraints?.length > 0) {
      keyRisks.push('Capacity limitations may affect growth')
      mitigationStrategies.push('Plan capacity expansion in advance')
    }

    const uncertaintyRange = {
      min: totalImpact * 0.8,
      max: totalImpact * 1.2
    }

    return {
      riskLevel,
      uncertaintyRange,
      keyRisks,
      mitigationStrategies
    }
  }

  /**
   * Generate recommendations based on impact
   */
  private generateRecommendations(
    totalImpact: number,
    variableChanges: Record<string, any>
  ): string[] {
    const recommendations: string[] = []

    if (totalImpact > 20) {
      recommendations.push('Consider implementing changes gradually to manage risk')
      recommendations.push('Increase monitoring frequency during transition period')
    }

    if (totalImpact < -20) {
      recommendations.push('Prepare mitigation strategies for potential negative impact')
      recommendations.push('Consider alternative scenarios with less severe changes')
    }

    if (variableChanges.growthRate > 50) {
      recommendations.push('Validate growth assumptions with market research')
      recommendations.push('Ensure adequate resources to support projected growth')
    }

    return recommendations
  }

  /**
   * Calculate scenario confidence
   */
  private calculateScenarioConfidence(
    variableChanges: Record<string, any>,
    config: PredictionConfiguration
  ): number {
    let confidence = 1.0

    // Reduce confidence for extreme changes
    if (variableChanges.growthRate && Math.abs(variableChanges.growthRate) > 100) {
      confidence *= 0.7
    }

    // Reduce confidence for multiple simultaneous changes
    const changeCount = Object.keys(variableChanges).length
    if (changeCount > 3) {
      confidence *= 0.8
    }

    // Reduce confidence for short historical data
    if (config.filters.dateRange) {
      const startDate = new Date(config.filters.dateRange.startDate)
      const endDate = new Date(config.filters.dateRange.endDate)
      
      const daysDiff = Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysDiff < 90) {
        confidence *= 0.9
      }
    }

    return Math.max(0.1, confidence)
  }

  /**
   * Generate scenario comparison
   */
  private async generateScenarioComparison(
    baseline: ScenarioResult,
    scenarios: ScenarioResult[],
    comparisonMetrics: string[]
  ): Promise<ScenarioComparison> {
    const metrics: ComparisonMetric[] = []

    // Calculate comparison metrics
    for (const metricName of comparisonMetrics) {
      const metric = this.calculateComparisonMetric(metricName, baseline, scenarios)
      metrics.push(metric)
    }

    // Generate recommendations
    const recommendations = this.generateScenarioRecommendations(baseline, scenarios, metrics)

    return {
      baselineScenario: baseline,
      alternativeScenarios: scenarios,
      comparisonMetrics: metrics,
      recommendations
    }
  }

  /**
   * Calculate comparison metric
   */
  private calculateComparisonMetric(
    metricName: string,
    baseline: ScenarioResult,
    scenarios: ScenarioResult[]
  ): ComparisonMetric {
    const scenarioValues: Record<string, number> = {}

    switch (metricName) {
      case 'total_volume':
        const baselineTotal = baseline.adjustedPrediction.reduce((sum, val) => sum + val, 0)
        scenarios.forEach(scenario => {
          const total = scenario.adjustedPrediction.reduce((sum, val) => sum + val, 0)
          scenarioValues[scenario.scenarioId] = total
        })
        return {
          name: metricName,
          baseline: baselineTotal,
          scenarios: scenarioValues,
          interpretation: 'Total predicted volume across all periods'
        }

      case 'peak_value':
        const baselinePeak = Math.max(...baseline.adjustedPrediction)
        scenarios.forEach(scenario => {
          const peak = Math.max(...scenario.adjustedPrediction)
          scenarioValues[scenario.scenarioId] = peak
        })
        return {
          name: metricName,
          baseline: baselinePeak,
          scenarios: scenarioValues,
          interpretation: 'Highest predicted value in the forecast period'
        }

      case 'volatility':
        const baselineVolatility = this.calculateVolatility(baseline.adjustedPrediction)
        scenarios.forEach(scenario => {
          const volatility = this.calculateVolatility(scenario.adjustedPrediction)
          scenarioValues[scenario.scenarioId] = volatility
        })
        return {
          name: metricName,
          baseline: baselineVolatility,
          scenarios: scenarioValues,
          interpretation: 'Standard deviation of predicted values'
        }

      default:
        return {
          name: metricName,
          baseline: 0,
          scenarios: scenarioValues,
          interpretation: 'Unknown metric'
        }
    }
  }

  /**
   * Calculate volatility (standard deviation)
   */
  private calculateVolatility(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  /**
   * Generate scenario recommendations
   */
  private generateScenarioRecommendations(
    baseline: ScenarioResult,
    scenarios: ScenarioResult[],
    metrics: ComparisonMetric[]
  ): ScenarioRecommendation[] {
    const recommendations: ScenarioRecommendation[] = []

    // Find best performing scenario
    const bestScenario = scenarios.reduce((best, current) => {
      const bestTotal = best.adjustedPrediction.reduce((sum, val) => sum + val, 0)
      const currentTotal = current.adjustedPrediction.reduce((sum, val) => sum + val, 0)
      return currentTotal > bestTotal ? current : best
    })

    if (bestScenario) {
      recommendations.push({
        priority: 'high',
        scenario: bestScenario.scenarioName,
        action: 'Implement this scenario for optimal results',
        expectedBenefit: `${bestScenario.impactAnalysis.totalImpact.toFixed(1)}% improvement over baseline`,
        implementationEffort: 'medium'
      })
    }

    // Find lowest risk scenario
    const lowestRiskScenario = scenarios.reduce((lowest, current) => {
      return current.impactAnalysis.riskAssessment.riskLevel < lowest.impactAnalysis.riskAssessment.riskLevel 
        ? current : lowest
    })

    if (lowestRiskScenario && lowestRiskScenario !== bestScenario) {
      recommendations.push({
        priority: 'medium',
        scenario: lowestRiskScenario.scenarioName,
        action: 'Consider as low-risk alternative',
        expectedBenefit: 'Reduced implementation risk',
        implementationEffort: 'low'
      })
    }

    return recommendations
  }
}