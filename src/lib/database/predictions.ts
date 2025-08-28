import { Pool } from 'pg'
import { getDatabasePool } from './connection'
import { PredictionResult, TimePrediction } from '@/types/transcript'
import { PredictionResultInput } from '@/lib/validations/schemas'

export class PredictionService {
  private pool: Pool

  constructor() {
    this.pool = getDatabasePool()
  }

  async createPrediction(data: PredictionResultInput): Promise<PredictionResult> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Insert main prediction record
      const predictionQuery = `
        INSERT INTO predictions (client_id, prediction_type, model_type, confidence, accuracy, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at
      `
      
      const predictionResult = await client.query(predictionQuery, [
        data.clientId,
        data.predictionType,
        data.modelType,
        data.confidence,
        data.accuracy,
        data.createdBy
      ])
      
      const predictionId = predictionResult.rows[0].id
      const createdAt = predictionResult.rows[0].created_at
      
      // Insert individual predictions
      for (const prediction of data.predictions) {
        const predictionDetailQuery = `
          INSERT INTO prediction_details (prediction_id, predicted_date, predicted_count, confidence_lower, confidence_upper)
          VALUES ($1, $2, $3, $4, $5)
        `
        
        await client.query(predictionDetailQuery, [
          predictionId,
          prediction.date,
          prediction.predictedCount,
          prediction.confidenceInterval.lower,
          prediction.confidenceInterval.upper
        ])
      }
      
      await client.query('COMMIT')
      
      return {
        id: predictionId,
        clientId: data.clientId,
        clientName: data.clientName,
        predictionType: data.predictionType,
        predictions: data.predictions,
        confidence: data.confidence,
        accuracy: data.accuracy,
        modelType: data.modelType,
        createdAt,
        createdBy: data.createdBy
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async getPredictions(clientId?: string, predictionType?: string): Promise<PredictionResult[]> {
    let whereConditions: string[] = []
    let queryParams: any[] = []
    let paramIndex = 1

    if (clientId) {
      whereConditions.push(`p.client_id = $${paramIndex}`)
      queryParams.push(clientId)
      paramIndex++
    }

    if (predictionType) {
      whereConditions.push(`p.prediction_type = $${paramIndex}`)
      queryParams.push(predictionType)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const query = `
      SELECT 
        p.id, p.client_id, c.name as client_name, p.prediction_type,
        p.model_type, p.confidence, p.accuracy, p.created_at, p.created_by
      FROM predictions p
      JOIN clients c ON p.client_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
    `
    
    const result = await this.pool.query(query, queryParams)
    
    const predictions: PredictionResult[] = []
    
    for (const row of result.rows) {
      const detailsQuery = `
        SELECT predicted_date, predicted_count, confidence_lower, confidence_upper
        FROM prediction_details
        WHERE prediction_id = $1
        ORDER BY predicted_date ASC
      `
      
      const detailsResult = await this.pool.query(detailsQuery, [row.id])
      
      const timePredictions: TimePrediction[] = detailsResult.rows.map(detail => ({
        date: detail.predicted_date,
        predictedCount: detail.predicted_count,
        confidenceInterval: {
          lower: detail.confidence_lower,
          upper: detail.confidence_upper
        }
      }))
      
      predictions.push({
        id: row.id,
        clientId: row.client_id,
        clientName: row.client_name,
        predictionType: row.prediction_type,
        predictions: timePredictions,
        confidence: row.confidence,
        accuracy: row.accuracy,
        modelType: row.model_type,
        createdAt: row.created_at,
        createdBy: row.created_by
      })
    }
    
    return predictions
  }

  async getPredictionById(id: string): Promise<PredictionResult | null> {
    const query = `
      SELECT 
        p.id, p.client_id, c.name as client_name, p.prediction_type,
        p.model_type, p.confidence, p.accuracy, p.created_at, p.created_by
      FROM predictions p
      JOIN clients c ON p.client_id = c.id
      WHERE p.id = $1
    `
    
    const result = await this.pool.query(query, [id])
    
    if (result.rows.length === 0) {
      return null
    }
    
    const row = result.rows[0]
    
    const detailsQuery = `
      SELECT predicted_date, predicted_count, confidence_lower, confidence_upper
      FROM prediction_details
      WHERE prediction_id = $1
      ORDER BY predicted_date ASC
    `
    
    const detailsResult = await this.pool.query(detailsQuery, [id])
    
    const timePredictions: TimePrediction[] = detailsResult.rows.map(detail => ({
      date: detail.predicted_date,
      predictedCount: detail.predicted_count,
      confidenceInterval: {
        lower: detail.confidence_lower,
        upper: detail.confidence_upper
      }
    }))
    
    return {
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      predictionType: row.prediction_type,
      predictions: timePredictions,
      confidence: row.confidence,
      accuracy: row.accuracy,
      modelType: row.model_type,
      createdAt: row.created_at,
      createdBy: row.created_by
    }
  }

  async deletePrediction(id: string): Promise<boolean> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Delete prediction details first (foreign key constraint)
      await client.query('DELETE FROM prediction_details WHERE prediction_id = $1', [id])
      
      // Delete main prediction record
      const result = await client.query('DELETE FROM predictions WHERE id = $1', [id])
      
      await client.query('COMMIT')
      
      return result.rowCount > 0
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async getLatestPredictionByClient(clientId: string, predictionType: string): Promise<PredictionResult | null> {
    const query = `
      SELECT 
        p.id, p.client_id, c.name as client_name, p.prediction_type,
        p.model_type, p.confidence, p.accuracy, p.created_at, p.created_by
      FROM predictions p
      JOIN clients c ON p.client_id = c.id
      WHERE p.client_id = $1 AND p.prediction_type = $2
      ORDER BY p.created_at DESC
      LIMIT 1
    `
    
    const result = await this.pool.query(query, [clientId, predictionType])
    
    if (result.rows.length === 0) {
      return null
    }
    
    const row = result.rows[0]
    
    const detailsQuery = `
      SELECT predicted_date, predicted_count, confidence_lower, confidence_upper
      FROM prediction_details
      WHERE prediction_id = $1
      ORDER BY predicted_date ASC
    `
    
    const detailsResult = await this.pool.query(detailsQuery, [row.id])
    
    const timePredictions: TimePrediction[] = detailsResult.rows.map(detail => ({
      date: detail.predicted_date,
      predictedCount: detail.predicted_count,
      confidenceInterval: {
        lower: detail.confidence_lower,
        upper: detail.confidence_upper
      }
    }))
    
    return {
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      predictionType: row.prediction_type,
      predictions: timePredictions,
      confidence: row.confidence,
      accuracy: row.accuracy,
      modelType: row.model_type,
      createdAt: row.created_at,
      createdBy: row.created_by
    }
  }

  async getPredictionAccuracyStats(): Promise<{
    averageAccuracy: number
    modelPerformance: Array<{
      modelType: string
      averageAccuracy: number
      predictionCount: number
    }>
  }> {
    const overallQuery = `
      SELECT AVG(accuracy) as avg_accuracy
      FROM predictions
      WHERE accuracy IS NOT NULL
    `
    
    const overallResult = await this.pool.query(overallQuery)
    const averageAccuracy = parseFloat(overallResult.rows[0].avg_accuracy) || 0
    
    const modelQuery = `
      SELECT 
        model_type,
        AVG(accuracy) as avg_accuracy,
        COUNT(*) as prediction_count
      FROM predictions
      WHERE accuracy IS NOT NULL
      GROUP BY model_type
      ORDER BY avg_accuracy DESC
    `
    
    const modelResult = await this.pool.query(modelQuery)
    
    const modelPerformance = modelResult.rows.map(row => ({
      modelType: row.model_type,
      averageAccuracy: parseFloat(row.avg_accuracy),
      predictionCount: parseInt(row.prediction_count)
    }))
    
    return {
      averageAccuracy,
      modelPerformance
    }
  }
}