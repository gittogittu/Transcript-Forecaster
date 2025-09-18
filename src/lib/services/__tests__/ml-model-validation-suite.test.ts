/**
 * ML Model Validation and Comparison Test Suite
 * 
 * Comprehensive validation tests for:
 * - Model comparison and selection
 * - Cross-validation and statistical testing
 * - A/B testing for model performance
 * - Model interpretability and explainability
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { ModelComparisonService } from '../prediction-config/model-comparison-service'
import { PredictionConfigService } from '../prediction-config/prediction-config-service'
import { ScenarioModelingService } from '../prediction-config/scenario-modeling-service'
import { IntelligentForecastingEngine } from '../forecasting/intelligent-forecasting-engine'

// Mock dependencies
jest.mock('../../database/connection')
jest.mock('../vertex-ai/client')
jest.mock('../vertex-ai/model-evaluation')

describe('ML Model Validation and Comparison Suite', () => {
  let modelComparisonService: ModelComparisonService
  let predictionConfigService: PredictionConfigService
  let scenarioModelingService: ScenarioModelingService
  let forecastingEngine: IntelligentForecastingEngine
  let mockPool: any

  beforeEach(() => {
    modelComparisonService = new ModelComparisonService()
    predictionConfigService = new PredictionConfigService()
    scenarioModelingService = new ScenarioModelingService()
    forecastingEngine = new IntelligentForecastingEngine()

    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn()
      })
    }

    const { getDatabasePool } = require('../../database/connection')
    getDatabasePool.mockResolvedValue(mockPool)

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Model Performance Comparison', () => {
    const generateTestDataset = (size: number, pattern: 'linear' | 'seasonal' | 'random' = 'seasonal') => {
      return Array.from({ length: size }, (_, i) => {
        let value = 100
        
        switch (pattern) {
          case 'linear':
            value = 100 + i * 0.5
            break
          case 'seasonal':
            value = 100 + 20 * Math.sin((i * 2 * Math.PI) / 7) + i * 0.1
            break
          case 'random':
            value = 100 + (Math.random() - 0.5) * 40
            break
        }
        
        return {
          timestamp: new Date(Date.now() - (size - i) * 24 * 60 * 60 * 1000),
          value: Math.max(0, value + (Math.random() - 0.5) * 5) // Add noise
        }
      })
    }

    it('should compare multiple forecasting models accurately', async () => {
      const testData = generateTestDataset(100, 'seasonal')
      const models = ['automl', 'arima', 'linear_regression', 'prophet', 'lstm']
      
      const mockModelResults = {
        automl: {
          predictions: testData.slice(-10).map(d => ({ ...d, value: d.value + (Math.random() - 0.5) * 3 })),
          metrics: { mae: 8.2, rmse: 11.5, mape: 12.8, r2Score: 0.91 },
          trainingTime: 1800, // 30 minutes
          predictionLatency: 120 // 120ms
        },
        arima: {
          predictions: testData.slice(-10).map(d => ({ ...d, value: d.value + (Math.random() - 0.5) * 5 })),
          metrics: { mae: 10.5, rmse: 14.2, mape: 16.3, r2Score: 0.86 },
          trainingTime: 300, // 5 minutes
          predictionLatency: 80 // 80ms
        },
        linear_regression: {
          predictions: testData.slice(-10).map(d => ({ ...d, value: d.value + (Math.random() - 0.5) * 8 })),
          metrics: { mae: 15.2, rmse: 20.1, mape: 22.5, r2Score: 0.72 },
          trainingTime: 30, // 30 seconds
          predictionLatency: 20 // 20ms
        },
        prophet: {
          predictions: testData.slice(-10).map(d => ({ ...d, value: d.value + (Math.random() - 0.5) * 4 })),
          metrics: { mae: 9.8, rmse: 13.1, mape: 15.2, r2Score: 0.88 },
          trainingTime: 600, // 10 minutes
          predictionLatency: 100 // 100ms
        },
        lstm: {
          predictions: testData.slice(-10).map(d => ({ ...d, value: d.value + (Math.random() - 0.5) * 6 })),
          metrics: { mae: 12.1, rmse: 16.8, mape: 18.9, r2Score: 0.82 },
          trainingTime: 3600, // 1 hour
          predictionLatency: 200 // 200ms
        }
      }

      jest.spyOn(modelComparisonService, 'compareModels').mockResolvedValue({
        comparisonId: 'comparison-001',
        models: Object.entries(mockModelResults).map(([name, result]) => ({
          modelName: name,
          ...result,
          rank: 0 // Will be calculated
        })),
        bestModel: 'automl',
        comparisonMetrics: {
          accuracyRanking: ['automl', 'prophet', 'arima', 'lstm', 'linear_regression'],
          speedRanking: ['linear_regression', 'arima', 'prophet', 'automl', 'lstm'],
          efficiencyScore: {
            automl: 0.92,
            prophet: 0.85,
            arima: 0.78,
            lstm: 0.65,
            linear_regression: 0.58
          }
        },
        statisticalSignificance: {
          automlVsProphet: { pValue: 0.023, significant: true },
          automlVsArima: { pValue: 0.008, significant: true },
          prophetVsArima: { pValue: 0.156, significant: false }
        }
      })

      const comparisonResult = await modelComparisonService.compareModels(testData, models, {
        evaluationMetrics: ['mae', 'rmse', 'mape', 'r2Score'],
        crossValidationFolds: 5,
        testSizeRatio: 0.2
      })

      expect(comparisonResult.bestModel).toBe('automl')
      expect(comparisonResult.models).toHaveLength(5)
      
      // Verify ranking is based on accuracy
      const automlResult = comparisonResult.models.find(m => m.modelName === 'automl')
      const linearResult = comparisonResult.models.find(m => m.modelName === 'linear_regression')
      
      expect(automlResult?.metrics.mae).toBeLessThan(linearResult?.metrics.mae || 0)
      expect(automlResult?.metrics.r2Score).toBeGreaterThan(linearResult?.metrics.r2Score || 0)
      
      // Verify statistical significance testing
      expect(comparisonResult.statisticalSignificance.automlVsProphet.significant).toBe(true)
      expect(comparisonResult.statisticalSignificance.prophetVsArima.significant).toBe(false)
    })

    it('should perform robust cross-validation testing', async () => {
      const testData = generateTestDataset(200, 'seasonal')
      
      const mockCrossValidationResults = {
        folds: 5,
        modelResults: {
          automl: {
            foldScores: [
              { fold: 1, mae: 8.1, rmse: 11.2, mape: 12.5, r2Score: 0.92 },
              { fold: 2, mae: 8.5, rmse: 11.8, mape: 13.1, r2Score: 0.90 },
              { fold: 3, mae: 7.9, rmse: 10.9, mape: 12.2, r2Score: 0.93 },
              { fold: 4, mae: 8.8, rmse: 12.1, mape: 13.5, r2Score: 0.89 },
              { fold: 5, mae: 8.3, rmse: 11.5, mape: 12.8, r2Score: 0.91 }
            ],
            averageMetrics: { mae: 8.32, rmse: 11.5, mape: 12.82, r2Score: 0.91 },
            standardDeviation: { mae: 0.35, rmse: 0.45, mape: 0.52, r2Score: 0.015 },
            confidenceInterval: {
              mae: { lower: 7.97, upper: 8.67 },
              r2Score: { lower: 0.895, upper: 0.925 }
            }
          },
          arima: {
            foldScores: [
              { fold: 1, mae: 10.2, rmse: 13.8, mape: 15.9, r2Score: 0.87 },
              { fold: 2, mae: 10.8, rmse: 14.5, mape: 16.8, r2Score: 0.85 },
              { fold: 3, mae: 9.9, rmse: 13.2, mape: 15.1, r2Score: 0.88 },
              { fold: 4, mae: 11.1, rmse: 15.1, mape: 17.2, r2Score: 0.84 },
              { fold: 5, mae: 10.5, rmse: 14.0, mape: 16.3, r2Score: 0.86 }
            ],
            averageMetrics: { mae: 10.5, rmse: 14.12, mape: 16.26, r2Score: 0.86 },
            standardDeviation: { mae: 0.48, rmse: 0.72, mape: 0.85, r2Score: 0.016 },
            confidenceInterval: {
              mae: { lower: 10.02, upper: 10.98 },
              r2Score: { lower: 0.844, upper: 0.876 }
            }
          }
        },
        overallRanking: ['automl', 'arima'],
        statisticalTests: {
          tTest: {
            automlVsArima: {
              statistic: 4.23,
              pValue: 0.013,
              significant: true,
              effectSize: 0.82
            }
          },
          wilcoxonTest: {
            automlVsArima: {
              statistic: 15,
              pValue: 0.031,
              significant: true
            }
          }
        }
      }

      jest.spyOn(modelComparisonService, 'performCrossValidation').mockResolvedValue(mockCrossValidationResults)

      const cvResult = await modelComparisonService.performCrossValidation(testData, ['automl', 'arima'], {
        folds: 5,
        stratified: true,
        randomSeed: 42
      })

      expect(cvResult.folds).toBe(5)
      expect(cvResult.modelResults.automl.averageMetrics.mae).toBeLessThan(
        cvResult.modelResults.arima.averageMetrics.mae
      )
      
      // Verify confidence intervals
      const automlCI = cvResult.modelResults.automl.confidenceInterval
      expect(automlCI.mae.lower).toBeLessThan(automlCI.mae.upper)
      expect(automlCI.r2Score.lower).toBeLessThan(automlCI.r2Score.upper)
      
      // Verify statistical significance
      expect(cvResult.statisticalTests.tTest.automlVsArima.significant).toBe(true)
      expect(cvResult.statisticalTests.tTest.automlVsArima.pValue).toBeLessThan(0.05)
      expect(cvResult.statisticalTests.tTest.automlVsArima.effectSize).toBeGreaterThan(0.5) // Large effect
    })

    it('should validate model stability across different data conditions', async () => {
      const testConditions = [
        { name: 'normal', data: generateTestDataset(100, 'seasonal') },
        { name: 'high_volatility', data: generateTestDataset(100, 'random') },
        { name: 'trending', data: generateTestDataset(100, 'linear') },
        { name: 'sparse_data', data: generateTestDataset(30, 'seasonal') }
      ]

      const mockStabilityResults = {
        modelName: 'automl',
        conditionResults: [
          {
            condition: 'normal',
            metrics: { mae: 8.2, rmse: 11.5, mape: 12.8, r2Score: 0.91 },
            stability: 'high'
          },
          {
            condition: 'high_volatility',
            metrics: { mae: 15.8, rmse: 22.1, mape: 24.5, r2Score: 0.68 },
            stability: 'medium'
          },
          {
            condition: 'trending',
            metrics: { mae: 6.5, rmse: 9.2, mape: 10.1, r2Score: 0.95 },
            stability: 'high'
          },
          {
            condition: 'sparse_data',
            metrics: { mae: 12.1, rmse: 16.8, mape: 18.9, r2Score: 0.78 },
            stability: 'low'
          }
        ],
        overallStability: 'medium',
        stabilityScore: 0.73,
        recommendations: [
          'Model performs well on trending data',
          'Consider ensemble methods for high volatility scenarios',
          'Requires more training data for sparse conditions'
        ]
      }

      jest.spyOn(modelComparisonService, 'assessModelStability').mockResolvedValue(mockStabilityResults)

      const stabilityResult = await modelComparisonService.assessModelStability('automl', testConditions)

      expect(stabilityResult.conditionResults).toHaveLength(4)
      expect(stabilityResult.overallStability).toBe('medium')
      expect(stabilityResult.stabilityScore).toBeGreaterThan(0.5)
      
      // Verify performance varies appropriately across conditions
      const normalPerformance = stabilityResult.conditionResults.find(r => r.condition === 'normal')
      const volatilePerformance = stabilityResult.conditionResults.find(r => r.condition === 'high_volatility')
      
      expect(normalPerformance?.metrics.r2Score).toBeGreaterThan(volatilePerformance?.metrics.r2Score || 0)
      expect(normalPerformance?.stability).toBe('high')
      expect(volatilePerformance?.stability).toBe('medium')
    })
  })

  describe('A/B Testing for Model Performance', () => {
    it('should conduct statistically valid A/B tests between models', async () => {
      const testData = generateTestDataset(1000, 'seasonal') // Large dataset for A/B testing
      
      const mockABTestResults = {
        testId: 'ab-test-001',
        modelA: 'automl-v1',
        modelB: 'automl-v2',
        testDuration: 30, // days
        sampleSize: 1000,
        results: {
          modelA: {
            predictions: 500,
            correctPredictions: 435,
            accuracy: 0.87,
            averageError: 8.5,
            userSatisfaction: 0.82
          },
          modelB: {
            predictions: 500,
            correctPredictions: 455,
            accuracy: 0.91,
            averageError: 7.2,
            userSatisfaction: 0.86
          }
        },
        statisticalAnalysis: {
          accuracyDifference: 0.04,
          confidenceInterval: { lower: 0.015, upper: 0.065 },
          pValue: 0.008,
          statisticalPower: 0.85,
          effectSize: 0.42,
          significant: true
        },
        recommendation: 'Deploy Model B - statistically significant improvement',
        riskAssessment: 'low'
      }

      jest.spyOn(modelComparisonService, 'conductABTest').mockResolvedValue(mockABTestResults)

      const abTestResult = await modelComparisonService.conductABTest({
        modelA: 'automl-v1',
        modelB: 'automl-v2',
        testData,
        splitRatio: 0.5,
        minimumSampleSize: 400,
        significanceLevel: 0.05,
        powerThreshold: 0.8
      })

      expect(abTestResult.statisticalAnalysis.significant).toBe(true)
      expect(abTestResult.statisticalAnalysis.pValue).toBeLessThan(0.05)
      expect(abTestResult.statisticalAnalysis.statisticalPower).toBeGreaterThan(0.8)
      
      // Verify Model B performs better
      expect(abTestResult.results.modelB.accuracy).toBeGreaterThan(abTestResult.results.modelA.accuracy)
      expect(abTestResult.results.modelB.averageError).toBeLessThan(abTestResult.results.modelA.averageError)
      
      expect(abTestResult.recommendation).toContain('Deploy Model B')
      expect(abTestResult.riskAssessment).toBe('low')
    })

    it('should handle inconclusive A/B test results appropriately', async () => {
      const testData = generateTestDataset(200, 'seasonal') // Smaller dataset
      
      const mockInconclusiveResults = {
        testId: 'ab-test-002',
        modelA: 'arima-v1',
        modelB: 'arima-v2',
        testDuration: 14,
        sampleSize: 200,
        results: {
          modelA: {
            predictions: 100,
            correctPredictions: 82,
            accuracy: 0.82,
            averageError: 9.8,
            userSatisfaction: 0.78
          },
          modelB: {
            predictions: 100,
            correctPredictions: 85,
            accuracy: 0.85,
            averageError: 9.2,
            userSatisfaction: 0.80
          }
        },
        statisticalAnalysis: {
          accuracyDifference: 0.03,
          confidenceInterval: { lower: -0.008, upper: 0.068 },
          pValue: 0.12,
          statisticalPower: 0.65,
          effectSize: 0.18,
          significant: false
        },
        recommendation: 'Extend test duration or increase sample size',
        riskAssessment: 'medium'
      }

      jest.spyOn(modelComparisonService, 'conductABTest').mockResolvedValue(mockInconclusiveResults)

      const abTestResult = await modelComparisonService.conductABTest({
        modelA: 'arima-v1',
        modelB: 'arima-v2',
        testData,
        splitRatio: 0.5,
        minimumSampleSize: 100,
        significanceLevel: 0.05,
        powerThreshold: 0.8
      })

      expect(abTestResult.statisticalAnalysis.significant).toBe(false)
      expect(abTestResult.statisticalAnalysis.pValue).toBeGreaterThan(0.05)
      expect(abTestResult.statisticalAnalysis.statisticalPower).toBeLessThan(0.8)
      
      // Confidence interval should include zero
      expect(abTestResult.statisticalAnalysis.confidenceInterval.lower).toBeLessThan(0)
      expect(abTestResult.statisticalAnalysis.confidenceInterval.upper).toBeGreaterThan(0)
      
      expect(abTestResult.recommendation).toContain('Extend test')
      expect(abTestResult.riskAssessment).toBe('medium')
    })
  })

  describe('Model Interpretability and Explainability', () => {
    it('should provide comprehensive model explanations', async () => {
      const testPrediction = {
        timestamp: new Date(),
        value: 85.5,
        confidenceInterval: { lower: 78.2, upper: 92.8 },
        clientId: 'test-client'
      }

      const mockExplanation = {
        predictionId: 'pred-001',
        modelType: 'automl',
        globalExplanations: {
          featureImportance: [
            { feature: 'day_of_week', importance: 0.35, description: 'Day of week has highest impact' },
            { feature: 'historical_trend', importance: 0.28, description: 'Recent trend strongly influences prediction' },
            { feature: 'seasonal_component', importance: 0.22, description: 'Seasonal patterns detected' },
            { feature: 'client_segment', importance: 0.15, description: 'Client-specific behavior patterns' }
          ],
          modelConfidence: 0.89,
          uncertaintySources: [
            'Limited historical data for this client segment',
            'Recent volatility in transcript volumes'
          ]
        },
        localExplanations: {
          shapValues: [
            { feature: 'day_of_week', value: 'Tuesday', contribution: +5.2 },
            { feature: 'historical_trend', value: 'increasing', contribution: +3.8 },
            { feature: 'seasonal_component', value: 'peak_season', contribution: +2.1 },
            { feature: 'client_segment', value: 'enterprise', contribution: +1.4 }
          ],
          baselinePrediction: 73.0,
          totalContribution: +12.5,
          finalPrediction: 85.5
        },
        businessContext: {
          interpretation: 'Prediction indicates above-average transcript volume for Tuesday',
          riskFactors: ['Seasonal peak may amplify volatility'],
          actionableInsights: [
            'Consider increasing capacity for Tuesday operations',
            'Monitor for potential volume spikes during peak season'
          ]
        }
      }

      jest.spyOn(modelComparisonService, 'explainPrediction').mockResolvedValue(mockExplanation)

      const explanation = await modelComparisonService.explainPrediction(testPrediction, {
        includeGlobalExplanations: true,
        includeLocalExplanations: true,
        includeBusinessContext: true
      })

      expect(explanation.globalExplanations.featureImportance).toHaveLength(4)
      expect(explanation.globalExplanations.modelConfidence).toBeGreaterThan(0.8)
      
      // Verify feature importance sums to approximately 1
      const totalImportance = explanation.globalExplanations.featureImportance
        .reduce((sum, f) => sum + f.importance, 0)
      expect(totalImportance).toBeCloseTo(1.0, 1)
      
      // Verify SHAP values explain the prediction
      const totalContribution = explanation.localExplanations.shapValues
        .reduce((sum, s) => sum + s.contribution, 0)
      expect(totalContribution).toBeCloseTo(explanation.localExplanations.totalContribution, 1)
      
      const finalPrediction = explanation.localExplanations.baselinePrediction + 
        explanation.localExplanations.totalContribution
      expect(finalPrediction).toBeCloseTo(explanation.localExplanations.finalPrediction, 1)
      
      expect(explanation.businessContext.actionableInsights).toHaveLength(2)
    })

    it('should detect and explain model biases', async () => {
      const testDataWithDemographics = Array.from({ length: 500 }, (_, i) => ({
        clientId: `client-${i}`,
        clientSegment: i % 3 === 0 ? 'enterprise' : i % 3 === 1 ? 'mid-market' : 'small-business',
        industry: i % 4 === 0 ? 'finance' : i % 4 === 1 ? 'healthcare' : i % 4 === 2 ? 'retail' : 'technology',
        region: i % 2 === 0 ? 'north-america' : 'europe',
        actualValue: 50 + Math.random() * 30,
        predictedValue: 50 + Math.random() * 30 + (i % 3 === 0 ? 5 : 0) // Bias toward enterprise
      }))

      const mockBiasAnalysis = {
        biasDetected: true,
        biasMetrics: {
          demographicParity: {
            enterprise: 0.89,
            midMarket: 0.82,
            smallBusiness: 0.78,
            disparityRatio: 1.14,
            threshold: 1.2,
            passed: true
          },
          equalizedOdds: {
            enterprise: { tpr: 0.91, fpr: 0.08 },
            midMarket: { tpr: 0.85, fpr: 0.12 },
            smallBusiness: { tpr: 0.81, fpr: 0.15 },
            maxDisparity: 0.10,
            threshold: 0.15,
            passed: true
          },
          calibration: {
            enterprise: 0.93,
            midMarket: 0.87,
            smallBusiness: 0.84,
            maxDifference: 0.09,
            threshold: 0.10,
            passed: true
          }
        },
        biasExplanation: {
          primaryBiasSource: 'client_segment',
          biasDirection: 'favors_enterprise_clients',
          potentialCauses: [
            'More training data available for enterprise clients',
            'Enterprise clients have more predictable patterns',
            'Feature engineering may favor enterprise characteristics'
          ],
          recommendedMitigations: [
            'Collect more data for underrepresented segments',
            'Apply fairness constraints during training',
            'Use bias-aware ensemble methods'
          ]
        },
        fairnessScore: 0.82,
        overallAssessment: 'moderate_bias_detected'
      }

      jest.spyOn(modelComparisonService, 'analyzeBias').mockResolvedValue(mockBiasAnalysis)

      const biasAnalysis = await modelComparisonService.analyzeBias('automl-model', testDataWithDemographics, {
        protectedAttributes: ['clientSegment', 'industry', 'region'],
        fairnessMetrics: ['demographicParity', 'equalizedOdds', 'calibration'],
        thresholds: { disparityRatio: 1.2, maxDisparity: 0.15, maxDifference: 0.10 }
      })

      expect(biasAnalysis.biasDetected).toBe(true)
      expect(biasAnalysis.fairnessScore).toBeGreaterThan(0.7)
      expect(biasAnalysis.overallAssessment).toBe('moderate_bias_detected')
      
      // All fairness metrics should pass their thresholds
      expect(biasAnalysis.biasMetrics.demographicParity.passed).toBe(true)
      expect(biasAnalysis.biasMetrics.equalizedOdds.passed).toBe(true)
      expect(biasAnalysis.biasMetrics.calibration.passed).toBe(true)
      
      expect(biasAnalysis.biasExplanation.primaryBiasSource).toBe('client_segment')
      expect(biasAnalysis.biasExplanation.recommendedMitigations).toHaveLength(3)
    })
  })
})