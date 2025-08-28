/**
 * Mock prediction service for server-side rendering
 */

import { TranscriptData, PredictionResult, PredictionRequest, MonthlyPrediction } from '@/types/transcript'

export class MockPredictionService {
  async generatePredictions(
    clientName: string,
    data: TranscriptData[],
    request: PredictionRequest
  ): Promise<PredictionResult> {
    // Generate mock predictions for SSR
    const clientData = data.filter(d => d.clientName === clientName)
    
    if (clientData.length === 0) {
      throw new Error(`No data found for client ${clientName}`)
    }

    // Calculate simple trend-based predictions
    const recentData = clientData.slice(-6) // Last 6 months
    const avgVolume = recentData.reduce((sum, d) => sum + d.transcriptCount, 0) / recentData.length
    
    // Simple trend calculation
    let trend = 0
    if (recentData.length >= 2) {
      const firstHalf = recentData.slice(0, Math.floor(recentData.length / 2))
      const secondHalf = recentData.slice(Math.floor(recentData.length / 2))
      
      const firstAvg = firstHalf.reduce((sum, d) => sum + d.transcriptCount, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, d) => sum + d.transcriptCount, 0) / secondHalf.length
      
      trend = (secondAvg - firstAvg) / firstHalf.length
    }

    const predictions: MonthlyPrediction[] = []
    const lastDate = new Date(recentData[recentData.length - 1].month + '-01')

    for (let i = 1; i <= request.monthsAhead; i++) {
      const predictionDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1)
      const monthStr = predictionDate.toISOString().slice(0, 7) // YYYY-MM format
      
      // Apply trend with some seasonal variation
      const seasonalFactor = 1 + 0.1 * Math.sin(2 * Math.PI * (predictionDate.getMonth() + 1) / 12)
      const trendAdjustment = trend * i
      const predictedValue = Math.max(0, Math.round((avgVolume + trendAdjustment) * seasonalFactor))
      
      // Simple confidence calculation (decreases with distance)
      const confidence = Math.max(0.3, 0.9 - (i - 1) * 0.1)
      
      predictions.push({
        month: monthStr,
        predictedVolume: predictedValue,
        confidence,
        lowerBound: Math.max(0, Math.round(predictedValue * (1 - (1 - confidence) * 0.5))),
        upperBound: Math.round(predictedValue * (1 + (1 - confidence) * 0.5))
      })
    }

    return {
      clientName,
      predictions,
      confidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length,
      modelType: request.modelType,
      generatedAt: new Date().toISOString(),
      dataPoints: clientData.length,
      accuracy: 0.75, // Mock accuracy
      trends: {
        overall: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
        monthlyGrowthRate: trend,
        seasonalPattern: 'detected',
        volatility: 'low'
      }
    }
  }

  async trainModel(): Promise<any> {
    // Mock training - just return a simple object
    return {
      modelType: 'mock',
      trainedAt: new Date(),
      metrics: {
        accuracy: 0.75,
        precision: 0.75,
        recall: 0.75,
        meanAbsoluteError: 0.1,
        rootMeanSquareError: 0.15,
        r2Score: 0.7
      }
    }
  }

  isAvailable(): boolean {
    return true
  }
}

export const mockPredictionService = new MockPredictionService()