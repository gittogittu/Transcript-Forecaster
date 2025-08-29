'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MainLayout } from '@/components/layout/main-layout'
import { Database, Upload, Download, FileText, Plus } from 'lucide-react'
import Link from 'next/link'

export default function DataPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    // Check if user has analyst or admin role
    if (session.user.role === 'viewer') {
      router.push('/unauthorized')
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

  if (!session?.user || session.user.role === 'viewer') {
    return null
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Data Management</h1>
          <p className="text-muted-foreground mt-2">
            Import, manage, and export your transcript data
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              <Button className="w-full">
                Import Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>View Data</span>
              </CardTitle>
              <CardDescription>
                Browse and search your transcript database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Browse Data
              </Button>
            </CardContent>
          </Card>

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
              <Button className="w-full" variant="outline">
                Export Data
              </Button>
            </CardContent>
          </Card>

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
              <Button className="w-full" variant="outline">
                Add Entry
              </Button>
            </CardContent>
          </Card>

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
              <Button className="w-full" variant="outline">
                Quality Check
              </Button>
            </CardContent>
          </Card>

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
              <Button className="w-full" variant="outline">
                View Sync
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}