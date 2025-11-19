import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { z } from 'zod'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

const updateProjectSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    project_type: z.enum(['sales', 'finance', 'transcripts', 'support', 'operations', 'custom']).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    icon: z.string().optional(),
    is_active: z.boolean().optional(),
})

// GET /api/projects/[id] - Get single project
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params

        const query = `
      SELECT 
        p.*,
        COUNT(c.id) FILTER (WHERE c.is_active = true) as active_sources,
        COUNT(c.id) as data_source_count
      FROM projects p
      LEFT JOIN clients c ON c.project_id = p.id
      WHERE p.id = $1
      GROUP BY p.id
    `

        const result = await pool.query(query, [id])

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Project not found' },
                { status: 404 }
            )
        }

        // Get total records (gracefully handle if table doesn't exist)
        let totalRecords = 0
        try {
            const recordsQuery = `
                SELECT COUNT(td.*) as total_records
                FROM clients c
                JOIN transcript_data td ON td.client_id = c.id
                WHERE c.project_id = $1
            `
            const recordsResult = await pool.query(recordsQuery, [id])
            totalRecords = parseInt(recordsResult.rows[0]?.total_records) || 0
        } catch (e) {
            // Table might not exist yet, ignore
            console.log('Could not fetch transcript records count (table may be missing)')
        }

        const project = {
            ...result.rows[0],
            active_sources: parseInt(result.rows[0].active_sources) || 0,
            data_source_count: parseInt(result.rows[0].data_source_count) || 0,
            total_records: totalRecords,
        }

        return NextResponse.json({
            success: true,
            project,
        })
    } catch (error) {
        console.error('Error fetching project:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch project' },
            { status: 500 }
        )
    }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        const body = await request.json()
        const validated = updateProjectSchema.parse(body)

        const updates: string[] = []
        const values: any[] = []
        let paramIndex = 1

        if (validated.name !== undefined) {
            updates.push(`name = $${paramIndex++}`)
            values.push(validated.name)
        }
        if (validated.description !== undefined) {
            updates.push(`description = $${paramIndex++}`)
            values.push(validated.description)
        }
        if (validated.project_type !== undefined) {
            updates.push(`project_type = $${paramIndex++}`)
            values.push(validated.project_type)
        }
        if (validated.color !== undefined) {
            updates.push(`color = $${paramIndex++}`)
            values.push(validated.color)
        }
        if (validated.icon !== undefined) {
            updates.push(`icon = $${paramIndex++}`)
            values.push(validated.icon)
        }
        if (validated.is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`)
            values.push(validated.is_active)
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No fields to update' },
                { status: 400 }
            )
        }

        values.push(id)
        const query = `
      UPDATE projects
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

        const result = await pool.query(query, values)

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Project not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            project: result.rows[0],
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Invalid input', details: error.issues },
                { status: 400 }
            )
        }
        console.error('Error updating project:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update project' },
            { status: 500 }
        )
    }
}

// DELETE /api/projects/[id] - Soft delete project
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params

        const query = `
      UPDATE projects
      SET is_active = false
      WHERE id = $1
      RETURNING *
    `

        const result = await pool.query(query, [id])

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Project not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Project deleted successfully',
        })
    } catch (error) {
        console.error('Error deleting project:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete project' },
            { status: 500 }
        )
    }
}
