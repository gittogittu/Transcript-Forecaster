import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { z } from 'zod'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

const createProjectSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    project_type: z.enum(['sales', 'finance', 'transcripts', 'support', 'operations', 'custom']),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    icon: z.string().optional(),
})

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const includeStats = searchParams.get('include_stats') === 'true'

        let query = `
      SELECT 
        p.*,
        ${includeStats ? `
          COUNT(c.id) FILTER (WHERE c.is_active = true) as active_sources,
          COUNT(c.id) as total_sources
        ` : '1 as placeholder'}
      FROM projects p
      ${includeStats ? 'LEFT JOIN clients c ON c.project_id = p.id' : ''}
      WHERE p.is_active = true
      ${includeStats ? 'GROUP BY p.id' : ''}
      ORDER BY p.created_at DESC
    `

        const result = await pool.query(query)

        // Get total records per project if needed (gracefully handle missing table)
        if (includeStats && result.rows.length > 0) {
            result.rows = result.rows.map(row => ({
                ...row,
                data_source_count: parseInt(row.total_sources) || 0,
                active_sources: parseInt(row.active_sources) || 0,
                total_records: 0, // Will be populated when data is imported
            }))
        }

        return NextResponse.json({
            success: true,
            projects: result.rows,
            count: result.rows.length,
        })
    } catch (error) {
        console.error('Error fetching projects:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch projects' },
            { status: 500 }
        )
    }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const validated = createProjectSchema.parse(body)

        const query = `
      INSERT INTO projects (name, description, project_type, color, icon)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `

        const result = await pool.query(query, [
            validated.name,
            validated.description || null,
            validated.project_type,
            validated.color || '#3B82F6',
            validated.icon || '📊',
        ])

        return NextResponse.json({
            success: true,
            project: result.rows[0],
        }, { status: 201 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Invalid input', details: error.issues },
                { status: 400 }
            )
        }
        console.error('Error creating project:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create project' },
            { status: 500 }
        )
    }
}
