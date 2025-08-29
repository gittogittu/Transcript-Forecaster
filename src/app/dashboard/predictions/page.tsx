'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { usePredictionsData } from '@/lib/hooks/use-predictions-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MainLayout } from '@/components/layout/main-layout'
import { PredictionTools } from '@/components/dashboard/prediction-tools'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  TrendingUp, 
  Brain, 
  Target, 
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface PredictionResult {
  id: string
  type: string
  forecast: number
  confidence: number
  period: string
  generatedAt: string
  accuracy?: number
}

export default function PredictionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { data: predictionsData, loading, error, refetch, generatePrediction } = usePredictionsData()

  const handlePredictionGenerated = async (newPrediction: any) => {
    // The hook will automatically refresh the data
    refetch()
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-100 text-green-800'
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getAccuracyIcon = (accuracy?: number) => {
    if (!accuracy) return null
    if (accuracy >= 85) return <CheckCircle className="h-4 w-4 text-green-600" />
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />
  }

  const formatPeriod = (period: string) => {
    const periodMap: { [key: string]: string } = {
      'next-week': 'Next Week',
      'next-month': 'Next Month',
      'next-quarter': 'Next Quarter',
      'next-6-months': 'Next 6 Months',
      'optimistic': 'Optimistic Scenario',
      'pessimistic': 'Conservative Scenario',
      'seasonal': 'Seasonal Adjustment'
    }
    return periodMap[period] || period
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

  if (!session?.user || session.user.role === 'viewer' || !predictionsData) {
    return null
  }

  const { totalPredictions, avgConfidence, avgAccuracy, predictions } = predictionsData

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Predictions</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered forecasting for transcript volumes and trends
          </p>
        </div>

        {/* Prediction Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPredictions}</div>
              <p className="text-xs text-muted-foreground">
                Generated this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgConfidence}%</div>
              <div className="mt-2">
                <Progress value={avgConfidence} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgAccuracy}%</div>
              <p className="text-xs text-muted-foreground">
                Historical performance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Prediction Tools */}
        <div className="mb-8">
          <PredictionTools onPredictionGenerated={handlePredictionGenerated} />
        </div>

        {/* Recent Predictions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Predictions</CardTitle>
            <CardDescription>
              Latest forecasting results and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            {predictions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Forecast</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Generated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictions.map((prediction) => (
                    <TableRow key={prediction.id}>
                      <TableCell>
                        <Badge variant="outline">{prediction.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {prediction.forecast.toLocaleString()}
                      </TableCell>
                      <TableCell>{formatPeriod(prediction.period)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge className={getConfidenceColor(prediction.confidence)}>
                            {prediction.confidence}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getAccuracyIcon(prediction.accuracy)}
                          <span className="text-sm">
                            {prediction.accuracy ? `${prediction.accuracy}%` : 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(prediction.generatedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No predictions generated yet. Click "Generate Forecast" to create your first prediction.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}