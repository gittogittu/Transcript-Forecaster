import { NextResponse } from 'next/server'
import { testSheetsConnection } from '@/lib/data/transcript-data'

/**
 * GET /api/sheets/test-connection - Test Google Sheets API connection
 */
export async function GET() {
  try {
    const result = await testSheetsConnection()
    
    return NextResponse.json({
      connected: result.data,
      error: result.error,
      message: result.data 
        ? 'Google Sheets connection successful' 
        : 'Google Sheets connection failed',
    })
  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      { 
        connected: false,
        error: 'Internal server error',
        message: 'Failed to test connection',
      },
      { status: 500 }
    )
  }
}