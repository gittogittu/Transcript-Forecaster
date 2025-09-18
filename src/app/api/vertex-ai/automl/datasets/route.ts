// API Route: Vertex AI AutoML Dataset Management

import { NextRequest, NextResponse } from 'next/server'
import { getDatasetPreparationService } from '@/lib/services/vertex-ai'
import type { TimeSeriesDatasetConfig, DataSource } from '@/lib/services/vertex-ai'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    const datasetService = getDatasetPreparationService()
    const datasets = await datasetService.listDatasets(filter || undefined, pageSize)

    return NextResponse.json({
      success: true,
      data: datasets,
      count: datasets.length
    })
  } catch (error) {
    console.error('Error listing datasets:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list datasets',
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
      description,
      targetColumn,
      timeColumn,
      timeSeriesIdentifierColumn,
      unavailableAtForecastColumns,
      availableAtForecastColumns,
      dataGranularity,
      holidayRegions,
      labels
    } = body

    if (!displayName || !targetColumn || !timeColumn) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: displayName, targetColumn, timeColumn'
        },
        { status: 400 }
      )
    }

    const config: TimeSeriesDatasetConfig = {
      displayName,
      description,
      metadataSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/time_series_1.0.0.yaml',
      targetColumn,
      timeColumn,
      timeSeriesIdentifierColumn,
      unavailableAtForecastColumns,
      availableAtForecastColumns,
      dataGranularity,
      holidayRegions,
      labels
    }

    const datasetService = getDatasetPreparationService()
    const dataset = await datasetService.createTimeSeriesDataset(config)

    return NextResponse.json({
      success: true,
      data: dataset
    })
  } catch (error) {
    console.error('Error creating dataset:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create dataset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}