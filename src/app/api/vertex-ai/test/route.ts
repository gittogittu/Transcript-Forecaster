// Vertex AI Test API Route

import { NextRequest, NextResponse } from 'next/server'
import { 
  getVertexAITester, 
  quickHealthCheck, 
  quickConnectionTest, 
  validateEnvironment 
} from '@/lib/services/vertex-ai/test-utils'

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