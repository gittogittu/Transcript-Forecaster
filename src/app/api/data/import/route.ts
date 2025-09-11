import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database/connection'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const options = {
      cleanData: formData.get('cleanData') === 'true',
      generateEmbeddings: formData.get('generateEmbeddings') === 'true',
      trainModels: formData.get('trainModels') === 'true',
      detectAnomalies: formData.get('detectAnomalies') === 'true'
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload CSV, JSON, or Excel files.' },
        { status: 400 }
      )
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      )
    }

    // Process the file
    const fileContent = await file.text()
    const importResult = await processDataImport(file.name, fileContent, file.type, options)

    return NextResponse.json({
      success: true,
      importId: importResult.importId,
      recordsProcessed: importResult.recordsProcessed,
      message: 'Data import started successfully',
      processingOptions: options
    })

  } catch (error) {
    console.error('Data import failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process data import',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const importId = searchParams.get('importId')

    if (importId) {
      // Get specific import status
      const importStatus = await getImportStatus(importId)
      return NextResponse.json({
        success: true,
        import: importStatus
      })
    }

    // Get import history
    const importHistory = await getImportHistory()
    return NextResponse.json({
      success: true,
      imports: importHistory
    })

  } catch (error) {
    console.error('Failed to get import data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve import data' },
      { status: 500 }
    )
  }
}

async function processDataImport(
  fileName: string, 
  content: string, 
  fileType: string, 
  options: any
) {
  const pool = await getDatabasePool()
  const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    // Parse the data based on file type
    let data: any[] = []
    
    if (fileType === 'text/csv') {
      data = parseCSV(content)
    } else if (fileType === 'application/json') {
      data = JSON.parse(content)
    } else if (fileType.includes('spreadsheet')) {
      // For Excel files, you'd need a library like xlsx
      throw new Error('Excel file processing not yet implemented')
    }

    // Validate data structure
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid data format or empty file')
    }

    // Create import record
    await pool.query(`
      INSERT INTO data_imports (
        import_id, file_name, file_type, status, 
        total_records, processed_records, options, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      importId, fileName, fileType, 'processing', 
      data.length, 0, JSON.stringify(options)
    ])

    // Process data in background
    processDataInBackground(importId, data, options)

    return {
      importId,
      recordsProcessed: 0,
      totalRecords: data.length
    }

  } catch (error) {
    // Update import status to failed
    await pool.query(`
      UPDATE data_imports 
      SET status = 'failed', error_message = $2, updated_at = NOW()
      WHERE import_id = $1
    `, [importId, error instanceof Error ? error.message : 'Unknown error'])
    
    throw error
  }
}

async function processDataInBackground(importId: string, data: any[], options: any) {
  const pool = await getDatabasePool()
  
  try {
    let processedCount = 0
    
    for (const record of data) {
      try {
        // Clean data if requested
        if (options.cleanData) {
          cleanRecord(record)
        }

        // Insert into appropriate table based on data structure
        if (record.date && (record.value || record.transcript_count)) {
          await insertTimeSeriesData(pool, record)
        }

        // Generate embeddings if requested
        if (options.generateEmbeddings && record.content) {
          await generateEmbeddings(pool, record)
        }

        processedCount++

        // Update progress every 100 records
        if (processedCount % 100 === 0) {
          await pool.query(`
            UPDATE data_imports 
            SET processed_records = $2, updated_at = NOW()
            WHERE import_id = $1
          `, [importId, processedCount])
        }

      } catch (recordError) {
        console.error(`Failed to process record:`, recordError)
        // Continue processing other records
      }
    }

    // Mark as completed
    await pool.query(`
      UPDATE data_imports 
      SET status = 'completed', processed_records = $2, completed_at = NOW()
      WHERE import_id = $1
    `, [importId, processedCount])

    // Train models if requested
    if (options.trainModels) {
      await triggerModelTraining(importId)
    }

    // Detect anomalies if requested
    if (options.detectAnomalies) {
      await runAnomalyDetection(importId)
    }

  } catch (error) {
    console.error('Background processing failed:', error)
    await pool.query(`
      UPDATE data_imports 
      SET status = 'failed', error_message = $2, updated_at = NOW()
      WHERE import_id = $1
    `, [importId, error instanceof Error ? error.message : 'Processing failed'])
  }
}

function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    const record: any = {}
    
    headers.forEach((header, index) => {
      record[header] = values[index] || null
    })
    
    data.push(record)
  }

  return data
}

function cleanRecord(record: any) {
  // Remove empty values
  Object.keys(record).forEach(key => {
    if (record[key] === '' || record[key] === null || record[key] === undefined) {
      delete record[key]
    }
  })

  // Convert date strings to Date objects
  if (record.date && typeof record.date === 'string') {
    record.date = new Date(record.date)
  }

  // Convert numeric strings to numbers
  ['value', 'transcript_count', 'count'].forEach(field => {
    if (record[field] && typeof record[field] === 'string') {
      const num = parseFloat(record[field])
      if (!isNaN(num)) {
        record[field] = num
      }
    }
  })
}

async function insertTimeSeriesData(pool: any, record: any) {
  const query = `
    INSERT INTO historical_data (
      client_id, client_name, date, transcript_count, 
      metadata, created_at
    ) VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (client_id, date) DO UPDATE SET
      transcript_count = EXCLUDED.transcript_count,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  `
  
  await pool.query(query, [
    record.client_id || 'imported',
    record.client_name || record.client_id || 'Imported Client',
    record.date,
    record.transcript_count || record.value || 0,
    JSON.stringify({ imported: true, source: 'data_import' })
  ])
}

async function generateEmbeddings(pool: any, record: any) {
  // This would integrate with the embedding service
  // For now, just log that embeddings would be generated
  console.log(`Would generate embeddings for record with content: ${record.content?.substring(0, 100)}...`)
}

async function triggerModelTraining(importId: string) {
  // This would trigger the model training pipeline
  console.log(`Would trigger model training for import: ${importId}`)
}

async function runAnomalyDetection(importId: string) {
  // This would run anomaly detection on the imported data
  console.log(`Would run anomaly detection for import: ${importId}`)
}

async function getImportStatus(importId: string) {
  const pool = await getDatabasePool()
  
  const result = await pool.query(`
    SELECT * FROM data_imports WHERE import_id = $1
  `, [importId])
  
  return result.rows[0] || null
}

async function getImportHistory() {
  const pool = await getDatabasePool()
  
  const result = await pool.query(`
    SELECT 
      import_id, file_name, file_type, status,
      total_records, processed_records, 
      created_at, completed_at, error_message
    FROM data_imports 
    ORDER BY created_at DESC 
    LIMIT 50
  `)
  
  return result.rows
}