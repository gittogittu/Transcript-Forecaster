# Spreadsheet Grid Component

A Google Sheets-like spreadsheet interface for managing transcript data with advanced editing capabilities, keyboard navigation, and auto-save functionality.

## Features

### ✅ Core Functionality
- **Interactive Grid**: Click-to-select, double-click-to-edit cells
- **Auto-save**: Debounced automatic saving with visual feedback
- **Keyboard Navigation**: Full keyboard support with arrow keys, Tab, Enter, Escape
- **Row Operations**: Add and delete rows with validation
- **Column Sorting**: Click headers to sort data ascending/descending
- **Cell Validation**: Real-time validation with error display

### ✅ Cell Editors
- **Text Editor**: Single-line and multi-line text input
- **Number Editor**: Numeric input with arrow key increment/decrement
- **Date Editor**: Date picker with calendar popup
- **Select Editor**: Dropdown selection for predefined options
- **Inline Actions**: Save/cancel buttons for row operations

### ✅ User Experience
- **Visual Feedback**: Dirty state indicators, error highlighting, loading states
- **Optimistic Updates**: Immediate UI updates with rollback on failure
- **Status Bar**: Row count, unsaved changes, error count, keyboard shortcuts
- **Responsive Design**: Works on desktop and tablet devices
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

### ✅ Data Management
- **Real-time Sync**: Automatic synchronization with database
- **Conflict Resolution**: Handles concurrent edits gracefully
- **Error Recovery**: Retry mechanisms and user-friendly error messages
- **Performance**: Efficient rendering for large datasets

## Components

### SpreadsheetGrid
Main spreadsheet component with full functionality.

```tsx
import { SpreadsheetGrid } from '@/components/data/spreadsheet-grid'

<SpreadsheetGrid
  data={transcripts}
  clients={clients}
  onCellEdit={handleCellEdit}
  onRowAdd={handleRowAdd}
  onRowDelete={handleRowDelete}
  readOnly={false}
  loading={false}
  error={null}
/>
```

### Cell Editors
Individual cell editor components for different data types.

```tsx
import { 
  TextCellEditor,
  NumberCellEditor,
  DateCellEditor,
  SelectCellEditor,
  CellEditorFactory
} from '@/components/data/cell-editors'

// Use factory for dynamic editor selection
<CellEditorFactory
  type="number"
  value={42}
  onChange={handleChange}
  onComplete={handleComplete}
  min={0}
  max={1000}
/>
```

## Hooks

### useSpreadsheetNavigation
Manages keyboard navigation and cell selection.

```tsx
import { useSpreadsheetNavigation } from '@/lib/hooks/use-spreadsheet-navigation'

const navigation = useSpreadsheetNavigation({
  rows: ['row1', 'row2', 'row3'],
  columns: ['col1', 'col2', 'col3'],
  onCellSelect: handleCellSelect,
  onCellEdit: handleCellEdit,
  onCellComplete: handleCellComplete
})
```

### useDebounce
Debounces function calls for auto-save functionality.

```tsx
import { useDebounce } from '@/lib/hooks/use-debounce'

const debouncedSave = useDebounce(saveFunction, 1000)
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Arrow Keys` | Navigate between cells |
| `Tab` / `Shift+Tab` | Navigate to next/previous cell |
| `Enter` | Start editing current cell |
| `F2` | Start editing current cell |
| `Escape` | Cancel editing |
| `Ctrl+S` | Force save current cell |
| `Home` | Go to first column of current row |
| `End` | Go to last column of current row |
| `Ctrl+Home` | Go to first cell (A1) |
| `Ctrl+End` | Go to last cell |
| `Page Up/Down` | Navigate 10 rows up/down |

## Cell States

### Visual Indicators
- **Selected**: Blue border around cell
- **Editing**: Input field with focus
- **Dirty**: Yellow background (unsaved changes)
- **Error**: Red background with error tooltip
- **Loading**: Spinner overlay during save

### Status Badges
- **Unsaved Changes**: Yellow badge showing count
- **Errors**: Red badge showing error count
- **Row Count**: Total number of rows displayed

## Data Flow

```
User Input → Cell Editor → Validation → Debounced Save → API Call → UI Update
     ↓
Optimistic Update → Success/Error → Confirm/Rollback
```

## Error Handling

### Validation Errors
- Real-time validation during input
- Error tooltips with specific messages
- Prevents saving invalid data

### Network Errors
- Automatic retry mechanisms
- User-friendly error messages
- Rollback to previous state on failure

### Conflict Resolution
- Optimistic updates with rollback
- Last-write-wins strategy
- Visual feedback for conflicts

## Testing

### Unit Tests
- Individual component testing
- Hook behavior testing
- Edge case validation

### Integration Tests
- Complete user workflows
- Keyboard navigation
- Error scenarios
- Performance testing

### Accessibility Tests
- Screen reader compatibility
- Keyboard-only navigation
- ARIA label validation

## Performance Considerations

### Optimizations
- Virtual scrolling for large datasets
- Debounced auto-save (1 second delay)
- Optimistic updates for responsiveness
- Efficient re-rendering with React.memo

### Memory Management
- Cleanup of event listeners
- Proper component unmounting
- Garbage collection of large datasets

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- React 19.1.0
- TanStack Query (data fetching)
- Zod (validation)
- Radix UI (base components)
- Tailwind CSS (styling)
- Framer Motion (animations)

## Future Enhancements

### Planned Features
- [ ] Multi-cell selection and editing
- [ ] Copy/paste functionality
- [ ] Undo/redo operations
- [ ] Column resizing
- [ ] Row reordering (drag & drop)
- [ ] Export to CSV/Excel
- [ ] Advanced filtering
- [ ] Cell formatting options
- [ ] Formula support
- [ ] Real-time collaboration

### Performance Improvements
- [ ] Virtual scrolling implementation
- [ ] Web Workers for heavy calculations
- [ ] Service Worker for offline support
- [ ] Progressive loading for large datasets

## Contributing

When contributing to the spreadsheet component:

1. **Follow the existing patterns** for cell editors and navigation
2. **Add comprehensive tests** for new functionality
3. **Maintain accessibility** standards
4. **Document keyboard shortcuts** for new features
5. **Consider performance** impact of changes
6. **Test with large datasets** to ensure scalability

## Examples

### Basic Usage
```tsx
function TranscriptSpreadsheet() {
  const { data: transcripts } = useTranscripts()
  const { data: clients } = useClients()
  
  const handleCellEdit = async (rowId: string, field: string, value: any) => {
    await updateTranscript(rowId, { [field]: value })
  }
  
  const handleRowAdd = async (data: Partial<TranscriptData>) => {
    await createTranscript(data)
  }
  
  const handleRowDelete = async (rowId: string) => {
    await deleteTranscript(rowId)
  }
  
  return (
    <SpreadsheetGrid
      data={transcripts}
      clients={clients}
      onCellEdit={handleCellEdit}
      onRowAdd={handleRowAdd}
      onRowDelete={handleRowDelete}
    />
  )
}
```

### Read-only Mode
```tsx
<SpreadsheetGrid
  data={transcripts}
  clients={clients}
  readOnly={true}
/>
```

### With Loading State
```tsx
<SpreadsheetGrid
  data={transcripts}
  clients={clients}
  loading={isLoading}
  error={error?.message}
  onCellEdit={handleCellEdit}
/>
```