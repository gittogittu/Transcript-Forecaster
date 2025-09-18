/**
 * API route for correlation trend analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { CorrelationAnalysisService } from '@/lib/services/correlation-analysis/correlation-analysis-service'
import { z } from 'zod'

const trendAnalysisSchema = z.object({
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
    analysisType: z.enum(['correlation', 'causality', 'attribution', 'all']).default('correlation')
  }),
  windowSizeDays: z.number().min(7).max(90).default(30),
  stepSizeDays: z.number().min(1).max(30).default(7)
})

const segmentComparisonSchema = z.object({
  segmentData: z.array(z.object({
    segment: z.string(),
    data: z.object({
      timestamps: z.array(z.string().transform(str => new Date(str))),
      values: z.array(z.number()),
      clientId: z.string().optional(),
      metadata: z.record(z.any()).optional()
    })
  })).min(2).max(10),
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
    startDate: z.string().transform(str => new Date(str)),
    endDate: z.string().transform(str => new Date(str)),
    includeExternalFactors: z.boolean().default(true),
    significanceLevel: z.number().min(0.001).max(0.1).default(0.05),
    maxTimeDelay: z.number().min(0).max(30).default(7),
    analysisType: z.enum(['correlation', 'causality', 'attribution', 'all']).default('correlation')
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = trendAnalysisSchema.parse(body)

    const correlationService = new CorrelationAnalysisService()
    
    // Analyze correlation trends over time
    const trendAnalysis = await correlationService.analyzeCorrelationTrends(
      validatedData.transcriptData,
      validatedData.externalFactors,
      validatedData.request,
      validatedData.windowSizeDays,
      validatedData.stepSizeDays
    )

    // Generate trend insights
    const trendInsights = {
      totalWindows: trendAnalysis.trends.length,
      strongestTrendingFactor: trendAnalysis.trendSummary[0]?.factor || 'None',
      averageTrendStrength: trendAnalysis.trendSummary.length > 0 ?
        trendAnalysis.trendSummary.reduce((sum, t) => sum + t.trendStrength, 0) / trendAnalysis.trendSummary.length : 0,
      increasingFactors: trendAnalysis.trendSummary.filter(t => t.correlationTrend === 'increasing').length,
      decreasingFactors: trendAnalysis.trendSummary.filter(t => t.correlationTrend === 'decreasing').length,
      stableFactors: trendAnalysis.trendSummary.filter(t => t.correlationTrend === 'stable').length
    }

    return NextResponse.json({
      success: true,
      data: {
        trends: trendAnalysis.trends,
        trendSummary: trendAnalysis.trendSummary,
        insights: trendInsights
      }
    })
  } catch (error) {
    console.error('Error in correlation trend analysis API:', error)
    
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

// Segment comparison endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = segmentComparisonSchema.parse(body)

    const correlationService = new CorrelationAnalysisService()
    
    // Compare correlations across segments
    const segmentComparison = await correlationService.compareCorrelationsAcrossSegments(
      validatedData.segmentData,
      validatedData.externalFactors,
      validatedData.request
    )

    // Generate segment insights
    const segmentInsights = {
      totalSegments: segmentComparison.segmentComparisons.length,
      universalFactorCount: segmentComparison.crossSegmentInsights.universalFactors.length,
      mostVariableFactor: segmentComparison.crossSegmentInsights.correlationDifferences[0]?.factor || 'None',
      segmentSpecificityScore: this.calculateSegmentSpecificityScore(segmentComparison.crossSegmentInsights),
      strongestUniversalFactor: this.findStrongestUniversalFactor(segmentComparison)
    }

    return NextResponse.json({
      success: true,
      data: {
        segmentComparisons: segmentComparison.segmentComparisons,
        crossSegmentInsights: segmentComparison.crossSegmentInsights,
        insights: segmentInsights
      }
    })
  } catch (error) {
    console.error('Error in segment correlation comparison API:', error)
    
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
    const timeRange = searchParams.get('timeRange') || '90d'
    
    // This would typically fetch recent trend analysis results from the database
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      data: {
        clientId,
        timeRange,
        recentTrends: [],
        availableSegments: [
          'enterprise',
          'mid-market', 
          'small-business',
          'by-industry',
          'by-region'
        ],
        trendingFactors: [
          { factor: 'day_of_week', trend: 'stable', strength: 0.8 },
          { factor: 'seasonal_patterns', trend: 'increasing', strength: 0.6 },
          { factor: 'economic_indicators', trend: 'decreasing', strength: 0.4 }
        ]
      }
    })
  } catch (error) {
    console.error('Error fetching trend analysis data:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateSegmentSpecificityScore(crossSegmentInsights: any): number {
  const totalFactors = crossSegmentInsights.universalFactors.length + 
    crossSegmentInsights.segmentSpecificFactors.reduce((sum: number, seg: any) => sum + seg.factors.length, 0)
  
  if (totalFactors === 0) return 0
  
  const specificFactors = crossSegmentInsights.segmentSpecificFactors.reduce(
    (sum: number, seg: any) => sum + seg.factors.length, 0
  )
  
  return specificFactors / totalFactors
}

function findStrongestUniversalFactor(segmentComparison: any): string {
  const universalFactors = segmentComparison.crossSegmentInsights.universalFactors
  
  if (universalFactors.length === 0) return 'None'
  
  // Find the universal factor with the highest average correlation across segments
  let strongestFactor = universalFactors[0]
  let highestAvgCorrelation = 0
  
  universalFactors.forEach((factor: string) => {
    const correlations = segmentComparison.segmentComparisons.map((seg: any) => {
      const factorData = seg.correlations.influencingFactors.find((f: any) => f.name === factor)
      return factorData ? Math.abs(factorData.correlation) : 0
    })
    
    const avgCorrelation = correlations.reduce((sum: number, corr: number) => sum + corr, 0) / correlations.length
    
    if (avgCorrelation > highestAvgCorrelation) {
      highestAvgCorrelation = avgCorrelation
      strongestFactor = factor
    }
  })
  
  return strongestFactor
}