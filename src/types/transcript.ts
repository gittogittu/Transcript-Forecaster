export interface TranscriptData {
  id: string
  clientId: string
  clientName: string
  date: Date
  transcriptCount: number
  transcriptType?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface TranscriptSummary {
  totalTranscripts: number
  totalClients: number
  averagePerDay: number
  peakDay: string
  peakCount: number
}

export interface TranscriptFilters {
  clientName?: string
  startDate?: string
  endDate?: string
  transcriptType?: string
  minCount?: number
  maxCount?: number
}

export interface CreateTranscriptData {
  clientName: string
  date: Date
  transcriptCount: number
  transcriptType?: string
  notes?: string
  createdBy: string
}

export interface UpdateTranscriptData {
  clientName?: string
  date?: Date
  transcriptCount?: number
  transcriptType?: string
  notes?: string
}

export interface Client {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface ImportResult {
  totalRows: number
  successCount: number
  errorCount: number
  duplicateCount: number
  errors: Array<{
    row: number
    field: string
    value: any
    message: string
  }>
}