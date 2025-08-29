'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { 
  BarChart3, 
  Clock, 
  Calendar, 
  Users, 
  FileText, 
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface ReportGeneratorProps {
  onReportGenerated?: (report: any) => void
}

interface GeneratedReport {
  id: string
  name: string
  type: string
  generatedAt: string
  status: 'generating' | 'completed' | 'failed'
  downloadUrl?: string
}

export function ReportGenerator({ onReportGenerated }: ReportGeneratorProps) {
  const { toast } = useToast()
  const [generating, setGenerating] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false)
  const [ahtDialogOpen, setAhtDialogOpen] = useState(false)
  const [monthlyDialogOpen, setMonthlyDialogOpen] = useState(false)
  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [customDialogOpen, setCustomDialogOpen] = useState(false)

  const generateReport = async (reportType: string, config: any) => {
    setGenerating(reportType)
    setProgress(0)

    try {
      // Progress tracking for UI feedback
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 15
        })
      }, 300)

      // Map UI report type to API type
      const apiType = reportType.toLowerCase().replace(' report', '').replace(' ', '-')
      
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: apiType,
          ...config
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setProgress(100)
        
        toast({
          title: "Report Generated",
          description: `${reportType} report has been generated successfully`,
        })
        
        onReportGenerated?.(result.data)
        
        // Close dialogs
        setAnalyticsDialogOpen(false)
        setAhtDialogOpen(false)
        setMonthlyDialogOpen(false)
        setClientDialogOpen(false)
        setCustomDialogOpen(false)
      } else {
        throw new Error(result.error || 'Failed to generate report')
      }
      
    } catch (error) {
      console.error('Error generating report:', error)
      toast({
        title: "Report Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setGenerating(null)
      setProgress(0)
    }
  }

  const isGenerating = (reportType: string) => generating === reportType

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Analytics Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Analytics Report</span>
          </CardTitle>
          <CardDescription>
            Comprehensive analytics and trend analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={analyticsDialogOpen} onOpenChange={setAnalyticsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" disabled={isGenerating('analytics')}>
                {isGenerating('analytics') ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Report'
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Analytics Report</DialogTitle>
                <DialogDescription>
                  Configure your analytics report parameters
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                generateReport('Analytics', {
                  dateRange: formData.get('dateRange'),
                  includeCharts: formData.get('includeCharts') === 'on',
                  includeTrends: formData.get('includeTrends') === 'on'
                })
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="date-range">Date Range</Label>
                    <Select name="dateRange">
                      <SelectTrigger>
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                        <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                        <SelectItem value="last-year">Last Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Include Options</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="charts" name="includeCharts" defaultChecked />
                      <Label htmlFor="charts">Include Charts</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="trends" name="includeTrends" defaultChecked />
                      <Label htmlFor="trends">Include Trend Analysis</Label>
                    </div>
                  </div>
                  {isGenerating('analytics') && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Generating report...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setAnalyticsDialogOpen(false)}
                      disabled={isGenerating('analytics')}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isGenerating('analytics')}>
                      Generate
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* AHT Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>AHT Report</span>
          </CardTitle>
          <CardDescription>
            Average Handling Time performance analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={ahtDialogOpen} onOpenChange={setAhtDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline" disabled={isGenerating('aht')}>
                {isGenerating('aht') ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate AHT Report'
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate AHT Report</DialogTitle>
                <DialogDescription>
                  Analyze average handling time performance
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                generateReport('AHT', {
                  dateRange: formData.get('dateRange'),
                  groupBy: formData.get('groupBy')
                })
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="aht-date-range">Date Range</Label>
                    <Select name="dateRange">
                      <SelectTrigger>
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-week">Last Week</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="last-quarter">Last Quarter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="group-by">Group By</Label>
                    <Select name="groupBy">
                      <SelectTrigger>
                        <SelectValue placeholder="Group results by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="type">Transcript Type</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isGenerating('aht') && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Generating report...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setAhtDialogOpen(false)}
                      disabled={isGenerating('aht')}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isGenerating('aht')}>
                      Generate
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Monthly Summary</span>
          </CardTitle>
          <CardDescription>
            Monthly performance and volume summaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full" 
            variant="outline"
            disabled={isGenerating('monthly')}
            onClick={() => generateReport('Monthly Summary', { month: new Date().getMonth() })}
          >
            {isGenerating('monthly') ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Monthly'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Client Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Client Report</span>
          </CardTitle>
          <CardDescription>
            Client-specific performance and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline" disabled={isGenerating('client')}>
                {isGenerating('client') ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Client Report'
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Client Report</DialogTitle>
                <DialogDescription>
                  Create detailed reports for specific clients
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                generateReport('Client', {
                  client: formData.get('client'),
                  dateRange: formData.get('dateRange')
                })
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="client">Select Client</Label>
                    <Select name="client">
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="acme-corp">Acme Corp</SelectItem>
                        <SelectItem value="techstart-inc">TechStart Inc</SelectItem>
                        <SelectItem value="global-solutions">Global Solutions</SelectItem>
                        <SelectItem value="innovation-labs">Innovation Labs</SelectItem>
                        <SelectItem value="all">All Clients</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="client-date-range">Date Range</Label>
                    <Select name="dateRange">
                      <SelectTrigger>
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="last-quarter">Last Quarter</SelectItem>
                        <SelectItem value="last-year">Last Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isGenerating('client') && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Generating report...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setClientDialogOpen(false)}
                      disabled={isGenerating('client')}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isGenerating('client')}>
                      Generate
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Custom Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Custom Report</span>
          </CardTitle>
          <CardDescription>
            Build custom reports with specific metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full" 
            variant="outline"
            disabled={isGenerating('custom')}
            onClick={() => generateReport('Custom', { type: 'custom' })}
          >
            {isGenerating('custom') ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Create Custom'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Export Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Reports</span>
          </CardTitle>
          <CardDescription>
            Export reports to PDF, Excel, or CSV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" variant="outline">
            Export Options
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}