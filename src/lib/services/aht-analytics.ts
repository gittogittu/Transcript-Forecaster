import type { AHTData, AHTSummary, MonthlyTrend, ClientPerformance } from '@/types/aht'
import { ahtData, monthLabels, monthDisplayNames } from '@/lib/data/aht-data'

export class AHTAnalyticsService {
  private data: AHTData[]

  constructor(data: AHTData[] = ahtData) {
    this.data = data
  }

  // Get summary statistics
  getSummary(): AHTSummary {
    const validClients = this.data.filter(client => client.overallAHT > 0)
    const ahtValues = validClients.map(client => client.overallAHT)
    
    const totalVolume = this.data.reduce((sum, client) => sum + client.grandTotal, 0)
    const averageAHT = ahtValues.reduce((sum, aht) => sum + aht, 0) / ahtValues.length
    
    // Calculate median
    const sortedAHT = [...ahtValues].sort((a, b) => a - b)
    const medianAHT = sortedAHT.length % 2 === 0
      ? (sortedAHT[sortedAHT.length / 2 - 1] + sortedAHT[sortedAHT.length / 2]) / 2
      : sortedAHT[Math.floor(sortedAHT.length / 2)]

    // Find highest and lowest AHT
    const highestClient = validClients.reduce((max, client) => 
      client.overallAHT > max.overallAHT ? client : max
    )
    const lowestClient = validClients.reduce((min, client) => 
      client.overallAHT < min.overallAHT ? client : min
    )

    return {
      totalClients: validClients.length,
      averageAHT: Math.round(averageAHT * 100) / 100,
      medianAHT: Math.round(medianAHT * 100) / 100,
      highestAHT: { client: highestClient.client, value: highestClient.overallAHT },
      lowestAHT: { client: lowestClient.client, value: lowestClient.overallAHT },
      totalVolume
    }
  }

  // Get monthly trends
  getMonthlyTrends(): MonthlyTrend[] {
    return monthLabels.map((month, index) => {
      const monthlyVolumes = this.data.map(client => client.monthlyData[month] || 0)
      const totalVolume = monthlyVolumes.reduce((sum, vol) => sum + vol, 0)
      const activeClients = monthlyVolumes.filter(vol => vol > 0).length
      
      // Calculate weighted average AHT for the month
      let weightedAHTSum = 0
      let totalWeightedVolume = 0
      
      this.data.forEach(client => {
        const volume = client.monthlyData[month] || 0
        if (volume > 0) {
          weightedAHTSum += client.overallAHT * volume
          totalWeightedVolume += volume
        }
      })
      
      const averageAHT = totalWeightedVolume > 0 ? weightedAHTSum / totalWeightedVolume : 0

      return {
        month: monthDisplayNames[index],
        totalVolume,
        averageAHT: Math.round(averageAHT * 100) / 100,
        clientCount: activeClients
      }
    })
  }

  // Get client performance analysis
  getClientPerformance(): ClientPerformance[] {
    return this.data
      .filter(client => client.overallAHT > 0)
      .map(client => {
        const monthlyVolumes = monthLabels.map(month => ({
          month: month.replace('_', ' '),
          volume: client.monthlyData[month] || 0
        }))

        // Calculate trend (comparing first half vs second half of data)
        const firstHalf = monthLabels.slice(0, 6).reduce((sum, month) => 
          sum + (client.monthlyData[month] || 0), 0
        )
        const secondHalf = monthLabels.slice(6).reduce((sum, month) => 
          sum + (client.monthlyData[month] || 0), 0
        )

        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
        let trendPercentage = 0

        if (firstHalf > 0 && secondHalf > 0) {
          trendPercentage = ((secondHalf - firstHalf) / firstHalf) * 100
          if (Math.abs(trendPercentage) > 10) {
            trend = trendPercentage > 0 ? 'increasing' : 'decreasing'
          }
        } else if (secondHalf > firstHalf) {
          trend = 'increasing'
          trendPercentage = 100
        } else if (firstHalf > secondHalf) {
          trend = 'decreasing'
          trendPercentage = -100
        }

        // Determine risk level based on AHT and volume
        let riskLevel: 'low' | 'medium' | 'high' = 'low'
        if (client.overallAHT > 15 && client.grandTotal > 5000) {
          riskLevel = 'high'
        } else if (client.overallAHT > 10 || client.grandTotal > 3000) {
          riskLevel = 'medium'
        }

        return {
          client: client.client,
          overallAHT: client.overallAHT,
          trend,
          trendPercentage: Math.round(trendPercentage * 100) / 100,
          riskLevel,
          monthlyVolumes
        }
      })
      .sort((a, b) => b.overallAHT - a.overallAHT) // Sort by AHT descending
  }

  // Get top clients by volume
  getTopClientsByVolume(limit: number = 10): Array<{ client: string; volume: number; aht: number }> {
    return this.data
      .filter(client => client.grandTotal > 0)
      .sort((a, b) => b.grandTotal - a.grandTotal)
      .slice(0, limit)
      .map(client => ({
        client: client.client,
        volume: client.grandTotal,
        aht: client.overallAHT
      }))
  }

  // Get clients with highest AHT
  getHighestAHTClients(limit: number = 10): Array<{ client: string; aht: number; volume: number }> {
    return this.data
      .filter(client => client.overallAHT > 0)
      .sort((a, b) => b.overallAHT - a.overallAHT)
      .slice(0, limit)
      .map(client => ({
        client: client.client,
        aht: client.overallAHT,
        volume: client.grandTotal
      }))
  }

  // Predict future AHT trends (simple linear regression)
  predictNextMonthAHT(): Array<{ client: string; predictedAHT: number; confidence: number }> {
    return this.data
      .filter(client => client.overallAHT > 0)
      .map(client => {
        const recentMonths = monthLabels.slice(-6) // Last 6 months
        const recentVolumes = recentMonths.map(month => client.monthlyData[month] || 0)
        const activeMonths = recentVolumes.filter(vol => vol > 0)
        
        // Simple prediction based on recent trend
        let predictedAHT = client.overallAHT
        let confidence = 0.5 // Base confidence
        
        if (activeMonths.length >= 3) {
          const trend = (recentVolumes[recentVolumes.length - 1] - recentVolumes[0]) / recentVolumes.length
          const volatility = this.calculateVolatility(recentVolumes)
          
          // Adjust prediction based on trend
          if (trend > 0) {
            predictedAHT *= 1.05 // Slight increase if volume trending up
          } else if (trend < 0) {
            predictedAHT *= 0.95 // Slight decrease if volume trending down
          }
          
          // Confidence based on data consistency
          confidence = Math.max(0.3, Math.min(0.9, 1 - volatility))
        }
        
        return {
          client: client.client,
          predictedAHT: Math.round(predictedAHT * 100) / 100,
          confidence: Math.round(confidence * 100) / 100
        }
      })
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 1
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)
    
    return mean > 0 ? stdDev / mean : 1
  }
}