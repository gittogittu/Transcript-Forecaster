import { NextRequest, NextResponse } from 'next/server'
import { AnomalyDetectionService } from '@/lib/services/anomaly-detection'
import { TimeSeriesData } from '@/lib/services/anomaly-detection/types'

// Global service instance for real-time monitoring
let globalAnomalyService: AnomalyDetectionService | null = null

function getAnomalyService(): AnomalyDetectionService {
  if (!globalAnomalyService) {
    globalAnomalyService = new AnomalyDetectionService()
  }
  return globalAnomalyService
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, clientId, data, historicalData } = body

    const anomalyService = getAnomalyService()

    switch (action) {
      case 'start':
        if (!clientId) {
          return NextResponse.json(
            { error: 'Client ID is required to start monitoring' },
            { status: 400 }
          )
        }

        // Initialize service if needed
        const trainingData = historicalData ? [historicalData] : []
        await anomalyService.initialize(trainingData)

        // Start monitoring for the client
        const historicalTimeSeriesData = historicalData ? {
          timestamps: historicalData.timestamps.map((ts: string | number) => new Date(ts)),
          values: historicalData.values,
          clientId,
          metadata: historicalData.metadata || {}
        } : undefined

        await anomalyService.startRealTimeMonitoring(clientId, historicalTimeSeriesData)

        return NextResponse.json({
          success: true,
          message: `Real-time monitoring started for client ${clientId}`,
          status: anomalyService.getMonitoringStatus()
        })

      case 'stop':
        await anomalyService.stopRealTimeMonitoring()
        return NextResponse.json({
          success: true,
          message: 'Real-time monitoring stopped',
          status: anomalyService.getMonitoringStatus()
        })

      case 'add_data':
        if (!clientId || !data) {
          return NextResponse.json(
            { error: 'Client ID and data are required to add monitoring data' },
            { status: 400 }
          )
        }

        const timeSeriesData: TimeSeriesData = {
          timestamps: data.timestamps.map((ts: string | number) => new Date(ts)),
          values: data.values,
          clientId,
          metadata: data.metadata || {}
        }

        await anomalyService.addRealTimeData(clientId, timeSeriesData)

        return NextResponse.json({
          success: true,
          message: `Data added for client ${clientId}`,
          dataPoints: data.timestamps.length
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Real-time monitoring error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process monitoring request',
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
    const limit = parseInt(searchParams.get('limit') || '50')

    const anomalyService = getAnomalyService()
    const status = anomalyService.getMonitoringStatus()

    let alerts = undefined
    if (clientId) {
      alerts = anomalyService.getClientAlerts(clientId, limit)
    }

    return NextResponse.json({
      success: true,
      status,
      alerts
    })

  } catch (error) {
    console.error('Error getting monitoring status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get monitoring status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertId } = body

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      )
    }

    const anomalyService = getAnomalyService()
    const acknowledged = anomalyService.acknowledgeAlert(alertId)

    if (!acknowledged) {
      return NextResponse.json(
        { error: 'Alert not found or already acknowledged' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Alert acknowledged successfully'
    })

  } catch (error) {
    console.error('Error acknowledging alert:', error)
    return NextResponse.json(
      { 
        error: 'Failed to acknowledge alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}