/**
 * Adaptive Preprocessing Pipeline
 * Automatically adjusts preprocessing steps based on data quality changes and performance feedback
 */

import {
  AdaptivePreprocessingConfig,
  PreprocessingStep,
  QualityMetric,
  AdaptationTrigger,
  QualityMonitoringConfig
} from './types'

export interface DataQualityReport {
  overallScore: number
  completeness: number
  accuracy: number
  consistency: number
  validity: number
  uniqueness: number
  issues: DataQualityIssue[]
  recommendations: PreprocessingRecommendation[]
}

export interface DataQualityIssue {
  type: 'missing_values' | 'outliers' | 'duplicates' | 'schema_violations' | 'inconsistent_format'
  severity: 'low' | 'medium' | 'high' | 'critical'
  affectedColumns: string[]
  affectedRows: number
  description: string
  suggestedFix: string
}

export interface PreprocessingRecommendation {
  stepType: PreprocessingStep['type']
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  parameters: Record<string, any>
  expectedImprovement: number
}

export interface ProcessingResult {
  processedData: any[]
  appliedSteps: PreprocessingStep[]
  qualityImprovement: number
  processingTime: number
  warnings: string[]
  errors: string[]
}

export class AdaptivePreprocessingPipeline {
  private config: AdaptivePreprocessingConfig
  private qualityHistory: Map<string, DataQualityReport[]> = new Map()
  private performanceHistory: Map<string, number[]> = new Map()
  private adaptationHistory: AdaptationEvent[] = []

  constructor(config: AdaptivePreprocessingConfig) {
    this.config = config
  }

  /**
   * Process data with adaptive preprocessing
   */
  async processData(
    data: any[],
    datasetId: string,
    targetColumn?: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    
    try {
      // Step 1: Assess data quality
      const qualityReport = await this.assessDataQuality(data, datasetId)
      
      // Step 2: Adapt preprocessing pipeline based on quality
      const adaptedSteps = await this.adaptPipeline(qualityReport, datasetId)
      
      // Step 3: Apply preprocessing steps
      const processedData = await this.applyPreprocessingSteps(data, adaptedSteps)
      
      // Step 4: Validate results
      const postProcessingQuality = await this.assessDataQuality(processedData, datasetId)
      
      const processingTime = Date.now() - startTime
      const qualityImprovement = postProcessingQuality.overallScore - qualityReport.overallScore
      
      // Update history
      this.updateQualityHistory(datasetId, qualityReport)
      this.updatePerformanceHistory(datasetId, qualityImprovement)
      
      return {
        processedData,
        appliedSteps: adaptedSteps,
        qualityImprovement,
        processingTime,
        warnings: this.generateWarnings(qualityReport, postProcessingQuality),
        errors: []
      }
      
    } catch (error) {
      console.error('Adaptive preprocessing failed:', error)
      return {
        processedData: data,
        appliedSteps: [],
        qualityImprovement: 0,
        processingTime: Date.now() - startTime,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Assess data quality using multiple metrics
   */
  private async assessDataQuality(data: any[], datasetId: string): Promise<DataQualityReport> {
    const issues: DataQualityIssue[] = []
    const metrics = {
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      validity: 0,
      uniqueness: 0
    }

    if (data.length === 0) {
      return {
        overallScore: 0,
        ...metrics,
        issues: [{
          type: 'missing_values',
          severity: 'critical',
          affectedColumns: [],
          affectedRows: 0,
          description: 'Dataset is empty',
          suggestedFix: 'Provide valid data'
        }],
        recommendations: []
      }
    }

    // Get column names from first row
    const columns = Object.keys(data[0])
    
    // Assess completeness
    metrics.completeness = this.assessCompleteness(data, columns, issues)
    
    // Assess accuracy (outlier detection)
    metrics.accuracy = this.assessAccuracy(data, columns, issues)
    
    // Assess consistency
    metrics.consistency = this.assessConsistency(data, columns, issues)
    
    // Assess validity (data type consistency)
    metrics.validity = this.assessValidity(data, columns, issues)
    
    // Assess uniqueness (duplicate detection)
    metrics.uniqueness = this.assessUniqueness(data, issues)

    // Calculate overall score
    const weights = this.config.qualityMonitoring.qualityMetrics.reduce((acc, metric) => {
      acc[metric.name] = metric.weight
      return acc
    }, {} as Record<string, number>)

    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
    const overallScore = totalWeight > 0 
      ? Object.entries(metrics).reduce((sum, [key, value]) => {
          const weight = weights[key] || 1
          return sum + (value * weight)
        }, 0) / totalWeight
      : Object.values(metrics).reduce((sum, value) => sum + value, 0) / Object.keys(metrics).length

    // Generate recommendations
    const recommendations = this.generatePreprocessingRecommendations(issues, metrics)

    return {
      overallScore,
      ...metrics,
      issues,
      recommendations
    }
  }

  /**
   * Assess data completeness
   */
  private assessCompleteness(data: any[], columns: string[], issues: DataQualityIssue[]): number {
    let totalCells = data.length * columns.length
    let missingCells = 0
    const missingByColumn: Record<string, number> = {}

    columns.forEach(column => {
      const missing = data.filter(row => 
        row[column] === null || 
        row[column] === undefined || 
        row[column] === '' ||
        (typeof row[column] === 'string' && row[column].trim() === '')
      ).length
      
      missingByColumn[column] = missing
      missingCells += missing
    })

    const completeness = totalCells > 0 ? (totalCells - missingCells) / totalCells : 1

    // Report significant missing values
    Object.entries(missingByColumn).forEach(([column, missing]) => {
      const missingPercentage = missing / data.length
      if (missingPercentage > 0.1) { // More than 10% missing
        issues.push({
          type: 'missing_values',
          severity: missingPercentage > 0.5 ? 'critical' : missingPercentage > 0.3 ? 'high' : 'medium',
          affectedColumns: [column],
          affectedRows: missing,
          description: `Column ${column} has ${(missingPercentage * 100).toFixed(1)}% missing values`,
          suggestedFix: 'Apply imputation or remove column if not critical'
        })
      }
    })

    return completeness
  }

  /**
   * Assess data accuracy (outlier detection)
   */
  private assessAccuracy(data: any[], columns: string[], issues: DataQualityIssue[]): number {
    let totalNumericColumns = 0
    let accurateColumns = 0

    columns.forEach(column => {
      const numericValues = data
        .map(row => parseFloat(row[column]))
        .filter(val => !isNaN(val))

      if (numericValues.length > data.length * 0.5) { // Mostly numeric column
        totalNumericColumns++
        
        const outliers = this.detectOutliers(numericValues)
        const outlierPercentage = outliers.length / numericValues.length

        if (outlierPercentage < 0.05) { // Less than 5% outliers is considered accurate
          accurateColumns++
        } else if (outlierPercentage > 0.1) {
          issues.push({
            type: 'outliers',
            severity: outlierPercentage > 0.2 ? 'high' : 'medium',
            affectedColumns: [column],
            affectedRows: outliers.length,
            description: `Column ${column} has ${(outlierPercentage * 100).toFixed(1)}% outliers`,
            suggestedFix: 'Apply outlier removal or transformation'
          })
        }
      }
    })

    return totalNumericColumns > 0 ? accurateColumns / totalNumericColumns : 1
  }

  /**
   * Assess data consistency
   */
  private assessConsistency(data: any[], columns: string[], issues: DataQualityIssue[]): number {
    let consistentColumns = 0
    let totalColumns = columns.length

    columns.forEach(column => {
      const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined)
      const uniqueFormats = new Set()

      // Check format consistency for string values
      values.forEach(value => {
        if (typeof value === 'string') {
          // Simple format detection (could be enhanced)
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) uniqueFormats.add('date_iso')
          else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) uniqueFormats.add('date_us')
          else if (/^\d+\.\d+$/.test(value)) uniqueFormats.add('decimal')
          else if (/^\d+$/.test(value)) uniqueFormats.add('integer')
          else uniqueFormats.add('text')
        }
      })

      if (uniqueFormats.size <= 2) { // Allow some variation
        consistentColumns++
      } else if (uniqueFormats.size > 3) {
        issues.push({
          type: 'inconsistent_format',
          severity: 'medium',
          affectedColumns: [column],
          affectedRows: values.length,
          description: `Column ${column} has inconsistent formats: ${Array.from(uniqueFormats).join(', ')}`,
          suggestedFix: 'Standardize format or apply format conversion'
        })
      }
    })

    return totalColumns > 0 ? consistentColumns / totalColumns : 1
  }

  /**
   * Assess data validity
   */
  private assessValidity(data: any[], columns: string[], issues: DataQualityIssue[]): number {
    let validColumns = 0
    let totalColumns = columns.length

    columns.forEach(column => {
      const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined)
      const types = new Set(values.map(val => typeof val))

      // Check for mixed types (excluding null/undefined)
      if (types.size === 1) {
        validColumns++
      } else if (types.size > 2) {
        issues.push({
          type: 'schema_violations',
          severity: 'high',
          affectedColumns: [column],
          affectedRows: values.length,
          description: `Column ${column} has mixed data types: ${Array.from(types).join(', ')}`,
          suggestedFix: 'Apply type conversion or data cleaning'
        })
      }
    })

    return totalColumns > 0 ? validColumns / totalColumns : 1
  }

  /**
   * Assess data uniqueness
   */
  private assessUniqueness(data: any[], issues: DataQualityIssue[]): number {
    const totalRows = data.length
    const uniqueRows = new Set(data.map(row => JSON.stringify(row))).size
    const duplicateRows = totalRows - uniqueRows
    const uniqueness = totalRows > 0 ? uniqueRows / totalRows : 1

    if (duplicateRows > 0) {
      const duplicatePercentage = duplicateRows / totalRows
      if (duplicatePercentage > 0.05) { // More than 5% duplicates
        issues.push({
          type: 'duplicates',
          severity: duplicatePercentage > 0.2 ? 'high' : 'medium',
          affectedColumns: [],
          affectedRows: duplicateRows,
          description: `Dataset has ${duplicateRows} duplicate rows (${(duplicatePercentage * 100).toFixed(1)}%)`,
          suggestedFix: 'Remove duplicate rows'
        })
      }
    }

    return uniqueness
  }

  /**
   * Detect outliers using IQR method
   */
  private detectOutliers(values: number[]): number[] {
    if (values.length < 4) return []

    const sorted = [...values].sort((a, b) => a - b)
    const q1Index = Math.floor(sorted.length * 0.25)
    const q3Index = Math.floor(sorted.length * 0.75)
    
    const q1 = sorted[q1Index]
    const q3 = sorted[q3Index]
    const iqr = q3 - q1
    
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr
    
    return values.filter(value => value < lowerBound || value > upperBound)
  }

  /**
   * Generate preprocessing recommendations based on quality issues
   */
  private generatePreprocessingRecommendations(
    issues: DataQualityIssue[],
    metrics: Record<string, number>
  ): PreprocessingRecommendation[] {
    const recommendations: PreprocessingRecommendation[] = []

    issues.forEach(issue => {
      switch (issue.type) {
        case 'missing_values':
          recommendations.push({
            stepType: 'imputation',
            priority: issue.severity as any,
            description: `Apply imputation for missing values in ${issue.affectedColumns.join(', ')}`,
            parameters: {
              strategy: 'mean', // Could be adaptive based on data type
              columns: issue.affectedColumns
            },
            expectedImprovement: 0.2
          })
          break

        case 'outliers':
          recommendations.push({
            stepType: 'outlier_removal',
            priority: issue.severity as any,
            description: `Remove or transform outliers in ${issue.affectedColumns.join(', ')}`,
            parameters: {
              method: 'iqr',
              threshold: 1.5,
              columns: issue.affectedColumns
            },
            expectedImprovement: 0.15
          })
          break

        case 'duplicates':
          recommendations.push({
            stepType: 'normalization',
            priority: issue.severity as any,
            description: 'Remove duplicate rows',
            parameters: {
              method: 'drop_duplicates'
            },
            expectedImprovement: 0.1
          })
          break

        case 'inconsistent_format':
          recommendations.push({
            stepType: 'encoding',
            priority: 'medium',
            description: `Standardize format for ${issue.affectedColumns.join(', ')}`,
            parameters: {
              method: 'standardize',
              columns: issue.affectedColumns
            },
            expectedImprovement: 0.1
          })
          break

        case 'schema_violations':
          recommendations.push({
            stepType: 'encoding',
            priority: 'high',
            description: `Convert data types for ${issue.affectedColumns.join(', ')}`,
            parameters: {
              method: 'type_conversion',
              columns: issue.affectedColumns
            },
            expectedImprovement: 0.25
          })
          break
      }
    })

    // Add normalization if numeric columns need scaling
    if (metrics.accuracy < 0.8) {
      recommendations.push({
        stepType: 'feature_scaling',
        priority: 'medium',
        description: 'Apply feature scaling for better model performance',
        parameters: {
          method: 'standard_scaler'
        },
        expectedImprovement: 0.15
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Adapt preprocessing pipeline based on quality assessment
   */
  private async adaptPipeline(
    qualityReport: DataQualityReport,
    datasetId: string
  ): Promise<PreprocessingStep[]> {
    const adaptedSteps: PreprocessingStep[] = [...this.config.preprocessingSteps]

    // Check if adaptation is needed
    const shouldAdapt = this.shouldTriggerAdaptation(qualityReport, datasetId)
    
    if (!shouldAdapt) {
      return adaptedSteps.filter(step => step.enabled)
    }

    // Apply adaptations based on recommendations
    qualityReport.recommendations.forEach(recommendation => {
      const existingStep = adaptedSteps.find(step => step.type === recommendation.stepType)
      
      if (existingStep) {
        // Update existing step parameters
        existingStep.parameters = { ...existingStep.parameters, ...recommendation.parameters }
        existingStep.enabled = true
      } else {
        // Add new step
        const newStep: PreprocessingStep = {
          id: `adaptive_${recommendation.stepType}_${Date.now()}`,
          type: recommendation.stepType,
          parameters: recommendation.parameters,
          enabled: true,
          adaptive: true,
          priority: this.getPriorityScore(recommendation.priority)
        }
        adaptedSteps.push(newStep)
      }
    })

    // Sort by priority
    adaptedSteps.sort((a, b) => b.priority - a.priority)

    // Log adaptation
    this.logAdaptation(datasetId, qualityReport, adaptedSteps)

    return adaptedSteps.filter(step => step.enabled)
  }

  /**
   * Check if adaptation should be triggered
   */
  private shouldTriggerAdaptation(qualityReport: DataQualityReport, datasetId: string): boolean {
    if (!this.config.enabled) return false

    const history = this.qualityHistory.get(datasetId)
    if (!history || history.length === 0) return true // First time processing

    const lastReport = history[history.length - 1]
    const qualityChange = Math.abs(qualityReport.overallScore - lastReport.overallScore)

    // Check adaptation triggers
    return this.config.adaptationTriggers.some(trigger => {
      if (!trigger.enabled) return false

      switch (trigger.type) {
        case 'data_quality_change':
          return qualityChange > trigger.threshold
        case 'distribution_shift':
          return this.detectDistributionShift(qualityReport, lastReport) > trigger.threshold
        case 'performance_impact':
          return qualityReport.overallScore < trigger.threshold
        default:
          return false
      }
    })
  }

  /**
   * Detect distribution shift between quality reports
   */
  private detectDistributionShift(current: DataQualityReport, previous: DataQualityReport): number {
    const metrics = ['completeness', 'accuracy', 'consistency', 'validity', 'uniqueness']
    let totalShift = 0

    metrics.forEach(metric => {
      const currentValue = current[metric as keyof DataQualityReport] as number
      const previousValue = previous[metric as keyof DataQualityReport] as number
      totalShift += Math.abs(currentValue - previousValue)
    })

    return totalShift / metrics.length
  }

  /**
   * Apply preprocessing steps to data
   */
  private async applyPreprocessingSteps(
    data: any[],
    steps: PreprocessingStep[]
  ): Promise<any[]> {
    let processedData = [...data]

    for (const step of steps) {
      if (!step.enabled) continue

      try {
        processedData = await this.applyStep(processedData, step)
      } catch (error) {
        console.error(`Failed to apply preprocessing step ${step.id}:`, error)
        // Continue with other steps
      }
    }

    return processedData
  }

  /**
   * Apply individual preprocessing step
   */
  private async applyStep(data: any[], step: PreprocessingStep): Promise<any[]> {
    switch (step.type) {
      case 'imputation':
        return this.applyImputation(data, step.parameters)
      case 'outlier_removal':
        return this.applyOutlierRemoval(data, step.parameters)
      case 'normalization':
        return this.applyNormalization(data, step.parameters)
      case 'feature_scaling':
        return this.applyFeatureScaling(data, step.parameters)
      case 'encoding':
        return this.applyEncoding(data, step.parameters)
      default:
        return data
    }
  }

  /**
   * Apply imputation for missing values
   */
  private applyImputation(data: any[], parameters: Record<string, any>): any[] {
    const { strategy = 'mean', columns } = parameters
    const processedData = [...data]

    if (columns && Array.isArray(columns)) {
      columns.forEach(column => {
        const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined && val !== '')
        
        if (values.length === 0) return

        let fillValue: any
        
        switch (strategy) {
          case 'mean':
            const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v))
            fillValue = numericValues.length > 0 
              ? numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length
              : 0
            break
          case 'median':
            const sortedValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v)).sort((a, b) => a - b)
            fillValue = sortedValues.length > 0 
              ? sortedValues[Math.floor(sortedValues.length / 2)]
              : 0
            break
          case 'mode':
            const frequency: Record<string, number> = {}
            values.forEach(val => {
              frequency[val] = (frequency[val] || 0) + 1
            })
            fillValue = Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b)
            break
          default:
            fillValue = strategy // Use strategy as literal value
        }

        processedData.forEach(row => {
          if (row[column] === null || row[column] === undefined || row[column] === '') {
            row[column] = fillValue
          }
        })
      })
    }

    return processedData
  }

  /**
   * Apply outlier removal
   */
  private applyOutlierRemoval(data: any[], parameters: Record<string, any>): any[] {
    const { method = 'iqr', threshold = 1.5, columns } = parameters
    
    if (!columns || !Array.isArray(columns)) return data

    return data.filter(row => {
      return columns.every(column => {
        const value = parseFloat(row[column])
        if (isNaN(value)) return true // Keep non-numeric values

        const columnValues = data.map(r => parseFloat(r[column])).filter(v => !isNaN(v))
        const outliers = this.detectOutliers(columnValues)
        
        return !outliers.includes(value)
      })
    })
  }

  /**
   * Apply normalization (duplicate removal, etc.)
   */
  private applyNormalization(data: any[], parameters: Record<string, any>): any[] {
    const { method } = parameters

    switch (method) {
      case 'drop_duplicates':
        const seen = new Set()
        return data.filter(row => {
          const key = JSON.stringify(row)
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      default:
        return data
    }
  }

  /**
   * Apply feature scaling
   */
  private applyFeatureScaling(data: any[], parameters: Record<string, any>): any[] {
    const { method = 'standard_scaler' } = parameters
    const processedData = [...data]

    if (data.length === 0) return processedData

    const numericColumns = Object.keys(data[0]).filter(column => {
      return data.some(row => !isNaN(parseFloat(row[column])))
    })

    numericColumns.forEach(column => {
      const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v))
      
      if (values.length === 0) return

      let scaledValues: number[]

      switch (method) {
        case 'standard_scaler':
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length
          const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length)
          scaledValues = values.map(val => std > 0 ? (val - mean) / std : 0)
          break
        case 'min_max_scaler':
          const min = Math.min(...values)
          const max = Math.max(...values)
          scaledValues = values.map(val => max > min ? (val - min) / (max - min) : 0)
          break
        default:
          scaledValues = values
      }

      let valueIndex = 0
      processedData.forEach(row => {
        if (!isNaN(parseFloat(row[column]))) {
          row[column] = scaledValues[valueIndex++]
        }
      })
    })

    return processedData
  }

  /**
   * Apply encoding transformations
   */
  private applyEncoding(data: any[], parameters: Record<string, any>): any[] {
    const { method, columns } = parameters
    const processedData = [...data]

    if (columns && Array.isArray(columns)) {
      columns.forEach(column => {
        switch (method) {
          case 'standardize':
            processedData.forEach(row => {
              if (typeof row[column] === 'string') {
                row[column] = row[column].trim().toLowerCase()
              }
            })
            break
          case 'type_conversion':
            processedData.forEach(row => {
              const value = row[column]
              if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                row[column] = parseFloat(value)
              }
            })
            break
        }
      })
    }

    return processedData
  }

  /**
   * Generate warnings based on quality comparison
   */
  private generateWarnings(
    beforeQuality: DataQualityReport,
    afterQuality: DataQualityReport
  ): string[] {
    const warnings: string[] = []

    if (afterQuality.overallScore < beforeQuality.overallScore) {
      warnings.push('Data quality decreased after preprocessing')
    }

    if (afterQuality.issues.length > beforeQuality.issues.length) {
      warnings.push('New data quality issues detected after preprocessing')
    }

    return warnings
  }

  /**
   * Update quality history
   */
  private updateQualityHistory(datasetId: string, report: DataQualityReport): void {
    if (!this.qualityHistory.has(datasetId)) {
      this.qualityHistory.set(datasetId, [])
    }

    const history = this.qualityHistory.get(datasetId)!
    history.push(report)

    // Keep only last 50 reports
    if (history.length > 50) {
      history.splice(0, history.length - 50)
    }
  }

  /**
   * Update performance history
   */
  private updatePerformanceHistory(datasetId: string, improvement: number): void {
    if (!this.performanceHistory.has(datasetId)) {
      this.performanceHistory.set(datasetId, [])
    }

    const history = this.performanceHistory.get(datasetId)!
    history.push(improvement)

    // Keep only last 100 measurements
    if (history.length > 100) {
      history.splice(0, history.length - 100)
    }
  }

  /**
   * Log adaptation event
   */
  private logAdaptation(
    datasetId: string,
    qualityReport: DataQualityReport,
    adaptedSteps: PreprocessingStep[]
  ): void {
    const event: AdaptationEvent = {
      timestamp: new Date(),
      datasetId,
      trigger: 'data_quality_change',
      qualityScore: qualityReport.overallScore,
      adaptedSteps: adaptedSteps.filter(step => step.adaptive).map(step => step.id),
      expectedImprovement: qualityReport.recommendations.reduce((sum, rec) => sum + rec.expectedImprovement, 0)
    }

    this.adaptationHistory.push(event)

    // Keep only last 1000 events
    if (this.adaptationHistory.length > 1000) {
      this.adaptationHistory.splice(0, this.adaptationHistory.length - 1000)
    }
  }

  /**
   * Get priority score from priority level
   */
  private getPriorityScore(priority: string): number {
    const scores = { critical: 4, high: 3, medium: 2, low: 1 }
    return scores[priority as keyof typeof scores] || 1
  }

  /**
   * Get quality history for a dataset
   */
  getQualityHistory(datasetId: string): DataQualityReport[] {
    return this.qualityHistory.get(datasetId) || []
  }

  /**
   * Get performance history for a dataset
   */
  getPerformanceHistory(datasetId: string): number[] {
    return this.performanceHistory.get(datasetId) || []
  }

  /**
   * Get adaptation history
   */
  getAdaptationHistory(): AdaptationEvent[] {
    return [...this.adaptationHistory]
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AdaptivePreprocessingConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

interface AdaptationEvent {
  timestamp: Date
  datasetId: string
  trigger: string
  qualityScore: number
  adaptedSteps: string[]
  expectedImprovement: number
}