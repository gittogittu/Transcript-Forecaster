/**
 * Feature Update API Endpoint
 * Updates features with new data and manages feature store ingestion
 */

import { NextRequest, NextResponse } from 'next/server'
import { FeatureEngineeringPipeline } from '@/lib/services/feature-engineering'
import type { TimeSeriesData, ClientTypeFeature } from '@/lib/services/feature-engineering'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      clientId, 
      newData, 
      clientData = [],
      incrementalUpdate = true 
    }: {
      clientId: string
      newData: TimeSeriesData
      clientData?: ClientTypeFeature[]
      incrementalUpdate?: boolean
    } = body

    // Validate required data
    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    if (!newData || !newData.timestamps || !newData.values) {
      return NextResponse.json(
        { error: 'Missing required new data (timestamps and values)' },
        { status: 400 }
      )
    }

    if (newData.timestamps.length !== newData.values.length) {
      return NextResponse.json(
        { error: 'Timestamps and values arrays must have the same length' },
        { status: 400 }
      )
    }

    // Convert timestamp strings to Date objects
    const processedData: TimeSeriesData = {
      ...newData,
      clientId,
      timestamps: newData.timestamps.map(ts => new Date(ts))
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

    // Set client data if provided
    if (clientData.length > 0) {
      pipeline.setClientData(clientData)
    }

    // Update features
    await pipeline.updateFeatures(clientId, processedData)

    // Generate updated features for response
    const updatedFeatures = await pipeline.processFeatures(processedData, clientData)

    return NextResponse.json({
      success: true,
      data: {
        clientId,
        updateType: incrementalUpdate ? 'incremental' : 'full',
        updatedFeatures: {
          featureCount: updatedFeatures.metadata.featureCount,
          processingTime: updatedFeatures.metadata.processingTime,
          timestamp: updatedFeatures.metadata.timestamp
        },
        featureImportance: updatedFeatures.featureImportance,
        summary: {
          timeFeatures: Object.keys(updatedFeatures.timeFeatures).length,
          statisticalFeatures: Object.keys(updatedFeatures.statisticalFeatures).length,
          domainFeatures: Object.keys(updatedFeatures.domainFeatures).length,
          combinedFeatures: Object.keys(updatedFeatures.combinedFeatures).length
        }
      }
    })

  } catch (error) {
    console.error('Feature update error:', error)
    
    return NextResponse.json(
      { 
        error: 'Feature update failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      clientId, 
      clientData 
    }: {
      clientId: string
      clientData: ClientTypeFeature[]
    } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    if (!clientData || !Array.isArray(clientData)) {
      return NextResponse.json(
        { error: 'Client data array is required' },
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

    // Update client data
    pipeline.setClientData(clientData)

    // Find the specific client
    const client = clientData.find(c => c.clientId === clientId)
    
    if (!client) {
      return NextResponse.json(
        { error: `Client ${clientId} not found in provided client data` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        clientId,
        updatedClient: client,
        totalClients: clientData.length,
        message: 'Client data updated successfully'
      }
    })

  } catch (error) {
    console.error('Client data update error:', error)
    
    return NextResponse.json(
      { 
        error: 'Client data update failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}