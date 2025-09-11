import { NextRequest, NextResponse } from 'next/server'
import { DatabaseConnection } from '@/lib/database/connection'

export async function GET() {
  try {
    const db = DatabaseConnection.getInstance()
    const pool = await db.getPool()
    
    // 1. Overview Statistics
    const overviewQuery = `
      SELECT 
        COUNT(DISTINCT c.id) as total_clients,
        COALESCE(SUM(t.transcript_count), 0) as total_transcripts,
        COALESCE(AVG(c.overall_aht), 0) as avg_aht,
        MIN(t.date) as start_date,
        MAX(t.date) as end_date
      FROM clients c
      LEFT JOIN transcripts t ON c.id = t.client_id
    `
    const overviewResult = await pool.query(overviewQuery)
    const overview = overviewResult.rows[0] || {}

    // 2. Monthly Trends
    const monthlyTrendsQuery = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', t.date), 'Mon YYYY') as month,
        SUM(t.transcript_count) as total_transcripts,
        COUNT(DISTINCT t.client_id) as active_clients,
        AVG(t.transcript_count) as avg_per_client,
        MAX(t.transcript_count) as peak_client
      FROM transcripts t
      GROUP BY DATE_TRUNC('month', t.date)
      ORDER BY DATE_TRUNC('month', t.date)
    `
    const monthlyTrendsResult = await pool.query(monthlyTrendsQuery)

    // 3. Top Clients
    const topClientsQuery = `
      SELECT 
        c.name,
        SUM(t.transcript_count) as total_transcripts,
        c.overall_aht,
        c.review_aht,
        c.validation_aht,
        COUNT(t.id) as months_active,
        MIN(t.date) as first_month,
        MAX(t.date) as last_month
      FROM clients c
      LEFT JOIN transcripts t ON c.id = t.client_id
      GROUP BY c.id, c.name, c.overall_aht, c.review_aht, c.validation_aht
      ORDER BY total_transcripts DESC
      LIMIT 15
    `
    const topClientsResult = await pool.query(topClientsQuery)

    // 4. Environment Analysis
    const environmentQuery = `
      SELECT 
        CASE 
          WHEN c.name LIKE '%-prod' THEN 'Production'
          WHEN c.name LIKE '%-uat' THEN 'UAT'
          ELSE 'Other'
        END as environment,
        COUNT(DISTINCT c.id) as client_count,
        COALESCE(SUM(t.transcript_count), 0) as total_transcripts,
        AVG(c.overall_aht) as avg_overall_aht,
        AVG(c.review_aht) as avg_review_aht,
        AVG(c.validation_aht) as avg_validation_aht
      FROM clients c
      LEFT JOIN transcripts t ON c.id = t.client_id
      GROUP BY CASE 
          WHEN c.name LIKE '%-prod' THEN 'Production'
          WHEN c.name LIKE '%-uat' THEN 'UAT'
          ELSE 'Other'
        END
      ORDER BY total_transcripts DESC
    `
    const environmentResult = await pool.query(environmentQuery)

    // 5. Seasonal Patterns
    const seasonalQuery = `
      SELECT 
        TO_CHAR(t.date, 'Month') as month_name,
        SUM(t.transcript_count) as total_transcripts,
        COUNT(DISTINCT t.client_id) as active_clients,
        AVG(t.transcript_count) as avg_per_client
      FROM transcripts t
      GROUP BY EXTRACT(MONTH FROM t.date), TO_CHAR(t.date, 'Month')
      ORDER BY EXTRACT(MONTH FROM t.date)
    `
    const seasonalResult = await pool.query(seasonalQuery)

    // 6. Growth Analysis
    const growthQuery = `
      WITH monthly_totals AS (
        SELECT 
          DATE_TRUNC('month', t.date) as month,
          TO_CHAR(DATE_TRUNC('month', t.date), 'Mon YYYY') as month_name,
          SUM(t.transcript_count) as total
        FROM transcripts t
        GROUP BY DATE_TRUNC('month', t.date)
        ORDER BY month
      ),
      growth_rates AS (
        SELECT 
          month_name,
          total,
          LAG(total) OVER (ORDER BY month) as prev_total,
          CASE 
            WHEN LAG(total) OVER (ORDER BY month) > 0 
            THEN ((total - LAG(total) OVER (ORDER BY month)) * 100.0 / LAG(total) OVER (ORDER BY month))
            ELSE 0 
          END as growth_rate_percent
        FROM monthly_totals
      )
      SELECT month_name, total, COALESCE(growth_rate_percent, 0) as growth_rate_percent
      FROM growth_rates
      WHERE growth_rate_percent IS NOT NULL OR total IS NOT NULL
      ORDER BY month_name
    `
    const growthResult = await pool.query(growthQuery)

    // 7. AHT Distribution
    const ahtDistributionQuery = `
      WITH aht_ranges AS (
        SELECT 
          CASE 
            WHEN overall_aht < 5 THEN '0-5m'
            WHEN overall_aht < 10 THEN '5-10m'
            WHEN overall_aht < 15 THEN '10-15m'
            WHEN overall_aht < 20 THEN '15-20m'
            WHEN overall_aht < 25 THEN '20-25m'
            ELSE '25m+'
          END as aht_range,
          COUNT(*) as client_count
        FROM clients
        WHERE overall_aht IS NOT NULL
        GROUP BY CASE 
            WHEN overall_aht < 5 THEN '0-5m'
            WHEN overall_aht < 10 THEN '5-10m'
            WHEN overall_aht < 15 THEN '10-15m'
            WHEN overall_aht < 20 THEN '15-20m'
            WHEN overall_aht < 25 THEN '20-25m'
            ELSE '25m+'
          END
      )
      SELECT 
        aht_range,
        client_count,
        ROUND((client_count * 100.0 / SUM(client_count) OVER ()), 1) as percentage
      FROM aht_ranges
      ORDER BY 
        CASE aht_range
          WHEN '0-5m' THEN 1
          WHEN '5-10m' THEN 2
          WHEN '10-15m' THEN 3
          WHEN '15-20m' THEN 4
          WHEN '20-25m' THEN 5
          ELSE 6
        END
    `
    const ahtDistributionResult = await pool.query(ahtDistributionQuery)

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_clients: parseInt(overview.total_clients),
          total_transcripts: parseInt(overview.total_transcripts),
          avg_aht: parseFloat(overview.avg_aht),
          date_range: {
            start: overview.start_date,
            end: overview.end_date
          }
        },
        monthly_trends: monthlyTrendsResult.rows.map(row => ({
          month: row.month,
          total_transcripts: parseInt(row.total_transcripts),
          active_clients: parseInt(row.active_clients),
          avg_per_client: parseFloat(row.avg_per_client),
          peak_client: parseInt(row.peak_client)
        })),
        top_clients: topClientsResult.rows.map(row => ({
          name: row.name,
          total_transcripts: parseInt(row.total_transcripts || 0),
          overall_aht: parseFloat(row.overall_aht || 0),
          review_aht: parseFloat(row.review_aht || 0),
          validation_aht: parseFloat(row.validation_aht || 0),
          months_active: parseInt(row.months_active || 0),
          first_month: row.first_month,
          last_month: row.last_month
        })),
        environment_analysis: environmentResult.rows.map(row => ({
          environment: row.environment,
          client_count: parseInt(row.client_count),
          total_transcripts: parseInt(row.total_transcripts),
          avg_overall_aht: parseFloat(row.avg_overall_aht || 0),
          avg_review_aht: parseFloat(row.avg_review_aht || 0),
          avg_validation_aht: parseFloat(row.avg_validation_aht || 0)
        })),
        seasonal_patterns: seasonalResult.rows.map(row => ({
          month_name: row.month_name,
          total_transcripts: parseInt(row.total_transcripts),
          active_clients: parseInt(row.active_clients),
          avg_per_client: parseFloat(row.avg_per_client)
        })),
        growth_analysis: growthResult.rows.map(row => ({
          month_name: row.month_name,
          total: parseInt(row.total),
          growth_rate_percent: parseFloat(row.growth_rate_percent)
        })),
        aht_distribution: ahtDistributionResult.rows.map(row => ({
          aht_range: row.aht_range,
          client_count: parseInt(row.client_count),
          percentage: parseFloat(row.percentage)
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching comprehensive data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comprehensive analytics data' },
      { status: 500 }
    )
  }
}