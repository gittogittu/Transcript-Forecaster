import { NextRequest, NextResponse } from 'next/server'
import { AnomalyDetectionService } from '@/lib/services/anomaly-detection'
import { TimeSeriesData } from '@/lib/services/anomaly-detection/types'

// Initialize the anomaly detection service
const anomalyService = new AnomalyDetectionService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, clientId, includeExplanations = false, historicalData } = body

    // Validate input data
    if (!data || !Array.isArray(data.timestamps) || !Array.isArray(data.values)) {
      return NextResponse.json(
        { error: 'Invalid data format. Expected timestamps and values arrays.' },
        { status: 400 }
      )
    }

    if (data.timestamps.length !== data.values.length) {
      return NextResponse.json(
        { error: 'Timestamps and values arrays must have the same length.' },
        { status: 400 }
      )
    }

    // Convert timestamps to Date objects
    const timeSeriesData: TimeSeriesData = {
      timestamps: data.timestamps.map((ts: string | number) => new Date(ts)),
      values: data.values,
      clientId: clientId || 'unknown',
      metadata: data.metadata || {}
    }

    // Initialize service if not already done
    if (!anomalyService.getMonitoringStatus) {
      const trainingData = historicalData ? [historicalData] : []
      await anomalyService.initialize(trainingData)
    }

    // Detect anomalies
    const result = await anomalyService.detectAnomalies(timeSeriesData)

    // Generate explanations if requested
    let explanations: Map<string, any> | undefined
    if (includeExplanations && result.anomalies.length > 0) {
      const historicalDataArray = historicalData ? [historicalData] : undefined
      explanations = await anomalyService.explainAnomalies(
        result.anomalies, 
        timeSeriesData, 
        historicalDataArray
      )
    }

    // Convert explanations Map to object for JSON serialization
    const explanationsObj = explanations ? 
      Object.fromEntries(explanations.entries()) : undefined

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        explanations: explanationsObj
      }
    })

  } catch (error) {
    console.error('Anomaly detection error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to detect anomalies',
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

    // Get monitoring status and recent alerts
    const status = anomalyService.getMonitoringStatus()
    const alerts = anomalyService.getClientAlerts(clientId, 20)

    return NextResponse.json({
      success: true,
      status,
      alerts
    })

  } catch (error) {
    console.error('Error getting anomaly detection status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}