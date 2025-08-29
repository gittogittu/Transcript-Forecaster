'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MainLayout } from '@/components/layout/main-layout'
import { MetricsCards } from '@/components/dashboard/metrics-cards'
import { 
  BarChart3, 
  Users, 
  FileText, 
  TrendingUp, 
  Database,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
  Calendar,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Upload,
  Download,
  Plus
} from 'lucide-react'
import Link from 'next/link'

interface DashboardData {
  totalTranscripts: number
  thisMonth: number
  avgHandlingTime: number
  activeClients: number
  lastSync: string
  syncStatus: 'success' | 'warning' | 'error'
  monthlyGrowth: number
  predictions: {
    nextMonth: number
    confidence: number
  }
  recentActivity: Array<{
    id: string
    type: 'import' | 'export' | 'sync' | 'prediction'
    description: string
    timestamp: string
    status: 'success' | 'warning' | 'error'
  }>
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = async () => {
    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockData: DashboardData = {
        totalTranscripts: 12847 + Math.floor(Math.random() * 100),
        thisMonth: 1234 + Math.floor(Math.random() * 50),
        avgHandlingTime: 8.5 + (Math.random() - 0.5) * 2,
        activeClients: 23 + Math.floor(Math.random() * 5),
        lastSync: '2 minutes ago',
        syncStatus: Math.random() > 0.8 ? 'warning' : 'success',
        monthlyGrowth: 12.5 + (Math.random() - 0.5) * 10,
        predictions: {
          nextMonth: 1456 + Math.floor(Math.random() * 100),
          confidence: 85 + Math.floor(Math.random() * 10)
        },
        recentActivity: [
          {
            id: '1',
            type: 'import',
            description: 'Imported 45 transcripts from Google Sheets',
            timestamp: '2 hours ago',
            status: 'success'
          },
          {
            id: '2',
            type: 'prediction',
            description: 'Generated volume forecast for next month',
            timestamp: '4 hours ago',
            status: 'success'
          },
          {
            id: '3',
            type: 'sync',
            description: 'Synchronized with Google Sheets',
            timestamp: '6 hours ago',
            status: 'warning'
          }
        ]
      }
      
      setDashboardData(mockData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
  }

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    fetchDashboardData()
  }, [session, status, router])

  if (status === 'loading' || loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="mb-8">
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
          <MetricsCards loading={true} />
        </div>
      </MainLayout>
    )
  }

  if (!session?.user || !dashboardData) {
    return null
  }

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'import': return Upload
      case 'export': return Download
      case 'sync': return RefreshCw
      case 'prediction': return TrendingUp
      default: return Activity
    }
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {session.user.name}. Here's your analytics overview.
            </p>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="mb-8">
          <MetricsCards 
            metrics={[
              {
                title: "Total Transcripts",
                value: dashboardData.totalTranscripts.toLocaleString(),
                change: {
                  value: Math.abs(dashboardData.monthlyGrowth),
                  type: dashboardData.monthlyGrowth > 0 ? 'increase' : 'decrease',
                  period: 'vs last month'
                },
                icon: FileText,
                description: "Total transcripts processed",
                color: 'blue',
                allowedRoles: ['viewer', 'analyst', 'admin']
              },
              {
                title: "Active Clients",
                value: dashboardData.activeClients,
                change: {
                  value: 8.3,
                  type: 'increase',
                  period: 'vs last month'
                },
                icon: Users,
                description: "Clients with recent activity",
                color: 'green',
                allowedRoles: ['viewer', 'analyst', 'admin']
              },
              {
                title: "This Month",
                value: dashboardData.thisMonth.toLocaleString(),
                change: {
                  value: 12.1,
                  type: 'increase',
                  period: 'vs last month'
                },
                icon: Calendar,
                description: "Transcripts processed this month",
                color: 'purple',
                allowedRoles: ['viewer', 'analyst', 'admin']
              },
              {
                title: "Avg Handling Time",
                value: `${dashboardData.avgHandlingTime.toFixed(1)}min`,
                change: {
                  value: 5.2,
                  type: 'decrease',
                  period: 'improvement'
                },
                icon: Clock,
                description: "Average processing time",
                color: 'orange',
                allowedRoles: ['analyst', 'admin']
              }
            ]}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Common tasks and operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/dashboard/data">
                  <Button className="w-full justify-start" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </Button>
                </Link>
                <Link href="/dashboard/reports">
                  <Button className="w-full justify-start" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </Link>
                <Link href="/dashboard/data">
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </Button>
                </Link>
                <Link href="/dashboard/predictions">
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Predictions
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Sync Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Sync Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Google Sheets</span>
                  <Badge className={getSyncStatusColor(dashboardData.syncStatus)}>
                    {dashboardData.syncStatus === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {dashboardData.syncStatus === 'warning' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {dashboardData.syncStatus === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {dashboardData.syncStatus}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last sync: {dashboardData.lastSync}
                </div>
                <Link href="/dashboard/data">
                  <Button size="sm" variant="outline" className="w-full">
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Sync Now
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Predictions Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Next Month Forecast</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-2xl font-bold">
                  {dashboardData.predictions.nextMonth.toLocaleString()}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Confidence</span>
                    <span>{dashboardData.predictions.confidence}%</span>
                  </div>
                  <Progress value={dashboardData.predictions.confidence} className="h-2" />
                </div>
                <Link href="/dashboard/predictions">
                  <Button size="sm" variant="outline" className="w-full">
                    View Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription>
                Latest system activities and operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentActivity.map((activity) => {
                  const Icon = getActivityIcon(activity.type)
                  return (
                    <div key={activity.id} className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.timestamp}
                        </p>
                      </div>
                      <Badge 
                        variant={activity.status === 'success' ? 'default' : 'secondary'}
                        className={getSyncStatusColor(activity.status)}
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}