// Vertex AI Configuration and Authentication

import { GoogleAuth } from 'google-auth-library'
import type { VertexAIConfig, VertexAIClientOptions, RateLimitConfig } from '@/types/vertex-ai'

export class VertexAIConfigManager {
  private static instance: VertexAIConfigManager
  private config: VertexAIConfig
  private auth: GoogleAuth
  private rateLimitConfig: RateLimitConfig

  private constructor() {
    this.config = this.loadConfig()
    this.auth = this.initializeAuth()
    this.rateLimitConfig = this.loadRateLimitConfig()
  }

  public static getInstance(): VertexAIConfigManager {
    if (!VertexAIConfigManager.instance) {
      VertexAIConfigManager.instance = new VertexAIConfigManager()
    }
    return VertexAIConfigManager.instance
  }

  private loadConfig(): VertexAIConfig {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS

    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required')
    }

    return {
      projectId,
      location,
      credentials,
    }
  }

  private loadRateLimitConfig(): RateLimitConfig {
    return {
      maxRequestsPerMinute: parseInt(process.env.VERTEX_AI_MAX_REQUESTS_PER_MINUTE || '60'),
      maxConcurrentRequests: parseInt(process.env.VERTEX_AI_MAX_CONCURRENT_REQUESTS || '10'),
      retryAttempts: parseInt(process.env.VERTEX_AI_RETRY_ATTEMPTS || '3'),
      retryDelayMs: parseInt(process.env.VERTEX_AI_RETRY_DELAY_MS || '1000'),
      backoffMultiplier: parseFloat(process.env.VERTEX_AI_BACKOFF_MULTIPLIER || '2.0'),
    }
  }

  private initializeAuth(): GoogleAuth {
    const authOptions: any = {
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/cloud-platform.read-only',
      ],
    }

    if (this.config.credentials) {
      if (typeof this.config.credentials === 'string') {
        // Path to service account key file
        authOptions.keyFilename = this.config.credentials
      } else {
        // Service account key object
        authOptions.credentials = this.config.credentials
      }
    }

    return new GoogleAuth(authOptions)
  }

  public getConfig(): VertexAIConfig {
    return { ...this.config }
  }

  public getRateLimitConfig(): RateLimitConfig {
    return { ...this.rateLimitConfig }
  }

  public async getAuthClient() {
    return await this.auth.getClient()
  }

  public async getAccessToken(): Promise<string> {
    const client = await this.getAuthClient()
    const accessTokenResponse = await client.getAccessToken()
    
    if (!accessTokenResponse.token) {
      throw new Error('Failed to obtain access token')
    }
    
    return accessTokenResponse.token
  }

  public getProjectId(): string {
    return this.config.projectId
  }

  public getLocation(): string {
    return this.config.location
  }

  public getParent(): string {
    return `projects/${this.config.projectId}/locations/${this.config.location}`
  }

  public validateConfig(): void {
    if (!this.config.projectId) {
      throw new Error('Google Cloud Project ID is required')
    }

    if (!this.config.location) {
      throw new Error('Google Cloud Location is required')
    }

    // Validate that authentication is properly configured
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !this.config.credentials) {
      console.warn(
        'No explicit credentials provided. Falling back to default application credentials. ' +
        'Ensure you have run "gcloud auth application-default login" or set GOOGLE_APPLICATION_CREDENTIALS.'
      )
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const client = await this.getAuthClient()
      await client.getAccessToken()
      return true
    } catch (error) {
      console.error('Vertex AI connection test failed:', error)
      return false
    }
  }

  public getClientOptions(): VertexAIClientOptions {
    return {
      projectId: this.config.projectId,
      location: this.config.location,
      credentials: this.config.credentials,
      rateLimitConfig: this.rateLimitConfig,
      timeout: 60000, // 60 seconds
      maxRetries: this.rateLimitConfig.retryAttempts,
    }
  }

  public updateConfig(newConfig: Partial<VertexAIConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (newConfig.credentials || newConfig.projectId) {
      this.auth = this.initializeAuth()
    }
  }

  public getEndpointUrl(service: string = 'aiplatform'): string {
    return `https://${this.config.location}-${service}.googleapis.com`
  }

  public getModelResourceName(modelId: string): string {
    return `${this.getParent()}/models/${modelId}`
  }

  public getEndpointResourceName(endpointId: string): string {
    return `${this.getParent()}/endpoints/${endpointId}`
  }

  public getTrainingJobResourceName(jobId: string): string {
    return `${this.getParent()}/trainingPipelines/${jobId}`
  }

  public getBatchPredictionJobResourceName(jobId: string): string {
    return `${this.getParent()}/batchPredictionJobs/${jobId}`
  }

  public getDatasetResourceName(datasetId: string): string {
    return `${this.getParent()}/datasets/${datasetId}`
  }
}

// Singleton instance
export const vertexAIConfig = VertexAIConfigManager.getInstance()

// Utility functions for common operations
export function validateVertexAIEnvironment(): void {
  const requiredEnvVars = ['GOOGLE_CLOUD_PROJECT_ID']
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables for Vertex AI: ${missingVars.join(', ')}\n` +
      'Please set these variables in your .env.local file.'
    )
  }
  
  vertexAIConfig.validateConfig()
}

export function getVertexAIHeaders(accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'transcript-analytics-platform/1.0.0',
  }
}

export function parseVertexAIResourceName(resourceName: string): {
  projectId: string
  location: string
  resourceType: string
  resourceId: string
} {
  const parts = resourceName.split('/')
  
  if (parts.length < 6) {
    throw new Error(`Invalid Vertex AI resource name: ${resourceName}`)
  }
  
  return {
    projectId: parts[1],
    location: parts[3],
    resourceType: parts[4],
    resourceId: parts[5],
  }
}