/**
 * Adaptive Modeling Manager
 * Orchestrates all adaptive modeling components for intelligent data modeling
 */

import { ConceptDriftDetector } from './concept-drift-detector'
import { AutoRetrainingService } from './auto-retraining-service'
import { AdaptivePreprocessingPipeline } from './adaptive-preprocessing'
import { PerformanceTracker } from './performance-tracker'
import { HyperparameterOptimizer } from './hyperparameter-optimizer'

import {
  AdaptiveModelingState,
  ModelPerformanceMetrics,
  ConceptDriftDetectionResult,
  AutoRetrainingConfig,
  AdaptivePreprocessingConfig,
  HyperparameterOptimizationConfig,
  VertexAIModelMonitoringConfig,
  ActiveModel,
  ModelSwitchingDecision,
  RetrainingJob,
  OptimizationResult,
  AdaptiveModelingEvent
} from './types'

export interface AdaptiveModelingConfig {
  driftDetection: {
    enabled: boolean
    vertexAIConfig: VertexAIModelMonitoringConfig
    checkInterval: number // minutes
  }
  autoRetraining: AutoRetrainingConfig
  adaptivePreprocessing: AdaptivePreprocessingConfig
  hyperparameterOptimization: HyperparameterOptimizationConfig
  performanceTracking: {
    enabled: boolean
    metricsRetentionDays: number
    healthCheckInterval: number // minutes
  }
}

export class AdaptiveModelingManager {
  private driftDetector: ConceptDriftDetector
  private retrainingService: AutoRetrainingService
  private preprocessingPipeline: AdaptivePreprocessingPipeline
  private performanceTracker: PerformanceTracker
  private hyperparameterOptimizer: HyperparameterOptimizer
  
  private config: AdaptiveModelingConfig
  private isInitialized = false
  private monitoringIntervals: NodeJS.Timeout[] = []

  constructor(config?: AdaptiveModelingConfig) {
    // Use default config if none provided
    this.config = config || this.getDefaultConfig()
    
    // Initialize components
    this.driftDetector = new ConceptDriftDetector(this.config.driftDetection.vertexAIConfig)
    this.retrainingService = new AutoRetrainingService(this.config.autoRetraining)
    this.preprocessingPipeline = new AdaptivePreprocessingPipeline(this.config.adaptivePreprocessing)
    this.performanceTracker = new PerformanceTracker()
    this.hyperparameterOptimizer = new HyperparameterOptimizer(this.config.hyperparameterOptimization)
  }

  /**
   * Get default configuration for adaptive modeling
   */
  private getDefaultConfig(): AdaptiveModelingConfig {
    return {
      driftDetection: {
        enabled: false, // Disabled by default to avoid setup issues
        vertexAIConfig: {
          projectId: 'demo-project',
          location: 'us-central1',
          endpointId: '',
          alertConfig: {
            notificationChannels: [],
            alertThresholds: []
          },
          driftDetectionConfig: {
            driftThresholds: {},
            samplingStrategy: {
              randomSampleConfig: {
                sampleRate: 0.1
              }
            }
          }
        },
        checkInterval: 60
      },
      autoRetraining: {
        enabled: false,
        triggers: [],
        schedule: {
          frequency: 'daily',
          time: '02:00',
          timezone: 'UTC',
          maxConcurrentJobs: 1
        },
        dataQualityThresholds: {
          missingValuePercentage: 0.1,
          outlierPercentage: 0.05,
          duplicatePercentage: 0.01,
          schemaViolationPercentage: 0.01,
          dataFreshnessHours: 24
        },
        performanceThresholds: {
          accuracyDropPercentage: 0.1,
          latencyIncreasePercentage: 0.2,
          errorRatePercentage: 0.05,
          memoryUsagePercentage: 0.8,
          throughputDropPercentage: 0.1
        },
        resourceLimits: {
          maxTrainingTimeMinutes: 60,
          maxMemoryGB: 8,
          maxCpuCores: 4,
          maxGpuCount: 0,
          maxCostUSD: 100
        }
      },
      adaptivePreprocessing: {
        enabled: false,
        adaptationTriggers: [],
        preprocessingSteps: [],
        qualityMonitoring: {
          enabled: true,
          checkFrequency: 'daily',
          qualityMetrics: [],
          alertThresholds: {}
        }
      },
      hyperparameterOptimization: {
        enabled: false,
        algorithm: 'bayesian',
        searchSpace: {
          parameters: [],
          searchStrategy: 'adaptive',
          maxIterations: 10,
          parallelTrials: 1
        },
        optimizationObjective: {
          metric: 'accuracy',
          direction: 'maximize',
          weight: 1.0
        },
        constraints: {
          maxTrainingTime: 60,
          maxMemoryUsage: 4000,
          maxCost: 50
        },
        earlyStoppingConfig: {
          enabled: true,
          patience: 5,
          minDelta: 0.001,
          metric: 'accuracy',
          mode: 'max'
        }
      },
      performanceTracking: {
        enabled: true,
        metricsRetentionDays: 30,
        healthCheckInterval: 15
      }
    }
  }

  /**
   * Initialize the adaptive modeling system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Adaptive modeling manager already initialized')
      return
    }

    try {
      // Setup Vertex AI monitoring
      if (this.config.driftDetection.enabled) {
        await this.driftDetector.setupVertexAIMonitoring()
      }

      // Start monitoring intervals
      this.startMonitoring()

      this.isInitialized = true
      console.log('Adaptive modeling manager initialized successfully')
    } catch (error) {
      console.error('Failed to initialize adaptive modeling manager:', error)
      throw error
    }
  }

  /**
   * Process new performance metrics and trigger adaptive actions
   */
  async processPerformanceMetrics(metrics: ModelPerformanceMetrics): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    try {
      // Track performance
      this.performanceTracker.trackPerformance(metrics)

      // Update drift detector with performance history
      this.driftDetector.updatePerformanceHistory(metrics)

      // Check if retraining should be triggered
      const shouldRetrain = await this.retrainingService.evaluateRetrainingNeed(
        metrics.modelId,
        metrics
      )

      if (shouldRetrain) {
        console.log(`Retraining triggered for model ${metrics.modelId}`)
      }

    } catch (error) {
      console.error('Error processing performance metrics:', error)
      throw error
    }
  }

  /**
   * Process new data with adaptive preprocessing
   */
  async processData(
    data: any[],
    datasetId: string,
    targetColumn?: string
  ): Promise<{
    processedData: any[]
    qualityImprovement: number
    processingTime: number
    warnings: string[]
  }> {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    try {
      const result = await this.preprocessingPipeline.processData(data, datasetId, targetColumn)
      
      return {
        processedData: result.processedData,
        qualityImprovement: result.qualityImprovement,
        processingTime: result.processingTime,
        warnings: result.warnings
      }
    } catch (error) {
      console.error('Error processing data:', error)
      throw error
    }
  }

  /**
   * Detect concept drift for a model
   */
  async detectConceptDrift(
    modelId: string,
    currentData: Record<string, number[]>,
    referenceData: Record<string, number[]>
  ): Promise<ConceptDriftDetectionResult> {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    try {
      const driftResult = await this.driftDetector.detectDrift(currentData, referenceData, modelId)

      // If significant drift detected, evaluate retraining
      if (driftResult.isDriftDetected && driftResult.driftScore > 0.3) {
        // Create dummy metrics for drift-based retraining evaluation
        const dummyMetrics: ModelPerformanceMetrics = {
          modelId,
          timestamp: new Date(),
          accuracy: 0.8 - driftResult.driftScore * 0.5, // Simulate accuracy drop
          mae: 0.1 + driftResult.driftScore * 0.1,
          rmse: 0.15 + driftResult.driftScore * 0.1,
          mape: 5.0 + driftResult.driftScore * 5,
          r2Score: 0.8 - driftResult.driftScore * 0.3,
          predictionLatency: 100,
          memoryUsage: 512,
          cpuUsage: 50,
          throughput: 1000,
          errorRate: driftResult.driftScore * 0.05
        }

        await this.retrainingService.evaluateRetrainingNeed(modelId, dummyMetrics, driftResult)
      }

      return driftResult
    } catch (error) {
      console.error('Error detecting concept drift:', error)
      throw error
    }
  }

  /**
   * Optimize hyperparameters for a model
   */
  async optimizeHyperparameters(
    modelId: string,
    modelType: string,
    trainingData: any[],
    validationData: any[]
  ): Promise<OptimizationResult> {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    try {
      return await this.hyperparameterOptimizer.optimizeHyperparameters(
        modelId,
        modelType,
        trainingData,
        validationData
      )
    } catch (error) {
      console.error('Error optimizing hyperparameters:', error)
      throw error
    }
  }

  /**
   * Register a new active model
   */
  registerModel(model: ActiveModel): void {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    this.performanceTracker.registerModel(model)
  }

  /**
   * Execute model switching based on recommendation
   */
  async executeModelSwitch(decision: ModelSwitchingDecision): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    try {
      return await this.performanceTracker.executeModelSwitch(decision)
    } catch (error) {
      console.error('Error executing model switch:', error)
      return false
    }
  }

  /**
   * Get current adaptive modeling state
   */
  getAdaptiveModelingState(): AdaptiveModelingState {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    const state = this.performanceTracker.getAdaptiveModelingState()
    
    // Add retraining jobs from retraining service
    const allModelIds = state.currentModels.map(m => m.id)
    const retrainingJobs: RetrainingJob[] = []
    
    allModelIds.forEach(modelId => {
      const modelJobs = this.retrainingService.getModelJobs(modelId)
      retrainingJobs.push(...modelJobs)
    })

    // Add optimization results
    const optimizationResults = this.hyperparameterOptimizer.getOptimizationHistory()

    return {
      ...state,
      retrainingJobs,
      optimizationResults
    }
  }

  /**
   * Get model switching recommendations
   */
  getModelSwitchingRecommendations(modelId?: string): ModelSwitchingDecision[] {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    return this.performanceTracker.getSwitchingRecommendations(modelId)
  }

  /**
   * Get performance history for a model
   */
  getPerformanceHistory(modelId: string, limit?: number): ModelPerformanceMetrics[] {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    return this.performanceTracker.getPerformanceHistory(modelId, limit)
  }

  /**
   * Get system health metrics
   */
  getSystemHealth() {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    return this.performanceTracker.getSystemHealth()
  }

  /**
   * Get recent system events
   */
  getRecentEvents(limit: number = 100): AdaptiveModelingEvent[] {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    return this.performanceTracker.getRecentEvents(limit)
  }

  /**
   * Get data quality history
   */
  getDataQualityHistory(datasetId: string) {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    return this.preprocessingPipeline.getQualityHistory(datasetId)
  }

  /**
   * Get optimization status for a model
   */
  getOptimizationStatus(modelId: string) {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    return this.hyperparameterOptimizer.getOptimizationStatus(modelId)
  }

  /**
   * Cancel optimization for a model
   */
  cancelOptimization(modelId: string): boolean {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    return this.hyperparameterOptimizer.cancelOptimization(modelId)
  }

  /**
   * Cancel retraining job
   */
  async cancelRetraining(jobId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Adaptive modeling manager not initialized')
    }

    return await this.retrainingService.cancelRetraining(jobId)
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AdaptiveModelingConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Update component configurations
    if (newConfig.autoRetraining) {
      this.retrainingService.updateConfig(newConfig.autoRetraining)
    }

    if (newConfig.adaptivePreprocessing) {
      this.preprocessingPipeline.updateConfig(newConfig.adaptivePreprocessing)
    }

    if (newConfig.hyperparameterOptimization) {
      this.hyperparameterOptimizer.updateConfig(newConfig.hyperparameterOptimization)
    }

    // Restart monitoring if intervals changed
    if (newConfig.driftDetection?.checkInterval || newConfig.performanceTracking?.healthCheckInterval) {
      this.stopMonitoring()
      this.startMonitoring()
    }
  }

  /**
   * Start monitoring intervals
   */
  private startMonitoring(): void {
    // Drift detection monitoring
    if (this.config.driftDetection.enabled) {
      const driftInterval = setInterval(() => {
        this.performPeriodicDriftCheck()
      }, this.config.driftDetection.checkInterval * 60 * 1000)
      
      this.monitoringIntervals.push(driftInterval)
    }

    // Performance health check
    if (this.config.performanceTracking.enabled) {
      const healthInterval = setInterval(() => {
        this.performHealthCheck()
      }, this.config.performanceTracking.healthCheckInterval * 60 * 1000)
      
      this.monitoringIntervals.push(healthInterval)
    }

    // Cleanup old data
    const cleanupInterval = setInterval(() => {
      this.performCleanup()
    }, 24 * 60 * 60 * 1000) // Daily cleanup
    
    this.monitoringIntervals.push(cleanupInterval)
  }

  /**
   * Stop monitoring intervals
   */
  private stopMonitoring(): void {
    this.monitoringIntervals.forEach(interval => clearInterval(interval))
    this.monitoringIntervals = []
  }

  /**
   * Perform periodic drift check
   */
  private async performPeriodicDriftCheck(): Promise<void> {
    try {
      // This would check for drift across all active models
      // For now, we'll log that the check is running
      console.log('Performing periodic drift check...')
      
      // In a real implementation, this would:
      // 1. Get list of active models
      // 2. Fetch recent data for each model
      // 3. Compare with reference data
      // 4. Trigger drift detection
      
    } catch (error) {
      console.error('Error in periodic drift check:', error)
    }
  }

  /**
   * Perform system health check
   */
  private performHealthCheck(): void {
    try {
      const health = this.performanceTracker.getSystemHealth()
      
      if (health.overallHealth === 'critical') {
        console.warn('System health is critical:', health)
        // In a real implementation, this would trigger alerts
      } else if (health.overallHealth === 'warning') {
        console.warn('System health warning:', health)
      }
      
    } catch (error) {
      console.error('Error in health check:', error)
    }
  }

  /**
   * Perform cleanup of old data
   */
  private performCleanup(): void {
    try {
      const retentionDays = this.config.performanceTracking.metricsRetentionDays
      
      // Clear old performance data
      this.performanceTracker.clearOldPerformanceData(retentionDays)
      
      // Clear old alerts
      this.retrainingService.clearOldAlerts(retentionDays)
      
      console.log(`Cleaned up data older than ${retentionDays} days`)
      
    } catch (error) {
      console.error('Error in cleanup:', error)
    }
  }

  /**
   * Shutdown the adaptive modeling manager
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return
    }

    try {
      // Stop monitoring
      this.stopMonitoring()

      // Cancel any active optimizations
      const state = this.getAdaptiveModelingState()
      for (const model of state.currentModels) {
        const optimizationStatus = this.hyperparameterOptimizer.getOptimizationStatus(model.id)
        if (optimizationStatus && optimizationStatus.status === 'running') {
          this.hyperparameterOptimizer.cancelOptimization(model.id)
        }
      }

      this.isInitialized = false
      console.log('Adaptive modeling manager shutdown complete')
      
    } catch (error) {
      console.error('Error during shutdown:', error)
      throw error
    }
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus(): {
    isInitialized: boolean
    systemHealth: any
    activeModels: number
    activeOptimizations: number
    activeRetrainingJobs: number
    recentEvents: AdaptiveModelingEvent[]
  } {
    if (!this.isInitialized) {
      return {
        isInitialized: false,
        systemHealth: null,
        activeModels: 0,
        activeOptimizations: 0,
        activeRetrainingJobs: 0,
        recentEvents: []
      }
    }

    const state = this.getAdaptiveModelingState()
    const systemHealth = this.getSystemHealth()
    const recentEvents = this.getRecentEvents(50)

    const activeOptimizations = state.currentModels.filter(model => {
      const status = this.hyperparameterOptimizer.getOptimizationStatus(model.id)
      return status && status.status === 'running'
    }).length

    const activeRetrainingJobs = state.retrainingJobs.filter(job => 
      job.status === 'running' || job.status === 'queued'
    ).length

    return {
      isInitialized: true,
      systemHealth,
      activeModels: state.currentModels.length,
      activeOptimizations,
      activeRetrainingJobs,
      recentEvents
    }
  }
}