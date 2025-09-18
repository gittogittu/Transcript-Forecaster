import type {
  ComparativeAnalysis,
  ComparisonMetric,
  CrossSectionalPrediction,
  CrossSectionalAggregation,
  SegmentPrediction
} from '@/types/multi-dimensional-forecasting'
import type { ForecastResult } from '@/types/multi-dimensional-forecasting'

export class MultiDimensionalAnalysisService {
  buildCrossSectional(
    segments: Array<{ segmentId: string; forecast: ForecastResult; weight?: number }>,
    aggregations: CrossSectionalAggregation[]
  ): CrossSectionalPrediction {
    const predictions: SegmentPrediction[] = segments.map((s) => ({
      segmentId: s.segmentId,
      forecast: s.forecast,
      relativePerformance: 0
    }))
    // Simple relative performance: normalized last-point value
    const lastValues = predictions.map((p) =>
      p.forecast.predictions[p.forecast.predictions.length - 1]?.predictedValue || 0
    )
    const max = Math.max(1e-9, ...lastValues)
    predictions.forEach((p, idx) => {
      p.relativePerformance = max > 0 ? lastValues[idx] / max : 0
    })

    return {
      id: 'cross-sectional-1',
      name: 'Cross-Sectional Forecast',
      dimensions: [],
      segments: segments.map((s) => ({ id: s.segmentId, name: s.segmentId, dimensionValues: {}, isActive: true })),
      aggregationRules: aggregations,
      predictions
    }
  }

  buildComparative(
    groups: Array<{ id: string; metrics: Record<string, number> }>,
    metrics: ComparisonMetric[]
  ): ComparativeAnalysis {
    const results = groups.map((g) => ({
      dimensionValues: { id: g.id },
      metrics: g.metrics,
      rank: 0,
      percentile: 0
    }))
    // Rank by first metric
    if (metrics.length > 0) {
      const key = metrics[0].id
      const sorted = [...results].sort((a, b) => (b.metrics[key] || 0) - (a.metrics[key] || 0))
      sorted.forEach((r, idx) => {
        r.rank = idx + 1
        r.percentile = Math.round(((sorted.length - idx) / sorted.length) * 100)
      })
    }
    return {
      id: 'comparative-1',
      name: 'Comparative Analysis',
      dimensions: [],
      comparisonMetrics: metrics,
      results,
      insights: []
    }
  }
}

let singleton: MultiDimensionalAnalysisService | null = null
export function getMultiDimensionalAnalysisService(): MultiDimensionalAnalysisService {
  if (!singleton) singleton = new MultiDimensionalAnalysisService()
  return singleton
}


