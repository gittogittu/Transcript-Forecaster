'use client'

import { useState } from 'react'
import { format, subDays, subMonths } from 'date-fns'
import { Calendar, Download, FileText, Settings, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ExportOptions } from '@/lib/services/export-service'
import { cn } from '@/lib/utils'

interface ExportWizardProps {
  availableClients: string[]
  onExport: (options: ExportOptions) => Promise<void>
  isExporting?: boolean
}

interface DateRange {
  start: Date
  end: Date
}

const DATE_PRESETS = [
  { label: 'Last 7 days', value: 'last7days', getDates: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: 'Last 30 days', value: 'last30days', getDates: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: 'Last 3 months', value: 'last3months', getDates: () => ({ start: subMonths(new Date(), 3), end: new Date() }) },
  { label: 'Last 6 months', value: 'last6months', getDates: () => ({ start: subMonths(new Date(), 6), end: new Date() }) },
  { label: 'Last year', value: 'lastyear', getDates: () => ({ start: subMonths(new Date(), 12), end: new Date() }) },
  { label: 'All time', value: 'alltime', getDates: () => ({ start: new Date('2020-01-01'), end: new Date() }) },
  { label: 'Custom range', value: 'custom', getDates: () => ({ start: subDays(new Date(), 30), end: new Date() }) }
]

export function ExportWizard({ availableClients, onExport, isExporting = false }: ExportWizardProps) {
  const [step, setStep] = useState(1)
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv')
  const [datePreset, setDatePreset] = useState('last30days')
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date()
  })
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [includeAnalytics, setIncludeAnalytics] = useState(true)
  const [includePredictions, setIncludePredictions] = useState(false)
  const [includeCharts, setIncludeCharts] = useState(false)

  const handleClientToggle = (client: string) => {
    setSelectedClients(prev => 
      prev.includes(client) 
        ? prev.filter(c => c !== client)
        : [...prev, client]
    )
  }

  const handleSelectAllClients = () => {
    setSelectedClients(selectedClients.length === availableClients.length ? [] : availableClients)
  }

  const getDateRange = (): DateRange => {
    if (datePreset === 'custom') {
      return customDateRange
    }
    const preset = DATE_PRESETS.find(p => p.value === datePreset)
    return preset ? preset.getDates() : { start: subDays(new Date(), 30), end: new Date() }
  }

  const handleExport = async () => {
    const dateRange = datePreset === 'alltime' ? undefined : getDateRange()
    
    const options: ExportOptions = {
      format: exportFormat,
      dateRange,
      clients: selectedClients.length > 0 ? selectedClients : undefined,
      includeAnalytics,
      includePredictions,
      includeCharts: includeCharts && exportFormat === 'pdf'
    }

    await onExport(options)
  }

  const canProceedToStep2 = exportFormat !== null
  const canProceedToStep3 = datePreset !== null
  const canExport = true // All options are optional

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Analytics Data
        </CardTitle>
        <CardDescription>
          Export your transcript analytics data in CSV or PDF format with customizable options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step >= stepNumber 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {stepNumber}
              </div>
              {stepNumber < 4 && (
                <div className={cn(
                  "w-16 h-0.5 mx-2",
                  step > stepNumber ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Format Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Choose Export Format</h3>
            </div>
            
            <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as 'csv' | 'pdf')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={cn("cursor-pointer transition-colors", exportFormat === 'csv' && "ring-2 ring-primary")}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="csv" id="csv" />
                      <Label htmlFor="csv" className="cursor-pointer flex-1">
                        <div>
                          <div className="font-medium">CSV Format</div>
                          <div className="text-sm text-muted-foreground">
                            Spreadsheet-compatible format with raw data, perfect for further analysis
                          </div>
                        </div>
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn("cursor-pointer transition-colors", exportFormat === 'pdf' && "ring-2 ring-primary")}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pdf" id="pdf" />
                      <Label htmlFor="pdf" className="cursor-pointer flex-1">
                        <div>
                          <div className="font-medium">PDF Report</div>
                          <div className="text-sm text-muted-foreground">
                            Formatted report with tables, charts, and summary statistics
                          </div>
                        </div>
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Step 2: Date Range */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Select Date Range</h3>
            </div>

            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger>
                <SelectValue placeholder="Choose date range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {datePreset === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(customDateRange.start, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customDateRange.start}
                        onSelect={(date) => date && setCustomDateRange(prev => ({ ...prev, start: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(customDateRange.end, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customDateRange.end}
                        onSelect={(date) => date && setCustomDateRange(prev => ({ ...prev, end: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {datePreset !== 'alltime' && (
              <div className="text-sm text-muted-foreground">
                Selected range: {format(getDateRange().start, 'MMM d, yyyy')} - {format(getDateRange().end, 'MMM d, yyyy')}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Client Selection */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Select Clients</h3>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Choose specific clients or leave empty to include all clients
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllClients}
              >
                {selectedClients.length === availableClients.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {availableClients.map((client) => (
                <div key={client} className="flex items-center space-x-2">
                  <Checkbox
                    id={client}
                    checked={selectedClients.includes(client)}
                    onCheckedChange={() => handleClientToggle(client)}
                  />
                  <Label htmlFor={client} className="text-sm cursor-pointer">
                    {client}
                  </Label>
                </div>
              ))}
            </div>

            {selectedClients.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-4">
                {selectedClients.map((client) => (
                  <Badge key={client} variant="secondary" className="text-xs">
                    {client}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Export Options */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Export Options</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAnalytics"
                  checked={includeAnalytics}
                  onCheckedChange={setIncludeAnalytics}
                />
                <Label htmlFor="includeAnalytics">
                  Include summary statistics and analytics
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includePredictions"
                  checked={includePredictions}
                  onCheckedChange={setIncludePredictions}
                />
                <Label htmlFor="includePredictions">
                  Include prediction data and forecasts
                </Label>
              </div>

              {exportFormat === 'pdf' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCharts"
                    checked={includeCharts}
                    onCheckedChange={setIncludeCharts}
                  />
                  <Label htmlFor="includeCharts">
                    Include charts and visualizations (PDF only)
                  </Label>
                </div>
              )}
            </div>

            <Separator />

            {/* Export Summary */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Export Summary</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Format: {exportFormat.toUpperCase()}</div>
                <div>
                  Date Range: {datePreset === 'alltime' 
                    ? 'All time' 
                    : `${format(getDateRange().start, 'MMM d, yyyy')} - ${format(getDateRange().end, 'MMM d, yyyy')}`
                  }
                </div>
                <div>
                  Clients: {selectedClients.length === 0 
                    ? 'All clients' 
                    : `${selectedClients.length} selected`
                  }
                </div>
                <div>
                  Options: {[
                    includeAnalytics && 'Analytics',
                    includePredictions && 'Predictions',
                    includeCharts && exportFormat === 'pdf' && 'Charts'
                  ].filter(Boolean).join(', ') || 'Data only'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !canProceedToStep2) ||
                  (step === 2 && !canProceedToStep3)
                }
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleExport}
                disabled={!canExport || isExporting}
                className="min-w-[120px]"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}