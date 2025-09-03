import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Simple test endpoint to debug request body issues
 */
export async function POST(request: NextRequest) {
  try {
    console.log('=== TEST UPLOAD ENDPOINT ===')
    
    // Check session
    const session = await getServerSession(authOptions)
    console.log('Session:', session?.user)
    
    // Check headers
    console.log('Headers:', Object.fromEntries(request.headers.entries()))
    
    // Get request body
    const body = await request.json()
    console.log('Request body:', body)
    console.log('Body type:', typeof body)
    console.log('Is array:', Array.isArray(body))
    
    if (Array.isArray(body) && body.length > 0) {
      console.log('First item:', body[0])
      console.log('First item keys:', Object.keys(body[0]))
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test endpoint working',
      receivedData: {
        bodyType: typeof body,
        isArray: Array.isArray(body),
        length: Array.isArray(body) ? body.length : 'N/A',
        firstItem: Array.isArray(body) && body.length > 0 ? body[0] : null,
        session: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role
        } : null
      }
    })
    
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}