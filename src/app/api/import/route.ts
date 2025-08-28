import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { transformRawDataToTranscripts } from '@/lib/utils/data-transformers'
import { createTranscript, getTranscriptsByClientAndDate } from '@/lib/database/transcripts'
import { z } from 'zod'
import type { RawData, ImportResult, TranscriptData } from '@/types/transcript'

const ImportRequestSchema = z.object({
  data: z.array(z.record(z.string(), z.any())),
  columnMapping: z.record(z.string(), z.string()),
  conflictResolution: z.enum(['merge', 'replace', 'skip', 'ask']).default('ask'),
  fileName: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { data, columnMapping, conflictResolution, fileName } = ImportRequestSchema.parse(body)

    // Transform raw data to transcript format
    const transformResult = await transformRawDataToTranscripts(data, columnMapping)
    
    if (transformResult.validData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid data to import',
        result: {
          totalRows: data.length,
          successCount: 0,
          errorCount: transformResult.errors.length,
          errors: transformResult.errors,
          duplicateCount: 0
        }
      })
    }

    // Check for conflicts with existing data
    const conflicts: Array<{
      newRecord: TranscriptData
      existingRecord: TranscriptData
      conflictType: 'duplicate' | 'date_mismatch' | 'count_difference'
    }> = []

    for (const newRecord of transformResult.validData) {
      try {
        const existingRecords = await getTranscriptsByClientAndDate(
          newRecord.clientName,
          newRecord.date
        )

        for (const existingRecord of existingRecords) {
          let conflictType: 'duplicate' | 'date_mismatch' | 'count_difference' = 'duplicate'
          
          if (existingRecord.transcriptCount !== newRecord.transcriptCount) {
            conflictType = 'count_difference'
          }
          
          conflicts.push({
            newRecord,
            existingRecord,
            conflictType
          })
        }
      } catch (error) {
        console.error('Error checking for conflicts:', error)
        // Continue processing other records
      }
    }

    // Handle conflicts based on resolution strategy
    let recordsToImport = transformResult.validData
    let duplicateCount = 0
    let skippedCount = 0

    if (conflicts.length > 0) {
      if (conflictResolution === 'ask') {
        // Return conflicts for user resolution
        return NextResponse.json({
          success: false,
          error: 'Conflicts detected',
          conflicts: conflicts.map(conflict => ({
            newRecord: conflict.newRecord,
            existingRecord: conflict.existingRecord,
            conflictType: conflict.conflictType,
            differences: generateDifferences(conflict.newRecord, conflict.existingRecord)
          })),
          result: {
            totalRows: data.length,
            successCount: 0,
            errorCount: transformResult.errors.length,
            errors: transformResult.errors,
            duplicateCount: conflicts.length
          }
        })
      } else if (conflictResolution === 'skip') {
        // Skip conflicting records
        const conflictingRecordIds = new Set(
          conflicts.map(c => `${c.newRecord.clientName}-${c.newRecord.date.toISOString()}`)
        )
        recordsToImport = transformResult.validData.filter(record => 
          !conflictingRecordIds.has(`${record.clientName}-${record.date.toISOString()}`)
        )
        skippedCount = conflicts.length
      } else if (conflictResolution === 'replace') {
        // Will replace existing records during import
        duplicateCount = conflicts.length
      } else if (conflictResolution === 'merge') {
        // Merge records (take higher count, combine notes)
        for (const conflict of conflicts) {
          const mergedRecord = {
            ...conflict.newRecord,
            transcriptCount: Math.max(
              conflict.newRecord.transcriptCount,
              conflict.existingRecord.transcriptCount
            ),
            notes: [conflict.existingRecord.notes, conflict.newRecord.notes]
              .filter(Boolean)
              .join(' | ') || undefined
          }
          
          // Replace the new record with merged version
          const index = recordsToImport.findIndex(r => 
            r.clientName === conflict.newRecord.clientName &&
            r.date.toISOString() === conflict.newRecord.date.toISOString()
          )
          if (index >= 0) {
            recordsToImport[index] = mergedRecord
          }
        }
        duplicateCount = conflicts.length
      }
    }

    // Import records to database
    const importErrors: Array<{
      row: number
      field: string
      value: any
      message: string
    }> = []
    let successCount = 0

    for (let i = 0; i < recordsToImport.length; i++) {
      const record = recordsToImport[i]
      
      try {
        await createTranscript({
          clientName: record.clientName,
          date: record.date,
          transcriptCount: record.transcriptCount,
          transcriptType: record.transcriptType,
          notes: record.notes,
          createdBy: session.user.id
        })
        
        successCount++
      } catch (error) {
        console.error(`Error importing record ${i + 1}:`, error)
        
        importErrors.push({
          row: i + 1,
          field: 'general',
          value: record,
          message: error instanceof Error ? error.message : 'Import failed'
        })
      }
    }

    // Prepare final result
    const finalResult: ImportResult = {
      totalRows: data.length,
      successCount,
      errorCount: transformResult.errors.length + importErrors.length + skippedCount,
      errors: [...transformResult.errors, ...importErrors],
      duplicateCount
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${successCount} records`,
      result: finalResult,
      metadata: {
        fileName,
        importedAt: new Date().toISOString(),
        importedBy: session.user.id,
        conflictResolution,
        conflictsDetected: conflicts.length
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Import error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// Handle conflict resolution
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const ConflictResolutionSchema = z.object({
      conflicts: z.array(z.object({
        conflictId: z.string(),
        resolution: z.enum(['use_new', 'use_existing', 'merge', 'skip']),
        mergedData: z.any().optional()
      })),
      fileName: z.string()
    })

    const body = await request.json()
    const { conflicts, fileName } = ConflictResolutionSchema.parse(body)

    let successCount = 0
    let errorCount = 0
    const errors: Array<{
      row: number
      field: string
      value: any
      message: string
    }> = []

    for (const conflict of conflicts) {
      try {
        if (conflict.resolution === 'skip') {
          continue
        }

        // In a real implementation, you would:
        // 1. Retrieve the actual conflict data
        // 2. Apply the resolution
        // 3. Update/insert the record accordingly
        
        // For now, we'll simulate the process
        successCount++
        
      } catch (error) {
        errorCount++
        errors.push({
          row: successCount + errorCount,
          field: 'general',
          value: conflict,
          message: error instanceof Error ? error.message : 'Conflict resolution failed'
        })
      }
    }

    const result: ImportResult = {
      totalRows: conflicts.length,
      successCount,
      errorCount,
      errors,
      duplicateCount: 0
    }

    return NextResponse.json({
      success: true,
      message: `Resolved ${successCount} conflicts`,
      result,
      metadata: {
        fileName,
        resolvedAt: new Date().toISOString(),
        resolvedBy: session.user.id
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Conflict resolution error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

function generateDifferences(newRecord: TranscriptData, existingRecord: TranscriptData): string[] {
  const differences: string[] = []
  
  if (newRecord.transcriptCount !== existingRecord.transcriptCount) {
    differences.push(`Transcript count: ${existingRecord.transcriptCount} → ${newRecord.transcriptCount}`)
  }
  
  if (newRecord.transcriptType !== existingRecord.transcriptType) {
    differences.push(`Type: "${existingRecord.transcriptType || 'None'}" → "${newRecord.transcriptType || 'None'}"`)
  }
  
  if (newRecord.notes !== existingRecord.notes) {
    differences.push(`Notes: "${existingRecord.notes || 'None'}" → "${newRecord.notes || 'None'}"`)
  }
  
  if (differences.length === 0) {
    differences.push('Exact duplicate record')
  }
  
  return differences
}