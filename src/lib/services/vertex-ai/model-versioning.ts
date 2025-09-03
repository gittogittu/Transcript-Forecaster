// Vertex AI Model Versioning and Metadata Tracking Service

import { getVertexAIClient } from './client'
import { vertexAIConfig } from './config'
import { withErrorHandling } from './errors'
import { query } from '@/lib/database'
import type { VertexAIClientOptions } from '@/types/vertex-ai'

export interface ModelMetadata {
  modelId: string
  vertexModelId: string
  modelName: string
  modelType: 'automl_forecasting' | 'custom_training'
  version: string
  displayName: string
  description?: string
  tags: string[]
  labels: Record<string, string>
  trainingConfig: TrainingConfiguration
  evaluationMetrics?: EvaluationMetrics
  featureImportance?: FeatureImportance[]
  deploymentInfo?: DeploymentInfo
  createdAt: string
  updatedAt: string
  createdBy: string
  status: ModelStatus
  parentModelId?: string
  experimentId?: string
}

export interface TrainingConfiguration {
  datasetId: string
  targetColumn: string
  timeColumn: string
  forecastHorizon: number
  contextWindow?: number
  optimizationObjective: string
  budgetMilliNodeHours: number
  dataGranularity?: {
    unit: string
    quantity: number
  }
  holidayRegions?: string[]
  featureColumns: string[]
  hyperparameters?: Record<string, any>
  trainingDataSplit: {
    trainingFraction: number
    validationFraction: number
    testFraction: number
  }
}

export interface EvaluationMetrics {
  mae: number
  rmse: number
  mape: number
  r2Score: number
  crossValidationScore?: number
  evaluationDate: string
  testDataSize: number
}

export interface FeatureImportance {
  featureName: string
  importance: number
  rank: number
  importanceType: 'gain' | 'split' | 'permutation'
}

export interface DeploymentInfo {
  endpointId?: string
  deployedModelId?: string
  deploymentStatus: 'not_deployed' | 'deploying' | 'deployed' | 'failed'
  deploymentDate?: string
  trafficPercentage?: number
  machineType?: string
  replicaCount?: number
}

export type ModelStatus = 'training' | 'completed' | 'failed' | 'deployed' | 'archived' | 'deprecated'

export interface ModelVersion {
  versionId: string
  version: string
  modelId: string
  parentVersionId?: string
  changelog: string
  metadata: ModelMetadata
  performanceComparison?: PerformanceComparison
  isActive: boolean
  createdAt: string
}

export interface PerformanceComparison {
  previousVersionId?: string
  metricChanges: Record<string, number>
  improvementPercentage: number
  significantChanges: string[]
  recommendation: 'promote' | 'rollback' | 'investigate'
}

export interface ModelExperiment {
  experimentId: string
  name: string
  description: string
  hypothesis: string
  modelVersions: string[]
  baselineVersionId?: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  results?: ExperimentResults
  createdAt: string
  completedAt?: string
}

export interface ExperimentResults {
  bestVersionId: string
  performanceGain: number
  statisticalSignificance: number
  conclusions: string[]
  recommendations: string[]
}

export interface ModelLineage {
  modelId: string
  versions: ModelVersionNode[]
  experiments: ModelExperiment[]
  deploymentHistory: DeploymentEvent[]
}

export interface ModelVersionNode {
  versionId: string
  version: string
  parentVersionId?: string
  children: string[]
  branchName?: string
  isActive: boolean
  performance: EvaluationMetrics
}

export interface DeploymentEvent {
  eventId: string
  versionId: string
  eventType: 'deployed' | 'undeployed' | 'traffic_updated' | 'scaled'
  timestamp: string
  details: Record<string, any>
  performedBy: string
}

export interface ModelRegistry {
  models: ModelMetadata[]
  totalCount: number
  activeModels: number
  deployedModels: number
  archivedModels: number
}

export class ModelVersioningService {
  private client = getVertexAIClient()

  async createModelVersion(
    baseModelId: string,
    trainingConfig: TrainingConfiguration,
    version?: string,
    changelog?: string
  ): Promise<ModelVersion> {
    return withErrorHandling(async () => {
      // Generate version if not provided
      const versionNumber = version || await this.generateNextVersion(baseModelId)
      
      // Create model metadata
      const metadata: ModelMetadata = {
        modelId: baseModelId,
        vertexModelId: '', // Will be set after training
        modelName: `${baseModelId}-${versionNumber}`,
        modelType: 'automl_forecasting',
        version: versionNumber,
        displayName: `${baseModelId} v${versionNumber}`,
        description: `Model version ${versionNumber} for ${baseModelId}`,
        tags: ['forecasting', 'automl', versionNumber],
        labels: {
          'model-family': baseModelId,
          'version': versionNumber,
          'type': 'automl_forecasting'
        },
        trainingConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system', // Would be actual user
        status: 'training',
        parentModelId: baseModelId
      }

      // Store in database
      const result = await query(`
        INSERT INTO vertex_ai_models (
          vertex_model_id, model_name, model_type, project_id, location,
          training_config, created_at, updated_at, is_active, deployment_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        metadata.vertexModelId || `temp-${Date.now()}`,
        metadata.modelName,
        metadata.modelType,
        vertexAIConfig.projectId,
        vertexAIConfig.location,
        JSON.stringify(metadata.trainingConfig),
        metadata.createdAt,
        metadata.updatedAt,
        true,
        'pending'
      ])

      const modelVersion: ModelVersion = {
        versionId: result.rows[0].id,
        version: versionNumber,
        modelId: baseModelId,
        changelog: changelog || `Created version ${versionNumber}`,
        metadata,
        isActive: true,
        createdAt: metadata.createdAt
      }

      return modelVersion
    }, 'createModelVersion')
  }

  async updateModelMetadata(
    versionId: string,
    updates: Partial<ModelMetadata>
  ): Promise<ModelMetadata> {
    return withErrorHandling(async () => {
      const updateFields: string[] = []
      const updateValues: any[] = []
      let paramIndex = 1

      if (updates.vertexModelId) {
        updateFields.push(`vertex_model_id = $${paramIndex++}`)
        updateValues.push(updates.vertexModelId)
      }

      if (updates.evaluationMetrics) {
        updateFields.push(`evaluation_metrics = $${paramIndex++}`)
        updateValues.push(JSON.stringify(updates.evaluationMetrics))
      }

      if (updates.featureImportance) {
        updateFields.push(`feature_importance = $${paramIndex++}`)
        updateValues.push(JSON.stringify(updates.featureImportance))
      }

      if (updates.status) {
        updateFields.push(`deployment_status = $${paramIndex++}`)
        updateValues.push(updates.status)
      }

      updateFields.push(`updated_at = $${paramIndex++}`)
      updateValues.push(new Date().toISOString())

      updateValues.push(versionId)

      const result = await query(`
        UPDATE vertex_ai_models 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, updateValues)

      if (result.rows.length === 0) {
        throw new Error(`Model version ${versionId} not found`)
      }

      const row = result.rows[0]
      return this.mapRowToMetadata(row)
    }, 'updateModelMetadata')
  }

  async getModelVersion(versionId: string): Promise<ModelVersion | null> {
    return withErrorHandling(async () => {
      const result = await query(`
        SELECT * FROM vertex_ai_models WHERE id = $1
      `, [versionId])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      const metadata = this.mapRowToMetadata(row)

      return {
        versionId: row.id,
        version: metadata.version,
        modelId: metadata.parentModelId || metadata.modelId,
        changelog: `Version ${metadata.version}`,
        metadata,
        isActive: row.is_active,
        createdAt: row.created_at
      }
    }, 'getModelVersion')
  }

  async listModelVersions(
    modelId: string,
    includeArchived = false
  ): Promise<ModelVersion[]> {
    return withErrorHandling(async () => {
      let whereClause = 'WHERE model_name LIKE $1'
      const params: any[] = [`${modelId}-%`]

      if (!includeArchived) {
        whereClause += ' AND is_active = true'
      }

      const result = await query(`
        SELECT * FROM vertex_ai_models 
        ${whereClause}
        ORDER BY created_at DESC
      `, params)

      return result.rows.map(row => {
        const metadata = this.mapRowToMetadata(row)
        return {
          versionId: row.id,
          version: metadata.version,
          modelId: modelId,
          changelog: `Version ${metadata.version}`,
          metadata,
          isActive: row.is_active,
          createdAt: row.created_at
        }
      })
    }, 'listModelVersions')
  }

  async compareVersions(
    versionAId: string,
    versionBId: string
  ): Promise<{
    versionA: ModelVersion
    versionB: ModelVersion
    comparison: PerformanceComparison
    recommendation: string
  }> {
    return withErrorHandling(async () => {
      const [versionA, versionB] = await Promise.all([
        this.getModelVersion(versionAId),
        this.getModelVersion(versionBId)
      ])

      if (!versionA || !versionB) {
        throw new Error('One or both versions not found')
      }

      const metricsA = versionA.metadata.evaluationMetrics
      const metricsB = versionB.metadata.evaluationMetrics

      if (!metricsA || !metricsB) {
        throw new Error('Evaluation metrics not available for comparison')
      }

      const metricChanges: Record<string, number> = {
        mae: ((metricsB.mae - metricsA.mae) / metricsA.mae) * 100,
        rmse: ((metricsB.rmse - metricsA.rmse) / metricsA.rmse) * 100,
        mape: ((metricsB.mape - metricsA.mape) / metricsA.mape) * 100,
        r2Score: ((metricsB.r2Score - metricsA.r2Score) / metricsA.r2Score) * 100
      }

      const improvementPercentage = metricChanges.r2Score
      const significantChanges: string[] = []

      Object.entries(metricChanges).forEach(([metric, change]) => {
        if (Math.abs(change) > 5) { // 5% threshold
          const direction = change > 0 ? 'increased' : 'decreased'
          significantChanges.push(`${metric} ${direction} by ${Math.abs(change).toFixed(1)}%`)
        }
      })

      let recommendation: 'promote' | 'rollback' | 'investigate'
      if (improvementPercentage > 5) {
        recommendation = 'promote'
      } else if (improvementPercentage < -5) {
        recommendation = 'rollback'
      } else {
        recommendation = 'investigate'
      }

      const comparison: PerformanceComparison = {
        previousVersionId: versionAId,
        metricChanges,
        improvementPercentage,
        significantChanges,
        recommendation
      }

      const recommendationText = this.generateRecommendationText(comparison)

      return {
        versionA,
        versionB,
        comparison,
        recommendation: recommendationText
      }
    }, 'compareVersions')
  }

  async createExperiment(
    name: string,
    description: string,
    hypothesis: string,
    modelVersionIds: string[],
    baselineVersionId?: string
  ): Promise<ModelExperiment> {
    return withErrorHandling(async () => {
      const experiment: ModelExperiment = {
        experimentId: `exp-${Date.now()}`,
        name,
        description,
        hypothesis,
        modelVersions: modelVersionIds,
        baselineVersionId,
        status: 'running',
        createdAt: new Date().toISOString()
      }

      // Store experiment in database (would need experiment table)
      console.log('Created experiment:', experiment)

      return experiment
    }, 'createExperiment')
  }

  async getModelLineage(modelId: string): Promise<ModelLineage> {
    return withErrorHandling(async () => {
      const versions = await this.listModelVersions(modelId, true)
      
      // Build version tree
      const versionNodes: ModelVersionNode[] = versions.map(version => ({
        versionId: version.versionId,
        version: version.version,
        parentVersionId: version.metadata.parentModelId,
        children: [],
        isActive: version.isActive,
        performance: version.metadata.evaluationMetrics || {
          mae: 0,
          rmse: 0,
          mape: 0,
          r2Score: 0,
          evaluationDate: '',
          testDataSize: 0
        }
      }))

      // Build parent-child relationships
      versionNodes.forEach(node => {
        const children = versionNodes.filter(v => v.parentVersionId === node.versionId)
        node.children = children.map(c => c.versionId)
      })

      // Mock deployment history
      const deploymentHistory: DeploymentEvent[] = versions
        .filter(v => v.metadata.deploymentInfo?.deploymentStatus === 'deployed')
        .map(v => ({
          eventId: `deploy-${v.versionId}`,
          versionId: v.versionId,
          eventType: 'deployed',
          timestamp: v.metadata.deploymentInfo?.deploymentDate || v.createdAt,
          details: {
            endpointId: v.metadata.deploymentInfo?.endpointId,
            trafficPercentage: v.metadata.deploymentInfo?.trafficPercentage
          },
          performedBy: 'system'
        }))

      return {
        modelId,
        versions: versionNodes,
        experiments: [], // Would fetch from experiments table
        deploymentHistory
      }
    }, 'getModelLineage')
  }

  async archiveVersion(versionId: string, reason?: string): Promise<void> {
    return withErrorHandling(async () => {
      await query(`
        UPDATE vertex_ai_models 
        SET is_active = false, updated_at = $1
        WHERE id = $2
      `, [new Date().toISOString(), versionId])

      console.log(`Archived model version ${versionId}. Reason: ${reason || 'Not specified'}`)
    }, 'archiveVersion')
  }

  async promoteVersion(versionId: string, targetEnvironment: 'staging' | 'production'): Promise<void> {
    return withErrorHandling(async () => {
      // Update deployment status
      await this.updateModelMetadata(versionId, {
        status: 'deployed',
        deploymentInfo: {
          deploymentStatus: 'deployed',
          deploymentDate: new Date().toISOString(),
          trafficPercentage: 100
        }
      })

      console.log(`Promoted model version ${versionId} to ${targetEnvironment}`)
    }, 'promoteVersion')
  }

  async getModelRegistry(filter?: {
    modelType?: string
    status?: ModelStatus
    tags?: string[]
  }): Promise<ModelRegistry> {
    return withErrorHandling(async () => {
      let whereClause = 'WHERE 1=1'
      const params: any[] = []
      let paramIndex = 1

      if (filter?.modelType) {
        whereClause += ` AND model_type = $${paramIndex++}`
        params.push(filter.modelType)
      }

      if (filter?.status) {
        whereClause += ` AND deployment_status = $${paramIndex++}`
        params.push(filter.status)
      }

      const result = await query(`
        SELECT * FROM vertex_ai_models ${whereClause}
        ORDER BY created_at DESC
      `, params)

      const models = result.rows.map(row => this.mapRowToMetadata(row))

      const totalCount = models.length
      const activeModels = models.filter(m => m.status !== 'archived').length
      const deployedModels = models.filter(m => m.status === 'deployed').length
      const archivedModels = models.filter(m => m.status === 'archived').length

      return {
        models,
        totalCount,
        activeModels,
        deployedModels,
        archivedModels
      }
    }, 'getModelRegistry')
  }

  private async generateNextVersion(modelId: string): Promise<string> {
    const versions = await this.listModelVersions(modelId, true)
    
    if (versions.length === 0) {
      return '1.0.0'
    }

    // Find the highest version number
    const versionNumbers = versions.map(v => {
      const parts = v.version.split('.').map(Number)
      return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 }
    })

    const latest = versionNumbers.reduce((max, current) => {
      if (current.major > max.major) return current
      if (current.major === max.major && current.minor > max.minor) return current
      if (current.major === max.major && current.minor === max.minor && current.patch > max.patch) return current
      return max
    })

    // Increment patch version
    return `${latest.major}.${latest.minor}.${latest.patch + 1}`
  }

  private mapRowToMetadata(row: any): ModelMetadata {
    const trainingConfig = typeof row.training_config === 'string' 
      ? JSON.parse(row.training_config) 
      : row.training_config

    const evaluationMetrics = row.evaluation_metrics 
      ? (typeof row.evaluation_metrics === 'string' 
          ? JSON.parse(row.evaluation_metrics) 
          : row.evaluation_metrics)
      : undefined

    const featureImportance = row.feature_importance 
      ? (typeof row.feature_importance === 'string' 
          ? JSON.parse(row.feature_importance) 
          : row.feature_importance)
      : undefined

    // Extract version from model name
    const versionMatch = row.model_name.match(/-v?(\d+\.\d+\.\d+)$/)
    const version = versionMatch ? versionMatch[1] : '1.0.0'

    return {
      modelId: row.id,
      vertexModelId: row.vertex_model_id,
      modelName: row.model_name,
      modelType: row.model_type,
      version,
      displayName: row.model_name,
      description: `Model ${row.model_name}`,
      tags: [row.model_type, version],
      labels: {
        'model-type': row.model_type,
        'version': version
      },
      trainingConfig,
      evaluationMetrics,
      featureImportance,
      deploymentInfo: {
        deploymentStatus: row.deployment_status,
        deploymentDate: row.updated_at
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: 'system',
      status: row.deployment_status,
      parentModelId: row.model_name.split('-')[0]
    }
  }

  private generateRecommendationText(comparison: PerformanceComparison): string {
    const { recommendation, improvementPercentage, significantChanges } = comparison

    switch (recommendation) {
      case 'promote':
        return `Recommend promoting this version. Performance improved by ${improvementPercentage.toFixed(1)}%. ${significantChanges.join(', ')}.`
      case 'rollback':
        return `Recommend rolling back. Performance degraded by ${Math.abs(improvementPercentage).toFixed(1)}%. ${significantChanges.join(', ')}.`
      case 'investigate':
        return `Performance changes are marginal (${improvementPercentage.toFixed(1)}%). Further investigation recommended before deployment.`
      default:
        return 'Unable to generate recommendation.'
    }
  }
}

// Singleton instance
let modelVersioningServiceInstance: ModelVersioningService | null = null

export function getModelVersioningService(): ModelVersioningService {
  if (!modelVersioningServiceInstance) {
    modelVersioningServiceInstance = new ModelVersioningService()
  }
  return modelVersioningServiceInstance
}

export function resetModelVersioningService(): void {
  modelVersioningServiceInstance = null
}