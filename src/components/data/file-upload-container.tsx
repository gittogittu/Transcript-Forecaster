"use client"

import { useState, useCallback } from 'react'
import { FileUpload } from './file-upload'
import { ImportWizard } from './import-wizard'
import { ConflictResolution } from './conflict-resolution'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, Upload, ArrowLeft } from 'lucide-react'
import type { RawData, ImportResult, TranscriptData } from '@/types/transcript'

interface FileUploadContainerProps {
  onImportComplete?: (result: ImportResult) => void
  existingData?: TranscriptData[]
  className?: string
}

type UploadStep = 'upload' | 'wizard' | 'conflicts' | 'complete'

interface FileData {
  headers: string[]
  data: RawData[]
  fileName: string
}

interface ConflictResolution {
  action: 'merge' | 'replace' | 'skip' | 'keep_both'
  conflicts: Array<{
    conflict: any
    resolution: 'use_new' | 'use_existing' | 'merge' | 'skip'
    mergedData?: Partial<TranscriptData>
  }>
  summary: {
    totalConflicts: number
    resolved: number
    skipped: number
    merged: number
    replaced: number
  }
}

export function FileUploadContainer({
  onImportComplete,
  existingData = [],
  className
}: FileUploadContainerProps) {
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload')
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileProcessed = useCallback((data: FileData) => {
    setFileData(data)
    setCurrentStep('wizard')
    setError(null)
  }, [])

  const handleImportFromWizard = useCallback(async (result: ImportResult) => {
    setIsProcessing(true)
    
    try {
      // Check for conflicts with existing data if we have any
      if (existingData.length > 0 && result.successCount > 0) {
        // For now, we'll simulate conflict detection
        // In a real implementation, this would check against the database
        const hasConflicts = Math.random() > 0.7 // 30% chance of conflicts for demo
        
        if (hasConflicts) {
          setCurrentStep('conflicts')
          setIsProcessing(false)
          return
        }
      }
      
      // No conflicts, proceed with import
      setImportResult(result)
      setCurrentStep('complete')
      
      if (onImportComplete) {
        onImportComplete(result)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsProcessing(false)
    }
  }, [existingData, onImportComplete])

  const handleConflictResolution = useCallback(async (resolution: ConflictResolution) => {
    setIsProcessing(true)
    
    try {
      // Process the conflict resolution
      const finalResult: ImportResult = {
        totalRows: fileData?.data.length || 0,
        successCount: resolution.summary.resolved,
        errorCount: resolution.summary.skipped,
        errors: [],
        duplicateCount: resolution.summary.merged + resolution.summary.replaced
      }
      
      setImportResult(finalResult)
      setCurrentStep('complete')
      
      if (onImportComplete) {
        onImportComplete(finalResult)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Conflict resolution failed')
    } finally {
      setIsProcessing(false)
    }
  }, [fileData, onImportComplete])

  const handleCancel = useCallback(() => {
    setCurrentStep('upload')
    setFileData(null)
    setImportResult(null)
    setError(null)
  }, [])

  const handleStartOver = useCallback(() => {
    setCurrentStep('upload')
    setFileData(null)
    setImportResult(null)
    setError(null)
  }, [])

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <FileUpload
            onFileProcessed={handleFileProcessed}
            className="w-full"
          />
        )

      case 'wizard':
        if (!fileData) return null
        return (
          <ImportWizard
            headers={fileData.headers}
            data={fileData.data}
            fileName={fileData.fileName}
            onImport={handleImportFromWizard}
            onCancel={handleCancel}
            className="w-full"
          />
        )

      case 'conflicts':
        if (!fileData) return null
        // For demo purposes, we'll create some mock conflicts
        // In a real implementation, this would come from the conflict detection
        const mockNewData: TranscriptData[] = [
          {
            id: 'new-1',
            clientId: 'client-1',
            clientName: 'Test Client',
            date: new Date(),
            transcriptCount: 150,
            transcriptType: 'Support',
            notes: 'New import data',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'import-user'
          }
        ]
        
        return (
          <ConflictResolution
            newData={mockNewData}
            existingData={existingData}
            onResolve={handleConflictResolution}
            onCancel={handleCancel}
            className="w-full"
          />
        )

      case 'complete':
        return (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Import Complete
              </CardTitle>
              <CardDescription>
                Your data has been successfully imported
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {importResult && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {importResult.successCount}
                    </div>
                    <div className="text-sm text-green-600">Imported</div>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-700">
                      {importResult.errorCount}
                    </div>
                    <div className="text-sm text-red-600">Errors</div>
                  </div>
                  
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-700">
                      {importResult.duplicateCount}
                    </div>
                    <div className="text-sm text-yellow-600">Duplicates</div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">
                      {importResult.totalRows}
                    </div>
                    <div className="text-sm text-blue-600">Total Rows</div>
                  </div>
                </div>
              )}
              
              {importResult?.errors && importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Import Errors:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Row {error.row}: {error.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                    {importResult.errors.length > 5 && (
                      <p className="text-sm text-muted-foreground">
                        ... and {importResult.errors.length - 5} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={handleStartOver}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import More Files
                </Button>
                
                <Button onClick={() => window.location.reload()}>
                  View Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <div className={`flex items-center gap-2 ${
          currentStep === 'upload' ? 'text-primary' : 
          ['wizard', 'conflicts', 'complete'].includes(currentStep) ? 'text-green-600' : 'text-muted-foreground'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'upload' ? 'bg-primary text-primary-foreground' :
            ['wizard', 'conflicts', 'complete'].includes(currentStep) ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            1
          </div>
          <span className="text-sm font-medium">Upload</span>
        </div>
        
        <div className="w-8 h-px bg-border" />
        
        <div className={`flex items-center gap-2 ${
          currentStep === 'wizard' ? 'text-primary' : 
          ['conflicts', 'complete'].includes(currentStep) ? 'text-green-600' : 'text-muted-foreground'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'wizard' ? 'bg-primary text-primary-foreground' :
            ['conflicts', 'complete'].includes(currentStep) ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            2
          </div>
          <span className="text-sm font-medium">Configure</span>
        </div>
        
        <div className="w-8 h-px bg-border" />
        
        <div className={`flex items-center gap-2 ${
          currentStep === 'conflicts' ? 'text-primary' : 
          currentStep === 'complete' ? 'text-green-600' : 'text-muted-foreground'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'conflicts' ? 'bg-primary text-primary-foreground' :
            currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            3
          </div>
          <span className="text-sm font-medium">Resolve</span>
        </div>
        
        <div className="w-8 h-px bg-border" />
        
        <div className={`flex items-center gap-2 ${
          currentStep === 'complete' ? 'text-green-600' : 'text-muted-foreground'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            4
          </div>
          <span className="text-sm font-medium">Complete</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      {renderStepContent()}

      {/* Back Button for non-upload steps */}
      {currentStep !== 'upload' && currentStep !== 'complete' && (
        <div className="flex justify-start">
          <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Upload
          </Button>
        </div>
      )}
    </div>
  )
}