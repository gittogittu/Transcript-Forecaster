'use client'

import { Recommendation } from '@/lib/services/insight-generation/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Target,
  TrendingUp,
  Settings,
  Users,
  Zap
} from 'lucide-react'
import { format } from 'date-fns'

interface RecommendationCardProps {
  recommendation: Recommendation
  onAccept?: (recommendation: Recommendation) => void
  onDismiss?: (recommendation: Recommendation) => void
  onViewDetails?: (recommendation: Recommendation) => void
}

export function RecommendationCard({ 
  recommendation, 
  onAccept, 
  onDismiss, 
  onViewDetails 
}: RecommendationCardProps) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'operational':
        return <Settings className="h-4 w-4" />
      case 'strategic':
        return <Target className="h-4 w-4" />
      case 'tactical':
        return <Zap className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'default'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'in_progress':
        return 'text-blue-600 bg-blue-50'
      case 'dismissed':
        return 'text-gray-600 bg-gray-50'
      case 'pending':
      default:
        return 'text-orange-600 bg-orange-50'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getPriorityIcon(recommendation.priority)}
            <CardTitle className="text-lg">{recommendation.title}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge variant={getPriorityColor(recommendation.priority) as any}>
              {recommendation.priority}
            </Badge>
            <div className="flex items-center gap-1">
              {getCategoryIcon(recommendation.category)}
              <Badge variant="outline" className="text-xs">
                {recommendation.category}
              </Badge>
            </div>
          </div>
        </div>
        <CardDescription className="text-sm">
          {recommendation.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Expected Impact */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Expected Impact</span>
          <p className="text-sm text-muted-foreground">
            {recommendation.expectedImpact}
          </p>
        </div>

        {/* Confidence and Business Value */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Confidence</span>
              <span className="text-sm font-semibold">
                {(recommendation.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <Progress value={recommendation.confidence * 100} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Business Value</span>
              <span className="text-sm font-semibold">
                {recommendation.businessValue.toFixed(0)}
              </span>
            </div>
            <Progress value={recommendation.businessValue} className="h-2" />
          </div>
        </div>

        {/* Implementation Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Implementation Effort:</span>
            <span className={`ml-2 ${getEffortColor(recommendation.implementationEffort)}`}>
              {recommendation.implementationEffort}
            </span>
          </div>
          <div>
            <span className="font-medium">Timeframe:</span>
            <span className="ml-2 text-muted-foreground">
              {recommendation.timeframe}
            </span>
          </div>
        </div>

        {/* Metrics */}
        {recommendation.metrics && recommendation.metrics.length > 0 && (
          <div className="space-y-1">
            <span className="text-sm font-medium">Key Metrics</span>
            <div className="flex flex-wrap gap-1">
              {recommendation.metrics.slice(0, 3).map((metric) => (
                <Badge key={metric} variant="outline" className="text-xs">
                  {metric.replace(/_/g, ' ')}
                </Badge>
              ))}
              {recommendation.metrics.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{recommendation.metrics.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge 
              variant="outline" 
              className={`text-xs ${getStatusColor(recommendation.status)}`}
            >
              {recommendation.status.replace('_', ' ')}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(recommendation.createdAt, 'MMM dd, HH:mm')}
          </span>
        </div>

        {/* Actions */}
        {recommendation.status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              onClick={() => onAccept?.(recommendation)}
              className="flex-1"
            >
              Accept
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onViewDetails?.(recommendation)}
            >
              Details
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => onDismiss?.(recommendation)}
            >
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}