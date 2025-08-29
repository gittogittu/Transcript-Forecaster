'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MainLayout } from '@/components/layout/main-layout'
import { ExtendedSession } from '@/lib/auth'
import { Settings, Bell, Palette, Database, Shield, Save } from 'lucide-react'

export default function SettingsPage() {
  const { data: session, status } = useSession() as { data: ExtendedSession | null, status: string }
  const router = useRouter()
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      predictions: true,
      reports: true,
      system: false
    },
    display: {
      theme: 'system',
      density: 'comfortable',
      animations: true
    },
    data: {
      autoRefresh: true,
      refreshInterval: '5',
      cacheEnabled: true
    }
  })

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

  const handleSave = () => {
    // Here you would typically save settings to your backend
    console.log('Saving settings:', settings)
    // Show success message
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your analytics platform preferences
          </p>
        </div>

        <div className="grid gap-6">
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, email: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in your browser
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={settings.notifications.push}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, push: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="prediction-alerts">Prediction Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new predictions are available
                  </p>
                </div>
                <Switch
                  id="prediction-alerts"
                  checked={settings.notifications.predictions}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, predictions: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="report-notifications">Report Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when reports are generated
                  </p>
                </div>
                <Switch
                  id="report-notifications"
                  checked={settings.notifications.reports}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, reports: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="system-notifications">System Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive system maintenance and update notifications
                  </p>
                </div>
                <Switch
                  id="system-notifications"
                  checked={settings.notifications.system}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, system: checked }
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Display</span>
              </CardTitle>
              <CardDescription>
                Customize the appearance of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme-select">Theme</Label>
                <Select
                  value={settings.display.theme}
                  onValueChange={(value) =>
                    setSettings(prev => ({
                      ...prev,
                      display: { ...prev.display, theme: value }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="density-select">Display Density</Label>
                <Select
                  value={settings.display.density}
                  onValueChange={(value) =>
                    setSettings(prev => ({
                      ...prev,
                      display: { ...prev.display, density: value }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select density" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="animations">Enable Animations</Label>
                  <p className="text-sm text-muted-foreground">
                    Show smooth transitions and animations
                  </p>
                </div>
                <Switch
                  id="animations"
                  checked={settings.display.animations}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      display: { ...prev.display, animations: checked }
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Data</span>
              </CardTitle>
              <CardDescription>
                Configure data refresh and caching preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-refresh">Auto Refresh</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically refresh data in the background
                  </p>
                </div>
                <Switch
                  id="auto-refresh"
                  checked={settings.data.autoRefresh}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      data: { ...prev.data, autoRefresh: checked }
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refresh-interval">Refresh Interval (minutes)</Label>
                <Select
                  value={settings.data.refreshInterval}
                  onValueChange={(value) =>
                    setSettings(prev => ({
                      ...prev,
                      data: { ...prev.data, refreshInterval: value }
                    }))
                  }
                  disabled={!settings.data.autoRefresh}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cache-enabled">Enable Caching</Label>
                  <p className="text-sm text-muted-foreground">
                    Cache data locally for faster loading
                  </p>
                </div>
                <Switch
                  id="cache-enabled"
                  checked={settings.data.cacheEnabled}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      data: { ...prev.data, cacheEnabled: checked }
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}