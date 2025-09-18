// Vertex AI Test Utilities

import { getVertexAIService } from './index'
import { vertexAIConfig } from './config'

export interface VertexAITestResult {
  testName: string
  success: boolean
  duration: number
  error?: string
  data?: any
}

export class VertexAITester {
  private service = getVertexAIService()
  private results: VertexAITestResult[] = []

  async runAllTests(): Promise<{
    success: boolean
    results: VertexAITestResult[]
    summary: {
      total: number
      passed: number
      failed: number
      totalDuration: number
    }
  }> {
    this.results = []

    // Run all test methods
    await this.testConfiguration()
    await this.testConnection()
    await this.testHealthCheck()
    await this.testListModels()
    await this.testListEndpoints()

    const summary = this.generateSummary()
    
    return {
      success: summary.failed === 0,
      results: this.results,
      summary,
    }
  }

  private async runTest(
    testName: string,
    testFunction: () => Promise<any>
  ): Promise<VertexAITestResult> {
    const startTime = Date.now()
    
    try {
      const data = await testFunction()
      const duration = Date.now() - startTime
      
      const result: VertexAITestResult = {
        testName,
        success: true,
        duration,
        data,
      }
      
      this.results.push(result)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      const result: VertexAITestResult = {
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      
      this.results.push(result)
      return result
    }
  }

  private async testConfiguration(): Promise<VertexAITestResult> {
    return this.runTest('Configuration Test', async () => {
      const config = vertexAIConfig.getConfig()
      
      if (!config.projectId) {
        throw new Error('Project ID not configured')
      }
      
      if (!config.location) {
        throw new Error('Location not configured')
      }
      
      return {
        projectId: config.projectId,
        location: config.location,
        hasCredentials: !!config.credentials,
      }
    })
  }

  private async testConnection(): Promise<VertexAITestResult> {
    return this.runTest('Connection Test', async () => {
      const isConnected = await this.service.testConnection()
      
      if (!isConnected) {
        throw new Error('Failed to connect to Vertex AI')
      }
      
      return { connected: true }
    })
  }

  private async testHealthCheck(): Promise<VertexAITestResult> {
    return this.runTest('Health Check Test', async () => {
      const healthCheck = await this.service.healthCheck()
      
      if (!healthCheck.isHealthy) {
        throw new Error(`Health check failed: ${healthCheck.errors.join(', ')}`)
      }
      
      return healthCheck
    })
  }

  private async testListModels(): Promise<VertexAITestResult> {
    return this.runTest('List Models Test', async () => {
      const models = await this.service.listModels()
      
      return {
        modelCount: models.length,
        models: models.slice(0, 3), // Return first 3 models for brevity
      }
    })
  }

  private async testListEndpoints(): Promise<VertexAITestResult> {
    return this.runTest('List Endpoints Test', async () => {
      const endpoints = await this.service.listEndpoints()
      
      return {
        endpointCount: endpoints.length,
        endpoints: endpoints.slice(0, 3), // Return first 3 endpoints for brevity
      }
    })
  }

  private generateSummary() {
    const total = this.results.length
    const passed = this.results.filter(r => r.success).length
    const failed = total - passed
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)
    
    return {
      total,
      passed,
      failed,
      totalDuration,
    }
  }

  getResults(): VertexAITestResult[] {
    return [...this.results]
  }

  getLastResult(): VertexAITestResult | null {
    return this.results.length > 0 ? this.results[this.results.length - 1] : null
  }

  clearResults(): void {
    this.results = []
  }
}

// Utility functions for quick testing
export async function quickHealthCheck(): Promise<boolean> {
  try {
    const service = getVertexAIService()
    const healthCheck = await service.healthCheck()
    return healthCheck.isHealthy
  } catch (error) {
    console.error('Quick health check failed:', error)
    return false
  }
}

export async function quickConnectionTest(): Promise<boolean> {
  try {
    const service = getVertexAIService()
    return await service.testConnection()
  } catch (error) {
    console.error('Quick connection test failed:', error)
    return false
  }
}

export async function validateEnvironment(): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
}> {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required environment variables
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
    errors.push('GOOGLE_CLOUD_PROJECT_ID environment variable is required')
  }

  if (!process.env.GOOGLE_CLOUD_LOCATION) {
    warnings.push('GOOGLE_CLOUD_LOCATION not set, using default: us-central1')
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_PRIVATE_KEY) {
    warnings.push(
      'No explicit credentials found. Ensure you have run "gcloud auth application-default login" ' +
      'or set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_PRIVATE_KEY'
    )
  }

  // Test configuration
  try {
    vertexAIConfig.validateConfig()
  } catch (error) {
    errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// Create a singleton tester instance
let testerInstance: VertexAITester | null = null

export function getVertexAITester(): VertexAITester {
  if (!testerInstance) {
    testerInstance = new VertexAITester()
  }
  return testerInstance
}

export function resetVertexAITester(): void {
  testerInstance = null
}