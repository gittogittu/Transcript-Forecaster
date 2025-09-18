// Individual Vertex AI Model API Routes

import { NextRequest, NextResponse } from 'next/server'
import { getVertexAIService, isVertexAIError } from '@/lib/services/vertex-ai'

interface RouteParams {
  params: {
    modelId: string
  }
}

function handleError(error: unknown, context: string) {
  console.error(context, error)

  if (isVertexAIError(error)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          type: 'VERTEX_AI_ERROR',
          code: error.code,
          status: error.status,
        },
      },
      { status: error.code || 500 }
    )
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'INTERNAL_ERROR',
      },
    },
    { status: 500 }
  )
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { modelId } = params

    if (!modelId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Model ID is required',
            type: 'MISSING_PARAMETER',
          },
        },
        { status: 400 }
      )
    }

    const vertexAIService = getVertexAIService()
    const model = await vertexAIService.getModel(modelId)

    return NextResponse.json({
      success: true,
      data: {
        model,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return handleError(error, `Failed to get Vertex AI model ${params.modelId}:`)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { modelId } = params

    if (!modelId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Model ID is required',
            type: 'MISSING_PARAMETER',
          },
        },
        { status: 400 }
      )
    }

    const vertexAIService = getVertexAIService()
    await vertexAIService.deleteModel(modelId)

    return NextResponse.json({
      success: true,
      data: {
        message: `Model ${modelId} deleted successfully`,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return handleError(error, `Failed to delete Vertex AI model ${params.modelId}:`)
  }
}