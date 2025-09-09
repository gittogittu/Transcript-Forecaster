'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LineChart, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Activity, 
  AlertTriangle,
  Target,
  Calendar,
  Users,
  Database,
  Plus,
  Search
} from 'lucide-react'
import { DashboardWidget, WidgetConfig } from '../dashboard/types'

interface WidgetTemplate {
  id: string
  type: 'chart' | 'metric' | 'table' | 'insight'
  title: string
  description: string
  icon: React.ReactNode
  defaultConfig: WidgetConfig
  category: 'analytics' | 'predictions' | 'monitoring' | 'insights'
  tags: string[]
}

interface WidgetLibraryProps {
  onAddWidget: (template: WidgetTemplate) => void
  onClose: () => void
  isOpen: boolean
}

const widgetTemplates: WidgetTemplate[] = [
  {
    id: 'pattern-similarity',
    type: 'chart',
    title: 'Pattern Similarity',
    description: 'Overlay similar historical patterns to compare trajectories',
    icon: <Search className="w-5 h-5" />,
    defaultConfig: {
      chartType: 'line',
      dataSource: 'pattern-similarity',
      visualization: {
        animations: true
      }
    },
    category: 'analytics',
    tags: ['similarity', 'patterns', 'embeddings']
  },
  {
    id: 'multi-dimensional-forecast',
    type: 'chart',
    title: 'Multi-dimensional Forecast',
    description: 'Drill down through hierarchy and compare aggregated forecasts',
    icon: <Database className="w-5 h-5" />,
    defaultConfig: {
      chartType: 'area',
      dataSource: 'multi-dimensional-forecast',
      visualization: {
        animations: true
      }
    },
    category: 'predictions',
    tags: ['hierarchy', 'segments', 'drilldown']
  },
  {
    id: 'prediction-chart',
    type: 'chart',
    title: 'Prediction Chart',
    description: 'Compare actual vs predicted values with confidence bands',
    icon: <TrendingUp className="w-5 h-5" />,
    defaultConfig: {
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
    category: 'predictions',
    tags: ['forecast', 'comparison', 'confidence']
  },
  {
    id: 'real-time-monitor',
    type: 'chart',
    title: 'Real-time Monitor',
    description: 'Live data streaming with automatic updates',
    icon: <Activity className="w-5 h-5" />,
    defaultConfig: {
      chartType: 'line',
      dataSource: 'real-time',
      visualization: {
        animations: true
      }
    },
    category: 'monitoring',
    tags: ['real-time', 'streaming', 'live']
  },
  {
    id: 'anomaly-detector',
    type: 'chart',
    title: 'Anomaly Detection',
    description: 'Identify and visualize anomalies in your data',
    icon: <AlertTriangle className="w-5 h-5" />,
    defaultConfig: {
      chartType: 'scatter',
      dataSource: 'anomalies',
      visualization: {
        showAnomalies: true,
        animations: true
      }
    },
    category: 'monitoring',
    tags: ['anomalies', 'detection', 'alerts']
  },
  {
    id: 'kpi-metric',
    type: 'metric',
    title: 'KPI Metric',
    description: 'Display key performance indicators',
    icon: <Target className="w-5 h-5" />,
    defaultConfig: {
      dataSource: 'metrics',
      aggregation: {
        metrics: [{ field: 'value', function: 'avg', label: 'Average' }]
      }
    },
    category: 'analytics',
    tags: ['kpi', 'metrics', 'performance']
  },
  {
    id: 'trend-analysis',
    type: 'chart',
    title: 'Trend Analysis',
    description: 'Analyze trends over different time periods',
    icon: <LineChart className="w-5 h-5" />,
    defaultConfig: {
      chartType: 'area',
      dataSource: 'trends',
      aggregation: {
        timeGrain: 'day',
        metrics: [{ field: 'count', function: 'sum', label: 'Total' }]
      }
    },
    category: 'analytics',
    tags: ['trends', 'time-series', 'analysis']
  },
  {
    id: 'volume-distribution',
    type: 'chart',
    title: 'Volume Distribution',
    description: 'Show distribution of transcript volumes',
    icon: <BarChart3 className="w-5 h-5" />,
    defaultConfig: {
      chartType: 'bar',
      dataSource: 'volumes',
      aggregation: {
        groupBy: ['client'],
        metrics: [{ field: 'volume', function: 'sum', label: 'Volume' }]
      }
    },
    category: 'analytics',
    tags: ['distribution', 'volume', 'clients']
  },
  {
    id: 'client-breakdown',
    type: 'chart',
    title: 'Client Breakdown',
    description: 'Pie chart showing client distribution',
    icon: <PieChart className="w-5 h-5" />,
    defaultConfig: {
      chartType: 'line', // Will be rendered as pie chart
      dataSource: 'clients',
      aggregation: {
        groupBy: ['client'],
        metrics: [{ field: 'count', function: 'count', label: 'Count' }]
      }
    },
    category: 'analytics',
    tags: ['clients', 'distribution', 'breakdown']
  },
  {
    id: 'forecast-accuracy',
    type: 'metric',
    title: 'Forecast Accuracy',
    description: 'Track prediction accuracy metrics',
    icon: <Target className="w-5 h-5" />,
    defaultConfig: {
      dataSource: 'accuracy',
      aggregation: {
        metrics: [
          { field: 'mae', function: 'avg', label: 'MAE' },
          { field: 'rmse', function: 'avg', label: 'RMSE' },
          { field: 'mape', function: 'avg', label: 'MAPE' }
        ]
      }
    },
    category: 'predictions',
    tags: ['accuracy', 'forecast', 'metrics']
  },
  {
    id: 'seasonal-patterns',
    type: 'chart',
    title: 'Seasonal Patterns',
    description: 'Visualize seasonal trends and patterns',
    icon: <Calendar className="w-5 h-5" />,
    defaultConfig: {
      chartType: 'heatmap',
      dataSource: 'seasonal',
      aggregation: {
        groupBy: ['month', 'day_of_week'],
        metrics: [{ field: 'volume', function: 'avg', label: 'Avg Volume' }]
      }
    },
    category: 'analytics',
    tags: ['seasonal', 'patterns', 'calendar']
  },
  {
    id: 'client-insights',
    type: 'insight',
    title: 'Client Insights',
    description: 'AI-generated insights about client behavior',
    icon: <Users className="w-5 h-5" />,
    defaultConfig: {
      dataSource: 'insights'
    },
    category: 'insights',
    tags: ['insights', 'ai', 'clients']
  }
]

export function WidgetLibrary({ onAddWidget, onClose, isOpen }: WidgetLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  const categories = [
    { id: 'all', label: 'All Widgets' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'predictions', label: 'Predictions' },
    { id: 'monitoring', label: 'Monitoring' },
    { id: 'insights', label: 'Insights' }
  ]

  const filteredTemplates = widgetTemplates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const handleAddWidget = (template: WidgetTemplate) => {
    onAddWidget(template)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Widget Library</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search widgets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Categories */}
              <div className="flex gap-2 flex-wrap">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Widget Grid */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleAddWidget(template)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        template.category === 'analytics' ? 'bg-blue-100 text-blue-600' :
                        template.category === 'predictions' ? 'bg-green-100 text-green-600' :
                        template.category === 'monitoring' ? 'bg-orange-100 text-orange-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {template.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {template.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {template.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        template.category === 'analytics' ? 'bg-blue-50 text-blue-600' :
                        template.category === 'predictions' ? 'bg-green-50 text-green-600' :
                        template.category === 'monitoring' ? 'bg-orange-50 text-orange-600' :
                        'bg-purple-50 text-purple-600'
                      }`}>
                        {template.category}
                      </span>
                      
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Add Widget
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search or category filter
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}