import { ExportReports } from '@/components/analytics/export-reports'
import { ScheduledExports } from '@/components/analytics/scheduled-exports'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ExportPage() {
  // Mock available clients - in real app this would come from API
  const availableClients = ['Client A', 'Client B', 'Client C', 'Client D']

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Data Export</h1>
        <p className="text-muted-foreground">
          Export your analytics data and manage scheduled reports
        </p>
      </div>

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList>
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Exports</TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <ExportReports />
        </TabsContent>

        <TabsContent value="scheduled">
          <ScheduledExports availableClients={availableClients} />
        </TabsContent>
      </Tabs>
    </div>
  )
}