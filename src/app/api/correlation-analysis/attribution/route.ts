/**
 * API route for attribution analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { AttributionAnalysisService } from '@/lib/services/correlation-analysis/attribution-analysis'
import { z } from 'zod'

const attributionAnalysisSchema = z.object({
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
  influencingFactors: z.array(z.object({
    name: z.string(),
    correlation: z.number(),
    significance: z.number(),
    direction: z.enum(['positive', 'negative']),
    timeDelay: z.number(),
    confidence: z.number(),
    explanation: z.string(),
    importance: z.number(),
    statisticalTests: z.array(z.object({
      testType: z.enum(['pearson', 'spearman', 'kendall', 'granger_causality']),
      statistic: z.number(),
      pValue: z.number(),
      criticalValue: z.number().optional(),
      isSignificant: z.boolean(),
      confidenceLevel: z.number()
    }))
  })),
  changeDate: z.string().transform(str => new Date(str)),
  lookbackDays: z.number().min(1).max(90).default(30)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = attributionAnalysisSchema.parse(body)

    const attributionService = new AttributionAnalysisService()
    
    // Perform attribution analysis
    const attributionResult = await attributionService.analyzeVolumeAttribution(
      validatedData.transcriptData,
      validatedData.externalFactors,
      validatedData.influencingFactors,
      validatedData.changeDate,
      validatedData.lookbackDays
    )

    // Perform variance decomposition
    const varianceDecomposition = await attributionService.performVarianceDecomposition(
      validatedData.transcriptData,
      validatedData.influencingFactors
    )

    return NextResponse.json({
      success: true,
      data: {
        attribution: attributionResult,
        varianceDecomposition
      }
    })
  } catch (error) {
    console.error('Error in attribution analysis API:', error)
    
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

// Temporal attribution analysis endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = attributionAnalysisSchema.extend({
      endDate: z.string().transform(str => new Date(str)),
      intervalDays: z.number().min(1).max(30).default(7)
    }).parse(body)

    const attributionService = new AttributionAnalysisService()
    
    // Perform temporal attribution analysis
    const temporalAttributions = await attributionService.analyzeTemporalAttribution(
      validatedData.transcriptData,
      validatedData.externalFactors,
      validatedData.influencingFactors,
      validatedData.changeDate, // This becomes startDate in temporal analysis
      validatedData.endDate,
      validatedData.intervalDays
    )

    return NextResponse.json({
      success: true,
      data: {
        temporalAttributions,
        summary: {
          totalPeriods: temporalAttributions.length,
          averageExplainedVariance: temporalAttributions.reduce(
            (sum, attr) => sum + attr.totalExplainedVariance, 0
          ) / temporalAttributions.length,
          mostConsistentFactor: this.findMostConsistentFactor(temporalAttributions)
        }
      }
    })
  } catch (error) {
    console.error('Error in temporal attribution analysis API:', error)
    
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

// Helper function to find most consistent factor across time periods
function findMostConsistentFactor(temporalAttributions: any[]): string | null {
  const factorCounts = new Map<string, number>()
  
  temporalAttributions.forEach(attribution => {
    attribution.contributingFactors.forEach((factor: any) => {
      factorCounts.set(factor.factor, (factorCounts.get(factor.factor) || 0) + 1)
    })
  })
  
  if (factorCounts.size === 0) return null
  
  let mostConsistent = ''
  let maxCount = 0
  
  factorCounts.forEach((count, factor) => {
    if (count > maxCount) {
      maxCount = count
      mostConsistent = factor
    }
  })
  
  return mostConsistent
}