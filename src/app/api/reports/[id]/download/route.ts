import { NextRequest, NextResponse } from 'next/server'
import { authenticated, getCurrentUser } from '@/lib/middleware/auth'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { performanceMiddleware } from '@/lib/middleware/performance-middleware'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

/**
 * GET /api/reports/[id]/download - Download a generated report
 */
async function handleGET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return performanceMiddleware(request, async () => {
    try {
      const user = await getCurrentUser(request)
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const reportId = params.id
      const client = await pool.connect()

      try {
        // Get report data
        const reportQuery = `
          SELECT 
            id,
            report_name,
            report_type,
            status,
            report_data,
            file_size,
            created_at
          FROM reports
          WHERE id = $1 AND user_id = $2
        `
        
        const result = await client.query(reportQuery, [reportId, user.userId])
        
        if (result.rows.length === 0) {
          return NextResponse.json(
            { error: 'Report not found' },
            { status: 404 }
          )
        }

        const report = result.rows[0]
        
        if (report.status !== 'completed') {
          return NextResponse.json(
            { error: 'Report is not ready for download' },
            { status: 400 }
          )
        }

        // Get format from query params (default to JSON)
        const { searchParams } = new URL(request.url)
        const format = searchParams.get('format') || 'json'

        let responseData: string
        let contentType: string
        let filename: string

        switch (format.toLowerCase()) {
          case 'csv':
            responseData = convertToCSV(report.report_data)
            contentType = 'text/csv'
            filename = `${report.report_name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
            break
          case 'json':
          default:
            responseData = JSON.stringify(report.report_data, null, 2)
            contentType = 'application/json'
            filename = `${report.report_name.replace(/[^a-zA-Z0-9]/g, '_')}.json`
            break
        }

        // Return file as download
        return new NextResponse(responseData, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': responseData.length.toString(),
          },
        })

      } finally {
        client.release()
      }

    } catch (error) {
      console.error('Error downloading report:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

function convertToCSV(data: any): string {
  if (!data || typeof data !== 'object') {
    return 'No data available'
  }

  // Handle different report structures
  if (data.summary && data.timeGroups) {
    // Analytics report
    let csv = 'Report Type,Analytics Report\n'
    csv += `Generated At,${data.summary.generatedAt || new Date().toISOString()}\n`
    csv += `Total Transcripts,${data.summary.totalTranscripts || 0}\n`
    csv += `Unique Clients,${data.summary.uniqueClients || 0}\n\n`
    
    if (data.timeGroups && data.timeGroups.length > 0) {
      csv += 'Period,Count,Items\n'
      data.timeGroups.forEach((group: any) => {
        csv += `${group.period},${group.count},${group.items}\n`
      })
    }
    
    return csv
  }

  if (data.summary && data.monthlyBreakdown) {
    // Monthly report
    let csv = 'Report Type,Monthly Report\n'
    csv += `Total Months,${data.summary.totalMonths || 0}\n`
    csv += `Total Transcripts,${data.summary.totalTranscripts || 0}\n`
    csv += `Average Per Month,${data.summary.averagePerMonth || 0}\n\n`
    
    if (data.monthlyBreakdown && data.monthlyBreakdown.length > 0) {
      csv += 'Month,Count,Items\n'
      data.monthlyBreakdown.forEach((month: any) => {
        csv += `${month.period},${month.count},${month.items}\n`
      })
    }
    
    return csv
  }

  // Generic data conversion
  try {
    const flatData = flattenObject(data)
    const headers = Object.keys(flatData)
    let csv = headers.join(',') + '\n'
    csv += headers.map(header => flatData[header]).join(',') + '\n'
    return csv
  } catch (error) {
    return JSON.stringify(data, null, 2)
  }
}

function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {}
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey))
      } else if (Array.isArray(obj[key])) {
        flattened[newKey] = `[${obj[key].length} items]`
      } else {
        flattened[newKey] = obj[key]
      }
    }
  }
  
  return flattened
}

// Export handlers with middleware
export const GET = withRateLimit(rateLimitConfigs.read, authenticated(handleGET))