import { PerformanceAlert, PerformanceThresholds } from './types'

export interface AlertRule {
  id: string
  name: string
  condition: string
  threshold: number
  severity: PerformanceAlert['severity']
  enabled: boolean
  cooldownPeriod: number // minutes
  notificationChannels: string[]
}

export interface NotificationChannel {
  id: string
  type: 'email' | 'slack' | 'webhook' | 'sms'
  config: Record<string, any>
  enabled: boolean
}

export class AlertManager {
  private alertRules: Map<string, AlertRule> = new Map()
  private notificationChannels: Map<string, NotificationChannel> = new Map()
  private alertHistory: PerformanceAlert[] = []
  private cooldownTracker: Map<string, Date> = new Map()

  constructor() {
    this.initializeDefaultRules()
    this.initializeDefaultChannels()
  }

  async processAlert(alert: PerformanceAlert): Promise<void> {
    // Check if alert is in cooldown period
    if (this.isInCooldown(alert)) {
      return
    }

    // Store alert
    this.alertHistory.push(alert)

    // Find matching rules
    const matchingRules = this.findMatchingRules(alert)

    // Send notifications for each matching rule
    for (const rule of matchingRules) {
      if (rule.enabled) {
        await this.sendNotifications(alert, rule)
        this.setCooldown(alert, rule.cooldownPeriod)
      }
    }

    // Log alert
    console.log(`Alert processed: ${alert.type} - ${alert.message}`)
  }

  async createAlertRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    const newRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    this.alertRules.set(newRule.id, newRule)
    return newRule
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule | null> {
    const rule = this.alertRules.get(ruleId)
    if (!rule) return null

    const updatedRule = { ...rule, ...updates }
    this.alertRules.set(ruleId, updatedRule)
    return updatedRule
  }

  async deleteAlertRule(ruleId: string): Promise<boolean> {
    return this.alertRules.delete(ruleId)
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values())
  }

  async createNotificationChannel(channel: Omit<NotificationChannel, 'id'>): Promise<NotificationChannel> {
    const newChannel: NotificationChannel = {
      ...channel,
      id: `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    this.notificationChannels.set(newChannel.id, newChannel)
    return newChannel
  }

  async getNotificationChannels(): Promise<NotificationChannel[]> {
    return Array.from(this.notificationChannels.values())
  }

  async getAlertHistory(
    filters?: {
      modelId?: string
      type?: PerformanceAlert['type']
      severity?: PerformanceAlert['severity']
      timeRange?: { start: Date; end: Date }
    }
  ): Promise<PerformanceAlert[]> {
    let filtered = this.alertHistory

    if (filters) {
      if (filters.modelId) {
        filtered = filtered.filter(a => a.modelId === filters.modelId)
      }
      if (filters.type) {
        filtered = filtered.filter(a => a.type === filters.type)
      }
      if (filters.severity) {
        filtered = filtered.filter(a => a.severity === filters.severity)
      }
      if (filters.timeRange) {
        filtered = filtered.filter(a => 
          a.timestamp >= filters.timeRange!.start && 
          a.timestamp <= filters.timeRange!.end
        )
      }
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  async getAlertStatistics(): Promise<{
    totalAlerts: number
    alertsByType: Record<string, number>
    alertsBySeverity: Record<string, number>
    alertsByModel: Record<string, number>
    resolutionRate: number
    averageResolutionTime: number
  }> {
    const totalAlerts = this.alertHistory.length
    const resolvedAlerts = this.alertHistory.filter(a => a.isResolved)

    const alertsByType = this.alertHistory.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const alertsBySeverity = this.alertHistory.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const alertsByModel = this.alertHistory.reduce((acc, alert) => {
      acc[alert.modelId] = (acc[alert.modelId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const resolutionRate = totalAlerts > 0 ? (resolvedAlerts.length / totalAlerts) * 100 : 0

    const resolutionTimes = resolvedAlerts
      .filter(a => a.resolvedAt)
      .map(a => a.resolvedAt!.getTime() - a.timestamp.getTime())
    
    const averageResolutionTime = resolutionTimes.length > 0 
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
      : 0

    return {
      totalAlerts,
      alertsByType,
      alertsBySeverity,
      alertsByModel,
      resolutionRate,
      averageResolutionTime: averageResolutionTime / (1000 * 60) // Convert to minutes
    }
  }

  private initializeDefaultRules(): void {
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High Accuracy Degradation',
        condition: 'accuracy_degradation',
        threshold: 0.1,
        severity: 'high',
        enabled: true,
        cooldownPeriod: 30,
        notificationChannels: ['default_email']
      },
      {
        name: 'Critical Accuracy Loss',
        condition: 'accuracy_degradation',
        threshold: 0.2,
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 15,
        notificationChannels: ['default_email', 'default_slack']
      },
      {
        name: 'High Latency',
        condition: 'latency_spike',
        threshold: 2000, // 2 seconds
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 15,
        notificationChannels: ['default_email']
      },
      {
        name: 'Resource Exhaustion',
        condition: 'resource_exhaustion',
        threshold: 90, // 90% usage
        severity: 'high',
        enabled: true,
        cooldownPeriod: 20,
        notificationChannels: ['default_email']
      },
      {
        name: 'High Error Rate',
        condition: 'error_rate_high',
        threshold: 10, // 10% error rate
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 10,
        notificationChannels: ['default_email', 'default_slack']
      }
    ]

    defaultRules.forEach(rule => {
      const ruleWithId = {
        ...rule,
        id: `default_${rule.name.toLowerCase().replace(/\s+/g, '_')}`
      }
      this.alertRules.set(ruleWithId.id, ruleWithId)
    })
  }

  private initializeDefaultChannels(): void {
    const defaultChannels: Omit<NotificationChannel, 'id'>[] = [
      {
        type: 'email',
        config: {
          recipients: ['admin@company.com', 'ml-team@company.com'],
          subject: 'ML Model Performance Alert'
        },
        enabled: true
      },
      {
        type: 'slack',
        config: {
          webhook: process.env.SLACK_WEBHOOK_URL || '',
          channel: '#ml-alerts'
        },
        enabled: !!process.env.SLACK_WEBHOOK_URL
      }
    ]

    defaultChannels.forEach((channel, index) => {
      const channelWithId = {
        ...channel,
        id: `default_${channel.type}`
      }
      this.notificationChannels.set(channelWithId.id, channelWithId)
    })
  }

  private findMatchingRules(alert: PerformanceAlert): AlertRule[] {
    return Array.from(this.alertRules.values()).filter(rule => {
      // Match by alert type
      if (rule.condition !== alert.type) return false

      // Check if threshold is exceeded
      if (alert.currentValue < rule.threshold) return false

      // Check severity level (only trigger for equal or higher severity)
      const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 }
      if (severityLevels[alert.severity] < severityLevels[rule.severity]) return false

      return true
    })
  }

  private async sendNotifications(alert: PerformanceAlert, rule: AlertRule): Promise<void> {
    for (const channelId of rule.notificationChannels) {
      const channel = this.notificationChannels.get(channelId)
      if (!channel || !channel.enabled) continue

      try {
        await this.sendNotification(alert, channel)
      } catch (error) {
        console.error(`Failed to send notification via ${channel.type}:`, error)
      }
    }
  }

  private async sendNotification(alert: PerformanceAlert, channel: NotificationChannel): Promise<void> {
    const message = this.formatAlertMessage(alert)

    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(alert, channel, message)
        break
      case 'slack':
        await this.sendSlackNotification(alert, channel, message)
        break
      case 'webhook':
        await this.sendWebhookNotification(alert, channel, message)
        break
      case 'sms':
        await this.sendSMSNotification(alert, channel, message)
        break
      default:
        console.warn(`Unknown notification channel type: ${channel.type}`)
    }
  }

  private formatAlertMessage(alert: PerformanceAlert): string {
    return `
🚨 ML Model Performance Alert

Type: ${alert.type.replace('_', ' ').toUpperCase()}
Severity: ${alert.severity.toUpperCase()}
Model: ${alert.modelId}
Message: ${alert.message}
Threshold: ${alert.threshold}
Current Value: ${alert.currentValue}
Time: ${alert.timestamp.toISOString()}

Please investigate and take appropriate action.
    `.trim()
  }

  private async sendEmailNotification(
    alert: PerformanceAlert, 
    channel: NotificationChannel, 
    message: string
  ): Promise<void> {
    // Mock implementation - replace with actual email service
    console.log(`Email notification sent to ${channel.config.recipients.join(', ')}:`, message)
  }

  private async sendSlackNotification(
    alert: PerformanceAlert, 
    channel: NotificationChannel, 
    message: string
  ): Promise<void> {
    // Mock implementation - replace with actual Slack API call
    console.log(`Slack notification sent to ${channel.config.channel}:`, message)
  }

  private async sendWebhookNotification(
    alert: PerformanceAlert, 
    channel: NotificationChannel, 
    message: string
  ): Promise<void> {
    // Mock implementation - replace with actual webhook call
    console.log(`Webhook notification sent to ${channel.config.url}:`, message)
  }

  private async sendSMSNotification(
    alert: PerformanceAlert, 
    channel: NotificationChannel, 
    message: string
  ): Promise<void> {
    // Mock implementation - replace with actual SMS service
    console.log(`SMS notification sent to ${channel.config.phoneNumbers.join(', ')}:`, message)
  }

  private isInCooldown(alert: PerformanceAlert): boolean {
    const cooldownKey = `${alert.modelId}_${alert.type}`
    const lastAlert = this.cooldownTracker.get(cooldownKey)
    
    if (!lastAlert) return false

    const cooldownPeriod = 15 * 60 * 1000 // 15 minutes default
    const isInCooldown = Date.now() - lastAlert.getTime() < cooldownPeriod
    
    if (isInCooldown) {
      console.log(`Alert ${alert.id} is in cooldown period, skipping`)
    }
    
    return isInCooldown
  }

  private setCooldown(alert: PerformanceAlert, cooldownMinutes: number): void {
    const cooldownKey = `${alert.modelId}_${alert.type}`
    this.cooldownTracker.set(cooldownKey, new Date())
  }
}