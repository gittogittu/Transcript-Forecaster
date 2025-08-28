"use client"

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, CheckCircle, AlertCircle, X, FileSpreadsheet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { FileProcessor } from '@/lib/utils/file-processors'
import { FileUploadSchema } from '@/lib/validations/schemas'
import type { RawData, ImportResult } from '@/types/transcript'

interface FileUploadProps {
  onUpload?: (result: ImportResult) => void
  onFileProcessed?: (data: { headers: string[], data: RawData[], fileName: string }) => void
  acceptedFileTypes?: string[]
  maxFileSize?: number
  className?: string
  multiple?: boolean
}

interface UploadedFile {
  file: File
  headers?: string[]
  data?: RawData[]
  error?: string
  status: 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  sheets?: string[]
  selectedSheet?: string
}

export function FileUpload({ 
  onUpload,
  onFileProcessed,
  acceptedFileTypes = ['.csv', '.xlsx', '.xls'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  className,
  multiple = true
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const processFile = useCallback(async (file: File): Promise<{
    headers: string[]
    data: RawData[]
    error?: string
    sheets?: string[]
  }> => {
    // Validate file first
    const validation = FileProcessor.validateFile(file)
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '))
    }

    const fileType = FileProcessor.getFileType(file)
    
    if (fileType === 'csv') {
      const result = await FileProcessor.processCSV(file, true)
      if (result.errors.length > 0) {
        throw new Error(result.errors.join(', '))
      }
      return {
        headers: result.headers,
        data: result.data
      }
    } else if (fileType === 'excel') {
      const result = await FileProcessor.processExcel(file, true)
      if (result.errors.length > 0) {
        throw new Error(result.errors.join(', '))
      }
      return {
        headers: result.headers,
        data: result.data,
        sheets: result.sheets
      }
    } else {
      throw new Error('Unsupported file type')
    }
  }, [])

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
        // Update status to processing
        setUploadedFiles(prev => 
          prev.map((f, idx) => 
            idx === fileIndex ? { ...f, status: 'processing', progress: 25 } : f
          )
        )

        // Process the file
        const result = await processFile(file)
        
        // Update progress
        setUploadedFiles(prev => 
          prev.map((f, idx) => 
            idx === fileIndex ? { ...f, progress: 75 } : f
          )
        )

        // Complete processing
        setUploadedFiles(prev => 
          prev.map((f, idx) => 
            idx === fileIndex 
              ? { 
                  ...f, 
                  status: 'success', 
                  headers: result.headers,
                  data: result.data,
                  sheets: result.sheets,
                  progress: 100 
                }
              : f
          )
        )

        // Notify parent component
        if (onFileProcessed) {
          onFileProcessed({
            headers: result.headers,
            data: result.data,
            fileName: file.name
          })
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
  }, [uploadedFiles.length, processFile, onFileProcessed])

  const handleSheetSelection = useCallback(async (fileIndex: number, sheetName: string) => {
    const uploadedFile = uploadedFiles[fileIndex]
    if (!uploadedFile || !uploadedFile.sheets?.includes(sheetName)) return

    try {
      setUploadedFiles(prev => 
        prev.map((f, idx) => 
          idx === fileIndex ? { ...f, status: 'processing', progress: 50 } : f
        )
      )

      const result = await FileProcessor.processExcelSheet(uploadedFile.file, sheetName, true)
      
      if (result.errors.length > 0) {
        throw new Error(result.errors.join(', '))
      }

      setUploadedFiles(prev => 
        prev.map((f, idx) => 
          idx === fileIndex 
            ? { 
                ...f, 
                status: 'success',
                headers: result.headers,
                data: result.data,
                selectedSheet: sheetName,
                progress: 100 
              }
            : f
        )
      )

      if (onFileProcessed) {
        onFileProcessed({
          headers: result.headers,
          data: result.data,
          fileName: `${uploadedFile.file.name} (${sheetName})`
        })
      }

    } catch (error) {
      setUploadedFiles(prev => 
        prev.map((f, idx) => 
          idx === fileIndex 
            ? { 
                ...f, 
                status: 'error', 
                error: error instanceof Error ? error.message : 'Sheet processing failed',
                progress: 0 
              }
            : f
        )
      )
    }
  }, [uploadedFiles, onFileProcessed])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: maxFileSize,
    multiple
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
      case 'processing':
        return <FileSpreadsheet className="h-4 w-4 text-blue-600 animate-pulse" />
      default:
        return <FileText className="h-4 w-4 text-blue-600" />
    }
  }

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'success':
        return 'default'
      case 'error':
        return 'destructive'
      case 'processing':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...'
      case 'processing':
        return 'Processing...'
      case 'success':
        return 'Ready'
      case 'error':
        return 'Error'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Data Files
          </CardTitle>
          <CardDescription>
            Upload CSV or Excel files containing transcript data for analysis and predictions
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
              ${isProcessing ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Supports CSV, XLS, XLSX files up to {Math.round(maxFileSize / 1024 / 1024)}MB
                </p>
                <p className="text-xs text-muted-foreground">
                  Expected columns: Client Name, Date, Transcript Count, Type (optional), Notes (optional)
                </p>
              </div>
            )}
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="font-medium">Uploaded Files</h4>
              {uploadedFiles.map((uploadedFile, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(uploadedFile.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {uploadedFile.file.name}
                        </p>
                        <Badge variant={getStatusColor(uploadedFile.status)}>
                          {getStatusText(uploadedFile.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.file.size / 1024).toFixed(1)} KB
                        {uploadedFile.data && ` • ${uploadedFile.data.length} rows`}
                        {uploadedFile.headers && ` • ${uploadedFile.headers.length} columns`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {(uploadedFile.status === 'uploading' || uploadedFile.status === 'processing') && (
                    <Progress value={uploadedFile.progress} className="h-2" />
                  )}

                  {uploadedFile.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{uploadedFile.error}</AlertDescription>
                    </Alert>
                  )}

                  {uploadedFile.sheets && uploadedFile.sheets.length > 1 && !uploadedFile.selectedSheet && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Select a sheet to process:</p>
                      <div className="flex flex-wrap gap-2">
                        {uploadedFile.sheets.map((sheet) => (
                          <Button
                            key={sheet}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSheetSelection(index, sheet)}
                            disabled={isProcessing}
                          >
                            {sheet}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {uploadedFile.selectedSheet && (
                    <div className="text-sm text-muted-foreground">
                      Selected sheet: <span className="font-medium">{uploadedFile.selectedSheet}</span>
                    </div>
                  )}

                  {uploadedFile.headers && uploadedFile.status === 'success' && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Detected columns:</p>
                      <div className="flex flex-wrap gap-1">
                        {uploadedFile.headers.map((header, headerIndex) => (
                          <Badge key={headerIndex} variant="secondary" className="text-xs">
                            {header}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}