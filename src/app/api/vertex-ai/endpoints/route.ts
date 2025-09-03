// Vertex AI Endpoints API Routes

import { NextRequest, NextResponse } from 'next/server'
import { getVertexAIService, isVertexAIError } from '@/lib/services/vertex-ai'
import { z } from 'zod'

// Validation schemas
const CreateEndpointSchema = z.object({
  displayName: z.string().min(1).max(128),
  description: z.string().max(500).optional(),
})

const DeployModelSchema = z.object({
  modelId: z.string().min(1),
  endpointDisplayName: z.string().min(1).max(128),
  machineType: z.string().optional(),
  minReplicaCount: z.number().min(1).max(100).optional(),
  maxReplicaCount: z.number().min(1).max(100).optional(),
  trafficPercentage: z.number().min(0).max(100).optional(),
})

const ListEndpointsSchema = z.object({
  filter: z.string().optional(),
  pageSize: z.number().min(1).max(100).optional(),
})

function handleError(error: unknown, context: string) {
  console.error(context, error)

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Validation error',
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = {
      filter: searchParams.get('filter') || undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined,
    }

    // Validate query parameters
    const validatedParams = ListEndpointsSchema.parse(queryParams)

    const vertexAIService = getVertexAIService()
    const endpoints = await vertexAIService.listEndpoints(validatedParams.filter)

    return NextResponse.json({
      success: true,
      data: {
        endpoints,
        count: endpoints.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return handleError(error, 'Failed to list Vertex AI endpoints:')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    const vertexAIService = getVertexAIService()

    switch (action) {
      case 'create-endpoint':
        // Validate request body for endpoint creation
        const endpointData = CreateEndpointSchema.parse(body)
        
        const endpoint = await vertexAIService.createEndpoint(
          endpointData.displayName,
          endpointData.description
        )

        return NextResponse.json({
          success: true,
          data: {
            endpoint,
            message: 'Endpoint created successfully',
            timestamp: new Date().toISOString(),
          },
        })

      case 'deploy-model':
        // Validate request body for model deployment
        const deployData = DeployModelSchema.parse(body)
        
        const deployment = await vertexAIService.deployModel(
          deployData.modelId,
          deployData.endpointDisplayName,
          {
            machineType: deployData.machineType,
            minReplicaCount: deployData.minReplicaCount,
            maxReplicaCount: deployData.maxReplicaCount,
            trafficPercentage: deployData.trafficPercentage,
          }
        )

        return NextResponse.json({
          success: true,
          data: {
            deployment,
            message: 'Model deployed successfully',
            timestamp: new Date().toISOString(),
          },
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              message: `Unknown action: ${action}`,
              type: 'INVALID_ACTION',
            },
          },
          { status: 400 }
        )
    }
  } catch (error) {
    return handleError(error, 'Failed to process Vertex AI endpoint request:')
  }
}