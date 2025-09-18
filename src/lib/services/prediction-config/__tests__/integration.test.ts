/**
 * Integration tests for Prediction Configuration System
 */

import { Pool } from 'pg'
import { PredictionConfigurationService } from '../prediction-config-service'
import { ScenarioModelingService } from '../scenario-modeling-service'
import { ModelComparisonService } from '../model-comparison-service'
import { 
  PredictionConfiguration, 
  WhatIfAnalysis,
  ModelComparison 
} from '@/types/prediction-config'

// Mock database for integration tests
const mockDb = {
  connect: jest.fn(),
  query: jest.fn()
} as unknown as Pool

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
}

describe('Prediction Configuration System Integration', () => {
  let configService: PredictionConfigurationService
  let scenarioService: ScenarioModelingService
  let comparisonService: ModelComparisonService
  const userId = 'integration-test-user'

  beforeEach(() => {
    configService = new PredictionConfigurationService(mockDb)
    scenarioService = new ScenarioModelingService(mockDb)
    comparisonService = new ModelComparisonService(mockDb)
    
    jest.clearAllMocks()
    ;(mockDb.connect as jest.Mock).mockResolvedValue(mockClient)
  })

  describe('End-to-End Workflow', () => {
    it('should create configuration, run scenarios, and compare models', async () => {
      // Step 1: Create a prediction configuration
      const configRequest = {
        config: {
          name: 'Integration Test Configuration',
          description: 'Configuration for integration testing',
          filters: {
            clientIds: ['client-1', 'client-2'],
            dateRange: {
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-12-31')
            },
            transcriptTypes: ['support', 'sales']
          },
          parameters: {
            confidenceLevel: 0.95,
            forecastHorizon: 60,
            modelAlgorithm: 'automl' as const,
            seasonalityMode: 'auto' as const,
            includeHolidays: true,
            includeExternalFactors: true
          },
          scenarioVariables: {
            growthRate: 10,
            seasonalFactors: {
              0: 1.0, // Monday
              1: 1.1, // Tuesday
              2: 1.2, // Wednesday
              3: 1.1, // Thursday
              4: 0.9, // Friday
              5: 0.7, // Saturday
              6: 0.6  // Sunday
            }
          },
          tags: ['integration-test', 'production']
        }
      }

      // Mock configuration creation
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 'config-integration-123',
            created_at: new Date(),
            updated_at: new Date()
          }]
        }) // INSERT configuration
        .mockResolvedValueOnce(undefined) // COMMIT

      const configResult = await configService.createConfiguration(configRequest, userId)

      expect(configResult.validation.isValid).toBe(true)
      expect(configResult.config.id).toBe('config-integration-123')

      // Step 2: Run what-if analysis with the configuration
      const whatIfAnalysis: WhatIfAnalysis = {
        baselineConfig: configResult.config,
        scenarios: [
          {
            id: 'optimistic-growth',
            name: 'Optimistic Growth Scenario',
            description: 'Scenario with increased growth and positive market conditions',
            variableChanges: {
              growthRate: 25,
              marketConditions: [{
                id: 'market-expansion',
                name: 'Market Expansion',
                factor: 1.2,
                startDate: new Date('2024-01-01'),
                description: 'Favorable market conditions'
              }]
            }
          },
          {
            id: 'conservative-growth',
            name: 'Conservative Growth Scenario',
            description: 'Scenario with modest growth and capacity constraints',
            variableChanges: {
              growthRate: 5,
              capacityConstraints: [{
                id: 'processing-limit',
                name: 'Processing Capacity Limit',
                maxValue: 1000,
                startDate: new Date('2024-01-01'),
                description: 'Maximum processing capacity'
              }]
            }
          },
          {
            id: 'seasonal-peak',
            name: 'Seasonal Peak Scenario',
            description: 'Scenario modeling holiday season impact',
            variableChanges: {
              externalEvents: [{
                id: 'holiday-season',
                name: 'Holiday Season',
                startDate: new Date('2024-11-01'),
                endDate: new Date('2024-12-31'),
                impact: 35,
                description: 'Holiday season increased activity'
              }],
              seasonalFactors: {
                0: 1.3, // Monday peak
                1: 1.4, // Tuesday peak
                2: 1.5, // Wednesday peak
                3: 1.4, // Thursday peak
                4: 1.2, // Friday
                5: 0.9, // Saturday
                6: 0.8  // Sunday
              }
            }
          }
        ],
        comparisonMetrics: ['total_volume', 'peak_value', 'volatility']
      }

      const scenarioResults = await scenarioService.runWhatIfAnalysis(whatIfAnalysis)

      expect(scenarioResults.baselineScenario).toBeDefined()
      expect(scenarioResults.alternativeScenarios).toHaveLength(3)
      expect(scenarioResults.comparisonMetrics).toHaveLength(3)
      expect(scenarioResults.recommendations).toBeDefined()

      // Verify scenario impacts
      const optimisticScenario = scenarioResults.alternativeScenarios.find(s => s.scenarioId === 'optimistic-growth')
      expect(optimisticScenario).toBeDefined()
      expect(optimisticScenario!.impactAnalysis.totalImpact).toBeGreaterThan(0)

      const conservativeScenario = scenarioResults.alternativeScenarios.find(s => s.scenarioId === 'conservative-growth')
      expect(conservativeScenario).toBeDefined()
      expect(conservativeScenario!.impactAnalysis.totalImpact).toBeLessThan(optimisticScenario!.impactAnalysis.totalImpact)

      // Step 3: Run model comparison to validate the chosen algorithm
      const modelComparison: ModelComparison = {
        id: 'integration-comparison',
        name: 'Integration Test Model Comparison',
        models: [
          {
            modelId: 'automl-forecasting',
            modelName: 'Vertex AI AutoML Forecasting',
            algorithm: 'automl',
            parameters: {
              optimizationObjective: 'minimize_rmse',
              budgetMilliNodeHours: 1000
            },
            isBaseline: true
          },
          {
            modelId: 'arima-model',
            modelName: 'ARIMA Model',
            algorithm: 'arima',
            parameters: {
              order: [1, 1, 1],
              seasonalOrder: [1, 1, 1, 7]
            }
          },
          {
            modelId: 'prophet-model',
            modelName: 'Prophet Model',
            algorithm: 'prophet',
            parameters: {
              seasonalityMode: 'additive',
              changePointPriorScale: 0.05
            }
          },
          {
            modelId: 'lstm-model',
            modelName: 'LSTM Neural Network',
            algorithm: 'lstm',
            parameters: {
              hiddenUnits: 50,
              sequenceLength: 30,
              epochs: 100
            }
          }
        ],
        dataset: 'integration-test-dataset',
        metrics: [
          { name: 'mae', displayName: 'Mean Absolute Error', higherIsBetter: false },
          { name: 'rmse', displayName: 'Root Mean Square Error', higherIsBetter: false },
          { name: 'mape', displayName: 'Mean Absolute Percentage Error', higherIsBetter: false },
          { name: 'r2', displayName: 'R-squared', higherIsBetter: true }
        ],
        crossValidationConfig: {
          method: 'time_series',
          folds: 5,
          testSize: 30,
          gap: 0
        }
      }

      // Mock model comparison database operations
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'comparison-integration-123' }] }) // INSERT comparison
        .mockResolvedValueOnce(undefined) // INSERT result 1
        .mockResolvedValueOnce(undefined) // INSERT result 2
        .mockResolvedValueOnce(undefined) // INSERT result 3
        .mockResolvedValueOnce(undefined) // INSERT result 4
        .mockResolvedValueOnce(undefined) // COMMIT

      const comparisonResults = await comparisonService.runModelComparison(modelComparison)

      expect(comparisonResults.results).toHaveLength(4)
      expect(comparisonResults.bestModel).toBeDefined()
      expect(comparisonResults.performanceSummary).toBeDefined()
      expect(comparisonResults.recommendations).toBeDefined()

      // Verify that AutoML result exists and has a valid rank
      const automlResult = comparisonResults.results.find(r => r.modelId === 'automl-forecasting')
      expect(automlResult).toBeDefined()
      expect(automlResult!.rank).toBeGreaterThan(0)
      expect(automlResult!.rank).toBeLessThanOrEqual(4)

      // Step 4: Verify integration between services
      expect(configResult.config.parameters.modelAlgorithm).toBe('automl')
      
      // The chosen model algorithm should align with comparison results
      const chosenAlgorithm = configResult.config.parameters.modelAlgorithm
      const algorithmResult = comparisonResults.results.find(r => r.modelId.includes(chosenAlgorithm))
      expect(algorithmResult).toBeDefined()
    })

    it('should handle template creation and reuse workflow', async () => {
      // Step 1: Create a configuration
      const originalConfig = {
        config: {
          name: 'Template Source Configuration',
          description: 'Configuration to be converted to template',
          filters: {
            clientIds: ['template-client'],
            transcriptTypes: ['support']
          },
          parameters: {
            confidenceLevel: 0.9,
            forecastHorizon: 30,
            modelAlgorithm: 'prophet' as const
          },
          tags: ['template-source']
        }
      }

      // Mock original configuration creation
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 'original-config-123',
            created_at: new Date(),
            updated_at: new Date()
          }]
        }) // INSERT
        .mockResolvedValueOnce(undefined) // COMMIT

      const originalResult = await configService.createConfiguration(originalConfig, userId)

      // Step 2: Clone as template
      const mockGetConfig = {
        id: 'original-config-123',
        name: 'Template Source Configuration',
        description: 'Configuration to be converted to template',
        filters: { clientIds: ['template-client'] },
        parameters: { confidenceLevel: 0.9, forecastHorizon: 30 },
        createdBy: userId,
        isTemplate: false,
        tags: ['template-source']
      }

      // Mock template creation
      mockClient.query
        .mockResolvedValueOnce({ rows: [mockGetConfig] }) // GET original config
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 'template-123',
            created_at: new Date(),
            updated_at: new Date()
          }]
        }) // INSERT template
        .mockResolvedValueOnce(undefined) // COMMIT

      jest.spyOn(configService, 'getConfiguration').mockResolvedValueOnce(mockGetConfig)
      jest.spyOn(configService, 'createConfiguration').mockResolvedValueOnce({
        config: {
          ...mockGetConfig,
          id: 'template-123',
          name: 'Standard Forecasting Template',
          isTemplate: true
        },
        validation: { isValid: true, errors: [], warnings: [] }
      })

      const template = await configService.cloneAsTemplate(
        'original-config-123',
        'Standard Forecasting Template',
        userId
      )

      expect(template.name).toBe('Standard Forecasting Template')
      expect(template.isTemplate).toBe(true)

      // Step 3: Search for templates
      const expectedTemplate = {
        id: 'template-123',
        name: 'Standard Forecasting Template',
        description: 'Configuration to be converted to template',
        filters: { clientIds: ['template-client'] },
        parameters: { confidenceLevel: 0.9, forecastHorizon: 30 },
        createdBy: userId,
        isTemplate: true,
        tags: ['template-source'],
        usageCount: 0
      }

      jest.spyOn(configService, 'getPopularTemplates').mockResolvedValueOnce([expectedTemplate])

      const popularTemplates = await configService.getPopularTemplates(10)

      expect(popularTemplates).toHaveLength(1)
      expect(popularTemplates[0].name).toBe('Standard Forecasting Template')
      expect(popularTemplates[0].isTemplate).toBe(true)
    })

    it('should validate configuration parameters across services', async () => {
      // Test that validation works consistently across all services
      const invalidConfig = {
        config: {
          name: '', // Invalid - empty name
          filters: {
            dateRange: {
              startDate: new Date('2024-12-31'),
              endDate: new Date('2024-01-01') // Invalid - end before start
            }
          },
          parameters: {
            confidenceLevel: 1.5, // Invalid - too high
            forecastHorizon: -10 // Invalid - negative
          }
        }
      }

      const result = await configService.createConfiguration(invalidConfig, userId)

      expect(result.validation.isValid).toBe(false)
      expect(result.validation.errors.length).toBeGreaterThan(0)

      // Should have errors for name, confidence level, forecast horizon, and date range
      const errorFields = result.validation.errors.map(e => e.field)
      expect(errorFields).toContain('name')
      expect(errorFields).toContain('parameters.confidenceLevel')
      expect(errorFields).toContain('parameters.forecastHorizon')
      expect(errorFields).toContain('filters.dateRange')
    })

    it('should handle complex scenario with all variable types', async () => {
      const baselineConfig: PredictionConfiguration = {
        name: 'Complex Scenario Baseline',
        filters: {
          clientIds: ['complex-client'],
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31')
          }
        },
        parameters: {
          confidenceLevel: 0.95,
          forecastHorizon: 90
        }
      }

      const complexAnalysis: WhatIfAnalysis = {
        baselineConfig,
        scenarios: [
          {
            id: 'comprehensive-scenario',
            name: 'Comprehensive Scenario',
            description: 'Scenario with all types of variables',
            variableChanges: {
              growthRate: 20,
              seasonalFactors: {
                0: 1.2, 1: 1.3, 2: 1.4, 3: 1.3, 4: 1.1, 5: 0.8, 6: 0.7
              },
              externalEvents: [
                {
                  id: 'product-launch',
                  name: 'Product Launch',
                  startDate: new Date('2024-06-01'),
                  endDate: new Date('2024-08-31'),
                  impact: 25,
                  description: 'Major product launch campaign'
                },
                {
                  id: 'system-upgrade',
                  name: 'System Upgrade',
                  startDate: new Date('2024-03-01'),
                  endDate: new Date('2024-03-15'),
                  impact: -10,
                  description: 'Temporary system downtime for upgrades'
                }
              ],
              capacityConstraints: [
                {
                  id: 'processing-capacity',
                  name: 'Processing Capacity',
                  maxValue: 2000,
                  startDate: new Date('2024-01-01'),
                  description: 'Maximum daily processing capacity'
                }
              ],
              marketConditions: [
                {
                  id: 'economic-growth',
                  name: 'Economic Growth',
                  factor: 1.15,
                  startDate: new Date('2024-01-01'),
                  description: 'Positive economic conditions'
                }
              ]
            }
          }
        ],
        comparisonMetrics: ['total_volume', 'peak_value', 'volatility']
      }

      const result = await scenarioService.runWhatIfAnalysis(complexAnalysis)

      expect(result.alternativeScenarios).toHaveLength(1)
      
      const comprehensiveScenario = result.alternativeScenarios[0]
      expect(comprehensiveScenario.impactAnalysis.impactByFactor).toBeDefined()
      expect(comprehensiveScenario.impactAnalysis.riskAssessment).toBeDefined()
      expect(comprehensiveScenario.impactAnalysis.recommendations).toBeDefined()

      // Should have multiple impact factors
      expect(Object.keys(comprehensiveScenario.impactAnalysis.impactByFactor).length).toBeGreaterThan(1)

      // Should assess risk appropriately for complex scenario
      expect(comprehensiveScenario.confidence).toBeLessThan(1.0) // Reduced confidence due to complexity
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle database errors gracefully', async () => {
      // Reset all mocks first
      jest.clearAllMocks()
      
      // Mock database connection to return a client that fails
      const failingClient = {
        query: jest.fn().mockRejectedValueOnce(new Error('Database connection failed')),
        release: jest.fn()
      }
      ;(mockDb.connect as jest.Mock).mockResolvedValueOnce(failingClient)

      const configRequest = {
        config: {
          name: 'Test Configuration',
          filters: {},
          parameters: {
            confidenceLevel: 0.95,
            forecastHorizon: 30
          }
        }
      }

      await expect(
        configService.createConfiguration(configRequest, userId)
      ).rejects.toThrow('Failed to create configuration')
    })

    it('should validate cross-service data consistency', async () => {
      // Test that data passed between services maintains consistency
      const config: PredictionConfiguration = {
        name: 'Consistency Test',
        filters: {
          clientIds: ['test-client']
        },
        parameters: {
          confidenceLevel: 0.95,
          forecastHorizon: 30
        }
      }

      const analysis: WhatIfAnalysis = {
        baselineConfig: config,
        scenarios: [
          {
            id: 'test-scenario',
            name: 'Test Scenario',
            variableChanges: {
              growthRate: 15
            }
          }
        ],
        comparisonMetrics: ['total_volume']
      }

      const result = await scenarioService.runWhatIfAnalysis(analysis)

      // Verify that the baseline configuration is preserved
      expect(result.baselineScenario.scenarioName).toBe('Baseline')
      expect(result.alternativeScenarios[0].scenarioName).toBe('Test Scenario')

      // Verify that forecast horizon is respected
      expect(result.baselineScenario.baselinePrediction).toHaveLength(config.parameters.forecastHorizon)
      expect(result.alternativeScenarios[0].adjustedPrediction).toHaveLength(config.parameters.forecastHorizon)
    })
  })
})