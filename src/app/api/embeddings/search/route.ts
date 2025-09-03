/**
 * API Route: Similarity Search
 * 
 * POST /api/embeddings/search
 * - Search transcripts by natural language query
 * - Find similar transcripts to a given transcript
 * - Support advanced filtering and ranking
 */

import { NextRequest, NextResponse } from 'next/server'
import { EmbeddingService } from '@/lib/services/embeddings'
import { z } from 'zod'

const SearchRequestSchema = z.object({
  query: z.string().optional(),
  transcriptId: z.string().optional(),
  limit: z.number().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.6),
  filters: z.object({
    clientId: z.string().optional(),
    clientIds: z.array(z.string()).optional(),
    dateRange: z.object({
      startDate: z.string(),
      endDate: z.string()
    }).optional(),
    transcriptCountRange: z.object({
      min: z.number(),
      max: z.number()
    }).optional(),
    includeNotes: z.boolean().optional()
  }).optional(),
  embeddingModel: z.enum(['text-embedding-004', 'text-embedding-gecko']).default('text-embedding-004'),
  includeMetadata: z.boolean().default(false)
}).refine(
  (data) => data.query || data.transcriptId,
  {
    message: "Must provide either query or transcriptId"
  }
)

const SuggestionsRequestSchema = z.object({
  partialQuery: z.string().min(1),
  limit: z.number().min(1).max(20).default(5)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = SearchRequestSchema.parse(body)

    const {
      query,
      transcriptId,
      limit,
      threshold,
      filters,
      embeddingModel,
      includeMetadata
    } = validatedData

    let results

    if (query) {
      // Natural language search
      results = await EmbeddingService.searchByQuery(query, {
        limit,
        threshold,
        clientId: filters?.clientId,
        dateRange: filters?.dateRange
      })
    } else if (transcriptId) {
      // Similar transcript search
      results = await EmbeddingService.findSimilarTranscripts(transcriptId, {
        limit,
        threshold,
        embeddingModel
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        query: query || `Similar to transcript: ${transcriptId}`,
        totalResults: results?.length || 0,
        searchParams: {
          limit,
          threshold,
          filters,
          embeddingModel,
          includeMetadata
        }
      },
      message: `Found ${results?.length || 0} similar transcripts`
    })

  } catch (error) {
    console.error('Search API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'suggestions') {
      const partialQuery = searchParams.get('q')
      const limit = parseInt(searchParams.get('limit') || '5')

      if (!partialQuery) {
        return NextResponse.json({
          success: false,
          error: 'Query parameter "q" is required for suggestions'
        }, { status: 400 })
      }

      const validatedData = SuggestionsRequestSchema.parse({
        partialQuery,
        limit
      })

      const suggestions = await EmbeddingService.getSearchSuggestions(
        validatedData.partialQuery,
        validatedData.limit
      )

      return NextResponse.json({
        success: true,
        data: {
          suggestions,
          query: partialQuery
        }
      })
    }

    // Default: return search capabilities info
    return NextResponse.json({
      success: true,
      data: {
        capabilities: {
          naturalLanguageSearch: true,
          similaritySearch: true,
          advancedFiltering: true,
          searchSuggestions: true
        },
        supportedModels: ['text-embedding-004', 'text-embedding-gecko'],
        maxLimit: 100,
        defaultThreshold: 0.6
      }
    })

  } catch (error) {
    console.error('Search info API error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to get search information',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}