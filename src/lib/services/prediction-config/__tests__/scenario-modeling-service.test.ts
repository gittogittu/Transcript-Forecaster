/**
 * Tests for Scenario Modeling Service
 */

import { Pool } from 'pg'
import { ScenarioModelingService } from '../scenario-modeling-service'
import { WhatIfAnalysis, PredictionConfiguration } from '@/types/prediction-config'

// Mock database
const mockDb = {
  connect: jest.fn(),
  query: jest.fn()
} as unknown as Pool

describe('ScenarioModelingService', () => {
  let service: ScenarioModelingService

  beforeEach(() => {
    service = new ScenarioModelingService(mockDb)
    jest.clearAllMocks()
  })

  describe('runWhatIfAnalysis', () => {
    it('should run what-if analysis with multiple scenarios', async () => {
      const baselineConfig: PredictionConfiguration = {
        name: 'Baseline Configuration',
        filters: {
          clientIds: ['client-1'],
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31')
          }
        },
        parameters: {
          confidenceLevel: 0.95,
          forecastHorizon: 30
        }
      }

      const analysis: WhatIfAnalysis = {
        baselineConfig,
        scenarios: [
          {
            id: 'growth-scenario',
            name: 'Growth Scenario',
            description: 'Optimistic growth scenario',
            variableChanges: {
              growthRate: 25,
              seasonalFactors: {
                0: 1.1, // Monday boost
                1: 1.2, // Tuesday boost
                2: 1.3  // Wednesday boost
              }
            }
          },
          {
            id: 'constraint-scenario',
            name: 'Capacity Constrained',
            description: 'Scenario with capacity limitations',
            variableChanges: {
              growthRate: 15,
              capacityConstraints: [{
                id: 'max-capacity',
                name: 'Maximum Capacity',
                maxValue: 500,
                startDate: new Date('2024-01-01'),
                description: 'System capacity limit'
              }]
            }
          }
        ],
        comparisonMetrics: ['total_volume', 'peak_value', 'volatility']
      }

      const result = await service.runWhatIfAnalysis(analysis)

      expect(result.baselineScenario).toBeDefined()
      expect(result.alternativeScenarios).toHaveLength(2)
      expect(result.comparisonMetrics).toHaveLength(3)
      expect(result.recommendations).toBeDefined()

      // Check that scenarios have different predictions than baseline
      const growthScenario = result.alternativeScenarios.find(s => s.scenarioId === 'growth-scenario')
      expect(growthScenario).toBeDefined()
      expect(growthScenario!.impactAnalysis.totalImpact).toBeGreaterThan(0) // Should show positive impact

      const constraintScenario = result.alternativeScenarios.find(s => s.scenarioId === 'constraint-scenario')
      expect(constraintScenario).toBeDefined()
    })

    it('should handle scenarios with external events', async () => {
      const baselineConfig: PredictionConfiguration = {
        name: 'Baseline Configuration',
        filters: {},
        parameters: {
          confidenceLevel: 0.95,
          forecastHorizon: 30
        }
      }

      const analysis: WhatIfAnalysis = {
        baselineConfig,
        scenarios: [
          {
            id: 'event-scenario',
            name: 'External Event Scenario',
            variableChanges: {
              externalEvents: [{
                id: 'holiday-boost',
                name: 'Holiday Season',
                startDate: new Date('2024-12-01'),
                endDate: new Date('2024-12-31'),
                impact: 40,
                description: 'Holiday season boost'
              }]
            }
          }
        ],
        comparisonMetrics: ['total_volume']
      }

      const result = await service.runWhatIfAnalysis(analysis)

      expect(result.alternativeScenarios).toHaveLength(1)
      const eventScenario = result.alternativeScenarios[0]
      expect(eventScenario.impactAnalysis.impactByFactor['External Events']).toBe(40)
    })

    it('should assess risk levels correctly', async () => {
      const baselineConfig: PredictionConfiguration = {
        name: 'Baseline Configuration',
        filters: {},
        parameters: {
          confidenceLevel: 0.95,
          forecastHorizon: 30
        }
      }

      const analysis: WhatIfAnalysis = {
        baselineConfig,
        scenarios: [
          {
            id: 'extreme-scenario',
            name: 'Extreme Growth Scenario',
            variableChanges: {
              growthRate: 200 // Very high growth rate
            }
          }
        ],
        comparisonMetrics: ['total_volume']
      }

      const result = await service.runWhatIfAnalysis(analysis)

      const extremeScenario = result.alternativeScenarios[0]
      expect(extremeScenario.impactAnalysis.riskAssessment.riskLevel).toBe('high')
      expect(extremeScenario.impactAnalysis.riskAssessment.keyRisks).toContain('Extreme impact on predictions')
    })

    it('should generate appropriate recommendations', async () => {
      const baselineConfig: PredictionConfiguration = {
        name: 'Baseline Configuration',
        filters: {},
        parameters: {
          confidenceLevel: 0.95,
          forecastHorizon: 30
        }
      }

      const analysis: WhatIfAnalysis = {
        baselineConfig,
        scenarios: [
          {
            id: 'moderate-growth',
            name: 'Moderate Growth',
            variableChanges: {
              growthRate: 15
            }
          },
          {
            id: 'high-growth',
            name: 'High Growth',
            variableChanges: {
              growthRate: 35
            }
          }
        ],
        comparisonMetrics: ['total_volume']
      }

      const result = await service.runWhatIfAnalysis(analysis)

      expect(result.recommendations).toBeDefined()
      expect(result.recommendations.length).toBeGreaterThan(0)
      
      const highPriorityRecs = result.recommendations.filter(r => r.priority === 'high')
      expect(highPriorityRecs.length).toBeGreaterThan(0)
    })

    it('should calculate comparison metrics correctly', async () => {
      const baselineConfig: PredictionConfiguration = {
        name: 'Baseline Configuration',
        filters: {},
        parameters: {
          confidenceLevel: 0.95,
          forecastHorizon: 10 // Shorter horizon for easier testing
        }
      }

      const analysis: WhatIfAnalysis = {
        baselineConfig,
        scenarios: [
          {
            id: 'test-scenario',
            name: 'Test Scenario',
            variableChanges: {
              growthRate: 20
            }
          }
        ],
        comparisonMetrics: ['total_volume', 'peak_value', 'volatility']
      }

      const result = await service.runWhatIfAnalysis(analysis)

      expect(result.comparisonMetrics).toHaveLength(3)
      
      const totalVolumeMetric = result.comparisonMetrics.find(m => m.name === 'total_volume')
      expect(totalVolumeMetric).toBeDefined()
      expect(totalVolumeMetric!.baseline).toBeGreaterThan(0)
      expect(totalVolumeMetric!.scenarios['test-scenario']).toBeGreaterThan(totalVolumeMetric!.baseline)

      const peakValueMetric = result.comparisonMetrics.find(m => m.name === 'peak_value')
      expect(peakValueMetric).toBeDefined()

      const volatilityMetric = result.comparisonMetrics.find(m => m.name === 'volatility')
      expect(volatilityMetric).toBeDefined()
    })

    it('should handle market conditions in scenarios', async () => {
      const baselineConfig: PredictionConfiguration = {
        name: 'Baseline Configuration',
        filters: {},
        parameters: {
          confidenceLevel: 0.95,
          forecastHorizon: 30
        }
      }

      const analysis: WhatIfAnalysis = {
        baselineConfig,
        scenarios: [
          {
            id: 'market-scenario',
            name: 'Market Conditions Scenario',
            variableChanges: {
              marketConditions: [{
                id: 'economic-boost',
                name: 'Economic Growth',
                factor: 1.25,
                startDate: new Date('2024-01-01'),
                description: 'Positive economic conditions'
              }]
            }
          }
        ],
        comparisonMetrics: ['total_volume']
      }

      const result = await service.runWhatIfAnalysis(analysis)

      const marketScenario = result.alternativeScenarios[0]
      expect(marketScenario.adjustedPrediction.every((val, idx) => 
        val >= marketScenario.baselinePrediction[idx]
      )).toBe(true) // All values should be higher due to positive market factor
    })
  })

  describe('scenario confidence calculation', () => {
    it('should reduce confidence for extreme changes', async () => {
      const baselineConfig: PredictionConfiguration = {
        name: 'Baseline Configuration',
        filters: {},
        parameters: {
          confidenceLevel: 0.95,
          forecastHorizon: 30
        }
      }

      const analysis: WhatIfAnalysis = {
        baselineConfig,
        scenarios: [
          {
            id: 'extreme-scenario',
            name: 'Extreme Scenario',
            variableChanges: {
              growthRate: 150 // Very extreme growth rate
            }
          }
        ],
        comparisonMetrics: ['total_volume']
      }

      const result = await service.runWhatIfAnalysis(analysis)

      const extremeScenario = result.alternativeScenarios[0]
      expect(extremeScenario.confidence).toBeLessThan(1.0)
      expect(extremeScenario.confidence).toBeGreaterThan(0.1)
    })

    it('should reduce confidence for multiple simultaneous changes', async () => {
      const baselineConfig: PredictionConfiguration = {
        name: 'Baseline Configuration',
        filters: {},
        parameters: {
          confidenceLevel: 0.95,
          forecastHorizon: 30
        }
      }

      const analysis: WhatIfAnalysis = {
        baselineConfig,
        scenarios: [
          {
            id: 'complex-scenario',
            name: 'Complex Scenario',
            variableChanges: {
              growthRate: 25,
              seasonalFactors: { 0: 1.2, 1: 1.1 },
              externalEvents: [{ id: 'event1', name: 'Event 1', startDate: new Date(), impact: 10 }],
              marketConditions: [{ id: 'market1', name: 'Market 1', factor: 1.1, startDate: new Date() }],
              capacityConstraints: [{ id: 'cap1', name: 'Cap 1', maxValue: 1000, startDate: new Date() }]
            }
          }
        ],
        comparisonMetrics: ['total_volume']
      }

      const result = await service.runWhatIfAnalysis(analysis)

      const complexScenario = result.alternativeScenarios[0]
      expect(complexScenario.confidence).toBeLessThan(0.9) // Should be reduced due to complexity
    })
  })
})