'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MainLayout } from '@/components/layout/main-layout'
import { PerformanceDashboard } from '@/components/monitoring/performance-dashboard'
import { Shield, Activity, Server, Database, Users, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function AdminPerformancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    // Check if user has admin role
    if (session.user.role !== 'admin') {
      router.push('/unauthorized')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">Loading...</div>
      </MainLayout>
    )
  }

  if (!session?.user || session.user.role !== 'admin') {
    return null
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Shield className="h-8 w-8" />
            <span>System Performance</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor system performance, resource usage, and application health
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Activity className="h-4 w-4" />
                <span>System Health</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Healthy</div>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Server className="h-4 w-4" />
                <span>Server Load</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23%</div>
              <p className="text-xs text-muted-foreground">CPU utilization</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Database className="h-4 w-4" />
                <span>Database</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156ms</div>
              <p className="text-xs text-muted-foreground">Avg query time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Users className="h-4 w-4" />
                <span>Active Users</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground">Currently online</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Dashboard */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Detailed performance monitoring and Core Web Vitals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceDashboard />
            </CardContent>
          </Card>
        </div>

        {/* System Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>System Alerts</span>
              </CardTitle>
              <CardDescription>
                View and manage system alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                View Alerts
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <span>Server Logs</span>
              </CardTitle>
              <CardDescription>
                Access server logs and error tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                View Logs
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Database Stats</span>
              </CardTitle>
              <CardDescription>
                Monitor database performance and queries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                View Stats
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Resource Monitor</span>
              </CardTitle>
              <CardDescription>
                Real-time resource usage monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Monitor Resources
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>User Analytics</span>
              </CardTitle>
              <CardDescription>
                Track user activity and session data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                View Analytics
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Monitor</span>
              </CardTitle>
              <CardDescription>
                Security events and access monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Security Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin">Admin Dashboard</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/users">User Management</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/performance">Public Performance</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/settings">System Settings</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}