import { google } from 'googleapis'
import { TranscriptData, TranscriptRow, SheetsApiResponse, SheetsUpdateResponse, SheetsError } from '@/types/transcript'

/**
 * Google Sheets service class for managing transcript data
 */
export class GoogleSheetsService {
  private sheets
  private spreadsheetId: string
  private range: string

  constructor() {
    // Initialize Google Sheets API client
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    this.sheets = google.sheets({ version: 'v4', auth })
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
    this.range = process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A:F'

    if (!this.spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID environment variable is required')
    }
  }

  /**
   * Fetch all transcript data from Google Sheets
   */
  async fetchTranscripts(): Promise<TranscriptData[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.range,
      })

      const rows = response.data.values || []
      
      // Skip header row if it exists
      const dataRows = rows.length > 0 && this.isHeaderRow(rows[0]) ? rows.slice(1) : rows

      return dataRows.map((row, index) => this.mapRowToTranscriptData(row, index))
    } catch (error) {
      throw this.handleSheetsError(error, 'Failed to fetch transcript data')
    }
  }

  /**
   * Add new transcript data to Google Sheets
   */
  async addTranscript(data: Omit<TranscriptData, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const now = new Date().toISOString()
      const row = [
        data.clientName,
        data.month,
        data.transcriptCount.toString(),
        now,
        now,
        data.notes || ''
      ]

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: this.range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      })
    } catch (error) {
      throw this.handleSheetsError(error, 'Failed to add transcript data')
    }
  }

  /**
   * Update existing transcript data in Google Sheets
   */
  async updateTranscript(rowIndex: number, data: Partial<TranscriptData>): Promise<void> {
    try {
      // First, get the current row data
      const currentData = await this.getTranscriptByIndex(rowIndex)
      if (!currentData) {
        throw new Error(`Transcript at row ${rowIndex} not found`)
      }

      // Merge with updates
      const updatedData = { ...currentData, ...data, updatedAt: new Date() }
      const now = new Date().toISOString()

      const row = [
        updatedData.clientName,
        updatedData.month,
        updatedData.transcriptCount.toString(),
        currentData.createdAt.toISOString(),
        now,
        updatedData.notes || ''
      ]

      // Calculate the actual row number (accounting for header and 0-based index)
      const actualRowNumber = rowIndex + 2 // +1 for header, +1 for 1-based indexing
      const updateRange = `Sheet1!A${actualRowNumber}:F${actualRowNumber}`

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      })
    } catch (error) {
      throw this.handleSheetsError(error, 'Failed to update transcript data')
    }
  }

  /**
   * Delete transcript data from Google Sheets
   */
  async deleteTranscript(rowIndex: number): Promise<void> {
    try {
      // Calculate the actual row number (accounting for header and 0-based index)
      const actualRowNumber = rowIndex + 2 // +1 for header, +1 for 1-based indexing

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 0, // Assuming first sheet
                  dimension: 'ROWS',
                  startIndex: actualRowNumber - 1, // 0-based for API
                  endIndex: actualRowNumber,
                },
              },
            },
          ],
        },
      })
    } catch (error) {
      throw this.handleSheetsError(error, 'Failed to delete transcript data')
    }
  }

  /**
   * Get transcript data by row index
   */
  async getTranscriptByIndex(rowIndex: number): Promise<TranscriptData | null> {
    try {
      const allData = await this.fetchTranscripts()
      return allData[rowIndex] || null
    } catch (error) {
      throw this.handleSheetsError(error, 'Failed to get transcript by index')
    }
  }

  /**
   * Sync data with Google Sheets (full refresh)
   */
  async syncWithSheets(): Promise<TranscriptData[]> {
    try {
      return await this.fetchTranscripts()
    } catch (error) {
      throw this.handleSheetsError(error, 'Failed to sync with Google Sheets')
    }
  }

  /**
   * Batch import data to Google Sheets
   */
  async batchImport(data: Omit<TranscriptData, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    try {
      const now = new Date().toISOString()
      const rows = data.map(item => [
        item.clientName,
        item.month,
        item.transcriptCount.toString(),
        now,
        now,
        item.notes || ''
      ])

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: this.range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rows,
        },
      })
    } catch (error) {
      throw this.handleSheetsError(error, 'Failed to batch import data')
    }
  }

  /**
   * Check if the connection to Google Sheets is working
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      })
      return true
    } catch (error) {
      console.error('Google Sheets connection test failed:', error)
      return false
    }
  }

  /**
   * Private helper methods
   */
  private mapRowToTranscriptData(row: string[], index: number): TranscriptData {
    const [clientName, month, transcriptCount, createdDate, updatedDate, notes] = row

    // Parse month to extract year
    const [year] = month.split('-').map(Number)

    return {
      id: `row_${index}`,
      clientName: clientName || '',
      month: month || '',
      year: year || new Date().getFullYear(),
      transcriptCount: parseInt(transcriptCount) || 0,
      createdAt: createdDate ? new Date(createdDate) : new Date(),
      updatedAt: updatedDate ? new Date(updatedDate) : new Date(),
      notes: notes || undefined,
    }
  }

  private isHeaderRow(row: string[]): boolean {
    // Check if the first row contains header-like values
    const firstCell = row[0]?.toLowerCase()
    return firstCell === 'client name' || firstCell === 'client' || firstCell === 'name'
  }

  private handleSheetsError(error: any, message: string): Error {
    console.error('Google Sheets API Error:', error)
    
    if (error.response?.data?.error) {
      const sheetsError = error.response.data.error as SheetsError
      return new Error(`${message}: ${sheetsError.message} (${sheetsError.code})`)
    }
    
    if (error.message) {
      return new Error(`${message}: ${error.message}`)
    }
    
    return new Error(message)
  }
}

// Export factory function for creating service instances
export function createGoogleSheetsService(): GoogleSheetsService {
  return new GoogleSheetsService()
}

// Export singleton instance for production use
let _instance: GoogleSheetsService | null = null
export function getGoogleSheetsService(): GoogleSheetsService {
  if (!_instance) {
    _instance = new GoogleSheetsService()
  }
  return _instance
}

// For backward compatibility - only initialize when needed
export const googleSheetsService = process.env.NODE_ENV === 'test' 
  ? {} as GoogleSheetsService
  : process.env.DATA_SOURCE_TYPE === 'google-sheets'
    ? getGoogleSheetsService()
    : {} as GoogleSheetsService