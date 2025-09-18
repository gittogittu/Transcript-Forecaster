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

export default function SimpleDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [forecast, setForecast] = useState<ForecastData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load stats
      const statsResponse = await fetch('/api/analytics/dashboard/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.data)
      }

      // Load forecast
      const forecastResponse = await fetch('/api/predictions/forecast')
      if (forecastResponse.ok) {
        const forecastData = await forecastResponse.json()
        setForecast(forecastData.predictions || [])
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num))
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ 
          display: 'inline-block',
          width: '32px',
          height: '32px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading analytics dashboard...</p>
      </div>
    )
  }

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '2rem 1rem',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#f9fafb',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          color: '#111827',
          marginBottom: '1rem'
        }}>
          🚀 Analytics Dashboard
        </h1>
        <p style={{ 
          fontSize: '1.125rem', 
          color: '#6b7280',
          marginBottom: '2rem'
        }}>
          Real-time insights and predictions for your transcript data
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '0.75rem', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                Total Clients
              </h3>
              <span style={{ fontSize: '2rem' }}>👥</span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
              {stats.total_clients}
            </div>
            <p style={{ fontSize: '0.875rem', color: '#16a34a', marginTop: '0.5rem' }}>
              ↗️ Active accounts
            </p>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '0.75rem', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                Total Transcripts
              </h3>
              <span style={{ fontSize: '2rem' }}>📄</span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#16a34a' }}>
              {formatNumber(stats.total_transcripts)}
            </div>
            <p style={{ fontSize: '0.875rem', color: '#16a34a', marginTop: '0.5rem' }}>
              📈 Processed documents
            </p>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '0.75rem', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                Average AHT
              </h3>
              <span style={{ fontSize: '2rem' }}>⏱️</span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
              {stats.avg_aht.toFixed(1)}m
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              ⚡ Handling time
            </p>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '0.75rem', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                Active This Month
              </h3>
              <span style={{ fontSize: '2rem' }}>🔥</span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444' }}>
              {stats.active_clients_this_month}
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              📅 Current period
            </p>
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      {forecast.length > 0 && (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '0.75rem', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          padding: '2rem',
          border: '1px solid #e5e7eb',
          marginBottom: '2rem'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: '#111827',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📊 Forecast Predictions
          </h2>
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#6b7280',
            marginBottom: '2rem'
          }}>
            AI-powered predictions for the next 6 months
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {forecast.slice(0, 6).map((item, index) => {
              const maxValue = Math.max(...forecast.map(f => f.predicted_transcripts))
              const barWidth = (item.predicted_transcripts / maxValue) * 100
              const isPositiveGrowth = item.growth_rate > 0
              
              return (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{item.month}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {formatNumber(item.predicted_transcripts)} predicted
                      </span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: isPositiveGrowth ? '#16a34a' : '#ef4444',
                        fontWeight: '500'
                      }}>
                        {isPositiveGrowth ? '↗️' : '↘️'} {Math.abs(item.growth_rate).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ 
                      width: '100%', 
                      backgroundColor: '#f3f4f6', 
                      borderRadius: '9999px', 
                      height: '1.5rem'
                    }}>
                      <div 
                        style={{ 
                          backgroundColor: isPositiveGrowth ? '#10b981' : '#f59e0b', 
                          height: '1.5rem', 
                          borderRadius: '9999px',
                          width: `${barWidth}%`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'width 0.3s ease'
                        }}
                      >
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: 'white', 
                          fontWeight: '600'
                        }}>
                          {formatNumber(item.predicted_transcripts)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '0.75rem', 
                    color: '#9ca3af'
                  }}>
                    <span>Range: {formatNumber(item.confidence_interval[0])} - {formatNumber(item.confidence_interval[1])}</span>
                    <span>Confidence: 95%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '0.75rem', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '2rem',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: 'bold', 
          color: '#111827',
          marginBottom: '1.5rem'
        }}>
          🚀 Quick Actions
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem'
        }}>
          <button 
            onClick={() => window.location.href = '/analytics/comprehensive-dashboard'}
            style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '1.5rem', 
              border: '2px solid #3b82f6', 
              borderRadius: '0.5rem', 
              backgroundColor: '#eff6ff',
              cursor: 'pointer',
              textDecoration: 'none',
              color: '#111827',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#dbeafe'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</span>
            <span style={{ fontWeight: '600', color: '#1d4ed8' }}>Comprehensive Analytics</span>
          </button>
          
          <button 
            onClick={() => window.location.href = '/data/import'}
            style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '1.5rem', 
              border: '2px solid #16a34a', 
              borderRadius: '0.5rem', 
              backgroundColor: '#f0fdf4',
              cursor: 'pointer',
              textDecoration: 'none',
              color: '#111827',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#dcfce7'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#f0fdf4'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📤</span>
            <span style={{ fontWeight: '600', color: '#15803d' }}>Import Data</span>
          </button>
          
          <button 
            onClick={() => loadDashboardData()}
            style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '1.5rem', 
              border: '2px solid #f59e0b', 
              borderRadius: '0.5rem', 
              backgroundColor: '#fffbeb',
              cursor: 'pointer',
              textDecoration: 'none',
              color: '#111827',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#fef3c7'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#fffbeb'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔄</span>
            <span style={{ fontWeight: '600', color: '#d97706' }}>Refresh Data</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}