export interface AHTData {
  client: string
  overallAHT: number
  reviewAHT: number
  validationAHT: number
  monthlyData: {
    [key: string]: number // e.g., "2024_Jun": 0, "2024_Jul": 252
  }
  grandTotal: number
}

export interface AHTSummary {
  totalClients: number
  averageAHT: number
  medianAHT: number
  highestAHT: { client: string; value: number }
  lowestAHT: { client: string; value: number }
  totalVolume: number
}

export interface MonthlyTrend {
  month: string
  totalVolume: number
  averageAHT: number
  clientCount: number
}

export interface ClientPerformance {
  client: string
  overallAHT: number
  trend: 'increasing' | 'decreasing' | 'stable'
  trendPercentage: number
  riskLevel: 'low' | 'medium' | 'high'
  monthlyVolumes: Array<{ month: string; volume: number }>
}