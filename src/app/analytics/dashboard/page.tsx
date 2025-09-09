import { Metadata } from 'next'
import { InteractiveDashboard } from '@/components/analytics/dashboard/InteractiveDashboard'
import { PerformanceMonitoringDashboard } from '@/components/analytics/PerformanceMonitoringDashboard'
import { DashboardLayout } from '@/components/analytics/dashboard/types'

export const metadata: Metadata = {
  title: 'Interactive Analytics Dashboard',
  description: 'Real-time predictive analytics dashboard with customizable widgets and drill-down capabilities'
}

// Default dashboard layout
const defaultLayout: DashboardLayout = {
  id: 'default-analytics',
  name: 'Analytics Dashboard',
  widgets: [
    {
      id: 'prediction-overview',
      type: 'chart',
      title: 'Prediction vs Actual',
      position: { x: 20, y: 20 },
      size: { width: 600, height: 400 },
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
      id: 'real-time-monitor',
      type: 'chart',
      title: 'Real-time Data Stream',
      position: { x: 640, y: 20 },
      size: { width: 500, height: 300 },
      config: {
        chartType: 'line',
        dataSource: 'real-time',
        visualization: {
          animations: true
        }
      },
      refreshInterval: 5000
    },
    {
      id: 'accuracy-metrics',
      type: 'metric',
      title: 'Forecast Accuracy',
      position: { x: 20, y: 440 },
      size: { width: 280, height: 200 },
      config: {
        dataSource: 'accuracy',
        aggregation: {
          metrics: [
            { field: 'mae', function: 'avg', label: 'MAE' },
            { field: 'rmse', function: 'avg', label: 'RMSE' }
          ]
        }
      },
      refreshInterval: 60000
    },
    {
      id: 'anomaly-alerts',
      type: 'insight',
      title: 'Anomaly Insights',
      position: { x: 320, y: 440 },
      size: { width: 400, height: 200 },
      config: {
        dataSource: 'anomalies'
      },
      refreshInterval: 15000
    }
  ],
  filters: [
    {
      id: 'date-range',
      field: 'date',
      label: 'Date Range',
      type: 'date',
      value: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }
    },
    {
      id: 'client-filter',
      field: 'client_id',
      label: 'Client',
      type: 'select',
      options: [
        { value: 'all', label: 'All Clients' },
        { value: 'client-1', label: 'Client A' },
        { value: 'client-2', label: 'Client B' },
        { value: 'client-3', label: 'Client C' }
      ],
      value: 'all'
    }
  ],
  refreshInterval: 30000,
  isDefault: true
}

export default function AnalyticsDashboardPage() {
  const handleLayoutChange = (layout: DashboardLayout) => {
    // Save layout changes to localStorage or API
    if (typeof window !== 'undefined') {
      localStorage.setItem('analytics-dashboard-layout', JSON.stringify(layout))
    }
  }

  return (
    <div className="h-screen bg-gray-50">
      <InteractiveDashboard
        initialLayout={defaultLayout}
        onLayoutChange={handleLayoutChange}
        className="h-full"
      />
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Model Performance Monitoring</h2>
        <PerformanceMonitoringDashboard modelId="intelligent_engine" refreshInterval={30000} />
      </div>
    </div>
  )
}