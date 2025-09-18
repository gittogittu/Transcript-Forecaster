'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Filter,
  Search,
  X
} from 'lucide-react'
import { PerformanceAlert } from '@/lib/services/performance-monitoring/types'

interface AlertsPanelProps {
  alerts: PerformanceAlert[]
  onRefresh: () => void
}

export function AlertsPanel({ alerts, onRefresh }: AlertsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.modelId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && !alert.isResolved) ||
                         (statusFilter === 'resolved' && alert.isResolved)
    const matchesType = typeFilter === 'all' || alert.type === typeFilter

    return matchesSearch && matchesSeverity && matchesStatus && matchesType
  })

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/performance-monitoring/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId,
          action: 'resolve'
        })
      })

      if (response.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'accuracy_degradation':
        return '📉'
      case 'latency_spike':
        return '⏱️'
      case 'resource_exhaustion':
        return '💾'
      case 'error_rate_high':
        return '❌'
      default:
        return '⚠️'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'accuracy_degradation':
        return 'Accuracy Degradation'
      case 'latency_spike':
        return 'Latency Spike'
      case 'resource_exhaustion':
        return 'Resource Exhaustion'
      case 'error_rate_high':
        return 'High Error Rate'
      default:
        return type.replace('_', ' ').toUpperCase()
    }
  }

  const activeAlerts = alerts.filter(alert => !alert.isResolved)
  const resolvedAlerts = alerts.filter(alert => alert.isResolved)

  return (
    <div className="space-y-6">
      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Active Alerts</span>
            </div>
            <div className="text-2xl font-bold mt-2">{activeAlerts.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Critical</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {activeAlerts.filter(a => a.severity === 'critical').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Resolved</span>
            </div>
            <div className="text-2xl font-bold mt-2">{resolvedAlerts.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <div className="text-2xl font-bold mt-2">{alerts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
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
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="accuracy_degradation">Accuracy Degradation</SelectItem>
                  <SelectItem value="latency_spike">Latency Spike</SelectItem>
                  <SelectItem value="resource_exhaustion">Resource Exhaustion</SelectItem>
                  <SelectItem value="error_rate_high">High Error Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts ({filteredAlerts.length})</CardTitle>
          <CardDescription>
            System alerts and performance notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length > 0 ? (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 border rounded-lg ${
                    alert.isResolved ? 'bg-muted/50' : 'bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="text-lg">{getTypeIcon(alert.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={getSeverityColor(alert.severity) as any}>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline">
                            {getTypeLabel(alert.type)}
                          </Badge>
                          {alert.isResolved && (
                            <Badge variant="secondary">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        
                        <h4 className="font-medium mb-1">{alert.message}</h4>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Model: {alert.modelId}</div>
                          <div>
                            Threshold: {alert.threshold} | Current: {alert.currentValue}
                          </div>
                          <div>
                            {alert.timestamp.toLocaleString()}
                            {alert.resolvedAt && (
                              <span className="ml-2">
                                • Resolved: {alert.resolvedAt.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!alert.isResolved && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No alerts match the current filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}