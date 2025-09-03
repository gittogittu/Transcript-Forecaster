import { AnomalyDetectionService } from '../anomaly-detection-service'

describe('AnomalyDetectionService', () => {
  it('should create service instance', () => {
    const service = new AnomalyDetectionService()
    expect(service).toBeDefined()
  })

  it('should get configuration', () => {
    const service = new AnomalyDetectionService()
    const config = service.getConfiguration()
    expect(config).toHaveProperty('statistical')
    expect(config).toHaveProperty('isolationForest')
    expect(config).toHaveProperty('realTimeMonitor')
  })

  it('should get monitoring status', () => {
    const service = new AnomalyDetectionService()
    const status = service.getMonitoringStatus()
    expect(status).toHaveProperty('isMonitoring')
    expect(status).toHaveProperty('clientsMonitored')
    expect(status).toHaveProperty('totalDataPoints')
    expect(status).toHaveProperty('alertsGenerated')
  })
})