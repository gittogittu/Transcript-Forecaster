import { Pool } from 'pg';
import { TranscriptData, Client } from '@/types/transcript';
import { getDatabasePool } from '@/lib/database/connection';

export interface DatabaseTranscriptData extends Omit<TranscriptData, 'month'> {
  id: string;
  clientId: string;
  month: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseClient extends Client {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DatabaseService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || getDatabasePool();
  }

  /**
   * Fetch all transcript data
   */
  async fetchTranscripts(): Promise<TranscriptData[]> {
    const query = `
      SELECT 
        t.id,
        c.name as client_name,
        t.month,
        t.count as transcript_count,
        t.notes,
        t.created_at,
        t.updated_at
      FROM transcripts t
      JOIN clients c ON t.client_id = c.id
      ORDER BY c.name, t.month DESC
    `;

    const result = await this.pool.query(query);
    
    return result.rows.map(row => ({
      clientName: row.client_name,
      month: this.formatMonthForApi(row.month),
      transcriptCount: row.count,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Add new transcript data
   */
  async addTranscript(data: TranscriptData): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get or create client
      const clientId = await this.getOrCreateClient(data.clientName, client);

      // Insert transcript
      await client.query(
        `INSERT INTO transcripts (client_id, month, count, notes) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (client_id, month) 
         DO UPDATE SET count = $3, notes = $4, updated_at = NOW()`,
        [clientId, this.parseMonthFromApi(data.month), data.transcriptCount, data.notes]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update transcript data
   */
  async updateTranscript(clientName: string, month: string, data: Partial<TranscriptData>): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get client ID
      const clientResult = await client.query('SELECT id FROM clients WHERE name = $1', [clientName]);
      if (clientResult.rows.length === 0) {
        throw new Error(`Client not found: ${clientName}`);
      }
      const clientId = clientResult.rows[0].id;

      // Update transcript
      const updateFields: string[] = [];
      const values: any[] = [clientId, this.parseMonthFromApi(month)];
      let paramIndex = 3;

      if (data.transcriptCount !== undefined) {
        updateFields.push(`count = $${paramIndex++}`);
        values.push(data.transcriptCount);
      }

      if (data.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        values.push(data.notes);
      }

      if (updateFields.length === 0) {
        return; // Nothing to update
      }

      updateFields.push('updated_at = NOW()');

      const query = `
        UPDATE transcripts 
        SET ${updateFields.join(', ')}
        WHERE client_id = $1 AND month = $2
      `;

      const result = await client.query(query, values);
      
      if (result.rowCount === 0) {
        throw new Error(`Transcript not found for client ${clientName} and month ${month}`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete transcript data
   */
  async deleteTranscript(clientName: string, month: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get client ID
      const clientResult = await client.query('SELECT id FROM clients WHERE name = $1', [clientName]);
      if (clientResult.rows.length === 0) {
        throw new Error(`Client not found: ${clientName}`);
      }
      const clientId = clientResult.rows[0].id;

      // Delete transcript
      const result = await client.query(
        'DELETE FROM transcripts WHERE client_id = $1 AND month = $2',
        [clientId, this.parseMonthFromApi(month)]
      );

      if (result.rowCount === 0) {
        throw new Error(`Transcript not found for client ${clientName} and month ${month}`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all clients
   */
  async getClients(): Promise<DatabaseClient[]> {
    const query = 'SELECT id, name, created_at, updated_at FROM clients ORDER BY name';
    const result = await this.pool.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Get transcript data for a specific client
   */
  async getTranscriptsByClient(clientName: string): Promise<TranscriptData[]> {
    const query = `
      SELECT 
        t.month,
        t.count as transcript_count,
        t.notes,
        t.created_at,
        t.updated_at
      FROM transcripts t
      JOIN clients c ON t.client_id = c.id
      WHERE c.name = $1
      ORDER BY t.month DESC
    `;

    const result = await this.pool.query(query, [clientName]);
    
    return result.rows.map(row => ({
      clientName,
      month: this.formatMonthForApi(row.month),
      transcriptCount: row.transcript_count,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Sync data (placeholder for compatibility with Google Sheets service)
   */
  async syncWithSheets(): Promise<void> {
    // This method is for compatibility with the Google Sheets service interface
    // In a database context, this could trigger data validation or cleanup
    console.log('Database sync completed - no action needed');
  }

  /**
   * Get or create client (internal helper)
   */
  private async getOrCreateClient(clientName: string, client: any): Promise<string> {
    // Try to get existing client
    let result = await client.query('SELECT id FROM clients WHERE name = $1', [clientName]);
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // Create new client
    result = await client.query(
      'INSERT INTO clients (name) VALUES ($1) RETURNING id',
      [clientName]
    );
    
    return result.rows[0].id;
  }

  /**
   * Convert API month format (YYYY-MM) to Date
   */
  private parseMonthFromApi(month: string): Date {
    const [year, monthNum] = month.split('-');
    return new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  }

  /**
   * Convert Date to API month format (YYYY-MM)
   */
  private formatMonthForApi(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}