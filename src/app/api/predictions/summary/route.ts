import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database/connection'
import { generateSimpleForecast } from '@/lib/services/forecasting/simple-forecaster'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('project_id')

        const pool = await getDatabasePool()

        let query = `SELECT id, name, client_code 
       FROM clients 
       WHERE is_active = true`

        const params: any[] = []

        if (projectId) {
            query += ` AND project_id = $1`
            params.push(projectId)
        }

        query += ` ORDER BY name ASC`

        // Fetch all active clients
        const clientsResult = await pool.query(query, params)

        const clients = clientsResult.rows
        const summaries = []

        for (const client of clients) {
            // Generate 7-day forecast
            const forecast = generateSimpleForecast(client.id, 7, true)

            // Calculate total volume
            const totalVolume = forecast.predictions.reduce((sum, p) => sum + p.predicted_transcript_count, 0)

            // Determine trend
            // Simple trend: compare last day to first day
            const firstDay = forecast.predictions[0].predicted_transcript_count
            const lastDay = forecast.predictions[forecast.predictions.length - 1].predicted_transcript_count

            let trend = 'Stable'
            if (lastDay > firstDay * 1.05) trend = 'Up'
            else if (lastDay < firstDay * 0.95) trend = 'Down'

            // Calculate confidence range for the total volume
            // Summing lower and upper bounds of individual days
            const lowerBoundTotal = forecast.predictions.reduce((sum, p) => sum + (p.confidence_interval?.lower_bound || p.predicted_transcript_count), 0)
            const upperBoundTotal = forecast.predictions.reduce((sum, p) => sum + (p.confidence_interval?.upper_bound || p.predicted_transcript_count), 0)

            summaries.push({
                clientId: client.id,
                clientName: client.name,
                clientCode: client.client_code,
                totalPredictedVolume: totalVolume,
                trend,
                confidenceRange: {
                    lower: lowerBoundTotal,
                    upper: upperBoundTotal
                }
            })
        }

        return NextResponse.json({
            success: true,
            summaries
        })

    } catch (error) {
        console.error('Error generating prediction summaries:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to generate summaries' },
            { status: 500 }
        )
    }
}
