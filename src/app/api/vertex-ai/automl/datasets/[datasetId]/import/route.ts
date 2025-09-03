// API Route: Dataset Import

import { NextRequest, NextResponse } from 'next/server'
import { getDatasetPreparationService } from '@/lib/services/vertex-ai'
import type { DataSource } from '@/lib/services/vertex-ai'

export async function POST(
  request: NextRequest,
  { params }: { params: { datasetId: string } }
) {
  try {
    const { datasetId } = params
    const body = await request.json()
    const { dataSource, importDisplayName } = body

    if (!dataSource) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: dataSource'
        },
        { status: 400 }
      )
    }

    // Validate data source format
    if (!dataSource.gcsSource && !dataSource.bigquerySource) {
      return NextResponse.json(
        {
          success: false,
          error: 'Data source must have either gcsSource or bigquerySource'
        },
        { status: 400 }
      )
    }

    const datasetService = getDatasetPreparationService()
    const importJob = await datasetService.importDataToDataset(
      datasetId,
      dataSource as DataSource,
      importDisplayName
    )

    return NextResponse.json({
      success: true,
      data: importJob
    })
  } catch (error) {
    console.error('Error importing data to dataset:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to import data to dataset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}