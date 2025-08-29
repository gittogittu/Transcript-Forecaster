'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { 
  Upload, 
  Download, 
  Database, 
  Plus, 
  FileText, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react'

interface DataActionsProps {
  onDataChange?: () => void
}

export function DataActions({ onDataChange }: DataActionsProps) {
  const { toast } = useToast()
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [addEntryDialogOpen, setAddEntryDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const handleImportData = async (formData: FormData) => {
    setImporting(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setUploadProgress(100)
      
      toast({
        title: "Import Successful",
        description: "Successfully imported 45 transcript records",
      })
      
      setImportDialogOpen(false)
      onDataChange?.()
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setImporting(false)
      setUploadProgress(0)
    }
  }

  const handleExportData = async (format: string, dateRange: string) => {
    setExporting(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast({
        title: "Export Successful",
        description: `Data exported to ${format.toUpperCase()} format`,
      })
      
      setExportDialogOpen(false)
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setExporting(false)
    }
  }

  const handleAddEntry = async (formData: FormData) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Entry Added",
        description: "New transcript entry has been added successfully",
      })
      
      setAddEntryDialogOpen(false)
      onDataChange?.()
    } catch (error) {
      toast({
        title: "Failed to Add Entry",
        description: "Could not add the entry. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Sync Completed",
        description: "Successfully synchronized with Google Sheets",
      })
      
      onDataChange?.()
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync with Google Sheets. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Import Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Import Data</span>
          </CardTitle>
          <CardDescription>
            Import transcript data from Google Sheets or CSV files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                Import Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Transcript Data</DialogTitle>
                <DialogDescription>
                  Upload a CSV file or connect to Google Sheets to import transcript data
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleImportData(formData)
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="import-file">CSV File</Label>
                    <Input 
                      id="import-file" 
                      name="file" 
                      type="file" 
                      accept=".csv,.xlsx"
                      disabled={importing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="import-source">Data Source</Label>
                    <Select name="source" disabled={importing}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select data source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV File</SelectItem>
                        <SelectItem value="sheets">Google Sheets</SelectItem>
                        <SelectItem value="excel">Excel File</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {importing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setImportDialogOpen(false)}
                      disabled={importing}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={importing}>
                      {importing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        'Import'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Browse Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Browse Data</span>
          </CardTitle>
          <CardDescription>
            View and search your transcript database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" variant="outline">
            Browse Data
          </Button>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Data</span>
          </CardTitle>
          <CardDescription>
            Export data to CSV, Excel, or Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                Export Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Transcript Data</DialogTitle>
                <DialogDescription>
                  Choose format and date range for your data export
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleExportData(
                  formData.get('format') as string,
                  formData.get('dateRange') as string
                )
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="export-format">Export Format</Label>
                    <Select name="format" disabled={exporting}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="sheets">Google Sheets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date-range">Date Range</Label>
                    <Select name="dateRange" disabled={exporting}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                        <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                        <SelectItem value="all">All Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setExportDialogOpen(false)}
                      disabled={exporting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={exporting}>
                      {exporting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        'Export'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Add Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add Entry</span>
          </CardTitle>
          <CardDescription>
            Manually add new transcript entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={addEntryDialogOpen} onOpenChange={setAddEntryDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Transcript Entry</DialogTitle>
                <DialogDescription>
                  Enter the details for a new transcript record
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleAddEntry(formData)
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="client-name">Client Name</Label>
                    <Input 
                      id="client-name" 
                      name="clientName" 
                      placeholder="Enter client name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="transcript-date">Date</Label>
                    <Input 
                      id="transcript-date" 
                      name="date" 
                      type="date"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="transcript-count">Transcript Count</Label>
                    <Input 
                      id="transcript-count" 
                      name="count" 
                      type="number"
                      min="0"
                      placeholder="Enter number of transcripts"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="transcript-type">Type</Label>
                    <Select name="type">
                      <SelectTrigger>
                        <SelectValue placeholder="Select transcript type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea 
                      id="notes" 
                      name="notes" 
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setAddEntryDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Add Entry
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Data Quality */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Data Quality</span>
          </CardTitle>
          <CardDescription>
            Check data quality and validation issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Data Quality Score</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                94.2%
              </Badge>
            </div>
            <Button className="w-full" variant="outline">
              Quality Check
            </Button>
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
          <CardDescription>
            Monitor Google Sheets synchronization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Sync</span>
              <span className="text-xs text-muted-foreground">2 min ago</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Synchronized</span>
            </div>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}