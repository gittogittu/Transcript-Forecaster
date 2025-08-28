'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMonitoring } from '@/lib/hooks/use-monitoring'
import { AlertConfig, Alert } from '@/types/monitoring'
import { formatDistanceToNow } from 'date-fns'
import { 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Plus, 
  Trash2, 
  Edit,
  Bell,
  BellOff
} from 'lucide-react'

const severityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

const getSeverityIcon = (severity: Alert['severity']) => {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    case 'medium':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    default:
      return <AlertTriangle className="h-4 w-4 text-blue-500" />
  }
}

export function AlertManagement() {
  const { 
    activeAlerts, 
    allAlerts, 
    alertConfigs, 
    resolveAlert, 
    updateAlertConfig,
    isLoading 
  } = useMonitoring()

  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<AlertConfig | null>(null)

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveAlert(alertId)
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    }
  }

  const handleConfigSave = async (config: AlertConfig) => {
    try {
      await updateAlertConfig(config)
      setIsConfigDialogOpen(false)
      setEditingConfig(null)
    } catch (error) {
      console.error('Failed to update alert config:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alert Management</h2>
          <p className="text-muted-foreground">
            Monitor and configure system alerts
          </p>
        </div>
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Alert
            </Button>
          </DialogTrigger>
          <AlertConfigDialog
            config={editingConfig}
            onSave={handleConfigSave}
            onCancel={() => {
              setIsConfigDialogOpen(false)
              setEditingConfig(null)
            }}
          />
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active Alerts ({activeAlerts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history">
            Alert History
          </TabsTrigger>
          <TabsTrigger value="config">
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeAlerts && activeAlerts.length > 0 ? (
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <Card key={alert.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(alert.severity)}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={severityColors[alert.severity]}>
                              {alert.severity}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                          <p className="font-medium">{alert.message}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Alerts</h3>
                  <p className="text-muted-foreground">
                    All systems are operating normally
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {allAlerts && allAlerts.length > 0 ? (
            <div className="space-y-3">
              {allAlerts.slice(0, 20).map((alert) => (
                <Card key={alert.id} className={alert.resolved ? 'opacity-60' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {alert.resolved ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          getSeverityIcon(alert.severity)
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={severityColors[alert.severity]}>
                              {alert.severity}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                            </span>
                            {alert.resolved && alert.resolvedAt && (
                              <span className="text-sm text-green-600">
                                (Resolved {formatDistanceToNow(alert.resolvedAt, { addSuffix: true })})
                              </span>
                            )}
                          </div>
                          <p className="font-medium">{alert.message}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Alert History</h3>
                  <p className="text-muted-foreground">
                    No alerts have been generated yet
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <div className="space-y-3">
            {alertConfigs?.map((config) => (
              <Card key={config.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{config.name}</h4>
                        <Badge className={severityColors[config.severity]}>
                          {config.severity}
                        </Badge>
                        {config.enabled ? (
                          <Bell className="h-4 w-4 text-green-500" />
                        ) : (
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {config.metric} {config.operator} {config.threshold}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(enabled) => 
                          handleConfigSave({ ...config, enabled })
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingConfig(config)
                          setIsConfigDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Alert Configurations</h3>
                    <p className="text-muted-foreground">
                      Create your first alert configuration to get started
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface AlertConfigDialogProps {
  config: AlertConfig | null
  onSave: (config: AlertConfig) => void
  onCancel: () => void
}

function AlertConfigDialog({ config, onSave, onCancel }: AlertConfigDialogProps) {
  const [formData, setFormData] = useState<Partial<AlertConfig>>(
    config || {
      name: '',
      metric: 'errorCount',
      threshold: 0,
      operator: 'gt',
      severity: 'medium',
      enabled: true,
    }
  )

  const handleSave = () => {
    if (!formData.name || formData.threshold === undefined) return

    const alertConfig: AlertConfig = {
      id: config?.id || crypto.randomUUID(),
      name: formData.name,
      metric: formData.metric as keyof import('@/types/monitoring').PerformanceMetrics,
      threshold: formData.threshold,
      operator: formData.operator as 'gt' | 'lt' | 'eq',
      severity: formData.severity as AlertConfig['severity'],
      enabled: formData.enabled ?? true,
    }

    onSave(alertConfig)
  }

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>
          {config ? 'Edit Alert Configuration' : 'Create Alert Configuration'}
        </DialogTitle>
        <DialogDescription>
          Configure when and how alerts should be triggered
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Alert Name</Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter alert name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="metric">Metric</Label>
          <Select
            value={formData.metric}
            onValueChange={(value) => setFormData({ ...formData, metric: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="errorCount">Error Count</SelectItem>
              <SelectItem value="queriesPerSecond">Queries Per Second</SelectItem>
              <SelectItem value="memoryUsage">Memory Usage (%)</SelectItem>
              <SelectItem value="cpuUsage">CPU Usage (%)</SelectItem>
              <SelectItem value="modelRuntime">Model Runtime (ms)</SelectItem>
              <SelectItem value="activeUsers">Active Users</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="operator">Operator</Label>
            <Select
              value={formData.operator}
              onValueChange={(value) => setFormData({ ...formData, operator: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gt">Greater than</SelectItem>
                <SelectItem value="lt">Less than</SelectItem>
                <SelectItem value="eq">Equals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold">Threshold</Label>
            <Input
              id="threshold"
              type="number"
              value={formData.threshold || ''}
              onChange={(e) => setFormData({ ...formData, threshold: Number(e.target.value) })}
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="severity">Severity</Label>
          <Select
            value={formData.severity}
            onValueChange={(value) => setFormData({ ...formData, severity: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={formData.enabled}
            onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
          />
          <Label htmlFor="enabled">Enable this alert</Label>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          {config ? 'Update' : 'Create'} Alert
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}