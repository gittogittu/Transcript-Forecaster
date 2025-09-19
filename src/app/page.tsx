export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-20 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Predictive Analytics
              <span className="text-blue-600"> Platform</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
              Enterprise-grade analytics with AI-powered insights, real-time forecasting, 
              and advanced data visualization capabilities.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <a
                href="/analytics/dashboard"
                className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
              >
                View Dashboard
              </a>
              <a
                href="/demo/dashboard"
                className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
              >
                Live Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Powerful Features</h2>
            <p className="mt-4 text-lg text-gray-600">Everything you need for advanced analytics</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Analytics</h3>
              <p className="text-gray-600">Interactive dashboards with live data updates and customizable visualizations.</p>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">🧠</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Predictions</h3>
              <p className="text-gray-600">Advanced machine learning models for accurate forecasting and trend analysis.</p>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">🔍</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Vector Search</h3>
              <p className="text-gray-600">Semantic similarity search and pattern matching using vector embeddings.</p>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">⚡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">High Performance</h3>
              <p className="text-gray-600">Optimized for speed with intelligent caching and sub-500ms response times.</p>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl">
              <div className="w-12 h-12 bg-cyan-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">🛡️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enterprise Ready</h3>
              <p className="text-gray-600">Robust error handling, monitoring, and automated recovery systems.</p>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl">
              <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">📈</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Anomaly Detection</h3>
              <p className="text-gray-600">Intelligent anomaly detection with real-time monitoring and alerts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Quick Actions</h2>
            <p className="mt-4 text-lg text-gray-600">Get started with key features</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a 
              href="/data/import"
              className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300"
            >
              <div className="text-3xl mb-3">📤</div>
              <span className="font-medium text-gray-900">Import Data</span>
            </a>
            
            <a 
              href="/analytics/comprehensive-dashboard"
              className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300"
            >
              <div className="text-3xl mb-3">📊</div>
              <span className="font-medium text-gray-900">Analytics</span>
            </a>
            
            <a 
              href="/api/system/health"
              className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300"
            >
              <div className="text-3xl mb-3">🏥</div>
              <span className="font-medium text-gray-900">Health Check</span>
            </a>
            
            <a 
              href="/clients"
              className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300"
            >
              <div className="text-3xl mb-3">👥</div>
              <span className="font-medium text-gray-900">Clients</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}