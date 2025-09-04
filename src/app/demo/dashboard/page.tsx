import { Metadata } from 'next'
import { InteractiveDashboard } from '@/components/analytics/dashboard/InteractiveDashboard'
import { DashboardLayout } from '@/components/analytics/dashboard/types'

export const metadata: Metadata = {
  title: 'Dashboard Demo',
  description: 'Interactive analytics dashboard demonstration'
}

// Demo dashboard layout with various widget types
const demoLayout: DashboardLayout = {
  id: 'demo-dashboard',
  name: 'Demo Analytics Dashboard',
  widgets: [
    {
      id: 'prediction-chart',
      type: 'chart',
      title: 'Prediction vs Actual Comparison',
      position: { x: 20, y: 20 },
      size: { width: 700, height: 400 },
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
      id: 'real-time-stream',
      type: 'chart',
      title: 'Real-time Data Stream',
      position: { x: 740, y: 20 },
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
      title: 'Model Accuracy',
      position: { x: 20, y: 440 },
      size: { width: 200, height: 180 },
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
      id: 'volume-metric',
      type: 'metric',
      title: 'Total Volume',
      position: { x: 240, y: 440 },
      size: { width: 200, height: 180 },
      config: {
        dataSource: 'metrics',
        aggregation: {
          metrics: [
            { field: 'volume', function: 'sum', label: 'Total Volume' }
          ]
        }
      },
      refreshInterval: 30000
    },
    {
      id: 'anomaly-insights',
      type: 'insight',
      title: 'AI Insights & Anomalies',
      position: { x: 460, y: 440 },
      size: { width: 400, height: 180 },
      config: {
        dataSource: 'anomalies'
      },
      refreshInterval: 15000
    },
    {
      id: 'trend-analysis',
      type: 'chart',
      title: 'Trend Analysis',
      position: { x: 740, y: 340 },
      size: { width: 500, height: 280 },
      config: {
        chartType: 'area',
        dataSource: 'trends',
        aggregation: {
          timeGrain: 'day',
          metrics: [{ field: 'count', function: 'sum', label: 'Daily Count' }]
        },
        visualization: {
          animations: true
        }
      },
      refreshInterval: 60000
    }
  ],
  filters: [
    {
      id: 'date-range',
      field: 'date',
      label: 'Date Range',
      type: 'date',
      value: { 
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
        end: new Date() 
      }
    },
    {
      id: 'client-filter',
      field: 'client_id',
      label: 'Client',
      type: 'select',
      options: [
        { value: 'all', label: 'All Clients' },
        { value: 'client-1', label: 'Acme Corp' },
        { value: 'client-2', label: 'TechStart Inc' },
        { value: 'client-3', label: 'Global Solutions' },
        { value: 'client-4', label: 'Innovation Labs' }
      ],
      value: 'all'
    },
    {
      id: 'model-filter',
      field: 'model_type',
      label: 'Model Type',
      type: 'select',
      options: [
        { value: 'all', label: 'All Models' },
        { value: 'arima', label: 'ARIMA' },
        { value: 'prophet', label: 'Prophet' },
        { value: 'lstm', label: 'LSTM' },
        { value: 'ensemble', label: 'Ensemble' }
      ],
      value: 'all'
    }
  ],
  refreshInterval: 30000,
  isDefault: false
}

export default function DashboardDemoPage() {
  const handleLayoutChange = (layout: DashboardLayout) => {
    console.log('Layout changed:', layout)
    // In a real app, this would save to API or localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('demo-dashboard-layout', JSON.stringify(layout))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Interactive Analytics Dashboard Demo
              </h1>
              <p className="text-gray-600 mt-1">
                Explore real-time charts, drag-and-drop widgets, and predictive analytics
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Live Demo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Interactive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span>Real-time</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard */}
      <div className="h-[calc(100vh-80px)]">
        <InteractiveDashboard
          initialLayout={demoLayout}
          onLayoutChange={handleLayoutChange}
          className="h-full"
        />
      </div>

      {/* Demo Instructions */}
      <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
        <h3 className="font-semibold text-gray-900 mb-2">Demo Instructions</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Click "Edit" to enable drag & drop</li>
          <li>• Use "Add Widget" to add new components</li>
          <li>• Toggle "Real-time" for live data updates</li>
          <li>• Click charts to drill down into data</li>
          <li>• Use filters to customize views</li>
        </ul>
      </div>
    </div>
  )
}