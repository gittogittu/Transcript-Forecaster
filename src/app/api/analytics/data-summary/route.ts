import { NextRequest, NextResponse } from 'next/server'
import { authenticated, analystOrAdmin, getCurrentUser } from '@/lib/middleware/auth'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { performanceMiddleware } from '@/lib/middleware/performance-middleware'
import { MockDataService } from '@/lib/services/mock-data-service'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const mockDataService = MockDataService.getInstance()

/**
 * GET /api/analytics/data-summary - Get data management summary
 */
async function handleGET(request: NextRequest) {
  return performanceMiddleware(request, async () => {
    try {
      const user = await getCurrentUser(request)
      
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Try database first, fallback to mock service
      let client
      let useMockData = false
      
      try {
        client = await pool.connect()
      } catch (dbError) {
        console.warn('Database connection failed, using mock data:', dbError)
        useMockData = true
      }
      
      if (useMockData) {
        const dataSummary = await mockDataService.getDataSummary()
        return NextResponse.json({
          success: true,
          data: dataSummary
        })
      }
      
      try {
        // Get total records
        const totalRecordsQuery = `
          SELECT COUNT(*) as total_records
          FROM transcripts
        `
        const totalRecordsResult = await client.query(totalRecordsQuery)
        const totalRecords = parseInt(totalRecordsResult.rows[0]?.total_records || '0')

        // Get last updated timestamp
        const lastUpdatedQuery = `
          SELECT MAX(updated_at) as last_updated
          FROM transcripts
        `
        const lastUpdatedResult = await client.query(lastUpdatedQuery)
        const lastUpdated = lastUpdatedResult.rows[0]?.last_updated
        const lastUpdatedFormatted = lastUpdated ? formatTimeAgo(new Date(lastUpdated)) : 'Never'

        // Calculate data quality score
        const dataQualityQuery = `
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN c.name IS NOT NULL AND c.name != '' THEN 1 END) as has_client,
            COUNT(CASE WHEN t.transcript_count > 0 THEN 1 END) as has_count,
            COUNT(CASE WHEN t.date IS NOT NULL THEN 1 END) as has_date
          FROM transcripts t
          JOIN clients c ON t.client_id = c.id
        `
        const dataQualityResult = await client.query(dataQualityQuery)
        const qualityData = dataQualityResult.rows[0]
        
        const qualityScore = qualityData.total > 0 ? 
          Math.round(((parseInt(qualityData.has_client) + parseInt(qualityData.has_count) + parseInt(qualityData.has_date)) / (parseInt(qualityData.total) * 3)) * 100) : 0

        // Get active clients
        const activeClientsQuery = `
          SELECT COUNT(DISTINCT c.name) as active_clients
          FROM transcripts t
          JOIN clients c ON t.client_id = c.id
          WHERE t.date >= CURRENT_DATE - INTERVAL '30 days'
        `
        const activeClientsResult = await client.query(activeClientsQuery)
        const activeClients = parseInt(activeClientsResult.rows[0]?.active_clients || '0')

        // Get this month's new entries
        const thisMonthEntriesQuery = `
          SELECT COUNT(*) as this_month_entries
          FROM transcripts
          WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
          AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        `
        const thisMonthEntriesResult = await client.query(thisMonthEntriesQuery)
        const thisMonthEntries = parseInt(thisMonthEntriesResult.rows[0]?.this_month_entries || '0')

        // Get recent entries
        const recentEntriesQuery = `
          SELECT 
            t.id,
            c.name as client_name,
            t.date,
            t.transcript_count,
            t.transcript_type,
            t.created_at
          FROM transcripts t
          JOIN clients c ON t.client_id = c.id
          ORDER BY t.created_at DESC
          LIMIT 10
        `
        const recentEntriesResult = await client.query(recentEntriesQuery)
        const recentEntries = recentEntriesResult.rows.map(row => ({
          id: row.id.toString(),
          clientName: row.client_name,
          date: row.date.toISOString().split('T')[0],
          count: row.transcript_count,
          type: row.transcript_type || 'call'
        }))

        const dataSummary = {
          totalRecords,
          lastUpdated: lastUpdatedFormatted,
          dataQuality: qualityScore,
          activeClients,
          thisMonthEntries,
          recentEntries
        }

        return NextResponse.json({
          success: true,
          data: dataSummary
        })

      } finally {
        if (client) {
          client.release()
        }
      }

    } catch (error) {
      console.error('Error fetching data summary:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
  
  return date.toLocaleDateString()
}

// Export handlers with middleware
export const GET = withRateLimit(rateLimitConfigs.read, analystOrAdmin(handleGET))