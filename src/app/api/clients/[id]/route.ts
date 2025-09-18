import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database/connection'

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const pool = await getDatabasePool()

    const result = await pool.query(
      `UPDATE clients SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove client:', error)
    return NextResponse.json({ success: false, error: 'Failed to remove client' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const body = await request.json()
    const fields: string[] = []
    const params: any[] = []
    let idx = 1

    if (body.name !== undefined) { fields.push(`name = $${idx++}`); params.push(body.name) }
    if (body.client_code !== undefined) { fields.push(`client_code = $${idx++}`); params.push(body.client_code) }
    if (body.environment !== undefined) { fields.push(`environment = $${idx++}`); params.push(body.environment) }
    if (body.email !== undefined) { fields.push(`email = $${idx++}`); params.push(body.email) }
    if (body.is_active !== undefined) { fields.push(`is_active = $${idx++}`); params.push(!!body.is_active) }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
    }

    params.push(id)

    const pool = await getDatabasePool()
    const result = await pool.query(
      `UPDATE clients SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, name, client_code, environment, email, is_active, created_at, updated_at`,
      params
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, client: result.rows[0] })
  } catch (error) {
    console.error('Failed to update client:', error)
    return NextResponse.json({ success: false, error: 'Failed to update client' }, { status: 500 })
  }
}
