'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMonitoring } from '@/lib/hooks/use-monitoring'
import { UserActivity } from '@/types/monitoring'
import { formatDistanceToNow, format } from 'date-fns'
import { 
  Activity, 
  User, 
  Search, 
  Filter, 
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Database
} from 'lucide-react'

const getActionIcon = (action: string) => {
  switch (action.toLowerCase()) {
    case 'api_request':
      return <Activity className="h-4 w-4 text-blue-500" />
    case 'ml_prediction':
      return <Zap className="h-4 w-4 text-green-500" />
    case 'data_sync':
      return <Database className="h-4 w-4 text-purple-500" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <User className="h-4 w-4 text-gray-500" />
  }
}

const getActionColor = (action: string, success: boolean) => {
  if (!success) return 'bg-red-100 text-red-800'
  
  switch (action.toLowerCase()) {
    case 'api_request':
      return 'bg-blue-100 text-blue-800'
    case 'ml_prediction':
      return 'bg-green-100 text-green-800'
    case 'data_sync':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function UserActivityLog() {
  const { recentActivity, isLoading } = useMonitoring()
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Filter activities
  const filteredActivities = (recentActivity || []).filter((activity) => {
    const matchesSearch = searchTerm === '' || 
      activity.endpoint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.action.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAction = actionFilter === 'all' || activity.action === actionFilter
    const matchesUser = userFilter === 'all' || activity.userId === userFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'success' && activity.success) ||
      (statusFilter === 'error' && !activity.success)

    return matchesSearch && matchesAction && matchesUser && matchesStatus
  })

  // Get unique values for filters
  const uniqueActions = Array.from(new Set((recentActivity || []).map(a => a.action)))
  const uniqueUsers = Array.from(new Set((recentActivity || []).map(a => a.userId)))

  // Calculate summary stats
  const totalActivities = recentActivity?.length || 0
  const successfulActivities = recentActivity?.filter(a => a.success).length || 0
  const errorActivities = totalActivities - successfulActivities
  const averageResponseTime = recentActivity?.length 
    ? recentActivity.reduce((sum, a) => sum + (a.duration || 0), 0) / recentActivity.length
    : 0

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Activities</p>
                <p className="text-2xl font-bold">{totalActivities}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-green-600">{successfulActivities}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-600">{errorActivities}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{averageResponseTime.toFixed(0)}ms</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Activity Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user} value={user}>
                      {user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Export</label>
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Showing {filteredActivities.length} of {totalActivities} activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredActivities.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.slice(0, 100).map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {format(activity.timestamp, 'MMM dd, HH:mm:ss')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{activity.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(activity.action)}
                          <Badge className={getActionColor(activity.action, activity.success)}>
                            {activity.action.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {activity.endpoint || 'N/A'}
                        </code>
                      </TableCell>
                      <TableCell>
                        {activity.duration ? (
                          <span className="text-sm">
                            {activity.duration}ms
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {activity.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className={`text-sm ${activity.success ? 'text-green-600' : 'text-red-600'}`}>
                            {activity.success ? 'Success' : 'Error'}
                          </span>
                        </div>
                        {activity.errorMessage && (
                          <div className="text-xs text-red-600 mt-1">
                            {activity.errorMessage}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Activities Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || actionFilter !== 'all' || userFilter !== 'all' || statusFilter !== 'all'
                  ? 'No activities match your current filters'
                  : 'No user activities have been recorded yet'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}