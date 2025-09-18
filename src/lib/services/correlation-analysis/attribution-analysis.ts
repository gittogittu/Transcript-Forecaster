/**
 * Attribution analysis for understanding volume changes
 */

import {
  AttributionAnalysis,
  FactorContribution,
  TimeSeriesData,
  ExternalFactor,
  InfluencingFactor
} from './types'

export class AttributionAnalysisService {
  /**
   * Analyze what factors contributed to volume changes
   */
  async analyzeVolumeAttribution(
    transcriptData: TimeSeriesData,
    externalFactors: ExternalFactor[],
    influencingFactors: InfluencingFactor[],
    changeDate: Date,
    lookbackDays: number = 30
  ): Promise<AttributionAnalysis> {
    try {
      // Calculate volume change
      const volumeChange = this.calculateVolumeChange(transcriptData, changeDate, lookbackDays)
      
      // Identify contributing factors
      const contributingFactors = await this.identifyContributingFactors(
        externalFactors,
        influencingFactors,
        changeDate,
        lookbackDays
      )
      
      // Calculate explained variance
      const totalExplainedVariance = contributingFactors.reduce(
        (sum, factor) => sum + Math.abs(factor.contributionPercentage), 0
      )
      
      const unexplainedVariance = Math.max(0, 100 - totalExplainedVariance)
      
      // Calculate overall confidence
      const confidence = this.calculateAttributionConfidence(contributingFactors)
      
      return {
        volumeChange,
        changeDate,
        contributingFactors,
        totalExplainedVariance,
        unexplainedVariance,
        confidence
      }
    } catch (error) {
      console.error('Error in attribution analysis:', error)
      throw new Error(`Attribution analysis failed: ${error.message}`)
    }
  }

  /**
   * Calculate volume change around a specific date
   */
  private calculateVolumeChange(
    transcriptData: TimeSeriesData,
    changeDate: Date,
    lookbackDays: number
  ): number {
    const changeDateMs = changeDate.getTime()
    const lookbackMs = lookbackDays * 24 * 60 * 60 * 1000
    
    // Get data before and after the change date
    const beforeData: number[] = []
    const afterData: number[] = []
    
    transcriptData.timestamps.forEach((timestamp, index) => {
      const timestampMs = timestamp.getTime()
      const daysDiff = (timestampMs - changeDateMs) / (24 * 60 * 60 * 1000)
      
      if (daysDiff >= -lookbackDays && daysDiff < 0) {
        beforeData.push(transcriptData.values[index])
      } else if (daysDiff >= 0 && daysDiff < lookbackDays) {
        afterData.push(transcriptData.values[index])
      }
    })
    
    if (beforeData.length === 0 || afterData.length === 0) {
      return 0
    }
    
    const beforeAverage = beforeData.reduce((sum, val) => sum + val, 0) / beforeData.length
    const afterAverage = afterData.reduce((sum, val) => sum + val, 0) / afterData.length
    
    return afterAverage - beforeAverage
  }

  /**
   * Identify factors that contributed to the volume change
   */
  private async identifyContributingFactors(
    externalFactors: ExternalFactor[],
    influencingFactors: InfluencingFactor[],
    changeDate: Date,
    lookbackDays: number
  ): Promise<FactorContribution[]> {
    const contributions: FactorContribution[] = []
    const changeDateMs = changeDate.getTime()
    const lookbackMs = lookbackDays * 24 * 60 * 60 * 1000
    
    for (const influencer of influencingFactors) {
      // Find external factors matching this influencer
      const matchingFactors = externalFactors.filter(factor => 
        factor.name === influencer.name &&
        Math.abs(factor.date.getTime() - changeDateMs) <= lookbackMs
      )
      
      if (matchingFactors.length === 0) continue
      
      // Calculate factor change around the date
      const factorChange = this.calculateFactorChange(matchingFactors, changeDate, lookbackDays)
      
      if (Math.abs(factorChange) < 0.01) continue // Skip negligible changes
      
      // Calculate contribution based on correlation and factor change
      const contribution = this.calculateFactorContribution(
        influencer,
        factorChange,
        changeDate
      )
      
      if (Math.abs(contribution.contribution) > 0.1) {
        contributions.push(contribution)
      }
    }
    
    // Sort by absolute contribution
    return contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
  }

  /**
   * Calculate how much a specific factor changed
   */
  private calculateFactorChange(
    factors: ExternalFactor[],
    changeDate: Date,
    lookbackDays: number
  ): number {
    const changeDateMs = changeDate.getTime()
    const lookbackMs = lookbackDays * 24 * 60 * 60 * 1000
    
    const beforeValues: number[] = []
    const afterValues: number[] = []
    
    factors.forEach(factor => {
      const factorDateMs = factor.date.getTime()
      const daysDiff = (factorDateMs - changeDateMs) / (24 * 60 * 60 * 1000)
      
      if (daysDiff >= -lookbackDays && daysDiff < 0) {
        beforeValues.push(factor.value)
      } else if (daysDiff >= 0 && daysDiff < lookbackDays) {
        afterValues.push(factor.value)
      }
    })
    
    if (beforeValues.length === 0 || afterValues.length === 0) {
      return 0
    }
    
    const beforeAverage = beforeValues.reduce((sum, val) => sum + val, 0) / beforeValues.length
    const afterAverage = afterValues.reduce((sum, val) => sum + val, 0) / afterValues.length
    
    return afterAverage - beforeAverage
  }

  /**
   * Calculate the contribution of a factor to volume change
   */
  private calculateFactorContribution(
    influencer: InfluencingFactor,
    factorChange: number,
    changeDate: Date
  ): FactorContribution {
    // Estimate contribution based on correlation strength and factor change
    const baseContribution = influencer.correlation * factorChange
    
    // Adjust for time delay
    const timeDelayAdjustment = Math.max(0.5, 1 - (influencer.timeDelay * 0.1))
    const adjustedContribution = baseContribution * timeDelayAdjustment
    
    // Calculate confidence based on statistical significance
    const confidence = Math.min(0.95, influencer.confidence * timeDelayAdjustment)
    
    // Determine direction
    const direction = adjustedContribution > 0 ? 'increase' : 'decrease'
    
    // Generate explanation
    const explanation = this.generateContributionExplanation(
      influencer,
      factorChange,
      adjustedContribution,
      direction
    )
    
    return {
      factor: influencer.name,
      contribution: adjustedContribution,
      contributionPercentage: Math.abs(adjustedContribution) * 10, // Simplified percentage calculation
      direction,
      confidence,
      explanation
    }
  }

  /**
   * Generate explanation for factor contribution
   */
  private generateContributionExplanation(
    influencer: InfluencingFactor,
    factorChange: number,
    contribution: number,
    direction: 'increase' | 'decrease'
  ): string {
    const changeDirection = factorChange > 0 ? 'increased' : 'decreased'
    const impactMagnitude = Math.abs(contribution) > 5 ? 'significantly' : 'moderately'
    
    let explanation = `${influencer.name} ${changeDirection} by ${Math.abs(factorChange).toFixed(2)}, `
    explanation += `which ${impactMagnitude} contributed to the transcript volume ${direction}. `
    
    if (influencer.timeDelay > 0) {
      explanation += `This effect typically occurs with a ${influencer.timeDelay}-day delay. `
    }
    
    explanation += `Confidence: ${(influencer.confidence * 100).toFixed(1)}%`
    
    return explanation
  }

  /**
   * Calculate overall confidence in attribution analysis
   */
  private calculateAttributionConfidence(contributions: FactorContribution[]): number {
    if (contributions.length === 0) return 0
    
    // Weight confidence by contribution magnitude
    const totalWeight = contributions.reduce((sum, c) => sum + Math.abs(c.contribution), 0)
    
    if (totalWeight === 0) return 0
    
    const weightedConfidence = contributions.reduce(
      (sum, c) => sum + (c.confidence * Math.abs(c.contribution)), 0
    ) / totalWeight
    
    // Adjust for number of contributing factors (more factors = higher confidence)
    const factorCountAdjustment = Math.min(1, contributions.length / 3)
    
    return Math.min(0.95, weightedConfidence * (0.7 + 0.3 * factorCountAdjustment))
  }

  /**
   * Perform decomposition analysis to understand variance sources
   */
  async performVarianceDecomposition(
    transcriptData: TimeSeriesData,
    influencingFactors: InfluencingFactor[]
  ): Promise<{
    explainedVariance: number
    unexplainedVariance: number
    factorContributions: { factor: string; varianceContribution: number }[]
  }> {
    try {
      // Calculate total variance in transcript data
      const mean = transcriptData.values.reduce((sum, val) => sum + val, 0) / transcriptData.values.length
      const totalVariance = transcriptData.values.reduce(
        (sum, val) => sum + Math.pow(val - mean, 2), 0
      ) / transcriptData.values.length
      
      // Calculate variance explained by each factor (simplified approach)
      const factorContributions = influencingFactors.map(factor => ({
        factor: factor.name,
        varianceContribution: Math.pow(factor.correlation, 2) * totalVariance
      }))
      
      const explainedVariance = factorContributions.reduce(
        (sum, contrib) => sum + contrib.varianceContribution, 0
      )
      
      const unexplainedVariance = Math.max(0, totalVariance - explainedVariance)
      
      return {
        explainedVariance: explainedVariance / totalVariance,
        unexplainedVariance: unexplainedVariance / totalVariance,
        factorContributions
      }
    } catch (error) {
      console.error('Error in variance decomposition:', error)
      throw new Error(`Variance decomposition failed: ${error.message}`)
    }
  }

  /**
   * Analyze attribution over multiple time periods
   */
  async analyzeTemporalAttribution(
    transcriptData: TimeSeriesData,
    externalFactors: ExternalFactor[],
    influencingFactors: InfluencingFactor[],
    startDate: Date,
    endDate: Date,
    intervalDays: number = 7
  ): Promise<AttributionAnalysis[]> {
    const attributions: AttributionAnalysis[] = []
    const currentDate = new Date(startDate)
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000
    
    while (currentDate.getTime() <= endDate.getTime()) {
      try {
        const attribution = await this.analyzeVolumeAttribution(
          transcriptData,
          externalFactors,
          influencingFactors,
          new Date(currentDate),
          intervalDays
        )
        
        attributions.push(attribution)
      } catch (error) {
        console.warn(`Failed to analyze attribution for ${currentDate.toISOString()}:`, error)
      }
      
      currentDate.setTime(currentDate.getTime() + intervalMs)
    }
    
    return attributions
  }
}