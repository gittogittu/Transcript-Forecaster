import { TranscriptData } from '@/types/transcript'
import { getGoogleSheetsService } from './google-sheets'

export interface ConsistencyCheckResult {
  isConsistent: boolean
  totalRecords: number
  checkedAt: Date
  issues: ConsistencyIssue[]
  summary: ConsistencySummary
}

export interface ConsistencyIssue {
  type: 'duplicate' | 'missing' | 'mismatch' | 'invalid' | 'orphaned'
  severity: 'low' | 'medium' | 'high' | 'critical'
  recordId: string
  field?: string
  description: string
  serverValue?: any
  clientValue?: any
  suggestedFix?: string
}

export interface ConsistencySummary {
  duplicates: number
  mismatches: number
  missing: number
  invalid: number
  orphaned: number
}

export interface RepairResult {
  success: boolean
  repairedIssues: number
  failedRepairs: number
  errors: string[]
  warnings: string[]
}

export interface ValidationRule {
  name: string
  field: string
  validator: (value: any, record: TranscriptData) => boolean
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Service for validating and maintaining data consistency
 */
export class DataConsistencyService {
  private sheetsService = getGoogleSheetsService()
  private validationRules: ValidationRule[] = []

  constructor() {
    this.initializeValidationRules()
  }

  /**
   * Initialize default validation rules
   */
  private initializeValidationRules(): void {
    this.validationRules = [
      {
        name: 'clientNameRequired',
        field: 'clientName',
        validator: (value) => typeof value === 'string' && value.trim().length > 0,
        message: 'Client name is required and cannot be empty',
        severity: 'critical'
      },
      {
        name: 'monthFormat',
        field: 'month',
        validator: (value) => typeof value === 'string' && /^\d{4}-\d{2}$/.test(value),
        message: 'Month must be in YYYY-MM format',
        severity: 'critical'
      },
      {
        name: 'transcriptCountValid',
        field: 'transcriptCount',
        validator: (value) => typeof value === 'number' && value >= 0 && Number.isInteger(value),
        message: 'Transcript count must be a non-negative integer',
        severity: 'critical'
      },
      {
        name: 'yearConsistency',
        field: 'year',
        validator: (value, record) => {
          if (typeof value !== 'number') return false
          const monthYear = parseInt(record.month.split('-')[0])
          return value === monthYear
        },
        message: 'Year field must match the year in the month field',
        severity: 'high'
      },
      {
        name: 'dateValidation',
        field: 'createdAt',
        validator: (value) => value instanceof Date && !isNaN(value.getTime()),
        message: 'Created date must be a valid date',
        severity: 'medium'
      },
      {
        name: 'updatedAtValidation',
        field: 'updatedAt',
        validator: (value, record) => {
          if (!(value instanceof Date) || isNaN(value.getTime())) return false
          return value >= record.createdAt
        },
        message: 'Updated date must be a valid date and not before created date',
        severity: 'medium'
      },
      {
        name: 'reasonableTranscriptCount',
        field: 'transcriptCount',
        validator: (value) => typeof value === 'number' && value <= 10000,
        message: 'Transcript count seems unusually high (>10,000)',
        severity: 'low'
      }
    ]
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule)
  }

  /**
   * Remove validation rule by name
   */
  removeValidationRule(name: string): void {
    this.validationRules = this.validationRules.filter(rule => rule.name !== name)
  }

  /**
   * Perform comprehensive data consistency check
   */
  async performConsistencyCheck(clientData?: TranscriptData[]): Promise<ConsistencyCheckResult> {
    const result: ConsistencyCheckResult = {
      isConsistent: true,
      totalRecords: 0,
      checkedAt: new Date(),
      issues: [],
      summary: {
        duplicates: 0,
        mismatches: 0,
        missing: 0,
        invalid: 0,
        orphaned: 0
      }
    }

    try {
      // Fetch server data
      const serverData = await this.sheetsService.fetchTranscripts()
      
      // Use provided client data or fetch from cache
      const localData = clientData || await this.getClientData()

      result.totalRecords = Math.max(serverData.length, localData.length)

      // Check for validation issues
      await this.checkValidationIssues(serverData, result)
      await this.checkValidationIssues(localData, result, 'client')

      // Check for duplicates
      await this.checkDuplicates(serverData, result)

      // Check for mismatches between server and client
      await this.checkDataMismatches(serverData, localData, result)

      // Check for orphaned records
      await this.checkOrphanedRecords(serverData, localData, result)

      // Update summary
      this.updateSummary(result)

      result.isConsistent = result.issues.length === 0

      return result

    } catch (error) {
      result.issues.push({
        type: 'invalid',
        severity: 'critical',
        recordId: 'system',
        description: `Consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      result.isConsistent = false
      return result
    }
  }

  /**
   * Check for validation issues in data
   */
  private async checkValidationIssues(
    data: TranscriptData[],
    result: ConsistencyCheckResult,
    source: 'server' | 'client' = 'server'
  ): Promise<void> {
    for (const record of data) {
      for (const rule of this.validationRules) {
        try {
          const fieldValue = record[rule.field as keyof TranscriptData]
          
          if (!rule.validator(fieldValue, record)) {
            result.issues.push({
              type: 'invalid',
              severity: rule.severity,
              recordId: record.id || 'unknown',
              field: rule.field,
              description: `${source === 'client' ? 'Client' : 'Server'} data: ${rule.message}`,
              [source === 'client' ? 'clientValue' : 'serverValue']: fieldValue,
              suggestedFix: this.getSuggestedFix(rule, fieldValue, record)
            })
          }
        } catch (error) {
          result.issues.push({
            type: 'invalid',
            severity: 'medium',
            recordId: record.id || 'unknown',
            field: rule.field,
            description: `Validation rule '${rule.name}' failed to execute: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }
      }
    }
  }

  /**
   * Check for duplicate records
   */
  private async checkDuplicates(data: TranscriptData[], result: ConsistencyCheckResult): Promise<void> {
    const seen = new Map<string, TranscriptData[]>()

    for (const record of data) {
      const key = `${record.clientName}-${record.month}`
      
      if (!seen.has(key)) {
        seen.set(key, [])
      }
      seen.get(key)!.push(record)
    }

    for (const [key, records] of seen) {
      if (records.length > 1) {
        const [clientName, month] = key.split('-')
        
        for (let i = 1; i < records.length; i++) {
          result.issues.push({
            type: 'duplicate',
            severity: 'high',
            recordId: records[i].id || 'unknown',
            description: `Duplicate record found for client '${clientName}' in month '${month}'`,
            suggestedFix: 'Remove duplicate record or merge data if different'
          })
        }
      }
    }
  }

  /**
   * Check for data mismatches between server and client
   */
  private async checkDataMismatches(
    serverData: TranscriptData[],
    clientData: TranscriptData[],
    result: ConsistencyCheckResult
  ): Promise<void> {
    const serverMap = new Map(serverData.map(record => [record.id!, record]))
    const clientMap = new Map(clientData.map(record => [record.id!, record]))

    // Check for mismatches in existing records
    for (const [id, serverRecord] of serverMap) {
      const clientRecord = clientMap.get(id)
      
      if (clientRecord) {
        const mismatches = this.findFieldMismatches(serverRecord, clientRecord)
        
        for (const mismatch of mismatches) {
          result.issues.push({
            type: 'mismatch',
            severity: this.getMismatchSeverity(mismatch.field),
            recordId: id,
            field: mismatch.field,
            description: `Data mismatch in field '${mismatch.field}'`,
            serverValue: mismatch.serverValue,
            clientValue: mismatch.clientValue,
            suggestedFix: this.getSuggestedMismatchFix(mismatch.field, mismatch.serverValue, mismatch.clientValue)
          })
        }
      }
    }
  }

  /**
   * Check for orphaned records
   */
  private async checkOrphanedRecords(
    serverData: TranscriptData[],
    clientData: TranscriptData[],
    result: ConsistencyCheckResult
  ): Promise<void> {
    const serverIds = new Set(serverData.map(record => record.id))
    const clientIds = new Set(clientData.map(record => record.id))

    // Records in server but not in client
    for (const record of serverData) {
      if (!clientIds.has(record.id)) {
        result.issues.push({
          type: 'missing',
          severity: 'medium',
          recordId: record.id || 'unknown',
          description: 'Record exists on server but missing from client',
          suggestedFix: 'Sync record to client'
        })
      }
    }

    // Records in client but not in server
    for (const record of clientData) {
      if (!serverIds.has(record.id)) {
        result.issues.push({
          type: 'orphaned',
          severity: 'medium',
          recordId: record.id || 'unknown',
          description: 'Record exists on client but missing from server',
          suggestedFix: 'Push record to server or remove from client'
        })
      }
    }
  }

  /**
   * Find field mismatches between two records
   */
  private findFieldMismatches(serverRecord: TranscriptData, clientRecord: TranscriptData): Array<{
    field: string
    serverValue: any
    clientValue: any
  }> {
    const mismatches: Array<{ field: string; serverValue: any; clientValue: any }> = []
    const fieldsToCheck: (keyof TranscriptData)[] = ['clientName', 'month', 'transcriptCount', 'notes']

    for (const field of fieldsToCheck) {
      if (serverRecord[field] !== clientRecord[field]) {
        mismatches.push({
          field,
          serverValue: serverRecord[field],
          clientValue: clientRecord[field]
        })
      }
    }

    return mismatches
  }

  /**
   * Get severity for field mismatches
   */
  private getMismatchSeverity(field: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (field) {
      case 'clientName':
      case 'month':
      case 'transcriptCount':
        return 'high'
      case 'notes':
        return 'medium'
      default:
        return 'low'
    }
  }

  /**
   * Get suggested fix for validation issues
   */
  private getSuggestedFix(rule: ValidationRule, value: any, record: TranscriptData): string {
    switch (rule.name) {
      case 'clientNameRequired':
        return 'Provide a valid client name'
      case 'monthFormat':
        return 'Use YYYY-MM format (e.g., 2024-01)'
      case 'transcriptCountValid':
        return 'Provide a non-negative integer value'
      case 'yearConsistency':
        return `Update year to match month (should be ${record.month.split('-')[0]})`
      case 'reasonableTranscriptCount':
        return 'Verify if this count is correct'
      default:
        return 'Fix the validation error'
    }
  }

  /**
   * Get suggested fix for field mismatches
   */
  private getSuggestedMismatchFix(field: string, serverValue: any, clientValue: any): string {
    switch (field) {
      case 'transcriptCount':
        return `Choose between server value (${serverValue}) and client value (${clientValue})`
      case 'notes':
        return 'Merge notes or choose the most recent version'
      default:
        return 'Resolve the conflict by choosing the correct value'
    }
  }

  /**
   * Update consistency summary
   */
  private updateSummary(result: ConsistencyCheckResult): void {
    result.summary = {
      duplicates: result.issues.filter(issue => issue.type === 'duplicate').length,
      mismatches: result.issues.filter(issue => issue.type === 'mismatch').length,
      missing: result.issues.filter(issue => issue.type === 'missing').length,
      invalid: result.issues.filter(issue => issue.type === 'invalid').length,
      orphaned: result.issues.filter(issue => issue.type === 'orphaned').length
    }
  }

  /**
   * Repair data consistency issues
   */
  async repairConsistencyIssues(issues: ConsistencyIssue[], strategy: 'auto' | 'manual' = 'auto'): Promise<RepairResult> {
    const result: RepairResult = {
      success: true,
      repairedIssues: 0,
      failedRepairs: 0,
      errors: [],
      warnings: []
    }

    for (const issue of issues) {
      try {
        const repaired = await this.repairSingleIssue(issue, strategy)
        
        if (repaired) {
          result.repairedIssues++
        } else {
          result.failedRepairs++
          result.warnings.push(`Could not auto-repair issue for record ${issue.recordId}: ${issue.description}`)
        }
      } catch (error) {
        result.failedRepairs++
        result.errors.push(`Failed to repair issue for record ${issue.recordId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    result.success = result.errors.length === 0
    return result
  }

  /**
   * Repair a single consistency issue
   */
  private async repairSingleIssue(issue: ConsistencyIssue, strategy: 'auto' | 'manual'): Promise<boolean> {
    if (strategy === 'manual') {
      return false // Manual repairs need user intervention
    }

    switch (issue.type) {
      case 'duplicate':
        return await this.repairDuplicate(issue)
      case 'mismatch':
        return await this.repairMismatch(issue)
      case 'missing':
        return await this.repairMissing(issue)
      case 'orphaned':
        return await this.repairOrphaned(issue)
      case 'invalid':
        return await this.repairInvalid(issue)
      default:
        return false
    }
  }

  /**
   * Repair duplicate records
   */
  private async repairDuplicate(issue: ConsistencyIssue): Promise<boolean> {
    try {
      // For auto-repair, remove the duplicate (keep the first one)
      const rowIndex = this.getRowIndexForRecord(issue.recordId)
      if (rowIndex > 0) {
        await this.sheetsService.deleteTranscript(rowIndex)
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  /**
   * Repair data mismatches
   */
  private async repairMismatch(issue: ConsistencyIssue): Promise<boolean> {
    try {
      // For auto-repair, prefer server value
      const rowIndex = this.getRowIndexForRecord(issue.recordId)
      if (rowIndex >= 0 && issue.serverValue !== undefined) {
        const updateData = { [issue.field!]: issue.serverValue }
        await this.sheetsService.updateTranscript(rowIndex, updateData)
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  /**
   * Repair missing records
   */
  private async repairMissing(issue: ConsistencyIssue): Promise<boolean> {
    // Missing records need to be synced from server
    // This would be handled by the sync service
    return false
  }

  /**
   * Repair orphaned records
   */
  private async repairOrphaned(issue: ConsistencyIssue): Promise<boolean> {
    // Orphaned records need to be pushed to server
    // This would be handled by the sync service
    return false
  }

  /**
   * Repair invalid data
   */
  private async repairInvalid(issue: ConsistencyIssue): Promise<boolean> {
    // Invalid data repairs depend on the specific validation rule
    // Most require manual intervention
    return false
  }

  /**
   * Get client data (placeholder - implement based on your data layer)
   */
  private async getClientData(): Promise<TranscriptData[]> {
    // This would fetch from your client-side cache/state
    // For now, return empty array
    return []
  }

  /**
   * Get row index for a record ID (placeholder)
   */
  private getRowIndexForRecord(recordId: string): number {
    // This would map record ID to sheet row index
    // For now, return 0
    return 0
  }
}

// Export singleton instance
let _consistencyService: DataConsistencyService | null = null

export function getDataConsistencyService(): DataConsistencyService {
  if (!_consistencyService) {
    _consistencyService = new DataConsistencyService()
  }
  return _consistencyService
}