import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGoogleSheetsService } from '@/lib/services/google-sheets'
import { syncWithGoogleSheets } from '@/lib/data/transcript-data'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { z } from 'zod'

// Validation schema for sync request
const SyncRequestSchema = z.object({
  forceSync: z.boolean().default(false),
  direction: z.enum(['pull', 'push', 'bidirectional']).default('pull'),
  validateData: z.boolean().default(true),
})

/**
 * GET /api/sheets/sync - Get sync status and last sync information
 */
export const GET = withRateLimit(rateLimitConfigs.standard, async (request: NextRequest) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get Google Sheets service to check connection
    const sheetsService = getGoogleSheetsService()
    
    try {
      // Test connection by attempting to read sheet metadata
      const testResult = await sheetsService.testConnection()
      
      return NextResponse.json({
        data: {
          connectionStatus: testResult.success ? 'connected' : 'disconnected',
          lastSync: null, // This would come from a sync log in a real implementation
          sheetsInfo: testResult.success ? {
            spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
            range: process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A:F',
          } : null,
          error: testResult.error || null,
        },
        success: true,
      })
    } catch (error) {
      return NextResponse.json({
        data: {
          connectionStatus: 'error',
          lastSync: null,
          sheetsInfo: null,
          error: error.message,
        },
        success: true,
      })
    }
  } catch (error) {
    console.error('Sync Status API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/sheets/sync - Trigger synchronization with Google Sheets
 */
export const POST = withRateLimit(rateLimitConfigs.strict, async (request: NextRequest) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    
    // Validate request body
    const validationResult = SyncRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const params = validationResult.data

    // Check Google Sheets connection first
    const sheetsService = getGoogleSheetsService()
    const connectionTest = await sheetsService.testConnection()
    
    if (!connectionTest.success) {
      return NextResponse.json(
        { 
          error: 'Google Sheets connection failed',
          details: connectionTest.error,
        },
        { status: 503 }
      )
    }

    // Perform synchronization
    try {
      const syncResult = await syncWithGoogleSheets({
        forceSync: params.forceSync,
        direction: params.direction,
        validateData: params.validateData,
      })

      if (syncResult.error) {
        return NextResponse.json(
          { 
            error: 'Synchronization failed',
            details: syncResult.error,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: {
          syncStatus: 'completed',
          recordsProcessed: syncResult.recordsProcessed || 0,
          recordsAdded: syncResult.recordsAdded || 0,
          recordsUpdated: syncResult.recordsUpdated || 0,
          recordsSkipped: syncResult.recordsSkipped || 0,
          errors: syncResult.errors || [],
          warnings: syncResult.warnings || [],
          syncedAt: new Date().toISOString(),
          direction: params.direction,
        },
        success: true,
        message: 'Synchronization completed successfully',
      })
    } catch (syncError) {
      console.error('Sync operation failed:', syncError)
      return NextResponse.json(
        { 
          error: 'Synchronization operation failed',
          details: syncError.message,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Sync API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})