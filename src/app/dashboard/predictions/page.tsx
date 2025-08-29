'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MainLayout } from '@/components/layout/main-layout'
import { TrendingUp, Brain, Calendar, Target, BarChart3, Settings } from 'lucide-react'

export default function PredictionsPage() {
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
          <h1 className="text-3xl font-bold">Predictions</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered forecasting for transcript volumes and trends
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Volume Forecast</span>
              </CardTitle>
              <CardDescription>
                Predict future transcript volumes based on historical data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                Generate Forecast
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>ML Models</span>
              </CardTitle>
              <CardDescription>
                View and manage machine learning prediction models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                View Models
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Seasonal Trends</span>
              </CardTitle>
              <CardDescription>
                Analyze seasonal patterns and cyclical trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                View Trends
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Accuracy Metrics</span>
              </CardTitle>
              <CardDescription>
                Monitor prediction accuracy and model performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                View Metrics
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Scenario Analysis</span>
              </CardTitle>
              <CardDescription>
                Run what-if scenarios and sensitivity analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Run Analysis
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Model Settings</span>
              </CardTitle>
              <CardDescription>
                Configure prediction parameters and thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Configure
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Predictions</CardTitle>
              <CardDescription>
                Latest forecasting results and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                No predictions generated yet. Click "Generate Forecast" to create your first prediction.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}