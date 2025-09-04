/**
 * API routes for individual prediction configurations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Pool } from 'pg'
import { PredictionConfigurationService } from '@/lib/services/prediction-config/prediction-config-service'
import { PredictionConfiguration } from '@/types/prediction-config'

// Initialize database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const configService = new PredictionConfigurationService(db)

/**
 * GET /api/prediction-config/configurations/[id]
 * Get a specific prediction configuration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const configuration = await configService.getConfiguration(
      params.id,
      session.user.id
    )

    if (!configuration) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(configuration)
  } catch (error) {
    console.error('Error fetching configuration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/prediction-config/configurations/[id]
 * Update a prediction configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates: Partial<PredictionConfiguration> = await request.json()

    const updatedConfiguration = await configService.updateConfiguration(
      params.id,
      updates,
      session.user.id
    )

    return NextResponse.json(updatedConfiguration)
  } catch (error) {
    console.error('Error updating configuration:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Configuration not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/prediction-config/configurations/[id]
 * Delete a prediction configuration
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deleted = await configService.deleteConfiguration(
      params.id,
      session.user.id
    )

    if (!deleted) {
      return NextResponse.json(
        { error: 'Configuration not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting configuration:', error)
    return NextResponse.json(
      { error: 'Failed to delete configuration' },
      { status: 500 }
    )
  }
}