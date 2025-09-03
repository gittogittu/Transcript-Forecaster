// API Route: Individual Dataset Management

import { NextRequest, NextResponse } from 'next/server'
import { getDatasetPreparationService } from '@/lib/services/vertex-ai'

export async function GET(
  request: NextRequest,
  { params }: { params: { datasetId: string } }
) {
  try {
    const { datasetId } = params

    const datasetService = getDatasetPreparationService()
    const dataset = await datasetService.getDataset(datasetId)

    return NextResponse.json({
      success: true,
      data: dataset
    })
  } catch (error) {
    console.error('Error getting dataset:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get dataset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { datasetId: string } }
) {
  try {
    const { datasetId } = params

    const datasetService = getDatasetPreparationService()
    await datasetService.deleteDataset(datasetId)

    return NextResponse.json({
      success: true,
      message: 'Dataset deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting dataset:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete dataset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}