import zlib from 'zlib'
import crypto from 'crypto'
import { VectorDatabaseUtils } from '@/lib/database/vector-utils'

export interface PredictionCacheKey {
  clientId?: string
  timeHorizon: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  periodsAhead: number
  confidenceLevel: number
}

export interface SeriesSignature {
  // Normalized recent values used to compute similarity between requests
  vector: number[]
}

interface CacheEntry {
  // gzip-compressed JSON string of forecast result
  compressed: Buffer
  createdAt: number
  ttlMs: number
  key: PredictionCacheKey
  signature: SeriesSignature
}

export class PredictionCache {
  private store: Map<string, CacheEntry> = new Map()
  private maxEntries: number
  private defaultTtlMs: number
  private similarityThreshold: number

  constructor(options?: {
    maxEntries?: number
    defaultTtlMs?: number
    similarityThreshold?: number // cosine similarity threshold for reuse [0,1]
  }) {
    this.maxEntries = options?.maxEntries ?? 500
    this.defaultTtlMs = options?.defaultTtlMs ?? 10 * 60 * 1000
    this.similarityThreshold = options?.similarityThreshold ?? 0.965
  }

  private static stableKey(key: PredictionCacheKey): string {
    const json = JSON.stringify(key)
    return crypto.createHash('sha1').update(json).digest('hex')
  }

  private static buildSignature(values: number[], takeLast: number = 64): SeriesSignature {
    const slice = values.slice(-takeLast)
    const mean = slice.reduce((a, b) => a + b, 0) / Math.max(1, slice.length)
    const std = Math.sqrt(
      slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(1, slice.length)
    ) || 1
    const vector = slice.map(v => (v - mean) / std)
    return { vector }
  }

  private static gzip(input: any): Buffer {
    const json = typeof input === 'string' ? input : JSON.stringify(input)
    return zlib.gzipSync(Buffer.from(json, 'utf8'))
  }

  private static gunzipToJson<T = any>(buf: Buffer): T {
    const out = zlib.gunzipSync(buf).toString('utf8')
    return JSON.parse(out) as T
  }

  private pruneIfNeeded(): void {
    if (this.store.size <= this.maxEntries) return
    // Simple LRU-ish prune: remove oldest entries
    const entries = Array.from(this.store.entries())
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt)
    const excess = this.store.size - this.maxEntries
    for (let i = 0; i < excess; i++) {
      this.store.delete(entries[i][0])
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.createdAt > entry.ttlMs
  }

  set(
    key: PredictionCacheKey,
    seriesValues: number[],
    forecastResult: any,
    ttlMs?: number
  ): void {
    const id = PredictionCache.stableKey(key)
    const signature = PredictionCache.buildSignature(seriesValues)
    const compressed = PredictionCache.gzip(forecastResult)
    this.store.set(id, {
      compressed,
      createdAt: Date.now(),
      ttlMs: ttlMs ?? this.defaultTtlMs,
      key,
      signature
    })
    this.pruneIfNeeded()
  }

  getExact<T = any>(key: PredictionCacheKey): { hit: boolean; value?: T } {
    const id = PredictionCache.stableKey(key)
    const entry = this.store.get(id)
    if (!entry) return { hit: false }
    if (this.isExpired(entry)) {
      this.store.delete(id)
      return { hit: false }
    }
    return { hit: true, value: PredictionCache.gunzipToJson<T>(entry.compressed) }
  }

  getSimilar<T = any>(
    key: PredictionCacheKey,
    seriesValues: number[]
  ): { hit: boolean; value?: T; similarity?: number } {
    const exact = this.getExact<T>(key)
    if (exact.hit) return { hit: true, value: exact.value, similarity: 1 }

    // Try similarity-based reuse
    const targetSig = PredictionCache.buildSignature(seriesValues)
    let best: { entry: CacheEntry; similarity: number } | null = null
    for (const [, entry] of this.store) {
      if (entry.key.timeHorizon !== key.timeHorizon) continue
      if (entry.key.periodsAhead !== key.periodsAhead) continue
      // clientId and confidenceLevel can differ for reuse depending on needs; keep same confidenceLevel
      if (entry.key.confidenceLevel !== key.confidenceLevel) continue
      if (this.isExpired(entry)) continue

      const sim = VectorDatabaseUtils.cosineSimilarity(targetSig.vector, entry.signature.vector)
      if (!best || sim > best.similarity) {
        best = { entry, similarity: sim }
      }
    }

    if (best && best.similarity >= this.similarityThreshold) {
      return {
        hit: true,
        value: PredictionCache.gunzipToJson<T>(best.entry.compressed),
        similarity: best.similarity
      }
    }

    return { hit: false }
  }

  invalidateByClient(clientId: string): number {
    let removed = 0
    for (const [id, entry] of this.store) {
      if (entry.key.clientId === clientId) {
        this.store.delete(id)
        removed++
      }
    }
    return removed
  }

  clear(): void {
    this.store.clear()
  }
}

// Singleton cache instance
let singleton: PredictionCache | null = null
export function getPredictionCache(): PredictionCache {
  if (!singleton) {
    singleton = new PredictionCache({
      maxEntries: parseInt(process.env.PREDICTION_CACHE_MAX || '500'),
      defaultTtlMs: parseInt(process.env.PREDICTION_CACHE_TTL_MS || `${10 * 60 * 1000}`),
      similarityThreshold: parseFloat(process.env.PREDICTION_CACHE_SIM || '0.965')
    })
  }
  return singleton
}


