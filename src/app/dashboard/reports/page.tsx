'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MainLayout } from '@/components/layout/main-layout'
import { FileText, Download, Calendar, BarChart3, Clock, Users } from 'lucide-react'

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user) {
      router.push('/auth/signin')
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

  if (!session?.user) {
    return null
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-2">
            Generate detailed reports and analytics summaries
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              <Button className="w-full">
                Generate Report
              </Button>
            </CardContent>
          </Card>

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
              <Button className="w-full" variant="outline">
                Generate AHT Report
              </Button>
            </CardContent>
          </Card>

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
              <Button className="w-full" variant="outline">
                Generate Monthly
              </Button>
            </CardContent>
          </Card>

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
              <Button className="w-full" variant="outline">
                Generate Client Report
              </Button>
            </CardContent>
          </Card>

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
              <Button className="w-full" variant="outline">
                Create Custom
              </Button>
            </CardContent>
          </Card>

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

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>
                Your recently generated reports and scheduled exports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                No reports generated yet. Click any report type above to get started.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}