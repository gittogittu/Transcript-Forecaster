import { renderHook, act } from '@testing-library/react'
import { useSpreadsheetNavigation, useCellSelection } from '../use-spreadsheet-navigation'

// Mock DOM methods
Object.defineProperty(document, 'addEventListener', {
  value: jest.fn(),
  writable: true
})

Object.defineProperty(document, 'removeEventListener', {
  value: jest.fn(),
  writable: true
})

Object.defineProperty(document, 'querySelector', {
  value: jest.fn(),
  writable: true
})

describe('useSpreadsheetNavigation', () => {
  const mockRows = ['row1', 'row2', 'row3']
  const mockColumns = ['col1', 'col2', 'col3']
  const mockOnCellSelect = jest.fn()
  const mockOnCellEdit = jest.fn()
  const mockOnCellComplete = jest.fn()

  const defaultConfig = {
    rows: mockRows,
    columns: mockColumns,
    onCellSelect: mockOnCellSelect,
    onCellEdit: mockOnCellEdit,
    onCellComplete: mockOnCellComplete
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Navigation', () => {
    it('initializes with no selected cell', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      expect(result.current.getSelectedCell()).toBeNull()
      expect(result.current.getEditingCell()).toBeNull()
      expect(result.current.isEditing()).toBe(false)
    })

    it('navigates to specific cell', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      act(() => {
        result.current.navigateToCell(1, 2)
      })

      expect(mockOnCellSelect).toHaveBeenCalledWith({
        rowId: 'row2',
        field: 'col3'
      })
    })

    it('prevents navigation outside bounds', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      act(() => {
        const success = result.current.navigateToCell(-1, 0)
        expect(success).toBe(false)
      })

      act(() => {
        const success = result.current.navigateToCell(0, 5)
        expect(success).toBe(false)
      })

      expect(mockOnCellSelect).not.toHaveBeenCalled()
    })

    it('navigates relatively from current position', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      // First select a cell
      act(() => {
        result.current.selectCell('row2', 'col2')
      })

      // Navigate relatively
      act(() => {
        result.current.navigateRelative(1, -1)
      })

      expect(mockOnCellSelect).toHaveBeenLastCalledWith({
        rowId: 'row3',
        field: 'col1'
      })
    })

    it('starts from 0,0 when no cell is selected for relative navigation', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      act(() => {
        result.current.navigateRelative(0, 0)
      })

      expect(mockOnCellSelect).toHaveBeenCalledWith({
        rowId: 'row1',
        field: 'col1'
      })
    })
  })

  describe('Editing', () => {
    it('starts editing current cell', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      // Select a cell first
      act(() => {
        result.current.selectCell('row1', 'col1')
      })

      // Start editing
      act(() => {
        const success = result.current.startEditing()
        expect(success).toBe(true)
      })

      expect(result.current.isEditing()).toBe(true)
      expect(mockOnCellEdit).toHaveBeenCalledWith({
        rowId: 'row1',
        field: 'col1'
      })
    })

    it('cannot start editing without selected cell', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      act(() => {
        const success = result.current.startEditing()
        expect(success).toBe(false)
      })

      expect(mockOnCellEdit).not.toHaveBeenCalled()
    })

    it('completes editing with save', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      // Select and start editing
      act(() => {
        result.current.selectCell('row1', 'col1')
        result.current.startEditing()
      })

      // Complete editing
      act(() => {
        const success = result.current.completeEditing(true)
        expect(success).toBe(true)
      })

      expect(result.current.isEditing()).toBe(false)
      expect(mockOnCellComplete).toHaveBeenCalledWith(
        { rowId: 'row1', field: 'col1' },
        true
      )
    })

    it('completes editing without save', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      // Select and start editing
      act(() => {
        result.current.selectCell('row1', 'col1')
        result.current.startEditing()
      })

      // Complete editing without save
      act(() => {
        result.current.completeEditing(false)
      })

      expect(mockOnCellComplete).toHaveBeenCalledWith(
        { rowId: 'row1', field: 'col1' },
        false
      )
    })
  })

  describe('Keyboard Event Handling', () => {
    it('sets up keyboard event listeners', () => {
      renderHook(() => useSpreadsheetNavigation(defaultConfig))

      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('removes keyboard event listeners on unmount', () => {
      const { unmount } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      unmount()

      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('handles arrow key navigation when not editing', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      // Select initial cell
      act(() => {
        result.current.selectCell('row2', 'col2')
      })

      // Simulate arrow key events
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      Object.defineProperty(keydownEvent, 'preventDefault', {
        value: jest.fn()
      })

      act(() => {
        document.dispatchEvent(keydownEvent)
      })

      expect(keydownEvent.preventDefault).toHaveBeenCalled()
    })

    it('handles Enter key to start editing', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      // Select a cell
      act(() => {
        result.current.selectCell('row1', 'col1')
      })

      // Simulate Enter key
      const keydownEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      Object.defineProperty(keydownEvent, 'preventDefault', {
        value: jest.fn()
      })

      act(() => {
        document.dispatchEvent(keydownEvent)
      })

      expect(result.current.isEditing()).toBe(true)
      expect(mockOnCellEdit).toHaveBeenCalled()
    })

    it('handles Escape key to cancel editing', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      // Start editing
      act(() => {
        result.current.selectCell('row1', 'col1')
        result.current.startEditing()
      })

      // Simulate Escape key
      const keydownEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      Object.defineProperty(keydownEvent, 'preventDefault', {
        value: jest.fn()
      })

      act(() => {
        document.dispatchEvent(keydownEvent)
      })

      expect(result.current.isEditing()).toBe(false)
      expect(mockOnCellComplete).toHaveBeenCalledWith(
        { rowId: 'row1', field: 'col1' },
        false
      )
    })

    it('handles Tab key navigation', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      // Select a cell
      act(() => {
        result.current.selectCell('row1', 'col1')
      })

      // Simulate Tab key
      const keydownEvent = new KeyboardEvent('keydown', { key: 'Tab' })
      Object.defineProperty(keydownEvent, 'preventDefault', {
        value: jest.fn()
      })

      act(() => {
        document.dispatchEvent(keydownEvent)
      })

      expect(keydownEvent.preventDefault).toHaveBeenCalled()
    })

    it('handles Home and End keys', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      // Select a cell in the middle
      act(() => {
        result.current.selectCell('row2', 'col2')
      })

      // Simulate Home key
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' })
      Object.defineProperty(homeEvent, 'preventDefault', {
        value: jest.fn()
      })

      act(() => {
        document.dispatchEvent(homeEvent)
      })

      expect(homeEvent.preventDefault).toHaveBeenCalled()
    })

    it('handles Ctrl+Home to go to first cell', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      // Select a cell
      act(() => {
        result.current.selectCell('row2', 'col2')
      })

      // Simulate Ctrl+Home
      const ctrlHomeEvent = new KeyboardEvent('keydown', { 
        key: 'Home', 
        ctrlKey: true 
      })
      Object.defineProperty(ctrlHomeEvent, 'preventDefault', {
        value: jest.fn()
      })

      act(() => {
        document.dispatchEvent(ctrlHomeEvent)
      })

      expect(ctrlHomeEvent.preventDefault).toHaveBeenCalled()
    })

    it('starts editing on printable character', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      // Select a cell
      act(() => {
        result.current.selectCell('row1', 'col1')
      })

      // Simulate typing a character
      const charEvent = new KeyboardEvent('keydown', { key: 'a' })

      act(() => {
        document.dispatchEvent(charEvent)
      })

      expect(result.current.isEditing()).toBe(true)
    })
  })

  describe('Utility Methods', () => {
    it('gets current indices correctly', () => {
      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      act(() => {
        result.current.selectCell('row2', 'col3')
      })

      const indices = result.current.getCurrentIndices()
      expect(indices).toEqual({ rowIndex: 1, colIndex: 2 })
    })

    it('focuses cell element', () => {
      const mockElement = { focus: jest.fn() }
      ;(document.querySelector as jest.Mock).mockReturnValue(mockElement)

      const { result } = renderHook(() => useSpreadsheetNavigation(defaultConfig))

      act(() => {
        result.current.focusCell('row1', 'col1')
      })

      expect(document.querySelector).toHaveBeenCalledWith('[data-cell="row1-col1"]')
      expect(mockElement.focus).toHaveBeenCalled()
    })
  })
})

describe('useCellSelection', () => {
  const mockRows = ['row1', 'row2', 'row3']
  const mockColumns = ['col1', 'col2', 'col3']

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Single Cell Selection', () => {
    it('selects a single cell', () => {
      const { result } = renderHook(() => useCellSelection())

      act(() => {
        result.current.selectCell('row1', 'col1')
      })

      expect(result.current.isSelected('row1', 'col1')).toBe(true)
      expect(result.current.getSelectionCount()).toBe(1)
    })

    it('replaces previous selection when selecting new cell', () => {
      const { result } = renderHook(() => useCellSelection())

      act(() => {
        result.current.selectCell('row1', 'col1')
        result.current.selectCell('row2', 'col2')
      })

      expect(result.current.isSelected('row1', 'col1')).toBe(false)
      expect(result.current.isSelected('row2', 'col2')).toBe(true)
      expect(result.current.getSelectionCount()).toBe(1)
    })

    it('toggles cell selection', () => {
      const { result } = renderHook(() => useCellSelection())

      act(() => {
        result.current.toggleCell('row1', 'col1')
      })

      expect(result.current.isSelected('row1', 'col1')).toBe(true)

      act(() => {
        result.current.toggleCell('row1', 'col1')
      })

      expect(result.current.isSelected('row1', 'col1')).toBe(false)
    })
  })

  describe('Range Selection', () => {
    it('selects a range of cells', () => {
      const { result } = renderHook(() => useCellSelection())

      act(() => {
        result.current.selectRange('row1', 'col1', 'row2', 'col2', mockRows, mockColumns)
      })

      expect(result.current.isSelected('row1', 'col1')).toBe(true)
      expect(result.current.isSelected('row1', 'col2')).toBe(true)
      expect(result.current.isSelected('row2', 'col1')).toBe(true)
      expect(result.current.isSelected('row2', 'col2')).toBe(true)
      expect(result.current.getSelectionCount()).toBe(4)
    })

    it('handles reverse range selection', () => {
      const { result } = renderHook(() => useCellSelection())

      act(() => {
        result.current.selectRange('row2', 'col2', 'row1', 'col1', mockRows, mockColumns)
      })

      expect(result.current.isSelected('row1', 'col1')).toBe(true)
      expect(result.current.isSelected('row1', 'col2')).toBe(true)
      expect(result.current.isSelected('row2', 'col1')).toBe(true)
      expect(result.current.isSelected('row2', 'col2')).toBe(true)
      expect(result.current.getSelectionCount()).toBe(4)
    })

    it('handles invalid range gracefully', () => {
      const { result } = renderHook(() => useCellSelection())

      act(() => {
        result.current.selectRange('invalid', 'col1', 'row1', 'col1', mockRows, mockColumns)
      })

      expect(result.current.getSelectionCount()).toBe(0)
    })
  })

  describe('Selection Management', () => {
    it('clears all selections', () => {
      const { result } = renderHook(() => useCellSelection())

      act(() => {
        result.current.selectCell('row1', 'col1')
        result.current.toggleCell('row2', 'col2')
      })

      expect(result.current.getSelectionCount()).toBe(2)

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.getSelectionCount()).toBe(0)
      expect(result.current.isSelected('row1', 'col1')).toBe(false)
      expect(result.current.isSelected('row2', 'col2')).toBe(false)
    })

    it('gets all selected cells', () => {
      const { result } = renderHook(() => useCellSelection())

      act(() => {
        result.current.selectCell('row1', 'col1')
        result.current.toggleCell('row2', 'col2')
      })

      const selectedCells = result.current.getSelectedCells()
      expect(selectedCells).toHaveLength(2)
      expect(selectedCells).toContainEqual({ rowId: 'row1', field: 'col1' })
      expect(selectedCells).toContainEqual({ rowId: 'row2', field: 'col2' })
    })

    it('returns correct selection count', () => {
      const { result } = renderHook(() => useCellSelection())

      expect(result.current.getSelectionCount()).toBe(0)

      act(() => {
        result.current.selectCell('row1', 'col1')
      })

      expect(result.current.getSelectionCount()).toBe(1)

      act(() => {
        result.current.toggleCell('row2', 'col2')
      })

      expect(result.current.getSelectionCount()).toBe(2)
    })
  })

  describe('Selection State', () => {
    it('correctly identifies selected cells', () => {
      const { result } = renderHook(() => useCellSelection())

      expect(result.current.isSelected('row1', 'col1')).toBe(false)

      act(() => {
        result.current.selectCell('row1', 'col1')
      })

      expect(result.current.isSelected('row1', 'col1')).toBe(true)
      expect(result.current.isSelected('row2', 'col2')).toBe(false)
    })

    it('maintains selection state across multiple operations', () => {
      const { result } = renderHook(() => useCellSelection())

      act(() => {
        result.current.selectCell('row1', 'col1')
        result.current.toggleCell('row2', 'col2')
        result.current.toggleCell('row3', 'col3')
        result.current.toggleCell('row2', 'col2') // Deselect
      })

      expect(result.current.isSelected('row1', 'col1')).toBe(true)
      expect(result.current.isSelected('row2', 'col2')).toBe(false)
      expect(result.current.isSelected('row3', 'col3')).toBe(true)
      expect(result.current.getSelectionCount()).toBe(2)
    })
  })
})