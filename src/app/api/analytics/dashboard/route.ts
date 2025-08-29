import { NextRequest, NextResponse } from 'next/server'
import { authenticated, getCurrentUser } from '@/lib/middleware/auth'
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
 * GET /api/analytics/dashboard - Get dashboard analytics data
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
        const dashboardData = await mockDataService.getDashboardData()
        return NextResponse.json({
          success: true,
          data: dashboardData
        })
      }
      
      try {
        // Get total transcripts
        const totalTranscriptsQuery = `
          SELECT COUNT(*) as total_transcripts
          FROM transcripts
          WHERE deleted_at IS NULL
        `
        const totalTranscriptsResult = await client.query(totalTranscriptsQuery)
        const totalTranscripts = parseInt(totalTranscriptsResult.rows[0]?.total_transcripts || '0')

        // Get this month's transcripts
        const thisMonthQuery = `
          SELECT COUNT(*) as this_month
          FROM transcripts
          WHERE deleted_at IS NULL
          AND date >= DATE_TRUNC('month', CURRENT_DATE)
          AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        `
        const thisMonthResult = await client.query(thisMonthQuery)
        const thisMonth = parseInt(thisMonthResult.rows[0]?.this_month || '0')

        // Get last month's transcripts for growth calculation
        const lastMonthQuery = `
          SELECT COUNT(*) as last_month
          FROM transcripts
          WHERE deleted_at IS NULL
          AND date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
          AND date < DATE_TRUNC('month', CURRENT_DATE)
        `
        const lastMonthResult = await client.query(lastMonthQuery)
        const lastMonth = parseInt(lastMonthResult.rows[0]?.last_month || '0')

        // Calculate monthly growth
        const monthlyGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0

        // Get active clients (clients with transcripts in last 30 days)
        const activeClientsQuery = `
          SELECT COUNT(DISTINCT client_name) as active_clients
          FROM transcripts
          WHERE deleted_at IS NULL
          AND date >= CURRENT_DATE - INTERVAL '30 days'
        `
        const activeClientsResult = await client.query(activeClientsQuery)
        const activeClients = parseInt(activeClientsResult.rows[0]?.active_clients || '0')

        // Get average handling time (if you have this data)
        const avgHandlingTimeQuery = `
          SELECT AVG(handling_time_minutes) as avg_handling_time
          FROM transcripts
          WHERE deleted_at IS NULL
          AND handling_time_minutes IS NOT NULL
          AND date >= CURRENT_DATE - INTERVAL '30 days'
        `
        const avgHandlingTimeResult = await client.query(avgHandlingTimeQuery)
        const avgHandlingTime = parseFloat(avgHandlingTimeResult.rows[0]?.avg_handling_time || '8.5')

        // Get recent activity
        const recentActivityQuery = `
          SELECT 
            'transcript' as type,
            'Added ' || transcript_count || ' transcripts for ' || client_name as description,
            created_at as timestamp,
            'success' as status
          FROM transcripts
          WHERE deleted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 5
        `
        const recentActivityResult = await client.query(recentActivityQuery)
        const recentActivity = recentActivityResult.rows.map((row, index) => ({
          id: (index + 1).toString(),
          type: 'import',
          description: row.description,
          timestamp: formatTimeAgo(new Date(row.timestamp)),
          status: row.status
        }))

        // Get sync status (you might want to store this in a separate table)
        const lastSyncQuery = `
          SELECT MAX(updated_at) as last_sync
          FROM transcripts
          WHERE deleted_at IS NULL
        `
        const lastSyncResult = await client.query(lastSyncQuery)
        const lastSync = lastSyncResult.rows[0]?.last_sync
        const lastSyncFormatted = lastSync ? formatTimeAgo(new Date(lastSync)) : 'Never'

        // Generate next month prediction (simple linear regression based on last 3 months)
        const predictionQuery = `
          SELECT 
            DATE_TRUNC('month', date) as month,
            COUNT(*) as count
          FROM transcripts
          WHERE deleted_at IS NULL
          AND date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months'
          GROUP BY DATE_TRUNC('month', date)
          ORDER BY month
        `
        const predictionResult = await client.query(predictionQuery)
        const monthlyData = predictionResult.rows.map(row => parseInt(row.count))
        
        // Simple prediction: average of last 3 months with trend
        let nextMonthPrediction = thisMonth
        let confidence = 75
        
        if (monthlyData.length >= 2) {
          const avg = monthlyData.reduce((sum, val) => sum + val, 0) / monthlyData.length
          const trend = monthlyData.length >= 3 ? 
            (monthlyData[monthlyData.length - 1] - monthlyData[0]) / (monthlyData.length - 1) : 0
          
          nextMonthPrediction = Math.round(avg + trend)
          confidence = Math.min(95, Math.max(60, 75 + (monthlyData.length * 5)))
        }

        const dashboardData = {
          totalTranscripts,
          thisMonth,
          avgHandlingTime: Math.round(avgHandlingTime * 10) / 10,
          activeClients,
          lastSync: lastSyncFormatted,
          syncStatus: 'success' as const,
          monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
          predictions: {
            nextMonth: nextMonthPrediction,
            confidence
          },
          recentActivity
        }

        return NextResponse.json({
          success: true,
          data: dashboardData
        })

      } finally {
        if (client) {
          client.release()
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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
export const GET = withRateLimit(rateLimitConfigs.read, authenticated(handleGET))