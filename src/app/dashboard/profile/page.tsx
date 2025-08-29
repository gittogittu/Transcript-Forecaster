'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MainLayout } from '@/components/layout/main-layout'
import { ExtendedSession } from '@/lib/auth'
import { User, Mail, Shield, Calendar, Edit } from 'lucide-react'

export default function ProfilePage() {
  const { data: session, status } = useSession() as { data: ExtendedSession | null, status: string }
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

  const getUserInitials = (name?: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'destructive'
      case 'analyst':
        return 'default'
      case 'viewer':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Your account details and role information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage 
                    src={session.user.image || undefined} 
                    alt={session.user.name || 'User'} 
                  />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg">
                    {getUserInitials(session.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{session.user.name || 'User'}</h3>
                  <p className="text-sm text-muted-foreground">{session.user.email}</p>
                  <Badge variant={getRoleColor(session.user.role)} className="text-xs">
                    {session.user.role?.charAt(0).toUpperCase() + session.user.role?.slice(1) || 'User'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{session.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Role</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {session.user.role || 'viewer'} - {
                        session.user.role === 'admin' ? 'Full system access' :
                        session.user.role === 'analyst' ? 'Data analysis and predictions' :
                        'View-only access'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Member Since</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date().toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <Button className="w-full" variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account preferences and security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Preferences</h4>
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start">
                    Notification Settings
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Display Preferences
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Data Export Settings
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Security</h4>
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start">
                    Change Password
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Two-Factor Authentication
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Active Sessions
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Data</h4>
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start">
                    Download My Data
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-red-600">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}