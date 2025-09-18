import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitoringService } from '@/lib/services/performance-monitoring'
import { VertexAIService } from '@/lib/services/vertex-ai'

async function listModelIds(): Promise<string[]> {
  try {
    const vertex = new VertexAIService()
    const models = await vertex.listModels()
    const ids = (models || []).map((m: any) => {
      const name: string = m.name || '' // e.g., projects/.../locations/.../models/1234567890
      const parts = name.split('/')
      return parts[parts.length - 1] || m.displayName || 'unknown-model'
    })
    // Deduplicate and filter
    return Array.from(new Set(ids)).filter(Boolean)
  } catch (e) {
    console.error('Failed to list models for background monitoring:', e)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const modelIds = await listModelIds()
    const results: Array<{ modelId: string; ok: boolean; error?: string }> = []

    for (const modelId of modelIds) {
      try {
        await performanceMonitoringService.monitorModel(modelId)
        results.push({ modelId, ok: true })
      } catch (err) {
        results.push({ modelId, ok: false, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: true,
      monitoredCount: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok),
      totalModels: modelIds.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Background monitoring failed:', error)
    return NextResponse.json(
      { success: false, error: 'Background monitoring failed' },
      { status: 500 }
    )
  }
}


