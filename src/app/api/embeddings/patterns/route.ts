/**
 * API Route: Pattern Discovery and Clustering
 * 
 * POST /api/embeddings/patterns
 * - Discover patterns across transcripts
 * - Cluster transcripts by similarity
 * - Find temporal patterns
 */

import { NextRequest, NextResponse } from 'next/server'
import { EmbeddingService } from '@/lib/services/embeddings'
import { z } from 'zod'

const PatternDiscoveryRequestSchema = z.object({
  action: z.enum(['discover', 'cluster', 'temporal']),
  patternType: z.enum(['seasonal', 'trend', 'anomaly', 'volume']).optional(),
  clientId: z.string().optional(),
  clientIds: z.array(z.string()).optional(),
  timeWindow: z.number().min(1).max(365).default(30),
  minSimilarity: z.number().min(0).max(1).default(0.7),
  limit: z.number().min(1).max(50).default(5),
  dateRange: z.object({
    startDate: z.string(),
    endDate: z.string()
  }).optional(),
  clusteringOptions: z.object({
    numClusters: z.number().min(2).max(20).default(5),
    minClusterSize: z.number().min(1).max(100).default(3)
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = PatternDiscoveryRequestSchema.parse(body)

    const {
      action,
      patternType,
      clientId,
      clientIds,
      timeWindow,
      minSimilarity,
      limit,
      dateRange,
      clusteringOptions
    } = validatedData

    let results

    switch (action) {
      case 'discover':
        results = await EmbeddingService.discoverPatterns({
          patternType: patternType || 'volume',
          clientId,
          timeWindow,
          minSimilarity,
          limit
        })

        return NextResponse.json({
          success: true,
          data: {
            patterns: results,
            patternType: patternType || 'volume',
            totalPatterns: results.length,
            searchParams: {
              clientId,
              timeWindow,
              minSimilarity,
              limit
            }
          },
          message: `Discovered ${results.length} patterns`
        })

      case 'cluster':
        results = await EmbeddingService.clusterTranscripts({
          clientIds,
          dateRange,
          numClusters: clusteringOptions?.numClusters || 5,
          minClusterSize: clusteringOptions?.minClusterSize || 3
        })

        return NextResponse.json({
          success: true,
          data: {
            clusters: results.clusters,
            totalTranscripts: results.totalTranscripts,
            silhouetteScore: results.silhouetteScore,
            processingTime: results.processingTime,
            clusteringParams: {
              numClusters: clusteringOptions?.numClusters || 5,
              minClusterSize: clusteringOptions?.minClusterSize || 3,
              clientIds,
              dateRange
            }
          },
          message: `Created ${results.clusters.length} clusters from ${results.totalTranscripts} transcripts`
        })

      case 'temporal':
        if (!clientId) {
          return NextResponse.json({
            success: false,
            error: 'clientId is required for temporal pattern analysis'
          }, { status: 400 })
        }

        results = await EmbeddingService.findTemporalPatterns(clientId, {
          timeWindow,
          minSimilarity
        })

        return NextResponse.json({
          success: true,
          data: {
            temporalPatterns: results,
            sourceClientId: clientId,
            timeWindow,
            minSimilarity,
            totalMatches: results.length
          },
          message: `Found ${results.length} temporal pattern matches`
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action specified'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Pattern discovery API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Pattern discovery failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const clientId = searchParams.get('clientId')

    if (action === 'temporal' && clientId) {
      // Quick temporal pattern check
      const timeWindow = parseInt(searchParams.get('timeWindow') || '30')
      const minSimilarity = parseFloat(searchParams.get('minSimilarity') || '0.8')

      const results = await EmbeddingService.findTemporalPatterns(clientId, {
        timeWindow,
        minSimilarity
      })

      return NextResponse.json({
        success: true,
        data: {
          hasTemporalPatterns: results.length > 0,
          patternCount: results.length,
          topMatches: results.slice(0, 3),
          clientId,
          timeWindow,
          minSimilarity
        }
      })
    }

    // Default: return pattern discovery capabilities
    return NextResponse.json({
      success: true,
      data: {
        capabilities: {
          patternDiscovery: true,
          clustering: true,
          temporalAnalysis: true
        },
        supportedPatternTypes: ['seasonal', 'trend', 'anomaly', 'volume'],
        supportedActions: ['discover', 'cluster', 'temporal'],
        limits: {
          maxClusters: 20,
          maxTimeWindow: 365,
          maxPatterns: 50
        }
      }
    })

  } catch (error) {
    console.error('Pattern info API error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to get pattern information',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}