import { NextRequest, NextResponse } from 'next/server'
import { analystOrAdmin, getCurrentUser } from '@/lib/middleware/auth'
import { withRateLimit, rateLimitConfigs } from '@/lib/middleware/rate-limit'
import { performanceMiddleware } from '@/lib/middleware/performance-middleware'
import { FileProcessor } from '@/lib/utils/file-processors'
import { FileUploadSchema } from '@/lib/validations/schemas'
import { z } from 'zod'

async function handlePOST(request: NextRequest) {
  return performanceMiddleware(request, async () => {
    try {
      const user = await getCurrentUser(request)
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as string
    const hasHeaders = formData.get('hasHeaders') === 'true'
    const sheetName = formData.get('sheetName') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file
    const validation = FileProcessor.validateFile(file)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'File validation failed',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    // Determine file type if not provided
    const detectedFileType = fileType || FileProcessor.getFileType(file)
    
    if (detectedFileType === 'unknown') {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type' },
        { status: 400 }
      )
    }

    // Process file based on type
    let result: {
      headers: string[]
      data: any[]
      errors: string[]
      sheets?: string[]
    }

    if (detectedFileType === 'csv') {
      result = await FileProcessor.processCSV(file, hasHeaders)
    } else if (detectedFileType === 'excel') {
      if (sheetName) {
        // Process specific sheet
        const sheetResult = await FileProcessor.processExcelSheet(file, sheetName, hasHeaders)
        result = {
          headers: sheetResult.headers,
          data: sheetResult.data,
          errors: sheetResult.errors
        }
      } else {
        // Process first sheet and return available sheets
        result = await FileProcessor.processExcel(file, hasHeaders)
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type' },
        { status: 400 }
      )
    }

    // Check for processing errors
    if (result.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'File processing failed',
          details: result.errors,
          partialData: {
            headers: result.headers,
            data: result.data,
            sheets: result.sheets
          }
        },
        { status: 400 }
      )
    }

    // Generate preview and detect column types
    const preview = FileProcessor.generatePreview(result.data, 10)
    const columnTypes = FileProcessor.detectColumnTypes(result.data, result.headers)

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        fileSize: file.size,
        fileType: detectedFileType,
        headers: result.headers,
        data: result.data,
        preview,
        columnTypes,
        sheets: result.sheets,
        totalRows: result.data.length,
        processedAt: new Date().toISOString()
      }
    })

    } catch (error) {
      console.error('File upload error:', error)
      
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        },
        { status: 500 }
      )
    }
  })
}

// Handle file upload validation
async function handlePUT(request: NextRequest) {
  return performanceMiddleware(request, async () => {
    try {
      const user = await getCurrentUser(request)
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

    const body = await request.json()
    
    // Validate request body
    const validationSchema = z.object({
      fileName: z.string().min(1),
      fileSize: z.number().min(1),
      fileType: z.enum(['csv', 'excel'])
    })

    const validatedData = validationSchema.parse(body)

    // Simulate file validation (in real implementation, this might check against storage)
    const mockFile = new File([''], validatedData.fileName, { 
      type: validatedData.fileType === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    // Override size for validation
    Object.defineProperty(mockFile, 'size', {
      value: validatedData.fileSize,
      writable: false
    })

    const validation = FileProcessor.validateFile(mockFile)

    return NextResponse.json({
      success: true,
      data: {
        isValid: validation.isValid,
        errors: validation.errors,
        fileType: FileProcessor.getFileType(mockFile)
      }
    })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: error.issues
          },
          { status: 400 }
        )
      }

      console.error('File validation error:', error)
      
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        },
        { status: 500 }
      )
    }
  })
}

// Export handlers with middleware
export const POST = withRateLimit(rateLimitConfigs.data, analystOrAdmin(handlePOST))
export const PUT = withRateLimit(rateLimitConfigs.data, analystOrAdmin(handlePUT))