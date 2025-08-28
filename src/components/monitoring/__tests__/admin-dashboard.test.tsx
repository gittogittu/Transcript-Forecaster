import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminDashboard } from '../admin-dashboard'
import { useMonitoring } from '@/lib/hooks/use-monitoring'

// Mock the monitoring hook
jest.mock('@/lib/hooks/use-monitoring')
const mockUseMonitoring = useMonitoring as jest.MockedFunction<typeof useMonitoring>

// Mock the chart components to avoid canvas issues in tests
jest.mock('../performance-charts', () => ({
  PerformanceCharts: () => <div data-testid="performance-charts">Performance Charts</div>
}))

jest.mock('../system-health-indicators', () => ({
  SystemHealthIndicators: () => <div data-testid="system-health">System Health</div>
}))

jest.mock('../alert-management', () => ({
  AlertManagement: () => <div data-testid="alert-management">Alert Management</div>
}))

jest.mock('../user-activity-log', () => ({
  UserActivityLog: () => <div data-testid="user-activity">User Activity</div>
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('AdminDashboard', () => {
  const mockMonitoringData = {
    currentMetrics: {
      id: 'test-metrics',
      timestamp: new Date(),
      queriesPerSecond: 2.5,
      modelRuntime: 1500,
      dataSyncLatency: 100,
      errorCount: 3,
      activeUsers: 15,
      memoryUsage: 65.5,
      cpuUsage: 42.3,
    },
    metricsSummary: {
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      averageResponseTime: 250,
      totalRequests: 1250,
      errorRate: 2.4,
      peakActiveUsers: 25,
      averageMemoryUsage: 68.2,
      averageCpuUsage: 45.1,
      topErrors: [
        { message: 'Database connection timeout', count: 5 },
        { message: 'Invalid input data', count: 3 },
      ],
    },
    systemHealth: [
      {
        component: 'api',
        status: 'healthy' as const,
        message: 'API response time: 150ms',
        lastChecked: new Date(),
        responseTime: 150,
      },
      {
        component: 'database',
        status: 'warning' as const,
        message: 'High connection count',
        lastChecked: new Date(),
        responseTime: 300,
      },
    ],
    activeAlerts: [
      {
        id: 'alert-1',
        configId: 'high-memory',
        message: 'Memory usage exceeded 80%',
        severity: 'high' as const,
        timestamp: new Date(),
        resolved: false,
      },
    ],
    recentActivity: [],
    isLoading: false,
    error: null,
    refreshMetrics: jest.fn(),
  }

  beforeEach(() => {
    mockUseMonitoring.mockReturnValue(mockMonitoringData)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders admin dashboard with key metrics', () => {
    renderWithQueryClient(<AdminDashboard />)

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Monitor system performance and health indicators')).toBeInTheDocument()

    // Check key metrics cards
    expect(screen.getByText('2.50')).toBeInTheDocument() // Queries per second
    expect(screen.getByText('15')).toBeInTheDocument() // Active users
    expect(screen.getByText('42.3%')).toBeInTheDocument() // CPU usage
    expect(screen.getAllByText('2.40%')[0]).toBeInTheDocument() // Error rate
  })

  it('displays critical alerts warning', () => {
    const criticalAlertData = {
      ...mockMonitoringData,
      activeAlerts: [
        {
          id: 'critical-alert',
          configId: 'critical-config',
          message: 'System is down',
          severity: 'critical' as const,
          timestamp: new Date(),
          resolved: false,
        },
      ],
    }

    mockUseMonitoring.mockReturnValue(criticalAlertData)

    renderWithQueryClient(<AdminDashboard />)

    expect(screen.getByText('Critical Alerts')).toBeInTheDocument()
    expect(screen.getByText(/critical alert.*require immediate attention/i)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseMonitoring.mockReturnValue({
      ...mockMonitoringData,
      isLoading: true,
    })

    renderWithQueryClient(<AdminDashboard />)

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument() // Loading spinner
  })

  it('shows error state', () => {
    mockUseMonitoring.mockReturnValue({
      ...mockMonitoringData,
      isLoading: false,
      error: new Error('Failed to load monitoring data'),
    })

    renderWithQueryClient(<AdminDashboard />)

    expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument()
    expect(screen.getByText(/Failed to load monitoring data/)).toBeInTheDocument()
  })

  it('handles auto-refresh toggle', async () => {
    renderWithQueryClient(<AdminDashboard />)

    const autoRefreshButton = screen.getByText('Auto-refresh On')
    fireEvent.click(autoRefreshButton)

    await waitFor(() => {
      expect(screen.getByText('Auto-refresh Off')).toBeInTheDocument()
    })
  })

  it('handles manual refresh', () => {
    renderWithQueryClient(<AdminDashboard />)

    const refreshButton = screen.getByText('Refresh Now')
    fireEvent.click(refreshButton)

    expect(mockMonitoringData.refreshMetrics).toHaveBeenCalled()
  })

  it('navigates between tabs', () => {
    renderWithQueryClient(<AdminDashboard />)

    // Check default tab
    expect(screen.getByText('Performance Summary')).toBeInTheDocument()

    // Click performance tab
    fireEvent.click(screen.getByText('Performance'))
    expect(screen.getByTestId('performance-charts')).toBeInTheDocument()

    // Click health tab
    fireEvent.click(screen.getByText('System Health'))
    expect(screen.getByTestId('system-health')).toBeInTheDocument()

    // Click alerts tab
    fireEvent.click(screen.getByText('Alerts'))
    expect(screen.getByTestId('alert-management')).toBeInTheDocument()

    // Click activity tab
    fireEvent.click(screen.getByText('User Activity'))
    expect(screen.getByTestId('user-activity')).toBeInTheDocument()
  })

  it('displays performance summary correctly', () => {
    renderWithQueryClient(<AdminDashboard />)

    // Check performance summary card
    expect(screen.getByText('Performance Summary')).toBeInTheDocument()
    expect(screen.getByText('1250')).toBeInTheDocument() // Total requests
    expect(screen.getByText('250ms')).toBeInTheDocument() // Average response time
    expect(screen.getByText('25')).toBeInTheDocument() // Peak active users
  })

  it('displays system status correctly', () => {
    renderWithQueryClient(<AdminDashboard />)

    // Check system status card
    expect(screen.getByText('System Status')).toBeInTheDocument()
    expect(screen.getByText(/api/i)).toBeInTheDocument()
    expect(screen.getByText(/database/i)).toBeInTheDocument()
    
    // Check status badges
    const healthyBadges = screen.getAllByText('healthy')
    const warningBadges = screen.getAllByText('warning')
    expect(healthyBadges.length).toBeGreaterThan(0)
    expect(warningBadges.length).toBeGreaterThan(0)
  })

  it('handles empty data gracefully', () => {
    mockUseMonitoring.mockReturnValue({
      ...mockMonitoringData,
      currentMetrics: null,
      systemHealth: null,
      activeAlerts: null,
      metricsSummary: null,
    })

    renderWithQueryClient(<AdminDashboard />)

    // Should still render without crashing
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    expect(screen.getByText('0.00')).toBeInTheDocument() // Default values
  })

  it('formats numbers correctly', () => {
    renderWithQueryClient(<AdminDashboard />)

    // Check that numbers are formatted with appropriate decimal places
    expect(screen.getByText('2.50')).toBeInTheDocument() // QPS with 2 decimals
    expect(screen.getByText('42.3%')).toBeInTheDocument() // CPU with 1 decimal
    expect(screen.getAllByText('2.40%')[0]).toBeInTheDocument() // Error rate with 2 decimals
  })

  it('shows appropriate alert severity styling', () => {
    const highAlertData = {
      ...mockMonitoringData,
      activeAlerts: [
        {
          id: 'high-alert',
          configId: 'high-config',
          message: 'High memory usage',
          severity: 'high' as const,
          timestamp: new Date(),
          resolved: false,
        },
      ],
    }

    mockUseMonitoring.mockReturnValue(highAlertData)

    renderWithQueryClient(<AdminDashboard />)

    expect(screen.getByText('Active Alerts')).toBeInTheDocument()
    expect(screen.getByText(/high priority alert.*detected/i)).toBeInTheDocument()
  })
})