/**
 * API routes for prediction configuration templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Pool } from 'pg'
import { PredictionConfigurationService } from '@/lib/services/prediction-config/prediction-config-service'

// Initialize database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const configService = new PredictionConfigurationService(db)

/**
 * GET /api/prediction-config/templates
 * Get popular prediction templates
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const templates = await configService.getPopularTemplates(limit)

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/prediction-config/templates/clone
 * Clone a configuration as a new template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { configurationId, templateName } = await request.json()

    if (!configurationId || !templateName) {
      return NextResponse.json(
        { error: 'Configuration ID and template name are required' },
        { status: 400 }
      )
    }

    const template = await configService.cloneAsTemplate(
      configurationId,
      templateName,
      session.user.id
    )

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error cloning template:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to clone template' },
      { status: 500 }
    )
  }
}