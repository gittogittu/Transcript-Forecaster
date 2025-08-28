"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ArrowRight,
  Merge,
  Replace,
  Skip
} from 'lucide-react'
import type { TranscriptData, ImportResult } from '@/types/transcript'

interface ConflictResolutionProps {
  newData: TranscriptData[]
  existingData: TranscriptData[]
  onResolve: (resolution: ConflictResolution) => void
  onCancel: () => void
  className?: string
}

interface DataConflict {
  newRecord: TranscriptData
  existingRecord: TranscriptData
  conflictType: 'duplicate' | 'date_mismatch' | 'count_difference'
  differences: string[]
}

interface ConflictResolution {
  action: 'merge' | 'replace' | 'skip' | 'keep_both'
  conflicts: Array<{
    conflict: DataConflict
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

export function ConflictResolution({
  newData,
  existingData,
  onResolve,
  onCancel,
  className
}: ConflictResolutionProps) {
  const [resolutions, setResolutions] = useState<Record<string, 'use_new' | 'use_existing' | 'merge' | 'skip'>>({})
  const [globalAction, setGlobalAction] = useState<'merge' | 'replace' | 'skip' | 'ask'>('ask')

  // Detect conflicts between new and existing data
  const conflicts = useMemo(() => {
    const detectedConflicts: DataConflict[] = []
    
    for (const newRecord of newData) {
      // Find potential conflicts based on client name and date
      const potentialConflicts = existingData.filter(existing => 
        existing.clientName.toLowerCase() === newRecord.clientName.toLowerCase() &&
        existing.date.toDateString() === newRecord.date.toDateString()
      )
      
      for (const existingRecord of potentialConflicts) {
        const differences: string[] = []
        let conflictType: DataConflict['conflictType'] = 'duplicate'
        
        // Check for differences
        if (existingRecord.transcriptCount !== newRecord.transcriptCount) {
          differences.push(`Transcript count: ${existingRecord.transcriptCount} → ${newRecord.transcriptCount}`)
          conflictType = 'count_difference'
        }
        
        if (existingRecord.transcriptType !== newRecord.transcriptType) {
          differences.push(`Type: "${existingRecord.transcriptType || 'None'}" → "${newRecord.transcriptType || 'None'}"`)
        }
        
        if (existingRecord.notes !== newRecord.notes) {
          differences.push(`Notes: "${existingRecord.notes || 'None'}" → "${newRecord.notes || 'None'}"`)
        }
        
        if (differences.length === 0) {
          conflictType = 'duplicate'
          differences.push('Exact duplicate record')
        }
        
        detectedConflicts.push({
          newRecord,
          existingRecord,
          conflictType,
          differences
        })
      }
    }
    
    return detectedConflicts
  }, [newData, existingData])

  const handleResolutionChange = (conflictIndex: number, resolution: 'use_new' | 'use_existing' | 'merge' | 'skip') => {
    setResolutions(prev => ({
      ...prev,
      [conflictIndex]: resolution
    }))
  }

  const applyGlobalAction = () => {
    if (globalAction === 'ask') return
    
    const newResolutions: Record<string, 'use_new' | 'use_existing' | 'merge' | 'skip'> = {}
    
    conflicts.forEach((_, index) => {
      switch (globalAction) {
        case 'merge':
          newResolutions[index] = 'merge'
          break
        case 'replace':
          newResolutions[index] = 'use_new'
          break
        case 'skip':
          newResolutions[index] = 'skip'
          break
      }
    })
    
    setResolutions(newResolutions)
  }

  const handleResolve = () => {
    const resolvedConflicts = conflicts.map((conflict, index) => {
      const resolution = resolutions[index] || 'skip'
      let mergedData: Partial<TranscriptData> | undefined
      
      if (resolution === 'merge') {
        mergedData = {
          ...conflict.existingRecord,
          transcriptCount: Math.max(conflict.newRecord.transcriptCount, conflict.existingRecord.transcriptCount),
          transcriptType: conflict.newRecord.transcriptType || conflict.existingRecord.transcriptType,
          notes: [conflict.existingRecord.notes, conflict.newRecord.notes]
            .filter(Boolean)
            .join(' | '),
          updatedAt: new Date()
        }
      }
      
      return {
        conflict,
        resolution,
        mergedData
      }
    })
    
    const summary = {
      totalConflicts: conflicts.length,
      resolved: resolvedConflicts.filter(r => r.resolution !== 'skip').length,
      skipped: resolvedConflicts.filter(r => r.resolution === 'skip').length,
      merged: resolvedConflicts.filter(r => r.resolution === 'merge').length,
      replaced: resolvedConflicts.filter(r => r.resolution === 'use_new').length
    }
    
    const conflictResolution: ConflictResolution = {
      action: globalAction === 'ask' ? 'merge' : globalAction,
      conflicts: resolvedConflicts,
      summary
    }
    
    onResolve(conflictResolution)
  }

  const getConflictIcon = (type: DataConflict['conflictType']) => {
    switch (type) {
      case 'duplicate':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'count_difference':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'date_mismatch':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  const getResolutionIcon = (resolution: string) => {
    switch (resolution) {
      case 'use_new':
        return <Replace className="h-4 w-4 text-blue-600" />
      case 'use_existing':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'merge':
        return <Merge className="h-4 w-4 text-purple-600" />
      case 'skip':
        return <Skip className="h-4 w-4 text-gray-600" />
      default:
        return <X className="h-4 w-4 text-gray-400" />
    }
  }

  const getResolutionColor = (resolution: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (resolution) {
      case 'use_new':
        return 'default'
      case 'use_existing':
        return 'secondary'
      case 'merge':
        return 'outline'
      case 'skip':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (conflicts.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Conflicts Detected</h3>
            <p className="text-muted-foreground mb-4">
              All records can be imported without conflicts
            </p>
            <Button onClick={() => onResolve({
              action: 'merge',
              conflicts: [],
              summary: {
                totalConflicts: 0,
                resolved: newData.length,
                skipped: 0,
                merged: 0,
                replaced: 0
              }
            })}>
              Proceed with Import
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Resolve Data Conflicts
          </CardTitle>
          <CardDescription>
            {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} detected. 
            Choose how to handle each conflict before importing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Actions */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <label className="text-sm font-medium">Apply to all conflicts:</label>
              <Select value={globalAction} onValueChange={(value: any) => setGlobalAction(value)}>
                <SelectTrigger className="w-48 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ask">Ask for each</SelectItem>
                  <SelectItem value="merge">Merge all</SelectItem>
                  <SelectItem value="replace">Replace all</SelectItem>
                  <SelectItem value="skip">Skip all</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              onClick={applyGlobalAction}
              disabled={globalAction === 'ask'}
            >
              Apply to All
            </Button>
          </div>

          {/* Conflicts List */}
          <div className="space-y-4">
            {conflicts.map((conflict, index) => (
              <Card key={index} className="border-l-4 border-l-yellow-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getConflictIcon(conflict.conflictType)}
                      <div>
                        <h4 className="font-medium">
                          {conflict.newRecord.clientName} - {conflict.newRecord.date.toLocaleDateString()}
                        </h4>
                        <p className="text-sm text-muted-foreground capitalize">
                          {conflict.conflictType.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      Conflict #{index + 1}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Differences */}
                  <div>
                    <h5 className="text-sm font-medium mb-2">Differences:</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {conflict.differences.map((diff, diffIndex) => (
                        <li key={diffIndex} className="flex items-center gap-2">
                          <ArrowRight className="h-3 w-3" />
                          {diff}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Data Comparison */}
                  <Tabs defaultValue="comparison" className="w-full">
                    <TabsList>
                      <TabsTrigger value="comparison">Compare</TabsTrigger>
                      <TabsTrigger value="preview">Merge Preview</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="comparison">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h6 className="text-sm font-medium mb-2 text-green-700">Existing Record</h6>
                          <div className="text-sm space-y-1 p-3 bg-green-50 rounded">
                            <p><span className="font-medium">Count:</span> {conflict.existingRecord.transcriptCount}</p>
                            <p><span className="font-medium">Type:</span> {conflict.existingRecord.transcriptType || 'None'}</p>
                            <p><span className="font-medium">Notes:</span> {conflict.existingRecord.notes || 'None'}</p>
                          </div>
                        </div>
                        <div>
                          <h6 className="text-sm font-medium mb-2 text-blue-700">New Record</h6>
                          <div className="text-sm space-y-1 p-3 bg-blue-50 rounded">
                            <p><span className="font-medium">Count:</span> {conflict.newRecord.transcriptCount}</p>
                            <p><span className="font-medium">Type:</span> {conflict.newRecord.transcriptType || 'None'}</p>
                            <p><span className="font-medium">Notes:</span> {conflict.newRecord.notes || 'None'}</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="preview">
                      {resolutions[index] === 'merge' && (
                        <div className="p-3 bg-purple-50 rounded">
                          <h6 className="text-sm font-medium mb-2 text-purple-700">Merged Result</h6>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Count:</span> {Math.max(conflict.newRecord.transcriptCount, conflict.existingRecord.transcriptCount)}</p>
                            <p><span className="font-medium">Type:</span> {conflict.newRecord.transcriptType || conflict.existingRecord.transcriptType || 'None'}</p>
                            <p><span className="font-medium">Notes:</span> {[conflict.existingRecord.notes, conflict.newRecord.notes].filter(Boolean).join(' | ') || 'None'}</p>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {/* Resolution Options */}
                  <div>
                    <h5 className="text-sm font-medium mb-2">Resolution:</h5>
                    <div className="flex gap-2">
                      <Button
                        variant={resolutions[index] === 'use_existing' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleResolutionChange(index, 'use_existing')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Keep Existing
                      </Button>
                      <Button
                        variant={resolutions[index] === 'use_new' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleResolutionChange(index, 'use_new')}
                      >
                        <Replace className="h-4 w-4 mr-1" />
                        Use New
                      </Button>
                      <Button
                        variant={resolutions[index] === 'merge' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleResolutionChange(index, 'merge')}
                      >
                        <Merge className="h-4 w-4 mr-1" />
                        Merge
                      </Button>
                      <Button
                        variant={resolutions[index] === 'skip' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => handleResolutionChange(index, 'skip')}
                      >
                        <Skip className="h-4 w-4 mr-1" />
                        Skip
                      </Button>
                    </div>
                  </div>

                  {resolutions[index] && (
                    <Alert>
                      <div className="flex items-center gap-2">
                        {getResolutionIcon(resolutions[index])}
                        <AlertDescription>
                          <span className="font-medium">Resolution:</span> {
                            resolutions[index] === 'use_new' ? 'Replace existing record with new data' :
                            resolutions[index] === 'use_existing' ? 'Keep existing record, ignore new data' :
                            resolutions[index] === 'merge' ? 'Merge both records, combining data' :
                            'Skip this conflict, no changes will be made'
                          }
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              Cancel Import
            </Button>
            
            <div className="flex gap-2">
              <div className="text-sm text-muted-foreground self-center">
                {Object.keys(resolutions).length} of {conflicts.length} conflicts resolved
              </div>
              <Button 
                onClick={handleResolve}
                disabled={Object.keys(resolutions).length < conflicts.length}
              >
                Apply Resolutions
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}