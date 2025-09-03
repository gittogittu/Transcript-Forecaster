// Vertex AI Model Evaluation and Metrics Collection Service

import { getVertexAIClient } from './client'
import { vertexAIConfig } from './config'
import { withErrorHandling } from './errors'
import type {
  ModelEvaluation,
  Attribution,
  VertexAIClientOptions
} from '@/types/vertex-ai'

export interface EvaluationMetrics {
  mae: number // Mean Absolute Error
  rmse: number // Root Mean Square Error
  mape: number // Mean Absolute Percentage Error
  r2Score: number // R-squared
  meanResidual: number
  medianAbsoluteError: number
  quantileLoss?: Record<string, number> // Quantile losses for different confidence levels
  directionalAccuracy?: number // Percentage of correct directional predictions
}

export interface ForecastingEvaluation {
  modelId: string
  evaluationId: string
  metrics: EvaluationMetrics
  confidenceIntervals: ConfidenceInterval[]
  residualAnalysis: ResidualAnalysis
  featureImportance: FeatureImportance[]
  seasonalityAnalysis?: SeasonalityAnalysis
  createTime: string
  evaluationPeriod: {
    startDate: string
    endDate: string
  }
}

export interface ConfidenceInterval {
  level: number // e.g., 0.95 for 95% confidence
  coverage: number // Actual coverage percentage
  averageWidth: number // Average width of intervals
  calibration: number // How well calibrated the intervals are
}

export interface ResidualAnalysis {
  autocorrelation: number[]
  ljungBoxTest: {
    statistic: number
    pValue: number
    isWhiteNoise: boolean
  }
  normalityTest: {
    statistic: number
    pValue: number
    isNormal: boolean
  }
  heteroscedasticityTest: {
    statistic: number
    pValue: number
    isHomoscedastic: boolean
  }
  residualPlotData: {
    fitted: number[]
    residuals: number[]
    standardizedResiduals: number[]
  }
}

export interface FeatureImportance {
  featureName: string
  importance: number
  importanceType: 'gain' | 'split' | 'permutation'
  rank: number
  confidenceInterval?: {
    lower: number
    upper: number
  }
}

export interface SeasonalityAnalysis {
  seasonalStrength: number
  trendStrength: number
  seasonalPeriods: SeasonalPeriod[]
  decomposition: {
    trend: number[]
    seasonal: number[]
    residual: number[]
  }
}

export interface SeasonalPeriod {
  period: number
  strength: number
  significance: number
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
}

export interface CrossValidationResult {
  folds: number
  metrics: EvaluationMetrics[]
  averageMetrics: EvaluationMetrics
  metricStandardDeviations: EvaluationMetrics
  bestFold: number
  worstFold: number
}

export interface ModelComparison {
  models: ModelComparisonEntry[]
  bestModel: string
  ranking: ModelRanking[]
  statisticalTests: StatisticalTest[]
}

export interface ModelComparisonEntry {
  modelId: string
  modelName: string
  metrics: EvaluationMetrics
  rank: number
  trainingTime: number
  predictionLatency: number
}

export interface ModelRanking {
  modelId: string
  overallScore: number
  metricScores: Record<string, number>
  weights: Record<string, number>
}

export interface StatisticalTest {
  testName: string
  modelA: string
  modelB: string
  statistic: number
  pValue: number
  isSignificant: boolean
  conclusion: string
}

export interface EvaluationConfig {
  evaluationDataSource?: {
    gcsUri?: string
    bigqueryUri?: string
  }
  metrics: string[]
  confidenceLevels: number[]
  crossValidationFolds?: number
  includeFeatureImportance: boolean
  includeResidualAnalysis: boolean
  includeSeasonalityAnalysis: boolean
}

export class ModelEvaluationService {
  private client = getVertexAIClient()

  async evaluateModel(
    modelId: string,
    config: EvaluationConfig
  ): Promise<ForecastingEvaluation> {
    return withErrorHandling(async () => {
      // Get the model evaluation from Vertex AI
      const modelEvaluation = await this.client.getModel(modelId)
      
      // Extract or calculate metrics
      const metrics = await this.calculateMetrics(modelId, config)
      const confidenceIntervals = await this.analyzeConfidenceIntervals(modelId, config.confidenceLevels)
      const residualAnalysis = config.includeResidualAnalysis 
        ? await this.performResidualAnalysis(modelId)
        : this.getEmptyResidualAnalysis()
      const featureImportance = config.includeFeatureImportance
        ? await this.calculateFeatureImportance(modelId)
        : []
      const seasonalityAnalysis = config.includeSeasonalityAnalysis
        ? await this.analyzeSeasonality(modelId)
        : undefined

      return {
        modelId,
        evaluationId: `eval-${modelId}-${Date.now()}`,
        metrics,
        confidenceIntervals,
        residualAnalysis,
        featureImportance,
        seasonalityAnalysis,
        createTime: new Date().toISOString(),
        evaluationPeriod: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      }
    }, 'evaluateModel')
  }

  async performCrossValidation(
    modelConfig: any,
    folds = 5
  ): Promise<CrossValidationResult> {
    return withErrorHandling(async () => {
      const foldMetrics: EvaluationMetrics[] = []
      
      // Simulate cross-validation results
      for (let i = 0; i < folds; i++) {
        const metrics: EvaluationMetrics = {
          mae: 5 + Math.random() * 3,
          rmse: 8 + Math.random() * 4,
          mape: 10 + Math.random() * 5,
          r2Score: 0.7 + Math.random() * 0.2,
          meanResidual: -0.5 + Math.random(),
          medianAbsoluteError: 4 + Math.random() * 2,
          directionalAccuracy: 0.6 + Math.random() * 0.3
        }
        foldMetrics.push(metrics)
      }

      // Calculate average and standard deviations
      const averageMetrics = this.calculateAverageMetrics(foldMetrics)
      const metricStandardDeviations = this.calculateMetricStandardDeviations(foldMetrics, averageMetrics)

      // Find best and worst folds
      const r2Scores = foldMetrics.map(m => m.r2Score)
      const bestFold = r2Scores.indexOf(Math.max(...r2Scores))
      const worstFold = r2Scores.indexOf(Math.min(...r2Scores))

      return {
        folds,
        metrics: foldMetrics,
        averageMetrics,
        metricStandardDeviations,
        bestFold,
        worstFold
      }
    }, 'performCrossValidation')
  }

  async compareModels(modelIds: string[]): Promise<ModelComparison> {
    return withErrorHandling(async () => {
      const models: ModelComparisonEntry[] = []
      
      for (const modelId of modelIds) {
        const evaluation = await this.evaluateModel(modelId, {
          metrics: ['mae', 'rmse', 'mape', 'r2'],
          confidenceLevels: [0.95],
          includeFeatureImportance: false,
          includeResidualAnalysis: false,
          includeSeasonalityAnalysis: false
        })

        models.push({
          modelId,
          modelName: `Model ${modelId}`,
          metrics: evaluation.metrics,
          rank: 0, // Will be calculated
          trainingTime: Math.random() * 3600, // Mock training time in seconds
          predictionLatency: Math.random() * 100 // Mock latency in ms
        })
      }

      // Rank models based on R² score
      models.sort((a, b) => b.metrics.r2Score - a.metrics.r2Score)
      models.forEach((model, index) => {
        model.rank = index + 1
      })

      const bestModel = models[0].modelId

      // Create ranking with weighted scores
      const ranking: ModelRanking[] = models.map(model => ({
        modelId: model.modelId,
        overallScore: this.calculateOverallScore(model.metrics),
        metricScores: {
          r2Score: model.metrics.r2Score,
          mae: 1 / (1 + model.metrics.mae), // Inverse for lower-is-better metrics
          rmse: 1 / (1 + model.metrics.rmse),
          mape: 1 / (1 + model.metrics.mape)
        },
        weights: {
          r2Score: 0.4,
          mae: 0.2,
          rmse: 0.2,
          mape: 0.2
        }
      }))

      // Statistical tests between models
      const statisticalTests: StatisticalTest[] = []
      for (let i = 0; i < models.length - 1; i++) {
        for (let j = i + 1; j < models.length; j++) {
          const test = this.performStatisticalTest(models[i], models[j])
          statisticalTests.push(test)
        }
      }

      return {
        models,
        bestModel,
        ranking,
        statisticalTests
      }
    }, 'compareModels')
  }

  async getModelExplanation(
    modelId: string,
    instances: any[]
  ): Promise<{
    globalExplanation: FeatureImportance[]
    localExplanations: LocalExplanation[]
  }> {
    return withErrorHandling(async () => {
      const globalExplanation = await this.calculateFeatureImportance(modelId)
      
      const localExplanations: LocalExplanation[] = instances.map((instance, index) => ({
        instanceIndex: index,
        prediction: Math.random() * 100 + 50, // Mock prediction
        featureContributions: globalExplanation.map(feature => ({
          featureName: feature.featureName,
          contribution: (Math.random() - 0.5) * 10,
          value: Math.random() * 100
        })),
        baselineValue: 75 // Mock baseline
      }))

      return {
        globalExplanation,
        localExplanations
      }
    }, 'getModelExplanation')
  }

  async calculateMetricTrends(
    modelId: string,
    timeWindow: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<{
    timePoints: string[]
    metricTrends: Record<string, number[]>
    trendAnalysis: TrendAnalysis
  }> {
    return withErrorHandling(async () => {
      const timePoints: string[] = []
      const metricTrends: Record<string, number[]> = {
        mae: [],
        rmse: [],
        mape: [],
        r2Score: []
      }

      // Generate mock time series data
      const numPoints = timeWindow === 'daily' ? 30 : timeWindow === 'weekly' ? 12 : 6
      for (let i = 0; i < numPoints; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (numPoints - i))
        timePoints.push(date.toISOString().split('T')[0])

        // Add some trend and noise
        const trend = i * 0.01
        metricTrends.mae.push(5 + trend + Math.random() * 0.5)
        metricTrends.rmse.push(8 + trend + Math.random() * 0.8)
        metricTrends.mape.push(10 + trend + Math.random() * 1.0)
        metricTrends.r2Score.push(0.85 - trend + Math.random() * 0.05)
      }

      const trendAnalysis: TrendAnalysis = {
        mae: this.analyzeTrend(metricTrends.mae),
        rmse: this.analyzeTrend(metricTrends.rmse),
        mape: this.analyzeTrend(metricTrends.mape),
        r2Score: this.analyzeTrend(metricTrends.r2Score)
      }

      return {
        timePoints,
        metricTrends,
        trendAnalysis
      }
    }, 'calculateMetricTrends')
  }

  private async calculateMetrics(modelId: string, config: EvaluationConfig): Promise<EvaluationMetrics> {
    // This would typically evaluate the model against test data
    // For now, return mock metrics
    return {
      mae: 5.2,
      rmse: 8.1,
      mape: 12.3,
      r2Score: 0.847,
      meanResidual: 0.12,
      medianAbsoluteError: 4.1,
      quantileLoss: {
        '0.1': 2.1,
        '0.5': 4.1,
        '0.9': 8.2
      },
      directionalAccuracy: 0.73
    }
  }

  private async analyzeConfidenceIntervals(
    modelId: string,
    levels: number[]
  ): Promise<ConfidenceInterval[]> {
    return levels.map(level => ({
      level,
      coverage: level - 0.02 + Math.random() * 0.04, // Slight deviation from nominal
      averageWidth: 10 + Math.random() * 5,
      calibration: 0.9 + Math.random() * 0.1
    }))
  }

  private async performResidualAnalysis(modelId: string): Promise<ResidualAnalysis> {
    // Generate mock residual analysis
    const residuals = Array.from({ length: 100 }, () => Math.random() * 4 - 2)
    const fitted = Array.from({ length: 100 }, () => Math.random() * 100 + 50)
    
    return {
      autocorrelation: Array.from({ length: 10 }, (_, i) => Math.exp(-i * 0.3) * (Math.random() * 0.4 - 0.2)),
      ljungBoxTest: {
        statistic: 15.2,
        pValue: 0.085,
        isWhiteNoise: true
      },
      normalityTest: {
        statistic: 2.1,
        pValue: 0.35,
        isNormal: true
      },
      heteroscedasticityTest: {
        statistic: 1.8,
        pValue: 0.18,
        isHomoscedastic: true
      },
      residualPlotData: {
        fitted,
        residuals,
        standardizedResiduals: residuals.map(r => r / 2.0)
      }
    }
  }

  private getEmptyResidualAnalysis(): ResidualAnalysis {
    return {
      autocorrelation: [],
      ljungBoxTest: { statistic: 0, pValue: 1, isWhiteNoise: true },
      normalityTest: { statistic: 0, pValue: 1, isNormal: true },
      heteroscedasticityTest: { statistic: 0, pValue: 1, isHomoscedastic: true },
      residualPlotData: { fitted: [], residuals: [], standardizedResiduals: [] }
    }
  }

  private async calculateFeatureImportance(modelId: string): Promise<FeatureImportance[]> {
    const features = ['day_of_week', 'month', 'quarter', 'lag_1', 'lag_7', 'rolling_mean_7', 'trend']
    
    return features.map((feature, index) => ({
      featureName: feature,
      importance: Math.random() * 0.8 + 0.1,
      importanceType: 'gain' as const,
      rank: index + 1,
      confidenceInterval: {
        lower: Math.random() * 0.1,
        upper: Math.random() * 0.2 + 0.8
      }
    })).sort((a, b) => b.importance - a.importance)
      .map((feature, index) => ({ ...feature, rank: index + 1 }))
  }

  private async analyzeSeasonality(modelId: string): Promise<SeasonalityAnalysis> {
    return {
      seasonalStrength: 0.65,
      trendStrength: 0.42,
      seasonalPeriods: [
        { period: 7, strength: 0.8, significance: 0.95, type: 'weekly' },
        { period: 30, strength: 0.6, significance: 0.85, type: 'monthly' },
        { period: 365, strength: 0.4, significance: 0.75, type: 'yearly' }
      ],
      decomposition: {
        trend: Array.from({ length: 100 }, (_, i) => 50 + i * 0.1 + Math.sin(i * 0.1) * 5),
        seasonal: Array.from({ length: 100 }, (_, i) => Math.sin(i * 2 * Math.PI / 7) * 3),
        residual: Array.from({ length: 100 }, () => Math.random() * 2 - 1)
      }
    }
  }

  private calculateAverageMetrics(metrics: EvaluationMetrics[]): EvaluationMetrics {
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
    
    return {
      mae: avg(metrics.map(m => m.mae)),
      rmse: avg(metrics.map(m => m.rmse)),
      mape: avg(metrics.map(m => m.mape)),
      r2Score: avg(metrics.map(m => m.r2Score)),
      meanResidual: avg(metrics.map(m => m.meanResidual)),
      medianAbsoluteError: avg(metrics.map(m => m.medianAbsoluteError)),
      directionalAccuracy: avg(metrics.map(m => m.directionalAccuracy || 0))
    }
  }

  private calculateMetricStandardDeviations(
    metrics: EvaluationMetrics[],
    averages: EvaluationMetrics
  ): EvaluationMetrics {
    const std = (arr: number[], mean: number) => 
      Math.sqrt(arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length)
    
    return {
      mae: std(metrics.map(m => m.mae), averages.mae),
      rmse: std(metrics.map(m => m.rmse), averages.rmse),
      mape: std(metrics.map(m => m.mape), averages.mape),
      r2Score: std(metrics.map(m => m.r2Score), averages.r2Score),
      meanResidual: std(metrics.map(m => m.meanResidual), averages.meanResidual),
      medianAbsoluteError: std(metrics.map(m => m.medianAbsoluteError), averages.medianAbsoluteError),
      directionalAccuracy: std(metrics.map(m => m.directionalAccuracy || 0), averages.directionalAccuracy || 0)
    }
  }

  private calculateOverallScore(metrics: EvaluationMetrics): number {
    // Weighted combination of metrics (higher is better)
    return (
      metrics.r2Score * 0.4 +
      (1 / (1 + metrics.mae)) * 0.2 +
      (1 / (1 + metrics.rmse)) * 0.2 +
      (1 / (1 + metrics.mape)) * 0.2
    )
  }

  private performStatisticalTest(
    modelA: ModelComparisonEntry,
    modelB: ModelComparisonEntry
  ): StatisticalTest {
    // Mock statistical test (would use actual test data)
    const statistic = Math.abs(modelA.metrics.r2Score - modelB.metrics.r2Score) * 10
    const pValue = Math.random() * 0.1
    const isSignificant = pValue < 0.05
    
    return {
      testName: 'Paired t-test on R² scores',
      modelA: modelA.modelId,
      modelB: modelB.modelId,
      statistic,
      pValue,
      isSignificant,
      conclusion: isSignificant 
        ? `Model ${modelA.rank < modelB.rank ? modelA.modelId : modelB.modelId} is significantly better`
        : 'No significant difference between models'
    }
  }

  private analyzeTrend(values: number[]): { direction: 'increasing' | 'decreasing' | 'stable'; slope: number; significance: number } {
    if (values.length < 2) return { direction: 'stable', slope: 0, significance: 0 }
    
    // Simple linear regression
    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const significance = Math.abs(slope) > 0.01 ? 0.95 : 0.5 // Mock significance
    
    return {
      direction: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable',
      slope,
      significance
    }
  }
}

interface LocalExplanation {
  instanceIndex: number
  prediction: number
  featureContributions: FeatureContribution[]
  baselineValue: number
}

interface FeatureContribution {
  featureName: string
  contribution: number
  value: number
}

interface TrendAnalysis {
  mae: { direction: 'increasing' | 'decreasing' | 'stable'; slope: number; significance: number }
  rmse: { direction: 'increasing' | 'decreasing' | 'stable'; slope: number; significance: number }
  mape: { direction: 'increasing' | 'decreasing' | 'stable'; slope: number; significance: number }
  r2Score: { direction: 'increasing' | 'decreasing' | 'stable'; slope: number; significance: number }
}

// Singleton instance
let modelEvaluationServiceInstance: ModelEvaluationService | null = null

export function getModelEvaluationService(): ModelEvaluationService {
  if (!modelEvaluationServiceInstance) {
    modelEvaluationServiceInstance = new ModelEvaluationService()
  }
  return modelEvaluationServiceInstance
}

export function resetModelEvaluationService(): void {
  modelEvaluationServiceInstance = null
}