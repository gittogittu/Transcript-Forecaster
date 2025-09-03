/**
 * Feature Serving API Endpoint
 * Serves features for real-time predictions from Vertex AI Feature Store
 */

import { NextRequest, NextResponse } from 'next/server'
import { FeatureEngineeringPipeline } from '@/lib/services/feature-engineering'
import type { FeatureQuery, TimeSeriesData } from '@/lib/services/feature-engineering'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      clientId, 
      historicalData, 
      targetDate,
      featureQuery 
    }: {
      clientId: string
      historicalData?: TimeSeriesData
      targetDate?: string
      featureQuery?: FeatureQuery
    } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Initialize feature engineering pipeline
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
      featureStore: {
        featureStoreId: process.env.VERTEX_AI_FEATURE_STORE_ID || 'default-feature-store',
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
        location: process.env.VERTEX_AI_LOCATION || 'us-central1'
      }
    }

    const pipeline = new FeatureEngineeringPipeline(config)

    let result: any

    if (historicalData && targetDate) {
      // Generate real-time features for prediction
      const processedData: TimeSeriesData = {
        ...historicalData,
        timestamps: historicalData.timestamps.map(ts => new Date(ts))
      }

      const features = await pipeline.generateRealTimeFeatures(
        clientId,
        processedData,
        new Date(targetDate)
      )

      result = {
        type: 'real_time_features',
        clientId,
        targetDate,
        features,
        featureCount: Object.keys(features).length
      }

    } else if (featureQuery) {
      // Serve features from Feature Store
      const servingResult = await pipeline.serveFeatures(featureQuery)

      result = {
        type: 'feature_store_serving',
        ...servingResult
      }

    } else {
      return NextResponse.json(
        { error: 'Either historicalData+targetDate or featureQuery is required' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Feature serving error:', error)
    
    return NextResponse.json(
      { 
        error: 'Feature serving failed',
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
    const featureNames = searchParams.get('featureNames')?.split(',') || []
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Initialize feature engineering pipeline
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
      featureStore: {
        featureStoreId: process.env.VERTEX_AI_FEATURE_STORE_ID || 'default-feature-store',
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
        location: process.env.VERTEX_AI_LOCATION || 'us-central1'
      }
    }

    const pipeline = new FeatureEngineeringPipeline(config)

    // Create feature query
    const featureQuery: FeatureQuery = {
      entityType: 'client',
      entityIds: [clientId],
      featureSelector: {
        idMatcher: {
          ids: featureNames.length > 0 ? featureNames : [
            'lag_feature',
            'rolling_mean',
            'seasonal_indicator',
            'business_day_indicator',
            'holiday_effect'
          ]
        }
      },
      featureGroupId: 'transcript_features',
      featureNames: featureNames
    }

    const result = await pipeline.serveFeatures(featureQuery)

    return NextResponse.json({
      success: true,
      data: {
        clientId,
        features: result.features,
        timestamp: result.timestamp,
        availableFeatures: [
          'lag_feature',
          'rolling_mean',
          'rolling_std',
          'seasonal_indicator',
          'trend_component',
          'autocorr_lag_0',
          'autocorr_lag_1',
          'business_day_indicator',
          'holiday_effect',
          'client_size_small',
          'client_size_medium',
          'client_size_large',
          'client_size_enterprise'
        ]
      }
    })

  } catch (error) {
    console.error('Feature serving error:', error)
    
    return NextResponse.json(
      { 
        error: 'Feature serving failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}