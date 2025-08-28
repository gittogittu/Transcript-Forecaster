export interface TranscriptData {
  id: string
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