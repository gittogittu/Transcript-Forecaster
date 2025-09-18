import { NextRequest, NextResponse } from 'next/server'
import { AnomalyDetectionService } from '@/lib/services/anomaly-detection'
import { DetectedAnomaly, TimeSeriesData } from '@/lib/services/anomaly-detection/types'

const anomalyService = new AnomalyDetectionService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { anomalies, data, historicalData, generateRecommendations = false } = body

    // Validate input
    if (!anomalies || !Array.isArray(anomalies)) {
      return NextResponse.json(
        { error: 'Anomalies array is required' },
        { status: 400 }
      )
    }

    if (!data || !Array.isArray(data.timestamps) || !Array.isArray(data.values)) {
      return NextResponse.json(
        { error: 'Invalid data format. Expected timestamps and values arrays.' },
        { status: 400 }
      )
    }

    // Convert input data
    const timeSeriesData: TimeSeriesData = {
      timestamps: data.timestamps.map((ts: string | number) => new Date(ts)),
      values: data.values,
      clientId: data.clientId || 'unknown',
      metadata: data.metadata || {}
    }

    const detectedAnomalies: DetectedAnomaly[] = anomalies.map((anomaly: any) => ({
      ...anomaly,
      timestamp: new Date(anomaly.timestamp)
    }))

    const historicalDataArray = historicalData ? 
      historicalData.map((hd: any) => ({
        timestamps: hd.timestamps.map((ts: string | number) => new Date(ts)),
        values: hd.values,
        clientId: hd.clientId || 'unknown',
        metadata: hd.metadata || {}
      })) : undefined

    // Initialize service if needed
    if (historicalDataArray) {
      await anomalyService.initialize(historicalDataArray)
    }

    // Generate explanations
    const explanations = await anomalyService.explainAnomalies(
      detectedAnomalies, 
      timeSeriesData, 
      historicalDataArray
    )

    // Generate recommendations if requested
    let recommendations: any = {}
    if (generateRecommendations) {
      for (const anomaly of detectedAnomalies) {
        const explanation = explanations.get(anomaly.id)
        if (explanation) {
          const anomalyRecommendations = await anomalyService.generateRecommendations(
            anomaly, 
            explanation, 
            timeSeriesData
          )
          recommendations[anomaly.id] = anomalyRecommendations
        }
      }
    }

    // Convert Map to object for JSON serialization
    const explanationsObj = Object.fromEntries(explanations.entries())

    return NextResponse.json({
      success: true,
      explanations: explanationsObj,
      recommendations: generateRecommendations ? recommendations : undefined
    })

  } catch (error) {
    console.error('Anomaly explanation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate explanations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const anomalyId = searchParams.get('anomalyId')

    if (!anomalyId) {
      return NextResponse.json(
        { error: 'Anomaly ID is required' },
        { status: 400 }
      )
    }

    // This would typically fetch from a database
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      message: 'Individual anomaly explanation endpoint - implementation depends on data storage strategy'
    })

  } catch (error) {
    console.error('Error getting anomaly explanation:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get explanation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}