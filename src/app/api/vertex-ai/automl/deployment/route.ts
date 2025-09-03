// API Route: Model Deployment Management

import { NextRequest, NextResponse } from 'next/server'
import { getModelDeploymentService } from '@/lib/services/vertex-ai'
import type { DeploymentConfig, DeploymentStrategy } from '@/lib/services/vertex-ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      modelId,
      endpointDisplayName,
      deployedModelDisplayName,
      machineType,
      minReplicaCount,
      maxReplicaCount,
      trafficPercentage,
      enableAutoScaling,
      autoScalingConfig,
      enableAccessLogging,
      enablePrivateEndpoint,
      labels,
      deploymentStrategy
    } = body

    if (!modelId || !endpointDisplayName || !deployedModelDisplayName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: modelId, endpointDisplayName, deployedModelDisplayName'
        },
        { status: 400 }
      )
    }

    const config: DeploymentConfig = {
      endpointDisplayName,
      deployedModelDisplayName,
      machineType: machineType || 'n1-standard-2',
      minReplicaCount: minReplicaCount || 1,
      maxReplicaCount: maxReplicaCount || 3,
      trafficPercentage: trafficPercentage || 100,
      enableAutoScaling: enableAutoScaling || false,
      autoScalingConfig,
      enableAccessLogging: enableAccessLogging || false,
      enablePrivateEndpoint: enablePrivateEndpoint || false,
      labels
    }

    const deploymentService = getModelDeploymentService()
    
    let deployment
    if (deploymentStrategy) {
      deployment = await deploymentService.deployWithStrategy(
        modelId,
        config,
        deploymentStrategy as DeploymentStrategy
      )
    } else {
      deployment = await deploymentService.deployModel(modelId, config)
    }

    return NextResponse.json({
      success: true,
      data: deployment
    })
  } catch (error) {
    console.error('Error deploying model:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to deploy model',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const endpointId = searchParams.get('endpointId')

    if (action === 'status' && endpointId) {
      const deploymentService = getModelDeploymentService()
      const status = await deploymentService.getEndpointStatus(endpointId)

      return NextResponse.json({
        success: true,
        data: status
      })
    }

    if (action === 'list') {
      const filter = searchParams.get('filter')
      const deploymentService = getModelDeploymentService()
      const endpoints = await deploymentService.listEndpoints(filter || undefined)

      return NextResponse.json({
        success: true,
        data: endpoints
      })
    }

    if (action === 'monitor' && endpointId) {
      const deployedModelId = searchParams.get('deployedModelId')
      const durationMinutes = parseInt(searchParams.get('duration') || '30')

      if (!deployedModelId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required parameter: deployedModelId'
          },
          { status: 400 }
        )
      }

      const deploymentService = getModelDeploymentService()
      const monitoring = await deploymentService.monitorDeployment(
        endpointId,
        deployedModelId,
        durationMinutes
      )

      return NextResponse.json({
        success: true,
        data: monitoring
      })
    }

    if (action === 'history' && endpointId) {
      const deploymentService = getModelDeploymentService()
      const history = await deploymentService.getDeploymentHistory(endpointId)

      return NextResponse.json({
        success: true,
        data: history
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action or missing parameters'
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in deployment endpoint:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process deployment request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, endpointId, deployedModelId, trafficSplit, minReplicas, maxReplicas, targetDeployedModelId, reason } = body

    if (!action || !endpointId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: action, endpointId'
        },
        { status: 400 }
      )
    }

    const deploymentService = getModelDeploymentService()

    switch (action) {
      case 'updateTraffic':
        if (!trafficSplit) {
          return NextResponse.json(
            { success: false, error: 'Missing trafficSplit for updateTraffic action' },
            { status: 400 }
          )
        }
        await deploymentService.updateTrafficSplit(endpointId, trafficSplit)
        break

      case 'scale':
        if (!deployedModelId || minReplicas === undefined || maxReplicas === undefined) {
          return NextResponse.json(
            { success: false, error: 'Missing deployedModelId, minReplicas, or maxReplicas for scale action' },
            { status: 400 }
          )
        }
        await deploymentService.scaleEndpoint(endpointId, deployedModelId, minReplicas, maxReplicas)
        break

      case 'rollback':
        if (!targetDeployedModelId) {
          return NextResponse.json(
            { success: false, error: 'Missing targetDeployedModelId for rollback action' },
            { status: 400 }
          )
        }
        await deploymentService.rollbackDeployment(endpointId, targetDeployedModelId, reason || 'Manual rollback')
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `${action} completed successfully`
    })
  } catch (error) {
    console.error('Error updating deployment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update deployment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpointId = searchParams.get('endpointId')
    const deployedModelId = searchParams.get('deployedModelId')

    if (!endpointId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: endpointId'
        },
        { status: 400 }
      )
    }

    const deploymentService = getModelDeploymentService()

    if (deployedModelId) {
      // Undeploy specific model
      await deploymentService.undeployModel(endpointId, deployedModelId)
      return NextResponse.json({
        success: true,
        message: 'Model undeployed successfully'
      })
    } else {
      // Delete entire endpoint
      await deploymentService.deleteEndpoint(endpointId)
      return NextResponse.json({
        success: true,
        message: 'Endpoint deleted successfully'
      })
    }
  } catch (error) {
    console.error('Error deleting deployment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete deployment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}