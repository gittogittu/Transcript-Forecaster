// Performance monitoring service exports

export * from './types'
export * from './performance-monitor'
export * from './vertex-ai-monitor'
export * from './alert-manager'
export * from './optimization-recommender'

import { PerformanceMonitor } from './performance-monitor'
import { VertexAIMonitor } from './vertex-ai-monitor'
import { AlertManager } from './alert-manager'
import { OptimizationRecommender } from './optimization-recommender'
import { PerformanceThresholds, PerformanceMonitoringConfig } from './types'

// Default configuration
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  accuracy: {
    maeThreshold: 10,
    rmseThreshold: 15,
    mapeThreshold: 20,
    accuracyMinimum: 0.8
  },
  latency: {
    maxPredictionTime: 2000, // 2 seconds
    maxEndpointLatency: 1000, // 1 second
    maxQueryTime: 500 // 500ms
  },
  resources: {
    maxMemoryUsage: 2000, // 2GB
    maxCpuUsage: 85, // 85%
    maxErrorRate: 5, // 5%
    minCacheHitRate: 70 // 70%
  }
}

const DEFAULT_CONFIG: PerformanceMonitoringConfig = {
  monitoringInterval: 30, // 30 seconds
  alertingEnabled: true,
  thresholds: DEFAULT_THRESHOLDS,
  retentionPeriod: 30, // 30 days
  autoOptimizationEnabled: false
}

// Singleton instances
let performanceMonitorInstance: PerformanceMonitor | null = null
let vertexAIMonitorInstance: VertexAIMonitor | null = null
let alertManagerInstance: AlertManager | null = null
let optimizationRecommenderInstance: OptimizationRecommender | null = null

export function createPerformanceMonitor(
  config: Partial<PerformanceMonitoringConfig> = {}
): PerformanceMonitor {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor(
      finalConfig.thresholds,
      finalConfig.monitoringInterval * 1000
    )
  }
  
  return performanceMonitorInstance
}

export function createVertexAIMonitor(
  projectId: string = process.env.GOOGLE_CLOUD_PROJECT || '',
  location: string = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
): VertexAIMonitor {
  if (!vertexAIMonitorInstance) {
    vertexAIMonitorInstance = new VertexAIMonitor(projectId, location)
  }
  
  return vertexAIMonitorInstance
}

export function createAlertManager(): AlertManager {
  if (!alertManagerInstance) {
    alertManagerInstance = new AlertManager()
  }
  
  return alertManagerInstance
}

export function createOptimizationRecommender(): OptimizationRecommender {
  if (!optimizationRecommenderInstance) {
    optimizationRecommenderInstance = new OptimizationRecommender()
  }
  
  return optimizationRecommenderInstance
}

// Integrated performance monitoring service
export class PerformanceMonitoringService {
  private performanceMonitor: PerformanceMonitor
  private vertexAIMonitor: VertexAIMonitor
  private alertManager: AlertManager
  private optimizationRecommender: OptimizationRecommender

  constructor(
    config: Partial<PerformanceMonitoringConfig> = {},
    projectId?: string,
    location?: string
  ) {
    this.performanceMonitor = createPerformanceMonitor(config)
    this.vertexAIMonitor = createVertexAIMonitor(projectId, location)
    this.alertManager = createAlertManager()
    this.optimizationRecommender = createOptimizationRecommender()

    // Set up alert processing
    this.setupAlertProcessing()
  }

  async monitorModel(modelId: string): Promise<void> {
    try {
      // Get performance metrics from Vertex AI
      const metrics = await this.vertexAIMonitor.monitorModelPerformance(modelId)
      
      // Record metrics in performance monitor
      await this.performanceMonitor.recordMetrics(metrics)
      
      // Generate optimization recommendations if needed
      const systemHealth = await this.performanceMonitor.getSystemHealth()
      if (systemHealth.overall !== 'healthy') {
        await this.generateOptimizationRecommendations(modelId)
      }
    } catch (error) {
      console.error(`Failed to monitor model ${modelId}:`, error)
    }
  }

  async getSystemHealth() {
    return this.performanceMonitor.getSystemHealth()
  }

  async getModelPerformanceHistory(modelId: string, timeRange: { start: Date; end: Date }) {
    return this.performanceMonitor.getModelPerformanceHistory(modelId, timeRange)
  }

  async getActiveAlerts() {
    return this.alertManager.getAlertHistory({ 
      timeRange: { 
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date() 
      } 
    })
  }

  async getOptimizationRecommendations(modelId: string) {
    return this.optimizationRecommender.getRecommendations(modelId)
  }

  async generateOptimizationPlan(modelId: string, selectedRecommendations: string[]) {
    return this.optimizationRecommender.generateOptimizationPlan(modelId, selectedRecommendations)
  }

  private setupAlertProcessing(): void {
    // This would be set up to listen for alerts from the performance monitor
    // and process them through the alert manager
  }

  private async generateOptimizationRecommendations(modelId: string): Promise<void> {
    try {
      const performanceHistory = await this.performanceMonitor.getModelPerformanceHistory(
        modelId,
        {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          end: new Date()
        }
      )

      const currentMetrics = performanceHistory.metrics[performanceHistory.metrics.length - 1]
      if (!currentMetrics) return

      const context = {
        modelId,
        performanceHistory,
        currentMetrics,
        systemResources: {
          availableMemory: 8000, // 8GB
          availableCPU: 100, // 100%
          networkBandwidth: 1000 // 1Gbps
        },
        businessConstraints: {
          maxLatency: 2000, // 2 seconds
          minAccuracy: 0.85, // 85%
          budgetLimit: 10000 // $10,000/month
        }
      }

      await this.optimizationRecommender.generateRecommendations(context)
    } catch (error) {
      console.error(`Failed to generate optimization recommendations for model ${modelId}:`, error)
    }
  }
}

// Export default instance
export const performanceMonitoringService = new PerformanceMonitoringService()