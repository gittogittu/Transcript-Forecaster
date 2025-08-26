/**
 * Production Monitoring Dashboard
 * Admin interface for monitoring application health
 */

import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Activity, AlertTriangle, BarChart3, Users, Clock, TrendingUp } from 'lucide-react'

// This would be replaced with actual monitoring data fetching
async function getMonitoringData() {
  // Placeholder data - in production this would fetch from monitoring API
  return {
    systemHealth: 'healthy',
    errorCount: 12,
    performanceScore: 94,
    activeUsers: 156,
    responseTime: 245,
    uptime: 99.9
  }
}

function MonitoringDashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Production Monitoring</h1>
        <p className="text-gray-600 mt-2">
          Real-time application health and performance metrics
        </p>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Count (24h)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">-23% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94</div>
            <p className="text-xs text-muted-foreground">Excellent performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">+12% from last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245ms</div>
            <p className="text-xs text-muted-foreground">Within target range</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="text-xs text-muted-foreground">30-day average</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
            <CardDescription>
              Latest error events and their frequency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Validation Error</p>
                  <p className="text-xs text-muted-foreground">Invalid email format</p>
                </div>
                <span className="text-sm text-red-600">8 occurrences</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">API Error</p>
                  <p className="text-xs text-muted-foreground">Google Sheets timeout</p>
                </div>
                <span className="text-sm text-yellow-600">3 occurrences</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Authentication Error</p>
                  <p className="text-xs text-muted-foreground">Token expired</p>
                </div>
                <span className="text-sm text-orange-600">1 occurrence</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Core Web Vitals and performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Largest Contentful Paint</span>
                <span className="text-sm text-green-600">1.2s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">First Input Delay</span>
                <span className="text-sm text-green-600">45ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cumulative Layout Shift</span>
                <span className="text-sm text-green-600">0.05</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Load Time</span>
                <span className="text-sm text-yellow-600">2.8s</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Health Status */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>API Endpoints Health</CardTitle>
          <CardDescription>
            Status of critical API endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">/api/transcripts</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Healthy</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">/api/analytics</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Healthy</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">/api/sheets</span>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Slow</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">/api/auth</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Healthy</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">/api/monitoring</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Healthy</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminMonitoringPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <Suspense fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      }>
        <MonitoringDashboard />
      </Suspense>
    </ProtectedRoute>
  )
}