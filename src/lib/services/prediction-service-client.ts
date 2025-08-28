/**
 * Client-side wrapper for prediction service to avoid SSR issues
 */

import { TranscriptData, PredictionResult, PredictionRequest } from '@/types/transcript'
import { mockPredictionService } from './prediction-service-mock'

export class ClientPredictionService {
  private static instance: ClientPredictionService | null = null
  private predictionService: any = null
  private isInitialized = false

  private constructor() {}

  static getInstance(): ClientPredictionService {
    if (!ClientPredictionService.instance) {
      ClientPredictionService.instance = new ClientPredictionService()
    }
    return ClientPredictionService.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // For now, use mock service until TensorFlow.js SSR issues are resolved
      this.predictionService = mockPredictionService
      this.isInitialized = true
      console.log('Using mock prediction service')
    } catch (error) {
      console.error('Failed to initialize prediction service:', error)
      throw error
    }
  }

  async generatePredictions(
    clientName: string,
    data: TranscriptData[],
    request: PredictionRequest
  ): Promise<PredictionResult> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!this.predictionService) {
      throw new Error('Prediction service not initialized')
    }

    return this.predictionService.generatePredictions(clientName, data, request)
  }

  async trainModel(
    clientName: string,
    data: TranscriptData[],
    modelType: 'linear' | 'polynomial' = 'linear'
  ): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!this.predictionService) {
      throw new Error('Prediction service not initialized')
    }

    return this.predictionService.trainModel(clientName, data, modelType)
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && this.isInitialized
  }
}

// Export singleton instance
export const clientPredictionService = ClientPredictionService.getInstance()