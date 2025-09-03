"use client"

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { getCSRFHeaders } from '@/lib/utils/csrf'

interface CSVUploadProps {
  onUpload?: (data: any[]) => void
  onImportComplete?: (result: any) => void
  acceptedFileTypes?: string[]
  maxFileSize?: number
  className?: string
  autoImport?: boolean
}

interface UploadedFile {
  file: File
  data?: any[]
  error?: string
  status: 'uploading' | 'success' | 'error'
  progress: number
}

export function CSVUpload({
  onUpload,
  onImportComplete,
  acceptedFileTypes = ['.csv', '.xlsx', '.xls'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  className,
  autoImport = false
}: CSVUploadProps) {
  const { toast } = useToast()
  const { data: session } = useSession()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const processFile = useCallback(async (file: File): Promise<any[]> => {
    const fileExtension = file.name.toLowerCase().split('.').pop()
    
    if (fileExtension === 'csv') {
      // Handle CSV files
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string
            console.log('Processing CSV file:', file.name)
            
            const allLines = text.split('\n')
            
            // Find header row
            let headerLineIndex = -1
            let headers: string[] = []
            
            for (let i = 0; i < allLines.length; i++) {
              const line = allLines[i].trim()
              if (!line) continue
              
              const potentialHeaders = line.split(',').map(h => h.trim().replace(/"/g, ''))
              
              const hasValidHeaders = potentialHeaders.some(h => 
                h && (
                  h.toLowerCase().includes('client') ||
                  h.toLowerCase().includes('total') ||
                  h.toLowerCase().includes('count') ||
                  h.toLowerCase().includes('aht') ||
                  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].includes(h)
                )
              )
              
              if (hasValidHeaders && potentialHeaders.filter(h => h.trim()).length > 1) {
                headerLineIndex = i
                headers = potentialHeaders
                break
              }
            }
            
            if (headerLineIndex === -1) {
              reject(new Error('Could not find valid headers in CSV file'))
              return
            }
            
            // Parse data rows
            const data = allLines.slice(headerLineIndex + 1)
              .filter(line => line.trim())
              .map(line => {
                const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
                const row: any = {}
                headers.forEach((header, headerIndex) => {
                  row[header] = values[headerIndex] || ''
                })
                return row
              })
              .filter(row => {
                const hasData = Object.values(row).some(value => 
                  value && value.toString().trim()
                )
                return hasData
              })

            console.log('Parsed CSV data rows:', data.length)
            resolve(data)
          } catch (error) {
            console.error('CSV parsing error:', error)
            reject(new Error('Failed to parse CSV file'))
          }
        }

        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(file)
      })
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Handle Excel files
      return new Promise(async (resolve, reject) => {
        try {
          const arrayBuffer = await file.arrayBuffer()
          console.log('Processing Excel file:', file.name)
          
          // Import xlsx library dynamically
          const XLSX = await import('xlsx')
          
          // Parse the Excel file
          const workbook = XLSX.read(arrayBuffer, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          // Find header row
          let headerRowIndex = -1
          let headers: string[] = []
          
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i] as any[]
            if (!row || row.length === 0) continue
            
            const potentialHeaders = row.map(cell => cell ? cell.toString().trim() : '')
            
            const hasValidHeaders = potentialHeaders.some(h => 
              h && (
                h.toLowerCase().includes('client') ||
                h.toLowerCase().includes('total') ||
                h.toLowerCase().includes('count') ||
                h.toLowerCase().includes('aht') ||
                ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].includes(h)
              )
            )
            
            if (hasValidHeaders && potentialHeaders.filter(h => h.trim()).length > 1) {
              headerRowIndex = i
              headers = potentialHeaders
              break
            }
          }
          
          if (headerRowIndex === -1) {
            reject(new Error('Could not find valid headers in Excel file'))
            return
          }
          
          // Convert remaining rows to objects
          const data = jsonData.slice(headerRowIndex + 1)
            .filter((row: any) => row && row.length > 0)
            .map((row: any[]) => {
              const rowObj: any = {}
              headers.forEach((header, headerIndex) => {
                const cellValue = row[headerIndex]
                rowObj[header] = cellValue ? cellValue.toString().trim() : ''
              })
              return rowObj
            })
            .filter(row => {
              const hasData = Object.values(row).some(value => 
                value && value.toString().trim()
              )
              return hasData
            })

          console.log('Parsed Excel data rows:', data.length)
          resolve(data)
        } catch (error) {
          console.error('Excel parsing error:', error)
          reject(new Error('Failed to parse Excel file'))
        }
      })
    } else {
      throw new Error('Unsupported file format. Please use CSV, XLS, or XLSX files.')
    }
  }, [])

  const detectFileFormat = useCallback((data: any[]) => {
    if (data.length === 0) return 'unknown'

    const headers = Object.keys(data[0])

    // Check for client breakdown format
    const monthColumns = headers.filter(h => ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].includes(h))
    const hasClientColumn = headers.includes('Client') || headers.includes('client') || headers.some(h => h.toLowerCase().includes('client'))
    const hasAHTColumns = headers.some(h => h.toLowerCase().includes('aht'))
    
    if (hasClientColumn && monthColumns.length > 0) {
      return 'client-breakdown'
    }

    // Check for monthly totals format
    const monthlyTotalColumns = headers.filter(h => 
      h === 'Monthly Total Count' || 
      h === 'Total Files Uploaded' || 
      h === 'Total Files Processed' ||
      (h.toLowerCase().includes('total') && h.toLowerCase().includes('count'))
    )
    
    if (monthlyTotalColumns.length > 0) {
      return 'monthly-totals'
    }

    // Check for standard transcript format
    const clientNameColumns = headers.filter(h => ['client_name', 'Client Name', 'client', 'name'].includes(h))
    const dateColumns = headers.filter(h => ['date', 'Date'].includes(h))
    
    if (clientNameColumns.length > 0 && dateColumns.length > 0) {
      return 'standard'
    }

    return 'unknown'
  }, [])

  const transformClientBreakdownData = useCallback((data: any[]) => {
    const transcripts: any[] = []
    const currentYear = new Date().getFullYear()
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    data.forEach((row, rowIndex) => {
      const clientValue = row['Client'] || row['client'] || ''

      if (!clientValue || clientValue.toString().trim() === '' || clientValue.toString().trim() === 'Grand Total') {
        return
      }

      // Extract AHT information for notes
      const overallAHT = row['Overall AHT'] || ''
      const reviewAHT = row['Review AHT'] || ''
      const validationAHT = row['Validation AHT'] || ''

      const ahtInfo = [
        overallAHT && `Overall: ${overallAHT}`,
        reviewAHT && `Review: ${reviewAHT}`,
        validationAHT && `Validation: ${validationAHT}`
      ].filter(Boolean).join(', ')

      // Process each month column that exists in the data
      const availableMonths = Object.keys(row).filter(key => monthNames.includes(key))

      availableMonths.forEach(month => {
        const countStr = row[month] || '0'
        const cleanCountStr = countStr.toString().replace(/[,"]/g, '')
        const count = parseInt(cleanCountStr)

        if (!isNaN(count) && count > 0) {
          const monthIndex = monthNames.indexOf(month)
          let year = currentYear

          // Handle year logic based on the position in your CSV
          if (['Jan', 'Feb', 'Mar', 'Apr', 'May'].includes(month)) {
            year = currentYear + 1
          }

          const date = new Date(year, monthIndex, 1)

          transcripts.push({
            clientName: clientValue.toString().trim(),
            date: date.toISOString().split('T')[0],
            transcriptCount: count,
            transcriptType: 'call',
            notes: `${month} ${year}${ahtInfo ? ` - AHT: ${ahtInfo}` : ''}`
          })
        }
      })
    })

    return transcripts
  }, [])

  const transformMonthlyTotalsData = useCallback((data: any[]) => {
    const transcripts: any[] = []

    data.forEach((row, index) => {
      const dateStr = row['Monthly Total Count'] || ''
      const totalFilesUploaded = parseInt((row['Total Files Uploaded'] || '0').toString().replace(/[^0-9]/g, ''))
      const totalFilesProcessed = parseInt((row['Total Files Processed'] || '0').toString().replace(/[^0-9]/g, ''))

      if (!dateStr || (!totalFilesUploaded && !totalFilesProcessed)) {
        return
      }

      // Parse the date string (format: "Jan 2024", "Feb 2024", etc.)
      let date: Date
      try {
        const dateParts = dateStr.toString().trim().split(' ')
        if (dateParts.length === 2) {
          const monthStr = dateParts[0]
          const yearStr = dateParts[1]
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          const monthIndex = monthNames.indexOf(monthStr)
          const year = parseInt(yearStr)
          
          if (monthIndex !== -1 && !isNaN(year)) {
            date = new Date(year, monthIndex, 1)
          } else {
            throw new Error('Invalid date format')
          }
        } else {
          throw new Error('Unexpected date format')
        }
      } catch (error) {
        date = new Date(2024, index, 1) // Fallback
      }

      // Create entries for both uploaded and processed if they have values
      if (totalFilesUploaded > 0) {
        transcripts.push({
          clientName: 'Monthly Total - Uploaded',
          date: date.toISOString().split('T')[0],
          transcriptCount: totalFilesUploaded,
          transcriptType: 'monthly-uploaded',
          notes: `Monthly uploaded files - ${dateStr}`
        })
      }

      if (totalFilesProcessed > 0) {
        transcripts.push({
          clientName: 'Monthly Total - Processed',
          date: date.toISOString().split('T')[0],
          transcriptCount: totalFilesProcessed,
          transcriptType: 'monthly-processed',
          notes: `Monthly processed files - ${dateStr}`
        })
      }
    })

    return transcripts
  }, [])

  const transformStandardData = useCallback((data: any[]) => {
    return data.map(row => {
      const clientName = row.client_name || row['Client Name'] || row.client || row.name || ''
      const date = row.date || row.Date || ''
      const transcriptCount = parseInt(row.transcript_count || row['Transcript Count'] || row.count || '0')
      const transcriptType = row.transcript_type || row['Transcript Type'] || row.type || 'call'
      const notes = row.notes || row.Notes || row.comments || ''

      return {
        clientName: clientName.toString().trim(),
        date: date.toString().trim(),
        transcriptCount: isNaN(transcriptCount) ? 0 : transcriptCount,
        transcriptType: transcriptType.toString().trim() || 'call',
        notes: notes.toString().trim() || undefined
      }
    }).filter(transcript => transcript.clientName && transcript.date && transcript.transcriptCount >= 0)
  }, [])

  const importToDatabase = useCallback(async (data: any[], fileName: string) => {
    if (!session?.user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to import data",
        variant: "destructive"
      })
      return
    }

    setIsImporting(true)
    
    try {
      // Detect file format and transform data accordingly
      const format = detectFileFormat(data)
      let transcripts: any[] = []

      console.log(`Detected file format: ${format}`)
      console.log('Sample data row:', data[0])
      console.log('Total data rows received:', data.length)

      try {
        switch (format) {
          case 'client-breakdown':
            transcripts = transformClientBreakdownData(data)
            console.log(`Transformed ${transcripts.length} records from client breakdown format`)
            break
          case 'monthly-totals':
            transcripts = transformMonthlyTotalsData(data)
            console.log(`Transformed ${transcripts.length} records from monthly totals format`)
            break
          case 'standard':
            transcripts = transformStandardData(data)
            console.log(`Transformed ${transcripts.length} records from standard format`)
            break
          default:
            console.error('Unsupported format. Available headers:', Object.keys(data[0] || {}))
            throw new Error(`Unsupported file format. Expected formats:
              1. Client breakdown with monthly columns (Client, Jun, Jul, Aug, etc.)
              2. Monthly totals (Monthly Total Count, Total Files Uploaded, Total Files Processed)
              3. Standard transcript format (client_name/Client Name, date/Date, transcript_count/count)
              
              Found headers: ${Object.keys(data[0] || {}).join(', ')}`)
        }
      } catch (transformError) {
        console.error('Error during data transformation:', transformError)
        throw new Error(`Failed to transform data: ${transformError instanceof Error ? transformError.message : 'Unknown transformation error'}`)
      }

      if (transcripts.length === 0) {
        throw new Error(`No valid transcript data found in CSV file. 
          Detected format: ${format}
          Please check that your file contains data in the expected columns.`)
      }

      // Use the transcripts API for bulk creation
      let headers: Record<string, string>
      try {
        headers = await getCSRFHeaders()
      } catch (csrfError) {
        console.warn('Failed to get CSRF headers, proceeding without:', csrfError)
        headers = {
          'Content-Type': 'application/json'
        }
      }
      
      console.log('Sending request to /api/transcripts with:', {
        transcriptCount: transcripts.length,
        headers,
        sampleTranscript: transcripts.length > 0 ? transcripts[0] : null
      })

      const response = await fetch('/api/transcripts', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(transcripts)
      })

      console.log('Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        const responseText = await response.text()
        console.error('Failed to parse response as JSON:', jsonError, 'Response:', responseText)
        throw new Error(`Invalid JSON response from server: ${responseText}`)
      }

      console.log('API Response:', result)

      if (result.success) {
        const importedCount = Array.isArray(result.data) ? result.data.length : 1

        toast({
          title: "Import Successful",
          description: `Successfully imported ${importedCount} records from ${fileName}`,
        })

        if (onImportComplete) {
          onImportComplete(result)
        }

        // Update file status to show import success
        setUploadedFiles(prev =>
          prev.map(f =>
            f.file.name === fileName
              ? { ...f, status: 'success', data: [...(f.data || []), { imported: true, count: importedCount }] }
              : f
          )
        )
      } else {
        throw new Error(result.error || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)

      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import data to database",
        variant: "destructive"
      })

      // Update file status to show import error
      setUploadedFiles(prev =>
        prev.map(f =>
          f.file.name === fileName
            ? { ...f, error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
            : f
        )
      )
    } finally {
      setIsImporting(false)
    }
  }, [detectFileFormat, transformClientBreakdownData, transformMonthlyTotalsData, transformStandardData, onImportComplete, session, toast])

  const handleFileUpload = useCallback(async (files: File[]) => {
    setIsProcessing(true)

    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      status: 'uploading' as const,
      progress: 0
    }))

    setUploadedFiles(prev => [...prev, ...newFiles])

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileIndex = uploadedFiles.length + i

      try {
        // Simulate progress
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 100))
          setUploadedFiles(prev =>
            prev.map((f, idx) =>
              idx === fileIndex ? { ...f, progress } : f
            )
          )
        }

        const data = await processFile(file)

        setUploadedFiles(prev =>
          prev.map((f, idx) =>
            idx === fileIndex
              ? { ...f, status: 'success', data, progress: 100 }
              : f
          )
        )

        if (onUpload) {
          onUpload(data)
        }

        // Auto-import to database if enabled
        if (autoImport && data.length > 0) {
          await importToDatabase(data, file.name)
        }
      } catch (error) {
        setUploadedFiles(prev =>
          prev.map((f, idx) =>
            idx === fileIndex
              ? {
                ...f,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
                progress: 0
              }
              : f
          )
        )
      }
    }

    setIsProcessing(false)
  }, [uploadedFiles.length, processFile, onUpload, autoImport, importToDatabase])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: maxFileSize,
    multiple: true
  })

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <FileText className="h-4 w-4 text-blue-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'default'
      case 'error':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV Files
          </CardTitle>
          <CardDescription>
            Upload CSV files with client breakdown data, monthly totals, or standard transcript format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Drag & drop CSV files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports CSV, XLS, XLSX files up to {Math.round(maxFileSize / 1024 / 1024)}MB<br />
                  Formats: Client breakdown (Client + monthly columns), Monthly totals, or Standard transcript data
                </p>
              </div>
            )}
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="font-medium">Uploaded Files</h4>
              {uploadedFiles.map((uploadedFile, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getStatusIcon(uploadedFile.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {uploadedFile.file.name}
                      </p>
                      <Badge variant={getStatusColor(uploadedFile.status)}>
                        {uploadedFile.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.file.size / 1024).toFixed(1)} KB
                      {uploadedFile.data && ` • ${uploadedFile.data.length} rows`}
                    </p>
                    {uploadedFile.status === 'uploading' && (
                      <Progress value={uploadedFile.progress} className="mt-2 h-1" />
                    )}
                    {uploadedFile.error && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{uploadedFile.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!autoImport && uploadedFile.status === 'success' && uploadedFile.data && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => importToDatabase(uploadedFile.data!, uploadedFile.file.name)}
                        disabled={isImporting}
                        className="text-xs"
                      >
                        {isImporting ? 'Importing...' : 'Import to DB'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}