// API Route: Model Evaluation

import { NextRequest, NextResponse } from 'next/server'
import { getModelEvaluationService } from '@/lib/services/vertex-ai'
import type { EvaluationConfig } from '@/lib/services/vertex-ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      modelId,
      metrics,
      confidenceLevels,
      crossValidationFolds,
      includeFeatureImportance,
      includeResidualAnalysis,
      includeSeasonalityAnalysis,
      evaluationDataSource
    } = body

    if (!modelId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: modelId'
        },
        { status: 400 }
      )
    }

    const config: EvaluationConfig = {
      evaluationDataSource,
      metrics: metrics || ['mae', 'rmse', 'mape', 'r2'],
      confidenceLevels: confidenceLevels || [0.95],
      crossValidationFolds,
      includeFeatureImportance: includeFeatureImportance ?? true,
      includeResidualAnalysis: includeResidualAnalysis ?? true,
      includeSeasonalityAnalysis: includeSeasonalityAnalysis ?? true
    }

    const evaluationService = getModelEvaluationService()
    const evaluation = await evaluationService.evaluateModel(modelId, config)

    return NextResponse.json({
      success: true,
      data: evaluation
    })
  } catch (error) {
    console.error('Error evaluating model:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to evaluate model',
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
    const modelId = searchParams.get('modelId')

    if (action === 'compare' && modelId) {
      const modelIds = modelId.split(',')
      
      if (modelIds.length < 2) {
        return NextResponse.json(
          {
            success: false,
            error: 'At least 2 model IDs required for comparison'
          },
          { status: 400 }
        )
      }

      const evaluationService = getModelEvaluationService()
      const comparison = await evaluationService.compareModels(modelIds)

      return NextResponse.json({
        success: true,
        data: comparison
      })
    }

    if (action === 'cross-validation' && modelId) {
      const folds = parseInt(searchParams.get('folds') || '5')
      
      const evaluationService = getModelEvaluationService()
      const cvResult = await evaluationService.performCrossValidation({}, folds)

      return NextResponse.json({
        success: true,
        data: cvResult
      })
    }

    if (action === 'explanation' && modelId) {
      const instances = JSON.parse(searchParams.get('instances') || '[]')
      
      const evaluationService = getModelEvaluationService()
      const explanation = await evaluationService.getModelExplanation(modelId, instances)

      return NextResponse.json({
        success: true,
        data: explanation
      })
    }

    if (action === 'trends' && modelId) {
      const timeWindow = (searchParams.get('timeWindow') as 'daily' | 'weekly' | 'monthly') || 'daily'
      
      const evaluationService = getModelEvaluationService()
      const trends = await evaluationService.calculateMetricTrends(modelId, timeWindow)

      return NextResponse.json({
        success: true,
        data: trends
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
    console.error('Error in evaluation endpoint:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process evaluation request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}