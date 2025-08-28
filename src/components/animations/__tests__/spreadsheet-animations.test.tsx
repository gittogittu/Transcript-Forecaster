import { render, screen, fireEvent } from '@testing-library/react'
import { 
  AnimatedCell, 
  AnimatedRow, 
  AnimatedTableHeader,
  SpreadsheetLoadingOverlay,
  CellErrorTooltip,
  SaveIndicator
} from '../spreadsheet-animations'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    td: ({ children, className, onClick, onDoubleClick, ...props }: any) => (
      <td className={className} onClick={onClick} onDoubleClick={onDoubleClick} {...props}>
        {children}
      </td>
    ),
    tr: ({ children, className, ...props }: any) => (
      <tr className={className} {...props}>{children}</tr>
    ),
    th: ({ children, className, onClick, ...props }: any) => (
      <th className={className} onClick={onClick} {...props}>{children}</th>
    ),
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}))

describe('AnimatedCell', () => {
  it('renders children correctly', () => {
    render(
      <table>
        <tbody>
          <tr>
            <AnimatedCell>
              <span>Cell Content</span>
            </AnimatedCell>
          </tr>
        </tbody>
      </table>
    )

    expect(screen.getByText('Cell Content')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(
      <table>
        <tbody>
          <tr>
            <AnimatedCell onClick={handleClick}>
              <span>Clickable Cell</span>
            </AnimatedCell>
          </tr>
        </tbody>
      </table>
    )

    fireEvent.click(screen.getByText('Clickable Cell'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('handles double click events', () => {
    const handleDoubleClick = jest.fn()
    render(
      <table>
        <tbody>
          <tr>
            <AnimatedCell onDoubleClick={handleDoubleClick}>
              <span>Double Clickable Cell</span>
            </AnimatedCell>
          </tr>
        </tbody>
      </table>
    )

    fireEvent.doubleClick(screen.getByText('Double Clickable Cell'))
    expect(handleDoubleClick).toHaveBeenCalledTimes(1)
  })

  it('applies selected styling when isSelected is true', () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <AnimatedCell isSelected={true}>
              <span>Selected Cell</span>
            </AnimatedCell>
          </tr>
        </tbody>
      </table>
    )

    const cell = container.querySelector('td')
    expect(cell).toHaveClass('ring-2', 'ring-primary', 'ring-inset')
  })

  it('applies error styling when hasError is true', () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <AnimatedCell hasError={true}>
              <span>Error Cell</span>
            </AnimatedCell>
          </tr>
        </tbody>
      </table>
    )

    const cell = container.querySelector('td')
    expect(cell).toHaveClass('bg-red-50')
  })

  it('applies dirty styling when isDirty is true', () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <AnimatedCell isDirty={true}>
              <span>Dirty Cell</span>
            </AnimatedCell>
          </tr>
        </tbody>
      </table>
    )

    const cell = container.querySelector('td')
    expect(cell).toHaveClass('bg-yellow-50')
  })
})

describe('AnimatedRow', () => {
  it('renders children correctly', () => {
    render(
      <table>
        <tbody>
          <AnimatedRow index={0}>
            <td>Row Content</td>
          </AnimatedRow>
        </tbody>
      </table>
    )

    expect(screen.getByText('Row Content')).toBeInTheDocument()
  })

  it('applies alternating row styling based on index', () => {
    const { container: container1 } = render(
      <table>
        <tbody>
          <AnimatedRow index={0}>
            <td>Even Row</td>
          </AnimatedRow>
        </tbody>
      </table>
    )

    const { container: container2 } = render(
      <table>
        <tbody>
          <AnimatedRow index={1}>
            <td>Odd Row</td>
          </AnimatedRow>
        </tbody>
      </table>
    )

    const evenRow = container1.querySelector('tr')
    const oddRow = container2.querySelector('tr')

    expect(evenRow).toHaveClass('bg-background')
    expect(oddRow).toHaveClass('bg-muted/20')
  })

  it('applies new row styling when isNew is true', () => {
    const { container } = render(
      <table>
        <tbody>
          <AnimatedRow index={0} isNew={true}>
            <td>New Row</td>
          </AnimatedRow>
        </tbody>
      </table>
    )

    const row = container.querySelector('tr')
    expect(row).toHaveClass('bg-blue-50')
  })
})

describe('AnimatedTableHeader', () => {
  it('renders children correctly', () => {
    render(
      <table>
        <thead>
          <tr>
            <AnimatedTableHeader>
              Header Content
            </AnimatedTableHeader>
          </tr>
        </thead>
      </table>
    )

    expect(screen.getByText('Header Content')).toBeInTheDocument()
  })

  it('handles sort click when sortable is true', () => {
    const handleSort = jest.fn()
    render(
      <table>
        <thead>
          <tr>
            <AnimatedTableHeader sortable={true} onSort={handleSort}>
              Sortable Header
            </AnimatedTableHeader>
          </tr>
        </thead>
      </table>
    )

    fireEvent.click(screen.getByText('Sortable Header'))
    expect(handleSort).toHaveBeenCalledTimes(1)
  })

  it('applies cursor pointer when sortable', () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <AnimatedTableHeader sortable={true}>
              Sortable Header
            </AnimatedTableHeader>
          </tr>
        </thead>
      </table>
    )

    const header = container.querySelector('th')
    expect(header).toHaveClass('cursor-pointer')
  })

  it('does not handle clicks when sortable is false', () => {
    const handleSort = jest.fn()
    render(
      <table>
        <thead>
          <tr>
            <AnimatedTableHeader sortable={false} onSort={handleSort}>
              Non-sortable Header
            </AnimatedTableHeader>
          </tr>
        </thead>
      </table>
    )

    fireEvent.click(screen.getByText('Non-sortable Header'))
    expect(handleSort).not.toHaveBeenCalled()
  })
})

describe('SpreadsheetLoadingOverlay', () => {
  it('renders when isVisible is true', () => {
    render(<SpreadsheetLoadingOverlay isVisible={true} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('does not render when isVisible is false', () => {
    render(<SpreadsheetLoadingOverlay isVisible={false} />)
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('displays custom message when provided', () => {
    render(<SpreadsheetLoadingOverlay isVisible={true} message="Saving data..." />)
    expect(screen.getByText('Saving data...')).toBeInTheDocument()
  })
})

describe('CellErrorTooltip', () => {
  it('renders when isVisible is true', () => {
    render(<CellErrorTooltip isVisible={true} message="Error message" />)
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('does not render when isVisible is false', () => {
    render(<CellErrorTooltip isVisible={false} message="Error message" />)
    expect(screen.queryByText('Error message')).not.toBeInTheDocument()
  })

  it('applies correct positioning classes', () => {
    const { container } = render(
      <CellErrorTooltip isVisible={true} message="Error" position="top" />
    )
    
    const tooltip = container.querySelector('div')
    expect(tooltip).toHaveClass('bottom-full', 'left-1/2', 'transform', '-translate-x-1/2', 'mb-2')
  })
})

describe('SaveIndicator', () => {
  it('does not render when status is idle', () => {
    render(<SaveIndicator status="idle" />)
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    expect(screen.queryByText('Error')).not.toBeInTheDocument()
  })

  it('renders saving state correctly', () => {
    render(<SaveIndicator status="saving" />)
    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })

  it('renders saved state correctly', () => {
    render(<SaveIndicator status="saved" />)
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('renders error state correctly', () => {
    render(<SaveIndicator status="error" />)
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('applies correct color classes for each status', () => {
    const { container: savingContainer } = render(<SaveIndicator status="saving" />)
    const { container: savedContainer } = render(<SaveIndicator status="saved" />)
    const { container: errorContainer } = render(<SaveIndicator status="error" />)

    expect(savingContainer.querySelector('div')).toHaveClass('text-blue-500')
    expect(savedContainer.querySelector('div')).toHaveClass('text-green-500')
    expect(errorContainer.querySelector('div')).toHaveClass('text-red-500')
  })
})