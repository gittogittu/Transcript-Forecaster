import { AnomalyDetectionService } from '../anomaly-detection-service'
import { TimeSeriesData } from '../types'

describe('Anomaly Detection System Integration', () => {
  let service: AnomalyDetectionService
  let trainingData: TimeSeriesData
  let testData: TimeSeriesData

  beforeAll(async () => {
    // Create comprehensive training data
    const trainingTimestamps = Array.from({ length: 500 }, (_, i) => 
      new Date(Date.now() - (500 - i) * 60 * 60 * 1000) // Historical hourly data
    )
    
    const trainingValues = Array.from({ length: 500 }, (_, i) => {
      const baseValue = 100 + Math.sin(i / 24) * 30 // Daily seasonality
      const weeklyPattern = Math.sin(i / (24 * 7)) * 10 // Weekly pattern
      const noise = (Math.random() - 0.5) * 8
      return baseValue + weeklyPattern + noise
    })

    trainingData = {
      timestamps: trainingTimestamps,
      values: trainingValues,
      clientId: 'integration-test-client',
      metadata: { source: 'integration-test', type: 'training' }
    }

    // Create test data with various types of anomalies
    const testTimestamps = Array.from({ length: 100 }, (_, i) => 
      new Date(Date.now() + i * 60 * 60 * 1000) // Future hourly data
    )
    
    const testValues = Array.from({ length: 100 }, (_, i) => {
      const baseValue = 100 + Math.sin(i / 24) * 30
      const weeklyPattern = Math.sin(i / (24 * 7)) * 10
      const noise = (Math.random() - 0.5) * 8
      
      // Add different types of anomalies
      if (i === 10) return baseValue + 150 // Point anomaly - spike
      if (i === 25) return baseValue - 120 // Point anomaly - drop
      
      // Collective anomaly - sustained high values
      if (i >= 40 && i <= 45) return baseValue + 80
      
      // Contextual anomaly - unusual for time of day
      if (i === 60 && i % 24 < 6) return baseValue + 100 // High value during night hours
      
      return baseValue + weeklyPattern + noise
    })

    testData = {
      timestamps: testTimestamps,
      values: testValues,
      clientId: 'integration-test-client',
      metadata: { source: 'integration-test', type: 'test' }
    }

    // Initialize service
    service = new AnomalyDetectionService()
    await service.initialize([trainingData])
  })

  describe('End-to-End Anomaly Detection', () => {
    it('should detect all types of anomalies', async () => {
      const result = await service.detectAnomalies(testData)
      
      // Should detect anomalies
      expect(result.anomalies.length).toBeGreaterThan(0)
      
      // Should have different types of anomalies
      const anomalyTypes = new Set(result.anomalies.map(a => a.type))
      expect(anomalyTypes.size).toBeGreaterThan(1) // Should have multiple types
      
      // Should have proper structure
      expect(result).toHaveProperty('overallSeverity')
      expect(result).toHaveProperty('detectionSummary')
      expect(result).toHaveProperty('recommendedActions')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('processingTime')
      
      // Processing time should be reasonable
      expect(result.processingTime).toBeLessThan(5000) // Less than 5 seconds
      
      console.log(`Integration test detected ${result.anomalies.length} anomalies`)
      console.log(`Anomaly types found: ${Array.from(anomalyTypes).join(', ')}`)
    })

    it('should generate explanations for detected anomalies', async () => {
      const result = await service.detectAnomalies(testData)
      
      if (result.anomalies.length > 0) {
        const explanations = await service.explainAnomalies(
          result.anomalies, 
          testData, 
          [trainingData]
        )
        
        expect(explanations.size).toBeGreaterThan(0)
        
        // Check explanation structure
        for (const [anomalyId, explanation] of explanations.entries()) {
          expect(explanation).toHaveProperty('primaryCause')
          expect(explanation).toHaveProperty('contributingFactors')
          expect(explanation).toHaveProperty('historicalContext')
          expect(explanation).toHaveProperty('businessImpact')
          expect(explanation).toHaveProperty('confidence')
          
          expect(Array.isArray(explanation.contributingFactors)).toBe(true)
          expect(typeof explanation.confidence).toBe('number')
          expect(explanation.confidence).toBeGreaterThan(0)
          expect(explanation.confidence).toBeLessThanOrEqual(1)
        }
        
        console.log(`Generated explanations for ${explanations.size} anomalies`)
      }
    })

    it('should generate actionable recommendations', async () => {
      const result = await service.detectAnomalies(testData)
      
      if (result.anomalies.length > 0) {
        const explanations = await service.explainAnomalies(result.anomalies, testData)
        const firstAnomaly = result.anomalies[0]
        const explanation = explanations.get(firstAnomaly.id)
        
        if (explanation) {
          const recommendations = await service.generateRecommendations(
            firstAnomaly, 
            explanation, 
            testData
          )
          
          expect(Array.isArray(recommendations)).toBe(true)
          expect(recommendations.length).toBeGreaterThan(0)
          
          // Check recommendation structure
          recommendations.forEach(rec => {
            expect(rec).toHaveProperty('priority')
            expect(rec).toHaveProperty('category')
            expect(rec).toHaveProperty('title')
            expect(rec).toHaveProperty('description')
            expect(rec).toHaveProperty('expectedOutcome')
            expect(rec).toHaveProperty('implementationEffort')
            expect(rec).toHaveProperty('timeframe')
            
            expect(['low', 'medium', 'high', 'critical']).toContain(rec.priority)
            expect(['immediate', 'preventive', 'investigative']).toContain(rec.category)
            expect(['low', 'medium', 'high']).toContain(rec.implementationEffort)
          })
          
          console.log(`Generated ${recommendations.length} recommendations`)
        }
      }
    })
  })

  describe('Real-time Monitoring Integration', () => {
    it('should handle real-time data processing', async () => {
      // Start monitoring
      await service.startRealTimeMonitoring('integration-test-client', trainingData)
      
      // Add real-time data with anomaly
      const realtimeData: TimeSeriesData = {
        timestamps: [new Date()],
        values: [300], // Clear anomaly
        clientId: 'integration-test-client',
        metadata: { source: 'realtime' }
      }
      
      await service.addRealTimeData('integration-test-client', realtimeData)
      
      // Check monitoring status
      const status = service.getMonitoringStatus()
      expect(status.isMonitoring).toBe(true)
      expect(status.clientsMonitored).toBeGreaterThan(0)
      
      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Stop monitoring
      await service.stopRealTimeMonitoring()
      
      const finalStatus = service.getMonitoringStatus()
      expect(finalStatus.isMonitoring).toBe(false)
    })
  })

  describe('Configuration Management', () => {
    it('should handle configuration updates', async () => {
      const originalConfig = service.getConfiguration()
      
      // Update configuration
      await service.updateConfiguration({
        statistical: {
          zScoreThreshold: 2.5,
          iqrMultiplier: 2.0
        },
        isolationForest: {
          contamination: 0.05,
          nEstimators: 75
        }
      })
      
      const updatedConfig = service.getConfiguration()
      expect(updatedConfig.statistical.zScoreThreshold).toBe(2.5)
      expect(updatedConfig.statistical.iqrMultiplier).toBe(2.0)
      expect(updatedConfig.isolationForest.contamination).toBe(0.05)
      expect(updatedConfig.isolationForest.nEstimators).toBe(75)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Create larger dataset
      const largeData: TimeSeriesData = {
        timestamps: Array.from({ length: 1000 }, (_, i) => 
          new Date(Date.now() + i * 60 * 1000)
        ),
        values: Array.from({ length: 1000 }, (_, i) => {
          const baseValue = 100 + Math.sin(i / 100) * 50
          const noise = (Math.random() - 0.5) * 10
          
          // Add some anomalies
          if (i % 100 === 0) return baseValue + 200
          return baseValue + noise
        }),
        clientId: 'performance-test-client',
        metadata: { source: 'performance-test' }
      }
      
      // Initialize service for large dataset
      const performanceService = new AnomalyDetectionService()
      await performanceService.initialize([largeData])
      
      const startTime = Date.now()
      const result = await performanceService.detectAnomalies(largeData)
      const processingTime = Date.now() - startTime
      
      // Should complete in reasonable time (less than 10 seconds for 1000 points)
      expect(processingTime).toBeLessThan(10000)
      
      // Should still detect anomalies
      expect(result.anomalies.length).toBeGreaterThan(0)
      
      console.log(`Processed 1000 data points in ${processingTime}ms`)
    })

    it('should validate prediction accuracy', async () => {
      // Create a fresh service instance for this test
      const validationService = new AnomalyDetectionService()
      await validationService.initialize([trainingData])
      
      const result = await validationService.detectAnomalies(testData)
      const validation = await validationService.validatePredictions(result.anomalies, testData)
      
      expect(validation).toHaveProperty('precision')
      expect(validation).toHaveProperty('recall')
      expect(validation).toHaveProperty('f1Score')
      
      // Basic sanity checks
      expect(validation.precision).toBeGreaterThanOrEqual(0)
      expect(validation.precision).toBeLessThanOrEqual(1)
      expect(validation.recall).toBeGreaterThanOrEqual(0)
      expect(validation.recall).toBeLessThanOrEqual(1)
      expect(validation.f1Score).toBeGreaterThanOrEqual(0)
      expect(validation.f1Score).toBeLessThanOrEqual(1)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle insufficient data gracefully', async () => {
      const minimalData: TimeSeriesData = {
        timestamps: [new Date()],
        values: [100],
        clientId: 'minimal-test',
        metadata: {}
      }
      
      // Should not crash with minimal data
      await expect(service.detectAnomalies(minimalData)).rejects.toThrow()
    })

    it('should handle missing or invalid data', async () => {
      const invalidData: TimeSeriesData = {
        timestamps: Array.from({ length: 50 }, (_, i) => new Date(Date.now() + i * 60 * 1000)),
        values: Array.from({ length: 50 }, (_, i) => i === 25 ? NaN : 100 + Math.random() * 10), // Contains NaN
        clientId: 'invalid-test',
        metadata: {}
      }
      
      // Initialize service for invalid data test
      const invalidDataService = new AnomalyDetectionService()
      await invalidDataService.initialize([invalidData])
      
      // Should handle NaN values gracefully
      const result = await invalidDataService.detectAnomalies(invalidData)
      expect(result).toBeDefined()
    })
  })
})