'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { DataActions } from '@/components/dashboard/data-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Database, 
  TrendingUp, 
  Users, 
  Calendar,
  RefreshCw
} from 'lucide-react'

interface DataSummary {
  totalRecords: number
  lastUpdated: string
  dataQuality: number
  activeClients: number
  recentEntries: Array<{
    id: string
    clientName: string
    date: string
    count: number
    type: string
  }>
}

export default function DataPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDataSummary = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockSummary: DataSummary = {
        totalRecords: 12847,
        lastUpdated: '2 minutes ago',
        dataQuality: 94.2,
        activeClients: 23,
        recentEntries: [
          {
            id: '1',
            clientName: 'Acme Corp',
            date: '2025-01-15',
            count: 45,
            type: 'call'
          },
          {
            id: '2',
            clientName: 'TechStart Inc',
            date: '2025-01-15',
            count: 23,
            type: 'meeting'
          },
          {
            id: '3',
            clientName: 'Global Solutions',
            date: '2025-01-14',
            count: 67,
            type: 'call'
          },
          {
            id: '4',
            clientName: 'Innovation Labs',
            date: '2025-01-14',
            count: 12,
            type: 'interview'
          }
        ]
      }
      
      setDataSummary(mockSummary)
    } catch (error) {
      console.error('Error fetching data summary:', error)
    } finally {
      setLoading(false)
    }
  }

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

    fetchDataSummary()
  }, [session, status, router])

  if (status === 'loading' || loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="mb-8">
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!session?.user || session.user.role === 'viewer' || !dataSummary) {
    return null
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Data Management</h1>
            <p className="text-muted-foreground mt-2">
              Import, manage, and export your transcript data
            </p>
          </div>
          <Button 
            onClick={fetchDataSummary} 
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Data Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataSummary.totalRecords.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Last updated {dataSummary.lastUpdated}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataSummary.dataQuality}%</div>
              <p className="text-xs text-muted-foreground">
                Validation success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataSummary.activeClients}</div>
              <p className="text-xs text-muted-foreground">
                With recent activity
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">
                New entries added
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Actions */}
        <div className="mb-8">
          <DataActions onDataChange={fetchDataSummary} />
        </div>

        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Entries</CardTitle>
            <CardDescription>
              Latest transcript entries added to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataSummary.recentEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.clientName}</TableCell>
                    <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                    <TableCell>{entry.count}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {entry.type}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}