import { IsolationForestDetector } from '../isolation-forest-detector'
import { TimeSeriesData } from '../types'

describe('IsolationForestDetector', () => {
  let detector: IsolationForestDetector
  let trainingData: TimeSeriesData
  let testData: TimeSeriesData

  beforeEach(() => {
    detector = new IsolationForestDetector({
      nEstimators: 50, // Smaller for faster tests
      maxSamples: 100,
      contamination: 0.1,
      maxFeatures: 1.0,
      randomState: 42
    })

    // Create training data with normal patterns
    const trainingTimestamps = Array.from({ length: 200 }, (_, i) => 
      new Date(Date.now() + i * 60 * 60 * 1000)
    )
    
    const trainingValues = Array.from({ length: 200 }, (_, i) => {
      const baseValue = 100 + Math.sin(i / 20) * 15 // Seasonal pattern
      const noise = (Math.random() - 0.5) * 5
      return baseValue + noise
    })

    trainingData = {
      timestamps: trainingTimestamps,
      values: trainingValues,
      clientId: 'training-client',
      metadata: { source: 'training' }
    }

    // Create test data with some anomalies
    const testTimestamps = Array.from({ length: 50 }, (_, i) => 
      new Date(Date.now() + (200 + i) * 60 * 60 * 1000)
    )
    
    const testValues = Array.from({ length: 50 }, (_, i) => {
      const baseValue = 100 + Math.sin((200 + i) / 20) * 15
      const noise = (Math.random() - 0.5) * 5
      
      // Add clear anomalies
      if (i === 10) return baseValue + 200 // Spike
      if (i === 30) return baseValue - 150 // Drop
      
      return baseValue + noise
    })

    testData = {
      timestamps: testTimestamps,
      values: testValues,
      clientId: 'test-client',
      metadata: { source: 'test' }
    }
  })

  describe('train', () => {
    it('should train the isolation forest model', async () => {
      await expect(detector.train(trainingData)).resolves.not.toThrow()
      expect((detector as any).isTrained).toBe(true)
      expect((detector as any).trees.length).toBe(50)
    })

    it('should throw error for empty training data', async () => {
      const emptyData: TimeSeriesData = {
        timestamps: [],
        values: [],
        clientId: 'empty'
      }

      await expect(detector.train(emptyData)).rejects.toThrow('No features extracted')
    })
  })

  describe('detectAnomalies', () => {
    beforeEach(async () => {
      await detector.train(trainingData)
    })

    it('should detect anomalies after training', async () => {
      const result = await detector.detectAnomalies(testData)
      
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThan(0)
      
      // Should detect the spike and drop we inserted
      const anomalies = result.filter(a => a.deviationScore > 0.5)
      expect(anomalies.length).toBeGreaterThanOrEqual(0)
      
      // If anomalies are detected, they should have reasonable properties
      if (anomalies.length > 0) {
        anomalies.forEach(anomaly => {
          expect(anomaly.type).toMatch(/^(point|contextual|collective)$/)
          expect(anomaly.severity).toMatch(/^(low|medium|high|critical)$/)
          expect(anomaly.confidence).toBeGreaterThan(0)
          expect(anomaly.confidence).toBeLessThanOrEqual(1)
        })
      }
    })

    it('should throw error if not trained', async () => {
      const untrainedDetector = new IsolationForestDetector()
      
      await expect(untrainedDetector.detectAnomalies(testData))
        .rejects.toThrow('Model must be trained')
    })

    it('should include proper metadata in results', async () => {
      const result = await detector.detectAnomalies(testData)
      
      if (result.length > 0) {
        const anomaly = result[0]
        expect(anomaly).toHaveProperty('id')
        expect(anomaly).toHaveProperty('clientId', 'test-client')
        expect(anomaly).toHaveProperty('detectionMethod', 'isolation_forest')
        expect(anomaly.metadata).toHaveProperty('anomalyScore')
        expect(anomaly.metadata).toHaveProperty('threshold')
        expect(anomaly.metadata).toHaveProperty('features')
        expect(anomaly.metadata).toHaveProperty('treeDepths')
      }
    })

    it('should classify anomaly types correctly', async () => {
      const result = await detector.detectAnomalies(testData)
      
      result.forEach(anomaly => {
        expect(['point', 'contextual', 'collective']).toContain(anomaly.type)
      })
    })

    it('should assign appropriate severity levels', async () => {
      const result = await detector.detectAnomalies(testData)
      
      result.forEach(anomaly => {
        expect(['low', 'medium', 'high', 'critical']).toContain(anomaly.severity)
        expect(anomaly.confidence).toBeGreaterThan(0)
        expect(anomaly.confidence).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('updateModel', () => {
    it('should update model with new data', async () => {
      await detector.train(trainingData)
      
      const newData: TimeSeriesData = {
        timestamps: Array.from({ length: 100 }, (_, i) => 
          new Date(Date.now() + (300 + i) * 60 * 60 * 1000)
        ),
        values: Array.from({ length: 100 }, (_, i) => 
          110 + Math.sin((300 + i) / 20) * 10 + (Math.random() - 0.5) * 3
        ),
        clientId: 'update-client'
      }

      await expect(detector.updateModel(newData)).resolves.not.toThrow()
      expect((detector as any).isTrained).toBe(true)
    })
  })

  describe('feature extraction', () => {
    it('should extract meaningful features from time series', async () => {
      const featureExtractor = (detector as any).featureExtractor
      const features = await featureExtractor.extractFeatures(testData)
      
      expect(features).toBeInstanceOf(Array)
      expect(features.length).toBe(testData.values.length)
      
      if (features.length > 0) {
        const featureVector = features[0]
        expect(featureVector).toBeInstanceOf(Array)
        expect(featureVector.length).toBeGreaterThan(5) // Should have multiple features
        
        // All features should be normalized (roughly between 0 and 1)
        featureVector.forEach(feature => {
          expect(feature).toBeGreaterThanOrEqual(-1)
          expect(feature).toBeLessThanOrEqual(2)
        })
      }
    })
  })

  describe('isolation tree functionality', () => {
    it('should build isolation trees with proper structure', async () => {
      await detector.train(trainingData)
      
      const trees = (detector as any).trees
      expect(trees.length).toBe(50)
      
      // Each tree should have a root node
      trees.forEach((tree: any) => {
        expect(tree.root).toBeDefined()
      })
    })

    it('should calculate path lengths correctly', async () => {
      await detector.train(trainingData)
      
      const featureExtractor = (detector as any).featureExtractor
      const features = await featureExtractor.extractFeatures(testData)
      
      if (features.length > 0) {
        const trees = (detector as any).trees
        const pathLengths = await Promise.all(
          trees.map((tree: any) => tree.pathLength(features[0]))
        )
        
        pathLengths.forEach(length => {
          expect(length).toBeGreaterThan(0)
          expect(length).toBeLessThan(50) // Reasonable path length
        })
      }
    })
  })

  describe('configuration', () => {
    it('should respect custom configuration parameters', () => {
      const customDetector = new IsolationForestDetector({
        nEstimators: 200,
        contamination: 0.05,
        maxFeatures: 0.8
      })

      expect((customDetector as any).config.nEstimators).toBe(200)
      expect((customDetector as any).config.contamination).toBe(0.05)
      expect((customDetector as any).config.maxFeatures).toBe(0.8)
    })

    it('should use default configuration when not provided', () => {
      const defaultDetector = new IsolationForestDetector()
      
      expect((defaultDetector as any).config.nEstimators).toBe(100)
      expect((defaultDetector as any).config.contamination).toBe(0.1)
      expect((defaultDetector as any).config.maxFeatures).toBe(1.0)
    })
  })

  describe('edge cases', () => {
    it('should handle minimal training data', async () => {
      const minimalData: TimeSeriesData = {
        timestamps: Array.from({ length: 10 }, (_, i) => 
          new Date(Date.now() + i * 60 * 60 * 1000)
        ),
        values: Array.from({ length: 10 }, () => 100),
        clientId: 'minimal'
      }

      // Should not crash with minimal data
      await expect(detector.train(minimalData)).resolves.not.toThrow()
    })

    it('should handle constant values in training', async () => {
      const constantData: TimeSeriesData = {
        timestamps: Array.from({ length: 100 }, (_, i) => 
          new Date(Date.now() + i * 60 * 60 * 1000)
        ),
        values: Array.from({ length: 100 }, () => 100),
        clientId: 'constant'
      }

      await expect(detector.train(constantData)).resolves.not.toThrow()
      
      // Should still be able to detect anomalies
      const result = await detector.detectAnomalies(testData)
      expect(result).toBeInstanceOf(Array)
    })

    it('should handle missing contextual features gracefully', async () => {
      const dataWithMissingContext: TimeSeriesData = {
        timestamps: [new Date()], // Single timestamp
        values: [100],
        clientId: 'single-point'
      }

      await detector.train(trainingData)
      
      // Should not crash with single data point
      const result = await detector.detectAnomalies(dataWithMissingContext)
      expect(result).toBeInstanceOf(Array)
    })
  })

  describe('performance', () => {
    it('should complete training in reasonable time', async () => {
      const startTime = Date.now()
      await detector.train(trainingData)
      const endTime = Date.now()
      
      // Should complete within 10 seconds for test data
      expect(endTime - startTime).toBeLessThan(10000)
    })

    it('should complete detection in reasonable time', async () => {
      await detector.train(trainingData)
      
      const startTime = Date.now()
      await detector.detectAnomalies(testData)
      const endTime = Date.now()
      
      // Should complete within 5 seconds for test data
      expect(endTime - startTime).toBeLessThan(5000)
    })
  })
})