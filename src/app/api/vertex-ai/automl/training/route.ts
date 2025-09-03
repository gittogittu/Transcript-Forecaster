// API Route: AutoML Training Job Management

import { NextRequest, NextResponse } from 'next/server'
import { getModelTrainingService, getModelVersioningService } from '@/lib/services/vertex-ai'
import type { TrainingJobConfig } from '@/lib/services/vertex-ai'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (jobId) {
      // Get specific training job status
      const trainingService = getModelTrainingService()
      const status = await trainingService.getTrainingJobStatus(jobId)

      return NextResponse.json({
        success: true,
        data: status
      })
    } else {
      // List training jobs (would need to implement in service)
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Training job listing not implemented yet'
      })
    }
  } catch (error) {
    console.error('Error getting training job:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get training job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      displayName,
      datasetId,
      targetColumn,
      timeColumn,
      forecastHorizon,
      optimizationObjective,
      budgetMilliNodeHours,
      contextWindow,
      dataGranularity,
      holidayRegions,
      featureColumns,
      timeSeriesIdentifierColumn,
      unavailableAtForecastColumns,
      availableAtForecastColumns,
      trainingFraction,
      validationFraction,
      testFraction,
      transformations
    } = body

    // Validate required fields
    if (!displayName || !datasetId || !targetColumn || !timeColumn || !forecastHorizon) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: displayName, datasetId, targetColumn, timeColumn, forecastHorizon'
        },
        { status: 400 }
      )
    }

    const config: TrainingJobConfig = {
      displayName,
      modelType: 'automl_forecasting',
      datasetId,
      targetColumn,
      timeColumn,
      featureColumns: featureColumns || [],
      optimizationObjective: optimizationObjective || 'minimize_rmse',
      budgetMilliNodeHours: budgetMilliNodeHours || 1000,
      forecastHorizon,
      contextWindow,
      dataGranularity,
      holidayRegions,
      timeSeriesIdentifierColumn,
      unavailableAtForecastColumns,
      availableAtForecastColumns,
      trainingFraction,
      validationFraction,
      testFraction,
      transformations
    }

    const trainingService = getModelTrainingService()
    const trainingJob = await trainingService.createTrainingJob(config)

    // Also create a model version entry for tracking
    const versioningService = getModelVersioningService()
    const modelVersion = await versioningService.createModelVersion(
      displayName,
      {
        datasetId,
        targetColumn,
        timeColumn,
        forecastHorizon,
        contextWindow: contextWindow || Math.max(forecastHorizon * 2, 50),
        optimizationObjective: optimizationObjective || 'minimize_rmse',
        budgetMilliNodeHours: budgetMilliNodeHours || 1000,
        dataGranularity,
        holidayRegions,
        featureColumns: featureColumns || [],
        hyperparameters: {},
        trainingDataSplit: {
          trainingFraction: trainingFraction || 0.8,
          validationFraction: validationFraction || 0.1,
          testFraction: testFraction || 0.1
        }
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        trainingJob,
        modelVersion
      }
    })
  } catch (error) {
    console.error('Error creating training job:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create training job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: jobId'
        },
        { status: 400 }
      )
    }

    const trainingService = getModelTrainingService()
    await trainingService.cancelTrainingJob(jobId)

    return NextResponse.json({
      success: true,
      message: 'Training job cancelled successfully'
    })
  } catch (error) {
    console.error('Error cancelling training job:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel training job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}