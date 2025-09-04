import { AlertManager } from '../alert-manager'
import { PerformanceAlert } from '../types'

describe('AlertManager', () => {
  let alertManager: AlertManager

  beforeEach(() => {
    alertManager = new AlertManager()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('processAlert', () => {
    it('should process and store alerts', async () => {
      const mockAlert: PerformanceAlert = {
        id: 'test-alert-1',
        type: 'accuracy_degradation',
        severity: 'high',
        modelId: 'test-model',
        message: 'Model accuracy has degraded significantly',
        threshold: 0.8,
        currentValue: 0.7,
        timestamp: new Date(),
        isResolved: false
      }

      // Mock console.log to capture processing messages
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await alertManager.processAlert(mockAlert)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Alert processed: accuracy_degradation')
      )

      consoleSpy.mockRestore()
    })

    it('should skip alerts in cooldown period', async () => {
      const mockAlert: PerformanceAlert = {
        id: 'test-alert-2',
        type: 'latency_spike',
        severity: 'medium',
        modelId: 'test-model',
        message: 'Latency spike detected',
        threshold: 1000,
        currentValue: 1500,
        timestamp: new Date(),
        isResolved: false
      }

      // Mock console.log to capture cooldown messages
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      // Process alert twice - first one should set cooldown
      await alertManager.processAlert(mockAlert)
      
      // Manually set cooldown to simulate the scenario
      const alertManagerAny = alertManager as any
      alertManagerAny.cooldownTracker.set(`${mockAlert.modelId}_${mockAlert.type}`, new Date())
      
      await alertManager.processAlert({
        ...mockAlert,
        id: 'test-alert-2-duplicate',
        timestamp: new Date()
      })

      // Second alert should be in cooldown
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('is in cooldown period')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('createAlertRule', () => {
    it('should create a new alert rule', async () => {
      const ruleData = {
        name: 'Test High Latency Rule',
        condition: 'latency_spike' as const,
        threshold: 2000,
        severity: 'high' as const,
        enabled: true,
        cooldownPeriod: 30,
        notificationChannels: ['default_email']
      }

      const rule = await alertManager.createAlertRule(ruleData)

      expect(rule).toHaveProperty('id')
      expect(rule.name).toBe(ruleData.name)
      expect(rule.condition).toBe(ruleData.condition)
      expect(rule.threshold).toBe(ruleData.threshold)
      expect(rule.severity).toBe(ruleData.severity)
      expect(rule.enabled).toBe(ruleData.enabled)
      expect(rule.cooldownPeriod).toBe(ruleData.cooldownPeriod)
      expect(rule.notificationChannels).toEqual(ruleData.notificationChannels)
    })
  })

  describe('updateAlertRule', () => {
    it('should update an existing alert rule', async () => {
      const ruleData = {
        name: 'Test Rule',
        condition: 'accuracy_degradation' as const,
        threshold: 0.8,
        severity: 'medium' as const,
        enabled: true,
        cooldownPeriod: 15,
        notificationChannels: ['default_email']
      }

      const rule = await alertManager.createAlertRule(ruleData)
      
      const updates = {
        threshold: 0.75,
        severity: 'high' as const,
        enabled: false
      }

      const updatedRule = await alertManager.updateAlertRule(rule.id, updates)

      expect(updatedRule).not.toBeNull()
      expect(updatedRule!.threshold).toBe(updates.threshold)
      expect(updatedRule!.severity).toBe(updates.severity)
      expect(updatedRule!.enabled).toBe(updates.enabled)
      expect(updatedRule!.name).toBe(ruleData.name) // Unchanged
    })

    it('should return null for non-existent rule', async () => {
      const result = await alertManager.updateAlertRule('non-existent-id', { threshold: 100 })
      expect(result).toBeNull()
    })
  })

  describe('deleteAlertRule', () => {
    it('should delete an alert rule', async () => {
      const ruleData = {
        name: 'Test Rule to Delete',
        condition: 'resource_exhaustion' as const,
        threshold: 90,
        severity: 'critical' as const,
        enabled: true,
        cooldownPeriod: 10,
        notificationChannels: ['default_email']
      }

      const rule = await alertManager.createAlertRule(ruleData)
      const deleted = await alertManager.deleteAlertRule(rule.id)

      expect(deleted).toBe(true)

      // Verify rule is deleted
      const updatedRule = await alertManager.updateAlertRule(rule.id, { threshold: 95 })
      expect(updatedRule).toBeNull()
    })

    it('should return false for non-existent rule', async () => {
      const deleted = await alertManager.deleteAlertRule('non-existent-id')
      expect(deleted).toBe(false)
    })
  })

  describe('getAlertRules', () => {
    it('should return all alert rules including defaults', async () => {
      const rules = await alertManager.getAlertRules()

      expect(Array.isArray(rules)).toBe(true)
      expect(rules.length).toBeGreaterThan(0) // Should have default rules

      // Check that default rules exist
      const defaultRuleNames = [
        'High Accuracy Degradation',
        'Critical Accuracy Loss',
        'High Latency',
        'Resource Exhaustion',
        'High Error Rate'
      ]

      defaultRuleNames.forEach(name => {
        expect(rules.some(rule => rule.name === name)).toBe(true)
      })
    })
  })

  describe('createNotificationChannel', () => {
    it('should create a new notification channel', async () => {
      const channelData = {
        type: 'webhook' as const,
        config: {
          url: 'https://example.com/webhook',
          headers: { 'Authorization': 'Bearer token' }
        },
        enabled: true
      }

      const channel = await alertManager.createNotificationChannel(channelData)

      expect(channel).toHaveProperty('id')
      expect(channel.type).toBe(channelData.type)
      expect(channel.config).toEqual(channelData.config)
      expect(channel.enabled).toBe(channelData.enabled)
    })
  })

  describe('getNotificationChannels', () => {
    it('should return all notification channels including defaults', async () => {
      const channels = await alertManager.getNotificationChannels()

      expect(Array.isArray(channels)).toBe(true)
      expect(channels.length).toBeGreaterThan(0) // Should have default channels

      // Check for default channels
      expect(channels.some(channel => channel.type === 'email')).toBe(true)
      expect(channels.some(channel => channel.type === 'slack')).toBe(true)
    })
  })

  describe('getAlertHistory', () => {
    it('should return alert history with filters', async () => {
      // First create some test alerts
      const alerts: PerformanceAlert[] = [
        {
          id: 'history-alert-1',
          type: 'accuracy_degradation',
          severity: 'high',
          modelId: 'model-1',
          message: 'Test alert 1',
          threshold: 0.8,
          currentValue: 0.7,
          timestamp: new Date(Date.now() - 60000), // 1 minute ago
          isResolved: false
        },
        {
          id: 'history-alert-2',
          type: 'latency_spike',
          severity: 'medium',
          modelId: 'model-2',
          message: 'Test alert 2',
          threshold: 1000,
          currentValue: 1500,
          timestamp: new Date(Date.now() - 120000), // 2 minutes ago
          isResolved: true,
          resolvedAt: new Date()
        }
      ]

      for (const alert of alerts) {
        await alertManager.processAlert(alert)
      }

      // Test without filters
      const allAlerts = await alertManager.getAlertHistory()
      expect(allAlerts.length).toBeGreaterThanOrEqual(2)

      // Test with model filter
      const model1Alerts = await alertManager.getAlertHistory({ modelId: 'model-1' })
      expect(model1Alerts.every(alert => alert.modelId === 'model-1')).toBe(true)

      // Test with type filter
      const accuracyAlerts = await alertManager.getAlertHistory({ type: 'accuracy_degradation' })
      expect(accuracyAlerts.every(alert => alert.type === 'accuracy_degradation')).toBe(true)

      // Test with severity filter
      const highSeverityAlerts = await alertManager.getAlertHistory({ severity: 'high' })
      expect(highSeverityAlerts.every(alert => alert.severity === 'high')).toBe(true)

      // Test with time range filter
      const recentAlerts = await alertManager.getAlertHistory({
        timeRange: {
          start: new Date(Date.now() - 90000), // 1.5 minutes ago
          end: new Date()
        }
      })
      expect(recentAlerts.length).toBeGreaterThan(0)
    })

    it('should return alerts sorted by timestamp descending', async () => {
      const history = await alertManager.getAlertHistory()
      
      if (history.length > 1) {
        for (let i = 0; i < history.length - 1; i++) {
          expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(
            history[i + 1].timestamp.getTime()
          )
        }
      }
    })
  })

  describe('getAlertStatistics', () => {
    it('should return comprehensive alert statistics', async () => {
      // Create test alerts for statistics
      const testAlerts: PerformanceAlert[] = [
        {
          id: 'stats-alert-1',
          type: 'accuracy_degradation',
          severity: 'high',
          modelId: 'model-1',
          message: 'Test alert 1',
          threshold: 0.8,
          currentValue: 0.7,
          timestamp: new Date(Date.now() - 60000),
          isResolved: true,
          resolvedAt: new Date(Date.now() - 30000)
        },
        {
          id: 'stats-alert-2',
          type: 'latency_spike',
          severity: 'critical',
          modelId: 'model-1',
          message: 'Test alert 2',
          threshold: 1000,
          currentValue: 2000,
          timestamp: new Date(Date.now() - 120000),
          isResolved: false
        }
      ]

      for (const alert of testAlerts) {
        await alertManager.processAlert(alert)
      }

      const stats = await alertManager.getAlertStatistics()

      expect(stats).toHaveProperty('totalAlerts')
      expect(stats).toHaveProperty('alertsByType')
      expect(stats).toHaveProperty('alertsBySeverity')
      expect(stats).toHaveProperty('alertsByModel')
      expect(stats).toHaveProperty('resolutionRate')
      expect(stats).toHaveProperty('averageResolutionTime')

      expect(typeof stats.totalAlerts).toBe('number')
      expect(stats.totalAlerts).toBeGreaterThan(0)
      expect(typeof stats.alertsByType).toBe('object')
      expect(typeof stats.alertsBySeverity).toBe('object')
      expect(typeof stats.alertsByModel).toBe('object')
      expect(typeof stats.resolutionRate).toBe('number')
      expect(stats.resolutionRate).toBeGreaterThanOrEqual(0)
      expect(stats.resolutionRate).toBeLessThanOrEqual(100)
      expect(typeof stats.averageResolutionTime).toBe('number')
      expect(stats.averageResolutionTime).toBeGreaterThanOrEqual(0)
    })
  })
})