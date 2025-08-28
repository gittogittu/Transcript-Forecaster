'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar, Clock, Mail, Play, Pause, Trash2, Plus, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ScheduledExport, ScheduleConfig, scheduledExportService } from '@/lib/services/scheduled-export-service'
import { ExportOptions } from '@/lib/services/export-service'

interface ScheduledExportsProps {
  availableClients: string[]
}

export function ScheduledExports({ availableClients }: ScheduledExportsProps) {
  const [scheduledExports, setScheduledExports] = useState<ScheduledExport[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingExport, setEditingExport] = useState<ScheduledExport | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    time: '09:00',
    dayOfWeek: 1, // Monday
    dayOfMonth: 1,
    timezone: 'UTC',
    format: 'csv' as 'csv' | 'pdf',
    includeAnalytics: true,
    includePredictions: false,
    includeCharts: false,
    selectedClients: [] as string[],
    recipients: ['']
  })

  useEffect(() => {
    loadScheduledExports()
  }, [])

  const loadScheduledExports = () => {
    const exports = scheduledExportService.getScheduledExports()
    setScheduledExports(exports)
  }

  const handleCreateExport = async () => {
    setIsLoading(true)
    try {
      const schedule: ScheduleConfig = {
        frequency: formData.frequency,
        time: formData.time,
        dayOfWeek: formData.frequency === 'weekly' ? formData.dayOfWeek : undefined,
        dayOfMonth: formData.frequency === 'monthly' ? formData.dayOfMonth : undefined,
        timezone: formData.timezone
      }

      const exportOptions: ExportOptions = {
        format: formData.format,
        clients: formData.selectedClients.length > 0 ? formData.selectedClients : undefined,
        includeAnalytics: formData.includeAnalytics,
        includePredictions: formData.includePredictions,
        includeCharts: formData.includeCharts && formData.format === 'pdf'
      }

      const recipients = formData.recipients.filter(email => email.trim() !== '')

      await scheduledExportService.createScheduledExport({
        name: formData.name,
        description: formData.description,
        schedule,
        exportOptions,
        recipients,
        isActive: true,
        createdBy: 'current-user' // TODO: Get from session
      })

      loadScheduledExports()
      setIsCreateDialogOpen(false)
      resetForm()
      toast.success('Scheduled export created successfully')
    } catch (error) {
      toast.error('Failed to create scheduled export')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateExport = async () => {
    if (!editingExport) return

    setIsLoading(true)
    try {
      const schedule: ScheduleConfig = {
        frequency: formData.frequency,
        time: formData.time,
        dayOfWeek: formData.frequency === 'weekly' ? formData.dayOfWeek : undefined,
        dayOfMonth: formData.frequency === 'monthly' ? formData.dayOfMonth : undefined,
        timezone: formData.timezone
      }

      const exportOptions: ExportOptions = {
        format: formData.format,
        clients: formData.selectedClients.length > 0 ? formData.selectedClients : undefined,
        includeAnalytics: formData.includeAnalytics,
        includePredictions: formData.includePredictions,
        includeCharts: formData.includeCharts && formData.format === 'pdf'
      }

      const recipients = formData.recipients.filter(email => email.trim() !== '')

      await scheduledExportService.updateScheduledExport(editingExport.id, {
        name: formData.name,
        description: formData.description,
        schedule,
        exportOptions,
        recipients
      })

      loadScheduledExports()
      setEditingExport(null)
      resetForm()
      toast.success('Scheduled export updated successfully')
    } catch (error) {
      toast.error('Failed to update scheduled export')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (exportId: string, isActive: boolean) => {
    try {
      await scheduledExportService.updateScheduledExport(exportId, { isActive })
      loadScheduledExports()
      toast.success(`Export ${isActive ? 'activated' : 'paused'}`)
    } catch (error) {
      toast.error('Failed to update export status')
    }
  }

  const handleDeleteExport = async (exportId: string) => {
    try {
      await scheduledExportService.deleteScheduledExport(exportId)
      loadScheduledExports()
      toast.success('Scheduled export deleted')
    } catch (error) {
      toast.error('Failed to delete export')
    }
  }

  const handleExecuteNow = async (exportId: string) => {
    try {
      const result = await scheduledExportService.executeScheduledExport(exportId)
      if (result.success) {
        toast.success(`Export executed successfully: ${result.filename}`)
      } else {
        toast.error(`Export failed: ${result.error}`)
      }
      loadScheduledExports()
    } catch (error) {
      toast.error('Failed to execute export')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      frequency: 'weekly',
      time: '09:00',
      dayOfWeek: 1,
      dayOfMonth: 1,
      timezone: 'UTC',
      format: 'csv',
      includeAnalytics: true,
      includePredictions: false,
      includeCharts: false,
      selectedClients: [],
      recipients: ['']
    })
  }

  const openEditDialog = (exportItem: ScheduledExport) => {
    setEditingExport(exportItem)
    setFormData({
      name: exportItem.name,
      description: exportItem.description || '',
      frequency: exportItem.schedule.frequency,
      time: exportItem.schedule.time,
      dayOfWeek: exportItem.schedule.dayOfWeek || 1,
      dayOfMonth: exportItem.schedule.dayOfMonth || 1,
      timezone: exportItem.schedule.timezone,
      format: exportItem.exportOptions.format,
      includeAnalytics: exportItem.exportOptions.includeAnalytics || false,
      includePredictions: exportItem.exportOptions.includePredictions || false,
      includeCharts: exportItem.exportOptions.includeCharts || false,
      selectedClients: exportItem.exportOptions.clients || [],
      recipients: exportItem.recipients.length > 0 ? exportItem.recipients : ['']
    })
  }

  const addRecipient = () => {
    setFormData(prev => ({
      ...prev,
      recipients: [...prev.recipients, '']
    }))
  }

  const updateRecipient = (index: number, email: string) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.map((r, i) => i === index ? email : r)
    }))
  }

  const removeRecipient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }))
  }

  const getFrequencyDisplay = (schedule: ScheduleConfig) => {
    switch (schedule.frequency) {
      case 'daily':
        return `Daily at ${schedule.time}`
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return `Weekly on ${days[schedule.dayOfWeek || 0]} at ${schedule.time}`
      case 'monthly':
        return `Monthly on day ${schedule.dayOfMonth} at ${schedule.time}`
      default:
        return 'Unknown schedule'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scheduled Exports</h2>
          <p className="text-muted-foreground">
            Automate your analytics reports with scheduled exports
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Scheduled Export
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Scheduled Export</DialogTitle>
              <DialogDescription>
                Set up automated exports of your analytics data
              </DialogDescription>
            </DialogHeader>
            <ScheduledExportForm
              formData={formData}
              setFormData={setFormData}
              availableClients={availableClients}
              onSubmit={handleCreateExport}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={isLoading}
              addRecipient={addRecipient}
              updateRecipient={updateRecipient}
              removeRecipient={removeRecipient}
            />
          </DialogContent>
        </Dialog>
      </div>

      {scheduledExports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Scheduled Exports</h3>
            <p className="text-muted-foreground mb-4">
              Create your first scheduled export to automate your reporting
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Scheduled Export
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active Scheduled Exports</CardTitle>
            <CardDescription>
              Manage your automated export schedules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledExports.map((exportItem) => (
                  <TableRow key={exportItem.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{exportItem.name}</div>
                        {exportItem.description && (
                          <div className="text-sm text-muted-foreground">
                            {exportItem.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-sm">
                          {getFrequencyDisplay(exportItem.schedule)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {exportItem.exportOptions.format.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={exportItem.isActive ? 'default' : 'secondary'}>
                        {exportItem.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {exportItem.lastRun ? (
                        <span className="text-sm">
                          {format(exportItem.lastRun, 'MMM d, HH:mm')}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {exportItem.nextRun ? (
                        <span className="text-sm">
                          {format(exportItem.nextRun, 'MMM d, HH:mm')}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExecuteNow(exportItem.id)}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(exportItem.id, !exportItem.isActive)}
                        >
                          {exportItem.isActive ? (
                            <Pause className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(exportItem)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExport(exportItem.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingExport} onOpenChange={(open) => !open && setEditingExport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Scheduled Export</DialogTitle>
            <DialogDescription>
              Update your scheduled export configuration
            </DialogDescription>
          </DialogHeader>
          <ScheduledExportForm
            formData={formData}
            setFormData={setFormData}
            availableClients={availableClients}
            onSubmit={handleUpdateExport}
            onCancel={() => setEditingExport(null)}
            isLoading={isLoading}
            addRecipient={addRecipient}
            updateRecipient={updateRecipient}
            removeRecipient={removeRecipient}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Form component for creating/editing scheduled exports
interface ScheduledExportFormProps {
  formData: any
  setFormData: (data: any) => void
  availableClients: string[]
  onSubmit: () => void
  onCancel: () => void
  isLoading: boolean
  addRecipient: () => void
  updateRecipient: (index: number, email: string) => void
  removeRecipient: (index: number) => void
}

function ScheduledExportForm({
  formData,
  setFormData,
  availableClients,
  onSubmit,
  onCancel,
  isLoading,
  addRecipient,
  updateRecipient,
  removeRecipient
}: ScheduledExportFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Export Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Weekly Analytics Report"
          />
        </div>
        <div>
          <Label htmlFor="format">Format</Label>
          <Select
            value={formData.format}
            onValueChange={(value) => setFormData(prev => ({ ...prev, format: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Weekly report for management team"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="frequency">Frequency</Label>
          <Select
            value={formData.frequency}
            onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="time">Time</Label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
          />
        </div>
        {formData.frequency === 'weekly' && (
          <div>
            <Label htmlFor="dayOfWeek">Day of Week</Label>
            <Select
              value={formData.dayOfWeek.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, dayOfWeek: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sunday</SelectItem>
                <SelectItem value="1">Monday</SelectItem>
                <SelectItem value="2">Tuesday</SelectItem>
                <SelectItem value="3">Wednesday</SelectItem>
                <SelectItem value="4">Thursday</SelectItem>
                <SelectItem value="5">Friday</SelectItem>
                <SelectItem value="6">Saturday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {formData.frequency === 'monthly' && (
          <div>
            <Label htmlFor="dayOfMonth">Day of Month</Label>
            <Input
              id="dayOfMonth"
              type="number"
              min="1"
              max="31"
              value={formData.dayOfMonth}
              onChange={(e) => setFormData(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
            />
          </div>
        )}
      </div>

      <div>
        <Label>Export Options</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeAnalytics"
              checked={formData.includeAnalytics}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeAnalytics: checked }))}
            />
            <Label htmlFor="includeAnalytics">Include analytics and summary statistics</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includePredictions"
              checked={formData.includePredictions}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includePredictions: checked }))}
            />
            <Label htmlFor="includePredictions">Include prediction data</Label>
          </div>
          {formData.format === 'pdf' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeCharts"
                checked={formData.includeCharts}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeCharts: checked }))}
              />
              <Label htmlFor="includeCharts">Include charts and visualizations</Label>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label>Email Recipients</Label>
        <div className="space-y-2 mt-2">
          {formData.recipients.map((email, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => updateRecipient(index, e.target.value)}
                placeholder="user@example.com"
              />
              {formData.recipients.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRecipient(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRecipient}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Recipient
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isLoading || !formData.name}>
          {isLoading ? 'Saving...' : 'Save Export'}
        </Button>
      </div>
    </div>
  )
}