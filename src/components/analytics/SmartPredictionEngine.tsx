'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Settings,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Target
} from 'lucide-react'

interface SmartPrediction {
  id: string
  type: 'volume' | 'capacity' | 'anomaly' | 'optimization'
  title: string
  description: string
  confidence: number
  impact: 'low' | 'medium' | 'high'
  timeframe: string
  recommendations: string[]
  data: any
  feedback?: 'positive' | 'negative' | null
}

interface PredictionEngine {
  status: 'learning' | 'ready' | 'optimizing' | 'error'
  accuracy: number
  learningProgress: number
  totalPredictions: number
  correctPredictions: number
  lastUpdated: Date
}

export function SmartPredictionEngine() {
  const [engine, setEngine] = useState<PredictionEngine>({
    status: 'ready',
    accuracy: 94.2,
    learningProgress: 78,
    totalPredictions: 1247,
    correctPredictions: 1175,
    lastUpdated: new Date()
  })

  const [predictions, setPredictions] = useState<SmartPrediction[]>([])
  const [loading, setLoading] = useState(false)
  const [autoOptimize, setAutoOptimize] = useState(true)

  // Generate smart predictions
  const generatePredictions = useCallback(async () => {
    setLoading(true)
    setEngine(prev => ({ ...prev, status: 'learning' }))

    // Simulate AI prediction generation
    await new Promise(resolve => setTimeout(resolve, 2000))

    const newPredictions: SmartPrediction[] = [
      {
        id: '1',
        type: 'volume',
        title: 'Volume Spike Expected Tomorrow',
        description: 'AI models predict a 23% increase in transcript volume based on historical patterns and external factors.',
        confidence: 87,
        impact: 'high',
        timeframe: 'Next 24 hours',
        recommendations: [
          'Scale up processing capacity by 25%',
          'Notify operations team for resource allocation',
          'Monitor queue depths closely'
        ],
        data: {
          predicted_volume: 1850,
          current_capacity: 1500,
          confidence_interval: [1650, 2100]
        }
      },
      {
        id: '2',
        type: 'capacity',
        title: 'Optimal Resource Allocation',
        description: 'Current resource allocation is 15% above optimal. AI suggests rebalancing for cost efficiency.',
        confidence: 92,
        impact: 'medium',
        timeframe: 'This week',
        recommendations: [
          'Reduce standby capacity by 15%',
          'Redistribute load across regions',
          'Implement dynamic scaling policies'
        ],
        data: {
          current_allocation: 115,
          optimal_allocation: 100,
          potential_savings: 12500
        }
      },
      {
        id: '3',
        type: 'anomaly',
        title: 'Pattern Deviation Detected',
        description: 'Client XYZ showing unusual transcript patterns. Potential data quality issue or business change.',
        confidence: 76,
        impact: 'medium',
        timeframe: 'Last 3 days',
        recommendations: [
          'Contact client to verify business changes',
          'Check data ingestion pipeline',
          'Exclude from training until resolved'
        ],
        data: {
          client_id: 'XYZ',
          deviation_score: 2.3,
          affected_period: '2024-01-15 to 2024-01-17'
        }
      },
      {
        id: '4',
        type: 'optimization',
        title: 'Model Performance Enhancement',
        description: 'Adding seasonal holiday adjustments could improve prediction accuracy by 3.2%.',
        confidence: 89,
        impact: 'low',
        timeframe: 'Next model update',
        recommendations: [
          'Integrate holiday calendar data',
          'Retrain models with seasonal features',
          'A/B test against current model'
        ],
        data: {
          current_accuracy: 94.2,
          projected_accuracy: 97.4,
          improvement: 3.2
        }
      }
    ]

    setPredictions(newPredictions)
    setEngine(prev => ({
      ...prev,
      status: 'ready',
      lastUpdated: new Date(),
      learningProgress: Math.min(prev.learningProgress + 5, 100)
    }))
    setLoading(false)
  }, [])

  // Handle user feedback
  const handleFeedback = (predictionId: string, feedback: 'positive' | 'negative') => {
    setPredictions(prev =>
      prev.map(p =>
        p.id === predictionId ? { ...p, feedback } : p
      )
    )

    // Update engine accuracy based on feedback
    setEngine(prev => {
      const adjustment = feedback === 'positive' ? 0.1 : -0.1
      const newCorrectPredictions = feedback === 'positive' 
        ? prev.correctPredictions + 1 
        : prev.correctPredictions
      const newTotalPredictions = prev.totalPredictions + 1
      
      return {
        ...prev,
        accuracy: Math.max(0, Math.min(100, prev.accuracy + adjustment)),
        correctPredictions: newCorrectPredictions,
        totalPredictions: newTotalPredictions
      }
    })
  }

  // Auto-optimization
  useEffect(() => {
    if (autoOptimize) {
      const interval = setInterval(() => {
        setEngine(prev => ({
          ...prev,
          accuracy: Math.min(100, prev.accuracy + 0.05),
          learningProgress: Math.min(100, prev.learningProgress + 1)
        }))
      }, 10000) // Update every 10 seconds

      return () => clearInterval(interval)
    }
  }, [autoOptimize])

  // Initial load
  useEffect(() => {
    generatePredictions()
  }, [generatePredictions])

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'volume': return <TrendingUp className="h-4 w-4" />
      case 'capacity': return <Target className="h-4 w-4" />
      case 'anomaly': return <AlertCircle className="h-4 w-4" />
      case 'optimization': return <Lightbulb className="h-4 w-4" />
      default: return <Brain className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Engine Status */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Smart Prediction Engine</CardTitle>
                <CardDescription>
                  AI-powered insights and recommendations
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={engine.status === 'ready' ? 'default' : 'secondary'}
                className={engine.status === 'ready' ? 'bg-green-500' : ''}
              >
                {engine.status === 'learning' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                {engine.status === 'ready' && <CheckCircle className="h-3 w-3 mr-1" />}
                {engine.status.toUpperCase()}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoOptimize(!autoOptimize)}
              >
                <Zap className={`h-4 w-4 mr-2 ${autoOptimize ? 'text-green-500' : 'text-gray-400'}`} />
                Auto-optimize {autoOptimize ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Accuracy</span>
                <span className="text-lg font-bold text-green-600">
                  {engine.accuracy.toFixed(1)}%
                </span>
              </div>
              <Progress value={engine.accuracy} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Learning Progress</span>
                <span className="text-lg font-bold text-blue-600">
                  {engine.learningProgress}%
                </span>
              </div>
              <Progress value={engine.learningProgress} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Predictions</span>
                <span className="text-lg font-bold">
                  {engine.totalPredictions.toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {engine.correctPredictions} correct
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm font-medium">
                  {engine.lastUpdated.toLocaleTimeString()}
                </span>
              </div>
              <Button
                onClick={generatePredictions}
                disabled={loading}
                size="sm"
                className="w-full"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Predictions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">AI-Generated Insights</h3>
          <Badge variant="outline">
            {predictions.length} predictions
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {predictions.map((prediction) => (
            <Card key={prediction.id} className={`border-l-4 ${getImpactColor(prediction.impact)}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getTypeIcon(prediction.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{prediction.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {prediction.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {prediction.confidence}% confidence
                        </Badge>
                        <Badge className={`text-xs ${getImpactColor(prediction.impact)}`}>
                          {prediction.impact} impact
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">{prediction.timeframe}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700">{prediction.description}</p>
                
                {/* Data Visualization */}
                {prediction.type === 'volume' && prediction.data && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Predicted Volume:</span>
                        <div className="font-bold text-blue-600">
                          {prediction.data.predicted_volume.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Current Capacity:</span>
                        <div className="font-bold">
                          {prediction.data.current_capacity.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {prediction.type === 'capacity' && prediction.data && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Potential Savings:</span>
                        <div className="font-bold text-green-600">
                          ${prediction.data.potential_savings.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Optimization:</span>
                        <div className="font-bold">
                          {prediction.data.optimal_allocation}% capacity
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <div>
                  <h5 className="font-medium text-sm mb-2">Recommendations:</h5>
                  <ul className="space-y-1">
                    {prediction.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Feedback */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-gray-500">Was this insight helpful?</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={prediction.feedback === 'positive' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFeedback(prediction.id, 'positive')}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={prediction.feedback === 'negative' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFeedback(prediction.id, 'negative')}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Learning Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Learning Analytics</span>
          </CardTitle>
          <CardDescription>
            How the AI engine is improving over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {predictions.filter(p => p.feedback === 'positive').length}
              </div>
              <div className="text-sm text-blue-700">Positive Feedback</div>
              <div className="text-xs text-blue-600 mt-1">
                Insights rated as helpful
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {engine.learningProgress}%
              </div>
              <div className="text-sm text-green-700">Learning Complete</div>
              <div className="text-xs text-green-600 mt-1">
                Training on latest patterns
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                +{Math.round((engine.accuracy - 90) * 10) / 10}%
              </div>
              <div className="text-sm text-purple-700">Accuracy Gain</div>
              <div className="text-xs text-purple-600 mt-1">
                Improvement this week
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SmartPredictionEngine