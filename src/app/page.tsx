import Link from 'next/link'
import { BarChart3, TrendingUp, Activity, Target } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Advanced Predictive Analytics Platform
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Interactive visual analytics dashboard with real-time data updates, 
            drag-and-drop widgets, and intelligent forecasting capabilities.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Interactive Charts</h3>
            <p className="text-gray-600 text-sm">
              Real-time charts with drill-down capabilities and dynamic filtering
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Predictive Analytics</h3>
            <p className="text-gray-600 text-sm">
              AI-powered forecasting with confidence bands and accuracy metrics
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Real-time Updates</h3>
            <p className="text-gray-600 text-sm">
              Live data streaming with automatic refresh and smooth animations
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Customizable Widgets</h3>
            <p className="text-gray-600 text-sm">
              Drag-and-drop dashboard with resizable widgets and layout saving
            </p>
          </div>
        </div>

        {/* Dashboard Links */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Link 
            href="/demo/dashboard"
            className="group bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Demo Dashboard</h2>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Explore the interactive dashboard with sample data, real-time updates, 
              and all the advanced features in action.
            </p>
            <div className="flex items-center text-blue-600 font-medium">
              <span>Try Interactive Demo</span>
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link 
            href="/analytics/dashboard"
            className="group bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Access the full analytics dashboard with your data, 
              advanced predictions, and comprehensive monitoring tools.
            </p>
            <div className="flex items-center text-green-600 font-medium">
              <span>Open Analytics</span>
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Implementation Status */}
        <div className="mt-16 bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Implementation Status</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">✅ Completed Features</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Interactive visual analytics dashboard</li>
                <li>• Real-time chart components with auto-refresh</li>
                <li>• Drag-and-drop widget system</li>
                <li>• Prediction vs actual comparison charts</li>
                <li>• Confidence bands and anomaly indicators</li>
                <li>• Customizable dashboard layouts</li>
                <li>• Widget library with templates</li>
                <li>• Drill-down capabilities</li>
                <li>• Dynamic filtering and controls</li>
                <li>• Smooth animations and transitions</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">🔧 Technical Implementation</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• React 19 with Next.js 15 App Router</li>
                <li>• TypeScript for type safety</li>
                <li>• Recharts for data visualization</li>
                <li>• Framer Motion for animations</li>
                <li>• Tailwind CSS for styling</li>
                <li>• Real-time data service</li>
                <li>• API endpoints for dashboard data</li>
                <li>• Comprehensive test coverage</li>
                <li>• Responsive design</li>
                <li>• Performance optimized</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}