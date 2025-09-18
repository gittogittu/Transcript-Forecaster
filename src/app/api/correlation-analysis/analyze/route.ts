/**
 * API route for correlation analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { CorrelationAnalysisService } from '@/lib/services/correlation-analysis/correlation-analysis-service'
import { z } from 'zod'

const correlationAnalysisSchema = z.object({
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
  request: z.object({
    clientId: z.string().optional(),
    startDate: z.string().transform(str => new Date(str)),
    endDate: z.string().transform(str => new Date(str)),
    includeExternalFactors: z.boolean().default(true),
    significanceLevel: z.number().min(0.001).max(0.1).default(0.05),
    maxTimeDelay: z.number().min(0).max(30).default(7),
    analysisType: z.enum(['correlation', 'causality', 'attribution', 'all']).default('all')
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = correlationAnalysisSchema.parse(body)

    const correlationService = new CorrelationAnalysisService()
    
    // Perform correlation analysis
    const analysisResult = await correlationService.performCorrelationAnalysis(
      validatedData.transcriptData,
      validatedData.externalFactors,
      validatedData.request
    )

    // Generate visualizations
    const visualizations = await correlationService.generateVisualizations(analysisResult)

    // Generate recommendations
    const recommendations = correlationService.generateRecommendations(analysisResult)

    return NextResponse.json({
      success: true,
      data: {
        analysis: analysisResult,
        visualizations,
        recommendations
      }
    })
  } catch (error) {
    console.error('Error in correlation analysis API:', error)
    
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
    const clientId = searchParams.get('clientId')
    
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // This would typically fetch recent analysis results from the database
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      data: {
        recentAnalyses: [],
        availableFactors: [
          { name: 'day_of_week', type: 'temporal' },
          { name: 'is_weekend', type: 'temporal' },
          { name: 'month', type: 'seasonal' },
          { name: 'holidays', type: 'calendar' }
        ]
      }
    })
  } catch (error) {
    console.error('Error fetching correlation analysis data:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}