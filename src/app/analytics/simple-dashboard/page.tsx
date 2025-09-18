'use client'

import React, { useState, useEffect } from 'react'

interface DashboardStats {
  total_clients: number
  total_transcripts: number
  avg_aht: number
  active_clients_this_month: number
}

interface ForecastData {
  month: string
  predicted_transcripts: number
  confidence_interval: [number, number]
  growth_rate: number
}

interface AnomalyData {
  client_name: string
  anomaly_score: number
  expected_range: [number, number]
  actual_value: number
  severity: 'low' | 'medium' | 'high'
}

export default function SimpleDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard/stats')
      if (!response.ok) throw new Error('Failed to load stats')
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError('Failed to load dashboard statistics')
    }
  }

  const generateForecasts = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/forecasting/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          months_ahead: 6,
          include_confidence: true,
          model_type: 'ensemble'
        })
      })
      
      if (!response.ok) throw new Error('Failed to generate forecasts')
      const data = await response.json()
      setForecasts(data.forecasts)
      setActiveTab('forecasts')
    } catch (err) {
      setError('Failed to generate forecasts. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const detectAnomalies = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/anomaly-detection/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detection_method: 'isolation_forest',
          sensitivity: 0.1,
          include_explanations: true
        })
      })
      
      if (!response.ok) throw new Error('Failed to detect anomalies')
      const data = await response.json()
      setAnomalies(data.anomalies)
      setActiveTab('anomalies')
    } catch (err) {
      setError('Failed to detect anomalies. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const exportToSheets = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/analytics/export/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          include_forecasts: forecasts.length > 0,
          include_anomalies: anomalies.length > 0,
          format: 'comprehensive'
        })
      })
      
      if (!response.ok) throw new Error('Failed to export to Google Sheets')
      const data = await response.json()
      
      if (data.sheet_url) {
        window.open(data.sheet_url, '_blank')
      }
      
      alert('Export completed! Check the console for details.')
    } catch (err) {
      setError('Failed to export to Google Sheets. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num))
  }

  const cardStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    marginBottom: '16px'
  }

  const buttonStyle = {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    minHeight: '80px',
    display: 'block',
    textAlign: 'center' as const,
    width: '100%'
  }

  const outlineButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'white',
    color: '#3b82f6',
    border: '1px solid #3b82f6'
  }

  const tabStyle = {
    padding: '12px 24px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    fontSize: '14px',
    fontWeight: '500'
  }

  const activeTabStyle = {
    ...tabStyle,
    borderBottomColor: '#3b82f6',
    color: '#3b82f6'
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }}>
          Interactive Analytics Dashboard
        </h1>
        <p style={{ color: '#6b7280', fontSize: '18px' }}>
          Real-time insights and predictive analytics for transcript data
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          color: '#dc2626'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '32px'
      }}>
        <button 
          onClick={generateForecasts} 
          disabled={loading}
          style={buttonStyle}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          <div>📈</div>
          <div>Generate Forecasts</div>
        </button>
        
        <button 
          onClick={detectAnomalies} 
          disabled={loading}
          style={outlineButtonStyle}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6'
            e.currentTarget.style.color = 'white'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#3b82f6'
          }}
        >
          <div>🚨</div>
          <div>Detect Anomalies</div>
        </button>
        
        <button 
          onClick={exportToSheets} 
          disabled={loading}
          style={outlineButtonStyle}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6'
            e.currentTarget.style.color = 'white'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#3b82f6'
          }}
        >
          <div>📊</div>
          <div>Export to Sheets</div>
        </button>
        
        <button 
          onClick={() => setActiveTab('monitoring')} 
          style={outlineButtonStyle}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6'
            e.currentTarget.style.color = 'white'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#3b82f6'
          }}
        >
          <div>📊</div>
          <div>Real-time Monitor</div>
        </button>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '24px', 
              height: '24px', 
              border: '2px solid #e5e7eb',
              borderTop: '2px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <div>
              <p style={{ fontWeight: '500' }}>Processing your request...</p>
              <div style={{
                width: '200px',
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                marginTop: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '33%',
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  borderRadius: '4px',
                  animation: 'pulse 2s infinite'
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '24px'
        }}>
          {['overview', 'forecasts', 'anomalies', 'monitoring'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={activeTab === tab ? activeTabStyle : tabStyle}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div>
            {stats && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Total Clients</span>
                    <span style={{ fontSize: '24px' }}>👥</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.total_clients}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Active across all environments</div>
                </div>
                
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Total Transcripts</span>
                    <span style={{ fontSize: '24px' }}>📄</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{formatNumber(stats.total_transcripts)}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Processed transcripts</div>
                </div>
                
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Average AHT</span>
                    <span style={{ fontSize: '24px' }}>⏱️</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.avg_aht.toFixed(1)}m</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Average handling time</div>
                </div>
                
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Active This Month</span>
                    <span style={{ fontSize: '24px' }}>🎯</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.active_clients_this_month}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Currently active</div>
                </div>
              </div>
            )}
            
            <div style={cardStyle}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>📈</span>
                  <div>
                    <p style={{ fontWeight: '500' }}>Predictive Forecasting</p>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                      Generate 6-month forecasts using ensemble ML models
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>🚨</span>
                  <div>
                    <p style={{ fontWeight: '500' }}>Anomaly Detection</p>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                      Identify unusual patterns and outliers in your data
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>📊</span>
                  <div>
                    <p style={{ fontWeight: '500' }}>Export to Google Sheets</p>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                      Share insights with stakeholders in familiar format
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'forecasts' && (
          <div>
            {forecasts.length > 0 ? (
              <div style={cardStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📈 6-Month Forecast
                </h3>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                  Predicted transcript volumes with confidence intervals
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {forecasts.map((forecast, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '20px' }}>📅</span>
                        <div>
                          <p style={{ fontWeight: '500' }}>{forecast.month}</p>
                          <p style={{ fontSize: '14px', color: '#6b7280' }}>
                            Range: {formatNumber(forecast.confidence_interval[0])} - {formatNumber(forecast.confidence_interval[1])}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatNumber(forecast.predicted_transcripts)}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '16px' }}>
                            {forecast.growth_rate > 0 ? '📈' : '📉'}
                          </span>
                          <span style={{ 
                            fontSize: '14px', 
                            color: forecast.growth_rate > 0 ? '#10b981' : '#ef4444' 
                          }}>
                            {forecast.growth_rate > 0 ? '+' : ''}{forecast.growth_rate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ ...cardStyle, textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
                <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No Forecasts Generated</p>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                  Click "Generate Forecasts" to create predictive analytics
                </p>
                <button onClick={generateForecasts} disabled={loading} style={buttonStyle}>
                  Generate Forecasts Now
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div>
            {anomalies.length > 0 ? (
              <div style={cardStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🚨 Detected Anomalies
                </h3>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                  Unusual patterns and outliers in transcript data
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {anomalies.map((anomaly, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: anomaly.severity === 'high' ? '#ef4444' : 
                                         anomaly.severity === 'medium' ? '#f59e0b' : '#3b82f6'
                        }} />
                        <div>
                          <p style={{ fontWeight: '500' }}>{anomaly.client_name}</p>
                          <p style={{ fontSize: '14px', color: '#6b7280' }}>
                            Expected: {formatNumber(anomaly.expected_range[0])} - {formatNumber(anomaly.expected_range[1])}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatNumber(anomaly.actual_value)}</p>
                        <span style={{
                          fontSize: '12px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: anomaly.severity === 'high' ? '#fef2f2' : '#fef3c7',
                          color: anomaly.severity === 'high' ? '#dc2626' : '#d97706'
                        }}>
                          {anomaly.severity} severity
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ ...cardStyle, textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚨</div>
                <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No Anomalies Detected</p>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                  Click "Detect Anomalies" to analyze your data for unusual patterns
                </p>
                <button onClick={detectAnomalies} disabled={loading} style={buttonStyle}>
                  Detect Anomalies Now
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ Real-time Monitoring
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              Live performance metrics and system health
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px' 
            }}>
              <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>System Health</span>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%' }} />
                </div>
                <p style={{ fontSize: '24px', fontWeight: 'bold' }}>98.5%</p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>Uptime</p>
              </div>
              
              <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>Processing Speed</span>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%' }} />
                </div>
                <p style={{ fontSize: '24px', fontWeight: 'bold' }}>1.2s</p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>Avg Response</p>
              </div>
              
              <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>Data Quality</span>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%' }} />
                </div>
                <p style={{ fontSize: '24px', fontWeight: 'bold' }}>99.1%</p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>Accuracy</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}