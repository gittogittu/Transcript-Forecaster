import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getMultiDimensionalForecastingService } from '@/lib/services/forecasting/multi-dimensional-forecasting'

const requestSchema = z.object({
  request: z.object({
    name: z.string(),
    dimensions: z.array(z.object({
      dimensionType: z.string(),
      values: z.array(z.string()),
      hierarchyConfig: z.object({
        levels: z.array(z.string()),
        parentChildMappings: z.record(z.string())
      }).optional(),
      aggregationMethod: z.string()
    })),
    reconciliationMethod: z.enum(['bottom_up', 'top_down', 'middle_out', 'optimal']),
    forecastHorizon: z.number().min(1).max(365),
    confidenceLevel: z.number().min(0.5).max(0.99),
    includeComparativeAnalysis: z.boolean().default(false),
    customAggregationRules: z.array(z.any()).optional()
  }),
  series: z.array(z.object({
    dimensionValueId: z.string(),
    data: z.object({
      timestamps: z.array(z.string().transform((s) => new Date(s))),
      values: z.array(z.number()),
      clientId: z.string().optional(),
      metadata: z.record(z.any()).optional()
    })
  })).min(1)
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const { request: req, series } = requestSchema.parse(json)

    const service = getMultiDimensionalForecastingService()
    const result = await service.generate({ request: req as any, series: series as any })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Multi-dimensional forecast failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    )
  }
}


