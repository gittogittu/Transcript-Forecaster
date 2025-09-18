/**
 * Model Comparison Service
 * Handles cross-validation and model comparison tools
 */

import { Pool } from 'pg'
import {
  ModelComparison,
  ModelComparisonEntry,
  ModelComparisonResult,
  CrossValidationConfig,
  ComparisonMetric
} from '@/types/prediction-config'

export interface CrossValidationResult {
  modelId: string
  foldResults: FoldResult[]
  averageScore: number
  standardDeviation: number
  confidence: number
}

export interface FoldResult {
  foldIndex: number
  trainSize: number
  testSize: number
  metrics: Record<string, number>
  predictions: number[]
  actuals: number[]
}

export interface ModelPerformanceMetrics {
  mae: number // Mean Absolute Error
  rmse: number // Root Mean Square Error
  mape: number // Mean Absolute Percentage Error
  r2: number // R-squared
  aic?: number // Akaike Information Criterion
  bic?: number // Bayesian Information Criterion
}

export interface ModelBenchmarkResult {
  comparison: ModelComparison
  results: ModelComparisonResult[]
  bestModel: ModelComparisonResult
  performanceSummary: PerformanceSummary
  recommendations: ModelRecommendation[]
}

export interface PerformanceSummary {
  totalModels: number
  bestPerformingMetric: string
  performanceGap: number
  consistencyScore: number
  trainingEfficiency: number
}

export interface ModelRecommendation {
  type: 'performance' | 'efficiency' | 'stability' | 'interpretability'
  modelId: string
  reason: string
  confidence: number
  tradeoffs: string[]
}

export class ModelComparisonService {
  private db: Pool

  constructor(db: Pool) {
    this.db = db
  }

  /**
   * Run comprehensive model comparison
   */
  async runModelComparison(comparison: ModelComparison): Promise<ModelBenchmarkResult> {
    const results: ModelComparisonResult[] = []

    // Run cross-validation for each model
    for (const model of comparison.models) {
      const cvResult = await this.runCrossValidation(
        model,
        comparison.dataset,
        comparison.crossValidationConfig
      )

      const performanceMetrics = await this.calculatePerformanceMetrics(
        model,
        comparison.dataset
      )

      const result: ModelComparisonResult = {
        modelId: model.modelId,
        metrics: this.extractMetrics(performanceMetrics, comparison.metrics),
        crossValidationScores: cvResult.foldResults.map(fold => fold.metrics.score || 0),
        trainingTime: await this.measureTrainingTime(model),
        predictionLatency: await this.measurePredictionLatency(model),
        rank: 0 // Will be calculated later
      }

      results.push(result)
    }

    // Rank models
    const rankedResults = this.rankModels(results, comparison.metrics)

    // Generate performance summary
    const performanceSummary = this.generatePerformanceSummary(rankedResults, comparison.metrics)

    // Generate recommendations
    const recommendations = this.generateModelRecommendations(rankedResults, comparison.models)

    // Save comparison results
    await this.saveComparisonResults(comparison, rankedResults)

    return {
      comparison,
      results: rankedResults,
      bestModel: rankedResults[0],
      performanceSummary,
      recommendations
    }
  }

  /**
   * Run cross-validation for a model
   */
  async runCrossValidation(
    model: ModelComparisonEntry,
    dataset: string,
    config: CrossValidationConfig
  ): Promise<CrossValidationResult> {
    const foldResults: FoldResult[] = []

    switch (config.method) {
      case 'time_series':
        return await this.runTimeSeriesCV(model, dataset, config)
      case 'k_fold':
        return await this.runKFoldCV(model, dataset, config)
      case 'walk_forward':
        return await this.runWalkForwardCV(model, dataset, config)
      default:
        throw new Error(`Unsupported CV method: ${config.method}`)
    }
  }

  /**
   * Run time series cross-validation
   */
  private async runTimeSeriesCV(
    model: ModelComparisonEntry,
    dataset: string,
    config: CrossValidationConfig
  ): Promise<CrossValidationResult> {
    const data = await this.loadDataset(dataset)
    const foldResults: FoldResult[] = []
    
    const testSize = config.testSize || Math.floor(data.length * 0.2)
    const gap = config.gap || 0
    
    for (let i = 0; i < config.folds; i++) {
      const trainEndIndex = data.length - testSize - gap - (i * testSize)
      const testStartIndex = trainEndIndex + gap
      const testEndIndex = testStartIndex + testSize

      if (trainEndIndex < testSize) break // Not enough data for this fold

      const trainData = data.slice(0, trainEndIndex)
      const testData = data.slice(testStartIndex, testEndIndex)

      // Train model on fold data
      const trainedModel = await this.trainModelOnFold(model, trainData)
      
      // Make predictions
      const predictions = await this.makePredictions(trainedModel, testData)
      const actuals = testData.map(d => d.value)

      // Calculate metrics
      const metrics = this.calculateFoldMetrics(predictions, actuals)

      foldResults.push({
        foldIndex: i,
        trainSize: trainData.length,
        testSize: testData.length,
        metrics,
        predictions,
        actuals
      })
    }

    return this.aggregateCVResults(model.modelId, foldResults)
  }

  /**
   * Run k-fold cross-validation
   */
  private async runKFoldCV(
    model: ModelComparisonEntry,
    dataset: string,
    config: CrossValidationConfig
  ): Promise<CrossValidationResult> {
    const data = await this.loadDataset(dataset)
    const foldResults: FoldResult[] = []
    const foldSize = Math.floor(data.length / config.folds)

    for (let i = 0; i < config.folds; i++) {
      const testStartIndex = i * foldSize
      const testEndIndex = (i + 1) * foldSize

      const testData = data.slice(testStartIndex, testEndIndex)
      const trainData = [
        ...data.slice(0, testStartIndex),
        ...data.slice(testEndIndex)
      ]

      // Train model on fold data
      const trainedModel = await this.trainModelOnFold(model, trainData)
      
      // Make predictions
      const predictions = await this.makePredictions(trainedModel, testData)
      const actuals = testData.map(d => d.value)

      // Calculate metrics
      const metrics = this.calculateFoldMetrics(predictions, actuals)

      foldResults.push({
        foldIndex: i,
        trainSize: trainData.length,
        testSize: testData.length,
        metrics,
        predictions,
        actuals
      })
    }

    return this.aggregateCVResults(model.modelId, foldResults)
  }

  /**
   * Run walk-forward cross-validation
   */
  private async runWalkForwardCV(
    model: ModelComparisonEntry,
    dataset: string,
    config: CrossValidationConfig
  ): Promise<CrossValidationResult> {
    const data = await this.loadDataset(dataset)
    const foldResults: FoldResult[] = []
    
    const initialTrainSize = Math.floor(data.length * 0.5)
    const testSize = config.testSize || 1

    for (let i = 0; i < config.folds; i++) {
      const trainEndIndex = initialTrainSize + (i * testSize)
      const testStartIndex = trainEndIndex
      const testEndIndex = testStartIndex + testSize

      if (testEndIndex > data.length) break

      const trainData = data.slice(0, trainEndIndex)
      const testData = data.slice(testStartIndex, testEndIndex)

      // Train model on fold data
      const trainedModel = await this.trainModelOnFold(model, trainData)
      
      // Make predictions
      const predictions = await this.makePredictions(trainedModel, testData)
      const actuals = testData.map(d => d.value)

      // Calculate metrics
      const metrics = this.calculateFoldMetrics(predictions, actuals)

      foldResults.push({
        foldIndex: i,
        trainSize: trainData.length,
        testSize: testData.length,
        metrics,
        predictions,
        actuals
      })
    }

    return this.aggregateCVResults(model.modelId, foldResults)
  }

  /**
   * Calculate performance metrics for a model
   */
  private async calculatePerformanceMetrics(
    model: ModelComparisonEntry,
    dataset: string
  ): Promise<ModelPerformanceMetrics> {
    // This would integrate with actual model training and evaluation
    // For now, return mock metrics
    return {
      mae: Math.random() * 10 + 5,
      rmse: Math.random() * 15 + 8,
      mape: Math.random() * 20 + 10,
      r2: Math.random() * 0.3 + 0.7,
      aic: Math.random() * 100 + 200,
      bic: Math.random() * 120 + 220
    }
  }

  /**
   * Extract relevant metrics based on comparison configuration
   */
  private extractMetrics(
    performanceMetrics: ModelPerformanceMetrics,
    comparisonMetrics: ComparisonMetric[]
  ): Record<string, number> {
    const extracted: Record<string, number> = {}

    for (const metric of comparisonMetrics) {
      switch (metric.name) {
        case 'mae':
          extracted[metric.name] = performanceMetrics.mae
          break
        case 'rmse':
          extracted[metric.name] = performanceMetrics.rmse
          break
        case 'mape':
          extracted[metric.name] = performanceMetrics.mape
          break
        case 'r2':
          extracted[metric.name] = performanceMetrics.r2
          break
        case 'aic':
          extracted[metric.name] = performanceMetrics.aic || 0
          break
        case 'bic':
          extracted[metric.name] = performanceMetrics.bic || 0
          break
      }
    }

    return extracted
  }

  /**
   * Rank models based on performance metrics
   */
  private rankModels(
    results: ModelComparisonResult[],
    metrics: ComparisonMetric[]
  ): ModelComparisonResult[] {
    // Calculate composite score for each model
    const scoredResults = results.map(result => {
      let compositeScore = 0
      let weightSum = 0

      for (const metric of metrics) {
        const value = result.metrics[metric.name]
        if (value !== undefined) {
          // Normalize score based on whether higher is better
          const normalizedScore = metric.higherIsBetter ? value : (1 / (1 + value))
          compositeScore += normalizedScore
          weightSum += 1
        }
      }

      return {
        ...result,
        compositeScore: weightSum > 0 ? compositeScore / weightSum : 0
      }
    })

    // Sort by composite score (higher is better)
    scoredResults.sort((a, b) => (b as any).compositeScore - (a as any).compositeScore)

    // Assign ranks
    return scoredResults.map((result, index) => ({
      ...result,
      rank: index + 1
    }))
  }

  /**
   * Generate performance summary
   */
  private generatePerformanceSummary(
    results: ModelComparisonResult[],
    metrics: ComparisonMetric[]
  ): PerformanceSummary {
    const bestModel = results[0]
    const worstModel = results[results.length - 1]

    // Find best performing metric
    let bestMetric = metrics[0]?.name || 'unknown'
    let maxImprovement = 0

    for (const metric of metrics) {
      const bestValue = bestModel.metrics[metric.name]
      const worstValue = worstModel.metrics[metric.name]
      
      if (bestValue !== undefined && worstValue !== undefined) {
        const improvement = metric.higherIsBetter 
          ? (bestValue - worstValue) / worstValue
          : (worstValue - bestValue) / worstValue

        if (improvement > maxImprovement) {
          maxImprovement = improvement
          bestMetric = metric.name
        }
      }
    }

    // Calculate consistency score (lower CV standard deviation is better)
    const cvStdDevs = results.map(r => {
      const scores = r.crossValidationScores
      const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
      return Math.sqrt(variance)
    })
    const avgStdDev = cvStdDevs.reduce((sum, std) => sum + std, 0) / cvStdDevs.length
    const consistencyScore = Math.max(0, 1 - (avgStdDev / 100)) // Normalize to 0-1

    // Calculate training efficiency (inverse of average training time)
    const avgTrainingTime = results.reduce((sum, r) => sum + r.trainingTime, 0) / results.length
    const trainingEfficiency = Math.max(0, 1 - (avgTrainingTime / 3600)) // Normalize assuming 1 hour max

    return {
      totalModels: results.length,
      bestPerformingMetric: bestMetric,
      performanceGap: maxImprovement * 100,
      consistencyScore,
      trainingEfficiency
    }
  }

  /**
   * Generate model recommendations
   */
  private generateModelRecommendations(
    results: ModelComparisonResult[],
    models: ModelComparisonEntry[]
  ): ModelRecommendation[] {
    const recommendations: ModelRecommendation[] = []

    // Best performance recommendation
    const bestModel = results[0]
    recommendations.push({
      type: 'performance',
      modelId: bestModel.modelId,
      reason: 'Highest overall performance across evaluation metrics',
      confidence: 0.9,
      tradeoffs: ['May require more computational resources', 'Potentially longer training time']
    })

    // Most efficient recommendation
    const mostEfficient = results.reduce((best, current) => 
      current.trainingTime < best.trainingTime ? current : best
    )
    if (mostEfficient.modelId !== bestModel.modelId) {
      recommendations.push({
        type: 'efficiency',
        modelId: mostEfficient.modelId,
        reason: 'Fastest training time with acceptable performance',
        confidence: 0.8,
        tradeoffs: ['May sacrifice some accuracy for speed', 'Good for rapid prototyping']
      })
    }

    // Most stable recommendation (lowest CV variance)
    const mostStable = results.reduce((best, current) => {
      const bestVariance = this.calculateVariance(best.crossValidationScores)
      const currentVariance = this.calculateVariance(current.crossValidationScores)
      return currentVariance < bestVariance ? current : best
    })
    if (mostStable.modelId !== bestModel.modelId) {
      recommendations.push({
        type: 'stability',
        modelId: mostStable.modelId,
        reason: 'Most consistent performance across different data splits',
        confidence: 0.85,
        tradeoffs: ['May not achieve peak performance', 'More reliable in production']
      })
    }

    return recommendations
  }

  /**
   * Helper methods
   */
  private async loadDataset(dataset: string): Promise<any[]> {
    // Mock implementation - would load actual dataset
    const mockData = []
    for (let i = 0; i < 1000; i++) {
      mockData.push({
        timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
        value: Math.random() * 100 + 50
      })
    }
    return mockData.reverse()
  }

  private async trainModelOnFold(model: ModelComparisonEntry, data: any[]): Promise<any> {
    // Mock implementation - would train actual model
    return { modelId: model.modelId, trained: true }
  }

  private async makePredictions(trainedModel: any, testData: any[]): Promise<number[]> {
    // Mock implementation - would make actual predictions
    return testData.map(() => Math.random() * 100 + 50)
  }

  private calculateFoldMetrics(predictions: number[], actuals: number[]): Record<string, number> {
    const mae = predictions.reduce((sum, pred, i) => sum + Math.abs(pred - actuals[i]), 0) / predictions.length
    const mse = predictions.reduce((sum, pred, i) => sum + Math.pow(pred - actuals[i], 2), 0) / predictions.length
    const rmse = Math.sqrt(mse)
    
    const actualMean = actuals.reduce((sum, val) => sum + val, 0) / actuals.length
    const totalSumSquares = actuals.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0)
    const residualSumSquares = predictions.reduce((sum, pred, i) => sum + Math.pow(actuals[i] - pred, 2), 0)
    const r2 = 1 - (residualSumSquares / totalSumSquares)

    return {
      mae,
      rmse,
      r2,
      score: r2 // Use R² as the primary score
    }
  }

  private aggregateCVResults(modelId: string, foldResults: FoldResult[]): CrossValidationResult {
    const scores = foldResults.map(fold => fold.metrics.score || 0)
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length
    const standardDeviation = Math.sqrt(variance)
    
    return {
      modelId,
      foldResults,
      averageScore,
      standardDeviation,
      confidence: Math.max(0, 1 - standardDeviation)
    }
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  }

  private async measureTrainingTime(model: ModelComparisonEntry): Promise<number> {
    // Mock implementation - would measure actual training time
    return Math.random() * 300 + 60 // 1-6 minutes
  }

  private async measurePredictionLatency(model: ModelComparisonEntry): Promise<number> {
    // Mock implementation - would measure actual prediction latency
    return Math.random() * 100 + 10 // 10-110 ms
  }

  private async saveComparisonResults(
    comparison: ModelComparison,
    results: ModelComparisonResult[]
  ): Promise<void> {
    const client = await this.db.connect()
    try {
      await client.query('BEGIN')

      // Save comparison
      const comparisonQuery = `
        INSERT INTO model_comparisons (name, models, dataset, metrics, cross_validation_config)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `
      const comparisonResult = await client.query(comparisonQuery, [
        comparison.name,
        JSON.stringify(comparison.models),
        comparison.dataset,
        JSON.stringify(comparison.metrics),
        JSON.stringify(comparison.crossValidationConfig)
      ])

      const comparisonId = comparisonResult.rows[0].id

      // Save results
      for (const result of results) {
        const resultQuery = `
          INSERT INTO model_comparison_results (
            comparison_id, model_id, metrics, cross_validation_scores,
            training_time, prediction_latency, rank
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `
        await client.query(resultQuery, [
          comparisonId,
          result.modelId,
          JSON.stringify(result.metrics),
          JSON.stringify(result.crossValidationScores),
          result.trainingTime,
          result.predictionLatency,
          result.rank
        ])
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}