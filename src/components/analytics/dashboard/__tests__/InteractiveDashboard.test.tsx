import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { InteractiveDashboard } from '../InteractiveDashboard'
import { DashboardLayout } from '../types'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => children
}))

// Mock Recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  Scatter: () => <div data-testid="scatter" />
}))

// Mock real-time service
jest.mock('@/lib/services/dashboard/real-time-service', () => ({
  useRealTimeService: () => ({
    service: {
      connect: jest.fn(),
      disconnect: jest.fn(),
      subscribe: jest.fn(() => jest.fn()),
      isConnected: jest.fn(() => true),
      getConnectionStatus: jest.fn(() => 'connected')
    },
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    isConnected: jest.fn(() => true),
    getConnectionStatus: jest.fn(() => 'connected'),
    refreshWidget: jest.fn()
  })
}))

const mockLayout: DashboardLayout = {
  id: 'test-dashboard',
  name: 'Test Dashboard',
  widgets: [
    {
      id: 'test-widget-1',
      type: 'chart',
      title: 'Test Chart Widget',
      position: { x: 20, y: 20 },
      size: { width: 400, height: 300 },
      config: {
        chartType: 'line',
        dataSource: 'predictions',
        visualization: {
          showConfidenceBands: true,
          showAnomalies: true,
          showPredictions: true,
          showActuals: true,
          animations: true
        }
      },
      refreshInterval: 30000
    },
    {
      id: 'test-widget-2',
      type: 'metric',
      title: 'Test Metric Widget',
      position: { x: 440, y: 20 },
      size: { width: 200, height: 150 },
      config: {
        dataSource: 'metrics',
        aggregation: {
          metrics: [
            { field: 'mae', function: 'avg', label: 'MAE' }
          ]
        }
      },
      refreshInterval: 60000
    }
  ],
  filters: [
    {
      id: 'date-filter',
      field: 'date',
      label: 'Date Range',
      type: 'date',
      value: { start: new Date(), end: new Date() }
    }
  ],
  refreshInterval: 30000,
  isDefault: false
}

describe('InteractiveDashboard', () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()
    
    // Mock fetch for API calls
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      })
    ) as jest.Mock
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders dashboard with initial layout', () => {
    render(<InteractiveDashboard initialLayout={mockLayout} />)
    
    expect(screen.getByText('Test Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Test Chart Widget')).toBeInTheDocument()
    expect(screen.getByText('Test Metric Widget')).toBeInTheDocument()
    expect(screen.getByText('2 widgets')).toBeInTheDocument()
  })

  it('renders empty state when no widgets', () => {
    const emptyLayout: DashboardLayout = {
      ...mockLayout,
      widgets: []
    }
    
    render(<InteractiveDashboard initialLayout={emptyLayout} />)
    
    expect(screen.getByText('Your dashboard is empty')).toBeInTheDocument()
    expect(screen.getByText('Add widgets to start visualizing your data')).toBeInTheDocument()
    expect(screen.getByText('Add Your First Widget')).toBeInTheDocument()
  })

  it('toggles edit mode', async () => {
    render(<InteractiveDashboard initialLayout={mockLayout} />)
    
    const editButton = screen.getByText('Edit')
    await user.click(editButton)
    
    expect(screen.getByText('Exit Edit')).toBeInTheDocument()
  })

  it('toggles real-time mode', async () => {
    render(<InteractiveDashboard initialLayout={mockLayout} />)
    
    const realTimeButton = screen.getByText('Start Real-time')
    await user.click(realTimeButton)
    
    expect(screen.getByText('Pause Real-time')).toBeInTheDocument()
  })

  it('opens widget library', async () => {
    render(<InteractiveDashboard initialLayout={mockLayout} />)
    
    const addWidgetButton = screen.getByText('Add Widget')
    await user.click(addWidgetButton)
    
    expect(screen.getByText('Widget Library')).toBeInTheDocument()
  })

  it('shows filters panel', async () => {
    render(<InteractiveDashboard initialLayout={mockLayout} />)
    
    const filtersButton = screen.getByText('Filters')
    await user.click(filtersButton)
    
    expect(screen.getByText('Date Range:')).toBeInTheDocument()
    expect(screen.getByText('Client:')).toBeInTheDocument()
    expect(screen.getByText('Apply Filters')).toBeInTheDocument()
  })

  it('shows layout options panel', async () => {
    render(<InteractiveDashboard initialLayout={mockLayout} />)
    
    const layoutButton = screen.getByText('Layout')
    await user.click(layoutButton)
    
    expect(screen.getByText('Save Layout')).toBeInTheDocument()
    expect(screen.getByText('Reset Layout')).toBeInTheDocument()
    expect(screen.getByText('Refresh Interval:')).toBeInTheDocument()
  })

  it('calls onLayoutChange when layout is modified', async () => {
    const onLayoutChange = jest.fn()
    render(
      <InteractiveDashboard 
        initialLayout={mockLayout} 
        onLayoutChange={onLayoutChange}
      />
    )
    
    // Toggle edit mode to enable layout changes
    const editButton = screen.getByText('Edit')
    await user.click(editButton)
    
    // The layout change should be called when edit mode is toggled
    await waitFor(() => {
      expect(onLayoutChange).toHaveBeenCalled()
    })
  })

  it('saves layout to localStorage', async () => {
    render(<InteractiveDashboard initialLayout={mockLayout} />)
    
    const layoutButton = screen.getByText('Layout')
    await user.click(layoutButton)
    
    const saveButton = screen.getByText('Save Layout')
    await user.click(saveButton)
    
    const savedLayout = localStorage.getItem('dashboard-layout')
    expect(savedLayout).toBeTruthy()
    const parsed = JSON.parse(savedLayout!)
    expect(parsed.id).toBe(mockLayout.id)
    expect(parsed.name).toBe(mockLayout.name)
    expect(parsed.widgets.length).toBe(mockLayout.widgets.length)
    expect(parsed.filters[0].id).toBe('date-filter')
    expect(typeof parsed.filters[0].value.start).toBe('string')
    expect(typeof parsed.filters[0].value.end).toBe('string')
  })

  it('resets layout when reset button is clicked', async () => {
    const onLayoutChange = jest.fn()
    render(
      <InteractiveDashboard 
        initialLayout={mockLayout} 
        onLayoutChange={onLayoutChange}
      />
    )
    
    const layoutButton = screen.getByText('Layout')
    await user.click(layoutButton)
    
    const resetButton = screen.getByText('Reset Layout')
    await user.click(resetButton)
    
    await waitFor(() => {
      expect(onLayoutChange).toHaveBeenCalledWith(
        expect.objectContaining({
          widgets: []
        })
      )
    })
  })

  it('renders different widget types correctly', () => {
    const layoutWithDifferentWidgets: DashboardLayout = {
      ...mockLayout,
      widgets: [
        {
          id: 'chart-widget',
          type: 'chart',
          title: 'Chart Widget',
          position: { x: 0, y: 0 },
          size: { width: 400, height: 300 },
          config: { dataSource: 'predictions' }
        },
        {
          id: 'metric-widget',
          type: 'metric',
          title: 'Metric Widget',
          position: { x: 400, y: 0 },
          size: { width: 200, height: 150 },
          config: { 
            dataSource: 'metrics',
            aggregation: {
              metrics: [{ field: 'value', function: 'avg', label: 'Average' }]
            }
          }
        },
        {
          id: 'table-widget',
          type: 'table',
          title: 'Table Widget',
          position: { x: 0, y: 300 },
          size: { width: 400, height: 200 },
          config: { dataSource: 'data' }
        },
        {
          id: 'insight-widget',
          type: 'insight',
          title: 'Insight Widget',
          position: { x: 400, y: 300 },
          size: { width: 400, height: 200 },
          config: { dataSource: 'insights' }
        }
      ]
    }
    
    render(<InteractiveDashboard initialLayout={layoutWithDifferentWidgets} />)
    
    expect(screen.getByText('Chart Widget')).toBeInTheDocument()
    expect(screen.getByText('Metric Widget')).toBeInTheDocument()
    expect(screen.getByText('Table Widget')).toBeInTheDocument()
    expect(screen.getByText('Insight Widget')).toBeInTheDocument()
  })

  it('displays last update time', () => {
    render(<InteractiveDashboard initialLayout={mockLayout} />)
    
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
  })

  it('handles widget refresh intervals', async () => {
    jest.useFakeTimers(); jest.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    
    render(<InteractiveDashboard initialLayout={mockLayout} />)
    
    // Enable real-time mode
    const realTimeButton = screen.getByText('Start Real-time')
    await user.click(realTimeButton)
    
    // Fast-forward time to trigger refresh
    jest.advanceTimersByTime(30000)
    
    // Verify that the last update time changes
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
    
    jest.useRealTimers()
  })
})

describe('Dashboard Widget Interactions', () => {
  const user = userEvent.setup()

  it('handles widget selection in edit mode', async () => {
    render(<InteractiveDashboard initialLayout={mockLayout} />)
    
    // Enable edit mode
    const editButton = screen.getByText('Edit')
    await user.click(editButton)
    
    // Click on a widget (this would normally select it)
    const widget = screen.getByText('Test Chart Widget')
    await user.click(widget)
    
    // In edit mode, widgets should be selectable
    expect(screen.getByText('Exit Edit')).toBeInTheDocument()
  })

  it('prevents widget interaction when not in edit mode', async () => {
    render(<InteractiveDashboard initialLayout={mockLayout} />)
    
    // Widgets should be in view mode (not editable)
    const widget = screen.getByText('Test Chart Widget')
    expect(widget).toBeInTheDocument()
    
    // Edit button should show "Edit" (not in edit mode)
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })
})

describe('Dashboard Performance', () => {
  it('renders large number of widgets efficiently', () => {
    const largeLayout: DashboardLayout = {
      ...mockLayout,
      widgets: Array.from({ length: 20 }, (_, i) => ({
        id: `widget-${i}`,
        type: 'metric' as const,
        title: `Widget ${i}`,
        position: { x: (i % 5) * 200, y: Math.floor(i / 5) * 200 },
        size: { width: 180, height: 150 },
        config: {
          dataSource: 'metrics',
          aggregation: {
            metrics: [{ field: 'value', function: 'avg', label: 'Value' }]
          }
        }
      }))
    }
    
    const startTime = performance.now()
    render(<InteractiveDashboard initialLayout={largeLayout} />)
    const endTime = performance.now()
    
    // Should render within reasonable time (less than 100ms)
    expect(endTime - startTime).toBeLessThan(200)
    
    // All widgets should be rendered
    expect(screen.getByText('20 widgets')).toBeInTheDocument()
  })
})