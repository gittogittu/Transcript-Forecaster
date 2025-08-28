import { Pool } from 'pg'
import { getDatabasePool } from './connection'
import { TranscriptData, Client, ImportResult } from '@/types/transcript'
import { TranscriptCreate, TranscriptUpdate, TranscriptQuery } from '@/lib/validations/schemas'

export class TranscriptService {
  private pool: Pool

  constructor() {
    this.pool = getDatabasePool()
  }

  async createClient(name: string): Promise<Client> {
    const query = `
      INSERT INTO clients (name)
      VALUES ($1)
      ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
      RETURNING id, name, created_at, updated_at
    `

    const result = await this.pool.query(query, [name])
    const row = result.rows[0]

    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async getClients(): Promise<Client[]> {
    const query = `
      SELECT id, name, created_at, updated_at
      FROM clients
      ORDER BY name ASC
    `

    const result = await this.pool.query(query)

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async getClientById(id: string): Promise<Client | null> {
    const query = `
      SELECT id, name, created_at, updated_at
      FROM clients
      WHERE id = $1
    `

    const result = await this.pool.query(query, [id])

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async getClientByName(name: string): Promise<Client | null> {
    const query = `
      SELECT id, name, created_at, updated_at
      FROM clients
      WHERE name = $1
    `

    const result = await this.pool.query(query, [name])

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async createTranscript(data: TranscriptCreate): Promise<TranscriptData> {
    // Ensure client exists
    let client = await this.getClientByName(data.clientName)
    if (!client) {
      client = await this.createClient(data.clientName)
    }

    const query = `
      INSERT INTO transcripts (client_id, date, transcript_count, transcript_type, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, client_id, date, transcript_count, transcript_type, notes, created_at, updated_at, created_by
    `

    const values = [
      client.id,
      data.date,
      data.transcriptCount,
      data.transcriptType || null,
      data.notes || null,
      data.createdBy
    ]

    const result = await this.pool.query(query, values)
    const row = result.rows[0]

    return {
      id: row.id,
      clientId: row.client_id,
      clientName: client.name,
      date: row.date,
      transcriptCount: row.transcript_count,
      transcriptType: row.transcript_type,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    }
  }

  async getTranscripts(params: TranscriptQuery & { page?: number; limit?: number } = { page: 1, limit: 50 }): Promise<{
    data: TranscriptData[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const { clientId, startDate, endDate, transcriptType, page = 1, limit = 50 } = params
    const offset = (page - 1) * limit

    let whereConditions: string[] = []
    let queryParams: any[] = []
    let paramIndex = 1

    if (clientId) {
      whereConditions.push(`t.client_id = $${paramIndex}`)
      queryParams.push(clientId)
      paramIndex++
    }

    if (startDate) {
      whereConditions.push(`t.date >= $${paramIndex}`)
      queryParams.push(new Date(startDate))
      paramIndex++
    }

    if (endDate) {
      whereConditions.push(`t.date <= $${paramIndex}`)
      queryParams.push(new Date(endDate))
      paramIndex++
    }

    if (transcriptType) {
      whereConditions.push(`t.transcript_type = $${paramIndex}`)
      queryParams.push(transcriptType)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transcripts t
      JOIN clients c ON t.client_id = c.id
      ${whereClause}
    `

    const countResult = await this.pool.query(countQuery, queryParams)
    const total = parseInt(countResult.rows[0].total)

    // Get paginated data
    const dataQuery = `
      SELECT 
        t.id, t.client_id, c.name as client_name, t.date, 
        t.transcript_count, t.transcript_type, t.notes,
        t.created_at, t.updated_at, t.created_by
      FROM transcripts t
      JOIN clients c ON t.client_id = c.id
      ${whereClause}
      ORDER BY t.date DESC, c.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(limit, offset)
    const dataResult = await this.pool.query(dataQuery, queryParams)

    const data = dataResult.rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      date: row.date,
      transcriptCount: row.transcript_count,
      transcriptType: row.transcript_type,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    }))

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getTranscriptById(id: string): Promise<TranscriptData | null> {
    const query = `
      SELECT 
        t.id, t.client_id, c.name as client_name, t.date, 
        t.transcript_count, t.transcript_type, t.notes,
        t.created_at, t.updated_at, t.created_by
      FROM transcripts t
      JOIN clients c ON t.client_id = c.id
      WHERE t.id = $1
    `

    const result = await this.pool.query(query, [id])

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      date: row.date,
      transcriptCount: row.transcript_count,
      transcriptType: row.transcript_type,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    }
  }

  async updateTranscript(id: string, data: TranscriptUpdate): Promise<TranscriptData | null> {
    const existing = await this.getTranscriptById(id)
    if (!existing) {
      return null
    }

    let clientId = existing.clientId

    // If client name is being updated, ensure the client exists
    if (data.clientName && data.clientName !== existing.clientName) {
      let client = await this.getClientByName(data.clientName)
      if (!client) {
        client = await this.createClient(data.clientName)
      }
      clientId = client.id
    }

    const updateFields: string[] = []
    const queryParams: any[] = []
    let paramIndex = 1

    if (data.clientName) {
      updateFields.push(`client_id = $${paramIndex}`)
      queryParams.push(clientId)
      paramIndex++
    }

    if (data.date) {
      updateFields.push(`date = $${paramIndex}`)
      queryParams.push(data.date)
      paramIndex++
    }

    if (data.transcriptCount !== undefined) {
      updateFields.push(`transcript_count = $${paramIndex}`)
      queryParams.push(data.transcriptCount)
      paramIndex++
    }

    if (data.transcriptType !== undefined) {
      updateFields.push(`transcript_type = $${paramIndex}`)
      queryParams.push(data.transcriptType)
      paramIndex++
    }

    if (data.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`)
      queryParams.push(data.notes)
      paramIndex++
    }

    if (updateFields.length === 0) {
      return existing
    }

    updateFields.push(`updated_at = NOW()`)
    queryParams.push(id)

    const query = `
      UPDATE transcripts 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, client_id, date, transcript_count, transcript_type, notes, created_at, updated_at, created_by
    `

    const result = await this.pool.query(query, queryParams)
    const row = result.rows[0]

    // Get client name
    const client = await this.getClientById(row.client_id)

    return {
      id: row.id,
      clientId: row.client_id,
      clientName: client?.name || '',
      date: row.date,
      transcriptCount: row.transcript_count,
      transcriptType: row.transcript_type,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    }
  }

  async deleteTranscript(id: string): Promise<boolean> {
    const query = `DELETE FROM transcripts WHERE id = $1`
    const result = await this.pool.query(query, [id])
    return (result.rowCount ?? 0) > 0
  }

  async bulkCreateTranscripts(transcripts: TranscriptCreate[]): Promise<ImportResult> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      const result: ImportResult = {
        totalRows: transcripts.length,
        successCount: 0,
        errorCount: 0,
        errors: [],
        duplicateCount: 0
      }

      for (let i = 0; i < transcripts.length; i++) {
        const transcript = transcripts[i]

        try {
          // Check for existing record (same client and date)
          let clientRecord = await this.getClientByName(transcript.clientName)
          if (!clientRecord) {
            clientRecord = await this.createClient(transcript.clientName)
          }

          const existingQuery = `
            SELECT id FROM transcripts 
            WHERE client_id = $1 AND date = $2
          `
          const existingResult = await client.query(existingQuery, [clientRecord.id, transcript.date])

          if (existingResult.rows.length > 0) {
            result.duplicateCount++
            continue
          }

          // Insert new record
          const insertQuery = `
            INSERT INTO transcripts (client_id, date, transcript_count, transcript_type, notes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
          `

          await client.query(insertQuery, [
            clientRecord.id,
            transcript.date,
            transcript.transcriptCount,
            transcript.transcriptType || null,
            transcript.notes || null,
            transcript.createdBy
          ])

          result.successCount++
        } catch (error) {
          result.errorCount++
          result.errors.push({
            row: i + 1,
            field: 'general',
            value: transcript,
            message: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async getTranscriptsByDateRange(startDate: Date, endDate: Date): Promise<TranscriptData[]> {
    const query = `
      SELECT 
        t.id, t.client_id, c.name as client_name, t.date, 
        t.transcript_count, t.transcript_type, t.notes,
        t.created_at, t.updated_at, t.created_by
      FROM transcripts t
      JOIN clients c ON t.client_id = c.id
      WHERE t.date >= $1 AND t.date <= $2
      ORDER BY t.date ASC, c.name ASC
    `

    const result = await this.pool.query(query, [startDate, endDate])

    return result.rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      date: row.date,
      transcriptCount: row.transcript_count,
      transcriptType: row.transcript_type,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    }))
  }

  async getTranscriptSummary(): Promise<{
    totalTranscripts: number
    totalClients: number
    averageTranscriptsPerDay: number
    dateRange: { start: Date | null; end: Date | null }
  }> {
    const query = `
      SELECT 
        COUNT(t.id) as total_transcripts,
        COUNT(DISTINCT t.client_id) as total_clients,
        MIN(t.date) as start_date,
        MAX(t.date) as end_date,
        CASE 
          WHEN MIN(t.date) IS NOT NULL AND MAX(t.date) IS NOT NULL 
          THEN COUNT(t.id)::float / GREATEST(1, (MAX(t.date) - MIN(t.date) + 1))
          ELSE 0 
        END as avg_per_day
      FROM transcripts t
    `

    const result = await this.pool.query(query)
    const row = result.rows[0]

    return {
      totalTranscripts: parseInt(row.total_transcripts),
      totalClients: parseInt(row.total_clients),
      averageTranscriptsPerDay: parseFloat(row.avg_per_day),
      dateRange: {
        start: row.start_date,
        end: row.end_date
      }
    }
  }
}

// Standalone functions for backward compatibility
const transcriptService = new TranscriptService()

export async function createTranscript(data: TranscriptCreate): Promise<TranscriptData> {
  return transcriptService.createTranscript(data)
}

export async function getTranscriptsByClientAndDate(clientName: string, date: Date): Promise<TranscriptData[]> {
  const query = `
    SELECT 
      t.id, t.client_id, c.name as client_name, t.date, 
      t.transcript_count, t.transcript_type, t.notes,
      t.created_at, t.updated_at, t.created_by
    FROM transcripts t
    JOIN clients c ON t.client_id = c.id
    WHERE c.name = $1 AND t.date = $2
    ORDER BY t.created_at DESC
  `

  const pool = getDatabasePool()
  const result = await pool.query(query, [clientName, date])

  return result.rows.map(row => ({
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    date: row.date,
    transcriptCount: row.transcript_count,
    transcriptType: row.transcript_type,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by
  }))
}