"use client"

import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  FileText, 
  Settings,
  Eye,
  Upload
} from 'lucide-react'
import { FileProcessor } from '@/lib/utils/file-processors'
import { TranscriptCreateSchema } from '@/lib/validations/schemas'
import { transformRawDataToTranscripts } from '@/lib/utils/data-transformers'
import type { RawData, ImportResult, TranscriptData } from '@/types/transcript'

interface ImportWizardProps {
  headers: string[]
  data: RawData[]
  fileName: string
  onImport: (result: ImportResult) => void
  onCancel: () => void
  className?: string
}

interface ColumnMapping {
  [key: string]: string // maps required field to selected header
}

interface ValidationError {
  row: number
  field: string
  value: any
  message: string
}

const REQUIRED_FIELDS = {
  clientName: 'Client Name',
  date: 'Date',
  transcriptCount: 'Transcript Count'
} as const

const OPTIONAL_FIELDS = {
  transcriptType: 'Transcript Type',
  notes: 'Notes'
} as const

const ALL_FIELDS = { ...REQUIRED_FIELDS, ...OPTIONAL_FIELDS }

export function ImportWizard({
  headers,
  data,
  fileName,
  onImport,
  onCancel,
  className
}: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<'mapping' | 'preview' | 'conflicts'>('mapping')
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [transformedData, setTransformedData] = useState<TranscriptData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Auto-detect column mappings based on header names
  const autoDetectedMapping = useMemo(() => {
    const mapping: ColumnMapping = {}
    
    Object.entries(ALL_FIELDS).forEach(([field, label]) => {
      const matchingHeader = headers.find(header => {
        const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, '')
        const normalizedField = field.toLowerCase().replace(/[_\s-]/g, '')
        const normalizedLabel = label.toLowerCase().replace(/[_\s-]/g, '')
        
        return normalizedHeader.includes(normalizedField) || 
               normalizedHeader.includes(normalizedLabel) ||
               normalizedField.includes(normalizedHeader)
      })
      
      if (matchingHeader) {
        mapping[field] = matchingHeader
      }
    })
    
    return mapping
  }, [headers])

  // Initialize mapping with auto-detected values
  useState(() => {
    setColumnMapping(autoDetectedMapping)
  })

  const handleMappingChange = (field: string, header: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: header
    }))
  }

  const validateMapping = useCallback(() => {
    const errors: string[] = []
    
    // Check required fields
    Object.entries(REQUIRED_FIELDS).forEach(([field, label]) => {
      if (!columnMapping[field]) {
        errors.push(`${label} is required`)
      }
    })
    
    // Check for duplicate mappings
    const mappedHeaders = Object.values(columnMapping).filter(Boolean)
    const duplicates = mappedHeaders.filter((header, index) => 
      mappedHeaders.indexOf(header) !== index
    )
    
    if (duplicates.length > 0) {
      errors.push(`Duplicate column mappings: ${duplicates.join(', ')}`)
    }
    
    return errors
  }, [columnMapping])

  const processData = useCallback(async () => {
    setIsProcessing(true)
    
    try {
      // Transform raw data using column mapping
      const result = await transformRawDataToTranscripts(data, columnMapping)
      
      setTransformedData(result.validData)
      setValidationErrors(result.errors)
      
      if (result.errors.length > 0) {
        setCurrentStep('conflicts')
      } else {
        // If no errors, proceed directly to import
        const importResult: ImportResult = {
          totalRows: data.length,
          successCount: result.validData.length,
          errorCount: result.errors.length,
          errors: result.errors,
          duplicateCount: 0 // Will be calculated during actual import
        }
        
        onImport(importResult)
      }
    } catch (error) {
      console.error('Data processing error:', error)
      setValidationErrors([{
        row: 0,
        field: 'general',
        value: null,
        message: error instanceof Error ? error.message : 'Unknown processing error'
      }])
      setCurrentStep('conflicts')
    } finally {
      setIsProcessing(false)
    }
  }, [data, columnMapping, onImport])

  const handleNext = async () => {
    if (currentStep === 'mapping') {
      const mappingErrors = validateMapping()
      if (mappingErrors.length > 0) {
        alert(mappingErrors.join('\n'))
        return
      }
      setCurrentStep('preview')
    } else if (currentStep === 'preview') {
      await processData()
    }
  }

  const handleBack = () => {
    if (currentStep === 'preview') {
      setCurrentStep('mapping')
    } else if (currentStep === 'conflicts') {
      setCurrentStep('preview')
    }
  }

  const handleImportWithErrors = () => {
    const importResult: ImportResult = {
      totalRows: data.length,
      successCount: transformedData.length,
      errorCount: validationErrors.length,
      errors: validationErrors,
      duplicateCount: 0
    }
    
    onImport(importResult)
  }

  const previewData = useMemo(() => {
    return FileProcessor.generatePreview(data, 5)
  }, [data])

  const mappedPreviewData = useMemo(() => {
    if (!columnMapping) return []
    
    return previewData.map(row => {
      const mappedRow: Record<string, any> = {}
      Object.entries(columnMapping).forEach(([field, header]) => {
        if (header) {
          mappedRow[ALL_FIELDS[field as keyof typeof ALL_FIELDS]] = row[header]
        }
      })
      return mappedRow
    })
  }, [previewData, columnMapping])

  const isNextDisabled = () => {
    if (currentStep === 'mapping') {
      return validateMapping().length > 0
    }
    return isProcessing
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Wizard - {fileName}
          </CardTitle>
          <CardDescription>
            Configure column mapping and preview data before importing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 ${
                currentStep === 'mapping' ? 'text-primary' : 'text-muted-foreground'
              }`}>
                <Settings className="h-4 w-4" />
                <span className="text-sm font-medium">Column Mapping</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className={`flex items-center gap-2 ${
                currentStep === 'preview' ? 'text-primary' : 'text-muted-foreground'
              }`}>
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Data Preview</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className={`flex items-center gap-2 ${
                currentStep === 'conflicts' ? 'text-primary' : 'text-muted-foreground'
              }`}>
                <Upload className="h-4 w-4" />
                <span className="text-sm font-medium">Import</span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 'mapping' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Map Columns</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Map your file columns to the required transcript data fields
                </p>
              </div>

              <div className="grid gap-4">
                {Object.entries(ALL_FIELDS).map(([field, label]) => {
                  const isRequired = field in REQUIRED_FIELDS
                  return (
                    <div key={field} className="flex items-center gap-4">
                      <div className="w-40">
                        <label className="text-sm font-medium flex items-center gap-1">
                          {label}
                          {isRequired && <span className="text-red-500">*</span>}
                        </label>
                      </div>
                      <Select
                        value={columnMapping[field] || ''}
                        onValueChange={(value) => handleMappingChange(field, value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-- Not mapped --</SelectItem>
                          {headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>

              {validateMapping().length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {validateMapping().map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Data Preview</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Preview how your data will be imported (showing first 5 rows)
                </p>
              </div>

              <Tabs defaultValue="mapped" className="w-full">
                <TabsList>
                  <TabsTrigger value="original">Original Data</TabsTrigger>
                  <TabsTrigger value="mapped">Mapped Data</TabsTrigger>
                </TabsList>
                
                <TabsContent value="original" className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHead key={header}>{header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, index) => (
                          <TableRow key={index}>
                            {headers.map((header) => (
                              <TableCell key={header} className="max-w-32 truncate">
                                {String(row[header] || '')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="mapped" className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.values(ALL_FIELDS).map((label) => (
                            <TableHead key={label}>{label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mappedPreviewData.map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(ALL_FIELDS).map((label) => (
                              <TableCell key={label} className="max-w-32 truncate">
                                {String(row[label] || '')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Total rows to import: {data.length}</span>
              </div>
            </div>
          )}

          {currentStep === 'conflicts' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Import Results</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Review validation errors and conflicts before proceeding
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold">{transformedData.length}</p>
                        <p className="text-sm text-muted-foreground">Valid Records</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-2xl font-bold">{validationErrors.length}</p>
                        <p className="text-sm text-muted-foreground">Errors</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold">{data.length}</p>
                        <p className="text-sm text-muted-foreground">Total Rows</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {validationErrors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Validation Errors</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {validationErrors.slice(0, 10).map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <span className="font-medium">Row {error.row}:</span> {error.message}
                          {error.field !== 'general' && (
                            <span className="text-xs block mt-1">
                              Field: {error.field}, Value: {String(error.value)}
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                    {validationErrors.length > 10 && (
                      <p className="text-sm text-muted-foreground">
                        ... and {validationErrors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <div>
              {currentStep !== 'mapping' && (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              
              {currentStep === 'conflicts' ? (
                <Button onClick={handleImportWithErrors} disabled={transformedData.length === 0}>
                  Import Valid Records ({transformedData.length})
                </Button>
              ) : (
                <Button 
                  onClick={handleNext} 
                  disabled={isNextDisabled()}
                >
                  {isProcessing ? 'Processing...' : 'Next'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}