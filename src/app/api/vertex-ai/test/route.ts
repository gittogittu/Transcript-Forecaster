// Vertex AI Test API Route

import { NextRequest, NextResponse } from 'next/server'
import { 
  getVertexAITester, 
  quickHealthCheck, 
  quickConnectionTest, 
  validateEnvironment 
} from '@/lib/services/vertex-ai/test-utils'
import { getVertexAIService } from '@/lib/services/vertex-ai'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testType = searchParams.get('type') || 'all'

    switch (testType) {
      case 'health':
        const isHealthy = await quickHealthCheck()
        return NextResponse.json({
          success: true,
          data: {
            testType: 'health',
            result: isHealthy,
            timestamp: new Date().toISOString(),
          },
        })

      case 'connection':
        const isConnected = await quickConnectionTest()
        return NextResponse.json({
          success: true,
          data: {
            testType: 'connection',
            result: isConnected,
            timestamp: new Date().toISOString(),
          },
        })

      case 'environment':
        const envValidation = await validateEnvironment()
        return NextResponse.json({
          success: true,
          data: {
            testType: 'environment',
            result: envValidation,
            timestamp: new Date().toISOString(),
          },
        })

      case 'all':
      default:
        const tester = getVertexAITester()
        const testResults = await tester.runAllTests()
        
        return NextResponse.json({
          success: testResults.success,
          data: {
            testType: 'comprehensive',
            ...testResults,
            timestamp: new Date().toISOString(),
          },
        })
    }
  } catch (error) {
    console.error('Vertex AI test failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'VERTEX_AI_TEST_FAILED',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, testType } = body

    const tester = getVertexAITester()

    switch (action) {
      case 'run-tests':
        const testResults = await tester.runAllTests()
        return NextResponse.json({
          success: testResults.success,
          data: testResults,
        })

      case 'clear-results':
        tester.clearResults()
        return NextResponse.json({
          success: true,
          data: { message: 'Test results cleared' },
        })

      case 'get-results':
        const results = tester.getResults()
        return NextResponse.json({
          success: true,
          data: { results },
        })

      case 'validate-environment':
        const envValidation = await validateEnvironment()
        return NextResponse.json({
          success: true,
          data: envValidation,
        })

      case 'get-service-metrics':
        const vertexAI = getVertexAIService()
        const metrics = await vertexAI.getServiceMetrics()
        return NextResponse.json({
          success: true,
          data: metrics,
        })

      case 'comprehensive-health-check':
        const vertexAIService = getVertexAIService()
        const comprehensiveHealth = await vertexAIService.healthCheck()
        return NextResponse.json({
          success: comprehensiveHealth.isHealthy,
          data: comprehensiveHealth,
        })

      case 'validate-model-deployment':
        if (!body.modelId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                message: 'modelId is required for model deployment validation',
                type: 'MISSING_PARAMETER',
              },
            },
            { status: 400 }
          )
        }
        
        const vertexAIForValidation = getVertexAIService()
        const validation = await vertexAIForValidation.validateModelDeployment(body.modelId)
        return NextResponse.json({
          success: validation.isValid,
          data: validation,
        })

      case 'optimize-endpoint':
        if (!body.endpointId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                message: 'endpointId is required for endpoint optimization',
                type: 'MISSING_PARAMETER',
              },
            },
            { status: 400 }
          )
        }
        
        const vertexAIForOptimization = getVertexAIService()
        const optimization = await vertexAIForOptimization.optimizeEndpointPerformance(body.endpointId)
        return NextResponse.json({
          success: true,
          data: optimization,
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              message: `Unknown action: ${action}`,
              type: 'INVALID_ACTION',
              availableActions: [
                'run-tests',
                'clear-results',
                'get-results',
                'validate-environment',
                'get-service-metrics',
                'comprehensive-health-check',
                'validate-model-deployment',
                'optimize-endpoint'
              ]
            },
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Vertex AI test action failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'VERTEX_AI_TEST_ACTION_FAILED',
        },
      },
      { status: 500 }
    )
  }
}