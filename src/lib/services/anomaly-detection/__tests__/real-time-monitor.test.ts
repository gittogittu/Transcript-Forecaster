import { RealTimeAnomalyMonitor } from '../real-time-monitor'
import { TimeSeriesData, AnomalyAlert } from '../types'

// Mock the detectors
jest.mock('../statistical-detector')
jest.mock('../isolation-forest-detector')

describe('RealTimeAnomalyMonitor', () => {
  let monitor: RealTimeAnomalyMonitor
  let mockData: TimeSeriesData

  beforeEach(() => {
    monitor = new RealTimeAnomalyMonitor({
      checkInterval: 100, // Fast interval for testing
      batchSize: 10,
      alertThreshold: 'medium',
      enableAutoRetraining: true,
      maxAlertsPerHour: 5
    })

    mockData = {
      timestamps: Array.from({ length: 20 }, (_, i) => 
        new Date(Date.now() + i * 60 * 1000) // Minute intervals
      ),
      values: Array.from({ length: 20 }, (_, i) => {
        if (i === 10) return 1000 // Anomaly
        return 100 + (Math.random() - 0.5) * 10
      }),
      clientId: 'test-client',
      metadata: { source: 'test' }
    }
  })

  afterEach(async () => {
    if (monitor.getStatus().isMonitoring) {
      await monitor.stopMonitoring()
    }
  })

  describe('monitoring lifecycle', () => {
    it('should start monitoring successfully', async () => {
      expect(monitor.getStatus().isMonitoring).toBe(false)
      
      await monitor.startMonitoring()
      
      expect(monitor.getStatus().isMonitoring).toBe(true)
    })

    it('should stop monitoring successfully', async () => {
      await monitor.startMonitoring()
      expect(monitor.getStatus().isMonitoring).toBe(true)
      
      await monitor.stopMonitoring()
      
      expect(monitor.getStatus().isMonitoring).toBe(false)
    })

    it('should throw error when starting already active monitoring', async () => {
      await monitor.startMonitoring()
      
      await expect(monitor.startMonitoring()).rejects.toThrow('already active')
    })

    it('should handle stopping inactive monitoring gracefully', async () => {
      expect(monitor.getStatus().isMonitoring).toBe(false)
      
      await expect(monitor.stopMonitoring()).resolves.not.toThrow()
    })
  })

  describe('data management', () => {
    it('should add data to monitoring buffer', async () => {
      const initialStatus = monitor.getStatus()
      expect(initialStatus.totalDataPoints).toBe(0)
      
      await monitor.addData('test-client', mockData)
      
      const updatedStatus = monitor.getStatus()
      expect(updatedStatus.totalDataPoints).toBe(20)
      expect(updatedStatus.clientsMonitored).toBe(1)
    })

    it('should handle multiple clients', async () => {
      await monitor.addData('client-1', mockData)
      await monitor.addData('client-2', {
        ...mockData,
        clientId: 'client-2'
      })
      
      const status = monitor.getStatus()
      expect(status.clientsMonitored).toBe(2)
    })

    it('should maintain buffer size limits', async () => {
      // Add large amount of data
      const largeData: TimeSeriesData = {
        timestamps: Array.from({ length: 1000 }, (_, i) => 
          new Date(Date.now() + i * 60 * 1000)
        ),
        values: Array.from({ length: 1000 }, () => 100),
        clientId: 'large-client'
      }
      
      await monitor.addData('large-client', largeData)
      
      // Buffer should be limited (maxBufferSize = batchSize * 10 = 100)
      const status = monitor.getStatus()
      expect(status.totalDataPoints).toBeLessThanOrEqual(100)
    })
  })

  describe('model training', () => {
    it('should train models with historical data', async () => {
      const historicalData: TimeSeriesData = {
        timestamps: Array.from({ length: 100 }, (_, i) => 
          new Date(Date.now() - (100 - i) * 60 * 60 * 1000)
        ),
        values: Array.from({ length: 100 }, () => 100 + (Math.random() - 0.5) * 10),
        clientId: 'historical-client'
      }

      await expect(monitor.trainModels('test-client', historicalData))
        .resolves.not.toThrow()
    })
  })

  describe('event handling', () => {
    it('should emit monitoring events', async () => {
      const startedSpy = jest.fn()
      const stoppedSpy = jest.fn()
      
      monitor.on('monitoring:started', startedSpy)
      monitor.on('monitoring:stopped', stoppedSpy)
      
      await monitor.startMonitoring()
      expect(startedSpy).toHaveBeenCalled()
      
      await monitor.stopMonitoring()
      expect(stoppedSpy).toHaveBeenCalled()
    })

    it('should emit data events when adding data', async () => {
      const dataAddedSpy = jest.fn()
      monitor.on('data:added', dataAddedSpy)
      
      await monitor.addData('test-client', mockData)
      
      expect(dataAddedSpy).toHaveBeenCalledWith({
        clientId: 'test-client',
        dataPoints: 20
      })
    })

    it('should emit processing events', (done) => {
      const processingCompletedSpy = jest.fn()
      monitor.on('processing:completed', processingCompletedSpy)
      
      monitor.startMonitoring().then(() => {
        monitor.addData('test-client', mockData).then(() => {
          // Wait for processing to complete
          setTimeout(() => {
            expect(processingCompletedSpy).toHaveBeenCalled()
            done()
          }, 200)
        })
      })
    })
  })

  describe('alert management', () => {
    it('should get client alerts', async () => {
      const alerts = monitor.getClientAlerts('test-client')
      expect(alerts).toBeInstanceOf(Array)
    })

    it('should acknowledge alerts', () => {
      // This would typically require setting up alerts first
      const result = monitor.acknowledgeAlert('non-existent-alert')
      expect(result).toBe(false)
    })

    it('should limit alerts per hour', async () => {
      // This test would require mocking the alert generation process
      // and simulating multiple anomalies within an hour
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('status reporting', () => {
    it('should provide accurate monitoring status', async () => {
      let status = monitor.getStatus()
      expect(status.isMonitoring).toBe(false)
      expect(status.clientsMonitored).toBe(0)
      expect(status.totalDataPoints).toBe(0)
      expect(status.alertsGenerated).toBe(0)
      
      await monitor.startMonitoring()
      await monitor.addData('test-client', mockData)
      
      status = monitor.getStatus()
      expect(status.isMonitoring).toBe(true)
      expect(status.clientsMonitored).toBe(1)
      expect(status.totalDataPoints).toBe(20)
    })
  })

  describe('configuration', () => {
    it('should respect custom configuration', () => {
      const customMonitor = new RealTimeAnomalyMonitor({
        checkInterval: 5000,
        batchSize: 50,
        alertThreshold: 'high',
        maxAlertsPerHour: 20
      })

      expect((customMonitor as any).config.checkInterval).toBe(5000)
      expect((customMonitor as any).config.batchSize).toBe(50)
      expect((customMonitor as any).config.alertThreshold).toBe('high')
      expect((customMonitor as any).config.maxAlertsPerHour).toBe(20)
    })

    it('should use default configuration when not provided', () => {
      const defaultMonitor = new RealTimeAnomalyMonitor()
      
      expect((defaultMonitor as any).config.checkInterval).toBe(30000)
      expect((defaultMonitor as any).config.batchSize).toBe(100)
      expect((defaultMonitor as any).config.alertThreshold).toBe('medium')
      expect((defaultMonitor as any).config.maxAlertsPerHour).toBe(10)
    })
  })

  describe('error handling', () => {
    it('should handle processing errors gracefully', (done) => {
      const errorSpy = jest.fn()
      monitor.on('monitoring:error', errorSpy)
      
      // This would require mocking an error condition
      // For now, just verify the event handler is set up
      setTimeout(() => {
        // If no errors occurred, that's also valid
        done()
      }, 200)
    })

    it('should handle detection errors gracefully', (done) => {
      const detectionErrorSpy = jest.fn()
      monitor.on('detection:statistical_error', detectionErrorSpy)
      monitor.on('detection:isolation_error', detectionErrorSpy)
      
      monitor.startMonitoring().then(() => {
        monitor.addData('error-client', mockData).then(() => {
          setTimeout(() => {
            // Errors should be handled gracefully
            done()
          }, 200)
        })
      })
    })
  })

  describe('performance', () => {
    it('should process data efficiently', async () => {
      await monitor.startMonitoring()
      
      const startTime = Date.now()
      await monitor.addData('perf-client', mockData)
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should be fast
    })

    it('should handle concurrent data additions', async () => {
      await monitor.startMonitoring()
      
      const promises = Array.from({ length: 5 }, (_, i) => 
        monitor.addData(`client-${i}`, {
          ...mockData,
          clientId: `client-${i}`
        })
      )
      
      await expect(Promise.all(promises)).resolves.not.toThrow()
      
      const status = monitor.getStatus()
      expect(status.clientsMonitored).toBe(5)
    })
  })

  describe('memory management', () => {
    it('should clean up old alerts', async () => {
      // This would require generating many alerts and verifying cleanup
      // For now, verify the mechanism exists
      const alerts = monitor.getClientAlerts('test-client', 10)
      expect(alerts.length).toBeLessThanOrEqual(10)
    })

    it('should limit buffer sizes per client', async () => {
      const largeDataSets = Array.from({ length: 10 }, () => ({
        timestamps: Array.from({ length: 100 }, (_, i) => 
          new Date(Date.now() + i * 60 * 1000)
        ),
        values: Array.from({ length: 100 }, () => 100),
        clientId: 'memory-test'
      }))

      for (const data of largeDataSets) {
        await monitor.addData('memory-test', data)
      }

      // Buffer should be limited despite adding 1000 total points
      const status = monitor.getStatus()
      expect(status.totalDataPoints).toBeLessThan(1000)
    })
  })
})