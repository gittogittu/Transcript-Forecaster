import { AlertConfig, Alert, PerformanceMetrics } from '@/types/monitoring'
import { metricsCollector } from './metrics-collector'

class AlertSystem {
  private alerts: Alert[] = []
  private configs: AlertConfig[] = []
  private readonly maxAlertHistory = 1000

  // Default alert configurations
  private defaultConfigs: AlertConfig[] = [
    {
      id: 'high-error-rate',
      name: 'High Error Rate',
      metric: 'errorCount',
      threshold: 10,
      operator: 'gt',
      enabled: true,
      severity: 'high',
    },
    {
      id: 'slow-queries',
      name: 'Slow Query Performance',
      metric: 'queriesPerSecond',
      threshold: 0.5,
      operator: 'lt',
      enabled: true,
      severity: 'medium',
    },
    {
      id: 'high-memory-usage',
      name: 'High Memory Usage',
      metric: 'memoryUsage',
      threshold: 85,
      operator: 'gt',
      enabled: true,
      severity: 'high',
    },
    {
      id: 'high-cpu-usage',
      name: 'High CPU Usage',
      metric: 'cpuUsage',
      threshold: 80,
      operator: 'gt',
      enabled: true,
      severity: 'medium',
    },
    {
      id: 'slow-ml-models',
      name: 'Slow ML Model Execution',
      metric: 'modelRuntime',
      threshold: 5000,
      operator: 'gt',
      enabled: true,
      severity: 'medium',
    },
  ]

  constructor() {
    this.configs = [...this.defaultConfigs]
    this.startMonitoring()
  }

  // Add or update alert configuration
  setAlertConfig(config: AlertConfig): void {
    const existingIndex = this.configs.findIndex(c => c.id === config.id)
    if (existingIndex >= 0) {
      this.configs[existingIndex] = config
    } else {
      this.configs.push(config)
    }
  }

  // Remove alert configuration
  removeAlertConfig(configId: string): void {
    this.configs = this.configs.filter(c => c.id !== configId)
  }

  // Get all alert configurations
  getAlertConfigs(): AlertConfig[] {
    return [...this.configs]
  }

  // Get active alerts
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  // Get all alerts (including resolved)
  getAllAlerts(): Alert[] {
    return [...this.alerts]
  }

  // Resolve an alert
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = new Date()
    }
  }

  // Check metrics against alert configurations
  checkAlerts(metrics: PerformanceMetrics): Alert[] {
    const newAlerts: Alert[] = []

    for (const config of this.configs) {
      if (!config.enabled) continue

      const metricValue = metrics[config.metric]
      const shouldAlert = this.evaluateCondition(metricValue, config.threshold, config.operator)

      if (shouldAlert) {
        // Check if we already have an active alert for this config
        const existingAlert = this.alerts.find(
          alert => alert.configId === config.id && !alert.resolved
        )

        if (!existingAlert) {
          const alert: Alert = {
            id: crypto.randomUUID(),
            configId: config.id,
            message: this.generateAlertMessage(config, metricValue),
            severity: config.severity,
            timestamp: new Date(),
            resolved: false,
          }

          this.alerts.unshift(alert)
          newAlerts.push(alert)

          // Keep alert history manageable
          if (this.alerts.length > this.maxAlertHistory) {
            this.alerts = this.alerts.slice(0, this.maxAlertHistory)
          }
        }
      } else {
        // Auto-resolve alerts when condition is no longer met
        const activeAlert = this.alerts.find(
          alert => alert.configId === config.id && !alert.resolved
        )
        if (activeAlert) {
          this.resolveAlert(activeAlert.id)
        }
      }
    }

    return newAlerts
  }

  // Start continuous monitoring
  private startMonitoring(): void {
    setInterval(() => {
      const currentMetrics = metricsCollector.getCurrentMetrics()
      const newAlerts = this.checkAlerts(currentMetrics)
      
      // In a real implementation, you might want to:
      // - Send notifications for new alerts
      // - Log alerts to external systems
      // - Trigger automated responses
      
      if (newAlerts.length > 0) {
        console.warn(`Generated ${newAlerts.length} new alerts:`, newAlerts)
      }
    }, 30000) // Check every 30 seconds
  }

  // Evaluate alert condition
  private evaluateCondition(value: number, threshold: number, operator: AlertConfig['operator']): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold
      case 'lt':
        return value < threshold
      case 'eq':
        return value === threshold
      default:
        return false
    }
  }

  // Generate human-readable alert message
  private generateAlertMessage(config: AlertConfig, currentValue: number): string {
    const operatorText = {
      gt: 'exceeded',
      lt: 'dropped below',
      eq: 'equals',
    }[config.operator]

    const unit = this.getMetricUnit(config.metric)
    
    return `${config.name}: ${config.metric} ${operatorText} threshold of ${config.threshold}${unit} (current: ${currentValue.toFixed(2)}${unit})`
  }

  // Get appropriate unit for metric
  private getMetricUnit(metric: keyof PerformanceMetrics): string {
    switch (metric) {
      case 'queriesPerSecond':
        return '/sec'
      case 'modelRuntime':
      case 'dataSyncLatency':
        return 'ms'
      case 'memoryUsage':
      case 'cpuUsage':
        return '%'
      case 'errorCount':
      case 'activeUsers':
        return ''
      default:
        return ''
    }
  }
}

// Singleton instance
export const alertSystem = new AlertSystem()