import { getGoogleSheetsService } from '@/lib/services/google-sheets'
import { TranscriptData } from '@/types/transcript'

/**
 * Data fetching functions for transcript data with error handling
 */

export interface DataFetchResult<T> {
  data: T | null
  error: string | null
  loading: boolean
}

export interface TranscriptFilters {
  clientName?: string
  startMonth?: string
  endMonth?: string
  minCount?: number
  maxCount?: number
}

/**
 * Fetch all transcript data with error handling
 */
export async function fetchAllTranscripts(): Promise<DataFetchResult<TranscriptData[]>> {
  try {
    const data = await getGoogleSheetsService().fetchTranscripts()
    return {
      data,
      error: null,
      loading: false,
    }
  } catch (error) {
    console.error('Error fetching transcripts:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch transcript data',
      loading: false,
    }
  }
}

/**
 * Fetch filtered transcript data
 */
export async function fetchFilteredTranscripts(
  filters: TranscriptFilters
): Promise<DataFetchResult<TranscriptData[]>> {
  try {
    const allData = await getGoogleSheetsService().fetchTranscripts()
    
    const filteredData = allData.filter(transcript => {
      // Filter by client name
      if (filters.clientName && !transcript.clientName.toLowerCase().includes(filters.clientName.toLowerCase())) {
        return false
      }
      
      // Filter by date range
      if (filters.startMonth && transcript.month < filters.startMonth) {
        return false
      }
      
      if (filters.endMonth && transcript.month > filters.endMonth) {
        return false
      }
      
      // Filter by transcript count range
      if (filters.minCount !== undefined && transcript.transcriptCount < filters.minCount) {
        return false
      }
      
      if (filters.maxCount !== undefined && transcript.transcriptCount > filters.maxCount) {
        return false
      }
      
      return true
    })

    return {
      data: filteredData,
      error: null,
      loading: false,
    }
  } catch (error) {
    console.error('Error fetching filtered transcripts:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch filtered transcript data',
      loading: false,
    }
  }
}

/**
 * Fetch transcript data for a specific client
 */
export async function fetchClientTranscripts(clientName: string): Promise<DataFetchResult<TranscriptData[]>> {
  return fetchFilteredTranscripts({ clientName })
}

/**
 * Fetch transcript data for a specific time period
 */
export async function fetchTranscriptsByDateRange(
  startMonth: string,
  endMonth: string
): Promise<DataFetchResult<TranscriptData[]>> {
  return fetchFilteredTranscripts({ startMonth, endMonth })
}

/**
 * Add new transcript data with validation
 */
export async function addTranscriptData(
  data: Omit<TranscriptData, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DataFetchResult<void>> {
  try {
    // Validate required fields
    if (!data.clientName.trim()) {
      throw new Error('Client name is required')
    }
    
    if (!data.month.match(/^\d{4}-\d{2}$/)) {
      throw new Error('Month must be in YYYY-MM format')
    }
    
    if (data.transcriptCount < 0) {
      throw new Error('Transcript count must be non-negative')
    }

    await getGoogleSheetsService().addTranscript(data)
    
    return {
      data: null,
      error: null,
      loading: false,
    }
  } catch (error) {
    console.error('Error adding transcript:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to add transcript data',
      loading: false,
    }
  }
}

/**
 * Update existing transcript data
 */
export async function updateTranscriptData(
  rowIndex: number,
  data: Partial<TranscriptData>
): Promise<DataFetchResult<void>> {
  try {
    // Validate fields if provided
    if (data.clientName !== undefined && !data.clientName.trim()) {
      throw new Error('Client name cannot be empty')
    }
    
    if (data.month !== undefined && !data.month.match(/^\d{4}-\d{2}$/)) {
      throw new Error('Month must be in YYYY-MM format')
    }
    
    if (data.transcriptCount !== undefined && data.transcriptCount < 0) {
      throw new Error('Transcript count must be non-negative')
    }

    await getGoogleSheetsService().updateTranscript(rowIndex, data)
    
    return {
      data: null,
      error: null,
      loading: false,
    }
  } catch (error) {
    console.error('Error updating transcript:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update transcript data',
      loading: false,
    }
  }
}

/**
 * Delete transcript data
 */
export async function deleteTranscriptData(rowIndex: number): Promise<DataFetchResult<void>> {
  try {
    await getGoogleSheetsService().deleteTranscript(rowIndex)
    
    return {
      data: null,
      error: null,
      loading: false,
    }
  } catch (error) {
    console.error('Error deleting transcript:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to delete transcript data',
      loading: false,
    }
  }
}

/**
 * Sync data with Google Sheets
 */
export async function syncTranscriptData(): Promise<DataFetchResult<TranscriptData[]>> {
  try {
    const data = await getGoogleSheetsService().syncWithSheets()
    
    return {
      data,
      error: null,
      loading: false,
    }
  } catch (error) {
    console.error('Error syncing transcript data:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to sync transcript data',
      loading: false,
    }
  }
}

/**
 * Test Google Sheets connection
 */
export async function testSheetsConnection(): Promise<DataFetchResult<boolean>> {
  try {
    const isConnected = await getGoogleSheetsService().testConnection()
    
    return {
      data: isConnected,
      error: isConnected ? null : 'Connection test failed',
      loading: false,
    }
  } catch (error) {
    console.error('Error testing connection:', error)
    return {
      data: false,
      error: error instanceof Error ? error.message : 'Failed to test connection',
      loading: false,
    }
  }
}

/**
 * Get summary statistics for transcript data
 */
export async function getTranscriptSummary(): Promise<DataFetchResult<{
  totalClients: number
  totalTranscripts: number
  averageTranscriptsPerClient: number
  dateRange: { start: string; end: string }
}>> {
  try {
    const allData = await getGoogleSheetsService().fetchTranscripts()
    
    if (allData.length === 0) {
      return {
        data: {
          totalClients: 0,
          totalTranscripts: 0,
          averageTranscriptsPerClient: 0,
          dateRange: { start: '', end: '' }
        },
        error: null,
        loading: false,
      }
    }

    const uniqueClients = new Set(allData.map(t => t.clientName))
    const totalTranscripts = allData.reduce((sum, t) => sum + t.transcriptCount, 0)
    const sortedDates = allData.map(t => t.month).sort()
    
    return {
      data: {
        totalClients: uniqueClients.size,
        totalTranscripts,
        averageTranscriptsPerClient: Math.round(totalTranscripts / uniqueClients.size),
        dateRange: {
          start: sortedDates[0],
          end: sortedDates[sortedDates.length - 1]
        }
      },
      error: null,
      loading: false,
    }
  } catch (error) {
    console.error('Error getting transcript summary:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get transcript summary',
      loading: false,
    }
  }
}
/**
 *
 Fetch transcript by ID
 */
export async function fetchTranscriptById(id: string): Promise<DataFetchResult<TranscriptData>> {
  try {
    const allData = await getGoogleSheetsService().fetchTranscripts()
    const transcript = allData.find(item => item.id === id)
    
    if (!transcript) {
      return {
        data: null,
        error: 'Transcript not found',
        loading: false,
      }
    }
    
    return {
      data: transcript,
      error: null,
      loading: false,
    }
  } catch (error) {
    console.error('Error fetching transcript by ID:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch transcript',
      loading: false,
    }
  }
}





/**
 * Sync with Google Sheets
 */
export async function syncWithGoogleSheets(options: {
  forceSync?: boolean
  direction?: 'pull' | 'push' | 'bidirectional'
  validateData?: boolean
}): Promise<{
  recordsProcessed?: number
  recordsAdded?: number
  recordsUpdated?: number
  recordsSkipped?: number
  errors?: string[]
  warnings?: string[]
  error?: string
}> {
  try {
    const sheetsService = getGoogleSheetsService()
    
    // Test connection first
    const connectionTest = await sheetsService.testConnection()
    if (!connectionTest.success) {
      return {
        error: connectionTest.error || 'Failed to connect to Google Sheets'
      }
    }
    
    // For now, just fetch data as a basic sync
    const data = await sheetsService.fetchTranscripts()
    
    return {
      recordsProcessed: data.length,
      recordsAdded: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      warnings: [],
    }
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to sync with Google Sheets'
    }
  }
}