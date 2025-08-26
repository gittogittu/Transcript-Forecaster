import { TranscriptData } from '@/types/transcript'
import { getGoogleSheetsService } from './google-sheets'

export interface SyncOptions {
  forceSync?: boolean
  direction?: 'pull' | 'push' | 'bidirectional'
  validateData?: boolean
  conflictResolution?: 'server' | 'client' | 'merge'
}

export interface SyncResult {
  success: boolean
  recordsProcessed: number
  recordsAdded: number
  recordsUpdated: number
  recordsSkipped: number
  conflicts: ConflictRecord[]
  errors: string[]
  warnings: string[]
  syncedAt: Date
}

export interface ConflictRecord {
  id: string
  field: string
  serverValue: any
  clientValue: any
  resolution: 'server' | 'client' | 'merge'
  resolvedValue: any
}

export interface DataConsistencyReport {
  isConsistent: boolean
  totalRecords: number
  inconsistentRecords: InconsistentRecord[]
  duplicates: DuplicateRecord[]
  orphanedRecords: string[]
  validationErrors: ValidationError[]
}

export interface InconsistentRecord {
  id: string
  issues: string[]
  serverData: Partial<TranscriptData>
  clientData: Partial<TranscriptData>
}

export interface DuplicateRecord {
  ids: string[]
  duplicateField: string
  value: any
}

export interface ValidationError {
  id: string
  field: string
  value: any
  error: string
}

/**
 * Service for managing data synchronization between client and Google Sheets
 */
export class SyncService {
  private sheetsService = getGoogleSheetsService()
  private syncInProgress = false
  private lastSyncTime: Date | null = null
  private syncQueue: Array<() => Promise<void>> = []

  /**
   * Perform background synchronization
   */
  async backgroundSync(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress')
    }

    this.syncInProgress = true
    const startTime = new Date()

    try {
      const result = await this.performSync(options)
      this.lastSyncTime = startTime
      return result
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Queue sync operation for later execution
   */
  queueSync(syncFn: () => Promise<void>): void {
    this.syncQueue.push(syncFn)
    this.processSyncQueue()
  }

  /**
   * Process queued sync operations
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return
    }

    const operation = this.syncQueue.shift()
    if (operation) {
      try {
        await operation()
      } catch (error) {
        console.error('Queued sync operation failed:', error)
      }
      
      // Process next operation
      setTimeout(() => this.processSyncQueue(), 100)
    }
  }

  /**
   * Perform the actual synchronization
   */
  private async performSync(options: SyncOptions): Promise<SyncResult> {
    const {
      direction = 'pull',
      validateData = true,
      conflictResolution = 'server'
    } = options

    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsAdded: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      conflicts: [],
      errors: [],
      warnings: [],
      syncedAt: new Date()
    }

    try {
      // Test connection first
      const connectionTest = await this.sheetsService.testConnection()
      if (!connectionTest) {
        result.errors.push('Failed to connect to Google Sheets')
        return result
      }

      // Fetch server data
      const serverData = await this.sheetsService.fetchTranscripts()
      result.recordsProcessed = serverData.length

      // Get client data (this would come from local cache/state)
      const clientData = await this.getClientData()

      // Perform sync based on direction
      switch (direction) {
        case 'pull':
          await this.pullFromServer(serverData, result, validateData)
          break
        case 'push':
          await this.pushToServer(clientData, result, validateData)
          break
        case 'bidirectional':
          await this.bidirectionalSync(serverData, clientData, result, conflictResolution, validateData)
          break
      }

      result.success = result.errors.length === 0
      return result

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error')
      return result
    }
  }

  /**
   * Pull data from server to client
   */
  private async pullFromServer(
    serverData: TranscriptData[],
    result: SyncResult,
    validateData: boolean
  ): Promise<void> {
    for (const record of serverData) {
      try {
        if (validateData) {
          const validation = this.validateRecord(record)
          if (!validation.isValid) {
            result.warnings.push(`Validation failed for record ${record.id}: ${validation.errors.join(', ')}`)
            result.recordsSkipped++
            continue
          }
        }

        // This would update local cache/state
        await this.updateClientRecord(record)
        result.recordsUpdated++

      } catch (error) {
        result.errors.push(`Failed to update record ${record.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        result.recordsSkipped++
      }
    }
  }

  /**
   * Push data from client to server
   */
  private async pushToServer(
    clientData: TranscriptData[],
    result: SyncResult,
    validateData: boolean
  ): Promise<void> {
    for (const record of clientData) {
      try {
        if (validateData) {
          const validation = this.validateRecord(record)
          if (!validation.isValid) {
            result.warnings.push(`Validation failed for record ${record.id}: ${validation.errors.join(', ')}`)
            result.recordsSkipped++
            continue
          }
        }

        // Check if record exists on server
        const existingRecord = await this.getServerRecord(record.id!)
        
        if (existingRecord) {
          // Update existing record
          await this.sheetsService.updateTranscript(this.getRowIndex(record.id!), record)
          result.recordsUpdated++
        } else {
          // Add new record
          await this.sheetsService.addTranscript(record)
          result.recordsAdded++
        }

      } catch (error) {
        result.errors.push(`Failed to sync record ${record.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        result.recordsSkipped++
      }
    }
  }

  /**
   * Perform bidirectional synchronization with conflict resolution
   */
  private async bidirectionalSync(
    serverData: TranscriptData[],
    clientData: TranscriptData[],
    result: SyncResult,
    conflictResolution: string,
    validateData: boolean
  ): Promise<void> {
    const serverMap = new Map(serverData.map(record => [record.id!, record]))
    const clientMap = new Map(clientData.map(record => [record.id!, record]))

    // Process all unique IDs
    const allIds = new Set([...serverMap.keys(), ...clientMap.keys()])

    for (const id of allIds) {
      const serverRecord = serverMap.get(id)
      const clientRecord = clientMap.get(id)

      try {
        if (serverRecord && clientRecord) {
          // Both exist - check for conflicts
          const conflicts = this.detectConflicts(serverRecord, clientRecord)
          
          if (conflicts.length > 0) {
            const resolvedRecord = await this.resolveConflicts(
              serverRecord,
              clientRecord,
              conflicts,
              conflictResolution
            )
            
            result.conflicts.push(...conflicts)
            
            // Update both server and client with resolved data
            await this.sheetsService.updateTranscript(this.getRowIndex(id), resolvedRecord)
            await this.updateClientRecord(resolvedRecord)
            result.recordsUpdated++
          }
        } else if (serverRecord && !clientRecord) {
          // Server only - pull to client
          if (validateData && !this.validateRecord(serverRecord).isValid) {
            result.recordsSkipped++
            continue
          }
          await this.updateClientRecord(serverRecord)
          result.recordsAdded++
        } else if (!serverRecord && clientRecord) {
          // Client only - push to server
          if (validateData && !this.validateRecord(clientRecord).isValid) {
            result.recordsSkipped++
            continue
          }
          await this.sheetsService.addTranscript(clientRecord)
          result.recordsAdded++
        }

      } catch (error) {
        result.errors.push(`Failed to sync record ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        result.recordsSkipped++
      }
    }
  }

  /**
   * Detect conflicts between server and client records
   */
  private detectConflicts(serverRecord: TranscriptData, clientRecord: TranscriptData): ConflictRecord[] {
    const conflicts: ConflictRecord[] = []

    // Check each field for conflicts
    const fieldsToCheck: (keyof TranscriptData)[] = ['clientName', 'month', 'transcriptCount', 'notes']

    for (const field of fieldsToCheck) {
      if (serverRecord[field] !== clientRecord[field]) {
        conflicts.push({
          id: serverRecord.id!,
          field,
          serverValue: serverRecord[field],
          clientValue: clientRecord[field],
          resolution: 'server', // Default, will be updated by resolution strategy
          resolvedValue: serverRecord[field] // Default, will be updated by resolution strategy
        })
      }
    }

    return conflicts
  }

  /**
   * Resolve conflicts based on strategy
   */
  private async resolveConflicts(
    serverRecord: TranscriptData,
    clientRecord: TranscriptData,
    conflicts: ConflictRecord[],
    strategy: string
  ): Promise<TranscriptData> {
    const resolvedRecord = { ...serverRecord }

    for (const conflict of conflicts) {
      switch (strategy) {
        case 'server':
          conflict.resolution = 'server'
          conflict.resolvedValue = conflict.serverValue
          break
        case 'client':
          conflict.resolution = 'client'
          conflict.resolvedValue = conflict.clientValue
          resolvedRecord[conflict.field as keyof TranscriptData] = conflict.clientValue
          break
        case 'merge':
          conflict.resolution = 'merge'
          conflict.resolvedValue = await this.mergeValues(
            conflict.field,
            conflict.serverValue,
            conflict.clientValue
          )
          resolvedRecord[conflict.field as keyof TranscriptData] = conflict.resolvedValue
          break
      }
    }

    resolvedRecord.updatedAt = new Date()
    return resolvedRecord
  }

  /**
   * Merge conflicting values using field-specific logic
   */
  private async mergeValues(field: string, serverValue: any, clientValue: any): Promise<any> {
    switch (field) {
      case 'transcriptCount':
        // For numeric fields, take the higher value
        return Math.max(serverValue, clientValue)
      case 'notes':
        // For text fields, concatenate with separator
        return serverValue && clientValue 
          ? `${serverValue} | ${clientValue}`
          : serverValue || clientValue
      default:
        // For other fields, prefer client value (most recent)
        return clientValue
    }
  }

  /**
   * Validate data consistency
   */
  async validateDataConsistency(): Promise<DataConsistencyReport> {
    const report: DataConsistencyReport = {
      isConsistent: true,
      totalRecords: 0,
      inconsistentRecords: [],
      duplicates: [],
      orphanedRecords: [],
      validationErrors: []
    }

    try {
      const serverData = await this.sheetsService.fetchTranscripts()
      const clientData = await this.getClientData()

      report.totalRecords = Math.max(serverData.length, clientData.length)

      // Check for inconsistencies
      const serverMap = new Map(serverData.map(record => [record.id!, record]))
      const clientMap = new Map(clientData.map(record => [record.id!, record]))

      for (const [id, serverRecord] of serverMap) {
        const clientRecord = clientMap.get(id)
        
        if (!clientRecord) {
          report.orphanedRecords.push(id)
          continue
        }

        const issues: string[] = []
        
        // Check for field mismatches
        if (serverRecord.clientName !== clientRecord.clientName) {
          issues.push('Client name mismatch')
        }
        if (serverRecord.transcriptCount !== clientRecord.transcriptCount) {
          issues.push('Transcript count mismatch')
        }
        if (serverRecord.month !== clientRecord.month) {
          issues.push('Month mismatch')
        }

        if (issues.length > 0) {
          report.inconsistentRecords.push({
            id,
            issues,
            serverData: serverRecord,
            clientData: clientRecord
          })
        }

        // Validate record structure
        const validation = this.validateRecord(serverRecord)
        if (!validation.isValid) {
          report.validationErrors.push({
            id,
            field: 'structure',
            value: serverRecord,
            error: validation.errors.join(', ')
          })
        }
      }

      // Check for duplicates
      const duplicateMap = new Map<string, string[]>()
      
      for (const record of serverData) {
        const key = `${record.clientName}-${record.month}`
        if (!duplicateMap.has(key)) {
          duplicateMap.set(key, [])
        }
        duplicateMap.get(key)!.push(record.id!)
      }

      for (const [key, ids] of duplicateMap) {
        if (ids.length > 1) {
          const [clientName, month] = key.split('-')
          report.duplicates.push({
            ids,
            duplicateField: 'clientName-month',
            value: { clientName, month }
          })
        }
      }

      report.isConsistent = report.inconsistentRecords.length === 0 && 
                          report.orphanedRecords.length === 0 && 
                          report.validationErrors.length === 0 &&
                          report.duplicates.length === 0

      return report

    } catch (error) {
      report.validationErrors.push({
        id: 'system',
        field: 'consistency_check',
        value: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      report.isConsistent = false
      return report
    }
  }

  /**
   * Repair data inconsistencies
   */
  async repairDataInconsistencies(report: DataConsistencyReport): Promise<{
    success: boolean
    repairedRecords: number
    errors: string[]
  }> {
    const result = {
      success: true,
      repairedRecords: 0,
      errors: []
    }

    try {
      // Repair inconsistent records
      for (const inconsistent of report.inconsistentRecords) {
        try {
          // Use server data as source of truth
          await this.updateClientRecord(inconsistent.serverData as TranscriptData)
          result.repairedRecords++
        } catch (error) {
          result.errors.push(`Failed to repair record ${inconsistent.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Remove duplicates (keep the first one)
      for (const duplicate of report.duplicates) {
        const idsToRemove = duplicate.ids.slice(1) // Keep first, remove rest
        
        for (const id of idsToRemove) {
          try {
            await this.sheetsService.deleteTranscript(this.getRowIndex(id))
            result.repairedRecords++
          } catch (error) {
            result.errors.push(`Failed to remove duplicate ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      result.success = result.errors.length === 0
      return result

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown repair error')
      result.success = false
      return result
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    inProgress: boolean
    lastSyncTime: Date | null
    queueLength: number
  } {
    return {
      inProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      queueLength: this.syncQueue.length
    }
  }

  // Helper methods (these would need to be implemented based on your data layer)
  private async getClientData(): Promise<TranscriptData[]> {
    // This would fetch from your client-side cache/state
    // For now, return empty array
    return []
  }

  private async updateClientRecord(record: TranscriptData): Promise<void> {
    // This would update your client-side cache/state
    // Implementation depends on your state management solution
  }

  private async getServerRecord(id: string): Promise<TranscriptData | null> {
    // This would fetch a specific record from the server
    const allData = await this.sheetsService.fetchTranscripts()
    return allData.find(record => record.id === id) || null
  }

  private getRowIndex(id: string): number {
    // This would return the row index for the given ID
    // For now, return 0 (this needs proper implementation)
    return 0
  }

  private validateRecord(record: TranscriptData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!record.clientName?.trim()) {
      errors.push('Client name is required')
    }

    if (!record.month?.match(/^\d{4}-\d{2}$/)) {
      errors.push('Month must be in YYYY-MM format')
    }

    if (typeof record.transcriptCount !== 'number' || record.transcriptCount < 0) {
      errors.push('Transcript count must be a non-negative number')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
let _syncService: SyncService | null = null

export function getSyncService(): SyncService {
  if (!_syncService) {
    _syncService = new SyncService()
  }
  return _syncService
}