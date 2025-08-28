import { alertSystem } from '../alert-system'
import { AlertConfig, Alert, PerformanceMetrics } from '@/types/monitoring'

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
  }
})

describe('AlertSystem', () => {
  beforeEach(() => {
    // Clear any existing alerts for clean tests
    const activeAlerts = alertSystem.getActiveAlerts()
    activeAlerts.forEach(alert => {
      alertSystem.resolveAlert(alert.id)
    })
    
    // Clear all existing configs to start fresh
    const configs = alertSystem.getAlertConfigs()
    configs.forEach(config => {
      alertSystem.removeAlertConfig(config.id)
    })
  })

  describe('setAlertConfig', () => {
    it('should add new alert configuration', () => {
      const config: AlertConfig = {
        id: 'test-config',
        name: 'Test Alert',
        metric: 'errorCount',
        threshold: 5,
        operator: 'gt',
        enabled: true,
        severity: 'high',
      }

      alertSystem.setAlertConfig(config)
      
      const configs = alertSystem.getAlertConfigs()
      const addedConfig = configs.find(c => c.id === 'test-config')
      
      expect(addedConfig).toBeDefined()
      expect(addedConfig?.name).toBe('Test Alert')
      expect(addedConfig?.threshold).toBe(5)
    })

    it('should update existing alert configuration', () => {
      const config: AlertConfig = {
        id: 'update-test',
        name: 'Original Name',
        metric: 'errorCount',
        threshold: 5,
        operator: 'gt',
        enabled: true,
        severity: 'medium',
      }

      alertSystem.setAlertConfig(config)
      
      // Update the config
      const updatedConfig = { ...config, name: 'Updated Name', threshold: 10 }
      alertSystem.setAlertConfig(updatedConfig)
      
      const configs = alertSystem.getAlertConfigs()
      const foundConfig = configs.find(c => c.id === 'update-test')
      
      expect(foundConfig?.name).toBe('Updated Name')
      expect(foundConfig?.threshold).toBe(10)
    })
  })

  describe('removeAlertConfig', () => {
    it('should remove alert configuration', () => {
      const config: AlertConfig = {
        id: 'remove-test',
        name: 'To Be Removed',
        metric: 'errorCount',
        threshold: 5,
        operator: 'gt',
        enabled: true,
        severity: 'low',
      }

      alertSystem.setAlertConfig(config)
      
      let configs = alertSystem.getAlertConfigs()
      expect(configs.find(c => c.id === 'remove-test')).toBeDefined()
      
      alertSystem.removeAlertConfig('remove-test')
      
      configs = alertSystem.getAlertConfigs()
      expect(configs.find(c => c.id === 'remove-test')).toBeUndefined()
    })
  })

  describe('checkAlerts', () => {
    it('should trigger alert when threshold is exceeded', () => {
      const config: AlertConfig = {
        id: 'threshold-test',
        name: 'High Error Count',
        metric: 'errorCount',
        threshold: 5,
        operator: 'gt',
        enabled: true,
        severity: 'high',
      }

      alertSystem.setAlertConfig(config)

      const metrics: PerformanceMetrics = {
        id: 'test-metrics',
        timestamp: new Date(),
        queriesPerSecond: 2.5,
        modelRuntime: 1000,
        dataSyncLatency: 100,
        errorCount: 10, // Exceeds threshold of 5
        activeUsers: 3,
        memoryUsage: 60,
        cpuUsage: 45,
      }

      const newAlerts = alertSystem.checkAlerts(metrics)
      
      expect(newAlerts.length).toBe(1)
      expect(newAlerts[0].configId).toBe('threshold-test')
      expect(newAlerts[0].severity).toBe('high')
      expect(newAlerts[0].resolved).toBe(false)
    })

    it('should not trigger alert when threshold is not exceeded', () => {
      const config: AlertConfig = {
        id: 'no-trigger-test',
        name: 'Low Error Count',
        metric: 'errorCount',
        threshold: 10,
        operator: 'gt',
        enabled: true,
        severity: 'medium',
      }

      alertSystem.setAlertConfig(config)

      const metrics: PerformanceMetrics = {
        id: 'test-metrics',
        timestamp: new Date(),
        queriesPerSecond: 2.5,
        modelRuntime: 1000,
        dataSyncLatency: 100,
        errorCount: 5, // Below threshold of 10
        activeUsers: 3,
        memoryUsage: 60,
        cpuUsage: 45,
      }

      const newAlerts = alertSystem.checkAlerts(metrics)
      
      expect(newAlerts.length).toBe(0)
    })

    it('should not trigger alert when config is disabled', () => {
      const config: AlertConfig = {
        id: 'disabled-test',
        name: 'Disabled Alert',
        metric: 'errorCount',
        threshold: 5,
        operator: 'gt',
        enabled: false, // Disabled
        severity: 'high',
      }

      alertSystem.setAlertConfig(config)

      const metrics: PerformanceMetrics = {
        id: 'test-metrics',
        timestamp: new Date(),
        queriesPerSecond: 2.5,
        modelRuntime: 1000,
        dataSyncLatency: 100,
        errorCount: 10, // Exceeds threshold but config is disabled
        activeUsers: 3,
        memoryUsage: 60,
        cpuUsage: 45,
      }

      const newAlerts = alertSystem.checkAlerts(metrics)
      
      expect(newAlerts.length).toBe(0)
    })

    it('should handle different operators correctly', () => {
      // Test 'lt' operator
      const ltConfig: AlertConfig = {
        id: 'lt-test',
        name: 'Low QPS Alert',
        metric: 'queriesPerSecond',
        threshold: 1.0,
        operator: 'lt',
        enabled: true,
        severity: 'warning',
      }

      alertSystem.setAlertConfig(ltConfig)

      const metrics: PerformanceMetrics = {
        id: 'test-metrics',
        timestamp: new Date(),
        queriesPerSecond: 0.5, // Below threshold of 1.0
        modelRuntime: 1000,
        dataSyncLatency: 100,
        errorCount: 0,
        activeUsers: 3,
        memoryUsage: 60,
        cpuUsage: 45,
      }

      const newAlerts = alertSystem.checkAlerts(metrics)
      
      expect(newAlerts.length).toBe(1)
      expect(newAlerts[0].configId).toBe('lt-test')
    })

    it('should auto-resolve alerts when condition is no longer met', () => {
      const config: AlertConfig = {
        id: 'auto-resolve-test',
        name: 'Auto Resolve Test',
        metric: 'errorCount',
        threshold: 5,
        operator: 'gt',
        enabled: true,
        severity: 'medium',
      }

      alertSystem.setAlertConfig(config)

      // First, trigger an alert
      const highErrorMetrics: PerformanceMetrics = {
        id: 'test-metrics-1',
        timestamp: new Date(),
        queriesPerSecond: 2.5,
        modelRuntime: 1000,
        dataSyncLatency: 100,
        errorCount: 10, // Exceeds threshold
        activeUsers: 3,
        memoryUsage: 60,
        cpuUsage: 45,
      }

      alertSystem.checkAlerts(highErrorMetrics)
      
      let activeAlerts = alertSystem.getActiveAlerts()
      expect(activeAlerts.length).toBe(1)

      // Then, provide metrics that don't trigger the alert
      const lowErrorMetrics: PerformanceMetrics = {
        ...highErrorMetrics,
        errorCount: 2, // Below threshold
      }

      alertSystem.checkAlerts(lowErrorMetrics)
      
      activeAlerts = alertSystem.getActiveAlerts()
      expect(activeAlerts.length).toBe(0) // Should be auto-resolved
    })
  })

  describe('resolveAlert', () => {
    it('should resolve an active alert', () => {
      const config: AlertConfig = {
        id: 'resolve-test',
        name: 'Resolve Test Alert',
        metric: 'errorCount',
        threshold: 5,
        operator: 'gt',
        enabled: true,
        severity: 'high',
      }

      alertSystem.setAlertConfig(config)

      const metrics: PerformanceMetrics = {
        id: 'test-metrics',
        timestamp: new Date(),
        queriesPerSecond: 2.5,
        modelRuntime: 1000,
        dataSyncLatency: 100,
        errorCount: 10,
        activeUsers: 3,
        memoryUsage: 60,
        cpuUsage: 45,
      }

      const newAlerts = alertSystem.checkAlerts(metrics)
      const alertId = newAlerts[0].id

      let activeAlerts = alertSystem.getActiveAlerts()
      expect(activeAlerts.length).toBe(1)

      alertSystem.resolveAlert(alertId)

      activeAlerts = alertSystem.getActiveAlerts()
      expect(activeAlerts.length).toBe(0)

      const allAlerts = alertSystem.getAllAlerts()
      const resolvedAlert = allAlerts.find(a => a.id === alertId)
      expect(resolvedAlert?.resolved).toBe(true)
      expect(resolvedAlert?.resolvedAt).toBeInstanceOf(Date)
    })
  })

  describe('getActiveAlerts', () => {
    it('should return only unresolved alerts', () => {
      const config: AlertConfig = {
        id: 'active-test',
        name: 'Active Test Alert',
        metric: 'errorCount',
        threshold: 5,
        operator: 'gt',
        enabled: true,
        severity: 'medium',
      }

      alertSystem.setAlertConfig(config)

      const metrics: PerformanceMetrics = {
        id: 'test-metrics',
        timestamp: new Date(),
        queriesPerSecond: 2.5,
        modelRuntime: 1000,
        dataSyncLatency: 100,
        errorCount: 10,
        activeUsers: 3,
        memoryUsage: 60,
        cpuUsage: 45,
      }

      const newAlerts = alertSystem.checkAlerts(metrics)
      const alertId = newAlerts[0].id

      let activeAlerts = alertSystem.getActiveAlerts()
      expect(activeAlerts.length).toBe(1)
      expect(activeAlerts[0].resolved).toBe(false)

      alertSystem.resolveAlert(alertId)

      activeAlerts = alertSystem.getActiveAlerts()
      expect(activeAlerts.length).toBe(0)
    })
  })

  describe('getAllAlerts', () => {
    it('should return all alerts including resolved ones', () => {
      const config: AlertConfig = {
        id: 'all-test',
        name: 'All Test Alert',
        metric: 'errorCount',
        threshold: 5,
        operator: 'gt',
        enabled: true,
        severity: 'low',
      }

      alertSystem.setAlertConfig(config)

      const metrics: PerformanceMetrics = {
        id: 'test-metrics',
        timestamp: new Date(),
        queriesPerSecond: 2.5,
        modelRuntime: 1000,
        dataSyncLatency: 100,
        errorCount: 10,
        activeUsers: 3,
        memoryUsage: 60,
        cpuUsage: 45,
      }

      const newAlerts = alertSystem.checkAlerts(metrics)
      const alertId = newAlerts[0].id

      let allAlerts = alertSystem.getAllAlerts()
      expect(allAlerts.length).toBe(1)

      alertSystem.resolveAlert(alertId)

      allAlerts = alertSystem.getAllAlerts()
      expect(allAlerts.length).toBe(1) // Still includes resolved alert
      expect(allAlerts[0].resolved).toBe(true)
    })
  })

  describe('default configurations', () => {
    it('should start with no configurations after cleanup', () => {
      const configs = alertSystem.getAlertConfigs()
      expect(configs.length).toBe(0)
    })
    
    it('should be able to add default configurations', () => {
      const defaultConfig: AlertConfig = {
        id: 'high-error-rate',
        name: 'High Error Rate',
        metric: 'errorCount',
        threshold: 10,
        operator: 'gt',
        enabled: true,
        severity: 'high',
      }
      
      alertSystem.setAlertConfig(defaultConfig)
      
      const configs = alertSystem.getAlertConfigs()
      expect(configs.length).toBe(1)
      
      const errorRateConfig = configs.find(c => c.id === 'high-error-rate')
      expect(errorRateConfig).toBeDefined()
      expect(errorRateConfig?.metric).toBe('errorCount')
    })
  })
})