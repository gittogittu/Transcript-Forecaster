'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  Zap,
  CheckCircle,
  ArrowRight,
  Settings
} from 'lucide-react'
import { PerformanceOptimizationRecommendation } from '@/lib/services/performance-monitoring/types'

interface OptimizationRecommendationsProps {
  recommendations: PerformanceOptimizationRecommendation[]
  modelId?: string
  onRefresh: () => void
}

export function OptimizationRecommendations({ 
  recommendations, 
  modelId, 
  onRefresh 
}: OptimizationRecommendationsProps) {
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([])
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [optimizationPlan, setOptimizationPlan] = useState<any>(null)

  const handleRecommendationToggle = (recommendationId: string) => {
    setSelectedRecommendations(prev => 
      prev.includes(recommendationId)
        ? prev.filter(id => id !== recommendationId)
        : [...prev, recommendationId]
    )
  }

  const handleGeneratePlan = async () => {
    if (!modelId || selectedRecommendations.length === 0) return

    setGeneratingPlan(true)
    try {
      const response = await fetch('/api/performance-monitoring/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          selectedRecommendations
        })
      })

      const data = await response.json()
      if (data.success) {
        setOptimizationPlan(data.data)
      }
    } catch (error) {
      console.error('Failed to generate optimization plan:', error)
    } finally {
      setGeneratingPlan(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'model_optimization':
        return <Settings className="h-4 w-4" />
      case 'resource_scaling':
        return <TrendingUp className="h-4 w-4" />
      case 'caching_strategy':
        return <Zap className="h-4 w-4" />
      case 'query_optimization':
        return <Clock className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'model_optimization':
        return 'Model Optimization'
      case 'resource_scaling':
        return 'Resource Scaling'
      case 'caching_strategy':
        return 'Caching Strategy'
      case 'query_optimization':
        return 'Query Optimization'
      default:
        return type.replace('_', ' ').toUpperCase()
    }
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low':
        return 'text-green-600'
      case 'medium':
        return 'text-yellow-600'
      case 'high':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    if (!acc[rec.priority]) {
      acc[rec.priority] = []
    }
    acc[rec.priority].push(rec)
    return acc
  }, {} as Record<string, PerformanceOptimizationRecommendation[]>)

  const priorityOrder = ['critical', 'high', 'medium', 'low']

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Total Recommendations</span>
            </div>
            <div className="text-2xl font-bold mt-2">{recommendations.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">High Priority</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {recommendations.filter(r => r.priority === 'high' || r.priority === 'critical').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Selected</span>
            </div>
            <div className="text-2xl font-bold mt-2">{selectedRecommendations.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Est. Impact</span>
            </div>
            <div className="text-sm font-bold mt-2">
              {selectedRecommendations.length > 0 ? 'High' : 'None'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      {selectedRecommendations.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {selectedRecommendations.length} recommendation{selectedRecommendations.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-sm text-muted-foreground">
                  Generate an optimization plan to implement these recommendations
                </p>
              </div>
              <Button 
                onClick={handleGeneratePlan} 
                disabled={generatingPlan || !modelId}
              >
                {generatingPlan ? 'Generating...' : 'Generate Plan'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Plan */}
      {optimizationPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Plan</CardTitle>
            <CardDescription>
              Implementation plan for selected recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {optimizationPlan.estimatedImpact.latencyReduction.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Latency Reduction</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {optimizationPlan.estimatedImpact.accuracyImprovement.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Accuracy Improvement</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {optimizationPlan.estimatedImpact.resourceSavings.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Resource Savings</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Implementation Phases</h4>
                {optimizationPlan.plan.phases.map((phase: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{phase.name}</span>
                      <Badge variant="outline">{phase.estimatedDuration} days</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {phase.recommendations.length} recommendation{phase.recommendations.length > 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations by Priority */}
      {priorityOrder.map(priority => {
        const priorityRecommendations = groupedRecommendations[priority] || []
        if (priorityRecommendations.length === 0) return null

        return (
          <Card key={priority}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Badge variant={getPriorityColor(priority) as any}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                </Badge>
                <span>({priorityRecommendations.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priorityRecommendations.map((recommendation) => (
                  <div
                    key={recommendation.id}
                    className={`p-4 border rounded-lg ${
                      selectedRecommendations.includes(recommendation.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedRecommendations.includes(recommendation.id)}
                        onCheckedChange={() => handleRecommendationToggle(recommendation.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          {getTypeIcon(recommendation.type)}
                          <Badge variant="outline">
                            {getTypeLabel(recommendation.type)}
                          </Badge>
                          <Badge variant="secondary" className={getEffortColor(recommendation.implementationEffort)}>
                            {recommendation.implementationEffort} effort
                          </Badge>
                        </div>
                        
                        <h4 className="font-medium mb-2">{recommendation.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {recommendation.description}
                        </p>
                        
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Expected Impact:</span> {recommendation.expectedImpact}
                          </div>
                          
                          {recommendation.estimatedImprovement && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                              {recommendation.estimatedImprovement.latencyReduction && (
                                <div>
                                  <span className="text-muted-foreground">Latency:</span> -{recommendation.estimatedImprovement.latencyReduction}%
                                </div>
                              )}
                              {recommendation.estimatedImprovement.accuracyImprovement && (
                                <div>
                                  <span className="text-muted-foreground">Accuracy:</span> +{recommendation.estimatedImprovement.accuracyImprovement}%
                                </div>
                              )}
                              {recommendation.estimatedImprovement.resourceSavings && (
                                <div>
                                  <span className="text-muted-foreground">Resources:</span> -{recommendation.estimatedImprovement.resourceSavings}%
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="space-y-1">
                            <span className="text-sm font-medium">Action Items:</span>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {recommendation.actionItems.map((item, index) => (
                                <li key={index} className="flex items-start space-x-2">
                                  <span className="text-xs mt-1">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {recommendations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              {modelId ? 'No optimization recommendations available' : 'Select a model to view recommendations'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}