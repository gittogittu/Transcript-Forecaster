
export interface PredictionResult {
    prediction_date: string
    predicted_transcript_count: number
    confidence_interval?: {
        lower_bound: number
        upper_bound: number
        confidence_level: number
    }
    contributing_factors: {
        seasonal_impact: number
        trend_component: number
        historical_average: number
        external_factors: any[]
    }
}

export interface ForecastResponse {
    success: boolean
    client_id: string
    prediction_horizon: number
    predictions: PredictionResult[]
    model_metadata: {
        model_version: string
        training_data_end_date: string
        accuracy_metrics: {
            mae: number
            rmse: number
            mape: number
            r2_score: number
        }
    }
    timestamp: string
}

export function generateSimpleForecast(clientId: string, horizon: number = 7, includeConfidence: boolean = true): ForecastResponse {
    // Generate mock prediction data for testing purposes
    // In a real implementation, this would call your ML models
    const predictions: PredictionResult[] = []
    const baseDate = new Date()

    for (let i = 1; i <= horizon; i++) {
        const predictionDate = new Date(baseDate)
        predictionDate.setDate(baseDate.getDate() + i)

        // Generate realistic mock data
        // Use clientId to seed randomness slightly if needed, but for now random is fine
        const baseVolume = 150 + Math.random() * 50
        const seasonalFactor = 1 + 0.2 * Math.sin((i / 7) * 2 * Math.PI) // Weekly pattern
        const randomFactor = 0.9 + Math.random() * 0.2
        const predictedCount = Math.round(baseVolume * seasonalFactor * randomFactor)

        predictions.push({
            prediction_date: predictionDate.toISOString().split('T')[0],
            predicted_transcript_count: predictedCount,
            confidence_interval: includeConfidence ? {
                lower_bound: Math.round(predictedCount * 0.85),
                upper_bound: Math.round(predictedCount * 1.15),
                confidence_level: 0.95
            } : undefined,
            contributing_factors: {
                seasonal_impact: seasonalFactor,
                trend_component: 1.02,
                historical_average: 145,
                external_factors: []
            }
        })
    }

    return {
        success: true,
        client_id: clientId,
        prediction_horizon: horizon,
        predictions,
        model_metadata: {
            model_version: '1.0.0-simple',
            training_data_end_date: new Date().toISOString().split('T')[0],
            accuracy_metrics: {
                mae: 8.2,
                rmse: 12.1,
                mape: 5.4,
                r2_score: 0.87
            }
        },
        timestamp: new Date().toISOString()
    }
}
