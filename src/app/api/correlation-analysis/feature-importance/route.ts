/**
 * API route for feature importance analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { FeatureImportanceAnalyzer } from '@/lib/services/correlation-analysis/feature-importance'
import { z } from 'zod'

const featureImportanceSchema = z.object({
  modelId: z.string(),
  transcriptData: z.object({
    timestamps: z.array(z.string().transform(str => new Date(str))),
    values: z.array(z.number()),
    clientId: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }),
  externalFactors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['holiday', 'weather', 'economic', 'seasonal', 'day_of_week', 'custom']),
    date: z.string().transform(str => new Date(str)),
    value: z.number(),
    description: z.string().optional(),
    source: z.string().optional()
  })),
  clientId: z.string().optional()
})

const multiModelComparisonSchema = z.object({
  modelIds: z.array(z.string()).min(2).max(10),
  transcriptData: z.object({
    timestamps: z.array(z.string().transform(str => new Date(str))),
    values: z.array(z.number()),
    clientId: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }),
  externalFactors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['holiday', 'weather', 'economic', 'seasonal', 'day_of_week', 'custom']),
    date: z.string().transform(str => new Date(str)),
    value: z.number(),
    description: z.string().optional(),
    source: z.string().optional()
  }))
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = featureImportanceSchema.parse(body)

    const featureImportanceAnalyzer = new FeatureImportanceAnalyzer()
    
    // Analyze feature importance
    const featureImportance = await featureImportanceAnalyzer.analyzeFeatureImportance(
      validatedData.modelId,
      validatedData.transcriptData,
      validatedData.externalFactors,
      validatedData.clientId
    )

    // Categorize features by type
    const categorizedFeatures = {
      time: featureImportance.filter(f => f.category === 'time'),
      statistical: featureImportance.filter(f => f.category === 'statistical'),
      domain: featureImportance.filter(f => f.category === 'domain'),
      external: featureImportance.filter(f => f.category === 'external')
    }

    // Calculate summary statistics
    const summary = {
      totalFeatures: featureImportance.length,
      topFeature: featureImportance[0]?.feature || 'None',
      averageImportance: featureImportance.length > 0 ? 
        featureImportance.reduce((sum, f) => sum + f.importance, 0) / featureImportance.length : 0,
      categoryDistribution: {
        time: categorizedFeatures.time.length,
        statistical: categorizedFeatures.statistical.length,
        domain: categorizedFeatures.domain.length,
        external: categorizedFeatures.external.length
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        featureImportance,
        categorizedFeatures,
        summary
      }
    })
  } catch (error) {
    console.error('Error in feature importance analysis API:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Multi-model comparison endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = multiModelComparisonSchema.parse(body)

    const featureImportanceAnalyzer = new FeatureImportanceAnalyzer()
    
    // Compare feature importance across models
    const comparison = await featureImportanceAnalyzer.compareFeatureImportanceAcrossModels(
      validatedData.modelIds,
      validatedData.transcriptData,
      validatedData.externalFactors
    )

    // Generate insights about model agreement
    const modelAgreementInsights = {
      consensusFeatureCount: comparison.consensusFeatures.length,
      divergentFeatureCount: comparison.divergentFeatures.length,
      modelConsistency: comparison.consensusFeatures.length / 
        (comparison.consensusFeatures.length + comparison.divergentFeatures.length),
      topConsensusFeature: comparison.consensusFeatures[0]?.feature || 'None',
      mostDivergentFeature: comparison.divergentFeatures[0]?.feature || 'None'
    }

    return NextResponse.json({
      success: true,
      data: {
        modelComparison: comparison.modelComparison,
        consensusFeatures: comparison.consensusFeatures,
        divergentFeatures: comparison.divergentFeatures,
        insights: modelAgreementInsights
      }
    })
  } catch (error) {
    console.error('Error in multi-model feature importance comparison API:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    
    if (!modelId) {
      return NextResponse.json(
        { success: false, error: 'Model ID is required' },
        { status: 400 }
      )
    }

    // This would typically fetch cached feature importance results from the database
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      data: {
        modelId,
        lastAnalyzed: new Date().toISOString(),
        availableFeatures: [
          'day_of_week',
          'is_weekend', 
          'month',
          'quarter',
          'days_since_epoch',
          'external_holidays',
          'external_weather'
        ],
        cachedResults: null
      }
    })
  } catch (error) {
    console.error('Error fetching feature importance data:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}