'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface ClientDetails {
  id: string
  name: string
  client_code: string
  environment: 'prod' | 'uat'
  email?: string | null
  is_active: boolean
  overall_aht?: number
  review_aht?: number
  validation_aht?: number
  created_at?: string
  updated_at?: string
}

interface ClientAnalytics {
  total_transcripts: number
  monthly_average: number
  peak_monthly_count: number
  months_active: number
  growth_rate: number
  last_activity: string
  seasonal_patterns: {
    spring: number
    summer: number
    fall: number
    winter: number
  }
  weekly_patterns: number[]
  trend: 'increasing' | 'decreasing' | 'stable'
  forecast_accuracy: number
}

interface MonthlyData {
  month: string
  transcript_count: number
  predicted_count?: number
  growth_rate: number
}

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<ClientDetails | null>(null)
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'predictions' | 'settings'>('overview')

  useEffect(() => {
    const fetchClientDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch client details
        const clientRes = await fetch(`/api/clients/${clientId}`)
        if (!clientRes.ok) throw new Error('Failed to load client details')
        const clientData = await clientRes.json()
        setClient(clientData.client)

        // Fetch analytics (mock data for now)
        const mockAnalytics: ClientAnalytics = {
          total_transcripts: Math.floor(Math.random() * 50000) + 10000,
          monthly_average: Math.floor(Math.random() * 2000) + 500,
          peak_monthly_count: Math.floor(Math.random() * 5000) + 2000,
          months_active: Math.floor(Math.random() * 24) + 6,
          growth_rate: (Math.random() - 0.5) * 0.4,
          last_activity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          seasonal_patterns: {
            spring: Math.random() * 0.3 + 0.85,
            summer: Math.random() * 0.3 + 0.85,
            fall: Math.random() * 0.3 + 0.85,
            winter: Math.random() * 0.3 + 0.85,
          },
          weekly_patterns: Array.from({ length: 7 }, () => Math.random() * 0.4 + 0.8),
          trend: ['increasing', 'decreasing', 'stable'][Math.floor(Math.random() * 3)] as any,
          forecast_accuracy: Math.random() * 0.15 + 0.85
        }
        setAnalytics(mockAnalytics)

        // Generate mock monthly data
        const months = []
        for (let i = 11; i >= 0; i--) {
          const date = new Date()
          date.setMonth(date.getMonth() - i)
          const baseCount = mockAnalytics.monthly_average
          const variance = baseCount * 0.3
          const count = Math.floor(baseCount + (Math.random() - 0.5) * variance)
          
          months.push({
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            transcript_count: count,
            predicted_count: Math.floor(count * (0.95 + Math.random() * 0.1)),
            growth_rate: (Math.random() - 0.5) * 0.3
          })
        }
        setMonthlyData(months)

      } catch (e: any) {
        setError(e.message || 'Failed to load client details')
      } finally {
        setLoading(false)
      }
    }

    fetchClientDetails()
  }, [clientId])

  const handleUpdateClient = async (updates: Partial<ClientDetails>) => {
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!res.ok) throw new Error('Failed to update client')
      const data = await res.json()
      setClient(data.client)
    } catch (e: any) {
      setError(e.message || 'Failed to update client')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p style={{ color: '#6b7280' }}>Loading client details...</p>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>Error Loading Client</h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>{error}</p>
          <button
            onClick={() => router.push('/clients')}
            style={{ backgroundColor: '#3b82f6', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
          >
            ← Back to Clients
          </button>
        </div>
      </div>
    )
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return '#10b981'
      case 'decreasing': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '📈'
      case 'decreasing': return '📉'
      default: return '➡️'
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => router.push('/clients')}
                style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>{client.name}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <span style={{ fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.875rem' }}>
                    {client.client_code}
                  </span>
                  <span style={{ 
                    backgroundColor: client.environment === 'prod' ? '#dbeafe' : '#fef3c7', 
                    color: client.environment === 'prod' ? '#1e40af' : '#92400e',
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>
                    {client.environment === 'prod' ? '🏭 PRODUCTION' : '🧪 UAT'}
                  </span>
                  <span style={{ 
                    backgroundColor: client.is_active ? '#d1fae5' : '#fee2e2', 
                    color: client.is_active ? '#065f46' : '#dc2626',
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>
                    {client.is_active ? '✅ ACTIVE' : '❌ INACTIVE'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleUpdateClient({ is_active: !client.is_active })}
                style={{ 
                  backgroundColor: client.is_active ? '#ef4444' : '#10b981', 
                  color: 'white', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '0.5rem', 
                  border: 'none', 
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {client.is_active ? '🗑️ Deactivate' : '✅ Reactivate'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {[
              { id: 'overview', label: '📊 Overview', icon: '📊' },
              { id: 'analytics', label: '📈 Analytics', icon: '📈' },
              { id: 'predictions', label: '🔮 Predictions', icon: '🔮' },
              { id: 'settings', label: '⚙️ Settings', icon: '⚙️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '1rem 0',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                  color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {activeTab === 'overview' && analytics && (
          <div style={{ display: 'grid', gap: '2rem' }}>
            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, fontWeight: '500' }}>Total Transcripts</h3>
                  <span style={{ fontSize: '1.5rem' }}>📝</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
                  {analytics.total_transcripts.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {analytics.months_active} months active
                </div>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, fontWeight: '500' }}>Monthly Average</h3>
                  <span style={{ fontSize: '1.5rem' }}>📊</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
                  {analytics.monthly_average.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Peak: {analytics.peak_monthly_count.toLocaleString()}
                </div>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, fontWeight: '500' }}>Growth Rate</h3>
                  <span style={{ fontSize: '1.5rem' }}>{getTrendIcon(analytics.trend)}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: getTrendColor(analytics.trend) }}>
                  {analytics.growth_rate > 0 ? '+' : ''}{(analytics.growth_rate * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Trend: {analytics.trend}
                </div>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, fontWeight: '500' }}>Forecast Accuracy</h3>
                  <span style={{ fontSize: '1.5rem' }}>🎯</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
                  {(analytics.forecast_accuracy * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  ML prediction accuracy
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>📅 Recent Activity</h3>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Last activity: {new Date(analytics.last_activity).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              {client.email && (
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Contact: {client.email}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div style={{ display: 'grid', gap: '2rem' }}>
            {/* Monthly Trend Chart */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>📈 Monthly Transcript Volume</h3>
              <div style={{ display: 'flex', alignItems: 'end', gap: '0.5rem', height: '200px', padding: '1rem 0' }}>
                {monthlyData.map((month, index) => {
                  const maxValue = Math.max(...monthlyData.map(m => m.transcript_count))
                  const height = (month.transcript_count / maxValue) * 150
                  return (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', height: '20px' }}>
                        {month.transcript_count.toLocaleString()}
                      </div>
                      <div 
                        style={{ 
                          backgroundColor: '#3b82f6', 
                          width: '100%', 
                          maxWidth: '40px',
                          height: `${height}px`,
                          borderRadius: '2px 2px 0 0',
                          minHeight: '2px'
                        }}
                      />
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.5rem', transform: 'rotate(-45deg)', transformOrigin: 'center' }}>
                        {month.month}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Seasonal Patterns */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>🍂 Seasonal Patterns</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                {Object.entries(analytics.seasonal_patterns).map(([season, value]) => (
                  <div key={season} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                      {season === 'spring' ? '🌸' : season === 'summer' ? '☀️' : season === 'fall' ? '🍂' : '❄️'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize' }}>{season}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: value > 1 ? '#10b981' : value < 0.9 ? '#ef4444' : '#6b7280' }}>
                      {(value * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Patterns */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>📅 Weekly Patterns</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                  const value = analytics.weekly_patterns[index]
                  return (
                    <div key={day} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>{day}</div>
                      <div 
                        style={{ 
                          height: '60px', 
                          backgroundColor: value > 1 ? '#10b981' : value < 0.9 ? '#ef4444' : '#6b7280',
                          borderRadius: '0.25rem',
                          display: 'flex',
                          alignItems: 'end',
                          justifyContent: 'center',
                          padding: '0.25rem',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        {(value * 100).toFixed(0)}%
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔮</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>ML Predictions Dashboard</h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              Advanced ML predictions and forecasting capabilities will be displayed here.
              This will include next-day, weekly, and monthly transcript volume predictions.
            </p>
            <div style={{ backgroundColor: '#f3f4f6', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#374151', margin: 0 }}>
                🚧 Coming Soon: Real-time ML predictions, confidence intervals, and forecast accuracy metrics
              </p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '2rem' }}>⚙️ Client Settings</h3>
            
            <div style={{ display: 'grid', gap: '2rem' }}>
              {/* Basic Information */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>Basic Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem', fontWeight: '500' }}>Client Name</label>
                    <input
                      type="text"
                      defaultValue={client.name}
                      style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem', fontWeight: '500' }}>Email</label>
                    <input
                      type="email"
                      defaultValue={client.email || ''}
                      style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* AHT Settings */}
              {(client.overall_aht || client.review_aht || client.validation_aht) && (
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>Average Handling Time (AHT) Metrics</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem', fontWeight: '500' }}>Overall AHT</label>
                      <input
                        type="number"
                        defaultValue={client.overall_aht || ''}
                        placeholder="Minutes"
                        style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.875rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem', fontWeight: '500' }}>Review AHT</label>
                      <input
                        type="number"
                        defaultValue={client.review_aht || ''}
                        placeholder="Minutes"
                        style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.875rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem', fontWeight: '500' }}>Validation AHT</label>
                      <input
                        type="number"
                        defaultValue={client.validation_aht || ''}
                        placeholder="Minutes"
                        style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.875rem' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div>
                <button
                  style={{ backgroundColor: '#3b82f6', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}
                >
                  💾 Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}