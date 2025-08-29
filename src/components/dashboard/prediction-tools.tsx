'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import { 
  TrendingUp, 
  Brain, 
  Calendar, 
  Target, 
  BarChart3, 
  Settings,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Activity
} from 'lucide-react'

interface PredictionToolsProps {
  onPredictionGenerated?: (prediction: any) => void
}

interface PredictionResult {
  id: string
  type: string
  forecast: number
  confidence: number
  period: string
  generatedAt: string
  accuracy?: number
}

export function PredictionTools({ onPredictionGenerated }: PredictionToolsProps) {
  const { toast } = useToast()
  const [generating, setGenerating] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [forecastDialogOpen, setForecastDialogOpen] = useState(false)
  const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [confidenceThreshold, setConfidenceThreshold] = useState([85])

  const generatePrediction = async (predictionType: string, config: any) => {
    setGenerating(predictionType)
    setProgress(0)

    try {
      // Show progress animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 12
        })
      }, 250)

      // Call actual API
      const response = await fetch('/api/analytics/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: predictionType,
          period: config.period || 'next-month',
          config
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate prediction')
      }
      
      setProgress(100)
      
      const prediction = result.data
      
      toast({
        title: "Prediction Generated",
        description: `${predictionType} forecast has been generated with ${prediction.confidence}% confidence`,
      })
      
      onPredictionGenerated?.(prediction)
      
      // Close dialogs
      setForecastDialogOpen(false)
      setScenarioDialogOpen(false)
      setSettingsDialogOpen(false)
      
    } catch (error) {
      console.error('Error generating prediction:', error)
      toast({
        title: "Prediction Failed",
        description: error instanceof Error ? error.message : "Failed to generate prediction. Please try again.",
        variant: "destructive"
      })
    } finally {
      setGenerating(null)
      setProgress(0)
    }
  }

  const isGenerating = (predictionType: string) => generating === predictionType

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Volume Forecast */}
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
          <Dialog open={forecastDialogOpen} onOpenChange={setForecastDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" disabled={isGenerating('volume-forecast')}>
                {isGenerating('volume-forecast') ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Forecast'
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Volume Forecast</DialogTitle>
                <DialogDescription>
                  Configure your volume prediction parameters
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                generatePrediction('Volume Forecast', {
                  period: formData.get('period'),
                  model: formData.get('model'),
                  includeSeasonality: formData.get('includeSeasonality') === 'on'
                })
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="forecast-period">Forecast Period</Label>
                    <Select name="period">
                      <SelectTrigger>
                        <SelectValue placeholder="Select forecast period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="next-week">Next Week</SelectItem>
                        <SelectItem value="next-month">Next Month</SelectItem>
                        <SelectItem value="next-quarter">Next Quarter</SelectItem>
                        <SelectItem value="next-6-months">Next 6 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="model-type">ML Model</Label>
                    <Select name="model">
                      <SelectTrigger>
                        <SelectValue placeholder="Select prediction model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear-regression">Linear Regression</SelectItem>
                        <SelectItem value="arima">ARIMA</SelectItem>
                        <SelectItem value="lstm">LSTM Neural Network</SelectItem>
                        <SelectItem value="ensemble">Ensemble Model</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Confidence Threshold</Label>
                    <div className="px-3">
                      <Slider
                        value={confidenceThreshold}
                        onValueChange={setConfidenceThreshold}
                        max={100}
                        min={50}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>50%</span>
                        <span>{confidenceThreshold[0]}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                  {isGenerating('volume-forecast') && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Training model...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setForecastDialogOpen(false)}
                      disabled={isGenerating('volume-forecast')}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isGenerating('volume-forecast')}>
                      Generate
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* ML Models */}
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Models</span>
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                4 Models
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>LSTM Neural Network</span>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>ARIMA Time Series</span>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>
            <Button className="w-full" variant="outline">
              View Models
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Trends */}
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Seasonality Detected</span>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-xs text-muted-foreground">
              Strong monthly patterns identified
            </div>
            <Button className="w-full" variant="outline">
              View Trends
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accuracy Metrics */}
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Overall Accuracy</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                87.3%
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Last 30 predictions</span>
                <span>89.2%</span>
              </div>
              <Progress value={89.2} className="h-2" />
            </div>
            <Button className="w-full" variant="outline">
              View Metrics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Analysis */}
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
          <Dialog open={scenarioDialogOpen} onOpenChange={setScenarioDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline" disabled={isGenerating('scenario')}>
                {isGenerating('scenario') ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  'Run Analysis'
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Scenario Analysis</DialogTitle>
                <DialogDescription>
                  Configure scenario parameters for what-if analysis
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                generatePrediction('Scenario Analysis', {
                  scenario: formData.get('scenario'),
                  adjustment: formData.get('adjustment')
                })
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="scenario-type">Scenario Type</Label>
                    <Select name="scenario">
                      <SelectTrigger>
                        <SelectValue placeholder="Select scenario" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="optimistic">Optimistic Growth</SelectItem>
                        <SelectItem value="pessimistic">Conservative Growth</SelectItem>
                        <SelectItem value="seasonal">Seasonal Adjustment</SelectItem>
                        <SelectItem value="custom">Custom Parameters</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="adjustment">Volume Adjustment (%)</Label>
                    <Input 
                      name="adjustment" 
                      type="number" 
                      placeholder="e.g., +15 or -10"
                      min="-50"
                      max="100"
                    />
                  </div>
                  {isGenerating('scenario') && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Running scenario...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setScenarioDialogOpen(false)}
                      disabled={isGenerating('scenario')}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isGenerating('scenario')}>
                      Run Analysis
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Model Settings */}
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-retrain</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                Weekly
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Alert Threshold</span>
              <span className="text-sm text-muted-foreground">±20%</span>
            </div>
            <Button className="w-full" variant="outline">
              Configure
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}