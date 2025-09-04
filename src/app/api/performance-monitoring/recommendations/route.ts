import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitoringService, createOptimizationRecommender } from '@/lib/services/performance-monitoring'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')

    if (!modelId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Model ID is required' 
        },
        { status: 400 }
      )
    }

    const recommendations = await performanceMonitoringService.getOptimizationRecommendations(modelId)
    
    return NextResponse.json({
      success: true,
      data: recommendations
    })
  } catch (error) {
    console.error('Failed to get optimization recommendations:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve optimization recommendations' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { modelId, selectedRecommendations } = await request.json()
    
    if (!modelId || !selectedRecommendations || !Array.isArray(selectedRecommendations)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Model ID and selected recommendations array are required' 
        },
        { status: 400 }
      )
    }

    const optimizationPlan = await performanceMonitoringService.generateOptimizationPlan(
      modelId, 
      selectedRecommendations
    )
    
    return NextResponse.json({
      success: true,
      data: optimizationPlan
    })
  } catch (error) {
    console.error('Failed to generate optimization plan:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate optimization plan' 
      },
      { status: 500 }
    )
  }
}