// Core data types for the transcript analytics platform

export interface TranscriptData {
  clientName: string
  month: string
  year: number
  transcriptCount: number
  createdAt: Date
  updatedAt: Date
}

export interface PredictionResult {
  clientName: string
  predictions: MonthlyPrediction[]
  confidence: number
  accuracy: number
  model: 'linear' | 'polynomial' | 'arima'
}

export interface MonthlyPrediction {
  month: string
  year: number
  predictedCount: number
  confidenceInterval: {
    lower: number
    upper: number
  }
}

export interface User {
  id: string
  email: string
  name: string
  image?: string
  role: 'admin' | 'user'
}
