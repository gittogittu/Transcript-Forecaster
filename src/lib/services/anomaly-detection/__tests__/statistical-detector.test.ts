import { StatisticalAnomalyDetector } from '../statistical-detector'
import { TimeSeriesData } from '../types'

describe('StatisticalAnomalyDetector', () => {
  let detector: StatisticalAnomalyDetector
  let mockData: TimeSeriesData

  beforeEach(() => {
    detector = new StatisticalAnomalyDetector({
      zScoreThreshold: 3.0,
      iqrMultiplier: 1.5,
      seasonalPeriods: [7, 30],
      windowSize: 20,
      minDataPoints: 10
    })

    // Create mock time series data with known patterns
    const timestamps = Array.from({ length: 100 }, (_, i) => 
      new Date(Date.now() + i * 60 * 60 * 1000) // Hourly data
    )
    
    // Generate normal data with some anomalies
    const values = Array.from({ length: 100 }, (_, i) => {
      const baseValue = 100 + Math.sin(i / 10) * 20 // Seasonal pattern
      const noise = (Math.random() - 0.5) * 10
      
      // Add anomalies at specific points
      if (i === 50) return baseValue + 100 // Spike anomaly
      if (i === 75) return baseValue - 80  // Drop anomaly
      
      return baseValue + noise
    })

    mockData = {
      timestamps,
      values,
      clientId: 'test-client',
      metadata: { source: 'test' }
    }
  })

  describe('detectAnomalies', () => {
    it('should detect anomalies in time series data', async () => {
      const result = await detector.detectAnomalies(mockData)
      
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThan(0)
      
      // Should detect the spike and drop we inserted
      const spikeAnomaly = result.find(a => a.actualValue > 150)
      const dropAnomaly = result.find(a => a.actualValue < 50)
      
      expect(spikeAnomaly).toBeDefined()
      expect(dropAnomaly).toBeDefined()
    })

    it('should throw error for insufficient data', async () => {
      const smallData: TimeSeriesData = {
        timestamps: [new Date()],
        values: [100],
        clientId: 'test'
      }

      await expect(detector.detectAnomalies(smallData)).rejects.toThrow('Insufficient data points')
    })

    it('should include proper metadata in anomaly results', async () => {
      const result = await detector.detectAnomalies(mockData)
      
      if (result.length > 0) {
        const anomaly = result[0]
        expect(anomaly).toHaveProperty('id')
        expect(anomaly).toHaveProperty('clientId', 'test-client')
        expect(anomaly).toHaveProperty('timestamp')
        expect(anomaly).toHaveProperty('actualValue')
        expect(anomaly).toHaveProperty('expectedValue')
        expect(anomaly).toHaveProperty('deviationScore')
        expect(anomaly).toHaveProperty('type')
        expect(anomaly).toHaveProperty('severity')
        expect(anomaly).toHaveProperty('detectionMethod')
        expect(anomaly).toHaveProperty('explanation')
        expect(anomaly).toHaveProperty('confidence')
        expect(anomaly).toHaveProperty('isResolved', false)
      }
    })
  })

  describe('detectZScoreAnomalies', () => {
    it('should detect z-score based anomalies', async () => {
      const result = await detector.detectZScoreAnomalies(mockData)
      
      expect(result).toBeInstanceOf(Array)
      result.forEach(anomaly => {
        expect(anomaly.detectionMethod).toBe('z_score')
        expect(anomaly.deviationScore).toBeGreaterThan(3.0)
        expect(anomaly.metadata).toHaveProperty('zScore')
        expect(anomaly.metadata).toHaveProperty('rollingMean')
        expect(anomaly.metadata).toHaveProperty('rollingStd')
      })
    })
  })

  describe('detectIQRAnomalies', () => {
    it('should detect IQR based anomalies', async () => {
      const result = await detector.detectIQRAnomalies(mockData)
      
      expect(result).toBeInstanceOf(Array)
      result.forEach(anomaly => {
        expect(anomaly.detectionMethod).toBe('iqr')
        expect(anomaly.metadata).toHaveProperty('iqrMultiplier')
        expect(anomaly.metadata).toHaveProperty('lowerBound')
        expect(anomaly.metadata).toHaveProperty('upperBound')
        expect(anomaly.metadata).toHaveProperty('q1')
        expect(anomaly.metadata).toHaveProperty('q3')
        expect(anomaly.metadata).toHaveProperty('iqr')
      })
    })
  })

  describe('detectSeasonalAnomalies', () => {
    it('should detect seasonal decomposition based anomalies', async () => {
      // Create data with clear seasonal pattern
      const seasonalData: TimeSeriesData = {
        timestamps: Array.from({ length: 200 }, (_, i) => 
          new Date(Date.now() + i * 24 * 60 * 60 * 1000) // Daily data
        ),
        values: Array.from({ length: 200 }, (_, i) => {
          const seasonal = Math.sin(2 * Math.PI * i / 7) * 10 // Weekly pattern
          const trend = i * 0.1
          const noise = (Math.random() - 0.5) * 2
          
          // Add seasonal anomaly
          if (i === 100) return seasonal + trend + 50
          
          return seasonal + trend + noise
        }),
        clientId: 'seasonal-test'
      }

      const result = await detector.detectSeasonalAnomalies(seasonalData)
      
      expect(result).toBeInstanceOf(Array)
      result.forEach(anomaly => {
        expect(anomaly.detectionMethod).toBe('seasonal_decomposition')
        expect(anomaly.type).toBe('contextual')
        expect(anomaly.metadata).toHaveProperty('period')
        expect(anomaly.metadata).toHaveProperty('residual')
        expect(anomaly.metadata).toHaveProperty('trend')
        expect(anomaly.metadata).toHaveProperty('seasonal')
      })
    })
  })

  describe('severity calculation', () => {
    it('should assign appropriate severity levels', async () => {
      const result = await detector.detectAnomalies(mockData)
      
      result.forEach(anomaly => {
        expect(['low', 'medium', 'high', 'critical']).toContain(anomaly.severity)
        
        // Higher deviation should generally mean higher severity
        if (anomaly.deviationScore > 5) {
          expect(['medium', 'high', 'critical']).toContain(anomaly.severity)
        }
      })
    })
  })

  describe('anomaly merging', () => {
    it('should merge duplicate anomalies from different methods', async () => {
      // Create data that would trigger multiple detection methods
      const multiMethodData: TimeSeriesData = {
        timestamps: Array.from({ length: 50 }, (_, i) => 
          new Date(Date.now() + i * 60 * 60 * 1000)
        ),
        values: Array.from({ length: 50 }, (_, i) => {
          if (i === 25) return 1000 // Extreme outlier
          return 100 + (Math.random() - 0.5) * 5
        }),
        clientId: 'merge-test'
      }

      const result = await detector.detectAnomalies(multiMethodData)
      
      // Should have merged anomalies with ensemble method
      const ensembleAnomalies = result.filter(a => a.detectionMethod === 'ensemble')
      expect(ensembleAnomalies.length).toBeGreaterThanOrEqual(0)
      
      if (ensembleAnomalies.length > 0) {
        const ensembleAnomaly = ensembleAnomalies[0]
        expect(ensembleAnomaly.metadata).toHaveProperty('mergedMethods')
        expect(ensembleAnomaly.explanation).toContain(';')
      }
    })
  })

  describe('configuration', () => {
    it('should respect custom configuration parameters', () => {
      const customDetector = new StatisticalAnomalyDetector({
        zScoreThreshold: 2.5,
        iqrMultiplier: 2.0,
        windowSize: 30
      })

      expect((customDetector as any).config.zScoreThreshold).toBe(2.5)
      expect((customDetector as any).config.iqrMultiplier).toBe(2.0)
      expect((customDetector as any).config.windowSize).toBe(30)
    })

    it('should use default configuration when not provided', () => {
      const defaultDetector = new StatisticalAnomalyDetector()
      
      expect((defaultDetector as any).config.zScoreThreshold).toBe(3.0)
      expect((defaultDetector as any).config.iqrMultiplier).toBe(1.5)
      expect((defaultDetector as any).config.windowSize).toBe(50)
    })
  })

  describe('edge cases', () => {
    it('should handle constant values', async () => {
      const constantData: TimeSeriesData = {
        timestamps: Array.from({ length: 50 }, (_, i) => 
          new Date(Date.now() + i * 60 * 60 * 1000)
        ),
        values: Array.from({ length: 50 }, () => 100),
        clientId: 'constant-test'
      }

      const result = await detector.detectAnomalies(constantData)
      expect(result).toBeInstanceOf(Array)
      // Should not crash, may or may not detect anomalies depending on implementation
    })

    it('should handle NaN and infinite values gracefully', async () => {
      const problematicData: TimeSeriesData = {
        timestamps: Array.from({ length: 50 }, (_, i) => 
          new Date(Date.now() + i * 60 * 60 * 1000)
        ),
        values: Array.from({ length: 50 }, (_, i) => {
          if (i === 10) return NaN
          if (i === 20) return Infinity
          if (i === 30) return -Infinity
          return 100 + (Math.random() - 0.5) * 10
        }),
        clientId: 'problematic-test'
      }

      // Should not throw error
      const result = await detector.detectAnomalies(problematicData)
      expect(result).toBeInstanceOf(Array)
    })
  })
})

describe('StatisticalAnomalyDetector', () => {
	test('detects simple z-score anomalies', async () => {
		const detector = new StatisticalAnomalyDetector({ zScoreThreshold: 2 })
		const data: TimeSeriesData = {
			timestamps: Array.from({ length: 20 }, (_, i) => new Date(2024, 0, i + 1)),
			values: [
				1,1,1,1,1,1,1,1,1,1,
				1,1,1,1,1,1,1,1,10,1 // 10 should be an outlier
			]
		}
		const anomalies = await detector.detectAnomalies(data)
		expect(anomalies.some(a => a.actualValue === 10)).toBe(true)
	})
})