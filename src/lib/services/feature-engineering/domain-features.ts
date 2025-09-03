/**
 * Domain-specific Feature Engineering
 * Generates business-specific features like holidays, client segments, business days
 */

import { isWeekend, isMonday, isFriday, format, getDay } from 'date-fns'

export interface DomainFeatures {
  clientSegments: string[]
  businessDayIndicators: number[]
  holidayEffects: number[]
  externalFactors: ExternalFactor[]
  clientTypeFeatures: ClientTypeFeature[]
  seasonalBusinessFactors: SeasonalBusinessFactor[]
}

export interface ExternalFactor {
  name: string
  value: number
  impact: number
  confidence: number
}

export interface ClientTypeFeature {
  clientId: string
  segment: string
  size: 'small' | 'medium' | 'large' | 'enterprise'
  industry: string
  riskLevel: number
  historicalVolatility: number
}

export interface SeasonalBusinessFactor {
  factor: string
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  strength: number
  phase: number
}

export interface HolidayDefinition {
  name: string
  date: Date
  impact: number
  type: 'national' | 'business' | 'cultural'
  affectedDays: number // Days before/after the holiday that are affected
}

export class DomainFeatureExtractor {
  private static readonly US_HOLIDAYS_2024: HolidayDefinition[] = [
    { name: 'New Year\'s Day', date: new Date('2024-01-01'), impact: 0.8, type: 'national', affectedDays: 2 },
    { name: 'Martin Luther King Jr. Day', date: new Date('2024-01-15'), impact: 0.3, type: 'national', affectedDays: 1 },
    { name: 'Presidents\' Day', date: new Date('2024-02-19'), impact: 0.3, type: 'national', affectedDays: 1 },
    { name: 'Memorial Day', date: new Date('2024-05-27'), impact: 0.5, type: 'national', affectedDays: 3 },
    { name: 'Independence Day', date: new Date('2024-07-04'), impact: 0.7, type: 'national', affectedDays: 2 },
    { name: 'Labor Day', date: new Date('2024-09-02'), impact: 0.5, type: 'national', affectedDays: 3 },
    { name: 'Columbus Day', date: new Date('2024-10-14'), impact: 0.2, type: 'national', affectedDays: 1 },
    { name: 'Veterans Day', date: new Date('2024-11-11'), impact: 0.3, type: 'national', affectedDays: 1 },
    { name: 'Thanksgiving', date: new Date('2024-11-28'), impact: 0.9, type: 'national', affectedDays: 4 },
    { name: 'Christmas Day', date: new Date('2024-12-25'), impact: 0.9, type: 'national', affectedDays: 5 }
  ]

  /**
   * Extract comprehensive domain-specific features
   */
  static extractDomainFeatures(
    timestamps: Date[],
    clientData: ClientTypeFeature[],
    config: {
      includeHolidays?: boolean
      includeBusinessDays?: boolean
      includeSeasonalFactors?: boolean
      customHolidays?: HolidayDefinition[]
    } = {}
  ): DomainFeatures {
    const {
      includeHolidays = true,
      includeBusinessDays = true,
      includeSeasonalFactors = true,
      customHolidays = []
    } = config

    const holidays = [...this.US_HOLIDAYS_2024, ...customHolidays]

    return {
      clientSegments: this.extractClientSegments(clientData),
      businessDayIndicators: includeBusinessDays ? this.generateBusinessDayIndicators(timestamps) : [],
      holidayEffects: includeHolidays ? this.generateHolidayEffects(timestamps, holidays) : [],
      externalFactors: this.generateExternalFactors(timestamps),
      clientTypeFeatures: clientData,
      seasonalBusinessFactors: includeSeasonalFactors ? this.generateSeasonalBusinessFactors(timestamps) : []
    }
  }

  /**
   * Extract client segments for feature engineering
   */
  private static extractClientSegments(clientData: ClientTypeFeature[]): string[] {
    const segments = new Set<string>()
    
    for (const client of clientData) {
      // Create composite segment identifier
      const segment = `${client.segment}_${client.size}_${client.industry}`
      segments.add(segment)
    }
    
    return Array.from(segments)
  }

  /**
   * Generate business day indicators
   */
  private static generateBusinessDayIndicators(timestamps: Date[]): number[] {
    return timestamps.map(date => {
      const dayOfWeek = getDay(date)
      
      // Business day features
      const isBusinessDay = !isWeekend(date) ? 1 : 0
      const isMondayEffect = isMonday(date) ? 1 : 0
      const isFridayEffect = isFriday(date) ? 1 : 0
      const isMiddleWeek = dayOfWeek >= 2 && dayOfWeek <= 4 ? 1 : 0
      
      // Combine into a single indicator (could be expanded to multiple features)
      return isBusinessDay * (1 + 0.1 * isMondayEffect + 0.1 * isFridayEffect + 0.2 * isMiddleWeek)
    })
  }

  /**
   * Generate holiday effects
   */
  private static generateHolidayEffects(timestamps: Date[], holidays: HolidayDefinition[]): number[] {
    return timestamps.map(date => {
      let holidayEffect = 0
      
      for (const holiday of holidays) {
        const daysDiff = Math.abs((date.getTime() - holiday.date.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff <= holiday.affectedDays) {
          // Effect decreases with distance from holiday
          const distanceEffect = 1 - (daysDiff / holiday.affectedDays)
          holidayEffect += holiday.impact * distanceEffect
        }
      }
      
      return Math.min(1, holidayEffect) // Cap at 1.0
    })
  }

  /**
   * Generate external factors that might influence transcript volumes
   */
  private static generateExternalFactors(timestamps: Date[]): ExternalFactor[] {
    const factors: ExternalFactor[] = []
    
    for (const date of timestamps) {
      const month = date.getMonth() + 1
      const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24))
      
      // Economic cycle factors
      factors.push({
        name: 'economic_cycle',
        value: Math.sin(2 * Math.PI * dayOfYear / 365), // Yearly economic cycle
        impact: 0.3,
        confidence: 0.7
      })
      
      // Seasonal business factors
      factors.push({
        name: 'seasonal_business',
        value: this.calculateSeasonalBusinessFactor(month),
        impact: 0.4,
        confidence: 0.8
      })
      
      // Market volatility (simplified)
      factors.push({
        name: 'market_volatility',
        value: Math.random() * 0.5 + 0.5, // Placeholder - would use real market data
        impact: 0.2,
        confidence: 0.6
      })
    }
    
    return factors
  }

  /**
   * Calculate seasonal business factor based on month
   */
  private static calculateSeasonalBusinessFactor(month: number): number {
    // Business activity patterns throughout the year
    const businessActivity = {
      1: 0.8,  // January - slow start
      2: 0.9,  // February - picking up
      3: 1.0,  // March - full activity
      4: 1.1,  // April - high activity
      5: 1.0,  // May - normal
      6: 0.9,  // June - summer slowdown starts
      7: 0.7,  // July - summer low
      8: 0.8,  // August - still slow
      9: 1.1,  // September - back to business
      10: 1.2, // October - peak activity
      11: 1.1, // November - high but holidays approaching
      12: 0.6  // December - holiday slowdown
    }
    
    return businessActivity[month as keyof typeof businessActivity] || 1.0
  }

  /**
   * Generate seasonal business factors
   */
  private static generateSeasonalBusinessFactors(timestamps: Date[]): SeasonalBusinessFactor[] {
    const factors: SeasonalBusinessFactor[] = []
    
    // Weekly patterns
    factors.push({
      factor: 'weekly_business_cycle',
      period: 'weekly',
      strength: 0.6,
      phase: 0 // Monday = 0
    })
    
    // Monthly patterns
    factors.push({
      factor: 'monthly_business_cycle',
      period: 'monthly',
      strength: 0.4,
      phase: 0.25 // Peak around day 7-8 of month
    })
    
    // Quarterly patterns
    factors.push({
      factor: 'quarterly_reporting_cycle',
      period: 'quarterly',
      strength: 0.8,
      phase: 0.9 // Peak at end of quarter
    })
    
    // Yearly patterns
    factors.push({
      factor: 'annual_business_cycle',
      period: 'yearly',
      strength: 0.5,
      phase: 0.75 // Peak in Q4
    })
    
    return factors
  }

  /**
   * Create client-specific features for a given client
   */
  static createClientSpecificFeatures(
    clientId: string,
    clientData: ClientTypeFeature[]
  ): Record<string, number> {
    const client = clientData.find(c => c.clientId === clientId)
    
    if (!client) {
      return {
        client_size_small: 0,
        client_size_medium: 0,
        client_size_large: 0,
        client_size_enterprise: 0,
        client_risk_level: 0.5,
        client_volatility: 0.5
      }
    }
    
    return {
      client_size_small: client.size === 'small' ? 1 : 0,
      client_size_medium: client.size === 'medium' ? 1 : 0,
      client_size_large: client.size === 'large' ? 1 : 0,
      client_size_enterprise: client.size === 'enterprise' ? 1 : 0,
      client_risk_level: client.riskLevel,
      client_volatility: client.historicalVolatility
    }
  }

  /**
   * Generate real-time domain features for a specific date
   */
  static generateRealTimeDomainFeatures(
    date: Date,
    clientId: string,
    clientData: ClientTypeFeature[]
  ): Record<string, number> {
    const businessDayIndicator = this.generateBusinessDayIndicators([date])[0]
    const holidayEffect = this.generateHolidayEffects([date], this.US_HOLIDAYS_2024)[0]
    const clientFeatures = this.createClientSpecificFeatures(clientId, clientData)
    const seasonalFactor = this.calculateSeasonalBusinessFactor(date.getMonth() + 1)
    
    return {
      business_day_indicator: businessDayIndicator,
      holiday_effect: holidayEffect,
      seasonal_business_factor: seasonalFactor,
      is_weekend: isWeekend(date) ? 1 : 0,
      is_monday: isMonday(date) ? 1 : 0,
      is_friday: isFriday(date) ? 1 : 0,
      ...clientFeatures
    }
  }

  /**
   * Calculate feature importance for domain features
   */
  static calculateDomainFeatureImportance(
    features: DomainFeatures,
    targetValues: number[]
  ): Record<string, number> {
    // Simplified feature importance calculation using correlation
    const importance: Record<string, number> = {}
    
    // Business day importance
    if (features.businessDayIndicators.length > 0) {
      importance.business_day_indicator = this.calculateCorrelation(
        features.businessDayIndicators,
        targetValues
      )
    }
    
    // Holiday effect importance
    if (features.holidayEffects.length > 0) {
      importance.holiday_effect = this.calculateCorrelation(
        features.holidayEffects,
        targetValues
      )
    }
    
    // Seasonal factors importance
    for (const factor of features.seasonalBusinessFactors) {
      importance[`seasonal_${factor.factor}`] = factor.strength
    }
    
    return importance
  }

  /**
   * Calculate correlation between two arrays
   */
  private static calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0
    
    const n = x.length
    const meanX = x.reduce((sum, val) => sum + val, 0) / n
    const meanY = y.reduce((sum, val) => sum + val, 0) / n
    
    let numerator = 0
    let sumXSquared = 0
    let sumYSquared = 0
    
    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX
      const deltaY = y[i] - meanY
      
      numerator += deltaX * deltaY
      sumXSquared += deltaX * deltaX
      sumYSquared += deltaY * deltaY
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared)
    return denominator > 0 ? numerator / denominator : 0
  }
}