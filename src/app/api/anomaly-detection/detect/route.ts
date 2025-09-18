import { NextRequest, NextResponse } from 'next/server'
import { AnomalyDetectionService } from '@/lib/services/anomaly-detection'
import { TimeSeriesData } from '@/lib/services/anomaly-detection/types'

// Initialize the anomaly detection service
const anomalyService = new AnomalyDetectionService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      data, 
      clientId, 
      includeExplanations = false, 
      historicalData,
      detection_method = 'isolation_forest',
      sensitivity = 0.1,
      include_explanations = false
    } = body

    // If no specific data provided, fetch recent data from database
    if (!data) {
      const { DatabaseConnection } = require('@/lib/database/connection')
      const db = DatabaseConnection.getInstance()
      const pool = await db.getPool()
      
      const recentDataQuery = `
        SELECT 
          c.name as client_name,
          t.date,
          t.transcript_count,
          c.overall_aht
        FROM clients c
        JOIN transcripts t ON c.id = t.client_id
        WHERE t.date >= CURRENT_DATE - INTERVAL '3 months'
        ORDER BY c.name, t.date
      `
      
      const result = await pool.query(recentDataQuery)
      
      // Group by client and detect anomalies
      const clientData = new Map()
      result.rows.forEach(row => {
        if (!clientData.has(row.client_name)) {
          clientData.set(row.client_name, [])
        }
        clientData.get(row.client_name).push({
          date: row.date,
          value: row.transcript_count,
          aht: row.overall_aht
        })
      })
      
      const anomalies = []
      
      for (const [clientName, clientRecords] of clientData.entries()) {
        if (clientRecords.length < 3) continue // Need minimum data points
        
        const values = clientRecords.map(r => r.value)
        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length)
        
        // Simple anomaly detection using z-score
        clientRecords.forEach(record => {
          const zScore = Math.abs((record.value - mean) / stdDev)
          if (zScore > 2) { // 2 standard deviations
            const severity = zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low'
            anomalies.push({
              client_name: clientName,
              anomaly_score: zScore,
              expected_range: [Math.max(0, mean - 2 * stdDev), mean + 2 * stdDev],
              actual_value: record.value,
              severity,
              date: record.date
            })
          }
        })
      }
      
      return NextResponse.json({
        success: true,
        anomalies: anomalies.slice(0, 20), // Limit to top 20 anomalies
        detection_summary: {
          total_clients_analyzed: clientData.size,
          anomalies_found: anomalies.length,
          detection_method: 'statistical_zscore',
          sensitivity_threshold: 2.0
        }
      })
    }

    // Validate input data
    if (!data || !Array.isArray(data.timestamps) || !Array.isArray(data.values)) {
      return NextResponse.json(
        { error: 'Invalid data format. Expected timestamps and values arrays.' },
        { status: 400 }
      )
    }

    if (data.timestamps.length !== data.values.length) {
      return NextResponse.json(
        { error: 'Timestamps and values arrays must have the same length.' },
        { status: 400 }
      )
    }

    // Convert timestamps to Date objects
    const timeSeriesData: TimeSeriesData = {
      timestamps: data.timestamps.map((ts: string | number) => new Date(ts)),
      values: data.values,
      clientId: clientId || 'unknown',
      metadata: data.metadata || {}
    }

    // Initialize service if not already done
    if (!anomalyService.getMonitoringStatus) {
      const trainingData = historicalData ? [historicalData] : []
      await anomalyService.initialize(trainingData)
    }

    // Detect anomalies
    const result = await anomalyService.detectAnomalies(timeSeriesData)

    // Generate explanations if requested
    let explanations: Map<string, any> | undefined
    if (includeExplanations && result.anomalies.length > 0) {
      const historicalDataArray = historicalData ? [historicalData] : undefined
      explanations = await anomalyService.explainAnomalies(
        result.anomalies, 
        timeSeriesData, 
        historicalDataArray
      )
    }

    // Convert explanations Map to object for JSON serialization
    const explanationsObj = explanations ? 
      Object.fromEntries(explanations.entries()) : undefined

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        explanations: explanationsObj
      }
    })

  } catch (error) {
    console.error('Anomaly detection error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to detect anomalies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Get monitoring status and recent alerts
    const status = anomalyService.getMonitoringStatus()
    const alerts = anomalyService.getClientAlerts(clientId, 20)

    return NextResponse.json({
      success: true,
      status,
      alerts
    })

  } catch (error) {
    console.error('Error getting anomaly detection status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}