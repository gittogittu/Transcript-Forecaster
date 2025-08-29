'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MainLayout } from '@/components/layout/main-layout'
import { Users, Shield, BarChart3, Settings } from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user || session.user.role !== 'admin') {
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

  if (!session?.user || session.user.role !== 'admin') {
    return null
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage platform settings and user access
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User Management</span>
            </CardTitle>
            <CardDescription>
              Manage user accounts, roles, and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/users">
              <Button className="w-full">
                Manage Users
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Performance</span>
            </CardTitle>
            <CardDescription>
              Monitor system performance and analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/performance">
              <Button className="w-full" variant="outline">
                View Performance
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>System Settings</span>
            </CardTitle>
            <CardDescription>
              Configure platform settings and integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/settings">
              <Button className="w-full" variant="outline">
                System Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Link href="/admin/users">
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  View All Users
                </Button>
              </Link>
              <Link href="/dashboard/data">
                <Button variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Data Management
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics Overview
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </MainLayout>
  )
}