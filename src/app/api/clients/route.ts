import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const environment = searchParams.get('environment')
    const q = searchParams.get('q')

    const pool = await getDatabasePool()

    const conditions: string[] = []
    const params: any[] = []
    let idx = 1

    if (!includeInactive) {
      conditions.push(`is_active = true`)
    }

    if (environment) {
      conditions.push(`environment = $${idx++}`)
      params.push(environment)
    }

    if (q) {
      conditions.push(`(name ILIKE $${idx} OR client_code ILIKE $${idx})`)
      params.push(`%${q}%`)
      idx++
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await pool.query(
      `SELECT id, name, client_code, environment, email, is_active, created_at, updated_at
       FROM clients
       ${whereClause}
       ORDER BY name ASC`
      , params
    )

    return NextResponse.json({ success: true, clients: result.rows })
  } catch (error) {
    console.error('Failed to list clients:', error)
    return NextResponse.json({ success: false, error: 'Failed to list clients' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name: string | undefined = body.name?.trim()
    const client_code: string | undefined = body.client_code?.trim()
    let environment: 'prod' | 'uat' | undefined = body.environment
    const email: string | null = body.email ?? null

    if (!client_code) {
      return NextResponse.json({ success: false, error: 'client_code is required' }, { status: 400 })
    }

    // Derive name if not provided
    const derivedName = client_code
      .replace(/-uat$|-prod$/i, '')
      .split('-')
      .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ')

    const finalName = name || derivedName

    if (!environment) {
      environment = /-uat$/i.test(client_code) ? 'uat' : 'prod'
    }

    const pool = await getDatabasePool()

    const result = await pool.query(
      `INSERT INTO clients (name, client_code, environment, email, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (client_code)
       DO UPDATE SET
         name = EXCLUDED.name,
         environment = EXCLUDED.environment,
         email = COALESCE(EXCLUDED.email, clients.email),
         is_active = true,
         updated_at = NOW()
       RETURNING id, name, client_code, environment, email, is_active, created_at, updated_at`,
      [finalName, client_code, environment, email]
    )

    return NextResponse.json({ success: true, client: result.rows[0] }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create client:', error)
    // Handle unique constraint violation
    if (error?.code === '23505') {
      return NextResponse.json({ success: false, error: 'Client code must be unique' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: 'Failed to create client' }, { status: 500 })
  }
}
