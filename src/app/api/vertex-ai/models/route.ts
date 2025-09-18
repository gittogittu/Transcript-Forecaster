// Vertex AI Models API Routes

import { NextRequest, NextResponse } from 'next/server'
import { getVertexAIService, isVertexAIError } from '@/lib/services/vertex-ai'
import { z } from 'zod'

// Validation schemas
const CreateModelSchema = z.object({
  displayName: z.string().min(1).max(128),
  modelType: z.enum(['automl_forecasting', 'custom_training']),
  dataSourceUri: z.string().url(),
  targetColumn: z.string().min(1),
  timeColumn: z.string().min(1),
  featureColumns: z.array(z.string()).optional(),
  forecastHorizon: z.number().min(1).max(1000),
  contextWindow: z.number().min(1).optional(),
  optimizationObjective: z.enum(['minimize_rmse', 'minimize_mae', 'minimize_mape']).optional(),
  budgetMilliNodeHours: z.number().min(100).max(100000).optional(),
})

const ListModelsSchema = z.object({
  filter: z.string().optional(),
  pageSize: z.number().min(1).max(100).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = {
      filter: searchParams.get('filter') || undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined,
    }

    // Validate query parameters
    const validatedParams = ListModelsSchema.parse(queryParams)

    const vertexAIService = getVertexAIService()
    const models = await vertexAIService.listModels(validatedParams.filter)

    return NextResponse.json({
      success: true,
      data: {
        models,
        count: models.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to list Vertex AI models:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid query parameters',
            type: 'VALIDATION_ERROR',
            details: error.issues,
          },
        },
        { status: 400 }
      )
    }

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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = CreateModelSchema.parse(body)

    const vertexAIService = getVertexAIService()
    
    // Create AutoML forecasting model
    const trainingJob = await vertexAIService.createAutoMLForecastingModel({
      ...validatedData,
      featureColumns: validatedData.featureColumns || [],
      optimizationObjective: validatedData.optimizationObjective || 'minimize_rmse',
      datasetId: undefined, // Will be created from dataSourceUri
    })

    return NextResponse.json({
      success: true,
      data: {
        trainingJob,
        message: 'Model training job created successfully',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to create Vertex AI model:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid request data',
            type: 'VALIDATION_ERROR',
            details: error.issues,
          },
        },
        { status: 400 }
      )
    }

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
}