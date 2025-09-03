/**
 * Feature Extraction API Endpoint
 * Extracts time-based, statistical, and domain features from transcript data
 */

import { NextRequest, NextResponse } from 'next/server'
import { FeatureEngineeringPipeline } from '@/lib/services/feature-engineering'
import type { TimeSeriesData, ClientTypeFeature } from '@/lib/services/feature-engineering'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      timeSeriesData, 
      clientData = [], 
      config 
    }: {
      timeSeriesData: TimeSeriesData
      clientData?: ClientTypeFeature[]
      config?: any
    } = body

    // Validate required data
    if (!timeSeriesData || !timeSeriesData.timestamps || !timeSeriesData.values) {
      return NextResponse.json(
        { error: 'Missing required time series data (timestamps and values)' },
        { status: 400 }
      )
    }

    if (timeSeriesData.timestamps.length !== timeSeriesData.values.length) {
      return NextResponse.json(
        { error: 'Timestamps and values arrays must have the same length' },
        { status: 400 }
      )
    }

    // Convert timestamp strings to Date objects
    const processedData: TimeSeriesData = {
      ...timeSeriesData,
      timestamps: timeSeriesData.timestamps.map(ts => new Date(ts))
    }

    // Initialize feature engineering pipeline with default config
    const defaultConfig = {
      timeFeatures: {
        lagPeriods: [1, 7, 14, 30],
        rollingWindows: [7, 14, 30],
        seasonalPeriods: [7, 30, 365]
      },
      statisticalFeatures: {
        maxLags: 20,
        seasonalPeriods: [7, 30, 365],
        changePointSensitivity: 0.05
      },
      domainFeatures: {
        includeHolidays: true,
        includeBusinessDays: true,
        includeSeasonalFactors: true
      },
      featureStore: {
        featureStoreId: process.env.VERTEX_AI_FEATURE_STORE_ID || 'default-feature-store',
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
        location: process.env.VERTEX_AI_LOCATION || 'us-central1'
      },
      ...config
    }

    const pipeline = new FeatureEngineeringPipeline(defaultConfig)

    // Process features
    const engineeredFeatures = await pipeline.processFeatures(processedData, clientData)

    return NextResponse.json({
      success: true,
      data: {
        features: engineeredFeatures,
        summary: {
          totalFeatures: engineeredFeatures.metadata.featureCount,
          processingTime: engineeredFeatures.metadata.processingTime,
          clientId: engineeredFeatures.metadata.clientId,
          timestamp: engineeredFeatures.metadata.timestamp
        }
      }
    })

  } catch (error) {
    console.error('Feature extraction error:', error)
    
    return NextResponse.json(
      { 
        error: 'Feature extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Return feature extraction configuration for the client
    const config = {
      timeFeatures: {
        lagPeriods: [1, 7, 14, 30],
        rollingWindows: [7, 14, 30],
        seasonalPeriods: [7, 30, 365]
      },
      statisticalFeatures: {
        maxLags: 20,
        seasonalPeriods: [7, 30, 365],
        changePointSensitivity: 0.05
      },
      domainFeatures: {
        includeHolidays: true,
        includeBusinessDays: true,
        includeSeasonalFactors: true
      },
      supportedFeatures: [
        'lag_features',
        'rolling_statistics',
        'seasonal_indicators',
        'trend_components',
        'autocorrelations',
        'stationarity_tests',
        'business_day_indicators',
        'holiday_effects',
        'client_segments'
      ]
    }

    return NextResponse.json({
      success: true,
      data: {
        clientId,
        config,
        featureStoreId: process.env.VERTEX_AI_FEATURE_STORE_ID || 'default-feature-store'
      }
    })

  } catch (error) {
    console.error('Feature configuration error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get feature configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}