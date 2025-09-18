import { NextRequest, NextResponse } from 'next/server'
import { AnomalyDetectionService } from '@/lib/services/anomaly-detection'

const anomalyService = new AnomalyDetectionService()

export async function GET(request: NextRequest) {
  try {
    const configuration = anomalyService.getConfiguration()

    return NextResponse.json({
      success: true,
      configuration
    })

  } catch (error) {
    console.error('Error getting configuration:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { statistical, isolationForest, realTimeMonitor } = body

    // Validate configuration objects
    if (statistical && typeof statistical !== 'object') {
      return NextResponse.json(
        { error: 'Statistical configuration must be an object' },
        { status: 400 }
      )
    }

    if (isolationForest && typeof isolationForest !== 'object') {
      return NextResponse.json(
        { error: 'Isolation forest configuration must be an object' },
        { status: 400 }
      )
    }

    if (realTimeMonitor && typeof realTimeMonitor !== 'object') {
      return NextResponse.json(
        { error: 'Real-time monitor configuration must be an object' },
        { status: 400 }
      )
    }

    // Update configuration
    await anomalyService.updateConfiguration({
      statistical,
      isolationForest,
      realTimeMonitor
    })

    const updatedConfiguration = anomalyService.getConfiguration()

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      configuration: updatedConfiguration
    })

  } catch (error) {
    console.error('Error updating configuration:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, trainingData } = body

    switch (action) {
      case 'retrain':
        if (!trainingData || !Array.isArray(trainingData)) {
          return NextResponse.json(
            { error: 'Training data array is required for retraining' },
            { status: 400 }
          )
        }

        // Convert training data
        const convertedTrainingData = trainingData.map((data: any) => ({
          timestamps: data.timestamps.map((ts: string | number) => new Date(ts)),
          values: data.values,
          clientId: data.clientId || 'unknown',
          metadata: data.metadata || {}
        }))

        await anomalyService.updateModels(convertedTrainingData)

        return NextResponse.json({
          success: true,
          message: 'Models retrained successfully',
          trainingDataSets: convertedTrainingData.length,
          totalDataPoints: convertedTrainingData.reduce((sum, data) => sum + data.values.length, 0)
        })

      case 'validate':
        // This would typically validate against labeled test data
        // For now, return a placeholder response
        return NextResponse.json({
          success: true,
          message: 'Model validation endpoint - implementation depends on labeled test data availability'
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error processing configuration action:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}