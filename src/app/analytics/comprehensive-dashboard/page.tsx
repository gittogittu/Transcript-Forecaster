'use client'

export default function ComprehensiveDashboard() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div>
        <h1 style={{ 
          fontSize: '2.5rem', 
          color: '#1f2937', 
          marginBottom: '1rem',
          fontWeight: 'bold'
        }}>
          🚧 Dashboard Temporarily Unavailable
        </h1>
        <p style={{ 
          fontSize: '1.25rem', 
          color: '#6b7280', 
          marginBottom: '2rem',
          maxWidth: '600px'
        }}>
          The comprehensive dashboard is being updated. Please use our fully functional prediction dashboard instead:
        </p>
        <a 
          href="/working-predictions" 
          style={{ 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            padding: '1rem 2rem', 
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontSize: '1.125rem',
            fontWeight: '600',
            display: 'inline-block',
            marginBottom: '1rem'
          }}
        >
          📊 View Working Predictions Dashboard
        </a>
        <div style={{ 
          fontSize: '0.875rem', 
          color: '#9ca3af',
          marginTop: '2rem'
        }}>
          All prediction numbers and forecasting features are available in the working dashboard.
        </div>
      </div>
    </div>
  )
}