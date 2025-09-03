/**
 * Data Import Utility for AHT and Monthly Transcript Data
 * 
 * This utility handles importing client data with AHT metrics and monthly transcript counts
 */

import { Pool } from 'pg'
import { getDatabasePool } from './connection'

export interface ClientDataRow {
  client: string
  overallAht: number | null
  reviewAht: number | null
  validationAht: number | null
  monthlyData: Record<string, number> // e.g., { 'Jun-2024': 1612, 'Jul-2024': 4000 }
  grandTotal: number
}

export interface ImportResult {
  success: boolean
  clientsProcessed: number
  monthsProcessed: number
  errors: string[]
  summary: {
    totalClients: number
    totalTranscripts: number
    dateRange: {
      start: string
      end: string
    }
    topClients: Array<{
      name: string
      total: number
    }>
  }
}

export class DataImporter {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = await getDatabasePool()
    }
    return this.pool
  }

  /**
   * Parse month key (e.g., 'Jun-2024') to year and month number
   */
  private parseMonthKey(monthKey: string): { year: number; month: number } | null {
    const monthMap: Record<string, number> = {
      'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
      'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
    }

    const parts = monthKey.split('-')
    if (parts.length !== 2) return null

    const monthName = parts[0]
    const year = parseInt(parts[1])

    if (!monthMap[monthName] || isNaN(year)) return null

    return {
      year,
      month: monthMap[monthName]
    }
  }

  /**
   * Determine environment from client code
   */
  private getEnvironment(clientCode: string): string {
    return clientCode.includes('-uat') ? 'uat' : 'prod'
  }

  /**
   * Clean client name for display
   */
  private cleanClientName(clientCode: string): string {
    // Remove environment suffix and convert to readable name
    const baseName = clientCode.replace(/-uat$|-prod$/, '')
    return baseName
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  /**
   * Import client and monthly data
   */
  public async importData(data: ClientDataRow[]): Promise<ImportResult> {
    const pool = await this.getPool()
    const client = await pool.connect()
    
    const result: ImportResult = {
      success: false,
      clientsProcessed: 0,
      monthsProcessed: 0,
      errors: [],
      summary: {
        totalClients: 0,
        totalTranscripts: 0,
        dateRange: { start: '', end: '' },
        topClients: []
      }
    }

    try {
      await client.query('BEGIN')

      let totalTranscripts = 0
      const allMonths: string[] = []
      const clientTotals: Array<{ name: string; total: number }> = []

      for (const row of data) {
        try {
          // Skip empty or invalid rows
          if (!row.client || row.client.trim() === '' || row.grandTotal === 0) {
            continue
          }

          const clientCode = row.client.trim()
          const clientName = this.cleanClientName(clientCode)
          const environment = this.getEnvironment(clientCode)

          // Insert or update client
          const clientResult = await client.query(`
            INSERT INTO clients (name, client_code, overall_aht, review_aht, validation_aht, environment)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (client_code) 
            DO UPDATE SET
              name = EXCLUDED.name,
              overall_aht = EXCLUDED.overall_aht,
              review_aht = EXCLUDED.review_aht,
              validation_aht = EXCLUDED.validation_aht,
              environment = EXCLUDED.environment,
              updated_at = NOW()
            RETURNING id
          `, [
            clientName,
            clientCode,
            row.overallAht,
            row.reviewAht,
            row.validationAht,
            environment
          ])

          const clientId = clientResult.rows[0].id
          result.clientsProcessed++

          // Insert monthly data
          for (const [monthKey, count] of Object.entries(row.monthlyData)) {
            if (count === 0) continue // Skip months with no data

            const parsedDate = this.parseMonthKey(monthKey)
            if (!parsedDate) {
              result.errors.push(`Invalid month key: ${monthKey} for client ${clientCode}`)
              continue
            }

            await client.query(`
              INSERT INTO monthly_transcript_data (client_id, client_code, year, month, month_key, transcript_count)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (client_id, year, month)
              DO UPDATE SET
                transcript_count = EXCLUDED.transcript_count,
                month_key = EXCLUDED.month_key,
                updated_at = NOW()
            `, [
              clientId,
              clientCode,
              parsedDate.year,
              parsedDate.month,
              monthKey,
              count
            ])

            result.monthsProcessed++
            totalTranscripts += count
            allMonths.push(monthKey)
          }

          clientTotals.push({
            name: clientName,
            total: row.grandTotal
          })

        } catch (error) {
          const errorMsg = `Error processing client ${row.client}: ${error instanceof Error ? error.message : String(error)}`
          result.errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      // Calculate summary statistics
      result.summary.totalClients = result.clientsProcessed
      result.summary.totalTranscripts = totalTranscripts

      // Get date range
      const uniqueMonths = [...new Set(allMonths)].sort()
      if (uniqueMonths.length > 0) {
        result.summary.dateRange.start = uniqueMonths[0]
        result.summary.dateRange.end = uniqueMonths[uniqueMonths.length - 1]
      }

      // Get top clients
      result.summary.topClients = clientTotals
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)

      await client.query('COMMIT')
      result.success = true

      console.log(`✅ Import completed successfully:`)
      console.log(`   - Clients processed: ${result.clientsProcessed}`)
      console.log(`   - Monthly records: ${result.monthsProcessed}`)
      console.log(`   - Total transcripts: ${result.summary.totalTranscripts.toLocaleString()}`)
      console.log(`   - Date range: ${result.summary.dateRange.start} to ${result.summary.dateRange.end}`)

    } catch (error) {
      await client.query('ROLLBACK')
      const errorMsg = `Import failed: ${error instanceof Error ? error.message : String(error)}`
      result.errors.push(errorMsg)
      console.error(errorMsg)
    } finally {
      client.release()
    }

    return result
  }

  /**
   * Parse CSV-like data from your format
   */
  public parseRawData(rawData: string): ClientDataRow[] {
    const lines = rawData.trim().split('\n')
    if (lines.length < 2) return []

    // Parse header to get month columns
    const headers = lines[0].split('\t').map(h => h.trim())
    const clientIndex = headers.findIndex(h => h.toLowerCase().includes('client'))
    const ahtIndices = {
      overall: headers.findIndex(h => h.toLowerCase().includes('overall') && h.toLowerCase().includes('aht')),
      review: headers.findIndex(h => h.toLowerCase().includes('review') && h.toLowerCase().includes('aht')),
      validation: headers.findIndex(h => h.toLowerCase().includes('validation') && h.toLowerCase().includes('aht'))
    }
    const grandTotalIndex = headers.findIndex(h => h.toLowerCase().includes('grand') && h.toLowerCase().includes('total'))

    // Find month columns (between AHT columns and Grand Total)
    const monthColumns: Array<{ index: number; monthKey: string }> = []
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      // Check if it looks like a month (e.g., 'Jun-2024', 'Jul-2024')
      if (/^[A-Za-z]{3}-\d{4}$/.test(header)) {
        monthColumns.push({ index: i, monthKey: header })
      }
    }

    const result: ClientDataRow[] = []

    // Process data rows (skip header and grand total row)
    for (let i = 1; i < lines.length - 1; i++) {
      const cells = lines[i].split('\t').map(c => c.trim())
      
      if (cells.length < headers.length || !cells[clientIndex]) continue

      const clientCode = cells[clientIndex]
      if (clientCode.toLowerCase().includes('grand total')) continue

      const monthlyData: Record<string, number> = {}
      let grandTotal = 0

      // Parse monthly data
      for (const { index, monthKey } of monthColumns) {
        const value = parseInt(cells[index]) || 0
        monthlyData[monthKey] = value
        grandTotal += value
      }

      // Use provided grand total if available, otherwise calculate
      if (grandTotalIndex >= 0 && cells[grandTotalIndex]) {
        grandTotal = parseInt(cells[grandTotalIndex]) || grandTotal
      }

      const row: ClientDataRow = {
        client: clientCode,
        overallAht: ahtIndices.overall >= 0 ? parseFloat(cells[ahtIndices.overall]) || null : null,
        reviewAht: ahtIndices.review >= 0 ? parseFloat(cells[ahtIndices.review]) || null : null,
        validationAht: ahtIndices.validation >= 0 ? parseFloat(cells[ahtIndices.validation]) || null : null,
        monthlyData,
        grandTotal
      }

      result.push(row)
    }

    return result
  }

  /**
   * Get import statistics
   */
  public async getImportStats(): Promise<any> {
    const pool = await this.getPool()

    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT CASE WHEN c.environment = 'prod' THEN c.id END) as prod_clients,
        COUNT(DISTINCT CASE WHEN c.environment = 'uat' THEN c.id END) as uat_clients,
        COUNT(mtd.id) as total_monthly_records,
        SUM(mtd.transcript_count) as total_transcripts,
        MIN(MAKE_DATE(mtd.year, mtd.month, 1)) as earliest_month,
        MAX(MAKE_DATE(mtd.year, mtd.month, 1)) as latest_month,
        AVG(c.overall_aht) as avg_overall_aht,
        AVG(c.review_aht) as avg_review_aht,
        AVG(c.validation_aht) as avg_validation_aht
      FROM clients c
      LEFT JOIN monthly_transcript_data mtd ON c.id = mtd.client_id
      WHERE c.is_active = true
    `)

    const topClients = await pool.query(`
      SELECT 
        c.name,
        c.client_code,
        c.environment,
        cas.total_transcripts,
        cas.avg_monthly_transcripts,
        cas.growth_trend
      FROM clients c
      JOIN client_analytics_summary cas ON c.id = cas.client_id
      ORDER BY cas.total_transcripts DESC
      LIMIT 10
    `)

    return {
      overview: stats.rows[0],
      topClients: topClients.rows
    }
  }
}

// Export singleton instance
export const dataImporter = new DataImporter()
export default dataImporter