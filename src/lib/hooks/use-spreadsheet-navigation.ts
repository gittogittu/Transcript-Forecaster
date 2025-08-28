import { useCallback, useRef, useEffect } from 'react'

export interface NavigationCell {
  rowId: string
  field: string
}

export interface NavigationConfig {
  rows: string[]
  columns: string[]
  onCellSelect?: (cell: NavigationCell) => void
  onCellEdit?: (cell: NavigationCell) => void
  onCellComplete?: (cell: NavigationCell, save: boolean) => void
}

export interface SpreadsheetNavigationState {
  selectedCell: NavigationCell | null
  editingCell: NavigationCell | null
}

/**
 * Hook for managing keyboard navigation in spreadsheet-like interfaces
 */
export function useSpreadsheetNavigation(config: NavigationConfig) {
  const { rows, columns, onCellSelect, onCellEdit, onCellComplete } = config
  const navigationStateRef = useRef<SpreadsheetNavigationState>({
    selectedCell: null,
    editingCell: null
  })

  // Get current cell indices
  const getCurrentIndices = useCallback((cell: NavigationCell | null) => {
    if (!cell) return { rowIndex: -1, colIndex: -1 }
    
    const rowIndex = rows.findIndex(row => row === cell.rowId)
    const colIndex = columns.findIndex(col => col === cell.field)
    
    return { rowIndex, colIndex }
  }, [rows, columns])

  // Navigate to a specific cell
  const navigateToCell = useCallback((rowIndex: number, colIndex: number) => {
    if (rowIndex < 0 || rowIndex >= rows.length || colIndex < 0 || colIndex >= columns.length) {
      return false
    }

    const cell: NavigationCell = {
      rowId: rows[rowIndex],
      field: columns[colIndex]
    }

    navigationStateRef.current.selectedCell = cell
    onCellSelect?.(cell)
    return true
  }, [rows, columns, onCellSelect])

  // Navigate relative to current position
  const navigateRelative = useCallback((deltaRow: number, deltaCol: number) => {
    const { selectedCell } = navigationStateRef.current
    const { rowIndex, colIndex } = getCurrentIndices(selectedCell)
    
    if (rowIndex === -1 || colIndex === -1) {
      // No current selection, start at 0,0
      return navigateToCell(0, 0)
    }

    return navigateToCell(rowIndex + deltaRow, colIndex + deltaCol)
  }, [getCurrentIndices, navigateToCell])

  // Start editing current cell
  const startEditing = useCallback(() => {
    const { selectedCell } = navigationStateRef.current
    if (!selectedCell) return false

    navigationStateRef.current.editingCell = selectedCell
    onCellEdit?.(selectedCell)
    return true
  }, [onCellEdit])

  // Complete editing current cell
  const completeEditing = useCallback((save: boolean = true) => {
    const { editingCell } = navigationStateRef.current
    if (!editingCell) return false

    navigationStateRef.current.editingCell = null
    onCellComplete?.(editingCell, save)
    return true
  }, [onCellComplete])

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, ctrlKey, metaKey, shiftKey } = event
    const { editingCell } = navigationStateRef.current

    // If editing, only handle specific keys
    if (editingCell) {
      switch (key) {
        case 'Enter':
          event.preventDefault()
          completeEditing(true)
          navigateRelative(1, 0) // Move down after save
          break
        case 'Escape':
          event.preventDefault()
          completeEditing(false)
          break
        case 'Tab':
          event.preventDefault()
          completeEditing(true)
          navigateRelative(0, shiftKey ? -1 : 1) // Move left/right after save
          break
      }
      return
    }

    // Navigation keys when not editing
    switch (key) {
      case 'ArrowUp':
        event.preventDefault()
        navigateRelative(-1, 0)
        break
      case 'ArrowDown':
        event.preventDefault()
        navigateRelative(1, 0)
        break
      case 'ArrowLeft':
        event.preventDefault()
        navigateRelative(0, -1)
        break
      case 'ArrowRight':
        event.preventDefault()
        navigateRelative(0, 1)
        break
      case 'Tab':
        event.preventDefault()
        navigateRelative(0, shiftKey ? -1 : 1)
        break
      case 'Enter':
        event.preventDefault()
        startEditing()
        break
      case 'F2':
        event.preventDefault()
        startEditing()
        break
      case 'Home':
        event.preventDefault()
        if (ctrlKey || metaKey) {
          navigateToCell(0, 0) // Go to first cell
        } else {
          const { rowIndex } = getCurrentIndices(navigationStateRef.current.selectedCell)
          navigateToCell(rowIndex, 0) // Go to first column of current row
        }
        break
      case 'End':
        event.preventDefault()
        if (ctrlKey || metaKey) {
          navigateToCell(rows.length - 1, columns.length - 1) // Go to last cell
        } else {
          const { rowIndex } = getCurrentIndices(navigationStateRef.current.selectedCell)
          navigateToCell(rowIndex, columns.length - 1) // Go to last column of current row
        }
        break
      case 'PageUp':
        event.preventDefault()
        navigateRelative(-10, 0) // Move up 10 rows
        break
      case 'PageDown':
        event.preventDefault()
        navigateRelative(10, 0) // Move down 10 rows
        break
      default:
        // Start editing if a printable character is pressed
        if (key.length === 1 && !ctrlKey && !metaKey) {
          startEditing()
        }
        break
    }
  }, [navigateRelative, navigateToCell, startEditing, completeEditing, getCurrentIndices, rows.length, columns.length])

  // Set up keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // Public API
  return {
    // State getters
    getSelectedCell: () => navigationStateRef.current.selectedCell,
    getEditingCell: () => navigationStateRef.current.editingCell,
    isEditing: () => navigationStateRef.current.editingCell !== null,
    
    // Navigation methods
    selectCell: (rowId: string, field: string) => {
      const cell: NavigationCell = { rowId, field }
      navigationStateRef.current.selectedCell = cell
      onCellSelect?.(cell)
    },
    
    navigateToCell,
    navigateRelative,
    
    // Editing methods
    startEditing,
    completeEditing,
    
    // Utility methods
    getCurrentIndices: () => getCurrentIndices(navigationStateRef.current.selectedCell),
    
    // Focus management
    focusCell: (rowId: string, field: string) => {
      const cellElement = document.querySelector(`[data-cell="${rowId}-${field}"]`) as HTMLElement
      if (cellElement) {
        cellElement.focus()
      }
    }
  }
}

/**
 * Hook for managing cell selection state
 */
export function useCellSelection() {
  const selectedCellsRef = useRef<Set<string>>(new Set())

  const selectCell = useCallback((rowId: string, field: string) => {
    const cellKey = `${rowId}-${field}`
    selectedCellsRef.current.clear()
    selectedCellsRef.current.add(cellKey)
  }, [])

  const selectRange = useCallback((
    startRowId: string, 
    startField: string, 
    endRowId: string, 
    endField: string,
    rows: string[],
    columns: string[]
  ) => {
    const startRowIndex = rows.findIndex(row => row === startRowId)
    const startColIndex = columns.findIndex(col => col === startField)
    const endRowIndex = rows.findIndex(row => row === endRowId)
    const endColIndex = columns.findIndex(col => col === endField)

    if (startRowIndex === -1 || startColIndex === -1 || endRowIndex === -1 || endColIndex === -1) {
      return
    }

    const minRow = Math.min(startRowIndex, endRowIndex)
    const maxRow = Math.max(startRowIndex, endRowIndex)
    const minCol = Math.min(startColIndex, endColIndex)
    const maxCol = Math.max(startColIndex, endColIndex)

    selectedCellsRef.current.clear()

    for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
      for (let colIndex = minCol; colIndex <= maxCol; colIndex++) {
        const cellKey = `${rows[rowIndex]}-${columns[colIndex]}`
        selectedCellsRef.current.add(cellKey)
      }
    }
  }, [])

  const toggleCell = useCallback((rowId: string, field: string) => {
    const cellKey = `${rowId}-${field}`
    if (selectedCellsRef.current.has(cellKey)) {
      selectedCellsRef.current.delete(cellKey)
    } else {
      selectedCellsRef.current.add(cellKey)
    }
  }, [])

  const clearSelection = useCallback(() => {
    selectedCellsRef.current.clear()
  }, [])

  const isSelected = useCallback((rowId: string, field: string) => {
    const cellKey = `${rowId}-${field}`
    return selectedCellsRef.current.has(cellKey)
  }, [])

  const getSelectedCells = useCallback(() => {
    return Array.from(selectedCellsRef.current).map(cellKey => {
      const [rowId, field] = cellKey.split('-')
      return { rowId, field }
    })
  }, [])

  return {
    selectCell,
    selectRange,
    toggleCell,
    clearSelection,
    isSelected,
    getSelectedCells,
    getSelectionCount: () => selectedCellsRef.current.size
  }
}