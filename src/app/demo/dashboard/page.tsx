export const metadata = {
  title: 'Demo Dashboard',
  description: 'Interactive demo of the predictive analytics dashboard with sample data'
}

export default function DemoDashboardPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#dbeafe', borderBottom: '1px solid #93c5fd', padding: '1rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
                🎮 Interactive Demo Dashboard
              </h1>
              <p style={{ color: '#1d4ed8', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                Explore the predictive analytics platform with sample data and interactive features
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#2563eb', backgroundColor: '#dbeafe', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid #93c5fd' }}>
                Demo Mode
              </span>
              <a href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>← Back to Home</a>
              <a href="/analytics/dashboard" style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', textDecoration: 'none', fontSize: '0.875rem' }}>
                Live Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Demo Features */}
        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '0.5rem', padding: '1rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#92400e', margin: '0 0 0.5rem 0' }}>🎯 Demo Features</h3>
          <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
            This demo showcases real-time charts, interactive widgets, drag-and-drop functionality, and sample prediction data.
          </p>
        </div>

        {/* Sample Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #e0e7ff' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.5rem 0' }}>Sample Predictions</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4f46e5', margin: '0 0 0.5rem 0' }}>2,847</div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Generated in demo mode</p>
          </div>
          
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #dcfce7' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.5rem 0' }}>Demo Accuracy</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a', margin: '0 0 0.5rem 0' }}>94.2%</div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Sample model performance</p>
          </div>
          
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #fed7d7' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.5rem 0' }}>Anomalies Detected</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626', margin: '0 0 0.5rem 0' }}>3</div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>In sample dataset</p>
          </div>
          
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #fef3c7' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.5rem 0' }}>Demo Response</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706', margin: '0 0 0.5rem 0' }}>156ms</div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Simulated API speed</p>
          </div>
        </div>

        {/* Interactive Demo Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>📊 Sample Forecast Chart</h3>
            <div style={{ height: '250px', backgroundColor: '#f8fafc', borderRadius: '0.375rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', border: '2px dashed #cbd5e1' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📈</div>
              <div style={{ textAlign: 'center' }}>
                Interactive Forecast Chart
                <br />
                <small>(Drag, zoom, hover for details)</small>
                <br />
                <small style={{ color: '#3b82f6' }}>Sample data: 7-day prediction</small>
              </div>
            </div>
          </div>
          
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>🎯 Anomaly Detection Demo</h3>
            <div style={{ height: '250px', backgroundColor: '#fef2f2', borderRadius: '0.375rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#991b1b', border: '2px dashed #fca5a5' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚨</div>
              <div style={{ textAlign: 'center' }}>
                Real-time Anomaly Detection
                <br />
                <small>(Click points for explanations)</small>
                <br />
                <small style={{ color: '#dc2626' }}>3 anomalies in sample data</small>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Controls */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>🎮 Demo Controls</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <button style={{ padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              🔄 Refresh Sample Data
            </button>
            <button style={{ padding: '0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              📊 Generate New Forecast
            </button>
            <button style={{ padding: '0.75rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              🎯 Simulate Anomaly
            </button>
            <button style={{ padding: '0.75rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              🔍 Pattern Search Demo
            </button>
          </div>
        </div>

        {/* Feature Showcase */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>✨ Available Demo Features</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}>
              <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>🖱️ Drag & Drop Widgets</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Rearrange dashboard components</div>
            </div>
            
            <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}>
              <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>📈 Interactive Charts</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Zoom, pan, and hover for details</div>
            </div>
            
            <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}>
              <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>🔄 Real-time Updates</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Simulated live data streaming</div>
            </div>
            
            <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}>
              <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>🎯 Prediction Controls</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Adjust parameters and see results</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}