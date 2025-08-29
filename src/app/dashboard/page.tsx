'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MainLayout } from '@/components/layout/main-layout'
import { BarChart3, Users, FileText, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
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
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to your transcript analytics platform, {session.user.name}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Analytics</span>
              </CardTitle>
              <CardDescription>
                View trends and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/analytics">
                <Button className="w-full">
                  View Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Data</span>
              </CardTitle>
              <CardDescription>
                Manage transcript data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/data">
                <Button className="w-full" variant="outline">
                  Manage Data
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Predictions</span>
              </CardTitle>
              <CardDescription>
                Forecast future volumes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/predictions">
                <Button className="w-full" variant="outline">
                  View Predictions
                </Button>
              </Link>
            </CardContent>
          </Card>

          {session.user.role === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Admin</span>
                </CardTitle>
                <CardDescription>
                  Manage users and settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin">
                  <Button className="w-full" variant="outline">
                    Admin Panel
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  )
}