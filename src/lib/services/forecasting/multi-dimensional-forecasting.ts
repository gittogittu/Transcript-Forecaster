import type {
  MultiDimensionalForecastRequest,
  HierarchicalForecast,
  ForecastResult,
  ReconciliationMethod,
  ForecastDimensionConfig
} from '@/types/multi-dimensional-forecasting'
import type { TimeSeriesData, ForecastingRequest, ForecastingResult } from './intelligent-forecasting-engine'
import { intelligentForecastingEngine } from './intelligent-forecasting-engine'

export interface SegmentSeriesInput {
  dimensionValueId: string
  data: TimeSeriesData
}

export interface MultiDimensionalForecastInput {
  request: MultiDimensionalForecastRequest
  series: SegmentSeriesInput[]
}

export interface MultiDimensionalForecastOutput {
  hierarchical: HierarchicalForecast[]
  aggregated: ForecastResult
}

export class MultiDimensionalForecastingService {
  async generate(input: MultiDimensionalForecastInput): Promise<MultiDimensionalForecastOutput> {
    const { request, series } = input

    // Forecast each provided segment (treat as leaf nodes)
    const leafForecasts = await this.forecastLeaves(series, request)

    // Build hierarchy from config (single dimension focus for v1)
    const primaryDimension: ForecastDimensionConfig | undefined = request.dimensions[0]
    const hierarchy = this.buildHierarchy(primaryDimension, leafForecasts)

    // Reconcile per selected method
    const reconciled = this.reconcile(hierarchy, request.reconciliationMethod)

    // Aggregate to root
    const aggregated = this.aggregateHierarchy(reconciled)

    return {
      hierarchical: reconciled,
      aggregated
    }
  }

  private async forecastLeaves(
    series: SegmentSeriesInput[],
    request: MultiDimensionalForecastRequest
  ): Promise<Record<string, ForecastResult>> {
    const results: Record<string, ForecastResult> = {}
    const baseReq: Omit<ForecastingRequest, 'periodsAhead' | 'confidenceLevel'> = {
      timeHorizon: 'daily'
    } as any

    await Promise.all(
      series.map(async ({ dimensionValueId, data }) => {
        const fr: ForecastingRequest = {
          ...baseReq,
          periodsAhead: request.forecastHorizon,
          confidenceLevel: request.confidenceLevel
        } as ForecastingRequest

        const out: ForecastingResult = await intelligentForecastingEngine.generateForecast(data, fr)
        results[dimensionValueId] = {
          predictions: out.predictions,
          accuracy: out.accuracy,
          confidenceIntervals: out.confidenceIntervals,
          modelUsed: out.modelUsed.type,
          metadata: { ensembleWeights: out.ensembleWeights }
        }
      })
    )

    return results
  }

  private buildHierarchy(
    dim: ForecastDimensionConfig | undefined,
    leafForecasts: Record<string, ForecastResult>
  ): HierarchicalForecast[] {
    if (!dim) {
      // Treat all leaves as independent roots
      return Object.keys(leafForecasts).map((id) => ({
        id,
        dimensionId: 'primary',
        dimensionValueId: id,
        level: 0,
        forecast: leafForecasts[id]
      }))
    }

    const parentMap = dim.hierarchyConfig?.parentChildMappings || {}
    const levelById: Record<string, number> = {}
    const childrenByParent: Record<string, string[]> = {}

    // Build adjacency
    Object.entries(parentMap).forEach(([child, parent]) => {
      if (!childrenByParent[parent]) childrenByParent[parent] = []
      childrenByParent[parent].push(child)
    })

    // Compute levels (simple upwards walk)
    const getLevel = (id: string): number => {
      if (levelById[id] !== undefined) return levelById[id]
      const parent = parentMap[id]
      if (!parent) return (levelById[id] = 0)
      return (levelById[id] = getLevel(parent) + 1)
    }

    // Create nodes for leaves
    const nodes: Record<string, HierarchicalForecast> = {}
    Object.keys(leafForecasts).forEach((leafId) => {
      nodes[leafId] = {
        id: leafId,
        dimensionId: dim.dimensionType,
        dimensionValueId: leafId,
        level: getLevel(leafId),
        parentId: parentMap[leafId],
        forecast: leafForecasts[leafId],
        children: []
      }
    })

    // Ensure parent nodes exist
    Object.values(parentMap).forEach((parentId) => {
      if (!parentId) return
      if (!nodes[parentId]) {
        nodes[parentId] = {
          id: parentId,
          dimensionId: dim.dimensionType,
          dimensionValueId: parentId,
          level: getLevel(parentId),
          forecast: this.emptyForecast(),
          children: []
        }
      }
    })

    // Link children
    Object.entries(parentMap).forEach(([child, parent]) => {
      if (!parent) return
      nodes[parent].children = nodes[parent].children || []
      nodes[parent].children!.push(nodes[child])
      nodes[child].parentId = parent
    })

    // Roots are nodes with no parent
    return Object.values(nodes).filter((n) => !n.parentId)
  }

  private reconcile(
    roots: HierarchicalForecast[],
    method: ReconciliationMethod
  ): HierarchicalForecast[] {
    switch (method) {
      case 'bottom_up':
        return this.reconcileBottomUp(roots)
      case 'top_down':
        return this.reconcileTopDown(roots)
      case 'middle_out':
        return this.reconcileMiddleOut(roots)
      case 'optimal':
        return this.reconcileOptimal(roots)
      default:
        return roots
    }
  }

  private reconcileBottomUp(roots: HierarchicalForecast[]): HierarchicalForecast[] {
    const sumPredictions = (children: HierarchicalForecast[]): ForecastResult => {
      if (!children.length) return this.emptyForecast()
      const len = children[0].forecast.predictions.length
      const summed = new Array(len).fill(0).map((_, i) =>
        children.reduce((acc, c) => acc + c.forecast.predictions[i].predictedValue, 0)
      )
      const predictions = children[0].forecast.predictions.map((p, i) => ({
        date: p.date,
        predictedValue: summed[i],
        confidenceInterval: { lower: 0, upper: 0 }
      }))
      return { ...children[0].forecast, predictions }
    }

    const dfs = (node: HierarchicalForecast): void => {
      node.children?.forEach(dfs)
      if (node.children && node.children.length > 0) {
        node.forecast = sumPredictions(node.children)
      }
    }

    roots.forEach(dfs)
    return roots
  }

  private reconcileTopDown(roots: HierarchicalForecast[]): HierarchicalForecast[] {
    // For v1, assume root already represents the sum of leaves (or equal split if empty)
    const distribute = (parent: HierarchicalForecast): void => {
      if (!parent.children || parent.children.length === 0) return
      const childCount = parent.children.length
      parent.children.forEach((child) => {
        child.forecast = this.scaleForecast(parent.forecast, 1 / childCount)
        distribute(child)
      })
    }
    roots.forEach(distribute)
    return roots
  }

  private reconcileMiddleOut(roots: HierarchicalForecast[]): HierarchicalForecast[] {
    // Pick a middle level as anchor: compute parent totals bottom-up,
    // then distribute to children proportionally by their original leaf totals
    const bu = this.reconcileBottomUp(roots)

    const computeTotals = (node: HierarchicalForecast): number[] => {
      if (!node.children || node.children.length === 0) {
        return node.forecast.predictions.map((p) => p.predictedValue)
      }
      const childTotals = node.children.map(computeTotals)
      const len = node.forecast.predictions.length
      const totals = new Array(len).fill(0)
      for (let i = 0; i < len; i++) {
        totals[i] = childTotals.reduce((acc, arr) => acc + arr[i], 0)
      }
      return totals
    }

    const distribute = (node: HierarchicalForecast): void => {
      if (!node.children || node.children.length === 0) return
      const parentVals = node.forecast.predictions.map((p) => p.predictedValue)
      const childTotals = node.children.map((c) =>
        c.forecast.predictions.map((p) => p.predictedValue)
      )
      const len = parentVals.length
      const totals = new Array(len).fill(0)
      for (let i = 0; i < len; i++) {
        totals[i] = childTotals.reduce((acc, arr) => acc + arr[i], 0)
      }
      node.children.forEach((child, idx) => {
        const scaledPreds = child.forecast.predictions.map((p, i) => {
          const share = totals[i] > 0 ? childTotals[idx][i] / totals[i] : 1 / node.children!.length
          return {
            date: p.date,
            predictedValue: parentVals[i] * share,
            confidenceInterval: p.confidenceInterval
          }
        })
        child.forecast = { ...child.forecast, predictions: scaledPreds }
        distribute(child)
      })
    }

    bu.forEach(distribute)
    return bu
  }

  private aggregateHierarchy(roots: HierarchicalForecast[]): ForecastResult {
    if (!roots.length) return this.emptyForecast()
    if (roots.length === 1) return roots[0].forecast
    const len = roots[0].forecast.predictions.length
    const summed = new Array(len).fill(0).map((_, i) =>
      roots.reduce((acc, r) => acc + r.forecast.predictions[i].predictedValue, 0)
    )
    const predictions = roots[0].forecast.predictions.map((p, i) => ({
      date: p.date,
      predictedValue: summed[i],
      confidenceInterval: { lower: 0, upper: 0 }
    }))
    return { ...roots[0].forecast, predictions }
  }

  private reconcileOptimal(roots: HierarchicalForecast[]): HierarchicalForecast[] {
    // Proportional top-down with bottom-up check: ensure coherence by scaling
    // children proportionally to their original sums while preserving parent totals.
    // Step 1: compute bottom-up sums
    const bu = this.reconcileBottomUp(roots)
    // Step 2: proportional distribute from roots downwards preserving totals
    const distribute = (parent: HierarchicalForecast): void => {
      if (!parent.children || parent.children.length === 0) return
      const parentPred = parent.forecast.predictions.map((p) => p.predictedValue)
      const childSums = parent.children.map((c) =>
        c.forecast.predictions.map((p) => p.predictedValue)
      )
      const len = parentPred.length
      const totals = new Array(len).fill(0)
      for (let i = 0; i < len; i++) {
        totals[i] = childSums.reduce((acc, arr) => acc + arr[i], 0)
      }
      parent.children.forEach((child, idx) => {
        const newPreds = child.forecast.predictions.map((p, i) => {
          const w = totals[i] > 0 ? childSums[idx][i] / totals[i] : 1 / parent.children!.length
          return {
            date: p.date,
            predictedValue: parentPred[i] * w,
            confidenceInterval: p.confidenceInterval
          }
        })
        child.forecast = { ...child.forecast, predictions: newPreds }
        distribute(child)
      })
    }
    bu.forEach(distribute)
    return bu
  }

  private scaleForecast(f: ForecastResult, factor: number): ForecastResult {
    return {
      ...f,
      predictions: f.predictions.map((p) => ({
        date: p.date,
        predictedValue: p.predictedValue * factor,
        confidenceInterval: p.confidenceInterval
      }))
    }
  }

  private emptyForecast(): ForecastResult {
    return {
      predictions: [],
      accuracy: { mae: 0, rmse: 0, mape: 0, r2Score: 0, crossValidationScore: 0 },
      confidenceIntervals: [],
      modelUsed: 'n/a'
    }
  }
}

let singleton: MultiDimensionalForecastingService | null = null
export function getMultiDimensionalForecastingService(): MultiDimensionalForecastingService {
  if (!singleton) singleton = new MultiDimensionalForecastingService()
  return singleton
}


