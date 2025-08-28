"use client"

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { TranscriptData, Client } from '@/types/transcript'
import { TranscriptCreateSchema, TranscriptUpdateSchema } from '@/lib/validations/schemas'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw,
  AlertCircle,
  Check,
  X
} from 'lucide-react'
import { useOptimisticMutations } from '@/lib/hooks/use-optimistic-updates'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { FadeInView, AnimatedButton } from '@/components/animations'
import { z } from 'zod'

export interface GridColumn {
  key: keyof TranscriptData | 'actions'
  title: string
  type: 'text' | 'number' | 'date' | 'select'
  width?: number
  validation?: z.ZodSchema
  options?: string[]
  required?: boolean
  editable?: boolean
}

export interface SpreadsheetGridProps {
  data: TranscriptData[]
  clients: Client[]
  onCellEdit?: (rowId: string, field: keyof TranscriptData, value: any) => Promise<void>
  onRowAdd?: (data: Partial<TranscriptData>) => Promise<void>
  onRowDelete?: (rowId: string) => Promise<void>
  readOnly?: boolean
  loading?: boolean
  error?: string | null
  className?: string
}

interface CellState {
  rowId: string
  field: keyof TranscriptData
  value: any
  isEditing: boolean
  hasError: boolean
  errorMessage?: string
  isDirty: boolean
}

interface GridState {
  selectedCell: { rowId: string; field: keyof TranscriptData } | null
  editingCell: { rowId: string; field: keyof TranscriptData } | null
  cells: Map<string, CellState>
  sortConfig: { field: keyof TranscriptData; direction: 'asc' | 'desc' } | null
}

const DEFAULT_COLUMNS: GridColumn[] = [
  {
    key: 'clientName',
    title: 'Client Name',
    type: 'select',
    width: 200,
    required: true,
    editable: true
  },
  {
    key: 'date',
    title: 'Date',
    type: 'date',
    width: 150,
    required: true,
    editable: true
  },
  {
    key: 'transcriptCount',
    title: 'Transcript Count',
    type: 'number',
    width: 150,
    required: true,
    editable: true
  },
  {
    key: 'transcriptType',
    title: 'Type',
    type: 'text',
    width: 120,
    editable: true
  },
  {
    key: 'notes',
    title: 'Notes',
    type: 'text',
    width: 200,
    editable: true
  },
  {
    key: 'actions',
    title: 'Actions',
    type: 'text',
    width: 100,
    editable: false
  }
]

export function SpreadsheetGrid({
  data,
  clients,
  onCellEdit,
  onRowAdd,
  onRowDelete,
  readOnly = false,
  loading = false,
  error = null,
  className
}: SpreadsheetGridProps) {
  const [gridState, setGridState] = useState<GridState>({
    selectedCell: null,
    editingCell: null,
    cells: new Map(),
    sortConfig: null
  })

  const [newRowData, setNewRowData] = useState<Partial<TranscriptData>>({})
  const [showNewRow, setShowNewRow] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map())

  const { updateTranscriptOptimistic, deleteTranscriptOptimistic } = useOptimisticMutations()

  // Debounced auto-save functionality
  const debouncedSave = useDebounce(async (cellState: CellState) => {
    if (!onCellEdit || !cellState.isDirty) return

    try {
      await onCellEdit(cellState.rowId, cellState.field, cellState.value)
      
      // Mark cell as saved
      setCellState(cellState.rowId, cellState.field, {
        isDirty: false,
        hasError: false,
        errorMessage: undefined
      })
    } catch (error) {
      // Mark cell as error
      setCellState(cellState.rowId, cellState.field, {
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Save failed'
      })
    }
  }, 1000)

  // Helper function to get cell key
  const getCellKey = (rowId: string, field: keyof TranscriptData) => `${rowId}-${field}`

  // Helper function to set cell state
  const setCellState = useCallback((
    rowId: string, 
    field: keyof TranscriptData, 
    updates: Partial<CellState>
  ) => {
    const cellKey = getCellKey(rowId, field)
    setGridState(prev => {
      const newCells = new Map(prev.cells)
      const currentState = newCells.get(cellKey) || {
        rowId,
        field,
        value: '',
        isEditing: false,
        hasError: false,
        isDirty: false
      }
      newCells.set(cellKey, { ...currentState, ...updates })
      return { ...prev, cells: newCells }
    })
  }, [])

  // Get cell state
  const getCellState = useCallback((rowId: string, field: keyof TranscriptData): CellState => {
    const cellKey = getCellKey(rowId, field)
    return gridState.cells.get(cellKey) || {
      rowId,
      field,
      value: '',
      isEditing: false,
      hasError: false,
      isDirty: false
    }
  }, [gridState.cells])

  // Sort data based on current sort configuration
  const sortedData = useMemo(() => {
    if (!gridState.sortConfig) return data

    const { field, direction } = gridState.sortConfig
    return [...data].sort((a, b) => {
      const aValue = a[field]
      const bValue = b[field]

      if (aValue === bValue) return 0

      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return direction === 'asc' ? comparison : -comparison
    })
  }, [data, gridState.sortConfig])

  // Handle cell click
  const handleCellClick = useCallback((rowId: string, field: keyof TranscriptData) => {
    if (readOnly) return

    const column = DEFAULT_COLUMNS.find(col => col.key === field)
    if (!column?.editable) return

    setGridState(prev => ({
      ...prev,
      selectedCell: { rowId, field }
    }))
  }, [readOnly])

  // Handle cell double click to start editing
  const handleCellDoubleClick = useCallback((rowId: string, field: keyof TranscriptData) => {
    if (readOnly) return

    const column = DEFAULT_COLUMNS.find(col => col.key === field)
    if (!column?.editable) return

    const row = data.find(r => r.id === rowId)
    if (!row) return

    setCellState(rowId, field, {
      isEditing: true,
      value: row[field] || ''
    })

    setGridState(prev => ({
      ...prev,
      editingCell: { rowId, field }
    }))
  }, [readOnly, data, setCellState])

  // Handle cell value change
  const handleCellValueChange = useCallback((
    rowId: string, 
    field: keyof TranscriptData, 
    value: any
  ) => {
    setCellState(rowId, field, {
      value,
      isDirty: true,
      hasError: false,
      errorMessage: undefined
    })

    // Trigger debounced save
    const cellState = getCellState(rowId, field)
    debouncedSave({ ...cellState, value, isDirty: true })
  }, [setCellState, getCellState, debouncedSave])

  // Handle cell edit completion
  const handleCellEditComplete = useCallback((
    rowId: string, 
    field: keyof TranscriptData, 
    save: boolean = true
  ) => {
    const cellState = getCellState(rowId, field)
    
    if (save && cellState.isDirty) {
      // Validate the value
      const column = DEFAULT_COLUMNS.find(col => col.key === field)
      if (column?.validation) {
        try {
          column.validation.parse(cellState.value)
        } catch (error) {
          setCellState(rowId, field, {
            hasError: true,
            errorMessage: error instanceof z.ZodError ? error.errors[0].message : 'Invalid value'
          })
          return
        }
      }

      // Trigger immediate save
      if (onCellEdit) {
        onCellEdit(rowId, field, cellState.value).catch(error => {
          setCellState(rowId, field, {
            hasError: true,
            errorMessage: error instanceof Error ? error.message : 'Save failed'
          })
        })
      }
    }

    setCellState(rowId, field, {
      isEditing: false
    })

    setGridState(prev => ({
      ...prev,
      editingCell: null
    }))
  }, [getCellState, setCellState, onCellEdit])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((
    event: React.KeyboardEvent,
    rowId: string,
    field: keyof TranscriptData
  ) => {
    const { key, ctrlKey, metaKey } = event

    if (key === 'Enter') {
      event.preventDefault()
      if (gridState.editingCell) {
        handleCellEditComplete(rowId, field, true)
      } else {
        handleCellDoubleClick(rowId, field)
      }
    } else if (key === 'Escape') {
      event.preventDefault()
      if (gridState.editingCell) {
        handleCellEditComplete(rowId, field, false)
      }
    } else if (key === 'Tab') {
      event.preventDefault()
      // Navigate to next/previous cell
      const currentIndex = DEFAULT_COLUMNS.findIndex(col => col.key === field)
      const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1
      const nextColumn = DEFAULT_COLUMNS[nextIndex]
      
      if (nextColumn && nextColumn.editable) {
        handleCellClick(rowId, nextColumn.key as keyof TranscriptData)
      }
    } else if ((ctrlKey || metaKey) && key === 's') {
      event.preventDefault()
      // Force save current cell
      if (gridState.editingCell) {
        handleCellEditComplete(rowId, field, true)
      }
    }
  }, [gridState.editingCell, handleCellEditComplete, handleCellDoubleClick, handleCellClick])

  // Handle sorting
  const handleSort = useCallback((field: keyof TranscriptData) => {
    setGridState(prev => ({
      ...prev,
      sortConfig: {
        field,
        direction: prev.sortConfig?.field === field && prev.sortConfig.direction === 'asc' 
          ? 'desc' 
          : 'asc'
      }
    }))
  }, [])

  // Handle row addition
  const handleAddRow = useCallback(async () => {
    if (!onRowAdd) return

    try {
      // Validate new row data
      const validatedData = TranscriptCreateSchema.parse({
        ...newRowData,
        createdBy: 'current-user' // This should come from auth context
      })

      await onRowAdd(validatedData)
      setNewRowData({})
      setShowNewRow(false)
    } catch (error) {
      console.error('Failed to add row:', error)
    }
  }, [onRowAdd, newRowData])

  // Handle row deletion
  const handleDeleteRow = useCallback(async (rowId: string) => {
    if (!onRowDelete) return

    try {
      await onRowDelete(rowId)
    } catch (error) {
      console.error('Failed to delete row:', error)
    }
  }, [onRowDelete])

  // Render cell content based on type and state
  const renderCell = useCallback((
    row: TranscriptData, 
    column: GridColumn, 
    cellState: CellState
  ) => {
    const isEditing = cellState.isEditing
    const value = isEditing ? cellState.value : row[column.key as keyof TranscriptData]

    if (column.key === 'actions') {
      return (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteRow(row.id)}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )
    }

    if (!column.editable || readOnly) {
      return (
        <span className="truncate">
          {column.type === 'date' && value instanceof Date 
            ? value.toLocaleDateString()
            : String(value || '')}
        </span>
      )
    }

    if (isEditing) {
      switch (column.type) {
        case 'select':
          if (column.key === 'clientName') {
            return (
              <Select
                value={String(value)}
                onValueChange={(newValue) => handleCellValueChange(row.id, column.key as keyof TranscriptData, newValue)}
                onOpenChange={(open) => {
                  if (!open) {
                    handleCellEditComplete(row.id, column.key as keyof TranscriptData, true)
                  }
                }}
              >
                <SelectTrigger className="h-6 border-0 p-0 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.name}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
          break

        case 'number':
          return (
            <Input
              type="number"
              value={String(value)}
              onChange={(e) => handleCellValueChange(row.id, column.key as keyof TranscriptData, parseInt(e.target.value) || 0)}
              onBlur={() => handleCellEditComplete(row.id, column.key as keyof TranscriptData, true)}
              onKeyDown={(e) => handleKeyDown(e, row.id, column.key as keyof TranscriptData)}
              className="h-6 border-0 p-0 focus:ring-0"
              autoFocus
            />
          )

        case 'date':
          return (
            <Input
              type="date"
              value={value instanceof Date ? value.toISOString().split('T')[0] : String(value)}
              onChange={(e) => handleCellValueChange(row.id, column.key as keyof TranscriptData, new Date(e.target.value))}
              onBlur={() => handleCellEditComplete(row.id, column.key as keyof TranscriptData, true)}
              onKeyDown={(e) => handleKeyDown(e, row.id, column.key as keyof TranscriptData)}
              className="h-6 border-0 p-0 focus:ring-0"
              autoFocus
            />
          )

        default:
          return (
            <Input
              type="text"
              value={String(value)}
              onChange={(e) => handleCellValueChange(row.id, column.key as keyof TranscriptData, e.target.value)}
              onBlur={() => handleCellEditComplete(row.id, column.key as keyof TranscriptData, true)}
              onKeyDown={(e) => handleKeyDown(e, row.id, column.key as keyof TranscriptData)}
              className="h-6 border-0 p-0 focus:ring-0"
              autoFocus
            />
          )
      }
    }

    return (
      <span className="truncate">
        {column.type === 'date' && value instanceof Date 
          ? value.toLocaleDateString()
          : String(value || '')}
      </span>
    )
  }, [
    readOnly, 
    clients, 
    handleCellValueChange, 
    handleCellEditComplete, 
    handleKeyDown, 
    handleDeleteRow
  ])

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-600 mb-4">Error loading spreadsheet: {error}</p>
            <Button variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <FadeInView>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transcript Data Spreadsheet</CardTitle>
            <div className="flex items-center gap-2">
              {!readOnly && (
                <AnimatedButton
                  onClick={() => setShowNewRow(true)}
                  size="sm"
                  disabled={loading}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Row
                </AnimatedButton>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            ref={gridRef}
            className="relative overflow-auto border rounded-lg"
            style={{ maxHeight: '600px' }}
          >
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr>
                  {DEFAULT_COLUMNS.map(column => (
                    <th
                      key={column.key}
                      className={cn(
                        "border-b border-r p-2 text-left font-medium text-sm",
                        column.key !== 'actions' && "cursor-pointer hover:bg-gray-100"
                      )}
                      style={{ width: column.width }}
                      onClick={() => column.key !== 'actions' && handleSort(column.key as keyof TranscriptData)}
                    >
                      <div className="flex items-center gap-1">
                        {column.title}
                        {column.required && <span className="text-red-500">*</span>}
                        {gridState.sortConfig?.field === column.key && (
                          gridState.sortConfig.direction === 'asc' 
                            ? <ArrowUp className="h-3 w-3" />
                            : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {showNewRow && (
                  <tr className="bg-blue-50">
                    {DEFAULT_COLUMNS.map(column => (
                      <td
                        key={column.key}
                        className="border-b border-r p-2"
                      >
                        {column.key === 'actions' ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleAddRow}
                              className="h-6 w-6 p-0 text-green-600"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowNewRow(false)}
                              className="h-6 w-6 p-0 text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : column.editable ? (
                          <Input
                            type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
                            placeholder={`Enter ${column.title.toLowerCase()}`}
                            value={String(newRowData[column.key as keyof TranscriptData] || '')}
                            onChange={(e) => {
                              const value = column.type === 'number' 
                                ? parseInt(e.target.value) || 0
                                : column.type === 'date'
                                ? new Date(e.target.value)
                                : e.target.value
                              setNewRowData(prev => ({
                                ...prev,
                                [column.key]: value
                              }))
                            }}
                            className="h-6 text-sm"
                          />
                        ) : null}
                      </td>
                    ))}
                  </tr>
                )}
                {sortedData.map((row, index) => (
                  <tr 
                    key={row.id}
                    className={cn(
                      "hover:bg-gray-50",
                      index % 2 === 0 ? "bg-white" : "bg-gray-25"
                    )}
                  >
                    {DEFAULT_COLUMNS.map(column => {
                      const cellState = getCellState(row.id, column.key as keyof TranscriptData)
                      const isSelected = gridState.selectedCell?.rowId === row.id && 
                                       gridState.selectedCell?.field === column.key
                      
                      return (
                        <td
                          key={column.key}
                          className={cn(
                            "border-b border-r p-2 relative",
                            isSelected && "ring-2 ring-blue-500 ring-inset",
                            cellState.hasError && "bg-red-50",
                            cellState.isDirty && "bg-yellow-50"
                          )}
                          onClick={() => handleCellClick(row.id, column.key as keyof TranscriptData)}
                          onDoubleClick={() => handleCellDoubleClick(row.id, column.key as keyof TranscriptData)}
                          ref={(el) => {
                            if (el) {
                              cellRefs.current.set(getCellKey(row.id, column.key as keyof TranscriptData), el)
                            }
                          }}
                        >
                          {renderCell(row, column, cellState)}
                          
                          {/* Cell status indicators */}
                          <div className="absolute top-0 right-0 flex">
                            {cellState.isDirty && (
                              <Badge variant="secondary" className="h-2 w-2 p-0 bg-yellow-400" />
                            )}
                            {cellState.hasError && (
                              <Badge variant="destructive" className="h-2 w-2 p-0" />
                            )}
                          </div>
                          
                          {/* Error tooltip */}
                          {cellState.hasError && cellState.errorMessage && (
                            <div className="absolute z-20 bottom-full left-0 mb-1 p-2 bg-red-600 text-white text-xs rounded shadow-lg whitespace-nowrap">
                              {cellState.errorMessage}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {loading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                  <span className="text-sm text-gray-600">Loading...</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Status bar */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>{sortedData.length} rows</span>
              {gridState.cells.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {Array.from(gridState.cells.values()).filter(c => c.isDirty).length} unsaved
                  </Badge>
                  <Badge variant="destructive" className="bg-red-100 text-red-800">
                    {Array.from(gridState.cells.values()).filter(c => c.hasError).length} errors
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <span>Double-click to edit • Tab to navigate • Enter to save • Esc to cancel</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </FadeInView>
  )
}