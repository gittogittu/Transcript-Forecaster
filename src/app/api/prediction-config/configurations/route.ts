/**
 * API routes for prediction configurations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Pool } from 'pg'
import { PredictionConfigurationService } from '@/lib/services/prediction-config/prediction-config-service'
import { 
  PredictionConfigurationRequest,
  ConfigurationSearchFilters 
} from '@/types/prediction-config'

// Initialize database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const configService = new PredictionConfigurationService(db)

/**
 * GET /api/prediction-config/configurations
 * Search and retrieve prediction configurations
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    const filters: ConfigurationSearchFilters = {
      name: searchParams.get('name') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      createdBy: searchParams.get('createdBy') || undefined,
      isTemplate: searchParams.get('isTemplate') === 'true' ? true : 
                   searchParams.get('isTemplate') === 'false' ? false : undefined,
      templateCategory: searchParams.get('templateCategory') || undefined
    }

    if (searchParams.get('startDate') && searchParams.get('endDate')) {
      filters.dateRange = {
        startDate: new Date(searchParams.get('startDate')!),
        endDate: new Date(searchParams.get('endDate')!)
      }
    }

    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const result = await configService.searchConfigurations(
      filters,
      session.user.id,
      page,
      pageSize
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error searching configurations:', error)
    return NextResponse.json(
      { error: 'Failed to search configurations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/prediction-config/configurations
 * Create a new prediction configuration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PredictionConfigurationRequest = await request.json()

    // Validate required fields
    if (!body.config?.name) {
      return NextResponse.json(
        { error: 'Configuration name is required' },
        { status: 400 }
      )
    }

    if (!body.config?.parameters) {
      return NextResponse.json(
        { error: 'Configuration parameters are required' },
        { status: 400 }
      )
    }

    const result = await configService.createConfiguration(body, session.user.id)

    if (!result.validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Configuration validation failed',
          validation: result.validation
        },
        { status: 400 }
      )
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating configuration:', error)
    return NextResponse.json(
      { error: 'Failed to create configuration' },
      { status: 500 }
    )
  }
}