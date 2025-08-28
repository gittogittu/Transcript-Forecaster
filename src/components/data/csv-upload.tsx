"use client"

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CSVUploadProps {
  onUpload?: (data: any[]) => void
  acceptedFileTypes?: string[]
  maxFileSize?: number
  className?: string
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
  acceptedFileTypes = ['.csv', '.xlsx', '.xls'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  className 
}: CSVUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const processCSV = useCallback(async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n')
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
          
          const data = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
              const row: any = {}
              headers.forEach((header, index) => {
                row[header] = values[index] || ''
              })
              return row
            })
          
          resolve(data)
        } catch (error) {
          reject(new Error('Failed to parse CSV file'))
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
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
        // Simulate progress
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 100))
          setUploadedFiles(prev => 
            prev.map((f, idx) => 
              idx === fileIndex ? { ...f, progress } : f
            )
          )
        }

        const data = await processCSV(file)
        
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
  }, [uploadedFiles.length, processCSV, onUpload])

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
            Upload AHT data files to analyze client performance metrics
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
                  Supports CSV, XLS, XLSX files up to {Math.round(maxFileSize / 1024 / 1024)}MB
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}