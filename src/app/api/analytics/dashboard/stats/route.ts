import { NextRequest, NextResponse } from 'next/server'
import { DatabaseConnection } from '@/lib/database/connection'

export async function GET() {
  try {
    const db = DatabaseConnection.getInstance()
    const pool = await db.getPool()
    
    // Get dashboard statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT c.id) as total_clients,
        COALESCE(SUM(t.transcript_count), 0) as total_transcripts,
        COALESCE(AVG(c.overall_aht), 0) as avg_aht,
        COUNT(DISTINCT CASE 
          WHEN t.date >= DATE_TRUNC('month', CURRENT_DATE) 
          THEN c.id 
        END) as active_clients_this_month
      FROM clients c
      LEFT JOIN transcripts t ON c.id = t.client_id
    `

    const result = await pool.query(statsQuery)
    const stats = result.rows[0]

    return NextResponse.json({
      total_clients: parseInt(stats.total_clients),
      total_transcripts: parseInt(stats.total_transcripts),
      avg_aht: parseFloat(stats.avg_aht),
      active_clients_this_month: parseInt(stats.active_clients_this_month)
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}