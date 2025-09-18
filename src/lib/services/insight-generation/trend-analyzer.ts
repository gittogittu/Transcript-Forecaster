import { TrendAnalysis, DateRange, DataPoint, SeasonalPattern, ChangePoint, TrendForecast } from './types'

export class TrendAnalyzer {
  async analyzeTrends(data: any, timeRange: DateRange): Promise<TrendAnalysis> {
    try {
      const timeSeries = this.extractTimeSeries(data)
      
      // Perform various trend analyses
      const direction = this.detectTrendDirection(timeSeries)
      const strength = this.calculateTrendStrength(timeSeries)
      const significance = this.calculateTrendSignificance(timeSeries)
      const changeRate = this.calculateChangeRate(timeSeries)
      const seasonality = await this.detectSeasonality(timeSeries)
      const changePoints = this.detectChangePoints(timeSeries)
      const forecast = this.generateTrendForecast(timeSeries, direction, strength)

      return {
        direction,
        strength,
        significance,
        changeRate,
        seasonality,
        changePoints,
        forecast
      }
    } catch (error) {
      console.error('Error analyzing trends:', error)
      throw new Error(`Trend analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private extractTimeSeries(data: any): DataPoint[] {
    // Extract time series data from the input data structure
    // This is a placeholder - in real implementation, this would parse the actual data
    return data.timeSeries || []
  }

  private detectTrendDirection(timeSeries: DataPoint[]): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    if (timeSeries.length < 2) return 'stable'

    const values = timeSeries.map(point => point.value)
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))

    const firstHalfMean = this.calculateMean(firstHalf)
    const secondHalfMean = this.calculateMean(secondHalf)
    const volatility = this.calculateVolatility(values)

    // If volatility is very high, classify as volatile
    if (volatility > 0.3) return 'volatile'

    const changePercent = (secondHalfMean - firstHalfMean) / firstHalfMean
    
    if (Math.abs(changePercent) < 0.05) return 'stable'
    return changePercent > 0 ? 'increasing' : 'decreasing'
  }

  private calculateTrendStrength(timeSeries: DataPoint[]): number {
    if (timeSeries.length < 3) return 0

    const values = timeSeries.map(point => point.value)
    const linearRegression = this.performLinearRegression(values)
    
    // R-squared value indicates trend strength
    return Math.abs(linearRegression.rSquared)
  }

  private calculateTrendSignificance(timeSeries: DataPoint[]): number {
    if (timeSeries.length < 3) return 0

    const values = timeSeries.map(point => point.value)
    const linearRegression = this.performLinearRegression(values)
    
    // Calculate p-value for trend significance
    // This is a simplified calculation - in practice, you'd use proper statistical tests
    const tStatistic = Math.abs(linearRegression.slope) / linearRegression.standardError
    const pValue = this.calculatePValue(tStatistic, values.length - 2)
    
    return 1 - pValue // Convert p-value to significance score
  }

  private calculateChangeRate(timeSeries: DataPoint[]): number {
    if (timeSeries.length < 2) return 0

    const values = timeSeries.map(point => point.value)
    const firstValue = values[0]
    const lastValue = values[values.length - 1]
    
    if (firstValue === 0) return 0
    
    return (lastValue - firstValue) / firstValue
  }

  private async detectSeasonality(timeSeries: DataPoint[]): Promise<SeasonalPattern[]> {
    const patterns: SeasonalPattern[] = []
    
    if (timeSeries.length < 14) return patterns // Need at least 2 weeks of data

    // Detect different seasonal patterns
    const dailyPattern = this.detectDailySeasonality(timeSeries)
    const weeklyPattern = this.detectWeeklySeasonality(timeSeries)
    const monthlyPattern = this.detectMonthlySeasonality(timeSeries)
    const yearlyPattern = this.detectYearlySeasonality(timeSeries)

    if (dailyPattern.strength > 0.3) patterns.push(dailyPattern)
    if (weeklyPattern.strength > 0.3) patterns.push(weeklyPattern)
    if (monthlyPattern.strength > 0.3) patterns.push(monthlyPattern)
    if (yearlyPattern.strength > 0.3) patterns.push(yearlyPattern)

    return patterns
  }

  private detectDailySeasonality(timeSeries: DataPoint[]): SeasonalPattern {
    // Simplified daily seasonality detection
    const hourlyAverages = new Array(24).fill(0)
    const hourlyCounts = new Array(24).fill(0)

    timeSeries.forEach(point => {
      const hour = point.timestamp.getHours()
      hourlyAverages[hour] += point.value
      hourlyCounts[hour]++
    })

    // Calculate averages
    for (let i = 0; i < 24; i++) {
      if (hourlyCounts[i] > 0) {
        hourlyAverages[i] /= hourlyCounts[i]
      }
    }

    const variance = this.calculateVariance(hourlyAverages)
    const strength = Math.min(variance / this.calculateMean(hourlyAverages), 1)

    return {
      type: 'daily',
      strength,
      period: 24,
      phase: this.findPeakHour(hourlyAverages),
      confidence: strength > 0.3 ? 0.8 : 0.4
    }
  }

  private detectWeeklySeasonality(timeSeries: DataPoint[]): SeasonalPattern {
    const dailyAverages = new Array(7).fill(0)
    const dailyCounts = new Array(7).fill(0)

    timeSeries.forEach(point => {
      const dayOfWeek = point.timestamp.getDay()
      dailyAverages[dayOfWeek] += point.value
      dailyCounts[dayOfWeek]++
    })

    for (let i = 0; i < 7; i++) {
      if (dailyCounts[i] > 0) {
        dailyAverages[i] /= dailyCounts[i]
      }
    }

    const variance = this.calculateVariance(dailyAverages)
    const strength = Math.min(variance / this.calculateMean(dailyAverages), 1)

    return {
      type: 'weekly',
      strength,
      period: 7,
      phase: this.findPeakDay(dailyAverages),
      confidence: strength > 0.3 ? 0.8 : 0.4
    }
  }

  private detectMonthlySeasonality(timeSeries: DataPoint[]): SeasonalPattern {
    // Simplified monthly seasonality - would need more sophisticated analysis in practice
    return {
      type: 'monthly',
      strength: 0.2, // Placeholder
      period: 30,
      phase: 15,
      confidence: 0.5
    }
  }

  private detectYearlySeasonality(timeSeries: DataPoint[]): SeasonalPattern {
    // Simplified yearly seasonality - would need more sophisticated analysis in practice
    return {
      type: 'yearly',
      strength: 0.1, // Placeholder
      period: 365,
      phase: 180,
      confidence: 0.3
    }
  }

  private detectChangePoints(timeSeries: DataPoint[]): ChangePoint[] {
    const changePoints: ChangePoint[] = []
    
    if (timeSeries.length < 10) return changePoints

    const values = timeSeries.map(point => point.value)
    const windowSize = Math.max(5, Math.floor(values.length / 10))

    for (let i = windowSize; i < values.length - windowSize; i++) {
      const beforeWindow = values.slice(i - windowSize, i)
      const afterWindow = values.slice(i, i + windowSize)
      
      const beforeMean = this.calculateMean(beforeWindow)
      const afterMean = this.calculateMean(afterWindow)
      
      const magnitude = Math.abs(afterMean - beforeMean)
      const relativeMagnitude = magnitude / beforeMean
      
      // Detect significant changes
      if (relativeMagnitude > 0.2) {
        changePoints.push({
          timestamp: timeSeries[i].timestamp,
          magnitude: relativeMagnitude,
          direction: afterMean > beforeMean ? 'increase' : 'decrease',
          confidence: Math.min(relativeMagnitude * 2, 1),
          explanation: `Significant ${afterMean > beforeMean ? 'increase' : 'decrease'} of ${(relativeMagnitude * 100).toFixed(1)}%`
        })
      }
    }

    return changePoints
  }

  private generateTrendForecast(
    timeSeries: DataPoint[], 
    direction: string, 
    strength: number
  ): TrendForecast {
    const values = timeSeries.map(point => point.value)
    const linearRegression = this.performLinearRegression(values)
    
    return {
      nextPeriods: 30, // Forecast for next 30 periods
      expectedDirection: direction === 'increasing' ? 'up' : direction === 'decreasing' ? 'down' : 'stable',
      confidence: strength,
      expectedChange: linearRegression.slope * 30 // Expected change over 30 periods
    }
  }

  // Utility methods
  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  private calculateVariance(values: number[]): number {
    const mean = this.calculateMean(values)
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return this.calculateMean(squaredDiffs)
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0
    
    const returns = []
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        returns.push((values[i] - values[i - 1]) / values[i - 1])
      }
    }
    
    return Math.sqrt(this.calculateVariance(returns))
  }

  private performLinearRegression(values: number[]): {
    slope: number
    intercept: number
    rSquared: number
    standardError: number
  } {
    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)
    
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = values.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = values.reduce((sum, val) => sum + val * val, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    // Calculate R-squared
    const yMean = sumY / n
    const totalSumSquares = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0)
    const residualSumSquares = values.reduce((sum, val, i) => {
      const predicted = slope * i + intercept
      return sum + Math.pow(val - predicted, 2)
    }, 0)
    
    const rSquared = 1 - (residualSumSquares / totalSumSquares)
    
    // Calculate standard error
    const standardError = Math.sqrt(residualSumSquares / (n - 2)) / Math.sqrt(sumXX - (sumX * sumX) / n)
    
    return { slope, intercept, rSquared, standardError }
  }

  private calculatePValue(tStatistic: number, degreesOfFreedom: number): number {
    // Simplified p-value calculation - in practice, use proper statistical library
    const absT = Math.abs(tStatistic)
    if (absT > 3) return 0.001
    if (absT > 2.5) return 0.01
    if (absT > 2) return 0.05
    if (absT > 1.5) return 0.1
    return 0.2
  }

  private findPeakHour(hourlyAverages: number[]): number {
    let maxValue = -Infinity
    let peakHour = 0
    
    hourlyAverages.forEach((avg, hour) => {
      if (avg > maxValue) {
        maxValue = avg
        peakHour = hour
      }
    })
    
    return peakHour
  }

  private findPeakDay(dailyAverages: number[]): number {
    let maxValue = -Infinity
    let peakDay = 0
    
    dailyAverages.forEach((avg, day) => {
      if (avg > maxValue) {
        maxValue = avg
        peakDay = day
      }
    })
    
    return peakDay
  }
}