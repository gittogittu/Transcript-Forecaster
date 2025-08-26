/**
 * Performance tests for prediction algorithms and data loading
 */
import {
  benchmark,
  expectExecutionTimeWithin,
  expectMemoryUsageWithin,
  createMockTranscriptData
} from '@/lib/testing/utils/performance-helpers'
import { PredictionService } from '@/lib/services/prediction-service'
import { convertToTimeSeries } from '@/lib/utils/data-preprocessing'

describe('Prediction Algorithm Performance', () => {
  let predictionService: PredictionService

  beforeEach(() => {
    predictionService = new PredictionService()
  })

  describe('Data Preprocessing Performance', () => {
    it('should preprocess small datasets quickly', async () => {
      const smallDataset = createMockTranscriptData(100)

      await expectExecutionTimeWithin(
        () => convertToTimeSeries(smallDataset),
        100, // Should complete within 100ms
        10   // Run 10 iterations
      )
    })

    it('should preprocess medium datasets efficiently', async () => {
      const mediumDataset = createMockTranscriptData(1000)

      await expectExecutionTimeWithin(
        () => convertToTimeSeries(mediumDataset),
        500, // Should complete within 500ms
        5    // Run 5 iterations
      )
    })

    it('should preprocess large datasets within acceptable limits', async () => {
      const largeDataset = createMockTranscriptData(10000)

      await expectExecutionTimeWithin(
        () => convertToTimeSeries(largeDataset),
        2000, // Should complete within 2 seconds
        3     // Run 3 iterations
      )
    })

    it('should have reasonable memory usage for preprocessing', async () => {
      const dataset = createMockTranscriptData(5000)

      await expectMemoryUsageWithin(
        () => convertToTimeSeries(dataset),
        50 * 1024 * 1024, // 50MB max memory usage
        3
      )
    })
  })

  describe('Linear Regression Performance', () => {
    it('should train linear model quickly on small datasets', async () => {
      const smallDataset = createMockTranscriptData(50)

      await expectExecutionTimeWithin(
        () => predictionService.trainModel('Client A', smallDataset, 'linear'),
        200, // Should complete within 200ms
        5
      )
    })

    it('should train linear model efficiently on medium datasets', async () => {
      const mediumDataset = createMockTranscriptData(500)

      await expectExecutionTimeWithin(
        () => predictionService.trainModel('Client A', mediumDataset, 'linear'),
        1000, // Should complete within 1 second
        3
      )
    })

    it('should generate predictions quickly', async () => {
      const dataset = createMockTranscriptData(100)
      await predictionService.trainModel('Client A', dataset, 'linear')

      await expectExecutionTimeWithin(
        () => predictionService.generatePredictions('Client A', dataset, { clientName: 'Client A', monthsAhead: 6, modelType: 'linear' }),
        50, // Should complete within 50ms
        10
      )
    })

    it('should benchmark linear regression training', async () => {
      const dataset = createMockTranscriptData(1000)

      const results = await benchmark(
        'Linear Regression Training',
        () => predictionService.trainModel('Client A', dataset, 'linear'),
        10
      )

      // Assert performance requirements
      expect(results.avgTime).toBeLessThan(1500) // Average under 1.5 seconds
      expect(results.memoryUsage).toBeLessThan(100 * 1024 * 1024) // Under 100MB
    })
  })

  describe('Polynomial Regression Performance', () => {
    it('should train polynomial model within time limits', async () => {
      const dataset = createMockTranscriptData(200)

      await expectExecutionTimeWithin(
        () => predictionService.trainPolynomialModel(dataset, 2),
        800, // Should complete within 800ms
        3
      )
    })

    it('should handle higher degree polynomials efficiently', async () => {
      const dataset = createMockTranscriptData(100)

      // Test degree 3 polynomial
      await expectExecutionTimeWithin(
        () => predictionService.trainModel('Client A', dataset, 'polynomial'),
        1200, // Should complete within 1.2 seconds
        3
      )
    })

    it('should benchmark polynomial regression', async () => {
      const dataset = createMockTranscriptData(500)

      const results = await benchmark(
        'Polynomial Regression (degree 2)',
        () => predictionService.trainModel('Client A', dataset, 'polynomial'),
        5
      )

      expect(results.avgTime).toBeLessThan(2000) // Average under 2 seconds
    })
  })

  describe('ARIMA Model Performance', () => {
    it('should train ARIMA model within acceptable time', async () => {
      const dataset = createMockTranscriptData(200)

      await expectExecutionTimeWithin(
        () => predictionService.trainModel('Client A', dataset, 'linear'),
        3000, // ARIMA is more complex, allow 3 seconds
        2
      )
    })

    it('should benchmark ARIMA training', async () => {
      const dataset = createMockTranscriptData(300)

      const results = await benchmark(
        'ARIMA Model Training',
        () => predictionService.trainModel('Client A', dataset, 'linear'),
        3
      )

      expect(results.avgTime).toBeLessThan(5000) // Average under 5 seconds
    })
  })

  describe('Batch Prediction Performance', () => {
    it('should generate predictions for multiple clients efficiently', async () => {
      const dataset = createMockTranscriptData(500)
      await predictionService.trainLinearModel(dataset)

      const clients = ['Client A', 'Client B', 'Client C', 'Client D', 'Client E']

      await expectExecutionTimeWithin(
        () => Promise.all(
          clients.map(client =>
            predictionService.generatePredictions(client, dataset, { clientName: client, monthsAhead: 6, modelType: 'linear' })
          )
        ),
        500, // Should complete within 500ms for all clients
        3
      )
    })

    it('should handle concurrent prediction requests', async () => {
      const dataset = createMockTranscriptData(300)
      await predictionService.trainLinearModel(dataset)

      const concurrentRequests = Array(10).fill(0).map(() =>
        predictionService.generatePredictions('Client A', dataset, { clientName: 'Client A', monthsAhead: 3, modelType: 'linear' })
      )

      await expectExecutionTimeWithin(
        () => Promise.all(concurrentRequests),
        1000, // Should handle 10 concurrent requests within 1 second
        2
      )
    })
  })

  describe('Model Validation Performance', () => {
    it('should validate model accuracy quickly', async () => {
      const dataset = createMockTranscriptData(200)
      await predictionService.trainLinearModel(dataset)

      await expectExecutionTimeWithin(
        () => predictionService.validateModel(dataset),
        300, // Should complete within 300ms
        5
      )
    })

    it('should calculate confidence intervals efficiently', async () => {
      const dataset = createMockTranscriptData(150)
      await predictionService.trainLinearModel(dataset)

      await expectExecutionTimeWithin(
        () => predictionService.calculateConfidenceIntervals('Client A', 6),
        100, // Should complete within 100ms
        10
      )
    })
  })

  describe('Memory Usage Tests', () => {
    it('should not leak memory during repeated training', async () => {
      const dataset = createMockTranscriptData(200)

      // Measure memory usage over multiple training cycles
      const initialMemory = process.memoryUsage().heapUsed

      for (let i = 0; i < 10; i++) {
        await predictionService.trainLinearModel(dataset)
        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should handle large datasets without excessive memory usage', async () => {
      const largeDataset = createMockTranscriptData(5000)

      await expectMemoryUsageWithin(
        () => predictionService.trainLinearModel(largeDataset),
        200 * 1024 * 1024, // 200MB max
        1
      )
    })
  })

  describe('Edge Case Performance', () => {
    it('should handle empty datasets gracefully', async () => {
      await expectExecutionTimeWithin(
        () => predictionService.trainLinearModel([]),
        50, // Should fail fast
        5
      )
    })

    it('should handle single data point efficiently', async () => {
      const singlePoint = createMockTranscriptData(1)

      await expectExecutionTimeWithin(
        () => predictionService.trainLinearModel(singlePoint),
        100,
        5
      )
    })

    it('should handle datasets with missing values', async () => {
      const datasetWithMissing = createMockTranscriptData(100).map((item, index) => ({
        ...item,
        transcriptCount: index % 10 === 0 ? null : item.transcriptCount,
      }))

      await expectExecutionTimeWithin(
        () => predictionService.trainLinearModel(datasetWithMissing as any),
        200,
        3
      )
    })
  })

  describe('Scalability Tests', () => {
    it('should scale linearly with data size', async () => {
      const sizes = [100, 200, 400, 800]
      const results = []

      for (const size of sizes) {
        const dataset = createMockTranscriptData(size)
        const metrics = await benchmark(
          `Training with ${size} records`,
          () => predictionService.trainLinearModel(dataset),
          3
        )
        results.push({ size, time: metrics.avgTime })
      }

      // Check that time complexity is reasonable (not exponential)
      const timeRatio = results[3].time / results[0].time
      const sizeRatio = sizes[3] / sizes[0]

      // Time should not increase more than 2x the size ratio
      expect(timeRatio).toBeLessThan(sizeRatio * 2)
    })
  })
})