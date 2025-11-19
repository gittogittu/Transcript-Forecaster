export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">Universal Analytics Platform</h1>
          <p className="text-sm text-gray-600 mt-1">AI-powered forecasting for any data type</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Simple Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dashboard Card */}
          <a
            href="/dashboard"
            className="block p-8 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all"
          >
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard</h2>
            <p className="text-gray-600">View analytics and predictions</p>
          </a>

          {/* Data Import Card */}
          <a
            href="/data/import"
            className="block p-8 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all"
          >
            <div className="text-4xl mb-4">📤</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Data</h2>
            <p className="text-gray-600">Upload your data (CSV, JSON, Excel)</p>
          </a>

          {/* Clients Card */}
          <a
            href="/clients"
            className="block p-8 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all"
          >
            <div className="text-4xl mb-4">🏢</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Data Sources</h2>
            <p className="text-gray-600">Manage your data sources</p>
          </a>
        </div>

        {/* Use Cases */}
        <div className="mt-16">
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-8">Works For Any Data Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4">
              <div className="text-3xl mb-2">📞</div>
              <p className="text-sm text-gray-700 font-medium">Call Volumes</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">🛒</div>
              <p className="text-sm text-gray-700 font-medium">Sales Orders</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">🎫</div>
              <p className="text-sm text-gray-700 font-medium">Support Tickets</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-sm text-gray-700 font-medium">Transcripts</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-sm text-gray-700 font-medium">Shipments</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-sm text-gray-700 font-medium">Customer Visits</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">💰</div>
              <p className="text-sm text-gray-700 font-medium">Revenue</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm text-gray-700 font-medium">Any Metric</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}